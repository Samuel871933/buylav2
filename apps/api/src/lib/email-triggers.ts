import { sendEmail } from './email-service';
import * as templates from './email-templates';
import { getSettingBoolean } from './settings';
import { User, Notification, Conversion, Payout, FraudFlag, AffiliateProgram } from '@buyla/db';

// ── 1. Ambassador Registered ──

export async function onAmbassadorRegistered(userId: string): Promise<void> {
  const enabled = await getSettingBoolean('ambassador_welcome_email');
  if (!enabled) return;

  const user = await User.findByPk(userId);
  if (!user) return;

  const { subject, html } = templates.welcomeAmbassador(user.name, user.referral_code);
  await sendEmail({ to: user.email, subject, html, userId, templateName: 'welcome_ambassador' });

  await Notification.create({
    user_id: userId,
    type: 'sale',
    title: 'Bienvenue !',
    message: `Bienvenue sur la plateforme, ${user.name} !`,
    is_read: false,
  });
}

// ── 2. Buyer Registered ──

export async function onBuyerRegistered(userId: string): Promise<void> {
  const enabled = await getSettingBoolean('buyer_welcome_email');
  if (!enabled) return;

  const user = await User.findByPk(userId);
  if (!user) return;

  const { subject, html } = templates.welcomeBuyer(user.name);
  await sendEmail({ to: user.email, subject, html, userId, templateName: 'welcome_buyer' });
}

// ── 3. First Sale ──

export async function onFirstSale(conversionId: number): Promise<void> {
  const enabled = await getSettingBoolean('first_sale_email');
  if (!enabled) return;

  const conversion = await Conversion.findByPk(conversionId, {
    include: [
      { model: User, as: 'ambassador', attributes: ['id', 'name', 'email'] },
      { model: AffiliateProgram, as: 'program', attributes: ['display_name'] },
    ],
  });
  if (!conversion) return;

  const ambassador = (conversion as any).ambassador as User | null;
  const program = (conversion as any).program as AffiliateProgram | null;
  if (!ambassador) return;

  const { subject, html } = templates.firstSale(
    ambassador.name,
    Number(conversion.amount),
    Number(conversion.ambassador_share),
    program?.display_name || 'Programme affilié',
  );
  await sendEmail({
    to: ambassador.email,
    subject,
    html,
    userId: ambassador.id,
    templateName: 'first_sale',
  });

  await Notification.create({
    user_id: ambassador.id,
    type: 'sale',
    title: 'Première vente !',
    message: `Félicitations ! Vous avez réalisé votre première vente de ${Number(conversion.amount).toFixed(2)} EUR.`,
    is_read: false,
  });
}

// ── 4. New Referral ──

export async function onNewReferral(sponsorId: string, referralName: string): Promise<void> {
  const enabled = await getSettingBoolean('new_referral_email');
  if (!enabled) return;

  const sponsor = await User.findByPk(sponsorId);
  if (!sponsor) return;

  const { subject, html } = templates.newReferral(sponsor.name, referralName);
  await sendEmail({
    to: sponsor.email,
    subject,
    html,
    userId: sponsorId,
    templateName: 'new_referral',
  });

  await Notification.create({
    user_id: sponsorId,
    type: 'referral',
    title: 'Nouveau filleul !',
    message: `${referralName} a rejoint grâce à votre code de parrainage.`,
    is_read: false,
  });
}

// ── 5. Tier Up ──

export async function onTierUp(userId: string, newTier: string, newRate: number): Promise<void> {
  const enabled = await getSettingBoolean('tier_up_email');
  if (!enabled) return;

  const user = await User.findByPk(userId);
  if (!user) return;

  const { subject, html } = templates.tierUp(user.name, newTier, newRate);
  await sendEmail({
    to: user.email,
    subject,
    html,
    userId,
    templateName: 'tier_up',
  });

  await Notification.create({
    user_id: userId,
    type: 'tier_up',
    title: 'Montée de palier !',
    message: `Vous êtes passé au palier ${newTier}. Nouveau taux : ${newRate}%.`,
    is_read: false,
  });
}

// ── 6. Cashback Earned ──

export async function onCashbackEarned(
  userId: string,
  amount: number,
  merchantName: string,
): Promise<void> {
  const enabled = await getSettingBoolean('cashback_earned_email');
  if (!enabled) return;

  const user = await User.findByPk(userId);
  if (!user) return;

  const { subject, html } = templates.cashbackEarned(user.name, amount, merchantName);
  await sendEmail({
    to: user.email,
    subject,
    html,
    userId,
    templateName: 'cashback_earned',
  });

  await Notification.create({
    user_id: userId,
    type: 'cashback_earned',
    title: 'Cashback crédité !',
    message: `+${amount.toFixed(2)} EUR de cashback chez ${merchantName}.`,
    is_read: false,
  });
}

// ── 7. Payout Approved ──

export async function onPayoutApproved(payoutId: number): Promise<void> {
  const enabled = await getSettingBoolean('payout_approved_email');
  if (!enabled) return;

  const payout = await Payout.findByPk(payoutId, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });
  if (!payout) return;

  const user = (payout as any).user as User | null;
  if (!user) return;

  const { subject, html } = templates.payoutApproved(
    user.name,
    Number(payout.amount),
    payout.method,
  );
  await sendEmail({
    to: user.email,
    subject,
    html,
    userId: user.id,
    templateName: 'payout_approved',
  });

  await Notification.create({
    user_id: user.id,
    type: 'payout',
    title: 'Paiement validé !',
    message: `Votre retrait de ${Number(payout.amount).toFixed(2)} EUR a été validé.`,
    is_read: false,
  });
}

// ── 8. Fraud Flag Created (admin email) ──

export async function onFraudFlagCreated(flagId: number): Promise<void> {
  const enabled = await getSettingBoolean('fraud_alert_email');
  if (!enabled) return;

  const flag = await FraudFlag.findByPk(flagId, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });
  if (!flag) return;

  // Only alert on high/critical severity
  if (flag.severity !== 'high' && flag.severity !== 'critical') return;

  const flagUser = (flag as any).user as User | null;
  const userName = flagUser?.name || 'Utilisateur inconnu';

  const { subject, html } = templates.adminFraudAlert(userName, flag.type, flag.severity);

  // Send to all admin users
  const admins = await User.findAll({
    where: { role: 'admin', is_active: true },
    attributes: ['id', 'email'],
  });

  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject,
      html,
      userId: admin.id,
      templateName: 'admin_fraud_alert',
    });
  }
}

// ── 9. Payout Requested (admin email) ──

export async function onPayoutRequested(payoutId: number): Promise<void> {
  const enabled = await getSettingBoolean('payout_request_email');
  if (!enabled) return;

  const payout = await Payout.findByPk(payoutId, {
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
  });
  if (!payout) return;

  const user = (payout as any).user as User | null;
  const userName = user?.name || 'Utilisateur inconnu';

  const { subject, html } = templates.adminPayoutRequest(
    userName,
    Number(payout.amount),
    payout.method,
  );

  // Send to all admin users
  const admins = await User.findAll({
    where: { role: 'admin', is_active: true },
    attributes: ['id', 'email'],
  });

  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject,
      html,
      userId: admin.id,
      templateName: 'admin_payout_request',
    });
  }
}
