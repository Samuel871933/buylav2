import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  pathnames: {
    '/': '/',
    '/rejoindre': {
      fr: '/rejoindre',
      en: '/join',
    },
    '/connexion': {
      fr: '/connexion',
      en: '/login',
    },
    '/inscription': {
      fr: '/inscription',
      en: '/register',
    },
    '/mot-de-passe-oublie': {
      fr: '/mot-de-passe-oublie',
      en: '/forgot-password',
    },
    '/reinitialiser-mot-de-passe': {
      fr: '/reinitialiser-mot-de-passe',
      en: '/reset-password',
    },
    '/mon-cashback': {
      fr: '/mon-cashback',
      en: '/my-cashback',
    },
    '/contact': '/contact',
    '/faq': '/faq',
    '/mentions-legales': {
      fr: '/mentions-legales',
      en: '/legal-notice',
    },
    '/cgu': {
      fr: '/cgu',
      en: '/terms',
    },
    '/cgv': {
      fr: '/cgv',
      en: '/sales-terms',
    },
    '/confidentialite': {
      fr: '/confidentialite',
      en: '/privacy',
    },
    '/cookies': '/cookies',
    '/dashboard': '/dashboard',
    '/mes-liens': {
      fr: '/mes-liens',
      en: '/my-links',
    },
    '/mes-ventes': {
      fr: '/mes-ventes',
      en: '/my-sales',
    },
    '/mes-filleuls': {
      fr: '/mes-filleuls',
      en: '/my-referrals',
    },
    '/mes-gains': {
      fr: '/mes-gains',
      en: '/my-earnings',
    },
    '/classement': {
      fr: '/classement',
      en: '/leaderboard',
    },
    '/communaute': {
      fr: '/communaute',
      en: '/community',
    },
    '/partager': {
      fr: '/partager',
      en: '/share',
    },
    '/profil': {
      fr: '/profil',
      en: '/profile',
    },
    '/go/[merchant]': '/go/[merchant]',
  },
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
