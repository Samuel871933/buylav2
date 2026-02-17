'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShoppingBag, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/constants';

export default function InscriptionPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();

  const refCode = searchParams.get('ref') || '';

  const [form, setForm] = useState({
    name: '',
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
    if (!form.name.trim() || form.name.trim().length < 2) errs.name = 'Au moins 2 caractères';
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
          name: form.name.trim(),
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

      router.push('/dashboard');
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

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
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
          <Input
            label={t('name')}
            type="text"
            placeholder="Jean Dupont"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            error={errors.name}
            autoComplete="name"
          />

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
