export { User } from './user.model';
export type { UserAttributes, UserCreationAttributes } from './user.model';

export { CommissionTier } from './commission-tier.model';
export type { CommissionTierAttributes, CommissionTierCreationAttributes } from './commission-tier.model';

export { Setting } from './setting.model';
export type { SettingAttributes, SettingCreationAttributes } from './setting.model';

export { ConnectedSite } from './connected-site.model';
export type { ConnectedSiteAttributes, ConnectedSiteCreationAttributes } from './connected-site.model';

export { Notification } from './notification.model';
export type { NotificationAttributes, NotificationCreationAttributes } from './notification.model';

export { AffiliateProgram } from './affiliate-program.model';
export type { AffiliateProgramAttributes, AffiliateProgramCreationAttributes } from './affiliate-program.model';

export { RedirectPortal } from './redirect-portal.model';
export type { RedirectPortalAttributes, RedirectPortalCreationAttributes } from './redirect-portal.model';

export { Visit } from './visit.model';
export type { VisitAttributes, VisitCreationAttributes } from './visit.model';

export { OutboundClick } from './outbound-click.model';
export type { OutboundClickAttributes, OutboundClickCreationAttributes } from './outbound-click.model';

export { Conversion } from './conversion.model';
export type { ConversionAttributes, ConversionCreationAttributes } from './conversion.model';

export { CashbackTransaction } from './cashback-transaction.model';
export type { CashbackTransactionAttributes, CashbackTransactionCreationAttributes } from './cashback-transaction.model';

export { CommissionBoost } from './commission-boost.model';
export type { CommissionBoostAttributes, CommissionBoostCreationAttributes } from './commission-boost.model';

export { Payout } from './payout.model';
export type { PayoutAttributes, PayoutCreationAttributes } from './payout.model';

export { PayoutInfo } from './payout-info.model';
export type { PayoutInfoAttributes, PayoutInfoCreationAttributes } from './payout-info.model';

export { AuditLog } from './audit-log.model';
export type { AuditLogAttributes, AuditLogCreationAttributes } from './audit-log.model';

export { EmailLog } from './email-log.model';
export type { EmailLogAttributes, EmailLogCreationAttributes } from './email-log.model';

export { Dispute } from './dispute.model';
export type { DisputeAttributes, DisputeCreationAttributes } from './dispute.model';

export { FraudFlag } from './fraud-flag.model';
export type { FraudFlagAttributes, FraudFlagCreationAttributes } from './fraud-flag.model';

export { PasswordResetToken } from './password-reset-token.model';
export type { PasswordResetTokenAttributes, PasswordResetTokenCreationAttributes } from './password-reset-token.model';

import { User } from './user.model';
import { PasswordResetToken } from './password-reset-token.model';
import { Notification } from './notification.model';
import { AffiliateProgram } from './affiliate-program.model';
import { RedirectPortal } from './redirect-portal.model';
import { Visit } from './visit.model';
import { OutboundClick } from './outbound-click.model';
import { CommissionBoost } from './commission-boost.model';
import { Payout } from './payout.model';
import { PayoutInfo } from './payout-info.model';
import { AuditLog } from './audit-log.model';
import { EmailLog } from './email-log.model';
import { Dispute } from './dispute.model';
import { FraudFlag } from './fraud-flag.model';
import { Conversion } from './conversion.model';
import { CashbackTransaction } from './cashback-transaction.model';

// ── Associations ──

// User self-referral (sponsor)
User.belongsTo(User, { as: 'sponsor', foreignKey: 'referred_by' });
User.hasMany(User, { as: 'referrals', foreignKey: 'referred_by' });

// User <-> Notifications
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// RedirectPortal <-> AffiliateProgram
AffiliateProgram.hasMany(RedirectPortal, { foreignKey: 'affiliate_program_id', as: 'portals' });
RedirectPortal.belongsTo(AffiliateProgram, { foreignKey: 'affiliate_program_id', as: 'program' });

// Visit <-> User (ambassador)
User.hasMany(Visit, { foreignKey: 'ambassador_id', as: 'visits' });
Visit.belongsTo(User, { foreignKey: 'ambassador_id', as: 'ambassador' });

