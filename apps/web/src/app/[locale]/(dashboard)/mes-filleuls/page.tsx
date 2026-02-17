'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { DataTable, type Column } from '@/components/data/data-table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { API_URL, SITE_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReferralRow {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  total_sales: number;
  tier: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

function getAuthToken(): string | null {
  const fromCookie = getCookie('buyla_token');
  if (fromCookie) return fromCookie;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('buyla_token');
  }
  return null;
}

function formatEuro(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function MesFilleulsPage() {
  const t = useTranslations('referrals');

  // Data
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Extra stats
  const [level2Count, setLevel2Count] = useState(0);
  const [sponsorEarnings, setSponsorEarnings] = useState(0);

  // Referral code
  const [referralCode, setReferralCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch user stats for referral code
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    fetch(`${API_URL}/api/ambassador/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const code = json?.data?.stats?.referralCode || json?.data?.referralCode || '';
        setReferralCode(code);
      })
      .catch(() => {});
  }, []);

  // Fetch referrals
  const fetchReferrals = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/ambassador/referrals?page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        const json = await res.json();
        setReferrals(json.data ?? []);
        setTotalPages(json.pagination?.totalPages ?? 1);
        setTotal(json.pagination?.total ?? 0);
        setLevel2Count(json.level2Count ?? 0);
        setSponsorEarnings(json.totalSponsorEarnings ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Copy helpers
  const handleCopyCode = useCallback(async () => {
    if (!referralCode) return;
    await navigator.clipboard.writeText(referralCode).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [referralCode]);

  const handleCopyLink = useCallback(async () => {
    if (!referralCode) return;
    const link = `${SITE_URL}/rejoindre?ref=${referralCode}`;
    await navigator.clipboard.writeText(link).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [referralCode]);

  // Table columns
  const columns: Column<ReferralRow>[] = [
    {
      key: 'name',
      header: t('name'),
      sortable: true,
    },
    {
      key: 'email',
      header: t('email'),
      render: (v: string) => (
        <span className="text-gray-500">{v}</span>
      ),
    },
    {
      key: 'is_active',
      header: t('status'),
      render: (v: boolean) => (
        <Badge variant={v ? 'success' : 'default'} size="sm">
          {v ? t('active') : t('inactive')}
        </Badge>
      ),
    },
    {
      key: 'total_sales',
      header: t('sales'),
      sortable: true,
    },
    {
      key: 'tier',
      header: t('tier'),
      render: (v: string) => (
        <Badge variant="primary" size="sm">{v}</Badge>
      ),
    },
    {
      key: 'created_at',
      header: t('joinedAt'),
      sortable: true,
      render: (v: string) => formatDate(v),
    },
  ];

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      {/* Summary cards */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-stagger">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalReferrals')}</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('level2Count')}</p>
              <p className="text-2xl font-bold text-gray-900">{level2Count}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <span className="text-lg font-bold">€</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('sponsorEarnings')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatEuro(sponsorEarnings)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Invitation section */}
      <div className="mt-6 rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-accent-50 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">{t('inviteTitle')}</h3>
        <p className="mt-1 text-sm text-gray-600">{t('inviteDescription')}</p>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Invitation link */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('inviteLink')}</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                {referralCode ? `${SITE_URL}/rejoindre?ref=${referralCode}` : '...'}
              </code>
              <button
                onClick={handleCopyLink}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
              >
                {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Referral code */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">{t('inviteCode')}</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-primary-700">
                {referralCode || '...'}
              </code>
              <button
                onClick={handleCopyCode}
                className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
              >
                {codeCopied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-5">
          <h4 className="text-sm font-semibold text-gray-700">{t('howItWorks')}</h4>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            {[t('step1'), t('step2'), t('step3')].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-600">{step}</span>
                {i < 2 && <ArrowRight className="hidden h-4 w-4 text-gray-300 sm:block" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrals table */}
      <div className="mt-6">
        <h3 className="mb-3 text-lg font-semibold text-gray-900">{t('level1')}</h3>
        <DataTable
          columns={columns}
          data={referrals}
          loading={loading}
          pagination={{ page, totalPages, total }}
          onPageChange={setPage}
          emptyMessage={t('empty')}
        />
      </div>
    </div>
  );
}
