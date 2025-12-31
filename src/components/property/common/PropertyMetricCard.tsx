'use client';

import type { LucideIcon } from 'lucide-react';

interface PropertyMetricCardProps {
  label: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconColor?: string;
  onClick?: () => void;
  clickable?: boolean;
}

export const PropertyMetricCard = ({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-500',
  onClick,
  clickable = false,
}: PropertyMetricCardProps) => {
  const isClickable = clickable || !!onClick;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 ${
        isClickable
          ? 'cursor-pointer hover:border-blue-300 hover:shadow-md hover:bg-gray-50 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 transition-all'
          : ''
      }`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable && onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-gray-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
};
