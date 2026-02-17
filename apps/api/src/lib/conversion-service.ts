import {
  sequelize,
  Conversion,
  CashbackTransaction,
  User,
  CommissionTier,
  AffiliateProgram,
  Op,
} from '@buyla/db';
import type { Transaction } from '@buyla/db';
import { calculateShares } from './commission-calculator';
import { checkFraud } from './fraud-detection';
import { onFirstSale, onTierUp, onCashbackEarned } from './email-triggers';

// ── Types ──

export interface CreateConversionParams {
  ambassadorId: string;
  affiliateProgramId: number;
  type: 'affiliate' | 'dropship';
  amount: number;
  commissionTotal: number;
  orderRef?: string;
  outboundClickId?: number;
  buyerUserId?: string | null;
  productId?: number | null;
  attributionMethod: string;
  attributionConfidence: 'high' | 'medium' | 'low';
}

// ── Cashback helper ──

/**
 * Credit cashback to a buyer's wallet within an existing transaction.
 *
 * 1. Read current user.cashback_balance
 * 2. Create a CashbackTransaction record (type: 'earned')
 * 3. Increment user.cashback_balance
 */
export async function creditCashback(
  userId: string,
  amount: number,
  conversionId: number,
  transaction: Transaction,
): Promise<void> {
  // Lock the user row to prevent race conditions on balance
  const user = await User.findByPk(userId, { transaction, lock: true });

  if (!user) {
    throw new Error(`Buyer user not found: ${userId}`);
  }

  const currentBalance = Number(user.cashback_balance);
  const balanceAfter = Math.round((currentBalance + amount) * 100) / 100;

  await CashbackTransaction.create(
    {
      user_id: userId,
      conversion_id: conversionId,
      type: 'earned',
      amount,
      balance_after: balanceAfter,
    },
    { transaction },
  );

  await user.update(
    { cashback_balance: balanceAfter },
    { transaction },
  );
}

// ── Main function ──

/**
 * Create a conversion inside a Sequelize transaction with full rollback support.
 *
 * Steps:
 * 1. Calculate commission shares
 * 2. Find sponsor_id from ambassador's referred_by
 * 3. Create the Conversion record with computed values + snapshot rates
 * 4. If buyer exists and buyerShare > 0, credit cashback
 * 5. Increment ambassador.total_sales
 * 6. Check for tier-up
 * 7. Return the created conversion
 */
export async function createConversionAtomic(
  params: CreateConversionParams,
): Promise<Conversion> {
  const {
    ambassadorId,
    affiliateProgramId,
    type,
    amount,
    commissionTotal,
    orderRef,
    outboundClickId,
    buyerUserId,
    productId,
    attributionMethod,
    attributionConfidence,
  } = params;

  const result = await sequelize.transaction(async (transaction) => {
    // ── 1. Calculate commission shares ──

    const shares = await calculateShares({
      ambassadorId,
      affiliateProgramId,
      amount,
      commissionTotal,
      type,
      productId,
    });

    // ── 2. Find sponsor_id ──

    const ambassador = await User.findByPk(ambassadorId, { transaction });

    if (!ambassador) {
      throw new Error(`Ambassador not found: ${ambassadorId}`);
    }

    const oldTier = ambassador.tier;
    const sponsorId = ambassador.referred_by ?? null;

    // ── 3. Create the Conversion record ──

    const conv = await Conversion.create(
      {
        ambassador_id: ambassadorId,
        sponsor_id: sponsorId,
        buyer_user_id: buyerUserId ?? null,
        product_id: productId ?? null,
        outbound_click_id: outboundClickId ?? null,
        affiliate_program_id: affiliateProgramId,
        type,
        order_ref: orderRef ?? null,
        amount,
        commission_total: commissionTotal,
        ambassador_share: shares.ambassadorShare,
        sponsor_share: shares.sponsorShare,
        buyer_share: shares.buyerShare,
        platform_share: shares.platformShare,
        applied_ambassador_rate: shares.appliedAmbassadorRate,
        applied_sponsor_rate: shares.appliedSponsorRate,
        applied_buyer_rate: shares.appliedBuyerRate,
        status: 'pending',
        attribution_method: attributionMethod,
        attribution_confidence: attributionConfidence,
      },
      { transaction },
    );

    // ── 4. Credit buyer cashback if applicable ──

    if (buyerUserId && shares.buyerShare > 0) {
      await creditCashback(
        buyerUserId,
        shares.buyerShare,
        conv.id,
        transaction,
      );
    }

    // ── 5. Increment ambassador.total_sales ──

    const newTotalSales = ambassador.total_sales + 1;

    await ambassador.update(
      { total_sales: newTotalSales },
      { transaction },
    );

    // ── 6. Check for tier-up ──

    const nextTier = await CommissionTier.findOne({
      where: {
        min_sales: {
          [Op.lte]: newTotalSales,
        },
      },
      order: [['min_sales', 'DESC']],
      transaction,
    });

    let tierChanged = false;
    let newTierName = oldTier;
    let newTierRate = 0;

    if (nextTier && nextTier.name !== ambassador.tier) {
      await ambassador.update(
        { tier: nextTier.name as User['tier'] },
        { transaction },
      );
      tierChanged = true;
      newTierName = nextTier.name as User['tier'];
      newTierRate = Number(nextTier.ambassador_rate_affiliate);
    }

    // ── 7. Return the created conversion + metadata ──

    return {
      conv,
      isFirstSale: newTotalSales === 1,
      tierChanged,
      newTierName,
      newTierRate,
      buyerShare: shares.buyerShare,
    };
  });

  const { conv: conversion, isFirstSale: isFirst, tierChanged, newTierName, newTierRate, buyerShare } = result;

  // Fire & forget fraud check
  checkFraud(conversion.id).catch(err => console.error('Fraud check failed:', err));

  // Fire & forget email triggers
  if (isFirst) {
    onFirstSale(conversion.id).catch(err => console.error('First sale email failed:', err));
  }

  if (tierChanged) {
    onTierUp(ambassadorId, newTierName, newTierRate).catch(err => console.error('Tier up email failed:', err));
  }

  if (buyerUserId && buyerShare > 0) {
    // Fetch program name for the cashback email
    const program = await AffiliateProgram.findByPk(affiliateProgramId, { attributes: ['display_name'] });
    const programName = program?.display_name || 'Programme affilié';
    onCashbackEarned(buyerUserId, buyerShare, programName).catch(err => console.error('Cashback earned email failed:', err));
  }

  return conversion;
}
