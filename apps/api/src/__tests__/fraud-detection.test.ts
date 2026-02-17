import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @buyla/db
vi.mock('@buyla/db', () => {
  const Op = {
    gte: Symbol('gte'),
  };

  return {
    Op,
    Conversion: {
      findByPk: vi.fn(),
      count: vi.fn(),
    },
    FraudFlag: {
      findOne: vi.fn(),
      create: vi.fn(),
    },
    OutboundClick: {
      count: vi.fn(),
    },
    User: {
      findByPk: vi.fn(),
    },
  };
});

// Mock email triggers
vi.mock('../lib/email-triggers', () => ({
  onFraudFlagCreated: vi.fn().mockResolvedValue(undefined),
}));

import { checkFraud } from '../lib/fraud-detection';
import { Conversion, FraudFlag, OutboundClick, User } from '@buyla/db';

const mockConversionFindByPk = Conversion.findByPk as ReturnType<typeof vi.fn>;
const mockConversionCount = (Conversion as any).count as ReturnType<typeof vi.fn>;
const mockFraudFindOne = FraudFlag.findOne as ReturnType<typeof vi.fn>;
const mockFraudCreate = FraudFlag.create as ReturnType<typeof vi.fn>;
const mockClickCount = OutboundClick.count as ReturnType<typeof vi.fn>;
const mockUserFindByPk = User.findByPk as ReturnType<typeof vi.fn>;

describe('checkFraud', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFraudFindOne.mockResolvedValue(null); // No existing flags by default
    mockFraudCreate.mockResolvedValue({ id: 1 });
    mockClickCount.mockResolvedValue(5); // Normal click count
    mockConversionCount.mockResolvedValue(3); // Normal conversion count
  });

  it('does nothing for non-existent conversion', async () => {
    mockConversionFindByPk.mockResolvedValue(null);

    await checkFraud(999);

    expect(mockFraudCreate).not.toHaveBeenCalled();
  });

  it('flags self-buy when buyer_user_id equals ambassador_id', async () => {
    mockConversionFindByPk.mockResolvedValue({
      id: 1,
      ambassador_id: 'user-1',
      buyer_user_id: 'user-1', // Same user!
    });

    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      referred_by: null,
    });

    await checkFraud(1);

    // Should create a self_buy flag
    expect(mockFraudCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'self_buy',
        severity: 'high',
      }),
    );
  });

  it('does not flag when buyer is different from ambassador', async () => {
    mockConversionFindByPk.mockResolvedValue({
      id: 1,
      ambassador_id: 'user-1',
      buyer_user_id: 'user-2', // Different user
    });

    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      referred_by: null,
    });

    await checkFraud(1);

    // self_buy should NOT be flagged
    const selfBuyCall = mockFraudCreate.mock.calls.find(
      (call: any[]) => call[0]?.type === 'self_buy',
    );
    expect(selfBuyCall).toBeUndefined();
  });

  it('flags click spam when >50 clicks in last hour', async () => {
    mockConversionFindByPk.mockResolvedValue({
      id: 1,
      ambassador_id: 'user-1',
      buyer_user_id: 'user-2',
    });

    mockClickCount.mockResolvedValue(75); // > 50 threshold

    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      referred_by: null,
    });

    await checkFraud(1);

    expect(mockFraudCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'click_spam',
        severity: 'medium',
      }),
    );
  });

  it('flags self-referral when user referred_by equals their own id', async () => {
    mockConversionFindByPk.mockResolvedValue({
      id: 1,
      ambassador_id: 'user-1',
      buyer_user_id: 'user-2',
    });

    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      referred_by: 'user-1', // Self-referral!
    });

    await checkFraud(1);

    expect(mockFraudCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        type: 'self_referral',
        severity: 'high',
      }),
    );
  });

  it('flags rapid conversions when >20 in 24h', async () => {
    mockConversionFindByPk.mockResolvedValue({
      id: 1,
      ambassador_id: 'user-1',
      buyer_user_id: 'user-2',
    });

    mockConversionCount.mockResolvedValue(25); // > 20 threshold

    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      referred_by: null,
    });

    await checkFraud(1);

    // Should flag for rapid conversions (uses 'click_spam' type with reason)
    const rapidCall = mockFraudCreate.mock.calls.find(
      (call: any[]) => call[0]?.details?.reason === 'rapid_conversion_pattern',
    );
    expect(rapidCall).toBeDefined();
  });

  it('does not duplicate flag if pending flag already exists', async () => {
    mockConversionFindByPk.mockResolvedValue({
      id: 1,
      ambassador_id: 'user-1',
      buyer_user_id: 'user-1', // Self-buy
    });

    // Existing pending flag
    mockFraudFindOne.mockResolvedValue({ id: 99, status: 'pending' });

    mockUserFindByPk.mockResolvedValue({
      id: 'user-1',
      referred_by: null,
    });

    await checkFraud(1);

    // Should NOT create new flag since one already exists
    expect(mockFraudCreate).not.toHaveBeenCalled();
  });
});
