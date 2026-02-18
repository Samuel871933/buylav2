'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { API_URL } from '@/lib/constants';

interface Conversion {
  id: string;
  date: string;
  ambassadorName: string;
  ambassadorId?: string;
  programmeName: string;
  programmeId?: string;
  amount: number;
  commission: number;
  ambassadorShare: number;
  sponsorShare: number;
  buyerShare: number;
  platformShare: number;
  status: string;
}

interface ProgrammeOption {
  id: string;
  name: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'confirmed', label: 'Confirmee' },
  { value: 'paid', label: 'Payee' },
  { value: 'cancelled', label: 'Annulee' },
];

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)buyla_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return typeof window !== 'undefined' ? localStorage.getItem('buyla_token') : null;
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
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminConversionsPage() {
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [programmeFilter, setProgrammeFilter] = useState('');

  // Action modal
  const [actionModal, setActionModal] = useState<{ conversion: Conversion; action: 'confirm' | 'pay' | 'cancel' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch programmes for filter
  useEffect(() => {
    fetchAdmin('/api/admin/programmes?limit=100')
      .then((json) => {
        const list = json.data?.programmes ?? json.data ?? json.programmes ?? json ?? [];
        setProgrammes(
          (Array.isArray(list) ? list : []).map((p: Record<string, unknown>) => ({
            id: p.id as string,
            name: p.name as string,
          })),
        );
      })
      .catch(() => setProgrammes([]));
  }, []);

  // Fetch conversions
  const fetchConversions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (programmeFilter) params.set('programmeId', programmeFilter);
      const json = await fetchAdmin(`/api/admin/conversions?${params}`);
      const result = json.data ?? json;
      setConversions(Array.isArray(result) ? result : result.conversions ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setConversions([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, programmeFilter]);

  useEffect(() => {
    fetchConversions();
  }, [fetchConversions]);

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
      if (programmeFilter) params.set('programmeId', programmeFilter);
      const res = await fetch(`${API_URL}/api/admin/export/conversions?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversions.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    }
  }, [statusFilter, programmeFilter]);

  // Action handlers
  const handleAction = useCallback(async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const { conversion, action } = actionModal;
      const body: Record<string, string> = {};
      if (action === 'cancel') body.reason = "Annulee par l'administrateur";

      await fetchAdmin(`/api/admin/conversions/${conversion.id}/${action}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });

      setActionModal(null);
      fetchConversions();
    } catch {
      // Keep modal open
    } finally {
      setActionLoading(false);
    }
  }, [actionModal, fetchConversions]);

  // Action labels
  function getActionLabel(action: string): string {
    switch (action) {
      case 'confirm': return 'Confirmer';
      case 'pay': return 'Marquer payee';
      case 'cancel': return 'Annuler';
      default: return action;
    }
  }

  function getActionDescription(action: string, name: string): string {
    switch (action) {
      case 'confirm': return `Voulez-vous confirmer la conversion de ${name} ? La commission sera validee.`;
      case 'pay': return `Voulez-vous marquer la conversion de ${name} comme payee ?`;
      case 'cancel': return `Voulez-vous annuler la conversion de ${name} ? Cette action est irreversible.`;
      default: return '';
    }
  }

  // Programme filter options
  const programmeOptions = [
    { value: '', label: 'Tous les programmes' },
    ...programmes.map((p) => ({ value: p.id, label: p.name })),
  ];

  // Columns
  const columns: Column<Conversion>[] = [
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'ambassadorName',
      header: 'Ambassadeur',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{v}</span>,
    },
    {
      key: 'programmeName',
      header: 'Programme',
      render: (v) => <span>{v}</span>,
    },
    {
      key: 'amount',
      header: 'Montant',
      sortable: true,
      render: (v) => <span className="font-medium">{formatEuro(v)}</span>,
    },
    {
      key: 'commission',
      header: 'Commission',
      sortable: true,
      render: (v) => <span>{formatEuro(v)}</span>,
    },
    {
      key: 'ambassadorShare',
      header: 'Amb.',
      render: (v) => <span className="text-xs text-gray-500">{formatEuro(v)}</span>,
    },
    {
      key: 'sponsorShare',
      header: 'Parr.',
      render: (v) => <span className="text-xs text-gray-500">{formatEuro(v)}</span>,
    },
    {
      key: 'buyerShare',
      header: 'Ach.',
      render: (v) => <span className="text-xs text-gray-500">{formatEuro(v)}</span>,
    },
    {
      key: 'platformShare',
      header: 'Plat.',
      render: (v) => <span className="text-xs text-gray-500">{formatEuro(v)}</span>,
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => setActionModal({ conversion: row, action: 'confirm' })}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-green-50 hover:text-green-600"
                title="Confirmer"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActionModal({ conversion: row, action: 'cancel' })}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Annuler"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === 'confirmed' && (
            <button
              onClick={() => setActionModal({ conversion: row, action: 'pay' })}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
              title="Marquer payee"
            >
              <CreditCard className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Conversions"
        description="Suivez et gerez les conversions de la plateforme"
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
                options={programmeOptions}
                value={programmeFilter}
                onChange={(e) => {
                  setProgrammeFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={conversions}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher une conversion..."
          onExport={handleExport}
          emptyMessage="Aucune conversion trouvee"
        />
      </div>

      {/* Action Confirmation Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title={actionModal ? getActionLabel(actionModal.action) : ''}
        size="sm"
      >
        {actionModal && (
          <>
            <p className="text-sm text-gray-600">
              {getActionDescription(actionModal.action, actionModal.conversion.ambassadorName)}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" size="sm" onClick={() => setActionModal(null)}>
                Annuler
              </Button>
              <Button
                variant={actionModal.action === 'cancel' ? 'danger' : 'primary'}
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
