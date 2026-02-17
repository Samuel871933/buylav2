import {
  sequelize,
  Conversion,
  CashbackTransaction,
  User,
  AuditLog,
} from '@buyla/db';
import type { Transaction } from '@buyla/db';

// ── confirmConversion ──

/**
 * Transition a conversion from 'pending' to 'confirmed'.
 *
 * 1. Find the conversion (must be in 'pending' status)
 * 2. Update status to 'confirmed', set confirmed_at = now
 * 3. Create an audit log entry
 * 4. Return the updated conversion
 */
export async function confirmConversion(
  conversionId: number,
  adminId: string,
  transaction?: Transaction,
): Promise<Conversion> {
  const run = async (t: Transaction) => {
    const conversion = await Conversion.findByPk(conversionId, { transaction: t });

    if (!conversion) {
      throw new Error(`Conversion #${conversionId} introuvable`);
    }

    if (conversion.status !== 'pending') {
      throw new Error(
        `Conversion #${conversionId} doit être en statut "pending" (actuel: "${conversion.status}")`,
      );
    }

    await conversion.update(
      { status: 'confirmed', confirmed_at: new Date() },
      { transaction: t },
    );

    await AuditLog.create(
      {
        admin_id: adminId,
        action: 'conversion.confirmed',
        entity_type: 'conversion',
        entity_id: String(conversionId),
        old_values: { status: 'pending' },
        new_values: { status: 'confirmed' },
      },
      { transaction: t },
    );

    return conversion;
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction(run);
}

// ── payConversion ──

/**
 * Transition a conversion from 'confirmed' to 'paid'.
 *
 * 1. Find the conversion (must be in 'confirmed' status)
 * 2. Update status to 'paid', set paid_at = now
 * 3. Create an audit log entry
 * 4. Return the updated conversion
 */
export async function payConversion(
  conversionId: number,
  adminId: string,
  transaction?: Transaction,
): Promise<Conversion> {
  const run = async (t: Transaction) => {
    const conversion = await Conversion.findByPk(conversionId, { transaction: t });

    if (!conversion) {
      throw new Error(`Conversion #${conversionId} introuvable`);
    }

    if (conversion.status !== 'confirmed') {
      throw new Error(
        `Conversion #${conversionId} doit être en statut "confirmed" (actuel: "${conversion.status}")`,
      );
    }

    await conversion.update(
      { status: 'paid', paid_at: new Date() },
      { transaction: t },
    );

    await AuditLog.create(
      {
        admin_id: adminId,
        action: 'conversion.paid',
        entity_type: 'conversion',
        entity_id: String(conversionId),
        old_values: { status: 'confirmed' },
        new_values: { status: 'paid' },
      },
      { transaction: t },
    );

    return conversion;
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction(run);
}

// ── cancelConversion ──

/**
 * Cancel a conversion (from 'pending' or 'confirmed').
 *
 * 1. Find the conversion (must be in 'pending' or 'confirmed' status)
 * 2. Update status to 'cancelled'
 * 3. If buyer_share > 0 and buyer_user_id exists, create a clawback CashbackTransaction
 * 4. Create an audit log entry
 * 5. Return the updated conversion
 */
export async function cancelConversion(
  conversionId: number,
  adminId: string,
  reason: string,
  transaction?: Transaction,
): Promise<Conversion> {
  const run = async (t: Transaction) => {
    const conversion = await Conversion.findByPk(conversionId, { transaction: t });

    if (!conversion) {
      throw new Error(`Conversion #${conversionId} introuvable`);
    }

    if (conversion.status !== 'pending' && conversion.status !== 'confirmed') {
      throw new Error(
        `Conversion #${conversionId} doit être en statut "pending" ou "confirmed" (actuel: "${conversion.status}")`,
      );
    }

    const previousStatus = conversion.status;

    await conversion.update(
      { status: 'cancelled' },
      { transaction: t },
    );

    // Clawback buyer cashback if applicable
    if (Number(conversion.buyer_share) > 0 && conversion.buyer_user_id) {
      const user = await User.findByPk(conversion.buyer_user_id, {
        transaction: t,
        lock: true,
      });

      if (user) {
        const currentBalance = Number(user.cashback_balance);
        const clawbackAmount = Number(conversion.buyer_share);
        const balanceAfter = Math.round((currentBalance - clawbackAmount) * 100) / 100;

        await CashbackTransaction.create(
          {
            user_id: conversion.buyer_user_id,
            conversion_id: conversionId,
            type: 'clawback',
            amount: -clawbackAmount,
            balance_after: balanceAfter,
            description: `Annulation conversion #${conversionId}: ${reason}`,
          },
          { transaction: t },
        );

        await user.update(
          { cashback_balance: balanceAfter },
          { transaction: t },
        );
      }
    }

    await AuditLog.create(
      {
        admin_id: adminId,
        action: 'conversion.cancelled',
        entity_type: 'conversion',
        entity_id: String(conversionId),
        old_values: { status: previousStatus },
        new_values: { status: 'cancelled', reason },
      },
      { transaction: t },
    );

    return conversion;
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction(run);
}
