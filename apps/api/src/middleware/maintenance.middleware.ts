import type { Request, Response, NextFunction } from 'express';
import { getSetting } from '../lib/settings';

/**
 * Maintenance mode middleware.
 * Checks the `maintenance_mode` setting and returns 503 if active.
 * Skips for admin routes and health check.
 */
export async function checkMaintenance(req: Request, res: Response, next: NextFunction) {
  // Always allow health check and admin routes
  if (
    req.path === '/api/health' ||
    req.path.startsWith('/api/admin') ||
    req.path.startsWith('/api/auth')
  ) {
    return next();
  }

  try {
    const isMaintenanceMode = await getSetting('maintenance_mode');
    if (isMaintenanceMode === 'true' || isMaintenanceMode === '1') {
      const message = await getSetting('maintenance_message') || 'Le site est en maintenance. Veuillez réessayer plus tard.';
      res.status(503).json({
        success: false,
        error: {
          code: 'MAINTENANCE',
          message,
        },
      });
      return;
    }
  } catch {
    // If settings check fails, don't block — continue normally
  }

  next();
}
