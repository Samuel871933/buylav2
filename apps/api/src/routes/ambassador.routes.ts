import { Router } from 'express';
import { User, Visit, OutboundClick, Conversion, AffiliateProgram, CommissionTier, Sequelize, Op } from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';

const router = Router();

// All ambassador routes require auth + ambassador role
router.use(checkAuth(), checkRole('ambassador'));

// ── GET /api/ambassador/stats ──
router.get('/stats', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;

    // Fetch user data for tier, referral_code, total_sales
    const user = await User.findByPk(ambassadorId, {
      attributes: ['total_sales', 'tier', 'referral_code'],
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    // Today boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Total clicks
    const totalClicks = await OutboundClick.count({
      where: { ambassador_id: ambassadorId },
    });

    // Clicks today
    const clicksToday = await OutboundClick.count({
      where: {
        ambassador_id: ambassadorId,
        clicked_at: { [Op.gte]: todayStart },
      },
    });

    // Total visits
    const totalVisits = await Visit.count({
      where: { ambassador_id: ambassadorId },
    });

    // Visits today
    const visitsToday = await Visit.count({
      where: {
        ambassador_id: ambassadorId,
        created_at: { [Op.gte]: todayStart },
      },
    });

    success(res, {
      stats: {
        totalClicks,
        clicksToday,
        totalVisits,
        visitsToday,
        pendingEarnings: 0,
        confirmedEarnings: 0,
        totalSales: user.total_sales,
        currentTier: user.tier,
        referralCode: user.referral_code,
      },
    });
  } catch (err) {
    console.error('Ambassador stats error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/chart ──
router.get('/chart', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;
    const days = Math.min(Math.max(parseInt(req.query.days as string) || 30, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Daily clicks grouped by DATE(clicked_at)
    const clickRows = await OutboundClick.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('clicked_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: {
        ambassador_id: ambassadorId,
        clicked_at: { [Op.gte]: since },
      },
      group: [Sequelize.fn('DATE', Sequelize.col('clicked_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('clicked_at')), 'ASC']],
      raw: true,
    });

    // Daily visits grouped by DATE(created_at)
    const visitRows = await Visit.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: {
        ambassador_id: ambassadorId,
        created_at: { [Op.gte]: since },
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    // Build a map of date -> { clicks, visits }
    const clickMap = new Map<string, number>();
    for (const row of clickRows as any[]) {
      clickMap.set(row.date, Number(row.count));
    }

    const visitMap = new Map<string, number>();
    for (const row of visitRows as any[]) {
      visitMap.set(row.date, Number(row.count));
    }

    // Fill all days in the range (so frontend gets a continuous series)
    const chart: Array<{ date: string; clicks: number; visits: number }> = [];
    const cursor = new Date(since);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10);
      chart.push({
        date: dateStr,
        clicks: clickMap.get(dateStr) || 0,
        visits: visitMap.get(dateStr) || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    success(res, { chart });
  } catch (err) {
    console.error('Ambassador chart error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/conversions ──
router.get('/conversions', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;

    // Filters
    const status = req.query.status as string;
    const programId = req.query.program as string;
    const dateFrom = req.query.from as string;
    const dateTo = req.query.to as string;
    const search = req.query.search as string;

    const where: Record<string, unknown> = { ambassador_id: ambassadorId };

    if (status && ['pending', 'confirmed', 'paid', 'cancelled'].includes(status)) {
      where.status = status;
    }
    if (programId && !isNaN(Number(programId))) {
      where.affiliate_program_id = Number(programId);
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<symbol, Date> = {};
      if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateFilter[Op.lte] = to;
      }
      where.created_at = dateFilter;
    }
    if (search) {
      where.order_ref = { [Op.like]: `%${search}%` };
    }

    const { count, rows } = await Conversion.findAndCountAll({
      where,
      include: [
        {
          model: AffiliateProgram,
          as: 'program',
          attributes: ['id', 'name', 'display_name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Ambassador conversions error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/conversions/export ──
router.get('/conversions/export', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;

    const status = req.query.status as string;
    const programId = req.query.program as string;
    const dateFrom = req.query.from as string;
    const dateTo = req.query.to as string;

    const where: Record<string, unknown> = { ambassador_id: ambassadorId };

    if (status && ['pending', 'confirmed', 'paid', 'cancelled'].includes(status)) {
      where.status = status;
    }
    if (programId && !isNaN(Number(programId))) {
      where.affiliate_program_id = Number(programId);
    }
    if (dateFrom || dateTo) {
      const dateFilter: Record<symbol, Date> = {};
      if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateFilter[Op.lte] = to;
      }
      where.created_at = dateFilter;
    }

    const rows = await Conversion.findAll({
      where,
      include: [
        {
          model: AffiliateProgram,
          as: 'program',
          attributes: ['name', 'display_name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: 5000,
    });

    // Build CSV
    const BOM = '\uFEFF';
    const headers = ['Date', 'Programme', 'Ref commande', 'Montant', 'Commission', 'Ma part', 'Statut'];
    const csvRows = rows.map((r: any) => [
      new Date(r.created_at).toLocaleDateString('fr-FR'),
      r.program?.display_name || r.program?.name || '-',
      r.order_ref || '-',
      Number(r.amount).toFixed(2),
      Number(r.commission_total).toFixed(2),
      Number(r.ambassador_share).toFixed(2),
      r.status,
    ]);

    const csv = BOM + [headers, ...csvRows].map((row) => row.map((c: string) => `"${c}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=mes-ventes.csv');
    res.send(csv);
  } catch (err) {
    console.error('Ambassador conversions export error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/programs ── (for filter dropdown)
router.get('/programs', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;

    // Get distinct program IDs that this ambassador has conversions for
    const programIds = await Conversion.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('affiliate_program_id')), 'affiliate_program_id']],
      where: { ambassador_id: ambassadorId },
      raw: true,
    });

    const ids = (programIds as any[]).map((r) => r.affiliate_program_id);

    if (ids.length === 0) {
      success(res, { programs: [] });
      return;
    }

    const programs = await AffiliateProgram.findAll({
      attributes: ['id', 'name', 'display_name'],
      where: { id: { [Op.in]: ids } },
      order: [['display_name', 'ASC']],
    });

    success(res, { programs });
  } catch (err) {
    console.error('Ambassador programs error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/referrals ──
router.get('/referrals', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;

    // Level 1 referrals
    const { count: totalL1, rows: level1 } = await User.findAndCountAll({
      where: { referred_by: ambassadorId, role: 'ambassador' },
      attributes: ['id', 'name', 'email', 'is_active', 'total_sales', 'tier', 'created_at'],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    // Level 2 referrals (referrals of my referrals)
    const l1Ids = level1.map((u: any) => u.id);
    let level2Count = 0;
    let level2TotalSales = 0;

    if (l1Ids.length > 0) {
      const l2Stats = await User.findAll({
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
          [Sequelize.fn('SUM', Sequelize.col('total_sales')), 'sales'],
        ],
        where: { referred_by: { [Op.in]: l1Ids }, role: 'ambassador' },
        raw: true,
      }) as any[];

      level2Count = Number(l2Stats[0]?.count) || 0;
      level2TotalSales = Number(l2Stats[0]?.sales) || 0;
    }

    // Sponsor earnings
    const sponsorEarnings = await Conversion.findAll({
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('sponsor_share')), 'total'],
      ],
      where: { sponsor_id: ambassadorId, status: { [Op.in]: ['confirmed', 'paid'] } },
      raw: true,
    }) as any[];

    const totalSponsorEarnings = Number(sponsorEarnings[0]?.total) || 0;

    paginated(res, level1, {
      page,
      limit,
      total: totalL1,
      extra: {
        level2Count,
        level2TotalSales,
        totalSponsorEarnings,
      },
    });
  } catch (err) {
    console.error('Ambassador referrals error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/tier-progress ──
router.get('/tier-progress', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;

    const user = await User.findByPk(ambassadorId, {
      attributes: ['total_sales', 'tier'],
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    // Get all tiers ordered by min_sales
    const tiers = await CommissionTier.findAll({
      order: [['min_sales', 'ASC']],
      raw: true,
    });

    // Find current and next tier
    const currentTierIndex = tiers.findIndex((t) => t.name === user.tier);
    const currentTier = currentTierIndex >= 0 ? tiers[currentTierIndex] : tiers[0];
    const nextTier = currentTierIndex >= 0 && currentTierIndex < tiers.length - 1
      ? tiers[currentTierIndex + 1]
      : null;

    // Calculate progress
    let progress = 100;
    let salesNeeded = 0;

    if (nextTier && currentTier) {
      const totalRange = nextTier.min_sales - currentTier.min_sales;
      const currentProgress = user.total_sales - currentTier.min_sales;
      progress = totalRange > 0 ? Math.min(Math.round((currentProgress / totalRange) * 100), 100) : 100;
      salesNeeded = Math.max(nextTier.min_sales - user.total_sales, 0);
    }

    success(res, {
      currentTier: currentTier ? {
        name: currentTier.name,
        min_sales: currentTier.min_sales,
        ambassador_rate_affiliate: currentTier.ambassador_rate_affiliate,
      } : null,
      nextTier: nextTier ? {
        name: nextTier.name,
        min_sales: nextTier.min_sales,
        ambassador_rate_affiliate: nextTier.ambassador_rate_affiliate,
      } : null,
      total_sales: user.total_sales,
      progress,
      salesNeeded,
      allTiers: tiers.map((t) => ({
        name: t.name,
        min_sales: t.min_sales,
        rate: t.ambassador_rate_affiliate,
      })),
    });
  } catch (err) {
    console.error('Ambassador tier-progress error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/community-stats ──
router.get('/community-stats', async (_req, res) => {
  try {
    const [
      totalAmbassadors,
      totalSalesResult,
      totalCommissionsResult,
      totalCashbackResult,
      topPrograms,
    ] = await Promise.all([
      User.count({ where: { role: 'ambassador', is_active: true } }),
      Conversion.findAll({
        attributes: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
        where: { status: { [Op.in]: ['confirmed', 'paid'] } },
        raw: true,
      }),
      Conversion.findAll({
        attributes: [[Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 'total']],
        where: { status: { [Op.in]: ['confirmed', 'paid'] } },
        raw: true,
      }),
      Conversion.findAll({
        attributes: [[Sequelize.fn('SUM', Sequelize.col('buyer_share')), 'total']],
        where: { status: { [Op.in]: ['confirmed', 'paid'] } },
        raw: true,
      }),
      Conversion.findAll({
        attributes: [
          'affiliate_program_id',
          [Sequelize.fn('COUNT', Sequelize.col('Conversion.id')), 'count'],
        ],
        include: [{
          model: AffiliateProgram,
          as: 'program',
          attributes: ['name', 'display_name'],
        }],
        where: { status: { [Op.in]: ['confirmed', 'paid'] } },
        group: ['affiliate_program_id', 'program.id', 'program.name', 'program.display_name'],
        order: [[Sequelize.fn('COUNT', Sequelize.col('Conversion.id')), 'DESC']],
        limit: 5,
        raw: true,
        nest: true,
      }),
    ]);

    success(res, {
      totalAmbassadors,
      totalSales: Number((totalSalesResult as any[])[0]?.count) || 0,
      totalCommissions: Number((totalCommissionsResult as any[])[0]?.total) || 0,
      totalCashback: Number((totalCashbackResult as any[])[0]?.total) || 0,
      topPrograms: (topPrograms as any[]).map((p) => ({
        name: p.program?.display_name || p.program?.name || '-',
        count: Number(p.count),
      })),
    });
  } catch (err) {
    console.error('Ambassador community-stats error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/leaderboard ──
router.get('/leaderboard', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    const topAmbassadors = await User.findAll({
      attributes: ['id', 'name', 'total_sales', 'tier', 'created_at'],
      where: { role: 'ambassador', is_active: true },
      order: [['total_sales', 'DESC']],
      limit,
    });

    // Anonymize names: keep first letter + "***"
    const leaderboard = topAmbassadors.map((u: any, i: number) => ({
      rank: i + 1,
      name: u.id === ambassadorId ? u.name : (u.name?.charAt(0) || '?') + '***',
      total_sales: u.total_sales,
      tier: u.tier,
      is_me: u.id === ambassadorId,
    }));

    // Find my rank if not in top
    let myRank = leaderboard.find((l) => l.is_me)?.rank ?? null;

    if (!myRank) {
      const myUser = await User.findByPk(ambassadorId, {
        attributes: ['total_sales'],
      });
      if (myUser) {
        const ahead = await User.count({
          where: {
            role: 'ambassador',
            is_active: true,
            total_sales: { [Op.gt]: myUser.total_sales },
          },
        });
        myRank = ahead + 1;
      }
    }

    success(res, { leaderboard, myRank });
  } catch (err) {
    console.error('Ambassador leaderboard error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

export default router;
