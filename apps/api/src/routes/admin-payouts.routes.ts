import { Router } from 'express';
import { z } from 'zod';
import {
  sequelize,
  User,
  Payout,
  Conversion,
  AuditLog,
  CashbackTransaction,
  Sequelize,
  Op,
} from '@buyla/db';
import type { Transaction } from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { onPayoutApproved } from '../lib/email-triggers';

const router = Router();

// All routes require auth + admin role
router.use(checkAuth(), checkRole('admin'));

// ════════════════════════════════════════════════════════════════════════════
//  VALIDATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const completePayoutSchema = z.object({
  reference: z.string().min(1, 'La référence de paiement est requise'),
});

const rejectPayoutSchema = z.object({
  reason: z.string().min(1, 'La raison du rejet est requise'),
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/payouts - Paginated list with filters
// ════════════════════════════════════════════════════════════════════════════

router.get('/payouts', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};

    if (status && ['pending', 'processing', 'paid', 'failed'].includes(status)) {
      where.status = status;
    }

    if (type && ['ambassador', 'cashback'].includes(type)) {
      where.type = type;
    }

    // Build user search condition
    let userWhere: Record<string, unknown> | undefined;
    if (search) {
      userWhere = {
        [Op.or]: [
          { firstname: { [Op.like]: `%${search}%` } },
          { lastname: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      };
    }

    const { count, rows } = await Payout.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email'],
          where: userWhere,
          required: !!search,
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin payouts list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des paiements', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  GET /api/admin/payouts/summary - Summary stats
// ════════════════════════════════════════════════════════════════════════════

router.get('/payouts/summary', async (_req, res) => {
  try {
    // Total pending ambassador payouts
    const ambassadorPendingResult = await Payout.findOne({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total'],
      ],
      where: {
        type: 'ambassador',
        status: 'pending',
      },
      raw: true,
    }) as any;

    // Total pending cashback payouts
    const cashbackPendingResult = await Payout.findOne({
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total'],
      ],
      where: {
        type: 'cashback',
        status: 'pending',
      },
      raw: true,
    }) as any;

    // Total paid this month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const paidThisMonthResult = await Payout.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total'],
      ],
      where: {
        status: 'paid',
        paid_at: { [Op.gte]: firstDayOfMonth },
      },
      raw: true,
    }) as any;

    // Average payout amount (all paid payouts)
    const avgResult = await Payout.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('AVG', Sequelize.col('amount')), 0), 'avg'],
      ],
      where: {
        status: 'paid',
      },
      raw: true,
    }) as any;

    success(res, {
      pending_payouts_count: Number(ambassadorPendingResult?.count ?? 0),
      pending_payouts_amount: Number(ambassadorPendingResult?.total ?? 0),
      pending_cashback_count: Number(cashbackPendingResult?.count ?? 0),
      pending_cashback_amount: Number(cashbackPendingResult?.total ?? 0),
      paid_this_month: Number(paidThisMonthResult?.total ?? 0),
      average_amount: Number(Number(avgResult?.avg ?? 0).toFixed(2)),
    });
  } catch (err) {
    console.error('Admin payouts summary error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération du résumé des paiements', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/admin/payouts/:id/process - Mark as processing
// ════════════════════════════════════════════════════════════════════════════

router.put('/payouts/:id/process', async (req, res) => {
  try {
    const payout = await Payout.findByPk(req.params.id);

    if (!payout) {
      error(res, 'NOT_FOUND', 'Paiement introuvable', 404);
      return;
    }

    if (payout.status !== 'pending') {
      error(res, 'INVALID_STATUS', `Impossible de traiter un paiement avec le statut "${payout.status}"`, 400);
      return;
    }

    const oldData = { status: payout.status };

    await payout.update({ status: 'processing' });

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'process',
      entity_type: 'payout',
      entity_id: String(payout.id),
      old_values: oldData,
      new_values: { status: 'processing' },
      ip_address: req.ip || null,
    });

    success(res, { payout });
  } catch (err) {
    console.error('Admin process payout error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors du traitement du paiement', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/admin/payouts/:id/complete - Mark as paid
// ════════════════════════════════════════════════════════════════════════════

router.put('/payouts/:id/complete', validate(completePayoutSchema), async (req, res) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const payout = await Payout.findByPk(req.params.id, { transaction: t });

    if (!payout) {
      await t.rollback();
      error(res, 'NOT_FOUND', 'Paiement introuvable', 404);
      return;
    }

    if (payout.status !== 'processing') {
      await t.rollback();
      error(res, 'INVALID_STATUS', `Impossible de compléter un paiement avec le statut "${payout.status}". Le paiement doit être en cours de traitement.`, 400);
      return;
    }

    const { reference } = req.body as z.infer<typeof completePayoutSchema>;
    const oldData = { status: payout.status, reference: payout.reference, paid_at: payout.paid_at };

    await payout.update({
      status: 'paid',
      reference,
      paid_at: new Date(),
    }, { transaction: t });

    // For ambassador payouts: mark confirmed conversions as 'paid'
    if (payout.type === 'ambassador') {
      await Conversion.update(
        {
          status: 'paid',
          paid_at: new Date(),
        },
        {
          where: {
            ambassador_id: payout.user_id,
            status: 'confirmed',
          },
          transaction: t,
        },
      );
    }
    // For cashback payouts: balance was already deducted at request time, nothing to do

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'complete',
      entity_type: 'payout',
      entity_id: String(payout.id),
      old_values: oldData,
      new_values: { status: 'paid', reference, paid_at: payout.paid_at },
      ip_address: req.ip || null,
    }, { transaction: t });

    await t.commit();

    // Fire-and-forget email to user about payout completion
    onPayoutApproved(payout.id).catch(err => console.error('Payout approved email failed:', err));

    success(res, { payout });
  } catch (err) {
    await t.rollback();
    console.error('Admin complete payout error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la finalisation du paiement', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  PUT /api/admin/payouts/:id/reject - Reject payout
// ════════════════════════════════════════════════════════════════════════════

router.put('/payouts/:id/reject', validate(rejectPayoutSchema), async (req, res) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const payout = await Payout.findByPk(req.params.id, { transaction: t });

    if (!payout) {
      await t.rollback();
      error(res, 'NOT_FOUND', 'Paiement introuvable', 404);
      return;
    }

    if (payout.status !== 'pending' && payout.status !== 'processing') {
      await t.rollback();
      error(res, 'INVALID_STATUS', `Impossible de rejeter un paiement avec le statut "${payout.status}"`, 400);
      return;
    }

    const { reason } = req.body as z.infer<typeof rejectPayoutSchema>;
    const oldData = { status: payout.status };

    await payout.update({ status: 'failed' }, { transaction: t });

    // For cashback payouts: refund the amount back to user.cashback_balance
    if (payout.type === 'cashback') {
      // Lock the user row
      const user = await User.findByPk(payout.user_id, {
        attributes: ['id', 'cashback_balance'],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (user) {
        const currentBalance = Number(user.cashback_balance ?? 0);
        const newBalance = currentBalance + Number(payout.amount);

        await User.update(
          { cashback_balance: newBalance },
          { where: { id: user.id }, transaction: t },
        );

        // Create CashbackTransaction for the refund
        await CashbackTransaction.create({
          user_id: payout.user_id,
          type: 'adjustment',
          amount: Number(payout.amount),
          balance_after: newBalance,
          description: `Remboursement retrait rejeté #${payout.id} - ${reason}`,
        }, { transaction: t });
      }
    }
    // For ambassador payouts: nothing to reverse (conversions stay confirmed)

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'reject',
      entity_type: 'payout',
      entity_id: String(payout.id),
      old_values: oldData,
      new_values: { status: 'failed', reason },
      ip_address: req.ip || null,
    }, { transaction: t });

    await t.commit();

    success(res, { payout });
  } catch (err) {
    await t.rollback();
    console.error('Admin reject payout error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors du rejet du paiement', 500);
  }
});

export default router;
