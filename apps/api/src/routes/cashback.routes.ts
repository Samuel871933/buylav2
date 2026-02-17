import { Router } from 'express';
import { z } from 'zod';
import {
  sequelize,
  User,
  CashbackTransaction,
  Conversion,
  AffiliateProgram,
  OutboundClick,
  Payout,
  PayoutInfo,
  Sequelize,
  Op,
} from '@buyla/db';
import type { Transaction } from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getSettingNumber } from '../lib/settings';

const router = Router();

// All cashback routes require authentication
router.use(checkAuth());

// ── GET /api/cashback/balance ── Return current user's cashback balance breakdown
router.get('/balance', async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get the user for actual retirable balance
    const user = await User.findByPk(userId, {
      attributes: ['cashback_balance'],
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    // confirmed = SUM of earned cashback where linked conversion is confirmed or paid
    const confirmedResult = await CashbackTransaction.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('CashbackTransaction.amount')), 0), 'total'],
      ],
      include: [{
        model: Conversion,
        as: 'conversion',
        attributes: [],
        where: { status: { [Op.in]: ['confirmed', 'paid'] } },
      }],
      where: {
        user_id: userId,
        type: 'earned',
      },
      raw: true,
    }) as any;

    // pending = SUM of earned cashback where linked conversion is pending
    const pendingResult = await CashbackTransaction.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('CashbackTransaction.amount')), 0), 'total'],
      ],
      include: [{
        model: Conversion,
        as: 'conversion',
        attributes: [],
        where: { status: 'pending' },
      }],
      where: {
        user_id: userId,
        type: 'earned',
      },
      raw: true,
    }) as any;

    // withdrawn = SUM of withdrawal transactions (these are negative amounts)
    const withdrawnResult = await CashbackTransaction.findOne({
      attributes: [
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.fn('ABS', Sequelize.col('CashbackTransaction.amount'))), 0), 'total'],
      ],
      where: {
        user_id: userId,
        type: 'withdrawal',
      },
      raw: true,
    }) as any;

    success(res, {
      confirmed: Number(confirmedResult?.total ?? 0),
      pending: Number(pendingResult?.total ?? 0),
      withdrawn: Number(withdrawnResult?.total ?? 0),
      available: Number(user.cashback_balance ?? 0),
    });
  } catch (err) {
    console.error('Cashback balance error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/cashback/history ── Paginated cashback transaction history
router.get('/history', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await CashbackTransaction.findAndCountAll({
      where: { user_id: userId },
      include: [{
        model: Conversion,
        as: 'conversion',
        attributes: ['id', 'amount', 'status', 'created_at'],
        include: [{
          model: AffiliateProgram,
          as: 'program',
          attributes: ['id', 'name', 'display_name'],
        }],
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Cashback history error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── POST /api/cashback/withdraw ── Request a cashback withdrawal
const withdrawSchema = z.object({
  amount: z.number().positive('Le montant doit être positif'),
});

router.post('/withdraw', validate(withdrawSchema), async (req, res) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const userId = req.user!.userId;
    const { amount } = req.body as z.infer<typeof withdrawSchema>;

    // Lock the user row for update to prevent race conditions
    const user = await User.findByPk(userId, {
      attributes: ['id', 'cashback_balance'],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    const currentBalance = Number(user.cashback_balance ?? 0);

    // Check amount <= balance
    if (amount > currentBalance) {
      await t.rollback();
      error(res, 'INSUFFICIENT_BALANCE', 'Solde insuffisant', 400);
      return;
    }

    // Check minimum payout threshold from settings (default 10 EUR)
    const minPayout = (await getSettingNumber('min_payout_cashback')) || 10;
    if (amount < minPayout) {
      await t.rollback();
      error(res, 'MIN_PAYOUT', `Le montant minimum de retrait est de ${minPayout} EUR`, 400);
      return;
    }

    // Get user's payout method
    const payoutInfo = await PayoutInfo.findOne({
      where: { user_id: userId },
      transaction: t,
    });

    const method = payoutInfo?.method ?? 'bank';

    // Create Payout record
    const payout = await Payout.create({
      user_id: userId,
      amount,
      type: 'cashback',
      method,
      status: 'pending',
    }, { transaction: t });

    // Deduct from user's cashback_balance
    const newBalance = currentBalance - amount;
    await User.update(
      { cashback_balance: newBalance },
      { where: { id: userId }, transaction: t },
    );

    // Create CashbackTransaction with type='withdrawal', negative amount
    await CashbackTransaction.create({
      user_id: userId,
      type: 'withdrawal',
      amount: -amount,
      balance_after: newBalance,
      description: `Retrait cashback #${payout.id}`,
    }, { transaction: t });

    await t.commit();

    success(res, {
      payout_id: payout.id,
      amount,
      new_balance: newBalance,
      method,
      status: 'pending',
    }, 201);
  } catch (err) {
    await t.rollback();
    console.error('Cashback withdraw error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── POST /api/cashback/claim ── Claim pending cashback from visitor_id cookie
const claimSchema = z.object({
  visitor_id: z.string().min(1, 'visitor_id requis'),
});

router.post('/claim', validate(claimSchema), async (req, res) => {
  const t: Transaction = await sequelize.transaction();

  try {
    const userId = req.user!.userId;
    const { visitor_id } = req.body as z.infer<typeof claimSchema>;

    // Find OutboundClicks matching visitor_id where buyer_user_id is null
    const clicks = await OutboundClick.findAll({
      where: {
        visitor_id,
        buyer_user_id: null,
      },
      transaction: t,
    });

    if (clicks.length === 0) {
      await t.commit();
      success(res, { claimed: 0, credited: 0, message: 'Aucun clic à réclamer' });
      return;
    }

    // Update those clicks with buyer_user_id = current user
    const clickIds = clicks.map((c) => c.id);
    await OutboundClick.update(
      { buyer_user_id: userId },
      { where: { id: { [Op.in]: clickIds } }, transaction: t },
    );

    // Find conversions linked to those clicks that have buyer_share > 0 but no buyer_user_id
    const conversions = await Conversion.findAll({
      where: {
        outbound_click_id: { [Op.in]: clickIds },
        buyer_share: { [Op.gt]: 0 },
        buyer_user_id: null,
      },
      transaction: t,
    });

    let totalCredited = 0;

    // Lock the user row for balance update
    const user = await User.findByPk(userId, {
      attributes: ['id', 'cashback_balance'],
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    let currentBalance = Number(user.cashback_balance ?? 0);

    for (const conversion of conversions) {
      const cashbackAmount = Number(conversion.buyer_share);

      // Update conversion with buyer_user_id
      await conversion.update({ buyer_user_id: userId }, { transaction: t });

      // Credit the user's cashback
      currentBalance += cashbackAmount;

      await CashbackTransaction.create({
        user_id: userId,
        conversion_id: conversion.id,
        type: 'earned',
        amount: cashbackAmount,
        balance_after: currentBalance,
        description: `Cashback réclamé - conversion #${conversion.id}`,
      }, { transaction: t });

      totalCredited += cashbackAmount;
    }

    // Update user balance
    if (totalCredited > 0) {
      await User.update(
        { cashback_balance: currentBalance },
        { where: { id: userId }, transaction: t },
      );
    }

    await t.commit();

    success(res, {
      claimed: clickIds.length,
      conversions_found: conversions.length,
      credited: totalCredited,
      new_balance: currentBalance,
    });
  } catch (err) {
    await t.rollback();
    console.error('Cashback claim error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

export default router;
