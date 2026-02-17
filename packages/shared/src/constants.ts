export const COOKIE_AMB_REF_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds
export const COOKIE_VISITOR_ID_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

export const JWT_ACCESS_EXPIRY = '24h';
export const JWT_REFRESH_EXPIRY = '7d';

export const PASSWORD_MIN_LENGTH = 8;
export const REFERRAL_CODE_LENGTH = 8;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const MIN_PAYOUT_AMBASSADOR = 50;
export const MIN_PAYOUT_CASHBACK = 10;
export const DEFAULT_BUYER_CASHBACK_RATE = 10;

export const TIERS = ['beginner', 'active', 'performer', 'expert', 'elite'] as const;

export const TIER_THRESHOLDS = {
  beginner: 0,
  active: 10,
  performer: 30,
  expert: 75,
  elite: 150,
} as const;

export const RATE_LIMITS = {
  login: { max: 5, windowMs: 15 * 60 * 1000 },
  register: { max: 3, windowMs: 60 * 60 * 1000 },
  forgotPassword: { max: 3, windowMs: 60 * 60 * 1000 },
  trackingClick: { max: 60, windowMs: 60 * 1000 },
  trackingVisit: { max: 120, windowMs: 60 * 1000 },
  products: { max: 200, windowMs: 60 * 1000 },
  admin: { max: 100, windowMs: 60 * 1000 },
} as const;
