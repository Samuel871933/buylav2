import { Router } from 'express';
import { User } from '@buyla/db';
import { registerSchema, loginSchema, forgotPasswordSchema, updateProfileSchema } from '@buyla/shared';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateReferralCode,
  generateResetToken,
  hashResetToken,
} from '../lib/auth';
import { success, error } from '../lib/api-response';
import { checkAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middleware/rate-limit.middleware';
import { onAmbassadorRegistered, onBuyerRegistered, onNewReferral } from '../lib/email-triggers';

const router = Router();

// Store reset tokens in memory for MVP (move to DB/Redis in production)
const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

// ── POST /api/auth/register ──
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  async (req, res) => {
    try {
      const { email, password, name, referral_code } = req.body;

      // Check if email already exists
      const existing = await User.findOne({ where: { email } });
      if (existing) {
        error(res, 'ALREADY_EXISTS', 'Cet email est déjà utilisé', 409);
        return;
      }

      // Find sponsor if referral_code provided
      let referredBy: string | null = null;
      if (referral_code) {
        const sponsor = await User.findOne({ where: { referral_code, is_active: true } });
        if (sponsor) {
          referredBy = sponsor.id;
        }
        // Silently ignore invalid referral codes (no different message for security)
      }

      // Generate unique referral code
      let userReferralCode = generateReferralCode();
      let attempts = 0;
      while (await User.findOne({ where: { referral_code: userReferralCode } })) {
        userReferralCode = generateReferralCode();
        attempts++;
        if (attempts > 10) {
          error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
          return;
        }
      }

      // Determine role: ambassador if registering from /rejoindre (sent via header or body)
      const isAmbassador = req.headers['x-register-as'] === 'ambassador';

      const passwordHash = await hashPassword(password);

      const user = await User.create({
        email,
        password_hash: passwordHash,
        name,
        role: isAmbassador ? 'ambassador' : 'buyer',
        referral_code: userReferralCode,
        referred_by: referredBy,
      });

      const payload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // Set refresh token as HttpOnly cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      success(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referral_code: user.referral_code,
          tier: user.tier,
        },
        access_token: accessToken,
      }, 201);

      // Fire-and-forget email triggers
      if (isAmbassador) {
        onAmbassadorRegistered(user.id).catch(console.error);
      } else {
        onBuyerRegistered(user.id).catch(console.error);
      }

      // Notify sponsor if referred
      if (referredBy) {
        onNewReferral(referredBy, user.name).catch(console.error);
      }
    } catch (err) {
      console.error('Register error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

// ── POST /api/auth/login ──
router.post(
  '/login',
  loginLimiter,
  validate(loginSchema),
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });

      if (!user || !user.password_hash) {
        error(res, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401);
        return;
      }

      if (!user.is_active) {
        error(res, 'UNAUTHORIZED', 'Compte désactivé', 401);
        return;
      }

      const isValid = await comparePassword(password, user.password_hash);
      if (!isValid) {
        error(res, 'INVALID_CREDENTIALS', 'Email ou mot de passe incorrect', 401);
        return;
      }

      const payload = { userId: user.id, email: user.email, role: user.role };
      const accessToken = generateAccessToken(payload);
      const refreshToken = generateRefreshToken(payload);

      // Set refresh token as HttpOnly cookie
      res.cookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/api/auth',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      success(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          referral_code: user.referral_code,
          tier: user.tier,
          cashback_balance: user.cashback_balance,
          total_sales: user.total_sales,
          avatar_url: user.avatar_url,
        },
        access_token: accessToken,
      });
    } catch (err) {
      console.error('Login error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

// ── POST /api/auth/forgot-password ──
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  async (req, res) => {
    try {
      const { email } = req.body;

      // Always return success (don't reveal if email exists)
      const user = await User.findOne({ where: { email } });

      if (user) {
        const token = generateResetToken();
        const tokenHash = hashResetToken(token);

        // Store hashed token with 1h expiry
        resetTokens.set(tokenHash, {
          userId: user.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        });

        // TODO: Send email with reset link via Resend
        // For now, log the token in dev
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[DEV] Reset token for ${email}: ${token}`);
        }
      }

      success(res, { message: 'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.' });
    } catch (err) {
      console.error('Forgot password error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

// ── POST /api/auth/reset-password ──
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      error(res, 'VALIDATION_ERROR', 'Token et mot de passe requis', 400);
      return;
    }

    const tokenHash = hashResetToken(token);
    const resetData = resetTokens.get(tokenHash);

    if (!resetData || resetData.expiresAt < new Date()) {
      resetTokens.delete(tokenHash);
      error(res, 'UNAUTHORIZED', 'Token invalide ou expiré', 401);
      return;
    }

    const passwordHash = await hashPassword(password);
    await User.update({ password_hash: passwordHash }, { where: { id: resetData.userId } });

    // Invalidate token (single use)
    resetTokens.delete(tokenHash);

    success(res, { message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error('Reset password error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── POST /api/auth/refresh ──
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.refresh_token;

    if (!refreshToken) {
      error(res, 'UNAUTHORIZED', 'Refresh token manquant', 401);
      return;
    }

    // Import here to avoid circular
    const { verifyToken } = await import('../lib/auth');
    const payload = verifyToken(refreshToken);

    // Verify user still active
    const user = await User.findByPk(payload.userId);
    if (!user || !user.is_active) {
      error(res, 'UNAUTHORIZED', 'Compte désactivé', 401);
      return;
    }

    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = generateAccessToken(newPayload);
    const newRefreshToken = generateRefreshToken(newPayload);

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    success(res, { access_token: newAccessToken });
  } catch {
    error(res, 'UNAUTHORIZED', 'Refresh token invalide', 401);
  }
});

// ── GET /api/auth/me ──
router.get('/me', checkAuth(), async (req, res) => {
  try {
    const user = await User.findByPk(req.user!.userId, {
      attributes: {
        exclude: ['password_hash'],
      },
    });

    if (!user) {
      error(res, 'NOT_FOUND', 'Utilisateur introuvable', 404);
      return;
    }

    success(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      referral_code: user.referral_code,
      tier: user.tier,
      total_sales: user.total_sales,
      cashback_balance: user.cashback_balance,
      avatar_url: user.avatar_url,
      locale: user.locale,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error('Get me error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── PUT /api/auth/me ──
router.put(
  '/me',
  checkAuth(),
  validate(updateProfileSchema),
  async (req, res) => {
    try {
      // Whitelist: only allow name, email, password, avatar_url
      const { name, email, password, avatar_url } = req.body;

      const updateData: Record<string, unknown> = {};
      if (name !== undefined) updateData.name = name;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

      if (email !== undefined) {
        const existing = await User.findOne({ where: { email } });
        if (existing && existing.id !== req.user!.userId) {
          error(res, 'ALREADY_EXISTS', 'Cet email est déjà utilisé', 409);
          return;
        }
        updateData.email = email;
      }

      if (password !== undefined) {
        updateData.password_hash = await hashPassword(password);
      }

      await User.update(updateData, { where: { id: req.user!.userId } });

      const user = await User.findByPk(req.user!.userId, {
        attributes: { exclude: ['password_hash'] },
      });

      success(res, user);
    } catch (err) {
      console.error('Update me error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

// ── POST /api/auth/logout ──
router.post('/logout', (_req, res) => {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
  success(res, { message: 'Déconnecté' });
});

export default router;
