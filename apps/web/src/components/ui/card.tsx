import React from 'react';
import clsx from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className, hoverable = false }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-white border border-gray-200 shadow-sm rounded-xl p-6 transition-shadow duration-200',
        hoverable && 'hover:shadow-md cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
