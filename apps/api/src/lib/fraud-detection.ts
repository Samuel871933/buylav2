import { Conversion, FraudFlag, OutboundClick, User, Op } from '@buyla/db';
import { onFraudFlagCreated } from './email-triggers';

// ── Helpers ──

/**
 * Create a FraudFlag only if no pending flag of the same type already exists
 * for this user.
 */
async function flagIfNew(
  userId: string,
  type: FraudFlag['type'],
  severity: FraudFlag['severity'],
  details: object,
): Promise<void> {
  const existing = await FraudFlag.findOne({
    where: {
      user_id: userId,
      type,
      status: 'pending',
    },
  });

  if (!existing) {
    const flag = await FraudFlag.create({
      user_id: userId,
      type,
      severity,
      details,
    });

    // Fire-and-forget admin email for high/critical severity
    if (severity === 'high' || severity === 'critical') {
      onFraudFlagCreated(flag.id).catch(err => console.error('Fraud flag email failed:', err));
    }
  }
}

// ── Individual checks ──

/**
 * Self-buy detection: ambassador bought through their own link.
 */
async function checkSelfBuy(conversion: Conversion): Promise<void> {
  if (
    conversion.buyer_user_id &&
    conversion.buyer_user_id === conversion.ambassador_id
  ) {
    await flagIfNew(conversion.ambassador_id, 'self_buy', 'high', {
      conversion_id: conversion.id,
      timestamp: new Date().toISOString(),
      buyer_user_id: conversion.buyer_user_id,
    });
  }
}

/**
 * Click spam detection: more than 50 outbound clicks from this ambassador
 * in the last hour.
 */
async function checkClickSpam(conversion: Conversion): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  const clickCount = await OutboundClick.count({
    where: {
      ambassador_id: conversion.ambassador_id,
      clicked_at: { [Op.gte]: oneHourAgo },
    },
  });

  if (clickCount > 50) {
    await flagIfNew(conversion.ambassador_id, 'click_spam', 'medium', {
      conversion_id: conversion.id,
      timestamp: new Date().toISOString(),
      clicks_last_hour: clickCount,
    });
  }
}

/**
 * Self-referral detection: ambassador registered with their own referral code
 * (referred_by points to themselves).
 */
async function checkSelfReferral(conversion: Conversion): Promise<void> {
  const user = await User.findByPk(conversion.ambassador_id);

  if (user && user.referred_by === user.id) {
    await flagIfNew(conversion.ambassador_id, 'self_referral', 'high', {
      conversion_id: conversion.id,
      timestamp: new Date().toISOString(),
      user_id: user.id,
      referred_by: user.referred_by,
    });
  }
}

/**
 * Rapid conversion pattern: more than 20 conversions from this ambassador
 * in the last 24 hours.
 */
async function checkRapidConversions(conversion: Conversion): Promise<void> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const conversionCount = await Conversion.count({
    where: {
      ambassador_id: conversion.ambassador_id,
      created_at: { [Op.gte]: twentyFourHoursAgo },
    },
  });

  if (conversionCount > 20) {
    await flagIfNew(conversion.ambassador_id, 'click_spam', 'medium', {
      conversion_id: conversion.id,
      timestamp: new Date().toISOString(),
      conversions_last_24h: conversionCount,
      reason: 'rapid_conversion_pattern',
    });
  }
}

// ── Main entry point ──

/**
 * Run all fraud checks for a newly created conversion.
 * Called fire-and-forget after a conversion is committed.
 */
export async function checkFraud(conversionId: number): Promise<void> {
  const conversion = await Conversion.findByPk(conversionId);

  if (!conversion) {
    console.warn(`[fraud-detection] Conversion not found: ${conversionId}`);
    return;
  }

  await Promise.all([
    checkSelfBuy(conversion),
    checkClickSpam(conversion),
    checkSelfReferral(conversion),
    checkRapidConversions(conversion),
  ]);
}
