'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, ExternalLink, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Toggle } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Portail {
  id: string;
  merchant_slug: string;
  slug?: string;
  display_name: string;
  name?: string;
  affiliate_program_id?: number;
  programmeId?: string;
  program?: { id: number; name: string; display_name: string; network: string };
  programmeName?: string;
  is_active: boolean;
  created_at?: string;
  createdAt?: string;
}

interface ProgrammeOption {
  id: string;
  name: string;
}

type FormData = {
  slug: string;
  name: string;
  programmeId: string;
};

const EMPTY_FORM: FormData = {
  slug: '',
  name: '',
  programmeId: '',
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminPortailsPage() {
  const [portails, setPortails] = useState<Portail[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPortail, setEditingPortail] = useState<Portail | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Portail | null>(null);

  // Fetch programmes for select
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

  // Fetch portails
  const fetchPortails = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const json = await fetchAdmin(`/api/admin/portails?${params}`);
      const result = json.data ?? json;
      setPortails(Array.isArray(result) ? result : result.portails ?? []);
      const pag = json.pagination ?? result;
      setTotalPages(pag.totalPages ?? 1);
      setTotal(pag.total ?? (Array.isArray(result) ? result.length : 0));
    } catch {
      setPortails([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPortails();
  }, [fetchPortails]);

  // Auto-generate slug from name
  const updateName = useCallback(
    (name: string) => {
      const slug = !editingPortail
        ? name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
        : form.slug;
      setForm((prev) => ({ ...prev, name, slug }));
    },
    [editingPortail, form.slug],
  );

  // Open create modal
  const openCreate = useCallback(() => {
    setEditingPortail(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  // Open edit modal
  const openEdit = useCallback((p: Portail) => {
    setEditingPortail(p);
    setForm({
      slug: p.merchant_slug || p.slug || '',
      name: p.display_name || p.name || '',
      programmeId: String(p.affiliate_program_id || p.programmeId || ''),
    });
    setModalOpen(true);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    if (!form.programmeId) return;
    setSaving(true);
    try {
      const body = JSON.stringify({
        merchant_slug: form.slug,
        display_name: form.name,
        affiliate_program_id: Number(form.programmeId),
      });

      if (editingPortail) {
        await fetchAdmin(`/api/admin/portails/${editingPortail.id}`, {
          method: 'PUT',
          body,
        });
      } else {
        await fetchAdmin('/api/admin/portails', {
          method: 'POST',
          body,
        });
      }

      setModalOpen(false);
      fetchPortails(true);
    } catch {
      // Keep modal open on error
    } finally {
      setSaving(false);
    }
  }, [form, editingPortail, fetchPortails]);

  // Toggle active / inactive (optimistic update)
  const handleToggleStatus = useCallback(
    async (p: Portail) => {
      const newValue = !p.is_active;
      // Optimistic: update local state immediately
      setPortails((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, is_active: newValue } : item)),
      );
      try {
        await fetchAdmin(`/api/admin/portails/${p.id}`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: newValue }),
        });
      } catch {
        // Rollback on error
        setPortails((prev) =>
          prev.map((item) => (item.id === p.id ? { ...item, is_active: !newValue } : item)),
        );
      }
    },
    [],
  );

  // Delete
  const handleDelete = useCallback(async (p: Portail) => {
    setPortails((prev) => prev.filter((item) => item.id !== p.id));
    setDeleteTarget(null);
    try {
      await fetchAdmin(`/api/admin/portails/${p.id}`, { method: 'DELETE' });
    } catch {
      fetchPortails(true);
    }
  }, [fetchPortails]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Columns
  const columns: Column<Portail>[] = [
    {
      key: 'merchant_slug',
      header: 'Slug',
      sortable: true,
      render: (v, row) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-primary-600">
          <ExternalLink className="h-3 w-3" />
          {v || row.slug}
        </span>
      ),
    },
    {
      key: 'display_name',
      header: 'Nom',
      sortable: true,
      render: (_v, row) => (
        <span className="font-medium text-gray-900">{row.display_name || row.name}</span>
      ),
    },
    {
      key: 'program',
      header: 'Programme lie',
      render: (_v, row) => {
        const pName = row.program?.display_name || row.program?.name || row.programmeName;
        return pName || <span className="text-gray-400">-</span>;
      },
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
        title="Portails"
        description="Gérez les portails de redirection"
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau portail
          </Button>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={portails}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher un portail..."
          emptyMessage="Aucun portail trouve"
        />
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingPortail ? 'Modifier le portail' : 'Nouveau portail'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Nom"
            value={form.name}
            onChange={(e) => updateName(e.target.value)}
            placeholder="Ex: Amazon France"
          />
          <Input
            label="Slug"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="Ex: amazon-fr"
          />
          <Select
            label="Programme lie"
            options={programmes.map((p) => ({ value: p.id, label: p.name }))}
            value={form.programmeId}
            onChange={(e) => setForm({ ...form, programmeId: e.target.value })}
            placeholder="Choisir un programme"
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" loading={saving} onClick={handleSave}>
              {editingPortail ? 'Enregistrer' : 'Creer'}
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
            Voulez-vous vraiment supprimer le portail{' '}
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
