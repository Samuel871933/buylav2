'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Clock,
  CreditCard,
  ShoppingBag,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, Column } from '@/components/data/data-table';
import { API_URL } from '@/lib/constants';
const MIN_CASHBACK_WITHDRAWAL = 10;

interface CashbackBalance {
  available: number;
  pending: number;
  total_withdrawn: number;
}

interface CashbackHistoryItem {
  id: string;
  date: string;
  type: string; // earned | withdrawal | clawback
  amount: number;
  description: string;
  balance_after: number;
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

// ---------------------------------------------------------------------------
// Type display helpers
// ---------------------------------------------------------------------------

function getTypeConfig(type: string): {
  label: string;
  variant: 'success' | 'info' | 'danger' | 'default';
  icon: React.ReactNode;
} {
  switch (type) {
    case 'earned':
      return {
        label: 'Gagne',
        variant: 'success',
        icon: <ArrowDownCircle className="h-3.5 w-3.5" />,
      };
    case 'withdrawal':
      return {
        label: 'Retrait',
        variant: 'info',
        icon: <ArrowUpCircle className="h-3.5 w-3.5" />,
      };
    case 'clawback':
      return {
        label: 'Reprise',
        variant: 'danger',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      };
    default:
      return {
        label: type,
        variant: 'default',
        icon: null,
      };
  }
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function BalanceCardSkeleton() {
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

export default function MonCashbackPage() {
  // Balance state
  const [balance, setBalance] = useState<CashbackBalance | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // History state
  const [history, setHistory] = useState<CashbackHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  // Fetch balance
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const json = await fetchAuth('/api/cashback/balance');
        if (cancelled) return;
        setBalance(json.data ?? json);
      } catch {
        if (!cancelled) setError('Impossible de charger votre solde cashback.');
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: '10',
      });
      const json = await fetchAuth(`/api/cashback/history?${params}`);
      const result = json.data ?? json;
      setHistory(
        Array.isArray(result)
          ? result
          : result.transactions ?? result.items ?? [],
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

  // Request withdrawal
  const handleWithdraw = useCallback(async () => {
    setWithdrawError(null);
    setWithdrawSuccess(false);

    const numericAmount = parseFloat(withdrawAmount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount < MIN_CASHBACK_WITHDRAWAL) {
      setWithdrawError(
        `Le montant minimum est de ${MIN_CASHBACK_WITHDRAWAL} EUR.`,
      );
      return;
    }

    if (balance && numericAmount > balance.available) {
      setWithdrawError('Montant superieur au solde disponible.');
      return;
    }

    setWithdrawing(true);
    try {
      await fetchAuth('/api/cashback/withdraw', {
        method: 'POST',
        body: JSON.stringify({ amount: numericAmount }),
      });
      setWithdrawSuccess(true);
      setWithdrawAmount('');

      // Refresh balance
      const json = await fetchAuth('/api/cashback/balance');
      setBalance(json.data ?? json);
      fetchHistory();
    } catch {
      setWithdrawError('Erreur lors de la demande de retrait.');
    } finally {
      setWithdrawing(false);
    }
  }, [withdrawAmount, balance, fetchHistory]);

  // Fill max
  const handleMax = useCallback(() => {
    if (balance) {
      setWithdrawAmount(balance.available.toFixed(2));
    }
  }, [balance]);

  // Can withdraw?
  const numericWithdraw = parseFloat(
    (withdrawAmount || '0').replace(',', '.'),
  );
  const canWithdraw =
    balance !== null &&
    !isNaN(numericWithdraw) &&
    numericWithdraw >= MIN_CASHBACK_WITHDRAWAL &&
    numericWithdraw <= balance.available;

  // Show withdrawal form?
  const showWithdrawalForm =
    balance !== null && balance.available >= MIN_CASHBACK_WITHDRAWAL;

  // History columns
  const historyColumns: Column<CashbackHistoryItem>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => {
        const config = getTypeConfig(v);
        return (
          <Badge variant={config.variant} size="sm">
            {config.icon && <span className="mr-1">{config.icon}</span>}
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'amount',
      header: 'Montant',
      sortable: true,
      render: (v, row) => {
        const isNegative =
          row.type === 'withdrawal' || row.type === 'clawback';
        return (
          <span
            className={`font-medium ${isNegative ? 'text-red-600' : 'text-green-600'}`}
          >
            {isNegative ? '-' : '+'}
            {formatEuro(Math.abs(v))}
          </span>
        );
      },
    },
    {
      key: 'description',
      header: 'Description',
      render: (v) => (
        <span className="text-sm text-gray-600">{v || '-'}</span>
      ),
    },
    {
      key: 'balance_after',
      header: 'Solde apres',
      render: (v) => (
        <span className="text-sm font-medium text-gray-700">
          {formatEuro(v)}
        </span>
      ),
    },
  ];

  // ---- Loading state ----
  if (balanceLoading) {
    return (
      <div>
        <div className="flex flex-col gap-1">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BalanceCardSkeleton />
          <BalanceCardSkeleton />
          <BalanceCardSkeleton />
        </div>
        <div className="mt-6 h-48 w-full animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  // ---- Error state ----
  if (error && !balance) {
    return (
      <div>
        <PageHeader
          title="Mon cashback"
          description="Suivez et retirez votre cashback"
        />
        <div className="mt-12">
          <EmptyState
            icon={<ShoppingBag className="h-6 w-6" />}
            title={error}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mon cashback"
        description="Suivez et retirez votre cashback"
      />

      {/* ---- Section 1: Balance Cards ---- */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-stagger">
        {/* Disponible */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-500">Disponible</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(balance?.available ?? 0)}
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
                {formatEuro(balance?.pending ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Total retire */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-gray-500">Total retire</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(balance?.total_withdrawn ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Section 2: Withdrawal ---- */}
      {showWithdrawalForm ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Retirer mon cashback
          </h2>

          <div className="mt-4">
            <p className="text-sm text-gray-500">
              Solde disponible :{' '}
              <span className="font-semibold text-green-600">
                {formatEuro(balance?.available ?? 0)}
              </span>
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="withdraw-amount"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Montant
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    id="withdraw-amount"
                    type="text"
                    inputMode="decimal"
                    value={withdrawAmount}
                    onChange={(e) => {
                      setWithdrawAmount(e.target.value);
                      setWithdrawError(null);
                      setWithdrawSuccess(false);
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

            <Button
              size="md"
              loading={withdrawing}
              disabled={!canWithdraw}
              onClick={handleWithdraw}
              className="shrink-0"
            >
              Demander un retrait
            </Button>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Seuil minimum : {MIN_CASHBACK_WITHDRAWAL} EUR
          </p>

          {withdrawError && (
            <p className="mt-2 text-sm text-red-600">{withdrawError}</p>
          )}

          {withdrawSuccess && (
            <p className="mt-2 text-sm text-green-600">
              Votre demande de retrait a ete envoyee avec succes.
            </p>
          )}
        </Card>
      ) : (
        balance !== null && (
          <Card className="mt-6">
            <div className="flex items-center gap-3 text-amber-600">
              <Clock className="h-5 w-5 shrink-0" />
              <p className="text-sm">
                Votre solde doit atteindre{' '}
                {formatEuro(MIN_CASHBACK_WITHDRAWAL)} pour pouvoir effectuer un
                retrait. Solde actuel :{' '}
                <span className="font-semibold">
                  {formatEuro(balance.available)}
                </span>
              </p>
            </div>
          </Card>
        )
      )}

      {/* ---- Section 3: History ---- */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Historique
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
          emptyMessage="Aucune transaction cashback pour le moment"
        />
      </div>
    </div>
  );
}
