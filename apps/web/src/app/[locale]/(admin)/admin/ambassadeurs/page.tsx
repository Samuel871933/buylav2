'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Eye, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/data/status-badge';
import { API_URL } from '@/lib/constants';

interface Ambassador {
  id: string;
  name: string;
  email: string;
  tier: string;
  salesCount: number;
  referralsCount: number;
  createdAt: string;
  status: string;
  totalEarnings?: number;
  phone?: string;
  iban?: string;
}

type TierKey = 'beginner' | 'actif' | 'performant' | 'expert' | 'elite';

const TIER_CONFIG: Record<TierKey, { label: string; variant: 'default' | 'info' | 'success' | 'primary' | 'warning' }> = {
  beginner: { label: 'Debutant', variant: 'default' },
  actif: { label: 'Actif', variant: 'info' },
  performant: { label: 'Performant', variant: 'success' },
  expert: { label: 'Expert', variant: 'primary' },
  elite: { label: 'Elite', variant: 'warning' },
};

const TIER_FILTER_OPTIONS = [
  { value: '', label: 'Tous les paliers' },
  { value: 'beginner', label: 'Debutant' },
  { value: 'actif', label: 'Actif' },
  { value: 'performant', label: 'Performant' },
  { value: 'expert', label: 'Expert' },
  { value: 'elite', label: 'Elite' },
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

export default function AdminAmbassadeursPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');

  // Detail panel
  const [selectedAmbassador, setSelectedAmbassador] = useState<Ambassador | null>(null);

  // Fetch data
  const fetchAmbassadors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (tierFilter) params.set('tier', tierFilter);
      const json = await fetchAdmin(`/api/admin/ambassadors?${params}`);
      const result = json.data ?? json;
      setAmbassadors(Array.isArray(result) ? result : result.ambassadors ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setAmbassadors([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, tierFilter]);

  useEffect(() => {
    fetchAmbassadors();
  }, [fetchAmbassadors]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Export CSV
  const handleExport = useCallback(async () => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/api/admin/export/ambassadeurs`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'ambassadeurs.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    }
  }, []);

  // Tier badge helper
  function renderTierBadge(tier: string) {
    const key = tier.toLowerCase() as TierKey;
    const config = TIER_CONFIG[key] ?? { label: tier, variant: 'default' as const };
    return (
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    );
  }

  // Columns
  const columns: Column<Ambassador>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      render: (_v, row) => (
        <div>
          <span className="font-medium text-gray-900">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (v) => <span className="text-gray-600">{v}</span>,
    },
    {
      key: 'tier',
      header: 'Palier',
      sortable: true,
      render: (v) => renderTierBadge(v),
    },
    {
      key: 'salesCount',
      header: 'Ventes',
      sortable: true,
      render: (v) => <span className="font-medium">{v?.toLocaleString('fr-FR') ?? 0}</span>,
    },
    {
      key: 'referralsCount',
      header: 'Filleuls',
      sortable: true,
      render: (v) => <span>{v?.toLocaleString('fr-FR') ?? 0}</span>,
    },
    {
      key: 'createdAt',
      header: 'Inscrit le',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (v) => <StatusBadge status={v ?? 'pending'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_v, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSelectedAmbassador(row)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Voir le detail"
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
        title="Ambassadeurs"
        description="Consultez et gerez les ambassadeurs de la plateforme"
        actions={
          <div className="flex items-center gap-3">
            <div className="w-44">
              <Select
                options={TIER_FILTER_OPTIONS}
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
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
          data={ambassadors}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher par nom ou email..."
          onExport={handleExport}
          onRowClick={(row) => setSelectedAmbassador(row)}
          emptyMessage="Aucun ambassadeur trouve"
        />
      </div>

      {/* Ambassador Detail Modal */}
      <Modal
        isOpen={!!selectedAmbassador}
        onClose={() => setSelectedAmbassador(null)}
        title="Detail ambassadeur"
        size="lg"
      >
        {selectedAmbassador && (
          <div className="space-y-6">
            {/* Identity */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedAmbassador.name}
                </h3>
                <p className="text-sm text-gray-500">{selectedAmbassador.email}</p>
                {selectedAmbassador.phone && (
                  <p className="text-sm text-gray-500">{selectedAmbassador.phone}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {renderTierBadge(selectedAmbassador.tier)}
                <StatusBadge status={selectedAmbassador.status ?? 'pending'} />
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Card className="!p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedAmbassador.salesCount?.toLocaleString('fr-FR') ?? 0}
                </p>
                <p className="text-xs text-gray-500">Ventes</p>
              </Card>
              <Card className="!p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {selectedAmbassador.referralsCount?.toLocaleString('fr-FR') ?? 0}
                </p>
                <p className="text-xs text-gray-500">Filleuls</p>
              </Card>
              <Card className="!p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatEuro(selectedAmbassador.totalEarnings ?? 0)}
                </p>
                <p className="text-xs text-gray-500">Gains totaux</p>
              </Card>
              <Card className="!p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {formatDate(selectedAmbassador.createdAt)}
                </p>
                <p className="text-xs text-gray-500">Inscription</p>
              </Card>
            </div>

            {/* IBAN */}
            {selectedAmbassador.iban && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">IBAN</p>
                <p className="font-mono text-sm text-gray-700">
                  {selectedAmbassador.iban}
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedAmbassador(null)}
              >
                <X className="h-4 w-4" />
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
