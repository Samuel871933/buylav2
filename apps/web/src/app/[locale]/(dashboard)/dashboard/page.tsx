'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  Clock,
  CircleCheck,
  Wallet,
  MousePointerClick,
  Eye,
  ShoppingCart,
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
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { API_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stats {
  name: string;
  period: string;
  clicks: number;
  visits: number;
  conversions: number;
  total_amount: number;
  pending_earnings: number;
  confirmed_earnings: number;
  paid_earnings: number;
  total_sales: number;
  current_tier: string;
  referral_code: string;
}

interface ChartPoint {
  date: string;
  clicks: number;
  visits: number;
  earnings: number;
  sponsor_earnings: number;
  sales: number;
  conversions: number;
}

type Period = 'today' | '7d' | '30d' | '90d' | '12m' | 'all';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('buyla_token');
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR').format(value);
}

// ---------------------------------------------------------------------------
// Period selector
// ---------------------------------------------------------------------------

const PERIODS: { key: Period; labelKey: string }[] = [
  { key: 'today', labelKey: 'periodToday' },
  { key: '7d', labelKey: 'period7d' },
  { key: '30d', labelKey: 'period30d' },
  { key: '90d', labelKey: 'period90d' },
  { key: '12m', labelKey: 'period12m' },
  { key: 'all', labelKey: 'periodAll' },
];

