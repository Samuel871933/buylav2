'use client';

import { useState, useEffect, useCallback } from 'react';
import { Eye, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { StatusBadge } from '@/components/data/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface FraudFlag {
  id: string;
  createdAt: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  type: string;
  severity: string;
  status: string;
  details?: Record<string, unknown> | null;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'pending', label: 'En attente' },
  { value: 'reviewed', label: 'Examine' },
  { value: 'confirmed', label: 'Confirme' },
  { value: 'dismissed', label: 'Ecarte' },
];

const SEVERITY_FILTER_OPTIONS = [
  { value: '', label: 'Toutes les severites' },
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'critical', label: 'Critique' },
];

const STATUS_UPDATE_OPTIONS = [
  { value: 'pending', label: 'En attente' },
  { value: 'reviewed', label: 'Examine' },
  { value: 'confirmed', label: 'Confirme' },
  { value: 'dismissed', label: 'Ecarte' },
];

const TYPE_LABELS: Record<string, string> = {
  self_buy: 'Auto-achat',
  click_spam: 'Spam de clics',
  fake_account: 'Faux compte',
  self_referral: 'Auto-parrainage',
  cashback_abuse: 'Abus cashback',
};

const SEVERITY_CONFIG: Record<string, { label: string; classes: string }> = {
  low: { label: 'Faible', classes: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Moyenne', classes: 'bg-amber-100 text-amber-700' },
  high: { label: 'Haute', classes: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critique', classes: 'bg-red-100 text-red-700' },
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminFraudePage() {
  const [flags, setFlags] = useState<FraudFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');

  // Detail modal
  const [selectedFlag, setSelectedFlag] = useState<FraudFlag | null>(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showConfirmWarning, setShowConfirmWarning] = useState(false);

  // Fetch fraud flags
  const fetchFlags = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (severityFilter) params.set('severity', severityFilter);
      const json = await fetchAdmin(`/api/admin/fraud-flags?${params}`);
      const result = json.data ?? json;
      setFlags(Array.isArray(result) ? result : result.fraudFlags ?? result.flags ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setFlags([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, severityFilter]);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Open detail modal
  const openDetail = useCallback((flag: FraudFlag) => {
    setSelectedFlag(flag);
    setModalStatus(flag.status);
    setModalNotes(flag.adminNotes || '');
    setSaveError('');
    setShowConfirmWarning(false);
  }, []);

  // Handle status change in modal
  const handleModalStatusChange = useCallback(
    (newStatus: string) => {
      setModalStatus(newStatus);
      setSaveError('');
      // Show warning when confirming high/critical
      if (
        newStatus === 'confirmed' &&
        selectedFlag &&
        (selectedFlag.severity === 'high' || selectedFlag.severity === 'critical')
      ) {
        setShowConfirmWarning(true);
      } else {
        setShowConfirmWarning(false);
      }
    },
    [selectedFlag],
  );

  // Save fraud flag update
  const handleSave = useCallback(async () => {
    if (!selectedFlag) return;

    setSaving(true);
    setSaveError('');
    try {
      await fetchAdmin(`/api/admin/fraud-flags/${selectedFlag.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          status: modalStatus,
          adminNotes: modalNotes || undefined,
        }),
      });
      setSelectedFlag(null);
      fetchFlags();
    } catch {
      setSaveError('Erreur lors de la mise a jour du signalement.');
    } finally {
      setSaving(false);
    }
  }, [selectedFlag, modalStatus, modalNotes, fetchFlags]);

  // Columns
  const columns: Column<FraudFlag>[] = [
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
      render: (v) => (
        <Badge variant="warning" size="sm">
          {TYPE_LABELS[v] || v}
        </Badge>
      ),
    },
    {
      key: 'severity',
      header: 'Severite',
      sortable: true,
      render: (v) => {
        const config = SEVERITY_CONFIG[v] || { label: v, classes: 'bg-gray-100 text-gray-700' };
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.classes}`}>
            {config.label}
          </span>
        );
      },
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
        title="Detection de fraude"
        description="Examinez et traitez les signalements de fraude"
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
                options={SEVERITY_FILTER_OPTIONS}
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value);
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
          data={flags}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher un signalement..."
          onRowClick={openDetail}
          emptyMessage="Aucun signalement de fraude trouve"
        />
      </div>

      {/* Fraud Flag Detail Modal */}
      <Modal
        isOpen={!!selectedFlag}
        onClose={() => setSelectedFlag(null)}
        title="Details du signalement"
        size="lg"
      >
        {selectedFlag && (
          <div className="space-y-5">
            {/* User info */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500">Utilisateur</h4>
              <p className="text-sm font-medium text-gray-900">{selectedFlag.userName}</p>
              {selectedFlag.userEmail && (
                <p className="text-xs text-gray-500">{selectedFlag.userEmail}</p>
              )}
              {selectedFlag.userId && (
                <p className="mt-1 font-mono text-xs text-gray-400">ID: {selectedFlag.userId}</p>
              )}
            </div>

            {/* Flag info grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Type</span>
                <div className="mt-1">
                  <Badge variant="warning">{TYPE_LABELS[selectedFlag.type] || selectedFlag.type}</Badge>
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Severite</span>
                <div className="mt-1">
                  {(() => {
                    const config = SEVERITY_CONFIG[selectedFlag.severity] || { label: selectedFlag.severity, classes: 'bg-gray-100 text-gray-700' };
                    return (
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${config.classes}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Date de detection</span>
                <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedFlag.createdAt)}</p>
              </div>
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Statut actuel</span>
                <div className="mt-1">
                  <StatusBadge status={selectedFlag.status} />
                </div>
              </div>
              {selectedFlag.reviewedAt && (
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Examine le</span>
                  <p className="mt-1 text-sm text-gray-700">{formatDateTime(selectedFlag.reviewedAt)}</p>
                </div>
              )}
              {selectedFlag.reviewedBy && (
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Examine par</span>
                  <p className="mt-1 text-sm text-gray-700">{selectedFlag.reviewedBy}</p>
                </div>
              )}
            </div>

            {/* Flag details (JSON) */}
            {selectedFlag.details && Object.keys(selectedFlag.details).length > 0 && (
              <div>
                <span className="text-xs font-semibold uppercase text-gray-500">Details du signalement</span>
                <pre className="mt-1 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
                  {JSON.stringify(selectedFlag.details, null, 2)}
                </pre>
              </div>
            )}

            {/* Admin notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Notes administrateur</label>
              <textarea
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                rows={3}
                placeholder="Ajoutez des notes sur ce signalement..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Status update */}
            <div>
              <Select
                label="Mettre a jour le statut"
                options={STATUS_UPDATE_OPTIONS}
                value={modalStatus}
                onChange={(e) => handleModalStatusChange(e.target.value)}
              />
            </div>

            {/* Warning for high/critical confirmation */}
            {showConfirmWarning && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="text-sm font-medium text-red-800">Attention</p>
                  <p className="mt-1 text-xs text-red-700">
                    Confirmer ce signalement de severite {SEVERITY_CONFIG[selectedFlag.severity]?.label?.toLowerCase() || selectedFlag.severity} entrainera
                    la desactivation du compte de l&apos;utilisateur. Cette action est significative et doit etre justifiee.
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {saveError && (
              <p className="text-sm text-red-600">{saveError}</p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
              <Button variant="secondary" size="sm" onClick={() => setSelectedFlag(null)}>
                Fermer
              </Button>
              <Button
                variant={showConfirmWarning ? 'danger' : 'primary'}
                size="sm"
                loading={saving}
                onClick={handleSave}
              >
                {showConfirmWarning ? 'Confirmer et desactiver' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
