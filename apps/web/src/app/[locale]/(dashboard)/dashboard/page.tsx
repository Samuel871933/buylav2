'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  MousePointerClick,
  Eye,
  Clock,
  CircleCheck,
  Copy,
  Check,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { API_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stats {
  clicks_today: number;
  visits_today: number;
  pending_earnings: number;
  confirmed_earnings: number;
  total_clicks: number;
  total_visits: number;
  current_tier: string;
  referral_code: string;
  name: string;
}

interface ChartPoint {
  date: string;
  clicks: number;
  visits: number;
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

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
        <div className="flex-1">
          <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-7 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function InfoCardSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200" />
      <div className="mt-2 h-6 w-28 animate-pulse rounded bg-gray-200" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 h-5 w-56 animate-pulse rounded bg-gray-200" />
      <div className="h-[300px] w-full animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  gradient: string;
}

function StatCard({ icon, label, value, gradient }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${gradient}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  clicksLabel: string;
  visitsLabel: string;
}

function CustomChartTooltip({
  active,
  payload,
  label,
  clicksLabel,
  visitsLabel,
}: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1.5 text-xs font-medium text-gray-500">
        {label ? formatDateShort(label) : ''}
      </p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center gap-2 text-sm"
        >
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">
            {entry.name === 'clicks' ? clicksLabel : visitsLabel}:
          </span>
          <span className="font-semibold text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const t = useTranslations('dashboard');

  // State
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Fetch data
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const token = getAuthToken();
      if (!token) {
        setError('No auth token');
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      try {
        const [statsRes, chartRes] = await Promise.all([
          fetch(`${API_URL}/api/ambassador/stats`, { headers }),
          fetch(`${API_URL}/api/ambassador/chart?days=30`, { headers }),
        ]);

        if (!cancelled) {
          if (statsRes.ok) {
            const statsJson = await statsRes.json();
            setStats(statsJson.data ?? statsJson);
          } else {
            setError('Failed to load stats');
          }

          if (chartRes.ok) {
            const chartJson = await chartRes.json();
            setChartData(chartJson.data ?? chartJson ?? []);
          }

          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError('Network error');
          setLoading(false);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Copy referral code
  const handleCopyCode = useCallback(async () => {
    if (!stats?.referral_code) return;
    try {
      await navigator.clipboard.writeText(stats.referral_code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback
      const el = document.createElement('textarea');
      el.value = stats.referral_code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  }, [stats?.referral_code]);

  // ---- Loading state ----
  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="flex flex-col gap-1">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-1 h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>

        {/* Stat cards skeleton */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        {/* Info cards skeleton */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCardSkeleton />
          <InfoCardSkeleton />
          <InfoCardSkeleton />
          <InfoCardSkeleton />
        </div>

        {/* Chart skeleton */}
        <div className="mt-8">
          <ChartSkeleton />
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (error && !stats) {
    return (
      <div>
        <PageHeader
          title={t('welcome', { name: 'Ambassadeur' })}
          description="Vue d'ensemble de votre activit\u00e9"
        />
        <div className="mt-12">
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title={t('noData')}
          />
        </div>
      </div>
    );
  }

  // ---- Main render ----
  const name = stats?.name || 'Ambassadeur';

  return (
    <div>
      <PageHeader
        title={t('welcome', { name })}
        description="Vue d'ensemble de votre activit\u00e9"
      />

      {/* ── Primary stat cards ── */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
        <StatCard
          icon={<MousePointerClick className="h-5 w-5" />}
          label={t('clicksToday')}
          value={stats?.clicks_today ?? 0}
          gradient="bg-gradient-to-br from-primary-500 to-primary-700"
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label={t('visitsToday')}
          value={stats?.visits_today ?? 0}
          gradient="bg-gradient-to-br from-accent-500 to-accent-700"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label={t('pendingEarnings')}
          value={formatEuro(stats?.pending_earnings ?? 0)}
          gradient="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatCard
          icon={<CircleCheck className="h-5 w-5" />}
          label={t('confirmedEarnings')}
          value={formatEuro(stats?.confirmed_earnings ?? 0)}
          gradient="bg-gradient-to-br from-green-500 to-green-600"
        />
      </div>

      {/* ── Info cards row ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total clicks */}
        <Card>
          <p className="text-sm text-gray-500">{t('totalClicks')}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {(stats?.total_clicks ?? 0).toLocaleString('fr-FR')}
          </p>
        </Card>

        {/* Total visits */}
        <Card>
          <p className="text-sm text-gray-500">{t('totalVisits')}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {(stats?.total_visits ?? 0).toLocaleString('fr-FR')}
          </p>
        </Card>

        {/* Current tier */}
        <Card>
          <p className="text-sm text-gray-500">{t('currentTier')}</p>
          <div className="mt-1.5">
            <Badge variant="primary" size="md">
              {stats?.current_tier ?? '-'}
            </Badge>
          </div>
        </Card>

        {/* Referral code */}
        <Card>
          <p className="text-sm text-gray-500">{t('referralCodeLabel')}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <code className="rounded-md bg-gray-100 px-2.5 py-1 text-sm font-semibold text-primary-700">
              {stats?.referral_code ?? '-'}
            </code>
            <button
              onClick={handleCopyCode}
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label={t('clicksCopied')}
            >
              {codeCopied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            {codeCopied && (
              <span className="text-xs font-medium text-green-600">
                {t('clicksCopied')}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* ── Chart section ── */}
      <div className="mt-8">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            {t('chartTitle')}
          </h2>

          {chartData.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-6 w-6" />}
              title={t('noData')}
              className="!py-12"
            />
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="gradientClicks"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#8b5cf6"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#8b5cf6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="gradientVisits"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor="#3b82f6"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="#3b82f6"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateShort}
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    content={
                      <CustomChartTooltip
                        clicksLabel={t('chartClicks')}
                        visitsLabel={t('chartVisits')}
                      />
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#gradientClicks)"
                    name="clicks"
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#gradientVisits)"
                    name="visits"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Chart legend */}
          {chartData.length > 0 && (
            <div className="mt-4 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-primary-500" />
                <span className="text-sm text-gray-600">
                  {t('chartClicks')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full bg-accent-500" />
                <span className="text-sm text-gray-600">
                  {t('chartVisits')}
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
