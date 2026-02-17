import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '@buyla/shared';

export const loginLimiter = rateLimit({
  windowMs: RATE_LIMITS.login.windowMs,
  max: RATE_LIMITS.login.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans 15 minutes.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const registerLimiter = rateLimit({
  windowMs: RATE_LIMITS.register.windowMs,
  max: RATE_LIMITS.register.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans 1 heure.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: RATE_LIMITS.forgotPassword.windowMs,
  max: RATE_LIMITS.forgotPassword.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de tentatives. Réessayez dans 1 heure.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const trackingVisitLimiter = rateLimit({
  windowMs: RATE_LIMITS.trackingVisit.windowMs,
  max: RATE_LIMITS.trackingVisit.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de requêtes de tracking. Réessayez dans 1 minute.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const trackingClickLimiter = rateLimit({
  windowMs: RATE_LIMITS.trackingClick.windowMs,
  max: RATE_LIMITS.trackingClick.max,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Trop de requêtes de tracking. Réessayez dans 1 minute.' } },
  standardHeaders: true,
  legacyHeaders: false,
});
