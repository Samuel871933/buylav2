'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Users,
  ShoppingCart,
  Wallet,
  Coins,
  BarChart3,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { API_URL } from '@/lib/constants';

interface CommunityStats {
  totalAmbassadors: number;
  totalSales: number;
  totalCommissions: number;
  totalCashback: number;
  topPrograms: Array<{ name: string; count: number }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)buyla_token=([^;]*)/);
  if (match) return decodeURIComponent(match[1]);
  return typeof window !== 'undefined' ? localStorage.getItem('buyla_token') : null;
}

function formatEuro(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v);
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="flex-1">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-7 w-20 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CommunautePage() {
  const t = useTranslations('community');

  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setLoading(false); return; }

    fetch(`${API_URL}/api/ambassador/community-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        setStats(json?.data ?? json ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="mt-1 h-4 w-64 animate-pulse rounded bg-gray-200" />
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
          <StatSkeleton />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <PageHeader title={t('title')} description={t('description')} />
        <div className="mt-12">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title="Statistiques indisponibles"
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={t('title')} description={t('description')} />

      {/* Stats grid */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalAmbassadors')}</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {stats.totalAmbassadors.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalSales')}</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {stats.totalSales.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalCommissions')}</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(stats.totalCommissions)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('totalCashback')}</p>
              <p className="mt-0.5 text-2xl font-bold text-gray-900">
                {formatEuro(stats.totalCashback)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Programs */}
      {stats.topPrograms.length > 0 && (
        <Card className="mt-8">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('topPrograms')}</h2>
          <div className="space-y-3">
            {stats.topPrograms.map((prog, i) => {
              const maxCount = stats.topPrograms[0]?.count || 1;
              const pct = Math.round((prog.count / maxCount) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{prog.name}</span>
                    <span className="text-gray-500">{prog.count} ventes</span>
                  </div>
                  <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-400 to-accent-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
