import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @buyla/db before importing the module under test
vi.mock('@buyla/db', () => {
  const Op = {
    lte: Symbol('lte'),
    gte: Symbol('gte'),
    or: Symbol('or'),
  };

  return {
    Op,
    User: {
      findByPk: vi.fn(),
    },
    CommissionTier: {
      findOne: vi.fn(),
    },
    CommissionBoost: {
      findAll: vi.fn(),
    },
    AffiliateProgram: {
      findByPk: vi.fn(),
    },
  };
});

import { calculateShares } from '../lib/commission-calculator';
import { User, CommissionTier, CommissionBoost, AffiliateProgram } from '@buyla/db';

// Cast mocks
const mockUserFindByPk = User.findByPk as ReturnType<typeof vi.fn>;
const mockTierFindOne = CommissionTier.findOne as ReturnType<typeof vi.fn>;
const mockBoostFindAll = CommissionBoost.findAll as ReturnType<typeof vi.fn>;
const mockProgramFindByPk = AffiliateProgram.findByPk as ReturnType<typeof vi.fn>;

describe('calculateShares', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseParams = {
    ambassadorId: 'user-1',
    affiliateProgramId: 1,
    amount: 100,
    commissionTotal: 20,
    type: 'affiliate' as const,
  };

  it('calculates correct shares with tier rates', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 5,
      referred_by: null,
    });

    mockTierFindOne.mockResolvedValue({
      ambassador_rate_affiliate: 25,
      ambassador_rate_dropship: 20,
      sponsor_rate: 10,
    });

    mockBoostFindAll.mockResolvedValue([]);

    mockProgramFindByPk.mockResolvedValue({
      buyer_cashback_rate: 10,
    });

    const result = await calculateShares(baseParams);

    // 20€ commission: 25% ambassador = 5, 0% sponsor (no referred_by) = 0, 10% buyer = 2, platform = 13
    expect(result.ambassadorShare).toBe(5);
    expect(result.sponsorShare).toBe(0);
    expect(result.buyerShare).toBe(2);
    expect(result.platformShare).toBe(13);
    expect(result.appliedAmbassadorRate).toBe(25);
    expect(result.appliedSponsorRate).toBe(0);
    expect(result.appliedBuyerRate).toBe(10);
  });

  it('includes sponsor share when ambassador has referrer', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 10,
      referred_by: 'sponsor-1',
    });

    mockTierFindOne.mockResolvedValue({
      ambassador_rate_affiliate: 25,
      ambassador_rate_dropship: 20,
      sponsor_rate: 10,
    });

    mockBoostFindAll.mockResolvedValue([]);

    mockProgramFindByPk.mockResolvedValue({
      buyer_cashback_rate: 10,
    });

    const result = await calculateShares(baseParams);

    // 20€: ambassador 25% = 5, sponsor 10% = 2, buyer 10% = 2, platform = 11
    expect(result.ambassadorShare).toBe(5);
    expect(result.sponsorShare).toBe(2);
    expect(result.buyerShare).toBe(2);
    expect(result.platformShare).toBe(11);
  });

  it('applies commission boost over tier rate', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 10,
      referred_by: null,
    });

    mockTierFindOne.mockResolvedValue({
      ambassador_rate_affiliate: 25,
      ambassador_rate_dropship: 20,
      sponsor_rate: 10,
    });

    // Active boost: ambassador rate = 30%
    mockBoostFindAll.mockResolvedValue([
      {
        type: 'ambassador_rate',
        boost_value: 30,
        user_id: 'user-1',
        max_uses: null,
        current_uses: 0,
      },
    ]);

    mockProgramFindByPk.mockResolvedValue({
      buyer_cashback_rate: 10,
    });

    const result = await calculateShares(baseParams);

    // Boost overrides: 30% instead of 25%
    expect(result.ambassadorShare).toBe(6); // 20 * 30% = 6
    expect(result.appliedAmbassadorRate).toBe(30);
  });

  it('uses dropship rate for dropship type', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 5,
      referred_by: null,
    });

    mockTierFindOne.mockResolvedValue({
      ambassador_rate_affiliate: 25,
      ambassador_rate_dropship: 20,
      sponsor_rate: 10,
    });

    mockBoostFindAll.mockResolvedValue([]);

    mockProgramFindByPk.mockResolvedValue({
      buyer_cashback_rate: 10,
    });

    const result = await calculateShares({
      ...baseParams,
      type: 'dropship',
    });

    expect(result.ambassadorShare).toBe(4); // 20 * 20% = 4
    expect(result.appliedAmbassadorRate).toBe(20);
  });

  it('uses product buyer override when provided', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 5,
      referred_by: null,
    });

    mockTierFindOne.mockResolvedValue({
      ambassador_rate_affiliate: 25,
      ambassador_rate_dropship: 20,
      sponsor_rate: 10,
    });

    mockBoostFindAll.mockResolvedValue([]);

    const result = await calculateShares({
      ...baseParams,
      productBuyerOverride: 15,
    });

    // Product override buyer rate = 15%
    expect(result.buyerShare).toBe(3); // 20 * 15% = 3
    expect(result.appliedBuyerRate).toBe(15);
  });

  it('throws when ambassador not found', async () => {
    mockUserFindByPk.mockResolvedValue(null);

    await expect(calculateShares(baseParams)).rejects.toThrow(
      'Ambassador not found',
    );
  });

  it('throws when no commission tier found', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 5,
      referred_by: null,
    });
    mockTierFindOne.mockResolvedValue(null);

    await expect(calculateShares(baseParams)).rejects.toThrow(
      'No commission tier found',
    );
  });

  it('throws when distribution exceeds 100%', async () => {
    mockUserFindByPk.mockResolvedValue({
      total_sales: 5,
      referred_by: 'sponsor-1',
    });

    mockTierFindOne.mockResolvedValue({
      ambassador_rate_affiliate: 50,
      ambassador_rate_dropship: 50,
      sponsor_rate: 40,
    });

    // Boost for buyer at 20%
    mockBoostFindAll.mockResolvedValue([
      {
        type: 'buyer_cashback',
        boost_value: 20,
        user_id: null,
        max_uses: null,
        current_uses: 0,
      },
    ]);

    // 50% + 40% + 20% = 110% > 100%
    await expect(calculateShares(baseParams)).rejects.toThrow(
      'Commission distribution exceeds 100%',
    );
  });
});
