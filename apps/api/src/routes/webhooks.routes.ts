import { Router } from 'express';
import { AffiliateProgram, OutboundClick, User, Conversion } from '@buyla/db';
import { createConversionAtomic } from '../lib/conversion-service';

const router = Router();

// ── Types ──

interface PostbackData {
  ambassadorRef: string;
  amount: number;
  commission: number;
  orderRef: string;
  status: string;
  secret: string;
}

// ── Helper ──

/**
 * Normalize postback data from different affiliate network formats
 * into a common structure.
 *
 * - 'awin'    : query params (clickRef, transactionAmount, commission, orderRef, secret)
 * - 'affilae' : JSON body   (sub_id, amount, commission, order_id, secret)
 * - 'direct'  : query params (subid, amount, commission, orderref, secret)  -- NutriProfits style
 * - default   : try body first, then fall back to query params
 */
function extractPostbackData(
  program: AffiliateProgram,
  query: Record<string, unknown>,
  body: Record<string, unknown>,
): PostbackData | null {
  const network = program.network;

  try {
    switch (network) {
      case 'awin': {
        return {
          ambassadorRef: String(query.clickRef || ''),
          amount: parseFloat(String(query.transactionAmount || '0')),
          commission: parseFloat(String(query.commission || '0')),
          orderRef: String(query.orderRef || ''),
          status: String(query.status || 'pending'),
          secret: String(query.secret || ''),
        };
      }

      case 'affilae': {
        return {
          ambassadorRef: String(body.sub_id || ''),
          amount: parseFloat(String(body.amount || '0')),
          commission: parseFloat(String(body.commission || '0')),
          orderRef: String(body.order_id || ''),
          status: String(body.status || 'pending'),
          secret: String(body.secret || ''),
        };
      }

      case 'direct': {
        return {
          ambassadorRef: String(query.subid || ''),
          amount: parseFloat(String(query.amount || '0')),
          commission: parseFloat(String(query.commission || '0')),
          orderRef: String(query.orderref || ''),
          status: String(query.status || 'pending'),
          secret: String(query.secret || ''),
        };
      }

      default: {
        // Custom / unknown networks: try body first, then query params
        const src = (body && Object.keys(body).length > 0) ? body : query;

        return {
          ambassadorRef: String(
            src.sub_id || src.clickRef || src.subid || src.ambassador_ref || '',
          ),
          amount: parseFloat(
            String(src.transactionAmount || src.amount || '0'),
          ),
          commission: parseFloat(String(src.commission || '0')),
          orderRef: String(
            src.orderRef || src.order_id || src.orderref || src.order_ref || '',
          ),
          status: String(src.status || 'pending'),
          secret: String(src.secret || ''),
        };
      }
    }
  } catch (err) {
    console.error('[Postback] Error extracting data:', err);
    return null;
  }
}

// ── POST /api/webhooks/postback/:programName ──

router.post('/postback/:programName', async (req, res) => {
  const { programName } = req.params;

  try {
    // 1. Find AffiliateProgram by name
    const program = await AffiliateProgram.findOne({
      where: { name: programName },
    });

    if (!program || !program.is_active) {
      console.warn(
        `[Postback] Program not found or inactive: ${programName}`,
      );
      res.status(200).json({ received: true });
      return;
    }

    // 2. Extract and normalize data
    const data = extractPostbackData(program, req.query as Record<string, unknown>, req.body);

    if (!data || !data.ambassadorRef || !data.orderRef) {
      console.warn(
        `[Postback] Missing required fields for program ${programName}`,
        { ambassadorRef: data?.ambassadorRef, orderRef: data?.orderRef },
      );
      res.status(200).json({ received: true });
      return;
    }

    // 3. Validate secret
    if (program.postback_secret) {
      if (data.secret !== program.postback_secret) {
        console.warn(
          `[Postback] Secret mismatch for program ${programName}`,
        );
        res.status(200).json({ received: true });
        return;
      }
    }

    // 4. Idempotency check: skip if order_ref already exists
    const existingConversion = await Conversion.findOne({
      where: {
        order_ref: data.orderRef,
        affiliate_program_id: program.id,
      },
    });

    if (existingConversion) {
      console.log(
        `[Postback] Duplicate order_ref ${data.orderRef} for program ${programName} — skipping`,
      );
      res.status(200).json({ received: true });
      return;
    }

    // 5. Find ambassador by referral_code
    const ambassador = await User.findOne({
      where: { referral_code: data.ambassadorRef, is_active: true },
    });

    if (!ambassador) {
      console.warn(
        `[Postback] Ambassador not found for ref: ${data.ambassadorRef}`,
      );
      res.status(200).json({ received: true });
      return;
    }

    // 6. Find the latest OutboundClick for this ambassador + program (optional)
    const latestClick = await OutboundClick.findOne({
      where: {
        ambassador_id: ambassador.id,
        affiliate_program_id: program.id,
      },
      order: [['clicked_at', 'DESC']],
    });

    // 7. Create conversion atomically
    await createConversionAtomic({
      ambassadorId: ambassador.id,
      affiliateProgramId: program.id,
      type: 'affiliate',
      amount: data.amount,
      commissionTotal: data.commission,
      orderRef: data.orderRef,
      outboundClickId: latestClick?.id,
      buyerUserId: latestClick?.buyer_user_id ?? null,
      productId: latestClick?.product_id ?? null,
      attributionMethod: 'postback',
      attributionConfidence: latestClick ? 'high' : 'medium',
    });

    console.log(
      `[Postback] Conversion created for program ${programName}, order ${data.orderRef}, ambassador ${data.ambassadorRef}`,
    );

    res.status(200).json({ received: true });
  } catch (err) {
    // Always respond 200 — network convention
    console.error(`[Postback] Unexpected error for program ${programName}:`, err);
    res.status(200).json({ received: true });
  }
});

