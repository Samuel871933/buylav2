import {
  User,
  CommissionTier,
  CommissionBoost,
  AffiliateProgram,
  Op,
} from '@buyla/db';

// ── Types ──

export interface CalculateSharesParams {
  ambassadorId: string;
  affiliateProgramId: number;
  amount: number;
  commissionTotal: number;
  type: 'affiliate' | 'dropship';
  productId?: number | null;
  categoryBuyerRate?: number | null;
  productBuyerOverride?: number | null;
}

export interface SharesResult {
  ambassadorShare: number;
  sponsorShare: number;
  buyerShare: number;
  platformShare: number;
  appliedAmbassadorRate: number;
  appliedSponsorRate: number;
  appliedBuyerRate: number;
}

// ── Default values ──

const DEFAULT_BUYER_CASHBACK_RATE = 10;

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Main function ──

/**
 * Calculate the commission distribution for a conversion.
 *
 * CASCADE PRIORITY:
 * 1. Commission boosts (user-specific > global)
 * 2. Tier-based rates
 * 3. Program / category / product rates for buyer cashback
 * 4. Default global rate (10%)
 */
export async function calculateShares(
  params: CalculateSharesParams,
): Promise<SharesResult> {
  const {
    ambassadorId,
    affiliateProgramId,
    commissionTotal,
    type,
    categoryBuyerRate,
    productBuyerOverride,
  } = params;

  // ── 1. Find the ambassador & their tier ──

  const ambassador = await User.findByPk(ambassadorId);
  if (!ambassador) {
    throw new Error(`Ambassador not found: ${ambassadorId}`);
  }

  const tier = await CommissionTier.findOne({
    where: {
      min_sales: { [Op.lte]: ambassador.total_sales },
    },
    order: [['min_sales', 'DESC']],
  });

  if (!tier) {
    throw new Error(
      `No commission tier found for total_sales=${ambassador.total_sales}`,
    );
  }

  // ── 2. Check for active commission boosts ──

  const now = new Date();

  // Query boosts with proper max_uses vs current_uses check
  const allBoosts = await CommissionBoost.findAll({
    where: {
      is_active: true,
      start_date: { [Op.lte]: now },
      [Op.or]: [
        { end_date: null },
        { end_date: { [Op.gte]: now } },
      ],
    },
    order: [
      // user-specific first (non-null user_id), then global (null)
      ['user_id', 'DESC'],
    ],
  });

  // Filter in application code for max_uses check and user targeting
  const eligibleBoosts = allBoosts.filter((b) => {
    // max_uses check
    if (b.max_uses !== null && b.current_uses >= b.max_uses) return false;
    // user targeting: must be for this ambassador or global
    if (b.user_id !== null && b.user_id !== ambassadorId) return false;
    return true;
  });

  // Build boost map: type -> value (first match wins due to ordering)
  const boostMap: Partial<
    Record<'ambassador_rate' | 'buyer_cashback' | 'sponsor_rate', number>
  > = {};

  for (const boost of eligibleBoosts) {
    if (!(boost.type in boostMap)) {
      boostMap[boost.type] = Number(boost.boost_value);
    }
  }

  // ── 3. Ambassador rate ──

  let ambassadorRate: number;

  if (boostMap.ambassador_rate !== undefined) {
    ambassadorRate = boostMap.ambassador_rate;
  } else {
    ambassadorRate =
      type === 'affiliate'
        ? Number(tier.ambassador_rate_affiliate)
        : Number(tier.ambassador_rate_dropship);
  }

  // ── 4. Sponsor rate ──

  let sponsorRate: number;

  const hasSponsor = ambassador.referred_by !== null;

  if (!hasSponsor) {
    sponsorRate = 0;
  } else if (boostMap.sponsor_rate !== undefined) {
    sponsorRate = boostMap.sponsor_rate;
  } else {
    sponsorRate = Number(tier.sponsor_rate);
  }

  // ── 5. Buyer cashback rate (cascade priority) ──

  let buyerRate: number;

  if (boostMap.buyer_cashback !== undefined) {
    // Boost takes highest priority
    buyerRate = boostMap.buyer_cashback;
  } else if (productBuyerOverride !== undefined && productBuyerOverride !== null) {
    // Priority 1: product-specific override
    buyerRate = productBuyerOverride;
  } else if (
    type === 'dropship' &&
    categoryBuyerRate !== undefined &&
    categoryBuyerRate !== null
  ) {
    // Priority 2: category rate (dropship only)
    buyerRate = categoryBuyerRate;
  } else {
    // Priority 3: program rate, falling back to default
    const program = await AffiliateProgram.findByPk(affiliateProgramId);

    if (program) {
      buyerRate = Number(program.buyer_cashback_rate);
    } else {
      // Priority 4: default global rate
      buyerRate = DEFAULT_BUYER_CASHBACK_RATE;
    }
  }

  // ── 6. Calculate amounts ──

  const ambassadorShare = round2(commissionTotal * (ambassadorRate / 100));
  const sponsorShare = round2(commissionTotal * (sponsorRate / 100));
  const buyerShare = round2(commissionTotal * (buyerRate / 100));
  const platformShare = round2(
    commissionTotal - ambassadorShare - sponsorShare - buyerShare,
  );

  // ── 7. Safety check ──

  if (platformShare < 0) {
    throw new Error('Commission distribution exceeds 100%');
  }

  return {
    ambassadorShare,
    sponsorShare,
    buyerShare,
    platformShare,
    appliedAmbassadorRate: ambassadorRate,
    appliedSponsorRate: sponsorRate,
    appliedBuyerRate: buyerRate,
  };
}
