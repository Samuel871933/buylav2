import type { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/mes-ventes',
          '/mes-filleuls',
          '/mes-gains',
          '/mes-liens',
          '/mon-cashback',
          '/classement',
          '/communaute',
          '/partager',
          '/profil',
          '/admin',
          '/api/',
          '/maintenance',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
