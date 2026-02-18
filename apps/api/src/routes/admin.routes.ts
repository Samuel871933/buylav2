import { Router } from 'express';
import { z } from 'zod';
import { AffiliateProgram, User, Conversion, Op } from '@buyla/db';
import { createConversionAtomic } from '../lib/conversion-service';
import { confirmConversion, payConversion, cancelConversion } from '../lib/conversion-lifecycle';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const router = Router();

// All admin routes require auth + admin role
router.use(checkAuth(), checkRole('admin'));

// ── Validation Schemas ──

const csvImportSchema = z.object({
  program_id: z.number().int().positive(),
  rows: z
    .array(
      z.object({
        order_ref: z.string().min(1, 'order_ref est requis'),
        amount: z.number().positive('amount doit être positif'),
        commission: z.number().nonnegative('commission doit être >= 0'),
        sub_id: z.string().min(1, 'sub_id est requis'),
        date: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .min(1, 'Au moins une ligne est requise'),
});

// ── POST /api/admin/conversions/import ──
router.post('/conversions/import', validate(csvImportSchema), async (req, res) => {
  try {
    const { program_id, rows } = req.body as z.infer<typeof csvImportSchema>;

    // 1. Find the affiliate program
    const program = await AffiliateProgram.findByPk(program_id);

    if (!program) {
      error(res, 'NOT_FOUND', `Programme affilié #${program_id} introuvable`, 404);
      return;
    }

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    // 2. Process each row
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 1; // 1-based for user-facing errors

      try {
        // 2a. Idempotency: skip if order_ref already exists
        const existing = await Conversion.findOne({
          where: { order_ref: row.order_ref },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // 2b. Find ambassador by referral_code (sub_id)
        const ambassador = await User.findOne({
          where: { referral_code: row.sub_id, role: 'ambassador' },
        });

        if (!ambassador) {
          errors.push({
            row: rowIndex,
            reason: `Ambassadeur introuvable pour sub_id: ${row.sub_id}`,
          });
          continue;
        }

        // 2c. Create conversion atomically
        await createConversionAtomic({
          ambassadorId: ambassador.id,
          affiliateProgramId: program_id,
          type: 'affiliate',
          amount: row.amount,
          commissionTotal: row.commission,
          orderRef: row.order_ref,
          attributionMethod: 'csv_import',
          attributionConfidence: 'medium',
        });

        imported++;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        errors.push({ row: rowIndex, reason: message });
      }
    }

    // 3. Return summary
    success(res, { imported, skipped, errors });
  } catch (err) {
    console.error('CSV import error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de l\'import CSV', 500);
  }
});

// ── GET /api/admin/stats ──
router.get('/stats', async (_req, res) => {
  try {
    const [totalUsers, totalAmbassadors, totalBuyers, totalConversions, totalRevenue] =
      await Promise.all([
        User.count(),
        User.count({ where: { role: 'ambassador' } }),
        User.count({ where: { role: 'buyer' } }),
        Conversion.count(),
        Conversion.sum('amount') as Promise<number | null>,
      ]);

    // Conversions this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const conversionsThisMonth = await Conversion.count({
      where: { created_at: { [Op.gte]: monthStart } },
    });

    const revenueThisMonth = (await Conversion.sum('amount', {
      where: { created_at: { [Op.gte]: monthStart } },
    })) as number | null;

    success(res, {
      stats: {
        totalUsers,
        totalAmbassadors,
        totalBuyers,
        totalConversions,
        totalRevenue: totalRevenue ?? 0,
        conversionsThisMonth,
        revenueThisMonth: revenueThisMonth ?? 0,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/admin/conversions ──
router.get('/conversions', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const programmeId = (req.query.programmeId || req.query.program) as string | undefined;
    const search = req.query.search as string | undefined;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status && ['pending', 'confirmed', 'paid', 'cancelled'].includes(status)) {
      where.status = status;
    }

    if (programmeId && !isNaN(Number(programmeId))) {
      where.affiliate_program_id = Number(programmeId);
    }

    if (search) {
      where.order_ref = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Conversion.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'ambassador',
          attributes: ['id', 'firstname', 'lastname', 'email'],
        },
        {
          model: AffiliateProgram,
          as: 'program',
          attributes: ['id', 'display_name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin conversions list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/admin/conversions/:id/confirm ──
router.put('/conversions/:id/confirm', async (req, res) => {
  try {
    const conversionId = Number(req.params.id);
    const conversion = await confirmConversion(conversionId, req.user!.userId);
    success(res, { conversion });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';

    if (message.includes('introuvable')) {
      error(res, 'NOT_FOUND', message, 404);
      return;
    }

    if (message.includes('doit être en statut')) {
      error(res, 'INVALID_STATUS', message, 400);
      return;
    }

    console.error('Confirm conversion error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/admin/conversions/:id/pay ──
router.put('/conversions/:id/pay', async (req, res) => {
  try {
    const conversionId = Number(req.params.id);
    const conversion = await payConversion(conversionId, req.user!.userId);
    success(res, { conversion });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';

    if (message.includes('introuvable')) {
      error(res, 'NOT_FOUND', message, 404);
      return;
    }

    if (message.includes('doit être en statut')) {
      error(res, 'INVALID_STATUS', message, 400);
      return;
    }

    console.error('Pay conversion error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/admin/conversions/:id/cancel ──
const cancelSchema = z.object({
  reason: z.string().min(1, 'La raison est requise'),
});

router.put('/conversions/:id/cancel', validate(cancelSchema), async (req, res) => {
  try {
    const conversionId = Number(req.params.id);
    const { reason } = req.body as z.infer<typeof cancelSchema>;
    const conversion = await cancelConversion(conversionId, req.user!.userId, reason);
    success(res, { conversion });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';

    if (message.includes('introuvable')) {
      error(res, 'NOT_FOUND', message, 404);
      return;
    }

    if (message.includes('doit être en statut')) {
      error(res, 'INVALID_STATUS', message, 400);
      return;
    }

    console.error('Cancel conversion error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

export default router;
