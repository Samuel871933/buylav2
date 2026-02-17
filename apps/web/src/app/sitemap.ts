import type { MetadataRoute } from 'next';

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

const locales = ['fr', 'en'];

// Public pages accessible to search engines
const publicPages = [
  '',           // home
  '/rejoindre',
  '/contact',
  '/faq',
  '/mentions-legales',
  '/cgu',
  '/cgv',
  '/confidentialite',
  '/cookies',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of publicPages) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'daily' : 'monthly',
        priority: page === '' ? 1.0 : page === '/rejoindre' ? 0.9 : 0.5,
      });
    }
  }

  return entries;
}
