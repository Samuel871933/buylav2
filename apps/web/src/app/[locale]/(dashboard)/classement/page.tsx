'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Medal } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { API_URL } from '@/lib/constants';

interface LeaderboardEntry {
  rank: number;
  name: string;
  total_sales: number;
  tier: string;
  is_me: boolean;
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

function getRankIcon(rank: number) {
  if (rank === 1) return <span className="text-2xl">🥇</span>;
  if (rank === 2) return <span className="text-2xl">🥈</span>;
  if (rank === 3) return <span className="text-2xl">🥉</span>;
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{rank}</span>;
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function LeaderboardSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ClassementPage() {
  const t = useTranslations('leaderboard');

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) { setLoading(false); return; }

    fetch(`${API_URL}/api/ambassador/leaderboard?limit=20`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const data = json?.data ?? json;
        setLeaderboard(data?.leaderboard ?? []);
        setMyRank(data?.myRank ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title={t('title')}
        description={t('description')}
      />

      {/* My rank card */}
      {myRank && (
        <Card className="mt-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white">
              <Medal className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('yourRank')}</p>
              <p className="text-3xl font-bold text-gray-900">#{myRank}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard */}
      <div className="mt-6">
        {loading ? (
          <LeaderboardSkeleton />
        ) : leaderboard.length === 0 ? (
          <EmptyState
            icon={<Trophy className="h-6 w-6" />}
            title={t('empty')}
          />
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-4 rounded-xl border p-4 shadow-sm transition-shadow hover:shadow-md ${
                  entry.is_me
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {/* Rank */}
                <div className="w-10 shrink-0 text-center">
                  {getRankIcon(entry.rank)}
                </div>

                {/* Name */}
                <div className="min-w-0 flex-1">
                  <p className={`truncate font-medium ${entry.is_me ? 'text-primary-700' : 'text-gray-900'}`}>
                    {entry.name}
                    {entry.is_me && (
                      <span className="ml-2 text-sm font-normal text-primary-500">
                        {t('you')}
                      </span>
                    )}
                  </p>
                </div>

                {/* Sales count */}
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">
                    {entry.total_sales}
                  </p>
                  <p className="text-xs text-gray-500">{t('sales')}</p>
                </div>

                {/* Tier badge */}
                <Badge variant="primary" size="sm">
                  {entry.tier}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
