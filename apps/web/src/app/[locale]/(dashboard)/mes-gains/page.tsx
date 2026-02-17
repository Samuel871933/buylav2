'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Clock,
  CreditCard,
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { API_URL } from '@/lib/constants';

interface Earnings {
  available: number;
  pending: number;
  total_paid: number;
  total_sponsor: number;
}

interface TierProgressData {
  currentTier: { name: string; min_sales: number; ambassador_rate_affiliate: number } | null;
  nextTier: { name: string; min_sales: number; ambassador_rate_affiliate: number } | null;
  total_sales: number;
  progress: number;
  salesNeeded: number;
  allTiers: Array<{ name: string; min_sales: number; rate: number }>;
}

interface PayoutInfo {
  method: string;
  iban?: string;
  paypal_email?: string;
  holder_name?: string;
  bank_name?: string;
  is_verified?: boolean;
}

interface PayoutHistoryItem {
  id: string;
  date: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
}

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
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(v);
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

function maskIban(iban: string): string {
  if (!iban || iban.length < 8) return iban || '';
  return iban.slice(0, 4) + ' **** **** ' + iban.slice(-4);
}

function maskEmail(email: string): string {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const masked = local.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}

const MIN_PAYOUT = 50;

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="flex-1">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-7 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MesGainsPage() {
  // State
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [payoutInfo, setPayoutInfo] = useState<PayoutInfo | null>(null);
  const [payoutInfoLoaded, setPayoutInfoLoaded] = useState(false);
  const [history, setHistory] = useState<PayoutHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tier progress
  const [tierProgress, setTierProgress] = useState<TierProgressData | null>(null);

  // Payout request state
  const [amount, setAmount] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // History pagination
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Fetch earnings + payout info
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [earningsRes, infoRes, tierRes] = await Promise.allSettled([
          fetchAuth('/api/payouts/earnings'),
          fetchAuth('/api/payouts/info'),
          fetchAuth('/api/ambassador/tier-progress'),
        ]);

        if (cancelled) return;

        if (earningsRes.status === 'fulfilled') {
          const data = earningsRes.value.data ?? earningsRes.value;
          setEarnings(data);
        } else {
          setError('Impossible de charger vos gains.');
        }

        if (infoRes.status === 'fulfilled') {
          const data = infoRes.value.data ?? infoRes.value;
          // null or empty object means no payout info configured
          if (data && data.method) {
            setPayoutInfo(data);
          }
        }

        if (tierRes.status === 'fulfilled') {
          setTierProgress(tierRes.value.data ?? tierRes.value);
        }
        setPayoutInfoLoaded(true);
      } catch {
        if (!cancelled) setError('Erreur de connexion.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch payout history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: '10',
      });
      const json = await fetchAuth(`/api/payouts/history?${params}`);
      const result = json.data ?? json;
      setHistory(
        Array.isArray(result) ? result : result.payouts ?? result.items ?? [],
      );
      setHistoryTotalPages(result.totalPages ?? 1);
      setHistoryTotal(
        result.total ?? (Array.isArray(result) ? result.length : 0),
      );
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Request payout
  const handleRequestPayout = useCallback(async () => {
    setRequestError(null);
    setRequestSuccess(false);

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount < MIN_PAYOUT) {
      setRequestError(`Le montant minimum est de ${MIN_PAYOUT} EUR.`);
      return;
    }

    if (earnings && numericAmount > earnings.available) {
      setRequestError('Montant superieur au solde disponible.');
      return;
    }

    setRequesting(true);
    try {
      await fetchAuth('/api/payouts/request', {
        method: 'POST',
        body: JSON.stringify({ amount: numericAmount }),
      });
      setRequestSuccess(true);
      setAmount('');
      // Refresh data
      const [earningsRes] = await Promise.allSettled([
        fetchAuth('/api/payouts/earnings'),
      ]);
      if (earningsRes.status === 'fulfilled') {
        setEarnings(earningsRes.value.data ?? earningsRes.value);
      }
      fetchHistory();
    } catch {
      setRequestError('Erreur lors de la demande de retrait.');
    } finally {
      setRequesting(false);
    }
  }, [amount, earnings, fetchHistory]);

  // Fill max amount
  const handleMax = useCallback(() => {
    if (earnings) {
      setAmount(earnings.available.toFixed(2));
    }
  }, [earnings]);

  // Can request?
  const numericAmount = parseFloat((amount || '0').replace(',', '.'));
  const canRequest =
    payoutInfo &&
    !isNaN(numericAmount) &&
    numericAmount >= MIN_PAYOUT &&
    earnings !== null &&
    numericAmount <= earnings.available;

  // History columns
  const historyColumns: Column<PayoutHistoryItem>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      sortable: true,
      render: (v) => (
        <span className="font-medium text-gray-900">{formatEuro(v)}</span>
      ),
    },
    {
      key: 'method',
      header: 'Methode',
      render: (v) => (
        <span className="capitalize text-gray-700">
          {v === 'bank_transfer'
            ? 'Virement'
            : v === 'paypal'
              ? 'PayPal'
              : v}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (v) => (
        <span className="font-mono text-xs text-gray-500">{v || '-'}</span>
      ),
    },
  ];

  // ---- Loading state ----
  if (loading) {
    return (
      <div>
        <div className="flex flex-col gap-1">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="mt-6 h-32 w-full animate-pulse rounded-xl bg-gray-100" />
        <div className="mt-6 h-48 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  // ---- Error state ----
  if (error && !earnings) {
    return (
      <div>
        <PageHeader
          title="Mes gains"
          description="Gérez vos gains et demandez des retraits"
        />
        <div className="mt-12">
          <EmptyState
            icon={<Wallet className="h-6 w-6" />}
            title={error}
          />
        </div>
      </div>
    );
  }

  // ---- Main render ----
  return (
    <div>
      <PageHeader
        title="Mes gains"
        description="Gérez vos gains et demandez des retraits"
      />

      {/* ---- Section 1: Earnings Summary ---- */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        {/* Disponible */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-500">Disponible</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(earnings?.available ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* En attente */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-500">En attente</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(earnings?.pending ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Total verse */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-500">Total verse</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(earnings?.total_paid ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Total sponsor */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-500">Total sponsor</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(earnings?.total_sponsor ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Section 2: Tier Progress ---- */}
      {tierProgress && (
        <Card className="mt-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">Progression palier</h2>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <Badge variant="primary" size="md">
              {tierProgress.currentTier?.name || '-'}
            </Badge>
            {tierProgress.nextTier ? (
              <>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      {tierProgress.total_sales} ventes
                    </span>
                    <span className="text-gray-500">
                      {tierProgress.nextTier.min_sales} ventes
                    </span>
                  </div>
                  <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
                      style={{ width: `${tierProgress.progress}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-sm text-gray-500">
                    Encore <span className="font-semibold text-primary-600">{tierProgress.salesNeeded}</span> ventes pour atteindre{' '}
                    <span className="font-semibold">{tierProgress.nextTier.name}</span>{' '}
                    ({tierProgress.nextTier.ambassador_rate_affiliate}%)
                  </p>
                </div>
                <Badge variant="default" size="md">
                  {tierProgress.nextTier.name}
                </Badge>
              </>
            ) : (
              <p className="text-sm font-semibold text-green-600">
                Palier maximum atteint !
              </p>
            )}
          </div>

          {/* All tiers overview */}
          {tierProgress.allTiers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tierProgress.allTiers.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    tier.name === tierProgress.currentTier?.name
                      ? 'border-primary-300 bg-primary-50 text-primary-700'
                      : 'border-gray-200 bg-gray-50 text-gray-500'
                  }`}
                >
                  {tier.name} — {tier.rate}% ({tier.min_sales}+ ventes)
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ---- Section 3: Payout Info Banner ---- */}
      {payoutInfoLoaded && (
        <div className="mt-6">
          {!payoutInfo ? (
            // No payout info configured
            <div className="flex flex-col items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-500" />
                <p className="text-sm font-medium text-amber-800">
                  Configurez vos informations de paiement pour demander un
                  retrait
                </p>
              </div>
              <a href="/profil">
                <Button size="sm" className="shrink-0">
                  Configurer
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
            </div>
          ) : (
            // Payout info exists
            <div className="flex flex-col items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Methode de paiement configuree
                  </p>
                  <p className="mt-0.5 text-sm text-green-700">
                    {payoutInfo.method === 'bank_transfer' && (
                      <>
                        Virement bancaire &mdash;{' '}
                        {maskIban(payoutInfo.iban || '')}
                      </>
                    )}
                    {payoutInfo.method === 'paypal' && (
                      <>
                        PayPal &mdash;{' '}
                        {maskEmail(payoutInfo.paypal_email || '')}
                      </>
                    )}
                    {payoutInfo.method !== 'bank_transfer' &&
                      payoutInfo.method !== 'paypal' &&
                      payoutInfo.method}
                  </p>
                </div>
              </div>
              {payoutInfo.is_verified && (
                <Badge variant="success" size="sm">
                  Verifie
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* ---- Section 3: Request Payout ---- */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Demander un retrait
        </h2>

        <div className="mt-4">
          <p className="text-sm text-gray-500">
            Solde disponible :{' '}
            <span className="font-semibold text-green-600">
              {formatEuro(earnings?.available ?? 0)}
            </span>
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label
              htmlFor="payout-amount"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Montant
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="payout-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setRequestError(null);
                    setRequestSuccess(false);
                  }}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-12 text-sm text-gray-900 placeholder-gray-400 transition-colors duration-150 hover:border-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                  EUR
                </span>
              </div>
              <Button variant="secondary" size="md" onClick={handleMax}>
                Max
              </Button>
            </div>
          </div>

          {payoutInfo && (
            <div className="shrink-0">
              <p className="mb-1.5 text-sm font-medium text-gray-700">
                Methode
              </p>
              <p className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm capitalize text-gray-700">
                {payoutInfo.method === 'bank_transfer'
                  ? 'Virement bancaire'
                  : payoutInfo.method === 'paypal'
                    ? 'PayPal'
                    : payoutInfo.method}
              </p>
            </div>
          )}

          <Button
            size="md"
            loading={requesting}
            disabled={!canRequest}
            onClick={handleRequestPayout}
            className="shrink-0"
          >
            Demander un retrait
          </Button>
        </div>

        <p className="mt-3 text-xs text-gray-400">
          Seuil minimum : {MIN_PAYOUT} EUR
        </p>

        {requestError && (
          <p className="mt-2 text-sm text-red-600">{requestError}</p>
        )}

        {requestSuccess && (
          <p className="mt-2 text-sm text-green-600">
            Votre demande de retrait a ete envoyee avec succes.
          </p>
        )}
      </Card>

      {/* ---- Section 4: Payout History ---- */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Historique des retraits
        </h2>
        <DataTable
          columns={historyColumns}
          data={history}
          loading={historyLoading}
          pagination={{
            page: historyPage,
            totalPages: historyTotalPages,
            total: historyTotal,
          }}
          onPageChange={setHistoryPage}
          emptyMessage="Aucun retrait pour le moment"
        />
      </div>
    </div>
  );
}
