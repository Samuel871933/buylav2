'use client';

import React, { useState, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SafeAny = any;

export interface Column<T> {
  key: string;
  header: string;
  render?: (value: SafeAny, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: { page: number; totalPages: number; total: number };
  onPageChange?: (page: number) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  onExport?: () => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj: SafeAny, path: string): unknown {
  return path.split('.').reduce((acc: SafeAny, part: string) => acc?.[part], obj);
}

function getRowId(row: SafeAny, fallback: number): string | number {
  return row?.id ?? fallback;
}

// ---------------------------------------------------------------------------
// Skeleton Row
// ---------------------------------------------------------------------------

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-gray-200" />
        </td>
      ))}
    </tr>
  );
}

// ---------------------------------------------------------------------------
// DataTable
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSearch,
  searchPlaceholder = 'Rechercher...',
  onExport,
  onRowClick,
  emptyMessage = 'Aucune donnée trouvée',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchValue, setSearchValue] = useState('');

  // Handle sort toggle
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
    },
    [sortKey],
  );

  // Client-side sorting for current page data
  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDir === 'asc' ? 1 : -1;
      if (bVal == null) return sortDir === 'asc' ? -1 : 1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const cmp = aStr.localeCompare(bStr, 'fr');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // Search handler
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setSearchValue(val);
      onSearch?.(val);
    },
    [onSearch],
  );

  // Empty / Loading states
  const isEmpty = !loading && sortedData.length === 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Toolbar */}
      {(onSearch || onExport) && (
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          {onSearch && (
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchValue}
                onChange={handleSearchChange}
                placeholder={searchPlaceholder}
                className={clsx(
                  'w-full rounded-lg border border-gray-300 py-2 pl-9 pr-4 text-sm text-gray-900',
                  'placeholder-gray-400 transition-colors duration-150',
                  'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-500',
                )}
              />
            </div>
          )}

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className={clsx(
                'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm',
                'transition-colors duration-150 hover:bg-gray-50',
              )}
            >
              <Download className="h-4 w-4" />
              Exporter CSV
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={clsx(
                    'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700',
                    col.className,
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100">
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} cols={columns.length} />
              ))}

            {!loading &&
              sortedData.map((row, rowIdx) => (
                <tr
                  key={getRowId(row, rowIdx)}
                  className={clsx(
                    'transition-colors duration-100 hover:bg-gray-50',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const value = getNestedValue(row, col.key);
                    return (
                      <td
                        key={col.key}
                        className={clsx('whitespace-nowrap px-4 py-3 text-gray-700', col.className)}
                      >
                        {col.render ? col.render(value, row) : (String(value ?? '-'))}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {isEmpty && (
        <EmptyState title={emptyMessage} />
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-500">
            Page {pagination.page} sur {pagination.totalPages}
            {pagination.total > 0 && (
              <span className="ml-1 text-gray-400">
                ({pagination.total} résultat{pagination.total > 1 ? 's' : ''})
              </span>
            )}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className={clsx(
                'inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm',
                'transition-colors duration-150',
                pagination.page <= 1
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-gray-50',
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className={clsx(
                'inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm',
                'transition-colors duration-150',
                pagination.page >= pagination.totalPages
                  ? 'cursor-not-allowed opacity-50'
                  : 'hover:bg-gray-50',
              )}
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
