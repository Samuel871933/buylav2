import { Router } from 'express';
import { Op } from 'sequelize';
import { User, PasswordResetToken } from '@buyla/db';
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
import { sendEmail } from '../lib/email-service';
import { passwordReset as passwordResetTemplate } from '../lib/email-templates';

const router = Router();
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// ── POST /api/auth/register ──
router.post(
  '/register',
  registerLimiter,
  validate(registerSchema),
  async (req, res) => {
    try {
      const { email, password, firstname, lastname, referral_code } = req.body;

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
        firstname,
        lastname,
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
          firstname: user.firstname,
          lastname: user.lastname,
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
        onNewReferral(referredBy, `${user.firstname} ${user.lastname}`).catch(console.error);
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
          firstname: user.firstname,
          lastname: user.lastname,
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
        // Invalidate any existing tokens for this user
        await PasswordResetToken.destroy({
          where: { user_id: user.id },
        });

        const token = generateResetToken();
        const tokenHash = hashResetToken(token);

        // Store hashed token in DB with 1h expiry
        await PasswordResetToken.create({
          user_id: user.id,
          token_hash: tokenHash,
          expires_at: new Date(Date.now() + 60 * 60 * 1000),
        });

        // Send reset email
        const resetUrl = `${SITE_URL}/reinitialiser-mot-de-passe?token=${token}`;
        const name = user.firstname || user.email;
        const { subject, html } = passwordResetTemplate(name, resetUrl);
        sendEmail({ to: user.email, subject, html, userId: user.id, templateName: 'password_reset' }).catch(console.error);

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
    const resetData = await PasswordResetToken.findOne({
      where: {
        token_hash: tokenHash,
        used_at: null,
        expires_at: { [Op.gt]: new Date() },
      },
    });

    if (!resetData) {
      error(res, 'UNAUTHORIZED', 'Token invalide ou expiré', 401);
      return;
    }

    const passwordHash = await hashPassword(password);
    await User.update({ password_hash: passwordHash }, { where: { id: resetData.user_id } });

    // Mark token as used (single use)
    await resetData.update({ used_at: new Date() });

    success(res, { message: 'Mot de passe modifié avec succès.' });
  } catch (err) {
    console.error('Reset password error:', err);
    error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
  }
});

// ── POST /api/auth/google ──
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      error(res, 'VALIDATION_ERROR', 'Google credential requis', 400);
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      error(res, 'INTERNAL_ERROR', 'Google OAuth non configuré', 500);
      return;
    }

    // Verify Google ID token
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      error(res, 'UNAUTHORIZED', 'Token Google invalide', 401);
      return;
    }

    const { email, given_name, family_name, picture } = payload;

    // Find or create user
    let user = await User.findOne({ where: { email } });

    if (user && !user.is_active) {
      error(res, 'UNAUTHORIZED', 'Compte désactivé', 401);
      return;
    }

    if (!user) {
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

      user = await User.create({
        email,
        password_hash: null,
        firstname: given_name || '',
        lastname: family_name || '',
        role: 'buyer',
        referral_code: userReferralCode,
        avatar_url: picture || null,
      });

      // Fire-and-forget welcome email
      onBuyerRegistered(user.id).catch(console.error);
    }

    const jwtPayload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

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
        firstname: user.firstname,
        lastname: user.lastname,
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
    console.error('Google auth error:', err);
    error(res, 'UNAUTHORIZED', 'Authentification Google échouée', 401);
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
      firstname: user.firstname,
      lastname: user.lastname,
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
      const { firstname, lastname, email, password, avatar_url } = req.body;

      const updateData: Record<string, unknown> = {};
      if (firstname !== undefined) updateData.firstname = firstname;
      if (lastname !== undefined) updateData.lastname = lastname;
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