// OutboundClick <-> Visit
Visit.hasMany(OutboundClick, { foreignKey: 'visit_id', as: 'clicks' });
OutboundClick.belongsTo(Visit, { foreignKey: 'visit_id', as: 'visit' });

// OutboundClick <-> User (ambassador)
User.hasMany(OutboundClick, { foreignKey: 'ambassador_id', as: 'outboundClicks' });
OutboundClick.belongsTo(User, { foreignKey: 'ambassador_id', as: 'ambassador' });

// OutboundClick <-> User (buyer)
OutboundClick.belongsTo(User, { foreignKey: 'buyer_user_id', as: 'buyer' });

// OutboundClick <-> RedirectPortal
OutboundClick.belongsTo(RedirectPortal, { foreignKey: 'portal_id', as: 'portal' });

// OutboundClick <-> AffiliateProgram
AffiliateProgram.hasMany(OutboundClick, { foreignKey: 'affiliate_program_id', as: 'clicks' });
OutboundClick.belongsTo(AffiliateProgram, { foreignKey: 'affiliate_program_id', as: 'program' });

// CommissionBoost <-> User (target user, nullable for global boosts)
User.hasMany(CommissionBoost, { foreignKey: 'user_id', as: 'commissionBoosts' });
CommissionBoost.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// CommissionBoost <-> User (creator)
CommissionBoost.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Payout <-> User
User.hasMany(Payout, { foreignKey: 'user_id', as: 'payouts' });
Payout.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PayoutInfo <-> User (one-to-one)
User.hasOne(PayoutInfo, { foreignKey: 'user_id', as: 'payoutInfo' });
PayoutInfo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// AuditLog <-> User (admin)
User.hasMany(AuditLog, { foreignKey: 'admin_id', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// EmailLog <-> User
User.hasMany(EmailLog, { foreignKey: 'user_id', as: 'emailLogs' });
EmailLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Dispute <-> Conversion
Conversion.hasMany(Dispute, { foreignKey: 'conversion_id', as: 'disputes' });
Dispute.belongsTo(Conversion, { foreignKey: 'conversion_id', as: 'conversion' });

// Dispute <-> User (submitter)
User.hasMany(Dispute, { foreignKey: 'user_id', as: 'disputes' });
Dispute.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Dispute <-> User (admin resolver)
Dispute.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// FraudFlag <-> User
User.hasMany(FraudFlag, { foreignKey: 'user_id', as: 'fraudFlags' });
FraudFlag.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Conversion <-> User (ambassador)
User.hasMany(Conversion, { foreignKey: 'ambassador_id', as: 'sales' });
Conversion.belongsTo(User, { foreignKey: 'ambassador_id', as: 'ambassador' });

// Conversion <-> User (sponsor)
User.hasMany(Conversion, { foreignKey: 'sponsor_id', as: 'sponsorBonuses' });
Conversion.belongsTo(User, { foreignKey: 'sponsor_id', as: 'sponsor' });

// Conversion <-> User (buyer)
User.hasMany(Conversion, { foreignKey: 'buyer_user_id', as: 'purchases' });
Conversion.belongsTo(User, { foreignKey: 'buyer_user_id', as: 'buyer' });

// Conversion <-> OutboundClick
Conversion.belongsTo(OutboundClick, { foreignKey: 'outbound_click_id', as: 'click' });
OutboundClick.hasOne(Conversion, { foreignKey: 'outbound_click_id', as: 'conversion' });

// Conversion <-> AffiliateProgram
Conversion.belongsTo(AffiliateProgram, { foreignKey: 'affiliate_program_id', as: 'program' });
AffiliateProgram.hasMany(Conversion, { foreignKey: 'affiliate_program_id', as: 'conversions' });

// CashbackTransaction <-> User
User.hasMany(CashbackTransaction, { foreignKey: 'user_id', as: 'cashbackTransactions' });
CashbackTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// CashbackTransaction <-> Conversion
CashbackTransaction.belongsTo(Conversion, { foreignKey: 'conversion_id', as: 'conversion' });
Conversion.hasMany(CashbackTransaction, { foreignKey: 'conversion_id', as: 'cashbackTransactions' });

// PasswordResetToken <-> User
User.hasMany(PasswordResetToken, { foreignKey: 'user_id', as: 'resetTokens' });
PasswordResetToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
