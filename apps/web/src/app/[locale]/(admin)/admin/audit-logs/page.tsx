'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface AuditLog {
  id: string;
  date: string;
  adminName: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

const ACTION_OPTIONS = [
  { value: '', label: 'Toutes les actions' },
  { value: 'create', label: 'Creation' },
  { value: 'update', label: 'Modification' },
  { value: 'delete', label: 'Suppression' },
  { value: 'login', label: 'Connexion' },
  { value: 'status_change', label: 'Changement de statut' },
  { value: 'export', label: 'Export' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'Toutes les entites' },
  { value: 'user', label: 'Utilisateur' },
  { value: 'programme', label: 'Programme' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'payout', label: 'Paiement' },
  { value: 'boost', label: 'Boost' },
  { value: 'setting', label: 'Parametre' },
  { value: 'dispute', label: 'Litige' },
  { value: 'fraud_flag', label: 'Fraude' },
];

const ACTION_LABELS: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  create: { label: 'Creation', variant: 'success' },
  update: { label: 'Modification', variant: 'info' },
  delete: { label: 'Suppression', variant: 'danger' },
  login: { label: 'Connexion', variant: 'default' },
  status_change: { label: 'Statut', variant: 'warning' },
  export: { label: 'Export', variant: 'default' },
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
// JSON Diff Viewer
// ---------------------------------------------------------------------------

function JsonViewer({ label, data }: { label: string; data: Record<string, unknown> | null | undefined }) {
  if (!data || Object.keys(data).length === 0) return null;

  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase text-gray-500">{label}</h4>
      <pre className="overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Expanded rows
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Toggle row expansion
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      if (entityFilter) params.set('entityType', entityFilter);
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);
      const json = await fetchAdmin(`/api/admin/audit-logs?${params}`);
      const result = json.data ?? json;
      setLogs(Array.isArray(result) ? result : result.logs ?? result.auditLogs ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Columns
  const columns: Column<AuditLog>[] = [
    {
      key: 'expand',
      header: '',
      className: 'w-8',
      render: (_v, row) => {
        const hasDetails =
          (row.oldValues && Object.keys(row.oldValues).length > 0) ||
          (row.newValues && Object.keys(row.newValues).length > 0);
        if (!hasDetails) return null;
        return expandedIds.has(row.id) ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        );
      },
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDateTime(v)}</span>,
    },
    {
      key: 'adminName',
      header: 'Admin',
      sortable: true,
      render: (v, row) => (
        <div>
          <span className="font-medium text-gray-900">{v || 'Systeme'}</span>
          {row.adminEmail && (
            <span className="block text-xs text-gray-400">{row.adminEmail}</span>
          )}
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (v) => {
        const config = ACTION_LABELS[v] || { label: v, variant: 'default' as const };
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'entityType',
      header: 'Entite',
      render: (v) => {
        const entityLabels: Record<string, string> = {
          user: 'Utilisateur',
          programme: 'Programme',
          conversion: 'Conversion',
          payout: 'Paiement',
          boost: 'Boost',
          setting: 'Parametre',
          dispute: 'Litige',
          fraud_flag: 'Fraude',
        };
        return <span className="text-gray-700">{entityLabels[v] || v}</span>;
      },
    },
    {
      key: 'entityId',
      header: 'ID Entite',
      render: (v) => (
        <span className="font-mono text-xs text-gray-500">{v ? String(v).slice(0, 8) + '...' : '-'}</span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (_v, row) => {
        const hasOld = row.oldValues && Object.keys(row.oldValues).length > 0;
        const hasNew = row.newValues && Object.keys(row.newValues).length > 0;
        if (!hasOld && !hasNew) {
          return <span className="text-xs text-gray-400">-</span>;
        }
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(row.id);
            }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            {expandedIds.has(row.id) ? 'Masquer' : 'Voir les details'}
          </button>
        );
      },
    },
  ];

  // Custom row rendering with expansion
  const dataWithExpanded = logs;

  return (
    <div>
      <PageHeader
        title="Journal d'audit"
        description="Consultez l'historique des actions administratives"
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <Select
                options={ACTION_OPTIONS}
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="w-44">
              <Select
                options={ENTITY_OPTIONS}
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Du"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(1);
                }}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Au"
              />
            </div>
          </div>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={dataWithExpanded}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher dans les logs..."
          onRowClick={(row) => toggleExpanded(row.id)}
          emptyMessage="Aucun log d'audit trouve"
        />

        {/* Expanded detail rows */}
        {!loading && logs.filter((l) => expandedIds.has(l.id)).length > 0 && (
          <div className="mt-4 space-y-4">
            {logs
              .filter((l) => expandedIds.has(l.id))
              .map((log) => (
                <div
                  key={`detail-${log.id}`}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Details - {log.action} sur {log.entityType} ({String(log.entityId).slice(0, 8)}...)
                    </h4>
                    <button
                      onClick={() => toggleExpanded(log.id)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <JsonViewer label="Anciennes valeurs" data={log.oldValues} />
                    <JsonViewer label="Nouvelles valeurs" data={log.newValues} />
                  </div>
                  {!log.oldValues && !log.newValues && log.metadata && (
                    <JsonViewer label="Metadata" data={log.metadata} />
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
