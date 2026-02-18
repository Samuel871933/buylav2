'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Programme {
  id: string;
  name: string;
  display_name?: string;
  network: string;
  url_template?: string;
  buyer_cashback_rate?: number;
  buyerCashbackPercent?: number;
  reconciliation_method?: string;
  reconciliationMethod?: string;
  is_active: boolean;
  createdAt?: string;
  created_at?: string;
}

type FormData = {
  displayName: string;
  network: string;
  urlTemplate: string;
  buyerCashbackPercent: string;
  reconciliationMethod: string;
};

const EMPTY_FORM: FormData = {
  displayName: '',
  network: 'awin',
  urlTemplate: '',
  buyerCashbackPercent: '',
  reconciliationMethod: 'postback',
};

const NETWORK_OPTIONS = [
  { value: 'awin', label: 'Awin' },
  { value: 'affilae', label: 'Affilae' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'amazon', label: 'Amazon' },
  { value: 'direct', label: 'Direct' },
  { value: 'custom', label: 'Autre' },
];

const RECONCILIATION_OPTIONS = [
  { value: 'postback', label: 'Postback' },
  { value: 'api_manual', label: 'API Manuel' },
  { value: 'api_scheduled', label: 'API Planifie' },
  { value: 'csv_import', label: 'CSV Import' },
  { value: 'stripe', label: 'Stripe' },
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
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || `API error: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgramme, setEditingProgramme] = useState<Programme | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Programme | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch data
  const fetchProgrammes = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const json = await fetchAdmin(`/api/admin/programmes?${params}`);
      const result = json.data ?? json;
      setProgrammes(Array.isArray(result) ? result : result.programmes ?? []);
      const pag = json.pagination ?? result;
      setTotalPages(pag.totalPages ?? 1);
      setTotal(pag.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setProgrammes([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchProgrammes();
  }, [fetchProgrammes]);

  // Open create modal
  const openCreate = useCallback(() => {
    setEditingProgramme(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  // Open edit modal
  const openEdit = useCallback((p: Programme) => {
    setEditingProgramme(p);
    setForm({
      displayName: p.display_name || p.name,
      network: p.network,
      urlTemplate: p.url_template || '',
      buyerCashbackPercent: String(p.buyer_cashback_rate ?? p.buyerCashbackPercent ?? 0),
      reconciliationMethod: p.reconciliation_method || p.reconciliationMethod || 'postback',
    });
    setModalOpen(true);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const slug = form.displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
      const body = JSON.stringify({
        name: slug,
        display_name: form.displayName,
        network: form.network,
        url_template: form.urlTemplate || `https://${slug}.example.com/?sub_id={sub_id}`,
        buyer_cashback_rate: parseFloat(form.buyerCashbackPercent) || 0,
        reconciliation_method: form.reconciliationMethod,
      });

      if (editingProgramme) {
        await fetchAdmin(`/api/admin/programmes/${editingProgramme.id}`, {
          method: 'PUT',
          body,
        });
      } else {
        await fetchAdmin('/api/admin/programmes', {
          method: 'POST',
          body,
        });
      }

      setModalOpen(false);
      fetchProgrammes(true);
    } catch {
      // Error handling - keep modal open
    } finally {
      setSaving(false);
    }
  }, [form, editingProgramme, fetchProgrammes]);

  // Toggle active / inactive (optimistic update)
  const handleToggleStatus = useCallback(async (p: Programme) => {
    const newValue = !p.is_active;
    // Optimistic: update local state immediately
    setProgrammes((prev) =>
      prev.map((item) => (item.id === p.id ? { ...item, is_active: newValue } : item)),
    );
    try {
      await fetchAdmin(`/api/admin/programmes/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: newValue }),
      });
    } catch {
      // Rollback on error
      setProgrammes((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: !newValue } : item)),
      );
    }
  }, []);

  // Delete
  const handleDelete = useCallback(async (p: Programme) => {
    setProgrammes((prev) => prev.filter((item) => item.id !== p.id));
    setDeleteTarget(null);
    try {
      await fetchAdmin(`/api/admin/programmes/${p.id}`, { method: 'DELETE' });
    } catch (err) {
      // Rollback + show error
      fetchProgrammes(true);
      setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    }
  }, [fetchProgrammes]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Columns
  const columns: Column<Programme>[] = [
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      render: (_v, row) => (
        <span className="font-medium text-gray-900">{row.display_name || row.name}</span>
      ),
    },
    {
      key: 'network',
      header: 'Reseau',
      sortable: true,
      render: (v) => (
        <span className="capitalize">{v}</span>
      ),
    },
    {
      key: 'buyer_cashback_rate',
      header: 'Cashback acheteur %',
      sortable: true,
      render: (v, row) => <span>{v ?? row.buyerCashbackPercent ?? 0}%</span>,
    },
    {
      key: 'reconciliation_method',
      header: 'Reconciliation',
      render: (v, row) => (
        <Badge variant="default" size="sm">
          {v || row.reconciliationMethod || '-'}
        </Badge>
      ),
    },
    {
      key: 'is_active',
      header: 'Actif',
      render: (_v, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle
            checked={!!row.is_active}
            onChange={() => handleToggleStatus(row)}
          />
        </div>
      ),
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
        title="Programmes"
        description="Gérez les programmes d'affiliation"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau programme
          </Button>
        }
      />

      {errorMessage && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{errorMessage}</p>
          <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={programmes}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher un programme..."
          emptyMessage="Aucun programme trouve"
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProgramme ? 'Modifier le programme' : 'Nouveau programme'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Nom du programme"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            placeholder="Ex: Amazon FR"
          />
          <Select
            label="Reseau"
            options={NETWORK_OPTIONS}
            value={form.network}
            onChange={(e) => setForm({ ...form, network: e.target.value })}
          />
          <Input
            label="URL Template"
            value={form.urlTemplate}
            onChange={(e) => setForm({ ...form, urlTemplate: e.target.value })}
            placeholder="Ex: https://www.awin1.com/cread.php?awinmid=1234&p={sub_id}"
          />
          <Input
            label="Cashback acheteur (%)"
            type="number"
            value={form.buyerCashbackPercent}
            onChange={(e) => setForm({ ...form, buyerCashbackPercent: e.target.value })}
            placeholder="Ex: 5"
            min="0"
            max="100"
            step="0.1"
          />
          <Select
            label="Methode de reconciliation"
            options={RECONCILIATION_OPTIONS}
            value={form.reconciliationMethod}
            onChange={(e) => setForm({ ...form, reconciliationMethod: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editingProgramme ? 'Enregistrer' : 'Creer'}
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
            Voulez-vous vraiment supprimer le programme{' '}
            <strong>{deleteTarget?.display_name || deleteTarget?.name}</strong> ?
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
