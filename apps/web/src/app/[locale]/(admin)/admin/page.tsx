'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  MousePointerClick,
  Eye,
  UserPlus,
  ShoppingCart,
  Download,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/data/stat-card';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/constants';

type Period = 'today' | '7d' | '30d' | '90d' | '12m' | 'all';

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'today', label: "Aujourd'hui" },
  { value: '7d', label: '7j' },
  { value: '30d', label: '30j' },
  { value: '90d', label: '90j' },
  { value: '12m', label: '12m' },
  { value: 'all', label: 'Tout' },
];

const CHART_COLORS = {
  revenue: '#8b5cf6',
  margin: '#22c55e',
  conversions: '#8b5cf6',
  ambassador: '#8b5cf6',
  sponsor: '#3b82f6',
  buyer: '#22c55e',
  platform: '#6b7280',
};

const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#14b8a6'];

const TIER_COLORS: Record<string, string> = {
  beginner: '#9ca3af',
  actif: '#3b82f6',
  performant: '#8b5cf6',
  expert: '#f59e0b',
  elite: '#ef4444',
};

const TIER_LABELS: Record<string, string> = {
  beginner: 'Debutant',
  actif: 'Actif',
  performant: 'Performant',
  expert: 'Expert',
  elite: 'Elite',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminStats {
  revenue?: number;
  revenueTrend?: number;
  commissions?: number;
  margin?: number;
  marginPercent?: number;
  salesToday?: number;
  salesTodayTrend?: number;
  clicksToday?: number;
  visitsToday?: number;
  activeAmbassadors?: number;
  newSignups?: number;
  newAmbassadors?: number;
  newBuyers?: number;
  topAmbassadors?: TopAmbassador[];
  tierDistribution?: TierEntry[];
}

interface TopAmbassador {
  name: string;
  sales: number;
  earnings: number;
  tier: string;
}

interface TierEntry {
  tier: string;
  count: number;
}

interface ChartData {
  revenueMargin?: RevenueMarginPoint[];
  dailySales?: DailySalesPoint[];
  programShare?: ProgramSharePoint[];
  redistribution?: RedistributionPoint[];
}

interface RevenueMarginPoint {
  date: string;
  revenue: number;
  margin: number;
}

interface DailySalesPoint {
  date: string;
  count: number;
}

interface ProgramSharePoint {
  name: string;
  value: number;
}

interface RedistributionPoint {
  date: string;
  ambassador: number;
  sponsor: number;
  buyer: number;
  platform: number;
}

interface Alert {
  id: string;
  message: string;
  priority: 'HAUTE' | 'MOYENNE' | 'BASSE';
  actionLabel?: string;
  actionUrl?: string;
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

function formatNumber(value: number): string {
  return value.toLocaleString('fr-FR');
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function getHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

// ---------------------------------------------------------------------------
// Custom Recharts Tooltip
// ---------------------------------------------------------------------------

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  formatter?: (value: number, name: string) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      {label && (
        <p className="mb-2 text-xs font-medium text-gray-500">
          {formatDateShort(label)}
        </p>
      )}
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-semibold text-gray-900">
            {formatter ? formatter(entry.value, entry.dataKey) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="text-sm font-medium text-gray-900">{entry?.payload?.name}</p>
      <p className="text-sm text-gray-600">{formatEuro(entry?.value ?? 0)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton components
// ---------------------------------------------------------------------------

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200 ${className ?? ''}`} />;
}

function DashboardSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-1">
        <SkeletonBlock className="h-8 w-64" />
        <SkeletonBlock className="mt-1 h-4 w-48" />
      </div>

      {/* Period selector skeleton */}
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-9 w-20 rounded-lg" />
        ))}
      </div>

      {/* Stat cards row 1 */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-32" />
            <SkeletonBlock className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Stat cards row 2 */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="h-3.5 w-24" />
            <SkeletonBlock className="mt-3 h-8 w-20" />
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <SkeletonBlock className="mb-4 h-5 w-48" />
            <SkeletonBlock className="h-[280px] w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Tables */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="mb-2 h-10 w-full" />
          ))}
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="mb-4 h-5 w-48" />
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="mb-3 h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export types for CSV downloads
// ---------------------------------------------------------------------------

type ExportType = 'conversions' | 'ambassadeurs' | 'payouts' | 'cashback';

const EXPORT_OPTIONS: { type: ExportType; label: string }[] = [
  { type: 'conversions', label: 'Export conversions' },
  { type: 'ambassadeurs', label: 'Export ambassadeurs' },
  { type: 'payouts', label: 'Export payouts' },
  { type: 'cashback', label: 'Export cashback' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<ExportType | null>(null);

  // Fetch all data
  const fetchData = useCallback(async (selectedPeriod: Period) => {
    setLoading(true);
    setError(null);

    const headers = getHeaders();

    try {
      const chartPeriod = selectedPeriod === 'today' || selectedPeriod === '7d' || selectedPeriod === 'all'
        ? '30d'
        : selectedPeriod;

      const [statsRes, chartsRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats?period=${selectedPeriod}`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/admin/charts?period=${chartPeriod}`, { headers }).catch(() => null),
        fetch(`${API_URL}/api/admin/alerts`, { headers }).catch(() => null),
      ]);

      if (statsRes?.ok) {
        const json = await statsRes.json();
        setStats(json.data ?? json);
      } else {
        setStats(null);
      }

      if (chartsRes?.ok) {
        const json = await chartsRes.json();
        setCharts(json.data ?? json);
      } else {
        setCharts(null);
      }

      if (alertsRes?.ok) {
        const json = await alertsRes.json();
        setAlerts(json.data ?? json ?? []);
      } else {
        setAlerts([]);
      }
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  // Handle period change
  const handlePeriodChange = useCallback((newPeriod: Period) => {
    setPeriod(newPeriod);
  }, []);

  // CSV Export
  const handleExport = useCallback(async (type: ExportType) => {
    setExportingType(type);
    try {
      const headers = getHeaders();
      const res = await fetch(
        `${API_URL}/api/admin/export/${type}?period=${period}`,
        { headers },
      );

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `buyla-${type}-${period}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail - user will see the button reset
    } finally {
      setExportingType(null);
    }
  }, [period]);

  // ---- Loading state ----
  if (loading) {
    return <DashboardSkeleton />;
  }

  // ---- Error state (no data at all) ----
  if (error && !stats) {
    return (
      <div>
        <PageHeader
          title="Dashboard Admin"
          description="Vue d'ensemble de la plateforme"
        />
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchData(period)}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  // ---- Computed values ----
  const revenue = stats?.revenue ?? 0;
  const commissions = stats?.commissions ?? 0;
  const margin = stats?.margin ?? 0;
  const marginPercent = stats?.marginPercent ?? 0;
  const salesToday = stats?.salesToday ?? 0;
  const clicksToday = stats?.clicksToday ?? 0;
  const visitsToday = stats?.visitsToday ?? 0;
  const activeAmbassadors = stats?.activeAmbassadors ?? 0;
  const newSignups = stats?.newSignups ?? 0;
  const newAmbassadors = stats?.newAmbassadors ?? 0;
  const newBuyers = stats?.newBuyers ?? 0;
  const topAmbassadors = stats?.topAmbassadors ?? [];
  const tierDistribution = stats?.tierDistribution ?? [];
  const maxTierCount = Math.max(...tierDistribution.map((t) => t.count), 1);

  const revenueMarginData = charts?.revenueMargin ?? [];
  const dailySalesData = charts?.dailySales ?? [];
  const programShareData = charts?.programShare ?? [];
  const redistributionData = charts?.redistribution ?? [];

  // ---- Main render ----
  return (
    <div>
      {/* ── Header ── */}
      <PageHeader
        title="Dashboard Admin"
        description="Vue d'ensemble de la plateforme"
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchData(period)}
          >
            Actualiser
          </Button>
        }
      />

      {/* ── Period Selector ── */}
      <div className="mt-6 flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handlePeriodChange(opt.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 ${
              period === opt.value
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── KPI Cards Row 1 (primary) ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CA brut"
          value={formatEuro(revenue)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={
            stats?.revenueTrend != null
              ? { value: Math.abs(stats.revenueTrend), isPositive: stats.revenueTrend >= 0 }
              : undefined
          }
          subtitle="vs. période précédente"
        />
        <StatCard
          title="Commissions recues"
          value={formatEuro(commissions)}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          title="Marge nette"
          value={formatEuro(margin)}
          icon={<Target className="h-5 w-5" />}
          subtitle={`${marginPercent.toFixed(1)}% de marge`}
        />
        <StatCard
          title="Ventes du jour"
          value={formatNumber(salesToday)}
          icon={<ShoppingCart className="h-5 w-5" />}
          trend={
            stats?.salesTodayTrend != null
              ? { value: Math.abs(stats.salesTodayTrend), isPositive: stats.salesTodayTrend >= 0 }
              : undefined
          }
        />
      </div>

      {/* ── KPI Cards Row 2 (secondary) ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Clics du jour"
          value={formatNumber(clicksToday)}
          icon={<MousePointerClick className="h-5 w-5" />}
        />
        <StatCard
          title="Visites du jour"
          value={formatNumber(visitsToday)}
          icon={<Eye className="h-5 w-5" />}
        />
        <StatCard
          title="Ambassadeurs actifs"
          value={formatNumber(activeAmbassadors)}
          icon={<Users className="h-5 w-5" />}
          subtitle="ce mois"
        />
        <StatCard
          title="Nouveaux inscrits"
          value={formatNumber(newSignups)}
          icon={<UserPlus className="h-5 w-5" />}
          subtitle={`${newAmbassadors} amb + ${newBuyers} acheteurs`}
        />
      </div>

      {/* ── Charts Section (2x2 grid) ── */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Chart 1: CA + Marge Evolution */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            CA + Marge Evolution
          </h3>
          {revenueMarginData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={revenueMarginData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.revenue} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.revenue} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.margin} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={CHART_COLORS.margin} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
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
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(val) => formatEuro(val)}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="CA brut"
                    stroke={CHART_COLORS.revenue}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="margin"
                    name="Marge"
                    stroke={CHART_COLORS.margin}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Aucune donnée pour cette période
            </div>
          )}
        </Card>

        {/* Chart 2: Ventes / jour */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Ventes / jour
          </h3>
          {dailySalesData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailySalesData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(val) => formatNumber(val)}
                      />
                    }
                  />
                  <Bar
                    dataKey="count"
                    name="Ventes"
                    fill={CHART_COLORS.conversions}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Aucune donnée pour cette période
            </div>
          )}
        </Card>

        {/* Chart 3: Repartition programmes */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Repartition programmes
          </h3>
          {programShareData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={programShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={{ stroke: '#d1d5db' }}
                  >
                    {programShareData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Aucune donnée pour cette période
            </div>
          )}
        </Card>

        {/* Chart 4: Redistribution */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Redistribution
          </h3>
          {redistributionData.length > 0 ? (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={redistributionData}
                  margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
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
                    tickFormatter={(v: number) => formatEuro(v)}
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        formatter={(val) => formatEuro(val)}
                      />
                    }
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '8px' }}
                  />
                  <Bar dataKey="ambassador" name="Ambassadeur" stackId="stack" fill={CHART_COLORS.ambassador} />
                  <Bar dataKey="sponsor" name="Parrain" stackId="stack" fill={CHART_COLORS.sponsor} />
                  <Bar dataKey="buyer" name="Acheteur" stackId="stack" fill={CHART_COLORS.buyer} />
                  <Bar
                    dataKey="platform"
                    name="Plateforme"
                    stackId="stack"
                    fill={CHART_COLORS.platform}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
              Aucune donnée pour cette période
            </div>
          )}
        </Card>
      </div>

      {/* ── Alerts Panel ── */}
      {alerts.length > 0 && (
        <Card className="mt-8">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertes &amp; Actions rapides
          </h3>
          <div className="divide-y divide-gray-100">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant={
                      alert.priority === 'HAUTE'
                        ? 'danger'
                        : alert.priority === 'MOYENNE'
                          ? 'warning'
                          : 'default'
                    }
                    size="sm"
                  >
                    {alert.priority}
                  </Badge>
                  <span className="text-sm text-gray-700 truncate">{alert.message}</span>
                </div>
                {alert.actionLabel && alert.actionUrl && (
                  <a
                    href={alert.actionUrl}
                    className="flex items-center gap-1 shrink-0 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    {alert.actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Quick Stats Tables (2 columns) ── */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 10 Ambassadeurs */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Top 10 Ambassadeurs
          </h3>
          {topAmbassadors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 font-medium text-gray-500">#</th>
                    <th className="pb-3 font-medium text-gray-500">Nom</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Ventes</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Gains</th>
                    <th className="pb-3 text-right font-medium text-gray-500">Palier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topAmbassadors.slice(0, 10).map((amb, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="py-2.5 font-medium text-gray-900">{amb.name}</td>
                      <td className="py-2.5 text-right text-gray-700">
                        {formatNumber(amb.sales)}
                      </td>
                      <td className="py-2.5 text-right text-gray-700">
                        {formatEuro(amb.earnings)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge
                          variant={
                            amb.tier === 'elite'
                              ? 'danger'
                              : amb.tier === 'expert'
                                ? 'warning'
                                : amb.tier === 'performant'
                                  ? 'primary'
                                  : amb.tier === 'actif'
                                    ? 'info'
                                    : 'default'
                          }
                          size="sm"
                        >
                          {TIER_LABELS[amb.tier] ?? amb.tier}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Aucun ambassadeur pour cette periode
            </div>
          )}
        </Card>

        {/* Repartition par palier */}
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900">
            Repartition par palier
          </h3>
          {tierDistribution.length > 0 ? (
            <div className="space-y-4">
              {tierDistribution.map((entry) => {
                const pct = maxTierCount > 0 ? (entry.count / maxTierCount) * 100 : 0;
                const color = TIER_COLORS[entry.tier] ?? '#9ca3af';
                return (
                  <div key={entry.tier}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {TIER_LABELS[entry.tier] ?? entry.tier}
                      </span>
                      <span className="text-gray-500">{formatNumber(entry.count)}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-gray-400">
              Aucune donnée de palier disponible
            </div>
          )}
        </Card>
      </div>

      {/* ── Export Buttons ── */}
      <Card className="mt-8">
        <h3 className="mb-4 text-base font-semibold text-gray-900">
          Exports CSV
        </h3>
        <div className="flex flex-wrap gap-3">
          {EXPORT_OPTIONS.map((opt) => (
            <Button
              key={opt.type}
              variant="secondary"
              size="sm"
              loading={exportingType === opt.type}
              onClick={() => handleExport(opt.type)}
            >
              <Download className="h-4 w-4" />
              {opt.label}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
