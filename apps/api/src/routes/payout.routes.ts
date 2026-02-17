import { Router } from 'express';
import { z } from 'zod';
import {
  sequelize,
  Payout,
  PayoutInfo,
  Conversion,
  Sequelize,
  Op,
} from '@buyla/db';
import type { Transaction } from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getSettingNumber } from '../lib/settings';
import { onPayoutRequested } from '../lib/email-triggers';

const router = Router();

// All payout routes require authentication
router.use(checkAuth());

// ════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════════════

/** Mask IBAN: show only last 4 characters */
function maskIban(iban: string | null): string | null {
  if (!iban) return null;
  if (iban.length <= 4) return iban;
  return '****' + iban.slice(-4);
}

/** Map preferred_method from request to DB method enum */
function mapMethodToDb(method: string): 'stripe' | 'paypal' | 'bank' {
  if (method === 'bank_transfer') return 'bank';
  return method as 'stripe' | 'paypal' | 'bank';
}

// ════════════════════════════════════════════════════════════════════════════
//  VALIDATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const payoutInfoSchema = z.object({
  preferred_method: z.enum(['stripe', 'paypal', 'bank_transfer'], {
    errorMap: () => ({ message: 'Méthode de paiement invalide' }),
  }),
  paypal_email: z.string().email('Email PayPal invalide').optional(),
  bank_name: z.string().min(1, 'Nom de la banque requis').optional(),
  iban: z
    .string()
    .regex(
      /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/,
      'Format IBAN invalide (2 lettres, 2 chiffres, 10-30 caractères alphanumériques)',
    )
    .optional(),
  bic: z.string().min(1, 'BIC requis').optional(),
  account_holder_name: z.string().min(1, 'Nom du titulaire requis').optional(),
  country: z
    .string()
    .length(2, 'Code pays ISO à 2 lettres requis')
    .regex(/^[A-Z]{2}$/, 'Code pays invalide')
    .optional(),
}).superRefine((data, ctx) => {
  if (data.preferred_method === 'paypal' && !data.paypal_email) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Email PayPal requis pour la méthode PayPal',
      path: ['paypal_email'],
    });
  }
  if (data.preferred_method === 'bank_transfer') {
    if (!data.bank_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nom de la banque requis pour le virement bancaire',
        path: ['bank_name'],
      });
    }
    if (!data.iban) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'IBAN requis pour le virement bancaire',
        path: ['iban'],
      });
    }
    if (!data.bic) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BIC requis pour le virement bancaire',
        path: ['bic'],
      });
    }
    if (!data.account_holder_name) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nom du titulaire requis pour le virement bancaire',
        path: ['account_holder_name'],
      });
    }
  }
});

const requestPayoutSchema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/payouts/info - Get current user's payout info
// ════════════════════════════════════════════════════════════════════════════

