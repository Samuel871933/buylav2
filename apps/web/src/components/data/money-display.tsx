import React from 'react';
import clsx from 'clsx';

type MoneySize = 'sm' | 'md' | 'lg';

interface MoneyDisplayProps {
  amount: number;
  currency?: string;
  size?: MoneySize;
  showSign?: boolean;
  className?: string;
}

const sizeClasses: Record<MoneySize, string> = {
  sm: 'text-sm font-normal',
  md: 'text-base font-semibold',
  lg: 'text-2xl font-bold',
};

function formatAmount(amount: number, currency: string): string {
  // French locale: space as thousands separator, comma as decimal separator
  // e.g. 1234.56 EUR -> "1 234,56 €"
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function MoneyDisplay({
  amount,
  currency = 'EUR',
  size = 'md',
  showSign = false,
  className,
}: MoneyDisplayProps) {
  const isNegative = amount < 0;
  const isPositive = amount > 0;

  const colorClass = showSign
    ? isPositive
      ? 'text-green-600'
      : isNegative
        ? 'text-red-500'
        : 'text-gray-900'
    : 'text-gray-900';

  // When showSign is true and amount is positive, prefix a "+" before the
  // formatted string. The Intl formatter already adds "−" for negatives.
  const formatted = formatAmount(Math.abs(amount), currency);
  let display: string;

  if (showSign) {
    if (isPositive) {
      display = `+${formatted}`;
    } else if (isNegative) {
      // Re-format with the actual negative amount so Intl handles the minus
      display = formatAmount(amount, currency);
    } else {
      display = formatted;
    }
  } else {
    display = formatAmount(amount, currency);
  }

  return (
    <span
      className={clsx(sizeClasses[size], colorClass, className)}
      aria-label={`${showSign && isPositive ? '+' : ''}${amount} ${currency}`}
    >
      {display}
    </span>
  );
}
