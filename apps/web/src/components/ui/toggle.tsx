'use client';

import React, { useId } from 'react';
import clsx from 'clsx';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={clsx(
        'inline-flex items-center gap-3',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      )}
    >
      {/* Hidden native checkbox for accessibility */}
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
        aria-checked={checked}
      />

      {/* Pill track */}
      <span
        aria-hidden="true"
        className={clsx(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
          'transition-colors duration-200 ease-in-out',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
          checked ? 'bg-primary-500' : 'bg-gray-300',
        )}
      >
        {/* Sliding circle */}
        <span
          className={clsx(
            'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
            'transform transition-transform duration-200 ease-in-out',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </span>

      {/* Optional label text */}
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
    </label>
  );
}
