'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { API_URL } from '@/lib/constants';

interface Email {
  id: string;
  sentAt: string;
  recipient: string;
  template: string;
  subject: string;
  status: string;
  resendId?: string;
}

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'sent', label: 'Envoye' },
  { value: 'failed', label: 'Echoue' },
  { value: 'bounced', label: 'Rebondi' },
];

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'default' }> = {
  sent: { label: 'Envoye', variant: 'success' },
  delivered: { label: 'Delivre', variant: 'success' },
  failed: { label: 'Echoue', variant: 'danger' },
  bounced: { label: 'Rebondi', variant: 'warning' },
  pending: { label: 'En attente', variant: 'default' },
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
// Component
// ---------------------------------------------------------------------------

export default function AdminEmailsPage() {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [templateFilter, setTemplateFilter] = useState('');
  const [templateOptions, setTemplateOptions] = useState<{ value: string; label: string }[]>([]);

  // Fetch emails
  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (templateFilter) params.set('template', templateFilter);
      const json = await fetchAdmin(`/api/admin/emails?${params}`);
      const result = json.data ?? json;
      const emailList = Array.isArray(result) ? result : result.emails ?? [];
      setEmails(emailList);
      setTotalPages(result.totalPages ?? 1);
      setTotal(result.total ?? (Array.isArray(result) ? result.length : 0));

      // Extract unique templates for filter (from first fetch)
      if (templateOptions.length === 0) {
        const templates = result.templates ?? result.availableTemplates;
        if (Array.isArray(templates)) {
          setTemplateOptions([
            { value: '', label: 'Tous les templates' },
            ...templates.map((t: string) => ({ value: t, label: t })),
          ]);
        } else {
          // Build from data
          const uniqueTemplates = [...new Set(emailList.map((e: Email) => e.template).filter(Boolean))] as string[];
          if (uniqueTemplates.length > 0) {
            setTemplateOptions([
              { value: '', label: 'Tous les templates' },
              ...uniqueTemplates.map((t) => ({ value: t, label: t })),
            ]);
          }
        }
      }
    } catch {
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, templateFilter, templateOptions.length]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  // Search handler
  const handleSearch = useCallback((q: string) => {
    setSearch(q);
    setPage(1);
  }, []);

  // Export CSV
  const handleExport = useCallback(async () => {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (templateFilter) params.set('template', templateFilter);
      if (search) params.set('search', search);
      const res = await fetch(`${API_URL}/api/admin/export/emails?${params}`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'emails.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail
    }
  }, [statusFilter, templateFilter, search]);

  // Columns
  const columns: Column<Email>[] = [
    {
      key: 'sentAt',
      header: 'Date',
      sortable: true,
      render: (v) => <span className="text-gray-500">{formatDateTime(v)}</span>,
    },
    {
      key: 'recipient',
      header: 'Destinataire',
      sortable: true,
      render: (v) => <span className="font-medium text-gray-900">{v}</span>,
    },
    {
      key: 'template',
      header: 'Template',
      render: (v) => (
        <span className="inline-flex rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
          {v}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Sujet',
      render: (v) => (
        <span className="max-w-[200px] truncate text-sm text-gray-700" title={v}>
          {v}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (v) => {
        const config = STATUS_CONFIG[v] || { label: v, variant: 'default' as const };
        return (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        );
      },
    },
    {
      key: 'resendId',
      header: 'ID Resend',
      render: (v) => (
        <span className="font-mono text-xs text-gray-400">
          {v ? String(v).slice(0, 12) + '...' : '-'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Emails"
        description="Consultez l'historique des emails envoyes par la plateforme"
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
            {templateOptions.length > 1 && (
              <div className="w-48">
                <Select
                  options={templateOptions}
                  value={templateFilter}
                  onChange={(e) => {
                    setTemplateFilter(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </div>
        }
      />

      <div className="mt-6">
        <DataTable
          columns={columns}
          data={emails}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          onSearch={handleSearch}
          searchPlaceholder="Rechercher un email..."
          onExport={handleExport}
          emptyMessage="Aucun email trouve"
        />
      </div>
    </div>
  );
}
