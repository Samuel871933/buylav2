import { Router } from 'express';
import { z } from 'zod';
import {
  Setting,
  AuditLog,
  Dispute,
  FraudFlag,
  User,
  Conversion,
  EmailLog,
  AffiliateProgram,
  OutboundClick,
  Op,
  Sequelize,
} from '@buyla/db';
import { success, paginated, error } from '../lib/api-response';
import { checkAuth, checkRole } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateSetting } from '../lib/settings';
import { sendEmail } from '../lib/email-service';
import * as emailTemplates from '../lib/email-templates';
import type { WeeklyRecapStats } from '../lib/email-templates';

const router = Router();

// All routes require auth + admin role
router.use(checkAuth(), checkRole('admin'));

// ════════════════════════════════════════════════════════════════════════════
//  VALIDATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

const updateSettingSchema = z.object({
  value: z.string({ required_error: 'La valeur est requise' }),
});

const updateDisputeSchema = z.object({
  status: z.enum(['open', 'investigating', 'resolved', 'rejected'], {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
  resolution_notes: z.string().nullable().optional(),
}).refine(
  (data) => {
    if (data.status === 'resolved' || data.status === 'rejected') {
      return !!data.resolution_notes && data.resolution_notes.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Les notes de résolution sont requises pour les statuts résolu ou rejeté',
    path: ['resolution_notes'],
  },
);

const updateFraudFlagSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'confirmed', 'dismissed'], {
    errorMap: () => ({ message: 'Statut invalide' }),
  }),
  admin_notes: z.string().nullable().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
//  1. SETTINGS MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/settings ──
router.get('/settings', async (_req, res) => {
  try {
    const settings = await Setting.findAll({
      order: [['category', 'ASC'], ['key', 'ASC']],
    });

    // Group by category
    const grouped: Record<string, typeof settings> = {};
    for (const setting of settings) {
      const cat = setting.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(setting);
    }

    success(res, { settings, grouped });
  } catch (err) {
    console.error('Admin settings list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des paramètres', 500);
  }
});

// ── GET /api/admin/settings/:key ──
router.get('/settings/:key', async (req, res) => {
  try {
    const setting = await Setting.findOne({ where: { key: req.params.key } });

    if (!setting) {
      error(res, 'NOT_FOUND', 'Paramètre introuvable', 404);
      return;
    }

    success(res, { setting });
  } catch (err) {
    console.error('Admin setting detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération du paramètre', 500);
  }
});

// ── PUT /api/admin/settings/:key ──
router.put('/settings/:key', validate(updateSettingSchema), async (req, res) => {
  try {
    const { value } = req.body as z.infer<typeof updateSettingSchema>;
    const key = req.params.key;

    const setting = await Setting.findOne({ where: { key } });
    if (!setting) {
      error(res, 'NOT_FOUND', 'Paramètre introuvable', 404);
      return;
    }

    // updateSetting handles audit logging + cache invalidation
    await updateSetting(key, value, req.user!.userId);

    // Reload to return updated value
    await setting.reload();

    success(res, { setting });
  } catch (err) {
    console.error('Admin update setting error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour du paramètre', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  2. AUDIT LOGS
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/audit-logs ──
router.get('/audit-logs', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const action = req.query.action as string | undefined;
    const entity_type = req.query.entity_type as string | undefined;
    const admin_id = req.query.admin_id as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};

    if (action) {
      where.action = action;
    }

    if (entity_type) {
      where.entity_type = entity_type;
    }

    if (admin_id) {
      where.admin_id = admin_id;
    }

    // Date range filter
    if (from || to) {
      const dateFilter: Record<symbol, unknown> = {};
      if (from) dateFilter[Op.gte] = new Date(from);
      if (to) dateFilter[Op.lte] = new Date(to);
      where.created_at = dateFilter;
    }

    // Search in entity_id or action
    if (search) {
      where[Op.or as unknown as string] = [
        { entity_id: { [Op.like]: `%${search}%` } },
        { action: { [Op.like]: `%${search}%` } },
      ];
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'firstname', 'lastname', 'email'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin audit-logs list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des logs d\'audit', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  3. DISPUTES / LITIGES
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/disputes ──
router.get('/disputes', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};

    if (status && ['open', 'investigating', 'resolved', 'rejected'].includes(status)) {
      where.status = status;
    }

    const { count, rows } = await Dispute.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email'],
          required: false,
        },
        {
          model: Conversion,
          as: 'conversion',
          attributes: ['id', 'amount', 'status', 'order_ref', 'created_at'],
          required: false,
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin disputes list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des litiges', 500);
  }
});

// ── GET /api/admin/disputes/:id ──
router.get('/disputes/:id', async (req, res) => {
  try {
    const dispute = await Dispute.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email', 'role'],
          required: false,
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'firstname', 'lastname', 'email'],
          required: false,
        },
        {
          model: Conversion,
          as: 'conversion',
          attributes: [
            'id', 'amount', 'commission_total', 'status', 'order_ref',
            'ambassador_share', 'sponsor_share', 'buyer_share', 'platform_share',
            'created_at',
          ],
          include: [
            {
              model: User,
              as: 'ambassador',
              attributes: ['id', 'firstname', 'lastname', 'email'],
              required: false,
            },
            {
              model: AffiliateProgram,
              as: 'program',
              attributes: ['id', 'display_name', 'network'],
              required: false,
            },
          ],
          required: false,
        },
      ],
    });

    if (!dispute) {
      error(res, 'NOT_FOUND', 'Litige introuvable', 404);
      return;
    }

    success(res, { dispute });
  } catch (err) {
    console.error('Admin dispute detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération du litige', 500);
  }
});

