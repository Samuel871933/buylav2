'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ShoppingBag, ArrowLeft, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/constants';

export default function MotDePasseOubliePage() {
  const t = useTranslations('auth');

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError(t('emailRequired'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.message || 'Une erreur est survenue.');
      }
    } catch {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-primary-600">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('forgotPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('forgotPasswordDesc')}</p>
        </div>

        {sent ? (
          /* Success state */
          <div className="animate-fade-in rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm text-green-800">{t('resetLinkSent')}</p>
            <Link
              href="/connexion"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('backToLogin')}
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={t('email')}
              type="email"
              placeholder="jean@exemple.fr"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              error={error}
              autoComplete="email"
            />

            <Button type="submit" loading={loading} className="w-full">
              {t('sendResetLink')}
            </Button>

            <div className="text-center">
              <Link
                href="/connexion"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('backToLogin')}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
