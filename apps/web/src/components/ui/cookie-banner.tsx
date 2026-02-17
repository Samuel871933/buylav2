'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';

const COOKIE_CONSENT_KEY = 'buyla_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleRefuse = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'refused');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white px-4 py-4 shadow-lg sm:px-6 animate-slide-up">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            Ce site utilise des cookies pour le suivi des affiliations et l&apos;amélioration de votre expérience.
            En continuant, vous acceptez notre{' '}
            <NextLink href="/cookies" className="font-medium text-primary-600 underline hover:text-primary-700">
              politique de cookies
            </NextLink>.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={handleRefuse}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-600"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
