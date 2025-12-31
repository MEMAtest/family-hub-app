'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface PropertySectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
}

export const PropertySectionHeader = ({ title, subtitle, icon: Icon, actions }: PropertySectionHeaderProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-3">
      {Icon && (
        <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
