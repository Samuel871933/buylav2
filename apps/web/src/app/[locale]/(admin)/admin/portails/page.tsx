'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, ExternalLink } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Portail {
  id: string;
  slug: string;
  name: string;
  programmeId: string;
  programmeName?: string;
  status: string;
  createdAt: string;
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
  const [confirmDeactivate, setConfirmDeactivate] = useState<Portail | null>(null);

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
  const fetchPortails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const json = await fetchAdmin(`/api/admin/portails?${params}`);
      const result = json.data ?? json;
      setPortails(Array.isArray(result) ? result : result.portails ?? []);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));
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
      slug: p.slug,
      name: p.name,
      programmeId: p.programmeId,
    });
    setModalOpen(true);
  }, []);

  // Save
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const body = JSON.stringify({
        slug: form.slug,
        name: form.name,
        programmeId: form.programmeId,
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
      fetchPortails();
    } catch {
      // Keep modal open on error
    } finally {
      setSaving(false);
    }
  }, [form, editingPortail, fetchPortails]);

  // Deactivate / Activate
  const handleDeactivate = useCallback(
    async (p: Portail) => {
      try {
        const newStatus = p.status === 'active' ? 'inactive' : 'active';
        await fetchAdmin(`/api/admin/portails/${p.id}`, {
          method: 'PUT',
          body: JSON.stringify({ status: newStatus }),
        });
        fetchPortails();
      } catch {
        // Silently fail
      } finally {
        setConfirmDeactivate(null);
      }
    },
    [fetchPortails],
  );

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Columns
  const columns: Column<Portail>[] = [
    {
      key: 'slug',
      header: 'Slug',
      sortable: true,
      render: (v) => (
        <span className="inline-flex items-center gap-1 font-mono text-xs text-primary-600">
          <ExternalLink className="h-3 w-3" />
          {v}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Nom',
      sortable: true,
      render: (_v, row) => (
        <span className="font-medium text-gray-900">{row.name}</span>
      ),
    },
    {
      key: 'programmeName',
      header: 'Programme lie',
      render: (v) => v || <span className="text-gray-400">-</span>,
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

      {/* Confirm Deactivate Modal */}
      <Modal
        isOpen={!!confirmDeactivate}
        onClose={() => setConfirmDeactivate(null)}
        title={confirmDeactivate?.status === 'active' ? 'Desactiver le portail' : 'Activer le portail'}
        size="sm"
      >
        <p className="text-sm text-gray-600">
          {confirmDeactivate?.status === 'active'
            ? `Voulez-vous desactiver le portail "${confirmDeactivate?.name}" ?`
            : `Voulez-vous reactiver le portail "${confirmDeactivate?.name}" ?`}
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
