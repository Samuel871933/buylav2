'use client';

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Shield, ExternalLink } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { API_URL } from '@/lib/constants';
const COUNTDOWN_SECONDS = 3;

interface PortalData {
  merchant_name: string;
  merchant_slug: string;
  merchant_logo?: string | null;
  cashback_rate?: number | null;
  program_id?: number | null;
}

interface RedirectCountdownProps {
  portal: PortalData;
  ambassadorRef?: string;
  productUrl?: string;
}

function getCookie(name: string): string | undefined {
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

export default function RedirectCountdown({
  portal,
  ambassadorRef,
  productUrl,
}: RedirectCountdownProps) {
  const t = useTranslations('redirect');
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const trackingCalled = useRef(false);

  // -----------------------------------------------------------------------
  // Fire tracking call once on mount → get redirect_url back
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (trackingCalled.current) return;
    trackingCalled.current = true;

    async function trackClick() {
      try {
        const visitorId = getCookie('visitor_id');
        const res = await fetch(`${API_URL}/api/tracking/click`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            visitor_id: visitorId || 'anonymous',
            ambassador_ref: ambassadorRef || '',
            program_id: portal.program_id,
            product_url: productUrl || undefined,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.redirect_url) {
            setRedirectUrl(json.data.redirect_url);
            return;
          }
        }
      } catch {
        // Ignore tracking errors
      }

      // Fallback: construct a basic redirect to the merchant's base URL
      setRedirectUrl(null);
    }

    trackClick();
  }, [ambassadorRef, portal.program_id, productUrl]);

  // -----------------------------------------------------------------------
  // Countdown + redirect
  // -----------------------------------------------------------------------
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Redirect when countdown reaches 0 AND we have the URL
  useEffect(() => {
    if (seconds === 0 && redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, [seconds, redirectUrl]);

  const handleRedirectNow = () => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  };

  return (
    <section className="gradient-primary animate-gradient relative flex min-h-[80vh] items-center justify-center px-4 py-20">
      {/* Decorative blurred circles */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-white/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="animate-fade-in relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center shadow-2xl backdrop-blur-md">
          {/* Merchant logo / initial */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
            {portal.merchant_logo ? (
              <Image
                src={portal.merchant_logo}
                alt={portal.merchant_name}
                width={80}
                height={80}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-3xl font-extrabold text-primary-600">
                {portal.merchant_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Heading */}
          <h1 className="mb-2 text-xl font-bold text-white">{t('heading')}</h1>
          <p className="mb-6 text-white/80">
            {t('message', { merchant: portal.merchant_name })}
          </p>

          {/* Cashback badge */}
          {portal.cashback_rate != null && portal.cashback_rate > 0 && (
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-primary-600">
                %
              </span>
              {t('cashbackLabel')}:{' '}
              {t('cashbackRate', { rate: String(portal.cashback_rate) })}
            </div>
          )}

          {/* Countdown spinner */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Spinner size="lg" className="text-white" />
            <p className="text-sm font-medium text-white/70">
              {t('countdown', { seconds: String(seconds) })}
            </p>
          </div>

          {/* Manual redirect CTA */}
          <button
            onClick={handleRedirectNow}
            disabled={!redirectUrl}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary-600 shadow-lg transition hover:bg-gray-50 hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            {t('redirectNow')}
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

        {/* Secured link note */}
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-white/60">
          <Shield className="h-3.5 w-3.5" />
          {t('securedBy')}
        </p>
      </div>
    </section>
  );
}