// ── PUT /api/admin/disputes/:id ──
router.put('/disputes/:id', validate(updateDisputeSchema), async (req, res) => {
  try {
    const dispute = await Dispute.findByPk(req.params.id);
    if (!dispute) {
      error(res, 'NOT_FOUND', 'Litige introuvable', 404);
      return;
    }

    const data = req.body as z.infer<typeof updateDisputeSchema>;
    const oldData = {
      status: dispute.status,
      resolution_notes: dispute.resolution_notes,
      admin_id: dispute.admin_id,
      resolved_at: dispute.resolved_at,
    };

    const updateData: Record<string, unknown> = {
      status: data.status,
      admin_id: req.user!.userId,
    };

    if (data.resolution_notes !== undefined) {
      updateData.resolution_notes = data.resolution_notes;
    }

    // Set resolved_at when resolving or rejecting
    if (data.status === 'resolved' || data.status === 'rejected') {
      updateData.resolved_at = new Date();
    }

    await dispute.update(updateData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'update',
      entity_type: 'dispute',
      entity_id: String(dispute.id),
      old_values: oldData,
      new_values: updateData,
      ip_address: req.ip || null,
    });

    // Reload with associations for the response
    const updated = await Dispute.findByPk(dispute.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email'],
          required: false,
        },
        {
          model: Conversion,
          as: 'conversion',
          attributes: ['id', 'amount', 'status', 'order_ref'],
          required: false,
        },
      ],
    });

    success(res, { dispute: updated });
  } catch (err) {
    console.error('Admin update dispute error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour du litige', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  4. FRAUD FLAGS
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/fraud-flags ──
router.get('/fraud-flags', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const severity = req.query.severity as string | undefined;

    const where: Record<string, unknown> = {};

    if (status && ['pending', 'reviewed', 'confirmed', 'dismissed'].includes(status)) {
      where.status = status;
    }

    if (severity && ['low', 'medium', 'high', 'critical'].includes(severity)) {
      where.severity = severity;
    }

    const { count, rows } = await FraudFlag.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email', 'role', 'is_active'],
          required: false,
        },
      ],
      order: [
        // pending first
        [Sequelize.literal("CASE WHEN `FraudFlag`.`status` = 'pending' THEN 0 ELSE 1 END"), 'ASC'],
        ['created_at', 'DESC'],
      ],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin fraud-flags list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des alertes de fraude', 500);
  }
});

// ── GET /api/admin/fraud-flags/:id ──
router.get('/fraud-flags/:id', async (req, res) => {
  try {
    const flag = await FraudFlag.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email', 'role', 'is_active', 'tier', 'created_at'],
          required: false,
        },
      ],
    });

    if (!flag) {
      error(res, 'NOT_FOUND', 'Alerte de fraude introuvable', 404);
      return;
    }

    success(res, { flag });
  } catch (err) {
    console.error('Admin fraud-flag detail error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération de l\'alerte de fraude', 500);
  }
});

