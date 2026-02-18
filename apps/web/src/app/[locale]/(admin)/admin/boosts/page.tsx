'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Zap, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Boost {
  id: string;
  type: string;
  boost_value: number;
  valuePercent?: number;
  user_id?: string | null;
  ambassadorId?: string | null;
  user?: { id: string; firstname: string; lastname: string; email: string } | null;
  ambassadorName?: string | null;
  start_date: string;
  startDate?: string;
  end_date?: string | null;
  endDate?: string;
  usage_count: number;
  usageCount?: number;
  max_uses?: number | null;
  maxUsage?: number | null;
  is_active: boolean;
  status?: string;
  created_at?: string;
  createdAt?: string;
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

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM: FormData = {
  type: 'ambassador_rate',
  valuePercent: '',
  ambassadorId: '',
  startDate: todayStr(),
  endDate: '',
  maxUsage: '',
};

const BOOST_TYPE_OPTIONS = [
  { value: 'ambassador_rate', label: 'Commission' },
  { value: 'buyer_cashback', label: 'Cashback' },
  { value: 'sponsor_rate', label: 'Parrainage' },
];

function getBoostTypeLabel(type: string): string {
  switch (type) {
    case 'ambassador_rate':
    case 'commission': return 'Commission';
    case 'buyer_cashback':
    case 'cashback': return 'Cashback';
    case 'sponsor_rate':
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

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Boost | null>(null);

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
  const fetchBoosts = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const json = await fetchAdmin(`/api/admin/boosts?${params}`);
      const result = json.data ?? json;
      setBoosts(Array.isArray(result) ? result : result.boosts ?? []);
      const pag = json.pagination ?? result;
      setTotalPages(pag.totalPages ?? 1);
      setTotal(pag.total ?? (Array.isArray(result) ? result.length : 0));
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
    setForm({ ...EMPTY_FORM, startDate: todayStr() });
    setModalOpen(true);
  }, []);

  // Open edit modal
  const openEdit = useCallback((b: Boost) => {
    setEditingBoost(b);
    const startStr = b.start_date || b.startDate || '';
    const endStr = b.end_date || b.endDate || '';
    const maxVal = b.max_uses ?? b.maxUsage;
    setForm({
      type: b.type,
      valuePercent: String(b.boost_value ?? b.valuePercent ?? 0),
      ambassadorId: b.user_id || b.ambassadorId || '',
      startDate: startStr ? startStr.slice(0, 10) : '',
      endDate: endStr ? endStr.slice(0, 10) : '',
      maxUsage: maxVal != null ? String(maxVal) : '',
    });
    setModalOpen(true);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({
        type: form.type,
        boost_value: parseFloat(form.valuePercent) || 0,
        user_id: form.ambassadorId || null,
        start_date: form.startDate || todayStr(),
        end_date: form.endDate || null,
        max_uses: form.maxUsage ? parseInt(form.maxUsage, 10) : null,
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
      fetchBoosts(true);
    } catch {
      // Keep modal open
    } finally {
      setSaving(false);
    }
  }, [form, editingBoost, fetchBoosts]);

  // Toggle active / inactive (optimistic update)
  const handleToggleStatus = useCallback(
    async (b: Boost) => {
      const newValue = !b.is_active;
      // Optimistic: update local state immediately
      setBoosts((prev) =>
        prev.map((item) => (item.id === b.id ? { ...item, is_active: newValue } : item)),
      );
      try {
        await fetchAdmin(`/api/admin/boosts/${b.id}`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: newValue }),
        });
      } catch {
        // Rollback on error
        setBoosts((prev) =>
          prev.map((item) => (item.id === b.id ? { ...item, is_active: !newValue } : item)),
        );
      }
    },
    [],
  );

  // Delete
  const handleDelete = useCallback(async (b: Boost) => {
    setBoosts((prev) => prev.filter((item) => item.id !== b.id));
    setDeleteTarget(null);
    try {
      await fetchAdmin(`/api/admin/boosts/${b.id}`, { method: 'DELETE' });
    } catch {
      fetchBoosts(true);
    }
  }, [fetchBoosts]);

  // Boost status helper
  function getBoostStatus(boost: Boost): { label: string; variant: 'success' | 'default' | 'warning' | 'danger' } {
    if (!boost.is_active) return { label: 'Inactif', variant: 'default' };
    const now = new Date();
    const startStr = boost.start_date || boost.startDate;
    const endStr = boost.end_date || boost.endDate;
    if (startStr) {
      const start = new Date(startStr);
      if (now < start) return { label: 'Planifie', variant: 'warning' };
    }
    if (endStr) {
      const end = new Date(endStr);
      if (now > end) return { label: 'Expire', variant: 'danger' };
    }
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
      key: 'boost_value',
      header: 'Valeur %',
      sortable: true,
      render: (v, row) => (
        <span className="font-semibold text-primary-600">+{v ?? row.valuePercent ?? 0}%</span>
      ),
    },
    {
      key: 'user',
      header: 'Ambassadeur',
      render: (_v, row) => {
        const userName = row.user
          ? `${row.user.firstname || ''} ${row.user.lastname || ''}`.trim() || row.user.email
          : row.ambassadorName;
        return userName ? (
          <span>{userName}</span>
        ) : (
          <Badge variant="info" size="sm">
            Global
          </Badge>
        );
      },
    },
    {
      key: 'start_date',
      header: 'Debut',
      sortable: true,
      render: (v, row) => <span className="text-gray-500">{formatDate(v || row.startDate)}</span>,
    },
    {
      key: 'end_date',
      header: 'Fin',
      sortable: true,
      render: (v, row) => {
        const d = v || row.endDate;
        return d ? <span className="text-gray-500">{formatDate(d)}</span> : <span className="text-gray-400">-</span>;
      },
    },
    {
      key: 'usage_count',
      header: 'Utilisations',
      sortable: true,
      render: (v, row) => {
        const count = v ?? row.usageCount ?? 0;
        const max = row.max_uses ?? row.maxUsage;
        return (
          <span className="text-gray-700">
            {count?.toLocaleString('fr-FR') ?? 0}
            {max != null && (
              <span className="text-gray-400"> / {max}</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'is_active',
      header: 'Actif',
      render: (_v, row) => {
        const s = getBoostStatus(row);
        const isExpiredOrPlanned = s.label === 'Expire' || s.label === 'Planifie';
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Toggle
              checked={!!row.is_active}
              onChange={() => handleToggleStatus(row)}
            />
            {isExpiredOrPlanned && (
              <Badge variant={s.variant} size="sm">
                {s.label}
              </Badge>
            )}
          </div>
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
            onClick={() => setDeleteTarget(row)}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
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

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Voulez-vous vraiment supprimer le boost{' '}
            <strong>{deleteTarget ? `${getBoostTypeLabel(deleteTarget.type)} +${deleteTarget.boost_value ?? deleteTarget.valuePercent ?? 0}%` : ''}</strong> ?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>
              Annuler
            </Button>
            <Button variant="danger" size="sm" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Supprimer
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
