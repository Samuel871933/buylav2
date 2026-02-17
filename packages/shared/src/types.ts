export type UserRole = 'ambassador' | 'buyer' | 'admin';

export type UserTier = 'beginner' | 'active' | 'performer' | 'expert' | 'elite';

export type ConversionType = 'affiliate' | 'dropship';

export type ConversionStatus = 'pending' | 'confirmed' | 'paid' | 'cancelled';

export type PayoutMethod = 'stripe' | 'paypal' | 'bank_transfer';

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

export type PayoutType = 'ambassador' | 'cashback';

export type CashbackTransactionType = 'earned' | 'withdrawal' | 'clawback' | 'adjustment';

export type FraudFlagType = 'self_buy' | 'click_spam' | 'fake_account' | 'self_referral' | 'cashback_abuse';

export type FraudSeverity = 'low' | 'medium' | 'high' | 'critical';

export type FraudFlagStatus = 'pending' | 'reviewed' | 'confirmed' | 'dismissed';

export type DisputeType = 'refund' | 'attribution_error' | 'fraud' | 'other';

export type DisputeStatus = 'open' | 'investigating' | 'resolved' | 'rejected';

export type ReconciliationMethod = 'postback' | 'csv_import' | 'api_manual' | 'api_scheduled' | 'stripe';

export type SettingType = 'number' | 'string' | 'boolean' | 'json';

export type SettingCategory = 'payouts' | 'cashback' | 'general' | 'limits';

export type NetworkType = 'direct' | 'awin' | 'affilae' | 'cj' | 'amazon' | 'custom';

export type ProductType = 'affiliate' | 'dropship' | 'redirect';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
