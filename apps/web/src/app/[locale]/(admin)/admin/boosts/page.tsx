'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Power, Pencil, Zap } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Boost {
  id: string;
  type: string;
  valuePercent: number;
  ambassadorId?: string | null;
  ambassadorName?: string | null;
  startDate: string;
  endDate: string;
  usageCount: number;
  maxUsage?: number | null;
  status: string;
  createdAt: string;
}

interface AmbassadorOption {
  id: string;
  name: string;
}

type FormData = {
  type: string;
  valuePercent: string;
  ambassadorId: string;
  startDate: string;
  endDate: string;
  maxUsage: string;
};

const EMPTY_FORM: FormData = {
  type: 'commission',
  valuePercent: '',
  ambassadorId: '',
  startDate: '',
  endDate: '',
  maxUsage: '',
};

const BOOST_TYPE_OPTIONS = [
  { value: 'commission', label: 'Commission' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'referral', label: 'Parrainage' },
];

function getBoostTypeLabel(type: string): string {
  switch (type) {
    case 'commission': return 'Commission';
    case 'cashback': return 'Cashback';
    case 'referral': return 'Parrainage';
    default: return type;
  }
}

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminBoostsPage() {
  const [boosts, setBoosts] = useState<Boost[]>([]);
  const [ambassadors, setAmbassadors] = useState<AmbassadorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBoost, setEditingBoost] = useState<Boost | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Boost | null>(null);

  // Fetch ambassadors for select
  useEffect(() => {
    fetchAdmin('/api/admin/ambassadors?limit=200')
      .then((json) => {
        const list = json.data?.ambassadors ?? json.data ?? json.ambassadors ?? json ?? [];
        setAmbassadors(
          (Array.isArray(list) ? list : []).map((a: Record<string, unknown>) => ({
            id: a.id as string,
            name: a.name as string,
          })),
        );
      })
      .catch(() => setAmbassadors([]));
  }, []);

  // Fetch boosts
  const fetchBoosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const json = await fetchAdmin(`/api/admin/boosts?${params}`);
      const result = json.data ?? json;
      setBoosts(Array.isArray(result) ? result : result.boosts ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setBoosts([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchBoosts();
  }, [fetchBoosts]);

  // Open create modal
  const openCreate = useCallback(() => {
    setEditingBoost(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  // Open edit modal
  const openEdit = useCallback((b: Boost) => {
    setEditingBoost(b);
    setForm({
      type: b.type,
      valuePercent: String(b.valuePercent),
      ambassadorId: b.ambassadorId ?? '',
      startDate: b.startDate ? b.startDate.slice(0, 10) : '',
      endDate: b.endDate ? b.endDate.slice(0, 10) : '',
      maxUsage: b.maxUsage != null ? String(b.maxUsage) : '',
    });
    setModalOpen(true);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({
        type: form.type,
        valuePercent: parseFloat(form.valuePercent) || 0,
        ambassadorId: form.ambassadorId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        maxUsage: form.maxUsage ? parseInt(form.maxUsage, 10) : null,
      });

      if (editingBoost) {
        await fetchAdmin(`/api/admin/boosts/${editingBoost.id}`, {
          method: 'PUT',
          body,
        });
      } else {
        await fetchAdmin('/api/admin/boosts', {
          method: 'POST',
          body,
        });
      }

      setModalOpen(false);
      fetchBoosts();
    } catch {
      // Keep modal open
    } finally {
      setSaving(false);
    }
  }, [form, editingBoost, fetchBoosts]);

  // Deactivate / Activate
  const handleDeactivate = useCallback(
    async (b: Boost) => {
      try {
        const newStatus = b.status === 'active' ? 'inactive' : 'active';
        await fetchAdmin(`/api/admin/boosts/${b.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        fetchBoosts();
      } catch {
        // Silently fail
      } finally {
        setConfirmDeactivate(null);
      }
    },
    [fetchBoosts],
  );

  // Boost status helper
  function getBoostStatus(boost: Boost): { label: string; variant: 'success' | 'default' | 'warning' | 'danger' } {
    if (boost.status === 'inactive') return { label: 'Inactif', variant: 'default' };
    const now = new Date();
    const start = new Date(boost.startDate);
    const end = new Date(boost.endDate);
    if (now < start) return { label: 'Planifie', variant: 'warning' };
    if (now > end) return { label: 'Expire', variant: 'danger' };
    return { label: 'Actif', variant: 'success' };
  }

  // Ambassador select options
  const ambassadorOptions = [
    { value: '', label: 'Global (tous)' },
    ...ambassadors.map((a) => ({ value: a.id, label: a.name })),
  ];

  // Columns
  const columns: Column<Boost>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1.5 font-medium text-gray-900">
          <Zap className="h-3.5 w-3.5 text-amber-500" />
          {getBoostTypeLabel(v)}
        </span>
      ),
    },
    {
      key: 'valuePercent',
      header: 'Valeur %',
      sortable: true,
      render: (v) => (
        <span className="font-semibold text-primary-600">+{v}%</span>
      ),
    },
    {
      key: 'ambassadorName',
      header: 'Ambassadeur',
      render: (v) =>
        v ? (
          <span>{v}</span>
        ) : (
          <Badge variant="info" size="sm">
            Global
          </Badge>
        ),
    },
    {
      key: 'startDate',
      header: 'Debut',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'endDate',
      header: 'Fin',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDate(v)}</span>,
    },
    {
      key: 'usageCount',
      header: 'Utilisations',
      sortable: true,
      render: (v, row) => (
        <span className="text-gray-700">
          {v?.toLocaleString('fr-FR') ?? 0}
          {row.maxUsage != null && (
            <span className="text-gray-400"> / {row.maxUsage}</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (_v, row) => {
        const s = getBoostStatus(row);
        return (
          <Badge variant={s.variant} size="sm">
            {s.label}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_v, row) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openEdit(row)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setConfirmDeactivate(row)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-amber-600"
            title={row.status === 'active' ? 'Desactiver' : 'Activer'}
          >
            <Power className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Boosts"
        description="Gérez les bonus temporaires de commission et cashback"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau boost
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={boosts}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          emptyMessage="Aucun boost trouve"
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBoost ? 'Modifier le boost' : 'Nouveau boost'}
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Type de boost"
            options={BOOST_TYPE_OPTIONS}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
          <Input
            label="Valeur du boost (%)"
            type="number"
            value={form.valuePercent}
            onChange={(e) => setForm({ ...form, valuePercent: e.target.value })}
            placeholder="Ex: 10"
            min="0"
            max="100"
            step="0.5"
          />
          <Select
            label="Ambassadeur (vide = global)"
            options={ambassadorOptions}
            value={form.ambassadorId}
            onChange={(e) => setForm({ ...form, ambassadorId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date de debut"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label="Date de fin"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <Input
            label="Nombre max d'utilisations (vide = illimite)"
            type="number"
            value={form.maxUsage}
            onChange={(e) => setForm({ ...form, maxUsage: e.target.value })}
            placeholder="Ex: 100"
            min="0"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editingBoost ? 'Enregistrer' : 'Creer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Deactivate Modal */}
      <Modal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={confirmDeactivate?.status === 'active' ? 'Desactiver le boost' : 'Activer le boost'}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {confirmDeactivate?.status === 'active'
            ? `Voulez-vous desactiver ce boost de +${confirmDeactivate?.valuePercent}% ${getBoostTypeLabel(confirmDeactivate?.type ?? '')} ?`
            : `Voulez-vous reactiver ce boost de +${confirmDeactivate?.valuePercent}% ${getBoostTypeLabel(confirmDeactivate?.type ?? '')} ?`}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setConfirmDeactivate(null)}>
            Annuler
          </Button>
          <Button
            variant={confirmDeactivate?.status === 'active' ? 'danger' : 'primary'}
            size="sm"
            onClick={() => confirmDeactivate && handleDeactivate(confirmDeactivate)}
          >
            {confirmDeactivate?.status === 'active' ? 'Desactiver' : 'Activer'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
