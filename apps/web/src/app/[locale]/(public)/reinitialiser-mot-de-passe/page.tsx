'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, Eye, EyeOff, CheckCircle, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/constants';

export default function ReinitialiserMotDePassePage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.password.length < 8) errs.password = t('passwordMin');
    else if (!/[A-Z]/.test(form.password) || !/[0-9]/.test(form.password))
      errs.password = t('passwordRules');
    if (form.password !== form.confirmPassword) errs.confirmPassword = t('passwordMismatch');
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!token) {
      setServerError(t('resetInvalidToken'));
      return;
    }

    setLoading(true);
    setServerError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message || t('resetInvalidToken'));
        return;
      }

      setSuccess(true);
    } catch {
      setServerError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  // No token provided
  if (!token && !success) {
    return (
      <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
        <div className="relative w-full max-w-md text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h1 className="text-xl font-bold text-gray-900">{t('resetInvalidToken')}</h1>
          <Link
            href="/mot-de-passe-oublie"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            {t('forgotPasswordTitle')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100vh-8rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-accent-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary-400/10 blur-3xl" />
      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-primary-600">
            <ShoppingBag className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('resetPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('resetPasswordDesc')}</p>
        </div>

        {success ? (
          /* Success state */
          <div className="animate-fade-in rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm text-green-800">{t('resetSuccess')}</p>
            <Link
              href="/connexion"
              className="mt-4 inline-block rounded-lg bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary-600"
            >
              {t('loginButton')}
            </Link>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="relative">
                <Input
                  label={t('newPassword')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  error={errors.password}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[2.4rem] flex h-[2.5rem] items-center text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {!errors.password && (
                <p className="mt-1 text-xs text-gray-400">{t('passwordRules')}</p>
              )}
            </div>

            <Input
              label={t('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={(e) => updateField('confirmPassword', e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />

            {serverError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {t('resetButton')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
