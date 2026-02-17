const SITE_NAME = process.env.SITE_NAME || 'Buyla';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// ── Base Template Wrapper ──

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;padding:40px 20px">
  <tr><td>
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;padding:12px 24px">
        <span style="color:white;font-size:20px;font-weight:700">${SITE_NAME}</span>
      </div>
    </div>
    <div style="background:white;border-radius:16px;border:1px solid #e5e7eb;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
      ${content}
    </div>
    <div style="text-align:center;margin-top:24px;color:#9ca3af;font-size:12px">
      <p>&copy; ${new Date().getFullYear()} ${SITE_NAME}. Tous droits r&eacute;serv&eacute;s.</p>
      <p><a href="${SITE_URL}" style="color:#8b5cf6;text-decoration:none">${SITE_URL}</a></p>
    </div>
  </td></tr>
</table>
</body></html>`;
}

function btn(text: string, url: string): string {
  return `<div style="text-align:center;margin:24px 0">
  <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">${text}</a>
</div>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:22px;color:#111827">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;color:#4b5563;font-size:14px;line-height:1.6">${text}</p>`;
}

function highlight(text: string): string {
  return `<div style="background:#f0f5ff;border-left:4px solid #3b82f6;padding:16px;border-radius:0 8px 8px 0;margin:16px 0">
  <p style="margin:0;color:#1e40af;font-weight:600;font-size:14px">${text}</p>
</div>`;
}

// ── 1. Welcome Ambassador ──

export function welcomeAmbassador(
  name: string,
  referralCode: string,
): { subject: string; html: string } {
  const subject = `Bienvenue chez ${SITE_NAME}, ${name} !`;
  const html = baseTemplate(`
    ${heading(`Bienvenue, ${name} !`)}
    ${paragraph(`F&eacute;licitations ! Votre compte ambassadeur est maintenant actif sur ${SITE_NAME}.`)}
    ${highlight(`Votre code parrainage : <span style="font-size:18px;letter-spacing:2px">${referralCode}</span>`)}
    ${paragraph(`Partagez ce code avec votre audience pour commencer &agrave; gagner des commissions sur chaque vente.`)}
    <div style="margin:20px 0;padding:16px;background:#faf5ff;border-radius:8px">
      <p style="margin:0 0 8px;font-weight:600;color:#7c3aed;font-size:14px">Pour bien d&eacute;marrer :</p>
      <ol style="margin:0;padding-left:20px;color:#4b5563;font-size:13px;line-height:1.8">
        <li>Explorez le catalogue de produits</li>
        <li>G&eacute;n&eacute;rez vos liens d'affiliation</li>
        <li>Partagez-les sur vos r&eacute;seaux</li>
        <li>Suivez vos gains en temps r&eacute;el</li>
      </ol>
    </div>
    ${btn('Acc&eacute;der au tableau de bord', `${SITE_URL}/dashboard`)}
    ${paragraph(`&Agrave; tr&egrave;s bient&ocirc;t sur ${SITE_NAME} !`)}
  `);
  return { subject, html };
}

// ── 2. Welcome Buyer ──

export function welcomeBuyer(name: string): { subject: string; html: string } {
  const subject = `Bienvenue sur ${SITE_NAME} !`;
  const html = baseTemplate(`
    ${heading(`Bienvenue, ${name} !`)}
    ${paragraph(`Votre compte est cr&eacute;&eacute; avec succ&egrave;s. Vous pouvez d&eacute;sormais profiter du cashback sur vos achats via ${SITE_NAME}.`)}
    ${highlight(`Gagnez du cashback &agrave; chaque achat effectu&eacute; via nos liens partenaires.`)}
    ${paragraph(`Naviguez parmi nos offres, cliquez, achetez, et votre cashback sera automatiquement cr&eacute;dit&eacute; sur votre solde.`)}
    ${btn('D&eacute;couvrir les offres', `${SITE_URL}/catalogue`)}
    ${paragraph(`Bon shopping sur ${SITE_NAME} !`)}
  `);
  return { subject, html };
}

// ── 3. First Sale ──

