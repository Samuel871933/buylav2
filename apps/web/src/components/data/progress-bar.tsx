import React from 'react';
import clsx from 'clsx';

type ProgressColor = 'primary' | 'success' | 'warning' | 'danger';

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: ProgressColor;
  className?: string;
}

const fillClasses: Record<ProgressColor, string> = {
  primary:
    'bg-gradient-to-r from-accent-500 to-primary-500',
  success:
    'bg-gradient-to-r from-green-400 to-green-500',
  warning:
    'bg-gradient-to-r from-amber-400 to-orange-400',
  danger:
    'bg-gradient-to-r from-red-400 to-red-500',
};

export function ProgressBar({
  value,
  max = 100,
  label,
  showPercentage = true,
  color = 'primary',
  className,
}: ProgressBarProps) {
  // Clamp the displayed percentage between 0 and 100
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const displayPercent = Math.round(percentage);

  return (
    <div className={clsx('w-full', className)}>
      {/* Header row: label left, percentage right */}
      {(label || showPercentage) && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {label ? (
            <span className="text-sm font-medium text-gray-700 truncate">
              {label}
            </span>
          ) : (
            /* spacer so percentage stays right-aligned when there is no label */
            <span aria-hidden="true" />
          )}
          {showPercentage && (
            <span className="shrink-0 text-sm font-medium text-gray-500">
              {displayPercent}%
            </span>
          )}
        </div>
      )}

      {/* Track */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-gray-200"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        {/* Fill */}
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500',
            fillClasses[color],
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
