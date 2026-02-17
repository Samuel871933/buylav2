import { Router } from 'express';
import { z } from 'zod';
import {
  User,
  AffiliateProgram,
  RedirectPortal,
  Conversion,
  CommissionBoost,
  AuditLog,
  OutboundClick,
  CashbackTransaction,
  Op,
  Sequelize,
} from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { calculateShares } from '../lib/commission-calculator';

const router = Router();

// All routes require auth + admin role
router.use(checkAuth(), checkRole('admin'));

// ════════════════════════════════════════════════════════════════════════════
//  VALIDATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const programSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  display_name: z.string().min(1, 'Le nom d\'affichage est requis').max(200),
  network: z.enum(['direct', 'awin', 'affilae', 'cj', 'amazon', 'custom'], {
    errorMap: () => ({ message: 'Réseau invalide' }),
  }),
  base_url: z.string().max(500).nullable().optional(),
  url_template: z.string().min(1, 'Le template URL est requis'),
  sub_id_param: z.string().max(50).nullable().optional(),
  sub_id_format: z.string().max(100).nullable().optional(),
  cookie_duration_days: z.number().int().min(0).default(30),
  avg_commission_rate: z.number().min(0).max(100).default(0),
  buyer_cashback_rate: z.number().min(0).max(100).default(10),
  postback_url: z.string().max(500).nullable().optional(),
  postback_secret: z.string().max(255).nullable().optional(),
  api_key: z.string().max(500).nullable().optional(),
  reconciliation_method: z.enum(['postback', 'csv_import', 'api_manual', 'api_scheduled', 'stripe'], {
    errorMap: () => ({ message: 'Méthode de réconciliation invalide' }),
  }),
  csv_import_config: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().nullable().optional(),
});

const programUpdateSchema = programSchema.partial();

