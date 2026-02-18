import { Router } from 'express';
import { z } from 'zod';
import { AffiliateProgram, RedirectPortal, User, Op } from '@buyla/db';
import { cleanProductUrl } from '@buyla/shared';
import { success, error } from '../lib/api-response';
import { validate } from '../middleware/validate.middleware';
import { checkAuth, checkRole } from '../middleware/auth.middleware';

const router = Router();

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

// ── Zod Schemas ──

const generateSchema = z.object({
  url: z.string().url('URL invalide'),
});

// ── POST /api/links/generate ──
router.post(
  '/generate',
  checkAuth(),
  checkRole('ambassador'),
  validate(generateSchema),
  async (req, res) => {
    try {
      const { url } = req.body;

      // 1. Parse URL and extract domain
      let domain: string;
      try {
        const parsed = new URL(url);
        domain = parsed.hostname;
      } catch {
        error(res, 'INVALID_URL', 'URL invalide', 400);
        return;
      }

      // 2. Find active AffiliateProgram where base_url contains the domain (case-insensitive)
      const program = await AffiliateProgram.findOne({
        where: {
          is_active: true,
          base_url: {
            [Op.like]: `%${domain}%`,
          },
        },
      });

      if (!program) {
        error(res, 'UNSUPPORTED_MERCHANT', 'Marchand non supporté', 400);
        return;
      }

      // 3. Clean the URL
      const cleanedUrl = cleanProductUrl(url, program.network);

      // 4. Get the ambassador's referral_code
      const ambassador = await User.findByPk(req.user!.userId, {
        attributes: ['referral_code'],
      });

      if (!ambassador) {
        error(res, 'USER_NOT_FOUND', 'Utilisateur introuvable', 404);
        return;
      }

      const referralCode = ambassador.referral_code;

      // 5. Find the redirect portal for this program
      const portal = await RedirectPortal.findOne({
        where: { affiliate_program_id: program.id },
      });

      if (!portal) {
        error(res, 'NO_PORTAL', 'Portail de redirection introuvable pour ce marchand', 400);
        return;
      }

      // 6. Generate the personal link
      const link = `${SITE_URL}/go/${portal.merchant_slug}?ref=${referralCode}&url=${encodeURIComponent(cleanedUrl)}`;

      // 7. Return result
      success(res, {
        generated_url: link,
        merchant_name: program.display_name,
        cashback_rate: program.buyer_cashback_rate,
        portal_slug: portal.merchant_slug,
      });
    } catch (err) {
      console.error('Link generation error:', err);
      error(res, 'INTERNAL_ERROR', 'Erreur interne', 500);
    }
  },
);

export default router;