// ── POST /api/webhooks/stripe ──

router.post('/stripe', async (req, res) => {
  try {
    // 1. Validate webhook secret (if configured)
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'] as string | undefined;

      if (providedSecret !== webhookSecret) {
        console.warn('[Stripe Webhook] Secret mismatch — rejecting');
        res.status(200).json({ received: true });
        return;
      }
    }

    // 2. Parse event from body (express.json() already parsed it)
    const event = req.body;

    // 3. Only handle checkout.session.completed
    if (!event || event.type !== 'checkout.session.completed') {
      res.status(200).json({ received: true });
      return;
    }

    const session = event.data?.object;

    if (!session) {
      console.warn('[Stripe Webhook] No session object in event');
      res.status(200).json({ received: true });
      return;
    }

    // 4. Extract metadata
    const metadata = session.metadata || {};
    const ambassadorRef: string = metadata.ambassador_ref || '';
    const productId: number | null = metadata.product_id
      ? parseInt(metadata.product_id, 10)
      : null;
    const buyerUserId: string | null = metadata.buyer_user_id || null;
    const affiliateProgramId: number | null = metadata.affiliate_program_id
      ? parseInt(metadata.affiliate_program_id, 10)
      : null;
    const amount: number = metadata.amount
      ? parseFloat(metadata.amount)
      : session.amount_total
        ? session.amount_total / 100 // Stripe amounts are in cents
        : 0;

    // 5. Not an ambassador-attributed sale → nothing to do
    if (!ambassadorRef) {
      res.status(200).json({ received: true });
      return;
    }

    // 6. Find ambassador by referral_code
    const ambassador = await User.findOne({
      where: { referral_code: ambassadorRef, is_active: true },
    });

    if (!ambassador) {
      console.warn(
        `[Stripe Webhook] Ambassador not found for ref: ${ambassadorRef}`,
      );
      res.status(200).json({ received: true });
      return;
    }

    // 7. Find the affiliate program
    if (!affiliateProgramId) {
      console.warn(
        '[Stripe Webhook] No affiliate_program_id in session metadata',
      );
      res.status(200).json({ received: true });
      return;
    }

    const program = await AffiliateProgram.findByPk(affiliateProgramId);

    if (!program || !program.is_active) {
      console.warn(
        `[Stripe Webhook] Affiliate program not found or inactive: ${affiliateProgramId}`,
      );
      res.status(200).json({ received: true });
      return;
    }

    // 8. Idempotency: check if conversion with this session ID already exists
    const sessionId: string = session.id;

    const existingConversion = await Conversion.findOne({
      where: {
        order_ref: sessionId,
        affiliate_program_id: program.id,
      },
    });

    if (existingConversion) {
      console.log(
        `[Stripe Webhook] Duplicate session ${sessionId} — skipping`,
      );
      res.status(200).json({ received: true });
      return;
    }

    // 9. Calculate commission from program rate
    const commissionTotal =
      Math.round(amount * (program.avg_commission_rate / 100) * 100) / 100;

    // 10. Create conversion atomically
    await createConversionAtomic({
      ambassadorId: ambassador.id,
      affiliateProgramId: program.id,
      type: 'dropship',
      amount,
      commissionTotal,
      orderRef: sessionId,
      buyerUserId,
      productId,
      attributionMethod: 'stripe',
      attributionConfidence: 'high',
    });

    console.log(
      `[Stripe Webhook] Conversion created for session ${sessionId}, ambassador ${ambassadorRef}, amount ${amount}`,
    );

    res.status(200).json({ received: true });
  } catch (err) {
    // Always respond 200 — webhook convention
    console.error('[Stripe Webhook] Unexpected error:', err);
    res.status(200).json({ received: true });
  }
});

export default router;
