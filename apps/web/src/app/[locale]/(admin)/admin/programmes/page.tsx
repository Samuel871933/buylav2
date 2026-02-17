'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Programme {
  id: string;
  name: string;
  network: string;
  buyerCashbackPercent: number;
  reconciliationMethod: string;
  status: string;
  createdAt: string;
}

type FormData = {
  name: string;
  network: string;
  buyerCashbackPercent: string;
  reconciliationMethod: string;
};

const EMPTY_FORM: FormData = {
  name: '',
  network: '',
  buyerCashbackPercent: '',
  reconciliationMethod: 'postback',
};

const NETWORK_OPTIONS = [
  { value: 'awin', label: 'Awin' },
  { value: 'tradedoubler', label: 'Tradedoubler' },
  { value: 'cj', label: 'CJ Affiliate' },
  { value: 'impact', label: 'Impact' },
  { value: 'rakuten', label: 'Rakuten' },
  { value: 'other', label: 'Autre' },
];

const RECONCILIATION_OPTIONS = [
  { value: 'postback', label: 'Postback' },
  { value: 'api', label: 'API' },
  { value: 'csv', label: 'CSV Import' },
  { value: 'manual', label: 'Manuel' },
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
  const [confirmDeactivate, setConfirmDeactivate] = useState<Programme | null>(null);

  // Fetch data
  const fetchProgrammes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const json = await fetchAdmin(`/api/admin/programmes?${params}`);
      const result = json.data ?? json;
      setProgrammes(Array.isArray(result) ? result : result.programmes ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
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
      name: p.name,
      network: p.network,
      buyerCashbackPercent: String(p.buyerCashbackPercent),
      reconciliationMethod: p.reconciliationMethod,
    });
    setModalOpen(true);
  }, []);

  // Save (create or update)
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({
        name: form.name,
        network: form.network,
        buyerCashbackPercent: parseFloat(form.buyerCashbackPercent) || 0,
        reconciliationMethod: form.reconciliationMethod,
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
      fetchProgrammes();
    } catch {
      // Error handling - keep modal open
    } finally {
      setSaving(false);
    }
  }, [form, editingProgramme, fetchProgrammes]);

  // Deactivate / Activate
  const handleDeactivate = useCallback(async (p: Programme) => {
    try {
      const newStatus = p.status === 'active' ? 'inactive' : 'active';
      await fetchAdmin(`/api/admin/programmes/${p.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      fetchProgrammes();
    } catch {
      // Silently fail
    } finally {
      setConfirmDeactivate(null);
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
        <span className="font-medium text-gray-900">{row.name}</span>
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
      key: 'buyerCashbackPercent',
      header: 'Cashback acheteur %',
      sortable: true,
      render: (v) => <span>{v}%</span>,
    },
    {
      key: 'reconciliationMethod',
      header: 'Reconciliation',
      render: (v) => (
        <Badge variant="default" size="sm">
          {v}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (v) => (
        <Badge variant={v === 'active' ? 'success' : 'default'} size="sm">
          {v === 'active' ? 'Actif' : 'Inactif'}
        </Badge>
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
        title="Programmes"
        description="Gérez les programmes d'affiliation"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau programme
          </Button>
        }
      />

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
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex: Amazon FR"
          />
          <Select
            label="Reseau"
            options={NETWORK_OPTIONS}
            value={form.network}
            onChange={(e) => setForm({ ...form, network: e.target.value })}
            placeholder="Choisir un reseau"
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

      {/* Confirm Deactivate Modal */}
      <Modal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={confirmDeactivate?.status === 'active' ? 'Desactiver le programme' : 'Activer le programme'}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {confirmDeactivate?.status === 'active'
            ? `Voulez-vous desactiver le programme "${confirmDeactivate?.name}" ? Il ne sera plus visible pour les ambassadeurs.`
            : `Voulez-vous reactiver le programme "${confirmDeactivate?.name}" ?`}
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
