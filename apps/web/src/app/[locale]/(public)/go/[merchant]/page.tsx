import { getTranslations } from 'next-intl/server';
import { Shield } from 'lucide-react';
import RedirectCountdown from './RedirectCountdown';

const API_URL = process.env.API_URL || 'http://localhost:4000';

interface PageProps {
  params: Promise<{ locale: string; merchant: string }>;
  searchParams: Promise<{ ref?: string; url?: string }>;
}

async function fetchPortalData(merchantSlug: string) {
  try {
    const res = await fetch(
      `${API_URL}/api/tracking/portal/${encodeURIComponent(merchantSlug)}`,
      { cache: 'no-store' },
    );

    if (!res.ok) return null;
    const json = await res.json();
    if (!json.success || !json.data) return null;

    const { portal, program } = json.data;
    return {
      merchant_name: portal.display_name,
      merchant_slug: portal.merchant_slug,
      merchant_logo: portal.logo_url,
      cashback_rate: program?.buyer_cashback_rate ?? null,
      program_id: program?.id ?? null,
    };
  } catch {
    return null;
  }
}

export default async function GoMerchantPage({ params, searchParams }: PageProps) {
  const { merchant } = await params;
  const { ref, url } = await searchParams;
  const t = await getTranslations('redirect');

  const portal = await fetchPortalData(merchant);

  // -----------------------------------------------------------------------
  // Error state: merchant not found
  // -----------------------------------------------------------------------
  if (!portal) {
    return (
      <section className="gradient-primary animate-gradient relative flex min-h-[80vh] items-center justify-center px-4 py-20">
        <div
          className="pointer-events-none absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="animate-fade-in relative z-10 w-full max-w-md">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-md">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20">
              <Shield className="h-10 w-10 text-white" />
            </div>

            <h1 className="mb-2 text-xl font-bold text-white">
              {t('errorTitle')}
            </h1>
            <p className="mb-6 text-white/80">{t('errorMessage')}</p>

            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary-600 shadow-lg transition hover:bg-gray-50 hover:shadow-xl active:scale-95"
            >
              {t('backHome')}
            </a>
          </div>
        </div>
      </section>
    );
  }

  // -----------------------------------------------------------------------
  // Happy path: show redirect countdown
  // -----------------------------------------------------------------------
  return (
    <RedirectCountdown
      portal={portal}
      ambassadorRef={ref}
      productUrl={url}
    />
  );
}
