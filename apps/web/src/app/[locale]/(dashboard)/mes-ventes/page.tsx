'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Filter,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { API_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversionRow {
  id: number;
  order_ref: string | null;
  amount: string;
  commission_total: string;
  ambassador_share: string;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  created_at: string;
  confirmed_at: string | null;
  paid_at: string | null;
  program: {
    id: number;
    name: string;
    display_name: string;
  } | null;
}

interface ProgramOption {
  id: number;
  name: string;
  display_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getAuthToken(): string | null {
  const fromCookie = getCookie('buyla_token');
  if (fromCookie) return fromCookie;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('buyla_token');
  }
  return null;
}

function formatEuro(value: number | string): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'info' | 'danger' }> = {
  pending: { label: 'En attente', variant: 'warning' },
  confirmed: { label: 'Confirmée', variant: 'success' },
  paid: { label: 'Payée', variant: 'info' },
  cancelled: { label: 'Annulée', variant: 'danger' },
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function MesVentesPage() {
  const t = useTranslations('sales');

  // Data state
  const [conversions, setConversions] = useState<ConversionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Programs for filter dropdown
  const [programs, setPrograms] = useState<ProgramOption[]>([]);

  // Summary stats
  const [stats, setStats] = useState({
    totalSales: 0,
    pendingAmount: 0,
    confirmedAmount: 0,
    paidAmount: 0,
  });

  const headers: Record<string, string> = {};
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Fetch programs list (once)
  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/ambassador/programs`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data?.programs) setPrograms(json.data.programs);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch conversions
  const fetchConversions = useCallback(async () => {
    const t2 = getAuthToken();
    if (!t2) return;

    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (statusFilter) params.set('status', statusFilter);
    if (programFilter) params.set('program', programFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (search) params.set('search', search);

    try {
      const res = await fetch(`${API_URL}/api/ambassador/conversions?${params}`, {
        headers: { Authorization: `Bearer ${t2}` },
      });
      if (res.ok) {
        const json = await res.json();
        setConversions(json.data ?? []);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotal(json.pagination?.total ?? 0);

        // Calculate stats from all conversions (separate call for accurate totals)
        const allStatuses = ['pending', 'confirmed', 'paid'];
        const statResults = await Promise.all(
          allStatuses.map((s) =>
            fetch(`${API_URL}/api/ambassador/conversions?${new URLSearchParams({ status: s, limit: '1' })}`, {
              headers: { Authorization: `Bearer ${t2}` },
            }).then((r) => r.ok ? r.json() : null),
          ),
        );

        setStats({
          totalSales: json.pagination?.total ?? 0,
          pendingAmount: statResults[0]?.pagination?.total ?? 0,
          confirmedAmount: statResults[1]?.pagination?.total ?? 0,
          paidAmount: statResults[2]?.pagination?.total ?? 0,
        });
      }
    } catch {
      // Network error
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, programFilter, dateFrom, dateTo, search]);

  useEffect(() => {
    fetchConversions();
  }, [fetchConversions]);

  // Export CSV
  const handleExport = useCallback(async () => {
    const t2 = getAuthToken();
    if (!t2) return;

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (programFilter) params.set('program', programFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);

    try {
      const res = await fetch(`${API_URL}/api/ambassador/conversions/export?${params}`, {
        headers: { Authorization: `Bearer ${t2}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mes-ventes.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch {
      // ignore
    }
  }, [statusFilter, programFilter, dateFrom, dateTo]);

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('');
    setProgramFilter('');
    setDateFrom('');
    setDateTo('');
    setSearch('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter || programFilter || dateFrom || dateTo;

  // Table columns
  const columns: Column<ConversionRow>[] = [
    {
      key: 'created_at',
      header: t('date'),
      sortable: true,
      render: (v: string) => formatDate(v),
    },
    {
      key: 'program.display_name',
      header: t('program'),
      render: (_v: string, row: ConversionRow) =>
        row.program?.display_name || row.program?.name || '-',
    },
    {
      key: 'order_ref',
      header: t('orderRef'),
      render: (v: string | null) => (
        <span className="font-mono text-xs">{v || '-'}</span>
      ),
    },
    {
      key: 'amount',
      header: t('amount'),
      sortable: true,
      render: (v: string) => formatEuro(v),
    },
    {
      key: 'commission_total',
      header: t('commission'),
      sortable: true,
      render: (v: string) => formatEuro(v),
    },
    {
      key: 'ambassador_share',
      header: t('myShare'),
      sortable: true,
      render: (v: string) => (
        <span className="font-semibold text-primary-700">{formatEuro(v)}</span>
      ),
    },
    {
      key: 'status',
      header: t('status'),
      render: (v: string) => {
        const cfg = STATUS_CONFIG[v] || STATUS_CONFIG.pending;
        return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            {t('filters')}
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs text-white">
                !
              </span>
            )}
          </button>
        }
      />

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{t('totalSales')}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{t('statusPending')}</p>
          <p className="mt-1 text-2xl font-bold text-amber-600">{stats.pendingAmount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{t('statusConfirmed')}</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{stats.confirmedAmount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">{t('statusPaid')}</p>
          <p className="mt-1 text-2xl font-bold text-blue-600">{stats.paidAmount}</p>
        </div>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">{t('filters')}</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
                {t('clearFilters')}
              </button>
            )}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Status */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{t('status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('allStatuses')}</option>
                <option value="pending">{STATUS_CONFIG.pending.label}</option>
                <option value="confirmed">{STATUS_CONFIG.confirmed.label}</option>
                <option value="paid">{STATUS_CONFIG.paid.label}</option>
                <option value="cancelled">{STATUS_CONFIG.cancelled.label}</option>
              </select>
            </div>

            {/* Program */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{t('program')}</label>
              <select
                value={programFilter}
                onChange={(e) => { setProgramFilter(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t('allPrograms')}</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name || p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{t('dateFrom')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Date to */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">{t('dateTo')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="mt-6">
        <DataTable
          columns={columns}
          data={conversions}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={(q) => { setSearch(q); setPage(1); }}
          searchPlaceholder={t('searchPlaceholder')}
          onExport={handleExport}
          emptyMessage={t('empty')}
        />
      </div>
    </div>
  );
}
