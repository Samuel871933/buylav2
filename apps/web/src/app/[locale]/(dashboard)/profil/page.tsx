'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  CreditCard,
  Shield,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/lib/constants';

type TabKey = 'personal' | 'payment' | 'security';

interface UserProfile {
  name: string;
  email: string;
  avatar_url?: string;
}

interface PayoutInfo {
  method: string;
  iban?: string;
  bic?: string;
  holder_name?: string;
  bank_name?: string;
  country?: string;
  paypal_email?: string;
  is_verified?: boolean;
}

type PaymentMethod = 'bank_transfer' | 'paypal' | 'stripe';

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)buyla_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return typeof window !== 'undefined'
    ? localStorage.getItem('buyla_token')
    : null;
}

async function fetchAuth(path: string, options?: RequestInit) {
  const token = getAuthToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `API error: ${res.status}`);
  }
  return res.json();
}

function maskIban(iban: string): string {
  if (!iban || iban.length < 8) return iban || '';
  return iban.slice(0, 4) + ' **** **** ' + iban.slice(-4);
}

// ---------------------------------------------------------------------------
// Tab button component
// ---------------------------------------------------------------------------

function TabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-primary-50 text-primary-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div>
      <div className="flex flex-col gap-1">
        <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-1 h-4 w-56 animate-pulse rounded bg-gray-200" />
      </div>
      <div className="mt-8 h-12 w-full max-w-xs animate-pulse rounded-lg bg-gray-100" />
      <div className="mt-6 h-64 w-full animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfilPage() {
  // Tabs
  const [activeTab, setActiveTab] = useState<TabKey>('personal');

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Personal info edit
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState('');

  // Payout info state
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(true);

  // Payment form state
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('bank_transfer');
  const [paymentForm, setPaymentForm] = useState({
    iban: '',
    bic: '',
    holder_name: '',
    bank_name: '',
    country: 'FR',
    paypal_email: '',
  });
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Load profile
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const json = await fetchAuth('/api/ambassador/profile');
        if (cancelled) return;
        const data = json.data ?? json;
        setProfile(data);
        setEditName(data.name || '');
      } catch {
        // Profile may fail if not logged in
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load payout info
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const json = await fetchAuth('/api/payouts/info');
        if (cancelled) return;
        const data = json.data ?? json;
        if (data && data.method) {
          setPayoutInfo(data);
          setPaymentMethod(data.method as PaymentMethod);
          setPaymentForm({
            iban: data.iban || '',
            bic: data.bic || '',
            holder_name: data.holder_name || '',
            bank_name: data.bank_name || '',
            country: data.country || 'FR',
            paypal_email: data.paypal_email || '',
          });
        }
      } catch {
        // No payout info
      } finally {
        if (!cancelled) setPayoutLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Save name
  const handleSaveName = useCallback(async () => {
    if (!editName.trim()) {
      setNameError('Le nom est requis.');
      return;
    }
    setSavingName(true);
    setNameError('');
    setNameSuccess(false);
    try {
      await fetchAuth('/api/ambassador/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: editName.trim() }),
      });
      setProfile((prev) =>
        prev ? { ...prev, name: editName.trim() } : prev,
      );
      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setNameError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la mise a jour.',
      );
    } finally {
      setSavingName(false);
    }
  }, [editName]);

  // Save payout info
  const handleSavePayment = useCallback(async () => {
    setPaymentError('');
    setPaymentSuccess(false);

    // Validation
    if (paymentMethod === 'bank_transfer') {
      if (!paymentForm.iban.trim()) {
        setPaymentError("L'IBAN est requis.");
        return;
      }
      if (!paymentForm.holder_name.trim()) {
        setPaymentError('Le nom du titulaire est requis.');
        return;
      }
    }
    if (paymentMethod === 'paypal') {
      if (!paymentForm.paypal_email.trim()) {
        setPaymentError("L'email PayPal est requis.");
        return;
      }
    }

    setSavingPayment(true);
    try {
      const body: Record<string, string> = { method: paymentMethod };
      if (paymentMethod === 'bank_transfer') {
        body.iban = paymentForm.iban.trim();
        body.bic = paymentForm.bic.trim();
        body.holder_name = paymentForm.holder_name.trim();
        body.bank_name = paymentForm.bank_name.trim();
        body.country = paymentForm.country.trim();
      } else if (paymentMethod === 'paypal') {
        body.paypal_email = paymentForm.paypal_email.trim();
      }

      await fetchAuth('/api/payouts/info', {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      // Refresh payout info
      const json = await fetchAuth('/api/payouts/info');
      const data = json.data ?? json;
      if (data && data.method) {
        setPayoutInfo(data);
      }

      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 3000);
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.',
      );
    } finally {
      setSavingPayment(false);
    }
  }, [paymentMethod, paymentForm]);

  // Change password
  const handleChangePassword = useCallback(async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    if (!currentPassword) {
      setPasswordError('Le mot de passe actuel est requis.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(
        'Le nouveau mot de passe doit contenir au moins 8 caracteres.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSavingPassword(true);
    try {
      await fetchAuth('/api/ambassador/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du changement de mot de passe.',
      );
    } finally {
      setSavingPassword(false);
    }
  }, [currentPassword, newPassword, confirmPassword]);

  // ---- Loading ----
  if (profileLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Mon profil"
        description="Gérez vos informations personnelles et de paiement"
      />

      {/* ---- Tabs ---- */}
      <div className="mt-8 flex flex-wrap gap-2">
        <TabButton
          active={activeTab === 'personal'}
          icon={<User className="h-4 w-4" />}
          label="Informations personnelles"
          onClick={() => setActiveTab('personal')}
        />
        <TabButton
          active={activeTab === 'payment'}
          icon={<CreditCard className="h-4 w-4" />}
          label="Paiement"
          onClick={() => setActiveTab('payment')}
        />
        <TabButton
          active={activeTab === 'security'}
          icon={<Shield className="h-4 w-4" />}
          label="Securite"
          onClick={() => setActiveTab('security')}
        />
      </div>

      {/* ---- Tab 1: Personal Info ---- */}
      {activeTab === 'personal' && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Informations personnelles
          </h2>

          {/* Avatar placeholder */}
          <div className="mt-6 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white">
              <span className="text-2xl font-bold">
                {(profile?.name || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {profile?.name}
              </p>
              <p className="text-sm text-gray-500">{profile?.email}</p>
            </div>
          </div>

          <div className="mt-6 max-w-md space-y-4">
            <Input
              label="Nom"
              value={editName}
              onChange={(e) => {
                setEditName(e.target.value);
                setNameError('');
                setNameSuccess(false);
              }}
              placeholder="Votre nom"
            />

            <Input
              label="Email"
              value={profile?.email || ''}
              disabled
              readOnly
            />

            {nameError && (
              <p className="text-sm text-red-600">{nameError}</p>
            )}
            {nameSuccess && (
              <p className="text-sm text-green-600">
                Nom mis a jour avec succes.
              </p>
            )}

            <Button
              size="sm"
              loading={savingName}
              onClick={handleSaveName}
              disabled={editName.trim() === profile?.name}
            >
              Enregistrer
            </Button>
          </div>
        </Card>
      )}

      {/* ---- Tab 2: Payment ---- */}
      {activeTab === 'payment' && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Informations de paiement
            </h2>
            {payoutInfo?.is_verified && (
              <Badge variant="success" size="sm">
                <CheckCircle className="mr-1 h-3 w-3" />
                Verifie
              </Badge>
            )}
          </div>

          {payoutLoading ? (
            <div className="mt-6 space-y-4">
              <div className="h-10 w-full max-w-sm animate-pulse rounded bg-gray-100" />
              <div className="h-10 w-full max-w-sm animate-pulse rounded bg-gray-100" />
            </div>
          ) : (
            <>
              {/* Current info display */}
              {payoutInfo && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Methode actuelle
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {payoutInfo.method === 'bank_transfer' && (
                      <>
                        Virement bancaire &mdash;{' '}
                        {maskIban(payoutInfo.iban || '')}
                        {payoutInfo.holder_name && (
                          <span className="ml-2 text-gray-500">
                            ({payoutInfo.holder_name})
                          </span>
                        )}
                      </>
                    )}
                    {payoutInfo.method === 'paypal' && (
                      <>PayPal &mdash; {payoutInfo.paypal_email}</>
                    )}
                  </p>
                </div>
              )}

              {/* Method selection */}
              <div className="mt-6">
                <p className="mb-3 text-sm font-medium text-gray-700">
                  Methode de paiement
                </p>
                <div className="flex flex-wrap gap-3">
                  {/* Bank Transfer */}
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={() => setPaymentMethod('bank_transfer')}
                      className="sr-only"
                    />
                    <CreditCard className="h-4 w-4" />
                    Virement IBAN
                  </label>

                  {/* PayPal */}
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
                      paymentMethod === 'paypal'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment_method"
                      value="paypal"
                      checked={paymentMethod === 'paypal'}
                      onChange={() => setPaymentMethod('paypal')}
                      className="sr-only"
                    />
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z" />
                    </svg>
                    PayPal
                  </label>

                  {/* Stripe (coming soon) */}
                  <label className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400">
                    <input
                      type="radio"
                      name="payment_method"
                      value="stripe"
                      disabled
                      className="sr-only"
                    />
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-7.076-2.19l-.897 5.555C5.014 22.77 7.86 24 11.484 24c2.632 0 4.76-.653 6.29-1.93 1.656-1.37 2.468-3.38 2.468-5.731 0-4.147-2.518-5.826-6.266-7.189z" />
                    </svg>
                    Stripe Connect
                    <Badge variant="default" size="sm">
                      Bientot
                    </Badge>
                  </label>
                </div>
              </div>

              {/* Conditional form: Bank Transfer */}
              {paymentMethod === 'bank_transfer' && (
                <div className="mt-6 grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      label="IBAN"
                      value={paymentForm.iban}
                      onChange={(e) =>
                        setPaymentForm((f) => ({
                          ...f,
                          iban: e.target.value,
                        }))
                      }
                      placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    />
                  </div>
                  <Input
                    label="BIC"
                    value={paymentForm.bic}
                    onChange={(e) =>
                      setPaymentForm((f) => ({ ...f, bic: e.target.value }))
                    }
                    placeholder="BNPAFRPP"
                  />
                  <Input
                    label="Nom du titulaire"
                    value={paymentForm.holder_name}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        holder_name: e.target.value,
                      }))
                    }
                    placeholder="Jean Dupont"
                  />
                  <Input
                    label="Banque"
                    value={paymentForm.bank_name}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        bank_name: e.target.value,
                      }))
                    }
                    placeholder="BNP Paribas"
                  />
                  <Input
                    label="Pays"
                    value={paymentForm.country}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        country: e.target.value,
                      }))
                    }
                    placeholder="FR"
                  />
                </div>
              )}

              {/* Conditional form: PayPal */}
              {paymentMethod === 'paypal' && (
                <div className="mt-6 max-w-lg">
                  <Input
                    label="Email PayPal"
                    type="email"
                    value={paymentForm.paypal_email}
                    onChange={(e) =>
                      setPaymentForm((f) => ({
                        ...f,
                        paypal_email: e.target.value,
                      }))
                    }
                    placeholder="votre@email.com"
                  />
                </div>
              )}

              {/* Stripe message */}
              {paymentMethod === 'stripe' && (
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 text-center">
                  <p className="text-sm text-gray-500">
                    Stripe Connect sera bientot disponible. En attendant,
                    veuillez utiliser le virement bancaire ou PayPal.
                  </p>
                </div>
              )}

              {paymentError && (
                <p className="mt-4 text-sm text-red-600">{paymentError}</p>
              )}
              {paymentSuccess && (
                <p className="mt-4 text-sm text-green-600">
                  Informations de paiement sauvegardees avec succes.
                </p>
              )}

              {paymentMethod !== 'stripe' && (
                <div className="mt-6">
                  <Button
                    size="sm"
                    loading={savingPayment}
                    onClick={handleSavePayment}
                  >
                    Enregistrer
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ---- Tab 3: Security ---- */}
      {activeTab === 'security' && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Changer le mot de passe
          </h2>

          <div className="mt-6 max-w-md space-y-4">
            {/* Current password */}
            <div className="relative">
              <Input
                label="Mot de passe actuel"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setPasswordError('');
                  setPasswordSuccess(false);
                }}
                placeholder="Votre mot de passe actuel"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label="Toggle password visibility"
              >
                {showCurrentPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* New password */}
            <div className="relative">
              <Input
                label="Nouveau mot de passe"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError('');
                  setPasswordSuccess(false);
                }}
                placeholder="Minimum 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                aria-label="Toggle password visibility"
              >
                {showNewPw ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Confirm password */}
            <Input
              label="Confirmer le mot de passe"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError('');
                setPasswordSuccess(false);
              }}
              placeholder="Repetez le nouveau mot de passe"
            />

            {passwordError && (
              <p className="text-sm text-red-600">{passwordError}</p>
            )}
            {passwordSuccess && (
              <p className="text-sm text-green-600">
                Mot de passe change avec succes.
              </p>
            )}

            <Button
              size="sm"
              loading={savingPassword}
              onClick={handleChangePassword}
              disabled={!currentPassword || !newPassword || !confirmPassword}
            >
              Changer le mot de passe
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
