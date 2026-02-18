'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { API_URL } from '@/lib/constants';

export default function ConnexionPage() {
  const t = useTranslations('auth');

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('buyla_token');
    const userRaw = localStorage.getItem('buyla_user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw);
        window.location.replace(user.role === 'admin' ? '/admin' : '/dashboard');
      } catch { /* ignore corrupt data */ }
    }
  }, []);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.email.trim()) errs.email = t('emailRequired');
    if (!form.password) errs.password = 'Mot de passe requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.message || t('invalidCredentials'));
        return;
      }

      // Store access token
      localStorage.setItem('buyla_token', data.data.access_token);
      localStorage.setItem('buyla_user', JSON.stringify(data.data.user));

      // Redirect based on role — use window.location for faster cross-layout navigation
      const role = data.data.user.role;
      window.location.href = role === 'admin' ? '/admin' : '/dashboard';
    } catch {
      setServerError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = useCallback(
    (data: { user: Record<string, unknown>; access_token: string }) => {
      localStorage.setItem('buyla_token', data.access_token);
      localStorage.setItem('buyla_user', JSON.stringify(data.user));
      const role = data.user.role as string;
      window.location.href = role === 'admin' ? '/admin' : '/dashboard';
    },
    [],
  );

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

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
          <h1 className="text-2xl font-bold text-gray-900">{t('loginTitle')}</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t('email')}
            type="email"
            placeholder="jean@exemple.fr"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            error={errors.email}
            autoComplete="email"
          />

          <div>
            <div className="relative">
              <Input
                label={t('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                error={errors.password}
                autoComplete="current-password"
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
            <div className="mt-1 text-right">
              <Link
                href="/mot-de-passe-oublie"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                {t('forgotPassword')}
              </Link>
            </div>
          </div>

          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {t('loginButton')}
          </Button>
        </form>

        <GoogleAuthButton
          text="signin_with"
          onSuccess={handleGoogleSuccess}
          onError={(msg) => setServerError(msg)}
        />

        {/* Link to register */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link href="/inscription" className="font-medium text-primary-600 hover:text-primary-700">
            {t('registerButton')}
          </Link>
        </p>
      </div>
    </div>
  );
}
