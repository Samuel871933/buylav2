import React from 'react';
import clsx from 'clsx';

type StatusKey =
  | 'pending'
  | 'confirmed'
  | 'paid'
  | 'cancelled'
  | 'processing'
  | 'failed'
  | 'open'
  | 'resolved'
  | 'rejected';

interface StatusConfig {
  pill: string;
  dot: string;
  label: string;
}

const STATUS_MAP: Record<StatusKey, StatusConfig> = {
  pending: {
    pill: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    label: 'Pending',
  },
  open: {
    pill: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
    label: 'Open',
  },
  confirmed: {
    pill: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    label: 'Confirmed',
  },
  resolved: {
    pill: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    label: 'Resolved',
  },
  paid: {
    pill: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
    label: 'Paid',
  },
  processing: {
    pill: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
    label: 'Processing',
  },
  cancelled: {
    pill: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    label: 'Cancelled',
  },
  failed: {
    pill: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    label: 'Failed',
  },
  rejected: {
    pill: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
    label: 'Rejected',
  },
};

const FALLBACK_CONFIG: StatusConfig = {
  pill: 'bg-gray-100 text-gray-600',
  dot: 'bg-gray-400',
  label: '',
};

function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase() as StatusKey;
  const config = STATUS_MAP[key] ?? {
    ...FALLBACK_CONFIG,
    label: capitalize(status),
  };

  const label = config.label || capitalize(status);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.pill,
        className,
      )}
    >
      <span
        className={clsx('h-1.5 w-1.5 shrink-0 rounded-full', config.dot)}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
