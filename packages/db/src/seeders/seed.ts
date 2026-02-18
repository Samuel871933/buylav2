import { sequelize } from '../connection';
import { CommissionTier } from '../models/commission-tier.model';
import { Setting } from '../models/setting.model';
import { AffiliateProgram } from '../models/affiliate-program.model';
import { RedirectPortal } from '../models/redirect-portal.model';
import '../models'; // Load associations

async function seed() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established.');

    // Sync tables first
    await sequelize.sync({ alter: true });

    // ── Seed Commission Tiers (5 paliers) ──
    console.log('Seeding commission tiers...');
    const tiers = [
      {
        name: 'beginner',
        min_sales: 0,
        ambassador_rate_affiliate: 25,
        ambassador_rate_dropship: 15,
        sponsor_rate: 10,
      },
      {
        name: 'active',
        min_sales: 10,
        ambassador_rate_affiliate: 26,
        ambassador_rate_dropship: 17,
        sponsor_rate: 10,
      },
      {
        name: 'performer',
        min_sales: 30,
        ambassador_rate_affiliate: 27,
        ambassador_rate_dropship: 19,
        sponsor_rate: 10,
      },
      {
        name: 'expert',
        min_sales: 75,
        ambassador_rate_affiliate: 28.5,
        ambassador_rate_dropship: 21,
        sponsor_rate: 10,
      },
      {
        name: 'elite',
        min_sales: 150,
        ambassador_rate_affiliate: 30,
        ambassador_rate_dropship: 23,
        sponsor_rate: 10,
      },
    ];

    for (const tier of tiers) {
      await CommissionTier.upsert(tier);
    }
    console.log(`${tiers.length} commission tiers seeded.`);

    // ── Seed Settings ──
    console.log('Seeding settings...');
    const settings = [
      {
        key: 'min_payout_ambassador',
        value: '50',
        type: 'number' as const,
        label: 'Seuil retrait ambassadeur (EUR)',
        description: 'Montant minimum pour demander un retrait ambassadeur.',
        category: 'payouts' as const,
      },
      {
        key: 'min_payout_cashback',
        value: '10',
        type: 'number' as const,
        label: 'Seuil retrait cashback (EUR)',
        description: 'Montant minimum pour demander un retrait cashback acheteur.',
        category: 'payouts' as const,
      },
      {
        key: 'default_buyer_cashback_rate',
        value: '10',
        type: 'number' as const,
        label: 'Taux cashback acheteur par défaut (%)',
        description:
          'Taux de cashback par défaut quand aucun programme/catégorie/produit ne définit un taux spécifique.',
        category: 'cashback' as const,
      },
      {
        key: 'payout_methods',
        value: 'stripe,paypal,bank',
        type: 'string' as const,
        label: 'Méthodes de paiement disponibles',
        description: 'Liste des méthodes de paiement séparées par des virgules.',
        category: 'payouts' as const,
      },
      {
        key: 'cashback_pending_message',
        value: 'En cours de validation (30-60j)',
        type: 'string' as const,
        label: 'Message cashback en attente',
        description: "Message affiché sur les cashbacks en attente de validation.",
        category: 'cashback' as const,
      },
      {
        key: 'ambassador_welcome_email',
        value: 'true',
        type: 'boolean' as const,
        label: "Envoyer email bienvenue ambassadeur",
        description: "Envoyer un email de bienvenue automatique lors de l'inscription ambassadeur.",
        category: 'general' as const,
      },
      {
        key: 'max_referral_depth',
        value: '2',
        type: 'number' as const,
        label: 'Profondeur max parrainage',
        description: 'Nombre maximum de niveaux de parrainage (toujours 2).',
        category: 'limits' as const,
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: 'boolean' as const,
        label: 'Mode maintenance',
        description:
          'Active la page maintenance sur tout le site (sauf /admin et /api/admin).',
        category: 'general' as const,
      },
      {
        key: 'maintenance_message',
        value: 'Site en maintenance, retour imminent.',
        type: 'string' as const,
        label: 'Message de maintenance',
        description: 'Message affiché sur la page de maintenance.',
        category: 'general' as const,
      },
      {
        key: 'site_url',
        value: 'https://buyla.fr',
        type: 'string' as const,
        label: 'URL du site',
        description: 'URL publique du site.',
        category: 'general' as const,
      },
    ];

    for (const setting of settings) {
      await Setting.upsert(setting);
    }
    console.log(`${settings.length} settings seeded.`);

    // ── Seed Affiliate Programs (9 programmes) ──
    console.log('Seeding affiliate programs...');
    const programs = [
      {
        name: 'nutriprofits',
        display_name: 'NutriProfits',
        network: 'direct' as const,
        base_url: 'https://nutriprofits.com',
        url_template: '{BASE_URL}?subid={SUB_ID}',
        sub_id_param: 'subid',
        sub_id_format: '{REF}',
        cookie_duration_days: 60,
        avg_commission_rate: 40,
        buyer_cashback_rate: 12,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
      {
        name: 'fnac',
        display_name: 'Fnac',
        network: 'awin' as const,
        base_url: 'https://www.fnac.com',
        url_template: 'https://www.awin1.com/cread.php?awinmid={MID}&awinaffid={AFF_ID}&clickref={SUB_ID}&p={PRODUCT_URL}',
        sub_id_param: 'clickref',
        sub_id_format: '{REF}',
        cookie_duration_days: 30,
        avg_commission_rate: 10,
        buyer_cashback_rate: 5,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
      {
        name: 'sephora',
        display_name: 'Sephora',
        network: 'awin' as const,
        base_url: 'https://www.sephora.fr',
        url_template: 'https://www.awin1.com/cread.php?awinmid={MID}&awinaffid={AFF_ID}&clickref={SUB_ID}&p={PRODUCT_URL}',
        sub_id_param: 'clickref',
        sub_id_format: '{REF}',
        cookie_duration_days: 30,
        avg_commission_rate: 10,
        buyer_cashback_rate: 8,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
      {
        name: 'zalando',
        display_name: 'Zalando',
        network: 'awin' as const,
        base_url: 'https://www.zalando.fr',
        url_template: 'https://www.awin1.com/cread.php?awinmid={MID}&awinaffid={AFF_ID}&clickref={SUB_ID}&p={PRODUCT_URL}',
        sub_id_param: 'clickref',
        sub_id_format: '{REF}',
        cookie_duration_days: 30,
        avg_commission_rate: 8,
        buyer_cashback_rate: 8,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
      {
        name: 'amazon_fr',
        display_name: 'Amazon France',
        network: 'amazon' as const,
        base_url: 'https://www.amazon.fr',
        url_template: '{PRODUCT_URL}?tag={AFF_ID}',
        sub_id_param: null,
        sub_id_format: null,
        cookie_duration_days: 1,
        avg_commission_rate: 4,
        buyer_cashback_rate: 5,
        reconciliation_method: 'csv_import' as const,
        is_active: true,
      },
      {
        name: 'decathlon',
        display_name: 'Decathlon',
        network: 'affilae' as const,
        base_url: 'https://www.decathlon.fr',
        url_template: '{BASE_URL}?subid={SUB_ID}',
        sub_id_param: 'subid',
        sub_id_format: '{REF}',
        cookie_duration_days: 45,
        avg_commission_rate: 5,
        buyer_cashback_rate: 7,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
      {
        name: 'nutri_co',
        display_name: 'Nutri&Co',
        network: 'affilae' as const,
        base_url: 'https://www.nutri-co.com',
        url_template: '{BASE_URL}?subid={SUB_ID}',
        sub_id_param: 'subid',
        sub_id_format: '{REF}',
        cookie_duration_days: 45,
        avg_commission_rate: 15,
        buyer_cashback_rate: 10,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
      {
        name: 'booking',
        display_name: 'Booking.com',
        network: 'direct' as const,
        base_url: 'https://www.booking.com',
        url_template: 'https://www.booking.com/?aid={AFF_ID}',
        sub_id_param: null,
        sub_id_format: null,
        cookie_duration_days: 45,
        avg_commission_rate: 25,
        buyer_cashback_rate: 10,
        reconciliation_method: 'csv_import' as const,
        is_active: true,
      },
      {
        name: 'naturecan',
        display_name: 'Naturecan',
        network: 'direct' as const,
        base_url: 'https://www.naturecan.fr',
        url_template: '{BASE_URL}?subid={SUB_ID}',
        sub_id_param: 'subid',
        sub_id_format: '{REF}',
        cookie_duration_days: 30,
        avg_commission_rate: 20,
        buyer_cashback_rate: 10,
        reconciliation_method: 'postback' as const,
        is_active: true,
      },
    ];

    for (const program of programs) {
      await AffiliateProgram.upsert(program);
    }
    console.log(`${programs.length} affiliate programs seeded.`);

    // ── Seed Redirect Portals (6 portails) ──
    console.log('Seeding redirect portals...');

    // Fetch programs to get IDs
    const allPrograms = await AffiliateProgram.findAll();
    const programMap = new Map(allPrograms.map((p) => [p.name, p.id]));

    const portals = [
      {
        affiliate_program_id: programMap.get('amazon_fr')!,
        merchant_slug: 'amazon',
        display_name: 'Amazon',
        sort_order: 1,
      },
      {
        affiliate_program_id: programMap.get('fnac')!,
        merchant_slug: 'fnac',
        display_name: 'Fnac',
        sort_order: 2,
      },
      {
        affiliate_program_id: programMap.get('sephora')!,
        merchant_slug: 'sephora',
        display_name: 'Sephora',
        sort_order: 3,
      },
      {
        affiliate_program_id: programMap.get('zalando')!,
        merchant_slug: 'zalando',
        display_name: 'Zalando',
        sort_order: 4,
      },
      {
        affiliate_program_id: programMap.get('booking')!,
        merchant_slug: 'booking',
        display_name: 'Booking.com',
        sort_order: 5,
      },
      {
        affiliate_program_id: programMap.get('decathlon')!,
        merchant_slug: 'decathlon',
        display_name: 'Decathlon',
        sort_order: 6,
      },
    ];

    for (const portal of portals) {
      await RedirectPortal.upsert(portal);
    }
    console.log(`${portals.length} redirect portals seeded.`);

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