function PeriodSelector({
  value,
  onChange,
  t,
}: {
  value: Period;
  onChange: (p: Period) => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
      {PERIODS.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            value === p.key
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {t(p.labelKey)}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-gray-200" />
        </div>
        <div className="h-10 w-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
        <div className="mt-4 h-[300px] w-full animate-pulse rounded-lg bg-gray-100" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
}

function MetricCard({ icon, label, value, iconBg }: MetricCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-gray-500">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  t,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  t: (key: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const labelMap: Record<string, string> = {
    earnings: t('chartEarnings'),
    sponsor_earnings: t('chartSponsorEarnings'),
    sales: t('chartSales'),
    clicks: t('chartClicks'),
    visits: t('chartVisits'),
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-2 text-xs font-medium text-gray-500">
        {label ? formatDateShort(label) : ''}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{labelMap[entry.name] || entry.name}:</span>
          <span className="font-semibold text-gray-900">
            {entry.name === 'earnings' || entry.name === 'sponsor_earnings' || entry.name === 'sales'
              ? formatEuro(entry.value)
              : entry.value}
          </span>
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

  const [period, setPeriod] = useState<Period>(() => {
    if (typeof window === 'undefined') return '30d';
    const saved = localStorage.getItem('buyla_dashboard_period');
    if (saved && ['today', '7d', '30d', '90d', '12m', 'all'].includes(saved)) return saved as Period;
    return '30d';
  });
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [chartMetric, setChartMetric] = useState<'earnings' | 'clicks'>('earnings');

  // Fetch data
  const fetchData = useCallback(async (p: Period) => {
    const token = getAuthToken();
    if (!token) {
      setError('No auth token');
      setLoading(false);
      return;
    }

    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };

    try {
      const [statsRes, chartRes] = await Promise.all([
        fetch(`${API_URL}/api/ambassador/stats?period=${p}`, { headers }),
        fetch(`${API_URL}/api/ambassador/chart?period=${p}`, { headers }),
      ]);

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
    } catch {
      setError('Network error');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // Period change
  const handlePeriodChange = useCallback((p: Period) => {
    setPeriod(p);
    setLoading(true);
    localStorage.setItem('buyla_dashboard_period', p);
  }, []);

  // Copy referral code
  const handleCopyCode = useCallback(async () => {
    if (!stats?.referral_code) return;
    try {
      await navigator.clipboard.writeText(stats.referral_code);
    } catch {
      const el = document.createElement('textarea');
      el.value = stats.referral_code;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [stats?.referral_code]);

  // ── Loading ──
  if (loading && !stats) {
    return <DashboardSkeleton />;
  }

  // ── Error ──
  if (error && !stats) {
    return (
      <div className="mt-12">
        <EmptyState
          icon={<BarChart3 className="h-6 w-6" />}
          title={t('noData')}
        />
      </div>
    );
  }

  const name = stats?.name || 'Ambassadeur';

  return (
    <div>
      {/* ── Header + Period selector ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('welcome', { name })}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t('overview')}</p>
        </div>
        <PeriodSelector value={period} onChange={handlePeriodChange} t={t} />
      </div>

      {/* ── Tier + Referral code bar ── */}
      <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('currentTier')}</span>
          <Badge variant="primary" size="md" className="capitalize">
            {stats?.current_tier ?? '-'}
          </Badge>
        </div>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{t('referralCodeLabel')}</span>
          <code className="rounded-md bg-gray-100 px-2 py-0.5 text-sm font-semibold text-primary-700">
            {stats?.referral_code ?? '-'}
          </code>
          <button
            onClick={handleCopyCode}
            className="rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            {codeCopied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
          {codeCopied && (
            <span className="text-xs font-medium text-green-600">{t('clicksCopied')}</span>
          )}
        </div>
      </div>

      {/* ── KPI Cards Grid ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          icon={<TrendingUp className="h-5 w-5" />}
          label={t('totalSalesAmount')}
          value={formatEuro(stats?.total_amount ?? 0)}
          iconBg="bg-gradient-to-br from-primary-500 to-primary-700"
        />
        <MetricCard
          icon={<CircleCheck className="h-5 w-5" />}
          label={t('confirmedEarnings')}
          value={formatEuro(stats?.confirmed_earnings ?? 0)}
          iconBg="bg-gradient-to-br from-green-500 to-green-600"
        />
        <MetricCard
          icon={<Clock className="h-5 w-5" />}
          label={t('pendingEarnings')}
          value={formatEuro(stats?.pending_earnings ?? 0)}
          iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <MetricCard
          icon={<Wallet className="h-5 w-5" />}
          label={t('paidEarnings')}
          value={formatEuro(stats?.paid_earnings ?? 0)}
          iconBg="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <MetricCard
          icon={<ShoppingCart className="h-5 w-5" />}
          label={t('conversions')}
          value={formatNumber(stats?.conversions ?? 0)}
          iconBg="bg-gradient-to-br from-violet-500 to-violet-600"
        />
        <MetricCard
          icon={<MousePointerClick className="h-5 w-5" />}
          label={t('clicks')}
          value={formatNumber(stats?.clicks ?? 0)}
          iconBg="bg-gradient-to-br from-rose-500 to-rose-600"
        />
      </div>

      {/* ── Chart ── */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">{t('chartTitle')}</h2>
          {/* Chart metric toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              onClick={() => setChartMetric('earnings')}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                chartMetric === 'earnings'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('chartEarnings')}
            </button>
            <button
              onClick={() => setChartMetric('clicks')}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                chartMetric === 'clicks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('chartClicks')}
            </button>
          </div>
        </div>

        {chartData.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" />}
            title={t('noData')}
            className="!py-12"
          />
        ) : (
          <>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradEarnings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSponsor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                    width={50}
                    tickFormatter={(v) =>
                      chartMetric === 'earnings' ? `${v}€` : String(v)
                    }
                  />
                  <Tooltip
                    content={<ChartTooltip t={t} />}
                  />
                  {chartMetric === 'earnings' ? (
                    <>
                      <Area
                        type="monotone"
                        dataKey="earnings"
                        stroke="#22c55e"
                        strokeWidth={2.5}
                        fill="url(#gradEarnings)"
                        name="earnings"
                      />
                      <Area
                        type="monotone"
                        dataKey="sponsor_earnings"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fill="url(#gradSponsor)"
                        name="sponsor_earnings"
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fill="url(#gradSales)"
                        name="sales"
                      />
                    </>
                  ) : (
                    <>
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        fill="url(#gradClicks)"
                        name="clicks"
                      />
                      <Area
                        type="monotone"
                        dataKey="visits"
                        stroke="#3b82f6"
                        strokeWidth={1.5}
                        fill="url(#gradVisits)"
                        name="visits"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center gap-6">
              {chartMetric === 'earnings' ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-600">{t('chartEarnings')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                    <span className="text-sm text-gray-600">{t('chartSponsorEarnings')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-violet-500" />
                    <span className="text-sm text-gray-600">{t('chartSales')}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-violet-500" />
                    <span className="text-sm text-gray-600">{t('chartClicks')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-600">{t('chartVisits')}</span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
