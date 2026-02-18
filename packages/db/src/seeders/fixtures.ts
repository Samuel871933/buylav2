import { sequelize } from '../connection';
import { User } from '../models/user.model';
import { Visit } from '../models/visit.model';
import { OutboundClick } from '../models/outbound-click.model';
import { Conversion } from '../models/conversion.model';
import { CashbackTransaction } from '../models/cashback-transaction.model';
import { AffiliateProgram } from '../models/affiliate-program.model';
import { RedirectPortal } from '../models/redirect-portal.model';
import '../models'; // Load associations
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PASSWORD = 'Test1234'; // Same for all fixture users
let clickIdCounter = 1000;
let conversionIdCounter = 1000;

function uuid(): string {
  return crypto.randomUUID();
}

function referralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function randomDate(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysAgo));
  d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
  return d;
}

function randomAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Fixture definitions
// ---------------------------------------------------------------------------

interface AmbassadorFixture {
  firstname: string;
  lastname: string;
  email: string;
  tier: 'beginner' | 'active' | 'performer' | 'expert' | 'elite';
  totalSales: number; // How many confirmed conversions
  avgSaleAmount: [number, number]; // [min, max] sale amount range
  daysActive: number; // How far back to spread activity
}

const AMBASSADORS: AmbassadorFixture[] = [
  {
    firstname: 'Lucie',
    lastname: 'Martin',
    email: 'lucie.martin@test.com',
    tier: 'beginner',
    totalSales: 3,
    avgSaleAmount: [15, 45],
    daysActive: 30,
  },
  {
    firstname: 'Thomas',
    lastname: 'Dubois',
    email: 'thomas.dubois@test.com',
    tier: 'active',
    totalSales: 15,
    avgSaleAmount: [20, 80],
    daysActive: 60,
  },
  {
    firstname: 'Camille',
    lastname: 'Bernard',
    email: 'camille.bernard@test.com',
    tier: 'performer',
    totalSales: 42,
    avgSaleAmount: [25, 120],
    daysActive: 90,
  },
  {
    firstname: 'Julien',
    lastname: 'Leroy',
    email: 'julien.leroy@test.com',
    tier: 'expert',
    totalSales: 85,
    avgSaleAmount: [30, 200],
    daysActive: 150,
  },
  {
    firstname: 'Sophie',
    lastname: 'Moreau',
    email: 'sophie.moreau@test.com',
    tier: 'elite',
    totalSales: 180,
    avgSaleAmount: [20, 350],
    daysActive: 365,
  },
];

const BUYERS = [
  { firstname: 'Marie', lastname: 'Petit', email: 'marie.petit@test.com' },
  { firstname: 'Pierre', lastname: 'Roux', email: 'pierre.roux@test.com' },
  { firstname: 'Alice', lastname: 'Fournier', email: 'alice.fournier@test.com' },
  { firstname: 'Nicolas', lastname: 'Girard', email: 'nicolas.girard@test.com' },
  { firstname: 'Emma', lastname: 'Bonnet', email: 'emma.bonnet@test.com' },
  { firstname: 'Lucas', lastname: 'Lambert', email: 'lucas.lambert@test.com' },
  { firstname: 'Chloe', lastname: 'Dumont', email: 'chloe.dumont@test.com' },
  { firstname: 'Hugo', lastname: 'Fontaine', email: 'hugo.fontaine@test.com' },
];

// Commission rates by tier (affiliate type)
const TIER_RATES: Record<string, { ambassador: number; sponsor: number }> = {
  beginner: { ambassador: 25, sponsor: 10 },
  active: { ambassador: 26, sponsor: 10 },
  performer: { ambassador: 27, sponsor: 10 },
  expert: { ambassador: 28.5, sponsor: 10 },
  elite: { ambassador: 30, sponsor: 10 },
};

// ---------------------------------------------------------------------------
// Main fixture seeder
// ---------------------------------------------------------------------------

