import { Router } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { User, Visit, OutboundClick, AffiliateProgram, RedirectPortal } from '@buyla/db';
import { buildAffiliateRedirectUrl } from '@buyla/shared';
import { success, error } from '../lib/api-response';
import { validate } from '../middleware/validate.middleware';
import { trackingVisitLimiter, trackingClickLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// ── Zod Schemas ──

const visitSchema = z.object({
  ref: z.string().min(1, 'Code de parrainage requis'),
  visitor_id: z.string().min(1, 'Visitor ID requis'),
  url: z.string().url('URL invalide'),
});

const clickSchema = z.object({
  product_id: z.number().int().positive().optional(),
  portal_id: z.number().int().positive().optional(),
  program_id: z.number().int().positive({ message: 'Program ID requis' }),
  visitor_id: z.string().min(1, 'Visitor ID requis'),
  ambassador_ref: z.string().min(1, 'Code ambassadeur requis'),
  buyer_user_id: z.string().uuid().optional(),
});

// ── Helpers ──

function hashIp(ip: string | undefined): string {
  const raw = ip || 'unknown';
  return crypto.createHash('sha256').update(raw).digest('hex');
}

// ── GET /api/tracking/portal/:slug ──
router.get('/portal/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const portal = await RedirectPortal.findOne({
      where: { merchant_slug: slug },
      include: [{ model: AffiliateProgram, as: 'program' }],
    });

    if (!portal) {
      error(res, 'NOT_FOUND', 'Portail introuvable', 404);
      return;
    }

    const program = (portal as any).program as AffiliateProgram | null;

    success(res, {
      portal: {
        id: portal.id,
        merchant_slug: portal.merchant_slug,
        display_name: portal.display_name,
        logo_url: portal.logo_url,
      },
      program: program
        ? {
            id: program.id,
            display_name: program.display_name,
            buyer_cashback_rate: program.buyer_cashback_rate,
            network: program.network,
          }
        : null,
    });
  } catch (err) {
    console.error('Tracking portal info error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── POST /api/tracking/visit ──
router.post(
  '/visit',
  trackingVisitLimiter,
  validate(visitSchema),
  async (req, res) => {
    try {
      const { ref, visitor_id, url } = req.body;

      // 1. Find ambassador by referral_code
      const ambassador = await User.findOne({
        where: { referral_code: ref, is_active: true },
      });

      if (!ambassador) {
        error(res, 'INVALID_REF', 'Code de parrainage invalide', 400);
        return;
      }

      // 2. Hash the IP for privacy
      const ipHash = hashIp(req.ip);

      // 3. Extract headers
      const sourceUrl = req.headers.referer || req.headers.referrer || null;
      const userAgent = req.headers['user-agent'] || null;

      // 4. Create Visit record
      const visit = await Visit.create({
        visitor_id,
        ambassador_id: ambassador.id,
        source_url: typeof sourceUrl === 'string' ? sourceUrl : null,
        landing_page: url,
        ip_hash: ipHash,
        user_agent: typeof userAgent === 'string' ? userAgent : null,
      });

      success(res, { visit_id: visit.id }, 201);
    } catch (err) {
      console.error('Tracking visit error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

// ── POST /api/tracking/click ──
router.post(
  '/click',
  trackingClickLimiter,
  validate(clickSchema),
  async (req, res) => {
    try {
      const {
        product_id,
        portal_id,
        program_id,
        visitor_id,
        ambassador_ref,
        buyer_user_id,
      } = req.body;

      // 1. Find ambassador by referral_code
      const ambassador = await User.findOne({
        where: { referral_code: ambassador_ref, is_active: true },
      });

      if (!ambassador) {
        error(res, 'INVALID_REF', 'Code ambassadeur invalide', 400);
        return;
      }

      // 2. Find affiliate program
      const program = await AffiliateProgram.findByPk(program_id);

      if (!program) {
        error(res, 'INVALID_PROGRAM', 'Programme affilié introuvable', 400);
        return;
      }

      // 3. Build redirect URL
      const { url: redirectUrl, subIdSent } = buildAffiliateRedirectUrl(program, ambassador_ref);

      // 4. Find latest visit for this visitor + ambassador (optional)
      const latestVisit = await Visit.findOne({
        where: { visitor_id, ambassador_id: ambassador.id },
        order: [['created_at', 'DESC']],
      });

      // 5. Create OutboundClick record
      const click = await OutboundClick.create({
        visit_id: latestVisit?.id ?? null,
        visitor_id,
        ambassador_id: ambassador.id,
        buyer_user_id: buyer_user_id ?? null,
        product_id: product_id ?? null,
        portal_id: portal_id ?? null,
        affiliate_program_id: program.id,
        destination_url: redirectUrl,
        sub_id_sent: subIdSent,
      });

      success(res, { redirect_url: redirectUrl, click_id: click.id });
    } catch (err) {
      console.error('Tracking click error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

export default router;
