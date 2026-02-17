import React from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-4 py-16 px-6 text-center',
        className,
      )}
    >
      {/* Icon */}
      {icon && (
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-gray-400"
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      {/* Text */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold text-gray-800">{title}</h3>
        {description && (
          <p className="max-w-xs text-sm text-gray-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* Optional CTA */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
