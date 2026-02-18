'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  ShoppingBag,
  CheckCircle,
  BarChart3,
  XCircle,
  ArrowRightCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface PayoutSummary {
  pending_payouts_count: number;
  pending_payouts_amount: number;
  pending_cashback_count: number;
  pending_cashback_amount: number;
  paid_this_month: number;
  average_amount: number;
}

interface Payout {
  id: string;
  date: string;
  userName: string;
  userEmail: string;
  type: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'processing', label: 'En traitement' },
  { value: 'paid', label: 'Paye' },
  { value: 'failed', label: 'Echoue' },
  { value: 'rejected', label: 'Rejete' },
];

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'ambassador', label: 'Ambassadeur' },
  { value: 'cashback', label: 'Cashback' },
];

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

async function fetchAdmin(path: string, options?: RequestInit) {
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

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(v);
}

// ---------------------------------------------------------------------------
// Summary Card component
// ---------------------------------------------------------------------------

function SummaryCard({
  icon,
  label,
  value,
  subtitle,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  gradient: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${gradient}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function SummaryCardSkeleton() {
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

export default function AdminPaiementsPage() {
  // Summary state
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Table state
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Action modals
  const [actionModal, setActionModal] = useState<{
    payout: Payout;
    action: 'process' | 'pay' | 'reject';
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [payReference, setPayReference] = useState('');

  // Fetch summary
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const json = await fetchAdmin('/api/admin/payouts/summary');
        if (!cancelled) {
          setSummary(json.data ?? json);
        }
      } catch {
        // Summary may fail
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch payouts
  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const json = await fetchAdmin(`/api/admin/payouts?${params}`);
      const result = json.data ?? json;
      setPayouts(
        Array.isArray(result) ? result : result.payouts ?? result.items ?? [],
      );
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, typeFilter]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Export CSV
  const handleExport = useCallback(async () => {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(
        `${API_URL}/api/admin/export/payouts?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'paiements.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    }
  }, [statusFilter, typeFilter]);

  // Action handlers
  const handleAction = useCallback(async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const { payout, action } = actionModal;
      const body: Record<string, string> = {};

      // Map frontend action to API sub-route
      let subRoute = action as string;
      if (action === 'pay') {
        subRoute = 'complete';
        body.reference = payReference.trim() || `PAY-${payout.id}`;
      } else if (action === 'reject') {
        body.reason = "Rejete par l'administrateur";
      }

      await fetchAdmin(`/api/admin/payouts/${payout.id}/${subRoute}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      setActionModal(null);
      setPayReference('');

      // Refresh both summary and payouts
      fetchPayouts();
      fetchAdmin('/api/admin/payouts/summary')
        .then((json) => setSummary(json.data ?? json))
        .catch(() => {
          /* ignore */
        });
    } catch {
      // Keep modal open
    } finally {
      setActionLoading(false);
    }
  }, [actionModal, payReference, fetchPayouts]);

  // Action labels
  function getActionLabel(action: string): string {
    switch (action) {
      case 'process':
        return 'Traiter';
      case 'pay':
        return 'Marquer paye';
      case 'reject':
        return 'Rejeter';
      default:
        return action;
    }
  }

  function getActionDescription(action: string, name: string): string {
    switch (action) {
      case 'process':
        return `Voulez-vous marquer le paiement de ${name} comme en traitement ?`;
      case 'pay':
        return `Voulez-vous marquer le paiement de ${name} comme paye ? Vous pouvez ajouter une reference de transaction.`;
      case 'reject':
        return `Voulez-vous rejeter le paiement de ${name} ? Cette action est irreversible.`;
      default:
        return '';
    }
  }

  // Type badge
  function renderTypeBadge(type: string) {
    if (type === 'ambassador') {
      return (
        <Badge variant="primary" size="sm">
          Ambassadeur
        </Badge>
      );
    }
    if (type === 'cashback') {
      return (
        <Badge variant="info" size="sm">
          Cashback
        </Badge>
      );
    }
    return (
      <Badge variant="default" size="sm">
        {type}
      </Badge>
    );
  }

  // Columns
  const columns: Column<Payout>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'userName',
      header: 'Utilisateur',
      sortable: true,
      render: (v, row) => (
        <div>
          <span className="font-medium text-gray-900">{v}</span>
          {row.userEmail && (
            <span className="block text-xs text-gray-400">
              {row.userEmail}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => renderTypeBadge(v),
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
              : v || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_v, row) => (
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {row.status === 'pending' && (
            <>
              <button
                onClick={() =>
                  setActionModal({ payout: row, action: 'process' })
                }
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                title="Traiter"
              >
                <ArrowRightCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setActionModal({ payout: row, action: 'reject' })
                }
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Rejeter"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === 'processing' && (
            <>
              <button
                onClick={() =>
                  setActionModal({ payout: row, action: 'pay' })
                }
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                title="Marquer paye"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() =>
                  setActionModal({ payout: row, action: 'reject' })
                }
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Rejeter"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Paiements"
        description="Gérez les retraits ambassadeurs et cashback acheteurs"
        actions={
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                options={STATUS_FILTER_OPTIONS}
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-44">
              <Select
                options={TYPE_FILTER_OPTIONS}
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
      />

      {/* ---- Summary Cards ---- */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryLoading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              icon={<Clock className="h-5 w-5" />}
              label="Retraits en attente"
              value={formatEuro(summary?.pending_payouts_amount ?? 0)}
              subtitle={`${summary?.pending_payouts_count ?? 0} demande${(summary?.pending_payouts_count ?? 0) > 1 ? 's' : ''}`}
              gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            />
            <SummaryCard
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Cashback en attente"
              value={formatEuro(summary?.pending_cashback_amount ?? 0)}
              subtitle={`${summary?.pending_cashback_count ?? 0} demande${(summary?.pending_cashback_count ?? 0) > 1 ? 's' : ''}`}
              gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <SummaryCard
              icon={<CheckCircle className="h-5 w-5" />}
              label="Paye ce mois"
              value={formatEuro(summary?.paid_this_month ?? 0)}
              gradient="bg-gradient-to-br from-green-500 to-green-600"
            />
            <SummaryCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Montant moyen"
              value={formatEuro(summary?.average_amount ?? 0)}
              gradient="bg-gradient-to-br from-gray-500 to-gray-600"
            />
          </>
        )}
      </div>

      {/* ---- DataTable ---- */}
      <div className="mt-6">
        <DataTable
          columns={columns}
          data={payouts}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par nom ou email..."
          onExport={handleExport}
          emptyMessage="Aucun paiement trouve"
        />
      </div>

      {/* ---- Action Modal ---- */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => {
          setActionModal(null);
          setPayReference('');
        }}
        title={actionModal ? getActionLabel(actionModal.action) : ''}
        size="sm"
      >
        {actionModal && (
          <>
            <p className="text-sm text-gray-600">
              {getActionDescription(
                actionModal.action,
                actionModal.payout.userName,
              )}
            </p>

            {/* Payout details */}
            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Montant</span>
                  <p className="font-medium text-gray-900">
                    {formatEuro(actionModal.payout.amount)}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Methode</span>
                  <p className="text-gray-900">
                    {actionModal.payout.method === 'bank_transfer'
                      ? 'Virement'
                      : actionModal.payout.method === 'paypal'
                        ? 'PayPal'
                        : actionModal.payout.method || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Reference input for pay action */}
            {actionModal.action === 'pay' && (
              <div className="mt-4">
                <Input
                  label="Reference de transaction"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Ex: VIR-2024-001234"
                />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setActionModal(null);
                  setPayReference('');
                }}
              >
                Annuler
              </Button>
              <Button
                variant={
                  actionModal.action === 'reject' ? 'danger' : 'primary'
                }
                size="sm"
                loading={actionLoading}
                onClick={handleAction}
              >
                {getActionLabel(actionModal.action)}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