async function seedFixtures() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Connection established.');
    await sequelize.sync({ alter: true });

    // Disable FK checks, clear fixture data, re-enable
    console.log('Clearing existing fixture data...');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = ['cashback_transactions', 'conversions', 'outbound_clicks', 'visits', 'payouts', 'payout_infos', 'password_reset_tokens', 'users'];
    for (const t of tables) {
      await sequelize.query(`TRUNCATE TABLE \`${t}\``).catch(() => { /* table may not exist */ });
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('Tables cleared.');

    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    // Fetch existing programs & portals
    const programs = await AffiliateProgram.findAll({ where: { is_active: true } });
    const portals = await RedirectPortal.findAll({ where: { is_active: true } });

    if (programs.length === 0) {
      console.error('No affiliate programs found. Run `pnpm db:seed` first.');
      process.exit(1);
    }

    console.log(`Found ${programs.length} programs, ${portals.length} portals.`);

    // ── 1. Create admin (if not exists) ──
    console.log('Creating admin user...');
    const [admin] = await User.upsert({
      id: uuid(),
      email: 'admin@buyla.fr',
      password_hash: passwordHash,
      firstname: 'Admin',
      lastname: 'Buyla',
      role: 'admin',
      referral_code: 'ADMIN001',
      tier: 'elite',
      total_sales: 0,
      cashback_balance: 0,
      is_active: true,
    });
    console.log(`  Admin: ${admin.email}`);

    // ── 2. Create sponsor (will be referred_by for some ambassadors) ──
    console.log('Creating sponsor user...');
    const sponsorId = uuid();
    const [sponsor] = await User.upsert({
      id: sponsorId,
      email: 'sponsor@test.com',
      password_hash: passwordHash,
      firstname: 'Antoine',
      lastname: 'Dupont',
      role: 'ambassador',
      referral_code: 'SPONSOR1',
      tier: 'performer',
      total_sales: 35,
      cashback_balance: 0,
      is_active: true,
    });
    console.log(`  Sponsor: ${sponsor.email}`);

    // ── 3. Create buyers ──
    console.log('Creating buyers...');
    const buyerUsers: User[] = [];
    for (const b of BUYERS) {
      const [user] = await User.upsert({
        id: uuid(),
        email: b.email,
        password_hash: passwordHash,
        firstname: b.firstname,
        lastname: b.lastname,
        role: 'buyer',
        referral_code: referralCode(),
        tier: 'beginner',
        total_sales: 0,
        cashback_balance: 0,
        is_active: true,
      });
      buyerUsers.push(user);
    }
    console.log(`  ${buyerUsers.length} buyers created.`);

    // ── 4. Create ambassadors + their activity ──
    console.log('\nCreating ambassadors with activity...');

    for (const amb of AMBASSADORS) {
      console.log(`\n  --- ${amb.firstname} ${amb.lastname} (${amb.tier}) ---`);

      const ambId = uuid();
      const hasSponsor = Math.random() > 0.4; // 60% have a sponsor

      const [user] = await User.upsert({
        id: ambId,
        email: amb.email,
        password_hash: passwordHash,
        firstname: amb.firstname,
        lastname: amb.lastname,
        role: 'ambassador',
        referral_code: referralCode(),
        referred_by: hasSponsor ? sponsorId : null,
        tier: amb.tier,
        total_sales: amb.totalSales,
        cashback_balance: 0,
        is_active: true,
      });
      console.log(`  User created: ${user.email} | tier=${amb.tier} | sales=${amb.totalSales}`);

      // Generate visits (3x the number of sales)
      const visitCount = amb.totalSales * 3;
      const visitorIds = Array.from({ length: Math.ceil(visitCount / 2) }, () => crypto.randomUUID());

      console.log(`  Creating ${visitCount} visits...`);
      const visitRecords: { id: number }[] = [];
      for (let i = 0; i < visitCount; i++) {
        const visit = await Visit.create({
          visitor_id: pickRandom(visitorIds),
          ambassador_id: ambId,
          source_url: pickRandom([
            'https://instagram.com/stories',
            'https://tiktok.com/@user',
            'https://twitter.com/post/123',
            'https://facebook.com/share',
            'https://wa.me/message',
            null,
          ]),
          landing_page: pickRandom([
            'https://buyla.fr/',
            'https://buyla.fr/catalogue',
            'https://buyla.fr/amazon',
            'https://buyla.fr/sephora',
          ]),
          ip_hash: crypto.createHash('sha256').update(`192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`).digest('hex').slice(0, 64),
          user_agent: pickRandom([
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
            'Mozilla/5.0 (Linux; Android 14)',
            'Mozilla/5.0 (Windows NT 10.0; Win64)',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 14)',
          ]),
          created_at: randomDate(amb.daysActive),
        } as Record<string, unknown>);
        visitRecords.push({ id: (visit as unknown as { id: number }).id });
      }

      // Generate clicks (1.5x the number of sales)
      const clickCount = Math.ceil(amb.totalSales * 1.5);
      console.log(`  Creating ${clickCount} clicks...`);
      const clickRecords: { id: number; programId: number; portalId: number | null; visitorId: string; date: Date }[] = [];

      for (let i = 0; i < clickCount; i++) {
        const program = pickRandom(programs);
        const portal = portals.find((p) => p.affiliate_program_id === program.id) || null;
        const visitorId = pickRandom(visitorIds);
        const clickDate = randomDate(amb.daysActive);
        const visit = pickRandom(visitRecords);

        const click = await OutboundClick.create({
          id: clickIdCounter++,
          visit_id: visit.id,
          visitor_id: visitorId,
          ambassador_id: ambId,
          buyer_user_id: Math.random() > 0.5 ? pickRandom(buyerUsers).id : null,
          affiliate_program_id: program.id,
          portal_id: portal?.id || null,
          destination_url: program.base_url || `https://${program.name}.example.com`,
          sub_id_sent: `BUY-${ambId.slice(0, 8)}-${clickIdCounter}`,
          clicked_at: clickDate,
        } as Record<string, unknown>);

        clickRecords.push({
          id: (click as unknown as { id: number }).id,
          programId: program.id,
          portalId: portal?.id || null,
          visitorId,
          date: clickDate,
        });
      }

      // Generate conversions
      const statuses: Array<'pending' | 'confirmed' | 'paid' | 'cancelled'> = [];
      // Most are confirmed/paid, some pending, few cancelled
      const confirmedCount = Math.floor(amb.totalSales * 0.6);
      const paidCount = Math.floor(amb.totalSales * 0.25);
      const pendingCount = Math.floor(amb.totalSales * 0.1);
      const cancelledCount = amb.totalSales - confirmedCount - paidCount - pendingCount;

      for (let i = 0; i < confirmedCount; i++) statuses.push('confirmed');
      for (let i = 0; i < paidCount; i++) statuses.push('paid');
      for (let i = 0; i < pendingCount; i++) statuses.push('pending');
      for (let i = 0; i < cancelledCount; i++) statuses.push('cancelled');

      // Shuffle statuses
      for (let i = statuses.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [statuses[i], statuses[j]] = [statuses[j], statuses[i]];
      }

      console.log(`  Creating ${amb.totalSales} conversions (${confirmedCount} confirmed, ${paidCount} paid, ${pendingCount} pending, ${cancelledCount} cancelled)...`);

      let totalCashbackBalance = 0;

      for (let i = 0; i < amb.totalSales; i++) {
        const click = clickRecords[i % clickRecords.length];
        const program = programs.find((p) => p.id === click.programId)!;
        const status = statuses[i];
        const amount = randomAmount(amb.avgSaleAmount[0], amb.avgSaleAmount[1]);
        const commissionRate = program.avg_commission_rate || 10;
        const commissionTotal = Math.round(amount * commissionRate) / 100;

        const rates = TIER_RATES[amb.tier];
        const ambassadorShare = Math.round(commissionTotal * rates.ambassador) / 100;
        const sponsorShare = hasSponsor ? Math.round(commissionTotal * rates.sponsor) / 100 : 0;
        const buyerCashbackRate = program.buyer_cashback_rate || 10;
        const buyerShare = Math.round(commissionTotal * buyerCashbackRate) / 100;
        const platformShare = Math.round((commissionTotal - ambassadorShare - sponsorShare - buyerShare) * 100) / 100;

        const conversionDate = randomDate(amb.daysActive);
        const buyer = pickRandom(buyerUsers);

        await Conversion.create({
          id: conversionIdCounter++,
          ambassador_id: ambId,
          sponsor_id: hasSponsor ? sponsorId : null,
          buyer_user_id: buyer.id,
          outbound_click_id: click.id,
          affiliate_program_id: click.programId,
          type: 'affiliate',
          amount,
          commission_total: commissionTotal,
          ambassador_share: ambassadorShare,
          sponsor_share: sponsorShare,
          buyer_share: buyerShare,
          platform_share: Math.max(0, platformShare),
          applied_ambassador_rate: rates.ambassador,
          applied_sponsor_rate: hasSponsor ? rates.sponsor : null,
          applied_buyer_rate: buyerCashbackRate,
          status,
          attribution_method: 'last_click',
          attribution_confidence: pickRandom(['high', 'medium', 'high', 'high']),
          order_ref: `ORD-${Date.now().toString(36).toUpperCase()}-${i}`,
          confirmed_at: status === 'confirmed' || status === 'paid' ? conversionDate : null,
          paid_at: status === 'paid' ? new Date(conversionDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
          created_at: conversionDate,
        } as Record<string, unknown>);

        // Create cashback transaction for confirmed/paid
        if ((status === 'confirmed' || status === 'paid') && buyerShare > 0) {
          totalCashbackBalance += buyerShare;
          await CashbackTransaction.create({
            user_id: buyer.id,
            conversion_id: conversionIdCounter - 1,
            type: 'earned',
            amount: buyerShare,
            balance_after: totalCashbackBalance,
            description: `Cashback ${program.display_name} - commande #${conversionIdCounter - 1}`,
            created_at: conversionDate,
          } as Record<string, unknown>);
        }
      }

      console.log(`  Done for ${amb.firstname} ${amb.lastname}.`);
    }

    // ── 5. Test sponsorship pair (round numbers) ──
    // test@test.com sponsors filleul@test.com who makes exactly €1000 in sales
    console.log('\n  === Test Sponsorship Pair (round numbers) ===');

    const testSponsorId = uuid();
    const [testSponsor] = await User.upsert({
      id: testSponsorId,
      email: 'test@test.com',
      password_hash: passwordHash,
      firstname: 'Test',
      lastname: 'Parrain',
      role: 'ambassador',
      referral_code: 'TEST0001',
      tier: 'active',
      total_sales: 20,
      cashback_balance: 0,
      is_active: true,
    });
    console.log(`  Sponsor: ${testSponsor.email} (TEST0001)`);

    const filleulId = uuid();
    const [filleul] = await User.upsert({
      id: filleulId,
      email: 'filleul@test.com',
      password_hash: passwordHash,
      firstname: 'Test',
      lastname: 'Filleul',
      role: 'ambassador',
      referral_code: 'FILL0001',
      referred_by: testSponsorId,
      tier: 'active',
      total_sales: 10,
      cashback_balance: 0,
      is_active: true,
    });
    console.log(`  Filleul: ${filleul.email} (FILL0001) → referred by test@test.com`);

    // Pick program with 10% commission for round numbers (fnac)
    const testProgram = programs.find((p) => p.name === 'fnac') || programs[0];
    const testPortal = portals.find((p) => p.affiliate_program_id === testProgram.id) || null;
    const testBuyer = buyerUsers[0];

    // Create 30 visits for filleul
    const filleulVisitorId = crypto.randomUUID();
    console.log('  Creating 30 visits for filleul...');
    const filleulVisitRecords: { id: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const visit = await Visit.create({
        visitor_id: filleulVisitorId,
        ambassador_id: filleulId,
        source_url: 'https://instagram.com/stories',
        landing_page: 'https://buyla.fr/fnac',
        ip_hash: crypto.createHash('sha256').update(`10.0.0.${i}`).digest('hex').slice(0, 64),
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
        created_at: randomDate(30),
      } as Record<string, unknown>);
      filleulVisitRecords.push({ id: (visit as unknown as { id: number }).id });
    }

    // Create 15 clicks for filleul
    console.log('  Creating 15 clicks for filleul...');
    const filleulClickRecords: { id: number }[] = [];
    for (let i = 0; i < 15; i++) {
      const click = await OutboundClick.create({
        id: clickIdCounter++,
        visit_id: filleulVisitRecords[i * 2].id,
        visitor_id: filleulVisitorId,
        ambassador_id: filleulId,
        buyer_user_id: testBuyer.id,
        affiliate_program_id: testProgram.id,
        portal_id: testPortal?.id || null,
        destination_url: testProgram.base_url || 'https://www.fnac.com',
        sub_id_sent: `BUY-${filleulId.slice(0, 8)}-${clickIdCounter}`,
        clicked_at: randomDate(30),
      } as Record<string, unknown>);
      filleulClickRecords.push({ id: (click as unknown as { id: number }).id });
    }

    // Create 10 conversions at exactly €100 each — mixed statuses
    // 5 confirmed, 3 pending, 2 paid = 10 total
    // With fnac (10% commission): commission_total = €10/sale
    // Active tier: ambassador 26%, sponsor 10%
    // ambassador_share = €10 * 26% = €2.60 | sponsor_share = €10 * 10% = €1.00
    // buyer_cashback (fnac = 5%): €10 * 5% = €0.50
    // platform_share = €10 - €2.60 - €1.00 - €0.50 = €5.90
    const commissionRate = testProgram.avg_commission_rate || 10;
    const buyerCbRate = testProgram.buyer_cashback_rate || 10;
    const testStatuses: Array<'pending' | 'confirmed' | 'paid'> = [
      'confirmed', 'confirmed', 'confirmed', 'confirmed', 'confirmed',
      'pending', 'pending', 'pending',
      'paid', 'paid',
    ];

    console.log(`  Creating 10 conversions at €100 each (5 confirmed, 3 pending, 2 paid)...`);
    console.log(`    Program: ${testProgram.display_name}, commission: ${commissionRate}%`);
    let filleulCashbackBalance = 0;

    for (let i = 0; i < 10; i++) {
      const amount = 100; // €100 exact
      const commissionTotal = Math.round(amount * commissionRate) / 100; // €10
      const ambassadorShare = Math.round(commissionTotal * 26) / 100;   // €2.60
      const sponsorShareAmt = Math.round(commissionTotal * 10) / 100;   // €1.00
      const buyerShare = Math.round(commissionTotal * buyerCbRate) / 100;
      const platformShareAmt = Math.round((commissionTotal - ambassadorShare - sponsorShareAmt - buyerShare) * 100) / 100;
      const status = testStatuses[i];

      const convDate = new Date();
      convDate.setDate(convDate.getDate() - (25 - i * 2)); // Spread evenly over 25 days

      await Conversion.create({
        id: conversionIdCounter++,
        ambassador_id: filleulId,
        sponsor_id: testSponsorId,
        buyer_user_id: testBuyer.id,
        outbound_click_id: filleulClickRecords[i].id,
        affiliate_program_id: testProgram.id,
        type: 'affiliate',
        amount,
        commission_total: commissionTotal,
        ambassador_share: ambassadorShare,
        sponsor_share: sponsorShareAmt,
        buyer_share: buyerShare,
        platform_share: Math.max(0, platformShareAmt),
        applied_ambassador_rate: 26,
        applied_sponsor_rate: 10,
        applied_buyer_rate: buyerCbRate,
        status,
        attribution_method: 'last_click',
        attribution_confidence: 'high',
        order_ref: `ORD-TEST-${String(i + 1).padStart(3, '0')}`,
        confirmed_at: status !== 'pending' ? convDate : null,
        paid_at: status === 'paid' ? new Date(convDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
        created_at: convDate,
      } as Record<string, unknown>);

      // Cashback for buyer on confirmed/paid only
      if ((status === 'confirmed' || status === 'paid') && buyerShare > 0) {
        filleulCashbackBalance += buyerShare;
        await CashbackTransaction.create({
          user_id: testBuyer.id,
          conversion_id: conversionIdCounter - 1,
          type: 'earned',
          amount: buyerShare,
          balance_after: filleulCashbackBalance,
          description: `Cashback ${testProgram.display_name} - commande #ORD-TEST-${String(i + 1).padStart(3, '0')}`,
          created_at: convDate,
        } as Record<string, unknown>);
      }
    }

    console.log('  Sponsorship summary (filleul@test.com):');
    console.log('    10 x €100 = €1000 total sales');
    console.log('    5 confirmed → gains confirmés filleul: 5 x €2.60 = €13.00');
    console.log('    3 pending   → gains en attente filleul: 3 x €2.60 = €7.80');
    console.log('    2 paid      → gains payés filleul: 2 x €2.60 = €5.20');
    console.log('    Sponsor (test@test.com) gains confirmés: 7 x €1.00 = €7.00 (confirmed+paid)');
    console.log('    Sponsor gains en attente: 3 x €1.00 = €3.00 (pending)');
    console.log('  Done for test sponsorship pair.');

    // ── Summary ──
    const userCount = await User.count();
    const convCount = await Conversion.count();
    const clickCount = await OutboundClick.count();
    const visitCount = await Visit.count();
    const cashbackCount = await CashbackTransaction.count();

    console.log('\n========================================');
    console.log('Fixtures seeded successfully!');
    console.log(`  Users:        ${userCount}`);
    console.log(`  Visits:       ${visitCount}`);
    console.log(`  Clicks:       ${clickCount}`);
    console.log(`  Conversions:  ${convCount}`);
    console.log(`  Cashback tx:  ${cashbackCount}`);
    console.log('========================================');
    console.log(`\nAll fixture users password: ${PASSWORD}`);
    console.log('Admin: admin@buyla.fr');
    console.log('Ambassadors: lucie.martin@test.com (beginner) ... sophie.moreau@test.com (elite)');
    console.log('Sponsorship test: test@test.com (parrain) → filleul@test.com (10 ventes x €100 = €1000)');
    console.log('Buyers: marie.petit@test.com, pierre.roux@test.com, ...');

    process.exit(0);
  } catch (error) {
    console.error('Fixtures seeding failed:', error);
    process.exit(1);
  }
}

seedFixtures();