// ── PUT /api/admin/fraud-flags/:id ──
router.put('/fraud-flags/:id', validate(updateFraudFlagSchema), async (req, res) => {
  try {
    const flag = await FraudFlag.findByPk(req.params.id);
    if (!flag) {
      error(res, 'NOT_FOUND', 'Alerte de fraude introuvable', 404);
      return;
    }

    const data = req.body as z.infer<typeof updateFraudFlagSchema>;
    const oldData = {
      status: flag.status,
      admin_notes: flag.admin_notes,
      reviewed_at: flag.reviewed_at,
    };

    const updateData: Record<string, unknown> = {
      status: data.status,
      reviewed_at: new Date(),
    };

    if (data.admin_notes !== undefined) {
      updateData.admin_notes = data.admin_notes;
    }

    await flag.update(updateData);

    await AuditLog.create({
      admin_id: req.user!.userId,
      action: 'review',
      entity_type: 'fraud_flag',
      entity_id: String(flag.id),
      old_values: oldData,
      new_values: updateData,
      ip_address: req.ip || null,
    });

    // Auto-deactivate user on confirmed + high/critical severity
    if (
      data.status === 'confirmed' &&
      (flag.severity === 'high' || flag.severity === 'critical')
    ) {
      const user = await User.findByPk(flag.user_id);
      if (user && user.is_active) {
        const userOldData = { is_active: user.is_active };
        await user.update({ is_active: false });

        await AuditLog.create({
          admin_id: req.user!.userId,
          action: 'auto_deactivate',
          entity_type: 'user',
          entity_id: user.id,
          old_values: userOldData,
          new_values: { is_active: false, reason: `Fraude confirmée (flag #${flag.id}, sévérité: ${flag.severity})` },
          ip_address: req.ip || null,
        });
      }
    }

    // Reload with user info
    const updated = await FraudFlag.findByPk(flag.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email', 'role', 'is_active'],
          required: false,
        },
      ],
    });

    success(res, { flag: updated });
  } catch (err) {
    console.error('Admin update fraud-flag error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la mise à jour de l\'alerte de fraude', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  5. EMAIL LOGS
// ════════════════════════════════════════════════════════════════════════════

// ── GET /api/admin/emails ──
router.get('/emails', async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const status = req.query.status as string | undefined;
    const template_name = (req.query.template_name || req.query.template) as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const where: Record<string, unknown> = {};

    if (status && ['sent', 'failed', 'bounced'].includes(status)) {
      where.status = status;
    }

    if (template_name) {
      where.template_name = template_name;
    }

    // Date range filter on sent_at
    if (from || to) {
      const dateFilter: Record<symbol, unknown> = {};
      if (from) dateFilter[Op.gte] = new Date(from);
      if (to) dateFilter[Op.lte] = new Date(to);
      where.sent_at = dateFilter;
    }

    const { count, rows } = await EmailLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstname', 'lastname', 'email'],
          required: false,
        },
      ],
      order: [['sent_at', 'DESC']],
      limit,
      offset,
    });

    paginated(res, rows, { page, limit, total: count });
  } catch (err) {
    console.error('Admin email logs list error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de la récupération des logs email', 500);
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  6. WEEKLY RECAP (admin-triggered)
// ════════════════════════════════════════════════════════════════════════════

// ── POST /api/admin/send-weekly-recap ──
router.post('/send-weekly-recap', async (_req, res) => {
  try {
    // Find all active ambassadors
    const ambassadors = await User.findAll({
      where: { role: 'ambassador', is_active: true },
      attributes: ['id', 'firstname', 'lastname', 'email'],
    });

    if (ambassadors.length === 0) {
      success(res, { sent: 0, message: 'Aucun ambassadeur actif trouvé.' });
      return;
    }

    // Date range: last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    let sentCount = 0;
    let failedCount = 0;

    for (const ambassador of ambassadors) {
      try {
        // Get weekly stats for this ambassador
        const salesResult = await Conversion.findOne({
          attributes: [
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
            [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'revenue'],
            [Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('ambassador_share')), 0), 'commission'],
          ],
          where: {
            ambassador_id: ambassador.id,
            created_at: { [Op.gte]: weekAgo },
          },
          raw: true,
        }) as any;

        const clicksCount = await OutboundClick.count({
          where: {
            ambassador_id: ambassador.id,
            clicked_at: { [Op.gte]: weekAgo },
          },
        });

        // Simple rank: count ambassadors with more sales this week
        const mySalesCount = Number(salesResult?.count ?? 0);
        const rankData = await Conversion.findAll({
          attributes: [
            'ambassador_id',
            [Sequelize.fn('COUNT', Sequelize.col('Conversion.id')), 'sale_count'],
          ],
          where: {
            created_at: { [Op.gte]: weekAgo },
          },
          group: ['ambassador_id'],
          raw: true,
        }) as any[];

        const betterThanMe = rankData.filter(
          (r: any) => Number(r.sale_count) > mySalesCount,
        ).length;
        const rank = betterThanMe + 1;

        const stats: WeeklyRecapStats = {
          sales: Number(salesResult?.count ?? 0),
          revenue: Number(salesResult?.revenue ?? 0),
          commission: Number(salesResult?.commission ?? 0),
          clicks: clicksCount,
          rank,
        };

        const { subject, html } = emailTemplates.weeklyRecap(`${ambassador.firstname} ${ambassador.lastname}`.trim(), stats);
        await sendEmail({
          to: ambassador.email,
          subject,
          html,
          userId: ambassador.id,
          templateName: 'weekly_recap',
        });

        sentCount++;
      } catch (err) {
        console.error(`Weekly recap email failed for ${ambassador.email}:`, err);
        failedCount++;
      }
    }

    success(res, {
      sent: sentCount,
      failed: failedCount,
      total: ambassadors.length,
    });
  } catch (err) {
    console.error('Send weekly recap error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur lors de l\'envoi du récap hebdomadaire', 500);
  }
});

export default router;