export function firstSale(
  name: string,
  amount: number,
  commission: number,
  programName: string,
): { subject: string; html: string } {
  const subject = `F\u00e9licitations, votre premi\u00e8re vente !`;
  const html = baseTemplate(`
    ${heading(`Bravo ${name}, premi&egrave;re vente !`)}
    ${paragraph(`Vous venez de r&eacute;aliser votre toute premi&egrave;re vente sur ${SITE_NAME}. C'est un excellent d&eacute;but !`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Programme</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${programName}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Montant de la vente</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${amount.toFixed(2)} EUR</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#6b7280;font-size:13px">Votre commission</td>
        <td style="padding:12px;color:#059669;font-weight:700;font-size:15px;text-align:right">${commission.toFixed(2)} EUR</td>
      </tr>
    </table>
    ${highlight(`Continuez ainsi pour atteindre le palier suivant et augmenter votre taux de commission !`)}
    ${btn('Voir mes ventes', `${SITE_URL}/dashboard/conversions`)}
  `);
  return { subject, html };
}

// ── 4. New Referral ──

export function newReferral(
  sponsorName: string,
  referralName: string,
): { subject: string; html: string } {
  const subject = `Nouveau filleul : ${referralName} a rejoint gr\u00e2ce \u00e0 vous !`;
  const html = baseTemplate(`
    ${heading(`Nouveau filleul, ${sponsorName} !`)}
    ${paragraph(`<strong>${referralName}</strong> vient de s'inscrire en utilisant votre code de parrainage.`)}
    ${highlight(`Vous gagnez 10% de commission sur toutes les ventes r&eacute;alis&eacute;es par vos filleuls.`)}
    ${paragraph(`Plus votre &eacute;quipe grandit, plus vos revenus passifs augmentent. Continuez &agrave; partager votre code !`)}
    ${btn('Voir mes filleuls', `${SITE_URL}/dashboard/referrals`)}
  `);
  return { subject, html };
}

// ── 5. Tier Up ──

export function tierUp(
  name: string,
  newTier: string,
  newRate: number,
): { subject: string; html: string } {
  const tierLabels: Record<string, string> = {
    beginner: 'D&eacute;butant',
    active: 'Actif',
    performer: 'Performeur',
    expert: 'Expert',
    elite: '&Eacute;lite',
  };
  const tierLabel = tierLabels[newTier] || newTier;
  const subject = `Mont\u00e9e de palier : ${tierLabel} !`;
  const html = baseTemplate(`
    ${heading(`F&eacute;licitations ${name} !`)}
    ${paragraph(`Vous venez de passer au palier <strong>${tierLabel}</strong> sur ${SITE_NAME}. Votre travail porte ses fruits !`)}
    ${highlight(`Nouveau taux de commission : <span style="font-size:20px">${newRate}%</span>`)}
    ${paragraph(`Ce nouveau taux s'applique d&egrave;s maintenant &agrave; toutes vos prochaines ventes. Continuez sur cette lanc&eacute;e !`)}
    <div style="margin:16px 0;padding:16px;background:#f0fdf4;border-radius:8px">
      <p style="margin:0;font-weight:600;color:#15803d;font-size:14px">Paliers ${SITE_NAME} :</p>
      <p style="margin:8px 0 0;color:#4b5563;font-size:13px;line-height:1.8">
        D&eacute;butant &rarr; Actif &rarr; Performeur &rarr; Expert &rarr; &Eacute;lite
      </p>
    </div>
    ${btn('Voir mon tableau de bord', `${SITE_URL}/dashboard`)}
  `);
  return { subject, html };
}

// ── 6. Cashback Earned ──

export function cashbackEarned(
  name: string,
  amount: number,
  merchantName: string,
): { subject: string; html: string } {
  const subject = `Cashback gagn\u00e9 : ${amount.toFixed(2)} EUR chez ${merchantName}`;
  const html = baseTemplate(`
    ${heading(`Cashback cr&eacute;dit&eacute;, ${name} !`)}
    ${paragraph(`Bonne nouvelle ! Votre cashback de votre achat chez <strong>${merchantName}</strong> a &eacute;t&eacute; cr&eacute;dit&eacute; sur votre solde.`)}
    ${highlight(`+${amount.toFixed(2)} EUR de cashback`)}
    ${paragraph(`Votre solde a &eacute;t&eacute; mis &agrave; jour. Continuez vos achats via ${SITE_NAME} pour accumuler encore plus de cashback !`)}
    ${btn('Voir mon solde cashback', `${SITE_URL}/dashboard/cashback`)}
  `);
  return { subject, html };
}

// ── 7. Payout Approved ──

export function payoutApproved(
  name: string,
  amount: number,
  method: string,
): { subject: string; html: string } {
  const methodLabels: Record<string, string> = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    bank: 'Virement bancaire',
  };
  const methodLabel = methodLabels[method] || method;
  const subject = `Paiement valid\u00e9 : ${amount.toFixed(2)} EUR`;
  const html = baseTemplate(`
    ${heading(`Paiement confirm&eacute;, ${name} !`)}
    ${paragraph(`Votre demande de retrait a &eacute;t&eacute; trait&eacute;e et valid&eacute;e.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Montant</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#059669;font-weight:700;font-size:15px;text-align:right">${amount.toFixed(2)} EUR</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">M&eacute;thode</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${methodLabel}</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#6b7280;font-size:13px">D&eacute;lai estim&eacute;</td>
        <td style="padding:12px;color:#111827;font-weight:600;font-size:13px;text-align:right">${method === 'bank' ? '2-5 jours ouvrables' : '1-2 jours ouvrables'}</td>
      </tr>
    </table>
    ${paragraph(`Vous recevrez les fonds selon le d&eacute;lai indiqu&eacute; ci-dessus. Si vous avez des questions, n'h&eacute;sitez pas &agrave; nous contacter.`)}
    ${btn('Voir mes paiements', `${SITE_URL}/dashboard/payouts`)}
  `);
  return { subject, html };
}

// ── 8. Weekly Recap ──

export interface WeeklyRecapStats {
  sales: number;
  revenue: number;
  commission: number;
  clicks: number;
  rank: number;
}

export function weeklyRecap(
  name: string,
  stats: WeeklyRecapStats,
): { subject: string; html: string } {
  const subject = `Votre r\u00e9cap de la semaine`;
  const html = baseTemplate(`
    ${heading(`R&eacute;cap hebdomadaire, ${name}`)}
    ${paragraph(`Voici un r&eacute;sum&eacute; de votre activit&eacute; sur ${SITE_NAME} cette semaine.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9fafb">
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Ventes</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;font-size:15px;text-align:right">${stats.sales}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Chiffre d'affaires</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${stats.revenue.toFixed(2)} EUR</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Commissions gagn&eacute;es</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#059669;font-weight:700;font-size:15px;text-align:right">${stats.commission.toFixed(2)} EUR</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Clics g&eacute;n&eacute;r&eacute;s</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${stats.clicks}</td>
      </tr>
      <tr style="background:#f9fafb">
        <td style="padding:12px;color:#6b7280;font-size:13px">Classement</td>
        <td style="padding:12px;color:#7c3aed;font-weight:700;font-size:15px;text-align:right">#${stats.rank}</td>
      </tr>
    </table>
    ${stats.sales > 0
      ? highlight(`Excellent travail ! Vous avez g&eacute;n&eacute;r&eacute; ${stats.commission.toFixed(2)} EUR de commissions cette semaine.`)
      : highlight(`Cette semaine a &eacute;t&eacute; calme. Partagez vos liens pour booster vos r&eacute;sultats la semaine prochaine !`)
    }
    ${btn('Voir mon tableau de bord', `${SITE_URL}/dashboard`)}
  `);
  return { subject, html };
}

// ── 9. Inactive Reminder (14 days) ──

export function inactiveReminder14d(name: string): { subject: string; html: string } {
  const subject = `Vous nous manquez, ${name} !`;
  const html = baseTemplate(`
    ${heading(`Vous nous manquez, ${name} !`)}
    ${paragraph(`Cela fait d&eacute;j&agrave; 14 jours que vous ne vous &ecirc;tes pas connect&eacute;(e) &agrave; ${SITE_NAME}. Vos liens sont toujours actifs et de nouvelles opportunit&eacute;s vous attendent.`)}
    <div style="margin:16px 0;padding:16px;background:#fef3c7;border-radius:8px">
      <p style="margin:0;font-weight:600;color:#92400e;font-size:14px">Pendant votre absence :</p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#4b5563;font-size:13px;line-height:1.8">
        <li>De nouveaux produits ont &eacute;t&eacute; ajout&eacute;s au catalogue</li>
        <li>Des promotions exclusives sont disponibles</li>
        <li>Votre audience attend vos recommandations</li>
      </ul>
    </div>
    ${btn('Revenir sur mon tableau de bord', `${SITE_URL}/dashboard`)}
    ${paragraph(`Votre compte reste actif et vos commissions en attente sont toujours l&agrave;.`)}
  `);
  return { subject, html };
}

// ── 10. Inactive Reminder (30 days) ──

export function inactiveReminder30d(name: string): { subject: string; html: string } {
  const subject = `Votre compte est toujours actif, ${name}`;
  const html = baseTemplate(`
    ${heading(`${name}, votre compte vous attend`)}
    ${paragraph(`Cela fait 30 jours que nous ne vous avons pas vu sur ${SITE_NAME}. Votre compte ambassadeur est toujours actif et pr&ecirc;t &agrave; g&eacute;n&eacute;rer des revenus.`)}
    ${highlight(`Votre code parrainage et vos liens d'affiliation sont toujours fonctionnels.`)}
    <div style="margin:16px 0;padding:16px;background:#eff6ff;border-radius:8px">
      <p style="margin:0;font-weight:600;color:#1e40af;font-size:14px">Les derni&egrave;res opportunit&eacute;s :</p>
      <ul style="margin:8px 0 0;padding-left:20px;color:#4b5563;font-size:13px;line-height:1.8">
        <li>Nouveaux programmes d'affiliation &agrave; fort potentiel</li>
        <li>Des ambassadeurs atteignent de nouveaux paliers chaque jour</li>
        <li>Am&eacute;liorations de la plateforme et nouveaux outils</li>
      </ul>
    </div>
    ${btn('Reprendre mon activit&eacute;', `${SITE_URL}/dashboard`)}
    ${paragraph(`Nous sommes l&agrave; si vous avez besoin d'aide pour relancer votre activit&eacute;.`)}
  `);
  return { subject, html };
}

// ── 11. Admin Fraud Alert ──

export function adminFraudAlert(
  userName: string,
  flagType: string,
  severity: string,
): { subject: string; html: string } {
  const typeLabels: Record<string, string> = {
    self_buy: 'Auto-achat',
    click_spam: 'Spam de clics',
    fake_account: 'Compte fictif',
    self_referral: 'Auto-parrainage',
    cashback_abuse: 'Abus de cashback',
  };
  const severityColors: Record<string, string> = {
    low: '#059669',
    medium: '#d97706',
    high: '#dc2626',
    critical: '#7c2d12',
  };
  const typeLabel = typeLabels[flagType] || flagType;
  const severityColor = severityColors[severity] || '#dc2626';

  const subject = `[ADMIN] Alerte fraude : ${userName}`;
  const html = baseTemplate(`
    ${heading(`Alerte fraude d&eacute;tect&eacute;e`)}
    ${paragraph(`Le syst&egrave;me a d&eacute;tect&eacute; une activit&eacute; suspecte n&eacute;cessitant votre attention.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Utilisateur</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${userName}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Type</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${typeLabel}</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#6b7280;font-size:13px">S&eacute;v&eacute;rit&eacute;</td>
        <td style="padding:12px;font-weight:700;font-size:13px;text-align:right;color:${severityColor};text-transform:uppercase">${severity}</td>
      </tr>
    </table>
    ${btn('Voir les alertes fraude', `${SITE_URL}/admin/fraud`)}
    ${paragraph(`Veuillez examiner cette alerte dans les plus brefs d&eacute;lais.`)}
  `);
  return { subject, html };
}

// ── 12. Admin Payout Request ──

export function adminPayoutRequest(
  userName: string,
  amount: number,
  method: string,
): { subject: string; html: string } {
  const methodLabels: Record<string, string> = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    bank: 'Virement bancaire',
  };
  const methodLabel = methodLabels[method] || method;
  const subject = `[ADMIN] Demande de retrait : ${amount.toFixed(2)} EUR`;
  const html = baseTemplate(`
    ${heading(`Nouvelle demande de retrait`)}
    ${paragraph(`Un utilisateur a demand&eacute; un retrait de fonds.`)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Utilisateur</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:600;font-size:13px;text-align:right">${userName}</td>
      </tr>
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">Montant</td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;color:#059669;font-weight:700;font-size:15px;text-align:right">${amount.toFixed(2)} EUR</td>
      </tr>
      <tr>
        <td style="padding:12px;color:#6b7280;font-size:13px">M&eacute;thode</td>
        <td style="padding:12px;color:#111827;font-weight:600;font-size:13px;text-align:right">${methodLabel}</td>
      </tr>
    </table>
    ${btn('G&eacute;rer les paiements', `${SITE_URL}/admin/payouts`)}
    ${paragraph(`Veuillez traiter cette demande dans les meilleurs d&eacute;lais.`)}
  `);
  return { subject, html };
}
