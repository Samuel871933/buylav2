import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../lib/auth';
import { error } from '../lib/api-response';
import { User } from '@buyla/db';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { dbUser?: InstanceType<typeof User> };
    }
  }
}

/**
 * Verify JWT token from Authorization header.
 * Attaches user payload to req.user.
 */
export function checkAuth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      error(res, 'UNAUTHORIZED', 'Token manquant', 401);
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = verifyToken(token);

      // Verify user still exists and is active in DB
      const user = await User.findByPk(payload.userId, {
        attributes: ['id', 'email', 'role', 'is_active'],
      });

      if (!user || !user.is_active) {
        error(res, 'UNAUTHORIZED', 'Compte désactivé ou inexistant', 401);
        return;
      }

      // Double-check role from DB (in case JWT role is stale)
      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch {
      error(res, 'UNAUTHORIZED', 'Token invalide ou expiré', 401);
    }
  };
}

/**
 * Check that the authenticated user has the required role.
 * Must be used AFTER checkAuth().
 */
export function checkRole(...roles: Array<'admin' | 'ambassador' | 'buyer'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      error(res, 'UNAUTHORIZED', 'Non authentifié', 401);
      return;
    }

    if (!roles.includes(req.user.role)) {
      error(res, 'FORBIDDEN', 'Accès interdit', 403);
      return;
    }

    next();
  };
}