const portalSchema = z.object({
  affiliate_program_id: z.number().int().positive('L\'ID du programme est requis'),
  merchant_slug: z.string().min(1, 'Le slug est requis').max(100),
  display_name: z.string().min(1, 'Le nom d\'affichage est requis').max(200),
  logo_url: z.string().max(500).nullable().optional(),
  description: z.string().nullable().optional(),
  redirect_url_template: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

const portalUpdateSchema = portalSchema.partial();

const ambassadorUpdateSchema = z.object({
  tier: z
    .enum(['beginner', 'active', 'performer', 'expert', 'elite'])
    .optional(),
  is_active: z.boolean().optional(),
  role: z.enum(['ambassador', 'buyer', 'admin']).optional(),
});

const userUpdateSchema = z.object({
  role: z.enum(['ambassador', 'buyer', 'admin']).optional(),
  is_active: z.boolean().optional(),
});

const boostSchema = z.object({
  type: z.enum(['ambassador_rate', 'buyer_cashback', 'sponsor_rate'], {
    errorMap: () => ({ message: 'Type de boost invalide' }),
  }),
  boost_value: z.number().min(0, 'La valeur doit être positive').max(100),
  reason: z.string().max(255).nullable().optional(),
  start_date: z.string().min(1, 'La date de début est requise'),
  end_date: z.string().nullable().optional(),
  max_uses: z.number().int().positive().nullable().optional(),
  user_id: z.string().uuid().nullable().optional(),
});

const boostUpdateSchema = boostSchema.partial();

const attributeSchema = z.object({
  ambassador_id: z.string().uuid('ID ambassadeur invalide'),
});

// ════════════════════════════════════════════════════════════════════════════
//  1. PROGRAMMES CRUD
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/programs ──
router.get('/programs', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${search}%` } },
        { display_name: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await AffiliateProgram.findAndCountAll({
      where,
      attributes: {
        include: [
          [
            Sequelize.literal(
              '(SELECT COUNT(*) FROM conversions WHERE conversions.affiliate_program_id = AffiliateProgram.id)',
            ),
            'conversion_count',
          ],
          [
            Sequelize.literal(
              '(SELECT COALESCE(SUM(amount), 0) FROM conversions WHERE conversions.affiliate_program_id = AffiliateProgram.id)',
            ),
            'total_revenue',
          ],
        ],
      },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin programs list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des programmes', 500);
  }
});

// ── GET /api/admin/programs/:id ──
router.get('/programs/:id', async (req, res) => {
  try {
    const program = await AffiliateProgram.findByPk(req.params.id, {
      attributes: {
        include: [
          [
            Sequelize.literal(
              '(SELECT COUNT(*) FROM conversions WHERE conversions.affiliate_program_id = AffiliateProgram.id)',
            ),
            'conversion_count',
          ],
          [
            Sequelize.literal(
              '(SELECT COALESCE(SUM(amount), 0) FROM conversions WHERE conversions.affiliate_program_id = AffiliateProgram.id)',
            ),
            'total_revenue',
          ],
        ],
      },
      include: [
        {
          model: RedirectPortal,
          as: 'portals',
          attributes: ['id', 'merchant_slug', 'display_name', 'is_active'],
        },
      ],
    });

    if (!program) {
      error(res, 'NOT_FOUND', 'Programme introuvable', 404);
      return;
    }

    success(res, { program });
  } catch (err) {
    console.error('Admin program detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération du programme', 500);
  }
});

// ── POST /api/admin/programs ──
router.post('/programs', validate(programSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof programSchema>;

    const existing = await AffiliateProgram.findOne({ where: { name: data.name } });
    if (existing) {
      error(res, 'DUPLICATE', 'Un programme avec ce nom existe déjà', 409);
      return;
    }

    const program = await AffiliateProgram.create(data);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'create',
      entity_type: 'affiliate_program',
      entity_id: String(program.id),
      new_values: data,
      ip_address: req.ip || null,
    });

    success(res, { program }, 201);
  } catch (err) {
    console.error('Admin create program error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la création du programme', 500);
  }
});

// ── PUT /api/admin/programs/:id ──
router.put('/programs/:id', validate(programUpdateSchema), async (req, res) => {
  try {
    const program = await AffiliateProgram.findByPk(req.params.id);
    if (!program) {
      error(res, 'NOT_FOUND', 'Programme introuvable', 404);
      return;
    }

    const oldData = program.toJSON();
    const newData = req.body as z.infer<typeof programUpdateSchema>;

    await program.update(newData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'update',
      entity_type: 'affiliate_program',
      entity_id: String(program.id),
      old_values: oldData,
      new_values: newData,
      ip_address: req.ip || null,
    });

    success(res, { program });
  } catch (err) {
    console.error('Admin update program error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour du programme', 500);
  }
});

// ── DELETE /api/admin/programs/:id ──
router.delete('/programs/:id', async (req, res) => {
  try {
    const program = await AffiliateProgram.findByPk(req.params.id);
    if (!program) {
      error(res, 'NOT_FOUND', 'Programme introuvable', 404);
      return;
    }

    const oldData = program.toJSON();
    await program.update({ is_active: false });

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'soft_delete',
      entity_type: 'affiliate_program',
      entity_id: String(program.id),
      old_values: oldData,
      new_values: { is_active: false },
      ip_address: req.ip || null,
    });

    success(res, { message: 'Programme désactivé avec succès' });
  } catch (err) {
    console.error('Admin delete program error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la suppression du programme', 500);
  }
});

// ── POST /api/admin/programs/:id/test ──
router.post('/programs/:id/test', async (req, res) => {
  try {
    const program = await AffiliateProgram.findByPk(req.params.id);
    if (!program) {
      error(res, 'NOT_FOUND', 'Programme introuvable', 404);
      return;
    }

    const fakeRefCode = 'TEST1234';
    let generatedUrl = program.url_template;

    // Replace common placeholders
    generatedUrl = generatedUrl.replace(/{sub_id}/g, fakeRefCode);
    generatedUrl = generatedUrl.replace(/{ref_code}/g, fakeRefCode);
    generatedUrl = generatedUrl.replace(/{click_id}/g, '999999');

    // If sub_id_param is set, also try query param construction
    if (program.sub_id_param) {
      const hasQueryString = generatedUrl.includes('?');
      const separator = hasQueryString ? '&' : '?';
      if (!generatedUrl.includes(program.sub_id_param + '=')) {
        generatedUrl = `${generatedUrl}${separator}${program.sub_id_param}=${fakeRefCode}`;
      }
    }

    success(res, {
      program_name: program.display_name,
      url_template: program.url_template,
      generated_url: generatedUrl,
      test_ref_code: fakeRefCode,
    });
  } catch (err) {
    console.error('Admin test program URL error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors du test de l\'URL', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  2. PORTAILS CRUD
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/portals ──
router.get('/portals', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';

    const where: Record<string, unknown> = {};
    if (search) {
      where[Op.or as unknown as string] = [
        { merchant_slug: { [Op.like]: `%${search}%` } },
        { display_name: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await RedirectPortal.findAndCountAll({
      where,
      include: [
        {
          model: AffiliateProgram,
          as: 'program',
          attributes: ['id', 'name', 'display_name', 'network'],
        },
      ],
      order: [
        ['sort_order', 'ASC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin portals list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des portails', 500);
  }
});

// ── POST /api/admin/portals ──
router.post('/portals', validate(portalSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof portalSchema>;

    // Verify program exists
    const program = await AffiliateProgram.findByPk(data.affiliate_program_id);
    if (!program) {
      error(res, 'NOT_FOUND', 'Programme affilié introuvable', 404);
      return;
    }

    // Check slug uniqueness
    const existing = await RedirectPortal.findOne({
      where: { merchant_slug: data.merchant_slug },
    });
    if (existing) {
      error(res, 'DUPLICATE', 'Un portail avec ce slug existe déjà', 409);
      return;
    }

    const portal = await RedirectPortal.create(data);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'create',
      entity_type: 'redirect_portal',
      entity_id: String(portal.id),
      new_values: data,
      ip_address: req.ip || null,
    });

    success(res, { portal }, 201);
  } catch (err) {
    console.error('Admin create portal error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la création du portail', 500);
  }
});

// ── PUT /api/admin/portals/:id ──
router.put('/portals/:id', validate(portalUpdateSchema), async (req, res) => {
  try {
    const portal = await RedirectPortal.findByPk(req.params.id);
    if (!portal) {
      error(res, 'NOT_FOUND', 'Portail introuvable', 404);
      return;
    }

    const oldData = portal.toJSON();
    const newData = req.body as z.infer<typeof portalUpdateSchema>;

    await portal.update(newData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'update',
      entity_type: 'redirect_portal',
      entity_id: String(portal.id),
      old_values: oldData,
      new_values: newData,
      ip_address: req.ip || null,
    });

    success(res, { portal });
  } catch (err) {
    console.error('Admin update portal error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour du portail', 500);
  }
});

// ── DELETE /api/admin/portals/:id ──
router.delete('/portals/:id', async (req, res) => {
  try {
    const portal = await RedirectPortal.findByPk(req.params.id);
    if (!portal) {
      error(res, 'NOT_FOUND', 'Portail introuvable', 404);
      return;
    }

    const oldData = portal.toJSON();
    await portal.update({ is_active: false });

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'soft_delete',
      entity_type: 'redirect_portal',
      entity_id: String(portal.id),
      old_values: oldData,
      new_values: { is_active: false },
      ip_address: req.ip || null,
    });

    success(res, { message: 'Portail désactivé avec succès' });
  } catch (err) {
    console.error('Admin delete portal error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la suppression du portail', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  3. AMBASSADEURS MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/ambassadors ──
router.get('/ambassadors', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const tier = req.query.tier as string | undefined;
    const active = req.query.active as string | undefined;

    const where: Record<string, unknown> = { role: 'ambassador' };

    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (tier && ['beginner', 'active', 'performer', 'expert', 'elite'].includes(tier)) {
      where.tier = tier;
    }

    if (active === 'true') {
      where.is_active = true;
    } else if (active === 'false') {
      where.is_active = false;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: {
        exclude: ['password_hash'],
        include: [
          [
            Sequelize.literal(
              '(SELECT COUNT(*) FROM users AS r WHERE r.referred_by = User.id)',
            ),
            'referral_count',
          ],
        ],
      },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin ambassadors list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des ambassadeurs', 500);
  }
});

// ── GET /api/admin/ambassadors/:id ──
router.get('/ambassadors/:id', async (req, res) => {
  try {
    const ambassador = await User.findOne({
      where: { id: req.params.id, role: 'ambassador' },
      attributes: {
        exclude: ['password_hash'],
        include: [
          [
            Sequelize.literal(
              '(SELECT COUNT(*) FROM users AS r WHERE r.referred_by = User.id)',
            ),
            'referral_count',
          ],
        ],
      },
      include: [
        {
          model: User,
          as: 'sponsor',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!ambassador) {
      error(res, 'NOT_FOUND', 'Ambassadeur introuvable', 404);
      return;
    }

    // Fetch sales stats
    const [salesStats, recentConversions, referrals] = await Promise.all([
      Conversion.findOne({
        where: { ambassador_id: req.params.id },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_conversions'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'total_amount'],
          [Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 'total_earned'],
        ],
        raw: true,
      }),
      Conversion.findAll({
        where: { ambassador_id: req.params.id },
        include: [
          {
            model: AffiliateProgram,
            as: 'program',
            attributes: ['id', 'display_name'],
          },
        ],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
      User.findAll({
        where: { referred_by: req.params.id },
        attributes: ['id', 'name', 'email', 'role', 'created_at'],
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
    ]);

    success(res, {
      ambassador,
      salesStats,
      recentConversions,
      referrals,
    });
  } catch (err) {
    console.error('Admin ambassador detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération de l\'ambassadeur', 500);
  }
});

// ── PUT /api/admin/ambassadors/:id ──
router.put('/ambassadors/:id', validate(ambassadorUpdateSchema), async (req, res) => {
  try {
    const ambassador = await User.findOne({
      where: { id: req.params.id, role: 'ambassador' },
    });

    if (!ambassador) {
      error(res, 'NOT_FOUND', 'Ambassadeur introuvable', 404);
      return;
    }

    const oldData = {
      tier: ambassador.tier,
      is_active: ambassador.is_active,
      role: ambassador.role,
    };
    const newData = req.body as z.infer<typeof ambassadorUpdateSchema>;

    await ambassador.update(newData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'update',
      entity_type: 'user',
      entity_id: ambassador.id,
      old_values: oldData,
      new_values: newData,
      ip_address: req.ip || null,
    });

    success(res, { ambassador: { ...ambassador.toJSON(), password_hash: undefined } });
  } catch (err) {
    console.error('Admin update ambassador error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour de l\'ambassadeur', 500);
  }
});

// ── PUT /api/admin/ambassadors/:id/deactivate ──
router.put('/ambassadors/:id/deactivate', async (req, res) => {
  try {
    const ambassador = await User.findOne({
      where: { id: req.params.id, role: 'ambassador' },
    });

    if (!ambassador) {
      error(res, 'NOT_FOUND', 'Ambassadeur introuvable', 404);
      return;
    }

    const oldData = { is_active: ambassador.is_active };
    await ambassador.update({ is_active: false });

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'deactivate',
      entity_type: 'user',
      entity_id: ambassador.id,
      old_values: oldData,
      new_values: { is_active: false },
      ip_address: req.ip || null,
    });

    success(res, { message: 'Ambassadeur désactivé avec succès' });
  } catch (err) {
    console.error('Admin deactivate ambassador error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la désactivation de l\'ambassadeur', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  4. BUYERS / USERS MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/users ──
router.get('/users', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const role = req.query.role as string | undefined;

    const where: Record<string, unknown> = {};

    if (search) {
      where[Op.or as unknown as string] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role && ['ambassador', 'buyer', 'admin'].includes(role)) {
      where.role = role;
    }

    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin users list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des utilisateurs', 500);
  }
});

// ── GET /api/admin/users/:id ──
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: User,
          as: 'sponsor',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    // Fetch cashback info
    const [cashbackStats, recentCashback] = await Promise.all([
      CashbackTransaction.findOne({
        where: { user_id: req.params.id },
        attributes: [
          [Sequelize.fn('COUNT', Sequelize.col('id')), 'total_transactions'],
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal("CASE WHEN type = 'earned' THEN amount ELSE 0 END"),
            ),
            'total_earned',
          ],
          [
            Sequelize.fn(
              'SUM',
              Sequelize.literal("CASE WHEN type = 'withdrawal' THEN amount ELSE 0 END"),
            ),
            'total_withdrawn',
          ],
        ],
        raw: true,
      }),
      CashbackTransaction.findAll({
        where: { user_id: req.params.id },
        order: [['created_at', 'DESC']],
        limit: 10,
      }),
    ]);

    success(res, {
      user,
      cashbackStats,
      recentCashback,
    });
  } catch (err) {
    console.error('Admin user detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération de l\'utilisateur', 500);
  }
});

// ── PUT /api/admin/users/:id ──
router.put('/users/:id', validate(userUpdateSchema), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    const oldData = { role: user.role, is_active: user.is_active };
    const newData = req.body as z.infer<typeof userUpdateSchema>;

    await user.update(newData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'update',
      entity_type: 'user',
      entity_id: user.id,
      old_values: oldData,
      new_values: newData,
      ip_address: req.ip || null,
    });

    success(res, { user: { ...user.toJSON(), password_hash: undefined } });
  } catch (err) {
    console.error('Admin update user error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour de l\'utilisateur', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  5. COMMISSION BOOSTS CRUD
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/boosts ──
router.get('/boosts', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { count, rows } = await CommissionBoost.findAndCountAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          required: false,
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [
        ['is_active', 'DESC'],
        ['start_date', 'DESC'],
      ],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin boosts list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des boosts', 500);
  }
});

// ── POST /api/admin/boosts ──
router.post('/boosts', validate(boostSchema), async (req, res) => {
  try {
    const data = req.body as z.infer<typeof boostSchema>;

    // If user_id is provided, verify user exists
    if (data.user_id) {
      const targetUser = await User.findByPk(data.user_id);
      if (!targetUser) {
        error(res, 'NOT_FOUND', 'Utilisateur cible introuvable', 404);
        return;
      }
    }

    const boost = await CommissionBoost.create({
      type: data.type,
      boost_value: data.boost_value,
      reason: data.reason ?? null,
      start_date: new Date(data.start_date),
      end_date: data.end_date ? new Date(data.end_date) : null,
      max_uses: data.max_uses ?? null,
      user_id: data.user_id ?? null,
      created_by: req.user!.userId,
    });

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'create',
      entity_type: 'commission_boost',
      entity_id: String(boost.id),
      new_values: data,
      ip_address: req.ip || null,
    });

    success(res, { boost }, 201);
  } catch (err) {
    console.error('Admin create boost error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la création du boost', 500);
  }
});

// ── PUT /api/admin/boosts/:id ──
router.put('/boosts/:id', validate(boostUpdateSchema), async (req, res) => {
  try {
    const boost = await CommissionBoost.findByPk(req.params.id);
    if (!boost) {
      error(res, 'NOT_FOUND', 'Boost introuvable', 404);
      return;
    }

    const oldData = boost.toJSON();
    const data = req.body as z.infer<typeof boostUpdateSchema>;

    const updateData: Record<string, unknown> = { ...data };
    if (data.start_date) {
      updateData.start_date = new Date(data.start_date);
    }
    if (data.end_date) {
      updateData.end_date = new Date(data.end_date);
    }
    if (data.end_date === null) {
      updateData.end_date = null;
    }

    await boost.update(updateData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'update',
      entity_type: 'commission_boost',
      entity_id: String(boost.id),
      old_values: oldData,
      new_values: data,
      ip_address: req.ip || null,
    });

    success(res, { boost });
  } catch (err) {
    console.error('Admin update boost error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour du boost', 500);
  }
});

// ── PUT /api/admin/boosts/:id/deactivate ──
router.put('/boosts/:id/deactivate', async (req, res) => {
  try {
    const boost = await CommissionBoost.findByPk(req.params.id);
    if (!boost) {
      error(res, 'NOT_FOUND', 'Boost introuvable', 404);
      return;
    }

    const oldData = { is_active: boost.is_active };
    await boost.update({ is_active: false });

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'deactivate',
      entity_type: 'commission_boost',
      entity_id: String(boost.id),
      old_values: oldData,
      new_values: { is_active: false },
      ip_address: req.ip || null,
    });

    success(res, { message: 'Boost désactivé avec succès' });
  } catch (err) {
    console.error('Admin deactivate boost error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la désactivation du boost', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  6. CONVERSIONS EXTENDED
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/conversions/:id ──
router.get('/conversions/:id', async (req, res) => {
  try {
    const conversion = await Conversion.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'ambassador',
          attributes: ['id', 'name', 'email', 'tier', 'referral_code'],
        },
        {
          model: User,
          as: 'sponsor',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: User,
          as: 'buyer',
          attributes: ['id', 'name', 'email', 'cashback_balance'],
        },
        {
          model: AffiliateProgram,
          as: 'program',
          attributes: ['id', 'name', 'display_name', 'network'],
        },
        {
          model: OutboundClick,
          as: 'click',
          attributes: [
            'id',
            'visitor_id',
            'destination_url',
            'sub_id_sent',
            'clicked_at',
          ],
        },
      ],
    });

    if (!conversion) {
      error(res, 'NOT_FOUND', 'Conversion introuvable', 404);
      return;
    }

    success(res, { conversion });
  } catch (err) {
    console.error('Admin conversion detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération de la conversion', 500);
  }
});

// ── PUT /api/admin/conversions/:id/attribute ──
router.put(
  '/conversions/:id/attribute',
  validate(attributeSchema),
  async (req, res) => {
    try {
      const { ambassador_id } = req.body as z.infer<typeof attributeSchema>;
      const conversionId = Number(req.params.id);

      // Verify conversion exists
      const conversion = await Conversion.findByPk(conversionId);
      if (!conversion) {
        error(res, 'NOT_FOUND', 'Conversion introuvable', 404);
        return;
      }

      // Verify new ambassador exists
      const newAmbassador = await User.findOne({
        where: { id: ambassador_id, role: 'ambassador' },
      });
      if (!newAmbassador) {
        error(res, 'NOT_FOUND', 'Ambassadeur introuvable', 404);
        return;
      }

      const oldData = {
        ambassador_id: conversion.ambassador_id,
        sponsor_id: conversion.sponsor_id,
        ambassador_share: conversion.ambassador_share,
        sponsor_share: conversion.sponsor_share,
        buyer_share: conversion.buyer_share,
        platform_share: conversion.platform_share,
      };

      // Recalculate shares with the new ambassador
      const shares = await calculateShares({
        ambassadorId: ambassador_id,
        affiliateProgramId: conversion.affiliate_program_id,
        amount: Number(conversion.amount),
        commissionTotal: Number(conversion.commission_total),
        type: conversion.type,
        productId: conversion.product_id,
      });

      // Find sponsor of new ambassador
      const sponsorId = newAmbassador.referred_by ?? null;

      await conversion.update({
        ambassador_id,
        sponsor_id: sponsorId,
        ambassador_share: shares.ambassadorShare,
        sponsor_share: shares.sponsorShare,
        buyer_share: shares.buyerShare,
        platform_share: shares.platformShare,
        applied_ambassador_rate: shares.appliedAmbassadorRate,
        applied_sponsor_rate: shares.appliedSponsorRate,
        applied_buyer_rate: shares.appliedBuyerRate,
        attribution_method: 'manual_admin',
        attribution_confidence: 'high',
      });

      const newData = {
        ambassador_id,
        sponsor_id: sponsorId,
        ambassador_share: shares.ambassadorShare,
        sponsor_share: shares.sponsorShare,
        buyer_share: shares.buyerShare,
        platform_share: shares.platformShare,
      };

      await AuditLog.create({
        admin_id: req.user!.userId,
        action: 'manual_attribution',
        entity_type: 'conversion',
        entity_id: String(conversionId),
        old_values: oldData,
        new_values: newData,
        ip_address: req.ip || null,
      });

      // Reload with includes for the response
      const updated = await Conversion.findByPk(conversionId, {
        include: [
          {
            model: User,
            as: 'ambassador',
            attributes: ['id', 'name', 'email'],
          },
          {
            model: AffiliateProgram,
            as: 'program',
            attributes: ['id', 'display_name'],
          },
        ],
      });

      success(res, { conversion: updated });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Admin manual attribution error:', err);

      if (message.includes('not found') || message.includes('introuvable')) {
        error(res, 'NOT_FOUND', message, 404);
        return;
      }

      if (message.includes('exceeds 100%')) {
        error(
          res,
          'INVALID_SHARES',
          'La distribution des commissions dépasse 100%',
          400,
        );
        return;
      }

      error(res, 'INTERNAL_ERROR', 'Erreur lors de l\'attribution manuelle', 500);
    }
  },
);

export default router;
