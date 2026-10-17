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
      className={`min-h-24 rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${
        isClickable
          ? 'cursor-pointer transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:border-blue-500/50 dark:hover:bg-slate-800'
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
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-50 dark:bg-slate-800">
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
};
