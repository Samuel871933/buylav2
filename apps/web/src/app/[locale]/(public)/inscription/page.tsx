'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoogleAuthButton } from '@/components/auth/google-auth-button';
import { API_URL } from '@/lib/constants';

export default function InscriptionPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();

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

  const refCode = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
    referral_code: refCode,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstname.trim() || form.firstname.trim().length < 2) errs.firstname = 'Au moins 2 caractères';
    if (!form.lastname.trim() || form.lastname.trim().length < 2) errs.lastname = 'Au moins 2 caractères';
    if (!form.email.trim()) errs.email = t('emailRequired');
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

    setLoading(true);
    setServerError('');

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Register-As': 'ambassador',
        },
        credentials: 'include',
        body: JSON.stringify({
          firstname: form.firstname.trim(),
          lastname: form.lastname.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          referral_code: form.referral_code || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'ALREADY_EXISTS') {
          setServerError(t('alreadyExists'));
        } else if (data.message) {
          setServerError(data.message);
        } else {
          setServerError('Une erreur est survenue.');
        }
        return;
      }

      localStorage.setItem('buyla_token', data.data.access_token);
      localStorage.setItem('buyla_user', JSON.stringify(data.data.user));

      window.location.href = '/dashboard';
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
      window.location.href = '/dashboard';
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
          <h1 className="text-2xl font-bold text-gray-900">{t('registerTitle')}</h1>
          <p className="mt-2 text-sm text-gray-500">
            Rejoignez le programme ambassadeur Buyla
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('firstname')}
              type="text"
              placeholder="Jean"
              value={form.firstname}
              onChange={(e) => updateField('firstname', e.target.value)}
              error={errors.firstname}
              autoComplete="given-name"
            />
            <Input
              label={t('lastname')}
              type="text"
              placeholder="Dupont"
              value={form.lastname}
              onChange={(e) => updateField('lastname', e.target.value)}
              error={errors.lastname}
              autoComplete="family-name"
            />
          </div>

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

          <Input
            label={t('referralCode')}
            type="text"
            placeholder="ABC12345"
            value={form.referral_code}
            onChange={(e) => updateField('referral_code', e.target.value.toUpperCase())}
            autoComplete="off"
          />

          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {serverError}
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full">
            {t('registerButton')}
          </Button>
        </form>

        <GoogleAuthButton
          text="signup_with"
          onSuccess={handleGoogleSuccess}
          onError={(msg) => setServerError(msg)}
        />

        {/* Link to login */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t('hasAccount')}{' '}
          <Link href="/connexion" className="font-medium text-primary-600 hover:text-primary-700">
            {t('loginButton')}
          </Link>
        </p>
      </div>
    </div>
  );
}
