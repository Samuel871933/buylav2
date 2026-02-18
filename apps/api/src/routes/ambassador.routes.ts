import { Router } from 'express';
import { User, Visit, OutboundClick, Conversion, AffiliateProgram, CommissionTier, Sequelize, Op } from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';
import { hashPassword, comparePassword } from '../lib/auth';

const router = Router();

// All ambassador routes require auth + ambassador role
router.use(checkAuth(), checkRole('ambassador'));

// ── GET /api/ambassador/profile ──
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findByPk(req.user!.userId, {
      attributes: ['id', 'firstname', 'lastname', 'email', 'avatar_url'],
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    success(res, {
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      avatar_url: user.avatar_url,
    });
  } catch (err) {
    console.error('Ambassador profile error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/ambassador/profile ──
router.put('/profile', async (req, res) => {
  try {
    const { firstname, lastname } = req.body;
    const updateData: Record<string, unknown> = {};

    if (firstname !== undefined) updateData.firstname = firstname;
    if (lastname !== undefined) updateData.lastname = lastname;

    if (Object.keys(updateData).length === 0) {
      error(res, 'VALIDATION_ERROR', 'Aucune donnée à mettre à jour', 400);
      return;
    }

    await User.update(updateData, { where: { id: req.user!.userId } });

    const user = await User.findByPk(req.user!.userId, {
      attributes: ['id', 'firstname', 'lastname', 'email', 'avatar_url'],
    });

    success(res, {
      firstname: user!.firstname,
      lastname: user!.lastname,
      email: user!.email,
      avatar_url: user!.avatar_url,
    });
  } catch (err) {
    console.error('Ambassador update profile error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/ambassador/password ──
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      error(res, 'VALIDATION_ERROR', 'Mot de passe actuel et nouveau requis', 400);
      return;
    }

    if (newPassword.length < 8) {
      error(res, 'VALIDATION_ERROR', 'Le nouveau mot de passe doit contenir au moins 8 caractères', 400);
      return;
    }

    const user = await User.findByPk(req.user!.userId);
    if (!user || !user.password_hash) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      error(res, 'INVALID_CREDENTIALS', 'Mot de passe actuel incorrect', 401);
      return;
    }

    const newHash = await hashPassword(newPassword);
    await User.update({ password_hash: newHash }, { where: { id: req.user!.userId } });

    success(res, { message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    console.error('Ambassador change password error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── Helper: compute period start date ──
function getPeriodStart(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case 'today': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
    }
    case '7d': {
      const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d;
    }
    case '30d': {
      const d = new Date(now); d.setDate(d.getDate() - 30); d.setHours(0, 0, 0, 0); return d;
    }
    case '90d': {
      const d = new Date(now); d.setDate(d.getDate() - 90); d.setHours(0, 0, 0, 0); return d;
    }
    case '12m': {
      const d = new Date(now); d.setFullYear(d.getFullYear() - 1); d.setHours(0, 0, 0, 0); return d;
    }
    case 'all':
    default:
      return null; // no filter
  }
}

// ── GET /api/ambassador/stats ──
// ?period=today|7d|30d|90d|12m|all (default: 30d)
router.get('/stats', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;
    const period = (req.query.period as string) || '30d';
    const since = getPeriodStart(period);

    const user = await User.findByPk(ambassadorId, {
      attributes: ['firstname', 'total_sales', 'tier', 'referral_code'],
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    // Build date filter for the period
    const periodClickWhere: Record<string, unknown> = { ambassador_id: ambassadorId };
    const periodVisitWhere: Record<string, unknown> = { ambassador_id: ambassadorId };
    const periodConvWhere: Record<string, unknown> = { ambassador_id: ambassadorId };

    if (since) {
      periodClickWhere.clicked_at = { [Op.gte]: since };
      periodVisitWhere.created_at = { [Op.gte]: since };
      periodConvWhere.created_at = { [Op.gte]: since };
    }

    // Run all queries in parallel (findOne + COALESCE for reliable SUM)
    const [
      clicks,
      visits,
      conversionsCount,
      totalSalesAmount,
      pendingResult,
      confirmedResult,
      paidResult,
    ] = await Promise.all([
      // Clicks in period
      OutboundClick.count({ where: periodClickWhere }),
      // Visits in period
      Visit.count({ where: periodVisitWhere }),
      // Conversions count in period (excl cancelled)
      Conversion.count({
        where: { ...periodConvWhere, status: { [Op.ne]: 'cancelled' } },
      }),
      // Total sales amount in period (excl cancelled)
      Conversion.findOne({
        attributes: [
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'total'],
        ],
        where: { ...periodConvWhere, status: { [Op.ne]: 'cancelled' } },
        raw: true,
      }),
      // Pending earnings (ambassador_share where status = pending)
      Conversion.findOne({
        attributes: [
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
        ],
        where: { ...periodConvWhere, status: 'pending' },
        raw: true,
      }),
      // Confirmed earnings (ambassador_share where status = confirmed)
      Conversion.findOne({
        attributes: [
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
        ],
        where: { ...periodConvWhere, status: 'confirmed' },
        raw: true,
      }),
      // Paid earnings
      Conversion.findOne({
        attributes: [
          [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'total'],
        ],
        where: { ...periodConvWhere, status: 'paid' },
        raw: true,
      }),
    ]);

    success(res, {
      name: user.firstname || 'Ambassadeur',
      period,
      clicks,
      visits,
      conversions: conversionsCount,
      total_amount: Number((totalSalesAmount as any)?.total) || 0,
      pending_earnings: Number((pendingResult as any)?.total) || 0,
      confirmed_earnings: Number((confirmedResult as any)?.total) || 0,
      paid_earnings: Number((paidResult as any)?.total) || 0,
      total_sales: user.total_sales,
      current_tier: user.tier,
      referral_code: user.referral_code,
    });
  } catch (err) {
    console.error('Ambassador stats error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── GET /api/ambassador/chart ──
// ?period=today|7d|30d|90d|12m|all (default: 30d)
router.get('/chart', async (req, res) => {
  try {
    const ambassadorId = req.user!.userId;
    const period = (req.query.period as string) || '30d';
    const since = getPeriodStart(period) || (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d; })();

    // Daily clicks
    const clickRows = await OutboundClick.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('clicked_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: { ambassador_id: ambassadorId, clicked_at: { [Op.gte]: since } },
      group: [Sequelize.fn('DATE', Sequelize.col('clicked_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('clicked_at')), 'ASC']],
      raw: true,
    });

    // Daily visits
    const visitRows = await Visit.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: { ambassador_id: ambassadorId, created_at: { [Op.gte]: since } },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    // Daily earnings (ambassador_share, excl cancelled)
    const earningsRows = await Conversion.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'earnings'],
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'sales'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
      ],
      where: {
        ambassador_id: ambassadorId,
        created_at: { [Op.gte]: since },
        status: { [Op.ne]: 'cancelled' },
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    // Daily sponsorship earnings (sponsor_share where I am sponsor)
    const sponsorRows = await Conversion.findAll({
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('created_at')), 'date'],
        [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('sponsor_share')), 0), 'sponsor_earnings'],
      ],
      where: {
        sponsor_id: ambassadorId,
        created_at: { [Op.gte]: since },
        status: { [Op.ne]: 'cancelled' },
      },
      group: [Sequelize.fn('DATE', Sequelize.col('created_at'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    const clickMap = new Map<string, number>();
    for (const row of clickRows as any[]) clickMap.set(row.date, Number(row.count));

    const visitMap = new Map<string, number>();
    for (const row of visitRows as any[]) visitMap.set(row.date, Number(row.count));

    const earningsMap = new Map<string, { earnings: number; sales: number; conversions: number }>();
    for (const row of earningsRows as any[]) {
      earningsMap.set(row.date, {
        earnings: Number(row.earnings) || 0,
        sales: Number(row.sales) || 0,
        conversions: Number(row.count) || 0,
      });
    }

    const sponsorMap = new Map<string, number>();
    for (const row of sponsorRows as any[]) {
      sponsorMap.set(row.date, Number(row.sponsor_earnings) || 0);
    }

    const chart: Array<{
      date: string;
      clicks: number;
      visits: number;
      earnings: number;
      sponsor_earnings: number;
      sales: number;
      conversions: number;
    }> = [];

    const cursor = new Date(since);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    while (cursor <= today) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const e = earningsMap.get(dateStr);
      chart.push({
        date: dateStr,
        clicks: clickMap.get(dateStr) || 0,
        visits: visitMap.get(dateStr) || 0,
        earnings: e?.earnings || 0,
        sponsor_earnings: sponsorMap.get(dateStr) || 0,
        sales: e?.sales || 0,
        conversions: e?.conversions || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    success(res, chart);
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
      attributes: ['id', 'firstname', 'lastname', 'email', 'is_active', 'total_sales', 'tier', 'created_at'],
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
      attributes: ['id', 'firstname', 'lastname', 'total_sales', 'tier', 'created_at'],
      where: { role: 'ambassador', is_active: true },
      order: [['total_sales', 'DESC']],
      limit,
    });

    // Anonymize names: keep first letter + "***"
    const leaderboard = topAmbassadors.map((u: any, i: number) => ({
      rank: i + 1,
      firstname: u.id === ambassadorId ? u.firstname : (u.firstname?.charAt(0) || '?') + '***',
      lastname: u.id === ambassadorId ? u.lastname : (u.lastname?.charAt(0) || '?') + '***',
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
