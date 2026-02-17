import React from 'react';
import clsx from 'clsx';

interface Trend {
  value: number;
  isPositive: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: Trend;
  icon?: React.ReactNode;
  className?: string;
}

function TrendIndicator({ trend }: { trend: Trend }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-sm font-medium',
        trend.isPositive ? 'text-green-600' : 'text-red-500',
      )}
    >
      {trend.isPositive ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04L10.75 5.612V16.25A.75.75 0 0 1 10 17Z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z"
            clipRule="evenodd"
          />
        </svg>
      )}
      {Math.abs(trend.value).toFixed(1)}%
    </span>
  );
}

export function StatCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'animate-fade-in bg-white border border-gray-200 shadow-sm rounded-xl p-6',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: title + value + subtitle + trend */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 truncate">{title}</p>

          <p className="mt-1 text-3xl font-bold tracking-tight text-gray-900 truncate">
            {value}
          </p>

          {(subtitle || trend) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {trend && <TrendIndicator trend={trend} />}
              {subtitle && (
                <span className="text-sm text-gray-400">{subtitle}</span>
              )}
            </div>
          )}
        </div>

        {/* Right: icon */}
        {icon && (
          <div
            className="shrink-0 rounded-lg bg-primary-50 p-2 text-primary-500"
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
