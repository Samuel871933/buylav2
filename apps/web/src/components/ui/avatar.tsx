import React from 'react';
import clsx from 'clsx';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

/**
 * Deterministically pick a gradient pair from the user's name so the same
 * name always renders with the same colour.
 */
const gradients = [
  'from-primary-500 to-accent-500',
  'from-pink-500 to-rose-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-sky-400 to-indigo-500',
  'from-violet-500 to-purple-600',
];

function pickGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return gradients[Math.abs(hash) % gradients.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const baseClasses = clsx(
    'inline-flex items-center justify-center rounded-full shrink-0 font-semibold',
    sizeClasses[size],
    className,
  );

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={clsx(baseClasses, 'object-cover')}
      />
    );
  }

  const gradient = pickGradient(name);
  const initials = getInitials(name);

  return (
    <span
      className={clsx(
        baseClasses,
        'bg-gradient-to-br text-white select-none',
        gradient,
      )}
      aria-label={name}
      role="img"
      title={name}
    >
      {initials}
    </span>
  );
}
