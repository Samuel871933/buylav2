import { doubleCsrf } from 'csrf-csrf';
import type { Request } from 'express';

const CSRF_SECRET = process.env.JWT_SECRET || 'dev-csrf-secret';

// Routes that don't need CSRF protection (no existing session cookie)
const EXEMPT_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/health',
];

const EXEMPT_PREFIXES = [
  '/api/webhooks/',
  '/api/tracking/',
];

function isExempt(req: Request): boolean {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return true;
  }
  if (EXEMPT_PATHS.includes(req.path)) return true;
  if (EXEMPT_PREFIXES.some((p) => req.path.startsWith(p))) return true;
  // Requests with Bearer token are inherently CSRF-safe
  // (the browser cannot auto-attach Authorization headers cross-origin)
  if (req.headers.authorization?.startsWith('Bearer ')) return true;
  return false;
}

const { doubleCsrfProtection, generateToken } = doubleCsrf({
  getSecret: () => CSRF_SECRET,
  cookieName: '__csrf',
  cookieOptions: {
    httpOnly: false, // Must be readable by JS
    sameSite: 'strict',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'] as string,
});

export { generateToken };

export function csrfProtection(req: Request, res: Parameters<typeof doubleCsrfProtection>[1], next: Parameters<typeof doubleCsrfProtection>[2]) {
  if (isExempt(req)) {
    return next();
  }
  return doubleCsrfProtection(req, res, next);
}
