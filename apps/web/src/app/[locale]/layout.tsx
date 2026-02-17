import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { ToastProvider } from '@/components/ui/toast';
import { CookieBanner } from '@/components/ui/cookie-banner';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Buyla — Affiliation & Cashback',
    template: '%s | Buyla',
  },
  description: "Plateforme d'affiliation et de cashback. Partagez vos produits préférés, gagnez des commissions, offrez du cashback.",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: SITE_URL,
    languages: {
      fr: `${SITE_URL}/fr`,
      en: `${SITE_URL}/en`,
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'Buyla',
    title: 'Buyla — Affiliation & Cashback',
    description: "Rejoignez notre réseau d'ambassadeurs et touchez des commissions sur chaque vente.",
    locale: 'fr_FR',
    alternateLocale: ['en_US'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Buyla — Affiliation & Cashback',
    description: "Plateforme d'affiliation et de cashback.",
  },
  icons: {
    icon: '/icon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-white font-sans">
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            {children}
            <CookieBanner />
          </ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