router.get('/info', async (req, res) => {
  try {
    const userId = req.user!.userId;

    const info = await PayoutInfo.findOne({ where: { user_id: userId } });

    if (!info) {
      success(res, { payoutInfo: null });
      return;
    }

    // Return with masked IBAN
    const data = info.toJSON();
    success(res, {
      payoutInfo: {
        ...data,
        iban_encrypted: maskIban(data.iban_encrypted),
      },
    });
  } catch (err) {
    console.error('Get payout info error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/payouts/info - Create or update payout info
// ════════════════════════════════════════════════════════════════════════════

router.put('/info', validate(payoutInfoSchema), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const data = req.body as z.infer<typeof payoutInfoSchema>;

    const dbMethod = mapMethodToDb(data.preferred_method);

    const updateFields: Record<string, unknown> = {
      method: dbMethod,
    };

    // Set fields based on method
    if (data.preferred_method === 'paypal') {
      updateFields.paypal_email = data.paypal_email || null;
      // Clear bank fields when switching to paypal
      updateFields.iban_encrypted = null;
      updateFields.bic = null;
      updateFields.bank_name = null;
    } else if (data.preferred_method === 'bank_transfer') {
      updateFields.iban_encrypted = data.iban || null;
      updateFields.bic = data.bic || null;
      updateFields.bank_name = data.bank_name || null;
      // Clear paypal when switching to bank
      updateFields.paypal_email = null;
    } else if (data.preferred_method === 'stripe') {
      // Clear other fields when switching to stripe
      updateFields.paypal_email = null;
      updateFields.iban_encrypted = null;
      updateFields.bic = null;
      updateFields.bank_name = null;
    }

    if (data.country !== undefined) {
      // Store country in bank_name if needed; we don't have a separate country field
      // Actually, the spec mentions country but PayoutInfo model doesn't have it
      // We'll store account_holder_name if present
    }

    // Upsert: findOrCreate + update
    const [info, created] = await PayoutInfo.findOrCreate({
      where: { user_id: userId },
      defaults: {
        user_id: userId,
        ...updateFields,
      } as any,
    });

    if (!created) {
      await info.update(updateFields);
    }

    await info.reload();

    const result = info.toJSON();
    success(res, {
      payoutInfo: {
        ...result,
        iban_encrypted: maskIban(result.iban_encrypted),
      },
    }, created ? 201 : 200);
  } catch (err) {
    console.error('Update payout info error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  POST /api/payouts/request - Request a payout (ambassador earnings)
// ════════════════════════════════════════════════════════════════════════════

router.post('/request', validate(requestPayoutSchema), async (req, res) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const userId = req.user!.userId;
    const { amount } = req.body as z.infer<typeof requestPayoutSchema>;

    // Check minimum payout threshold from settings (default 50 EUR)
    const minPayout = (await getSettingNumber('min_payout_ambassador')) || 50;
    if (amount < minPayout) {
      await t.rollback();
      error(res, 'MIN_PAYOUT', `Le montant minimum de retrait est de ${minPayout} EUR`, 400);
      return;
    }

    // Calculate confirmed_balance: SUM of ambassador_share WHERE status='confirmed'
    const confirmedResult = await Conversion.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
      ],
      where: {
        ambassador_id: userId,
        status: 'confirmed',
      },
      raw: true,
      transaction: t,
    }) as any;

    const confirmedBalance = Number(confirmedResult?.total ?? 0);

    // Subtract already requested/processing payouts
    const requestedResult = await Payout.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total'],
      ],
      where: {
        user_id: userId,
        type: 'ambassador',
        status: { [Op.in]: ['pending', 'processing'] },
      },
      raw: true,
      transaction: t,
    }) as any;

    const alreadyRequested = Number(requestedResult?.total ?? 0);
    const availableBalance = confirmedBalance - alreadyRequested;

    if (amount > availableBalance) {
      await t.rollback();
      error(res, 'INSUFFICIENT_BALANCE', `Solde insuffisant. Disponible: ${availableBalance.toFixed(2)} EUR`, 400);
      return;
    }

    // Check PayoutInfo exists and is complete
    const payoutInfo = await PayoutInfo.findOne({
      where: { user_id: userId },
      transaction: t,
    });

    if (!payoutInfo) {
      await t.rollback();
      error(res, 'PAYOUT_INFO_MISSING', 'Veuillez configurer vos informations de paiement avant de demander un retrait', 400);
      return;
    }

    // Verify payout info is complete based on method
    const method = payoutInfo.method;
    if (method === 'paypal' && !payoutInfo.paypal_email) {
      await t.rollback();
      error(res, 'PAYOUT_INFO_INCOMPLETE', 'Email PayPal manquant dans vos informations de paiement', 400);
      return;
    }
    if (method === 'bank' && (!payoutInfo.iban_encrypted || !payoutInfo.bic)) {
      await t.rollback();
      error(res, 'PAYOUT_INFO_INCOMPLETE', 'IBAN ou BIC manquant dans vos informations de paiement', 400);
      return;
    }

    // Create Payout record
    const payout = await Payout.create({
      user_id: userId,
      amount,
      type: 'ambassador',
      method,
      status: 'pending',
      requested_at: new Date(),
    }, { transaction: t });

    await t.commit();

    // Fire-and-forget admin notification email
    onPayoutRequested(payout.id).catch(err => console.error('Payout request email failed:', err));

    success(res, {
      payout: {
        id: payout.id,
        amount: Number(payout.amount),
        type: payout.type,
        method: payout.method,
        status: payout.status,
        requested_at: payout.requested_at,
      },
    }, 201);
  } catch (err) {
    await t.rollback();
    console.error('Request payout error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/payouts/history - Paginated list of user's payouts
// ════════════════════════════════════════════════════════════════════════════

router.get('/history', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await Payout.findAndCountAll({
      where: { user_id: userId },
      attributes: ['id', 'amount', 'type', 'method', 'status', 'reference', 'requested_at', 'paid_at', 'created_at'],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Payout history error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/payouts/earnings - Get earnings breakdown
// ════════════════════════════════════════════════════════════════════════════

router.get('/earnings', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // pending: SUM ambassador_share WHERE conversion status='pending'
    const pendingResult = await Conversion.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
      ],
      where: {
        ambassador_id: userId,
        status: 'pending',
      },
      raw: true,
    }) as any;

    // confirmed: SUM ambassador_share WHERE conversion status='confirmed' (retirable)
    const confirmedResult = await Conversion.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
      ],
      where: {
        ambassador_id: userId,
        status: 'confirmed',
      },
      raw: true,
    }) as any;

    // paid: SUM ambassador_share WHERE conversion status='paid'
    const paidResult = await Conversion.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
      ],
      where: {
        ambassador_id: userId,
        status: 'paid',
      },
      raw: true,
    }) as any;

    // Requested payouts pending/processing
    const requestedResult = await Payout.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total'],
      ],
      where: {
        user_id: userId,
        type: 'ambassador',
        status: { [Op.in]: ['pending', 'processing'] },
      },
      raw: true,
    }) as any;

    // sponsor_pending: SUM sponsor_share WHERE status='pending' (for sponsors)
    const sponsorPendingResult = await Conversion.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('sponsor_share')), 0), 'total'],
      ],
      where: {
        sponsor_id: userId,
        status: 'pending',
      },
      raw: true,
    }) as any;

    // sponsor_confirmed: SUM sponsor_share WHERE status='confirmed'
    const sponsorConfirmedResult = await Conversion.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('sponsor_share')), 0), 'total'],
      ],
      where: {
        sponsor_id: userId,
        status: 'confirmed',
      },
      raw: true,
    }) as any;

    const pending = Number(pendingResult?.total ?? 0);
    const confirmed = Number(confirmedResult?.total ?? 0);
    const paid = Number(paidResult?.total ?? 0);
    const requestedPending = Number(requestedResult?.total ?? 0);

    success(res, {
      earnings: {
        pending,
        confirmed,
        paid,
        total: pending + confirmed + paid,
        available: confirmed - requestedPending,
        sponsor_pending: Number(sponsorPendingResult?.total ?? 0),
        sponsor_confirmed: Number(sponsorConfirmedResult?.total ?? 0),
      },
    });
  } catch (err) {
    console.error('Earnings breakdown error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

export default router;
