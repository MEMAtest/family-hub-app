'use client'

import { ReactNode } from 'react';
import { Bell, Menu } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import { ThemeToggle } from '@/components/common/ThemeToggle';

interface FamilyHubHeaderProps {
  title: string;
  subtitle?: string;
  onToggleMobileNav: () => void;
  rightContent?: ReactNode;
  databaseStatus: {
    connected: boolean;
    mode: string;
  };
}

export const FamilyHubHeader = ({
  title,
  subtitle,
  onToggleMobileNav,
  rightContent,
  databaseStatus,
}: FamilyHubHeaderProps) => {
  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 pwa-safe-top">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 lg:flex-nowrap lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 flex-shrink-0"
            onClick={onToggleMobileNav}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-slate-100 truncate">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate hidden xs:block">{subtitle}</p>}
            <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-400 dark:text-slate-500">
              <span className={`inline-flex h-2 w-2 items-center justify-center rounded-full flex-shrink-0 ${databaseStatus.connected ? 'bg-green-500' : 'bg-yellow-400'}`} />
              <span className="truncate">{databaseStatus.connected ? 'Database Connected' : `Offline • ${databaseStatus.mode}`}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <NotificationBell />
          <button className="hidden rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:inline-flex dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
          </button>
          {rightContent}
        </div>
      </div>
    </header>
  );
};
