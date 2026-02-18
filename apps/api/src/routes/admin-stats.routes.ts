import { Router } from 'express';
import {
  sequelize,
  Sequelize,
  Op,
  User,
  Conversion,
  OutboundClick,
  Visit,
  CashbackTransaction,
  CommissionBoost,
  Payout,
  FraudFlag,
  Dispute,
  AuditLog,
  EmailLog,
  AffiliateProgram,
} from '@buyla/db';
import { success, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';

const router = Router();

// All admin-stats routes require auth + admin role
router.use(checkAuth(), checkRole('admin'));

// QueryTypes from the Sequelize class (not directly from 'sequelize' module)
const { SELECT } = (Sequelize as unknown as { QueryTypes: { SELECT: number } }).QueryTypes;

// ── Helper: compute date range from period string ──

type Period = 'today' | '7d' | '30d' | '90d' | '12m' | 'all';

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '12m':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case 'all':
      return null;
    default:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

function periodWhere(field: string, period: string): Record<string, unknown> {
  const start = getPeriodStart(period);
  if (!start) return {};
  return { [field]: { [Op.gte]: start } };
}

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekStart(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function monthStart(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function days30Start(): Date {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

/** Safely convert Sequelize aggregate results (which can be string | number | null) to number */
function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. GET /api/admin/stats?period=today|7d|30d|90d|12m|all
// ═══════════════════════════════════════════════════════════════════════════

router.get('/stats', async (req, res) => {
  try {
    const period = (req.query.period as Period) || '30d';
    const pStart = getPeriodStart(period);
    const convPWhere = pStart ? { created_at: { [Op.gte]: pStart } } : {};
    const today = todayStart();
    const week = weekStart();
    const month = monthStart();
    const d30 = days30Start();

    // ── KPIs temps reel (section 5.1) ──
    const [
      revenueToday,
      commissionsToday,
      marginToday,
      salesToday,
      clicksToday,
      visitsToday,
      activeAmbassadorsMonth,
      newAmbassadorsToday,
      newBuyersToday,
    ] = await Promise.all([
      // revenueToday
      Conversion.sum('amount', {
        where: { created_at: { [Op.gte]: today } },
      }),
      // commissionsToday
      Conversion.sum('commission_total', {
        where: { created_at: { [Op.gte]: today } },
      }),
      // marginToday
      Conversion.sum('platform_share', {
        where: { created_at: { [Op.gte]: today } },
      }),
      // salesToday
      Conversion.count({
        where: { created_at: { [Op.gte]: today } },
      }),
      // clicksToday
      OutboundClick.count({
        where: { clicked_at: { [Op.gte]: today } },
      }),
      // visitsToday
      Visit.count({
        where: { created_at: { [Op.gte]: today } },
      }),
      // activeAmbassadorsMonth
      Conversion.count({
        distinct: true,
        col: 'ambassador_id',
        where: { created_at: { [Op.gte]: month } },
      }),
      // newAmbassadorsToday
      User.count({
        where: { role: 'ambassador', created_at: { [Op.gte]: today } },
      }),
      // newBuyersToday
      User.count({
        where: { role: 'buyer', created_at: { [Op.gte]: today } },
      }),
    ]);

    const realtime = {
      revenueToday: toNum(revenueToday),
      commissionsToday: toNum(commissionsToday),
      marginToday: toNum(marginToday),
      marginPercent:
        toNum(commissionsToday) > 0
          ? Math.round((toNum(marginToday) / toNum(commissionsToday)) * 10000) / 100
          : 0,
      salesToday,
      clicksToday,
      visitsToday,
      activeAmbassadorsMonth,
      newUsersToday: newAmbassadorsToday + newBuyersToday,
      newAmbassadorsToday,
      newBuyersToday,
    };

    // ── Croissance (section 5.2) ──
    const [
      totalUsers,
      totalAmbassadors,
      totalBuyers,
      newAmbassadorsWeek,
      newBuyersWeek,
      totalReferrals,
      newReferralsWeek,
    ] = await Promise.all([
      User.count(),
      User.count({ where: { role: 'ambassador' } }),
      User.count({ where: { role: 'buyer' } }),
      User.count({ where: { role: 'ambassador', created_at: { [Op.gte]: week } } }),
      User.count({ where: { role: 'buyer', created_at: { [Op.gte]: week } } }),
      User.count({ where: { referred_by: { [Op.ne]: null } } }),
      User.count({
        where: { referred_by: { [Op.ne]: null }, created_at: { [Op.gte]: week } },
      }),
    ]);

    const growth = {
      totalUsers,
      totalAmbassadors,
      totalBuyers,
      newAmbassadorsWeek,
      newBuyersWeek,
      totalReferrals,
      newReferralsWeek,
    };

    // ── Finance (section 5.3) ──
    const [
      revenuePeriod,
      commissionsPeriod,
      marginPeriod,
      ambassadorSharePaid,
      ambassadorSharePending,
      sponsorSharePaid,
      cashbackEarned,
      cashbackWithdrawn,
      cashbackFloat,
      avgBasketResult,
      payoutsPending,
    ] = await Promise.all([
      Conversion.sum('amount', { where: convPWhere }),
      Conversion.sum('commission_total', { where: convPWhere }),
      Conversion.sum('platform_share', { where: convPWhere }),
      Conversion.sum('ambassador_share', { where: { status: 'paid' } }),
      Conversion.sum('ambassador_share', { where: { status: 'confirmed' } }),
      Conversion.sum('sponsor_share', { where: { status: 'paid' } }),
      CashbackTransaction.sum('amount', { where: { type: 'earned' } }),
      CashbackTransaction.sum('amount', { where: { type: 'withdrawal' } }),
      User.sum('cashback_balance'),
      Conversion.findOne({
        attributes: [[Sequelize.fn('AVG', Sequelize.col('amount')), 'avg']],
        where: convPWhere,
        raw: true,
      }),
      Payout.sum('amount', { where: { status: 'pending' } }),
    ]);

    const finance = {
      revenuePeriod: toNum(revenuePeriod),
      commissionsPeriod: toNum(commissionsPeriod),
      marginPeriod: toNum(marginPeriod),
      marginPercentPeriod:
        toNum(commissionsPeriod) > 0
          ? Math.round((toNum(marginPeriod) / toNum(commissionsPeriod)) * 10000) / 100
          : 0,
      ambassadorSharePaid: toNum(ambassadorSharePaid),
      ambassadorSharePending: toNum(ambassadorSharePending),
      sponsorSharePaid: toNum(sponsorSharePaid),
      cashbackDistributed: toNum(cashbackEarned),
      cashbackWithdrawn: toNum(cashbackWithdrawn),
      cashbackFloat: toNum(cashbackFloat),
      avgBasket: toNum((avgBasketResult as unknown as Record<string, unknown>)?.avg),
      payoutsPending: toNum(payoutsPending),
    };

    // ── Ambassadeurs (section 5.4) ──
    const [activeAmbassadors30d, tierDistributionRaw, ambassadorsWithReferrals] =
      await Promise.all([
        Conversion.count({
          distinct: true,
          col: 'ambassador_id',
          where: { created_at: { [Op.gte]: d30 } },
        }),
        User.findAll({
          attributes: ['tier', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
          where: { role: 'ambassador' },
          group: ['tier'],
          raw: true,
        }),
        User.count({
          where: {
            role: 'ambassador',
            id: {
              [Op.in]: Sequelize.literal(
                '(SELECT DISTINCT referred_by FROM users WHERE referred_by IS NOT NULL)',
              ),
            },
          },
        }),
      ]);

    const tierDistribution: Record<string, number> = {};
    for (const row of tierDistributionRaw as unknown as Array<{ tier: string; count: number }>) {
      tierDistribution[row.tier] = Number(row.count);
    }

    // Compute avg earnings per active ambassador directly
    const avgEarningsResult = (await sequelize.query(
      `SELECT AVG(sub.total) AS avg_earnings FROM (
        SELECT SUM(ambassador_share) AS total FROM conversions
        WHERE created_at >= :since
        GROUP BY ambassador_id
      ) sub`,
      {
        replacements: { since: d30 },
        type: SELECT as never,
        raw: true,
      },
    )) as unknown as Array<{ avg_earnings: string | null }>;

    const avgEarningsPerActiveAmbassador = toNum(avgEarningsResult?.[0]?.avg_earnings);

    const ambassadors = {
      totalAmbassadors,
      activeAmbassadors30d,
      activityRate:
        totalAmbassadors > 0
          ? Math.round((activeAmbassadors30d / totalAmbassadors) * 10000) / 100
          : 0,
      tierDistribution,
      ambassadorsWithReferrals,
      avgEarningsPerActiveAmbassador,
    };

    // ── Acheteurs & cashback (section 5.5) ──
    const [totalBuyersWithCashback, activeBuyers30d, totalCashbackBalance] = await Promise.all([
      User.count({
        where: { role: 'buyer', cashback_balance: { [Op.gt]: 0 } },
      }),
      Conversion.count({
        distinct: true,
        col: 'buyer_user_id',
        where: {
          buyer_user_id: { [Op.ne]: null },
          created_at: { [Op.gte]: d30 },
        },
      }),
      User.sum('cashback_balance', { where: { role: 'buyer' } }),
    ]);

    const buyerCount = totalBuyers || 1; // avoid div by 0
    const buyers = {
      totalBuyersWithCashback,
      activeBuyers30d,
      totalCashbackBalance: toNum(totalCashbackBalance),
      avgCashbackPerBuyer: Math.round((toNum(totalCashbackBalance) / buyerCount) * 100) / 100,
    };

    // ── Tracking (section 5.6) ──
    const [visitsPeriod, uniqueVisitorsPeriod, clicksPeriod, conversionsPeriod] =
      await Promise.all([
        Visit.count({ where: periodWhere('created_at', period) }),
        Visit.count({
          distinct: true,
          col: 'visitor_id',
          where: periodWhere('created_at', period),
        }),
        OutboundClick.count({ where: periodWhere('clicked_at', period) }),
        Conversion.count({ where: convPWhere }),
      ]);

    const tracking = {
      visitsPeriod,
      uniqueVisitorsPeriod,
      clicksPeriod,
      conversionsPeriod,
      ctr: visitsPeriod > 0 ? Math.round((clicksPeriod / visitsPeriod) * 10000) / 100 : 0,
      conversionRate:
        clicksPeriod > 0 ? Math.round((conversionsPeriod / clicksPeriod) * 10000) / 100 : 0,
    };

    success(res, {
      period,
      realtime,
      growth,
      finance,
      ambassadors,
      buyers,
      tracking,
    });
  } catch (err) {
    console.error('Admin comprehensive stats error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors du calcul des statistiques', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. GET /api/admin/charts?period=30d|90d|12m
// ═══════════════════════════════════════════════════════════════════════════

router.get('/charts', async (req, res) => {
  try {
    const period = (req.query.period as string) || '30d';
    const pStart = getPeriodStart(period);
    const pWhere = pStart ? { [Op.gte]: pStart } : {};

    // Determine granularity: monthly for 12m, daily for 30d/90d
    const isMonthly = period === '12m';

    const dateGroup = isMonthly
      ? [
          Sequelize.fn('YEAR', Sequelize.col('created_at')),
          Sequelize.fn('MONTH', Sequelize.col('created_at')),
        ]
      : [Sequelize.fn('DATE', Sequelize.col('created_at'))];

    const dateAttr = isMonthly
      ? [
          [Sequelize.fn('YEAR', Sequelize.col('created_at')), 'year'],
          [Sequelize.fn('MONTH', Sequelize.col('created_at')), 'month'],
        ]
      : [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'date']];

    const [revenueRaw, salesRaw, usersAmbRaw, usersBuyRaw, programRaw, tierRaw] =
      await Promise.all([
        // Revenue chart: revenue + margin + commission per day/month
        Conversion.findAll({
          attributes: [
            ...dateAttr,
            [Sequelize.fn('SUM', Sequelize.col('amount')), 'revenue'],
            [Sequelize.fn('SUM', Sequelize.col('platform_share')), 'margin'],
            [Sequelize.fn('SUM', Sequelize.col('commission_total')), 'commission'],
          ] as unknown as string[],
          where: pStart ? { created_at: pWhere } : {},
          group: dateGroup,
          order: dateGroup.map((g) => [g, 'ASC']),
          raw: true,
        }),

        // Sales chart: conversion count per day/month
        Conversion.findAll({
          attributes: [
            ...dateAttr,
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          ] as unknown as string[],
          where: pStart ? { created_at: pWhere } : {},
          group: dateGroup,
          order: dateGroup.map((g) => [g, 'ASC']),
          raw: true,
        }),

        // Users chart: ambassadors cumulative
        User.findAll({
          attributes: [
            ...dateAttr,
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          ] as unknown as string[],
          where: { role: 'ambassador', ...(pStart ? { created_at: pWhere } : {}) },
          group: dateGroup,
          order: dateGroup.map((g) => [g, 'ASC']),
          raw: true,
        }),

        // Users chart: buyers cumulative
        User.findAll({
          attributes: [
            ...dateAttr,
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          ] as unknown as string[],
          where: { role: 'buyer', ...(pStart ? { created_at: pWhere } : {}) },
          group: dateGroup,
          order: dateGroup.map((g) => [g, 'ASC']),
          raw: true,
        }),

        // Program chart: CA by program (PieChart)
        Conversion.findAll({
          attributes: [
            'affiliate_program_id',
            [Sequelize.fn('SUM', Sequelize.col('amount')), 'value'],
          ],
          where: pStart ? { created_at: pWhere } : {},
          group: ['affiliate_program_id'],
          include: [
            {
              model: AffiliateProgram,
              as: 'program',
              attributes: ['display_name'],
            },
          ],
          raw: true,
        }),

        // Tier chart: PieChart data for tier distribution
        User.findAll({
          attributes: ['tier', [Sequelize.fn('COUNT', Sequelize.col('id')), 'value']],
          where: { role: 'ambassador' },
          group: ['tier'],
          raw: true,
        }),
      ]);

    // Format revenueChart
    const revenueChart = (revenueRaw as unknown as Array<Record<string, unknown>>).map((row) => ({
      date: isMonthly ? `${row.year}-${String(row.month).padStart(2, '0')}` : String(row.date),
      revenue: toNum(row.revenue),
      margin: toNum(row.margin),
      commission: toNum(row.commission),
    }));

    // Format salesChart
    const salesChart = (salesRaw as unknown as Array<Record<string, unknown>>).map((row) => ({
      date: isMonthly ? `${row.year}-${String(row.month).padStart(2, '0')}` : String(row.date),
      count: Number(row.count),
    }));

    // Format usersChart: merge ambassadors + buyers by date
    const usersMap = new Map<string, { ambassadors: number; buyers: number }>();
    for (const row of usersAmbRaw as unknown as Array<Record<string, unknown>>) {
      const key = isMonthly
        ? `${row.year}-${String(row.month).padStart(2, '0')}`
        : String(row.date);
      const entry = usersMap.get(key) || { ambassadors: 0, buyers: 0 };
      entry.ambassadors = Number(row.count);
      usersMap.set(key, entry);
    }
    for (const row of usersBuyRaw as unknown as Array<Record<string, unknown>>) {
      const key = isMonthly
        ? `${row.year}-${String(row.month).padStart(2, '0')}`
        : String(row.date);
      const entry = usersMap.get(key) || { ambassadors: 0, buyers: 0 };
      entry.buyers = Number(row.count);
      usersMap.set(key, entry);
    }

    // Make cumulative
    const sortedDates = [...usersMap.keys()].sort();
    let cumAmb = 0;
    let cumBuy = 0;
    const usersChart = sortedDates.map((date) => {
      const val = usersMap.get(date)!;
      cumAmb += val.ambassadors;
      cumBuy += val.buyers;
      return { date, ambassadors: cumAmb, buyers: cumBuy };
    });

    // Format programChart (PieChart)
    const programChart = (programRaw as unknown as Array<Record<string, unknown>>).map((row) => ({
      name: String(row['program.display_name'] || `Programme #${row.affiliate_program_id}`),
      value: toNum(row.value),
    }));

    // Distribution chart: stacked shares per period
    const distributionRaw = (await Conversion.findAll({
      attributes: [
        ...dateAttr,
        [Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 'ambassador'],
        [Sequelize.fn('SUM', Sequelize.col('sponsor_share')), 'sponsor'],
        [Sequelize.fn('SUM', Sequelize.col('buyer_share')), 'buyer'],
        [Sequelize.fn('SUM', Sequelize.col('platform_share')), 'platform'],
      ] as unknown as string[],
      where: pStart ? { created_at: pWhere } : {},
      group: dateGroup,
      order: dateGroup.map((g) => [g, 'ASC']),
      raw: true,
    })) as unknown as Array<Record<string, unknown>>;

    const distributionChart = distributionRaw.map((row) => ({
      date: isMonthly
        ? `${row.year}-${String(row.month).padStart(2, '0')}`
        : String(row.date),
      ambassador: toNum(row.ambassador),
      sponsor: toNum(row.sponsor),
      buyer: toNum(row.buyer),
      platform: toNum(row.platform),
    }));

    // Tier chart (PieChart)
    const tierChart = (tierRaw as unknown as Array<Record<string, unknown>>).map((row) => ({
      name: String(row.tier),
      value: Number(row.value),
    }));

    success(res, {
      period,
      revenueChart,
      salesChart,
      usersChart,
      programChart,
      distributionChart,
      tierChart,
    });
  } catch (err) {
    console.error('Admin charts error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors du calcul des graphiques', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. GET /api/admin/alerts
// ═══════════════════════════════════════════════════════════════════════════

interface Alert {
  type: string;
  priority: 'high' | 'medium' | 'low';
  count: number;
  message: string;
}

router.get('/alerts', async (_req, res) => {
  try {
    const now = new Date();
    const week = weekStart();
    const d30 = days30Start();
    const day24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const in7days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      payoutsPendingCount,
      payoutsPendingTotal,
      activeBoostsCount,
      expiringBoostsCount,
      unattributedSalesCount,
      csvOverduePrograms,
      fraudAlertsCount,
      openDisputesCount,
      failedEmailsCount,
      totalAmbassadors,
      inactiveAmbassadorsCount,
    ] = await Promise.all([
      // payoutsPending count
      Payout.count({ where: { status: 'pending' } }),
      // payoutsPending total amount
      Payout.sum('amount', { where: { status: 'pending' } }),
      // activeBoosts
      CommissionBoost.count({
        where: {
          is_active: true,
          start_date: { [Op.lte]: now },
          [Op.or]: [{ end_date: null }, { end_date: { [Op.gte]: now } }],
        },
      }),
      // expiringBoosts (within 7 days)
      CommissionBoost.count({
        where: {
          is_active: true,
          end_date: { [Op.between]: [now, in7days] },
        },
      }),
      // unattributedSales: conversions with low/missing attribution this week
      Conversion.count({
        where: {
          created_at: { [Op.gte]: week },
          [Op.or]: [
            { attribution_method: null },
            { attribution_confidence: 'low' },
          ],
        },
      }),
      // csvImportOverdue: programs with csv_import reconciliation and no recent conversion > 7d
      sequelize.query(
        `SELECT COUNT(*) AS cnt FROM affiliate_programs ap
         WHERE ap.reconciliation_method = 'csv_import'
         AND ap.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM conversions c
           WHERE c.affiliate_program_id = ap.id
           AND c.created_at >= :week
         )`,
        { replacements: { week }, type: SELECT as never, raw: true },
      ).then((rows) => Number((rows as unknown as Array<{ cnt: string }>)?.[0]?.cnt ?? 0)),
      // fraudAlerts: pending high/critical
      FraudFlag.count({
        where: {
          status: 'pending',
          severity: { [Op.in]: ['high', 'critical'] },
        },
      }),
      // openDisputes
      Dispute.count({ where: { status: 'open' } }),
      // failedEmails last 24h
      EmailLog.count({
        where: {
          status: 'failed',
          sent_at: { [Op.gte]: day24h },
        },
      }),
      // Total ambassadors for inactivity rate
      User.count({ where: { role: 'ambassador' } }),
      // Inactive ambassadors: no conversion in 30d
      sequelize.query(
        `SELECT COUNT(*) AS cnt FROM users u
         WHERE u.role = 'ambassador'
         AND u.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM conversions c
           WHERE c.ambassador_id = u.id
           AND c.created_at >= :d30
         )`,
        { replacements: { d30 }, type: SELECT as never, raw: true },
      ).then((rows) => Number((rows as unknown as Array<{ cnt: string }>)?.[0]?.cnt ?? 0)),
    ]);

    const alerts: Alert[] = [];

    if (payoutsPendingCount > 0) {
      alerts.push({
        type: 'payouts_pending',
        priority: payoutsPendingCount >= 10 ? 'high' : 'medium',
        count: payoutsPendingCount,
        message: `${payoutsPendingCount} paiement(s) en attente pour un total de ${toNum(payoutsPendingTotal)} EUR`,
      });
    }

    if (activeBoostsCount > 0) {
      alerts.push({
        type: 'active_boosts',
        priority: 'low',
        count: activeBoostsCount,
        message: `${activeBoostsCount} boost(s) de commission actif(s)`,
      });
    }

    if (expiringBoostsCount > 0) {
      alerts.push({
        type: 'expiring_boosts',
        priority: 'medium',
        count: expiringBoostsCount,
        message: `${expiringBoostsCount} boost(s) expirant dans les 7 prochains jours`,
      });
    }

    if (unattributedSalesCount > 0) {
      alerts.push({
        type: 'unattributed_sales',
        priority: 'high',
        count: unattributedSalesCount,
        message: `${unattributedSalesCount} vente(s) avec attribution faible ou manquante cette semaine`,
      });
    }

    if (csvOverduePrograms > 0) {
      alerts.push({
        type: 'csv_import_overdue',
        priority: 'high',
        count: csvOverduePrograms,
        message: `${csvOverduePrograms} programme(s) CSV sans conversion depuis 7 jours`,
      });
    }

    if (fraudAlertsCount > 0) {
      alerts.push({
        type: 'fraud_alerts',
        priority: 'high',
        count: fraudAlertsCount,
        message: `${fraudAlertsCount} alerte(s) de fraude haute/critique en attente`,
      });
    }

    if (openDisputesCount > 0) {
      alerts.push({
        type: 'open_disputes',
        priority: openDisputesCount >= 5 ? 'high' : 'medium',
        count: openDisputesCount,
        message: `${openDisputesCount} litige(s) ouvert(s) a traiter`,
      });
    }

    if (failedEmailsCount > 0) {
      alerts.push({
        type: 'failed_emails',
        priority: failedEmailsCount >= 10 ? 'high' : 'medium',
        count: failedEmailsCount,
        message: `${failedEmailsCount} email(s) echoue(s) dans les dernieres 24h`,
      });
    }

    const inactiveRate =
      totalAmbassadors > 0
        ? Math.round((inactiveAmbassadorsCount / totalAmbassadors) * 10000) / 100
        : 0;
    if (inactiveRate > 50) {
      alerts.push({
        type: 'inactive_ambassadors',
        priority: inactiveRate > 75 ? 'high' : 'medium',
        count: inactiveAmbassadorsCount,
        message: `${inactiveRate}% des ambassadeurs sans activite depuis 30 jours (${inactiveAmbassadorsCount}/${totalAmbassadors})`,
      });
    }

    // Sort by priority: high first, then medium, then low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    success(res, { alerts });
  } catch (err) {
    console.error('Admin alerts error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors du calcul des alertes', 500);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. GET /api/admin/export/:type?period=30d
// ═══════════════════════════════════════════════════════════════════════════

function toCsvRow(fields: Array<string | number | boolean | null | undefined>): string {
  return fields
    .map((f) => {
      if (f === null || f === undefined) return '';
      const s = String(f);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(',');
}

router.get('/export/:type', async (req, res) => {
  try {
    // Accept French aliases for export types
    const typeAliases: Record<string, string> = {
      ambassadeurs: 'ambassadors',
    };
    const exportType = typeAliases[req.params.type] || req.params.type;
    const period = (req.query.period as string) || '30d';
    const pStart = getPeriodStart(period);
    const pWhere = pStart ? { created_at: { [Op.gte]: pStart } } : {};

    let csv = '';
    let filename = '';

    switch (exportType) {
      case 'conversions': {
        filename = `conversions-${period}.csv`;
        const headers = [
          'id',
          'date',
          'ambassador_id',
          'ambassador_name',
          'ambassador_email',
          'program',
          'order_ref',
          'amount',
          'commission_total',
          'ambassador_share',
          'sponsor_share',
          'buyer_share',
          'platform_share',
          'status',
          'attribution_method',
          'attribution_confidence',
        ];
        csv = toCsvRow(headers) + '\n';

        const rows = await Conversion.findAll({
          where: pWhere,
          include: [
            { model: User, as: 'ambassador', attributes: ['firstname', 'lastname', 'email'] },
            { model: AffiliateProgram, as: 'program', attributes: ['display_name'] },
          ],
          order: [['created_at', 'DESC']],
          raw: true,
        });

        for (const row of rows as unknown as Array<Record<string, unknown>>) {
          csv +=
            toCsvRow([
              row.id as number,
              String(row.created_at),
              row.ambassador_id as string,
              ((row['ambassador.firstname'] || '') + ' ' + (row['ambassador.lastname'] || '')).trim(),
              row['ambassador.email'] as string,
              row['program.display_name'] as string,
              row.order_ref as string,
              row.amount as number,
              row.commission_total as number,
              row.ambassador_share as number,
              row.sponsor_share as number,
              row.buyer_share as number,
              row.platform_share as number,
              row.status as string,
              row.attribution_method as string,
              row.attribution_confidence as string,
            ]) + '\n';
        }
        break;
      }

      case 'ambassadors': {
        filename = `ambassadors-${period}.csv`;
        const headers = [
          'id',
          'firstname',
          'lastname',
          'email',
          'referral_code',
          'tier',
          'total_sales',
          'created_at',
          'is_active',
          'referred_by',
        ];
        csv = toCsvRow(headers) + '\n';

        const rows = await User.findAll({
          where: { role: 'ambassador' },
          attributes: [
            'id',
            'firstname',
            'lastname',
            'email',
            'referral_code',
            'tier',
            'total_sales',
            'created_at',
            'is_active',
            'referred_by',
          ],
          order: [['created_at', 'DESC']],
          raw: true,
        });

        for (const row of rows as unknown as Array<Record<string, unknown>>) {
          csv +=
            toCsvRow([
              row.id as string,
              row.firstname as string,
              row.lastname as string,
              row.email as string,
              row.referral_code as string,
              row.tier as string,
              row.total_sales as number,
              String(row.created_at),
              row.is_active ? 'oui' : 'non',
              row.referred_by as string,
            ]) + '\n';
        }
        break;
      }

      case 'payouts': {
        filename = `payouts-${period}.csv`;
        const headers = [
          'id',
          'user_id',
          'user_name',
          'user_email',
          'amount',
          'type',
          'method',
          'status',
          'requested_at',
          'paid_at',
        ];
        csv = toCsvRow(headers) + '\n';

        const rows = await Payout.findAll({
          where: pWhere,
          include: [{ model: User, as: 'user', attributes: ['firstname', 'lastname', 'email'] }],
          order: [['created_at', 'DESC']],
          raw: true,
        });

        for (const row of rows as unknown as Array<Record<string, unknown>>) {
          csv +=
            toCsvRow([
              row.id as number,
              row.user_id as string,
              ((row['user.firstname'] || '') + ' ' + (row['user.lastname'] || '')).trim(),
              row['user.email'] as string,
              row.amount as number,
              row.type as string,
              row.method as string,
              row.status as string,
              String(row.requested_at),
              row.paid_at ? String(row.paid_at) : null,
            ]) + '\n';
        }
        break;
      }

      case 'cashback': {
        filename = `cashback-${period}.csv`;
        const headers = [
          'id',
          'user_id',
          'user_name',
          'user_email',
          'type',
          'amount',
          'balance_after',
          'description',
          'created_at',
        ];
        csv = toCsvRow(headers) + '\n';

        const rows = await CashbackTransaction.findAll({
          where: pWhere,
          include: [{ model: User, as: 'user', attributes: ['firstname', 'lastname', 'email'] }],
          order: [['created_at', 'DESC']],
          raw: true,
        });

        for (const row of rows as unknown as Array<Record<string, unknown>>) {
          csv +=
            toCsvRow([
              row.id as number,
              row.user_id as string,
              ((row['user.firstname'] || '') + ' ' + (row['user.lastname'] || '')).trim(),
              row['user.email'] as string,
              row.type as string,
              row.amount as number,
              row.balance_after as number,
              row.description as string,
              String(row.created_at),
            ]) + '\n';
        }
        break;
      }

      case 'audit': {
        filename = `audit-${period}.csv`;
        const headers = [
          'id',
          'admin_id',
          'admin_name',
          'admin_email',
          'action',
          'entity_type',
          'entity_id',
          'ip_address',
          'created_at',
        ];
        csv = toCsvRow(headers) + '\n';

        const rows = await AuditLog.findAll({
          where: pWhere,
          include: [{ model: User, as: 'admin', attributes: ['firstname', 'lastname', 'email'] }],
          order: [['created_at', 'DESC']],
          raw: true,
        });

        for (const row of rows as unknown as Array<Record<string, unknown>>) {
          csv +=
            toCsvRow([
              row.id as number,
              row.admin_id as string,
              ((row['admin.firstname'] || '') + ' ' + (row['admin.lastname'] || '')).trim(),
              row['admin.email'] as string,
              row.action as string,
              row.entity_type as string,
              row.entity_id as string,
              row.ip_address as string,
              String(row.created_at),
            ]) + '\n';
        }
        break;
      }

      case 'emails': {
        filename = `emails-${period}.csv`;
        const headers = [
          'id',
          'sent_at',
          'recipient',
          'template_name',
          'subject',
          'status',
          'resend_id',
        ];
        csv = toCsvRow(headers) + '\n';

        const rows = await EmailLog.findAll({
          where: pWhere,
          include: [{ model: User, as: 'user', attributes: ['email'] }],
          order: [['sent_at', 'DESC']],
          raw: true,
        });

        for (const row of rows as unknown as Array<Record<string, unknown>>) {
          csv +=
            toCsvRow([
              row.id as number,
              row.sent_at ? String(row.sent_at) : null,
              row['user.email'] as string || row.recipient_email as string,
              row.template_name as string,
              row.subject as string,
              row.status as string,
              row.resend_id as string,
            ]) + '\n';
        }
        break;
      }

      default:
        error(
          res,
          'INVALID_TYPE',
          "Type d'export invalide. Types valides: conversions, ambassadors, payouts, cashback, audit, emails",
          400,
        );
        return;
    }

    // Add BOM for Excel compatibility
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(bom + csv);
  } catch (err) {
    console.error('Admin export error:', err);
    error(res, 'INTERNAL_ERROR', "Erreur lors de l'export CSV", 500);
  }
});

export default router;
