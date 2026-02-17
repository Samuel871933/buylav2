import { Router } from 'express';
import { Notification } from '@buyla/db';
import { success, error } from '../lib/api-response';
import { checkAuth } from '../middleware/auth.middleware';

const router = Router();

// All notification routes require authentication
router.use(checkAuth());

// ── GET /api/notifications ── List current user's notifications (paginated, recent first)
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    // Unread count
    const unreadCount = await Notification.count({
      where: { user_id: userId, is_read: false },
    });

    res.json({
      success: true,
      data: rows,
      unreadCount,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (err) {
    console.error('List notifications error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/notifications/read-all ── Mark all user's notifications as read
// NOTE: This route must be defined BEFORE /:id/read to avoid route collision
router.put('/read-all', async (req, res) => {
  try {
    const userId = req.user!.userId;

    await Notification.update(
      { is_read: true },
      { where: { user_id: userId, is_read: false } },
    );

    success(res, { message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (err) {
    console.error('Read all notifications error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/notifications/:id/read ── Mark a single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      error(res, 'VALIDATION_ERROR', 'ID de notification invalide', 400);
      return;
    }

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      error(res, 'NOT_FOUND', 'Notification introuvable', 404);
      return;
    }

    // Verify ownership
    if (notification.user_id !== userId) {
      error(res, 'FORBIDDEN', 'Accès interdit', 403);
      return;
    }

    await notification.update({ is_read: true });

    success(res, notification);
  } catch (err) {
    console.error('Read notification error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── DELETE /api/notifications/:id ── Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      error(res, 'VALIDATION_ERROR', 'ID de notification invalide', 400);
      return;
    }

    const notification = await Notification.findByPk(notificationId);

    if (!notification) {
      error(res, 'NOT_FOUND', 'Notification introuvable', 404);
      return;
    }

    // Verify ownership
    if (notification.user_id !== userId) {
      error(res, 'FORBIDDEN', 'Accès interdit', 403);
      return;
    }

    await notification.destroy();

    success(res, { message: 'Notification supprimée' });
  } catch (err) {
    console.error('Delete notification error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

export default router;
