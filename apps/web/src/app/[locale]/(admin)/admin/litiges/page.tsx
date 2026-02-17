'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Dispute {
  id: string;
  createdAt: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  type: string;
  conversionId?: string;
  conversionRef?: string;
  status: string;
  description: string;
  resolutionNotes?: string;
  amount?: number;
  resolvedAt?: string;
  resolvedBy?: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'open', label: 'Ouvert' },
  { value: 'investigating', label: 'En cours' },
  { value: 'resolved', label: 'Resolu' },
  { value: 'rejected', label: 'Rejete' },
];

const STATUS_UPDATE_OPTIONS = [
  { value: 'open', label: 'Ouvert' },
  { value: 'investigating', label: 'En cours d\'investigation' },
  { value: 'resolved', label: 'Resolu' },
  { value: 'rejected', label: 'Rejete' },
];

const TYPE_LABELS: Record<string, { label: string; variant: 'danger' | 'warning' | 'info' | 'default' }> = {
  refund: { label: 'Remboursement', variant: 'warning' },
  attribution_error: { label: 'Erreur d\'attribution', variant: 'info' },
  fraud: { label: 'Fraude', variant: 'danger' },
  other: { label: 'Autre', variant: 'default' },
};

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

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminLitigesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail modal
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Fetch disputes
  const fetchDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      const json = await fetchAdmin(`/api/admin/disputes?${params}`);
      const result = json.data ?? json;
      setDisputes(Array.isArray(result) ? result : result.disputes ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Open detail modal
  const openDetail = useCallback((dispute: Dispute) => {
    setSelectedDispute(dispute);
    setModalStatus(dispute.status);
    setModalNotes(dispute.resolutionNotes || '');
    setSaveError('');
  }, []);

  // Save dispute update
  const handleSave = useCallback(async () => {
    if (!selectedDispute) return;

    // Require notes when resolving or rejecting
    if ((modalStatus === 'resolved' || modalStatus === 'rejected') && !modalNotes.trim()) {
      setSaveError('Les notes de resolution sont requises pour resoudre ou rejeter un litige.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      await fetchAdmin(`/api/admin/disputes/${selectedDispute.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: modalStatus,
          resolutionNotes: modalNotes || undefined,
        }),
      });
      setSelectedDispute(null);
      fetchDisputes();
    } catch {
      setSaveError('Erreur lors de la mise a jour du litige.');
    } finally {
      setSaving(false);
    }
  }, [selectedDispute, modalStatus, modalNotes, fetchDisputes]);

  // Columns
  const columns: Column<Dispute>[] = [
    {
      key: 'createdAt',
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
            <span className="block text-xs text-gray-400">{row.userEmail}</span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (v) => {
        const config = TYPE_LABELS[v] || { label: v, variant: 'default' as const };
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'conversionRef',
      header: 'Conversion #',
      render: (v, row) => (
        <span className="font-mono text-xs text-gray-500">
          {v || (row.conversionId ? String(row.conversionId).slice(0, 8) + '...' : '-')}
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
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDetail(row)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-primary-600"
            title="Voir les details"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Litiges"
        description="Gérez les litiges et réclamations des utilisateurs"
        actions={
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
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={disputes}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher un litige..."
          onRowClick={openDetail}
          emptyMessage="Aucun litige trouve"
        />
      </div>

      {/* Dispute Detail Modal */}
      <Modal
        isOpen={!!selectedDispute}
        onClose={() => setSelectedDispute(null)}
        title="Details du litige"
        size="lg"
      >
        {selectedDispute && (
          <div className="space-y-5">
            {/* User info */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Utilisateur</h4>
              <p className="text-sm font-medium text-gray-900">{selectedDispute.userName}</p>
              {selectedDispute.userEmail && (
                <p className="text-xs text-gray-500">{selectedDispute.userEmail}</p>
              )}
              {selectedDispute.userId && (
                <p className="mt-1 font-mono text-xs text-gray-400">ID: {selectedDispute.userId}</p>
              )}
            </div>

            {/* Conversion details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Type</span>
                <div className="mt-1">
                  {(() => {
                    const config = TYPE_LABELS[selectedDispute.type] || { label: selectedDispute.type, variant: 'default' as const };
                    return <Badge variant={config.variant}>{config.label}</Badge>;
                  })()}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Conversion</span>
                <p className="mt-1 font-mono text-sm text-gray-700">
                  {selectedDispute.conversionRef || selectedDispute.conversionId || '-'}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Date de creation</span>
                <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedDispute.createdAt)}</p>
              </div>
              {selectedDispute.amount != null && (
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Montant</span>
                  <p className="mt-1 text-sm font-medium text-gray-700">{formatEuro(selectedDispute.amount)}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Statut actuel</span>
                <div className="mt-1">
                  <StatusBadge status={selectedDispute.status} />
                </div>
              </div>
              {selectedDispute.resolvedAt && (
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Resolu le</span>
                  <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedDispute.resolvedAt)}</p>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <span className="text-xs font-semibold uppercase text-gray-500">Description</span>
              <p className="mt-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{selectedDispute.description || '-'}</p>
            </div>

            {/* Status update */}
            <div>
              <Select
                label="Mettre a jour le statut"
                options={STATUS_UPDATE_OPTIONS}
                value={modalStatus}
                onChange={(e) => {
                  setModalStatus(e.target.value);
                  setSaveError('');
                }}
              />
            </div>

            {/* Resolution notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Notes de resolution
                {(modalStatus === 'resolved' || modalStatus === 'rejected') && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </label>
              <textarea
                value={modalNotes}
                onChange={(e) => {
                  setModalNotes(e.target.value);
                  setSaveError('');
                }}
                rows={3}
                placeholder="Ajoutez des notes sur la resolution de ce litige..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Error */}
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="secondary" size="sm" onClick={() => setSelectedDispute(null)}>
                Fermer
              </Button>
              <Button
                size="sm"
                loading={saving}
                onClick={handleSave}
                disabled={modalStatus === selectedDispute.status && !modalNotes.trim()}
              >
                Sauvegarder
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
