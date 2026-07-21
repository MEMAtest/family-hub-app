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
  const statusLabel = databaseStatus.connected ? 'Synced' : 'Connecting';
  const statusDetail = databaseStatus.connected ? 'Private profiles and household data' : 'Secure session required';

  return (
    <header className="sticky top-0 z-30 border-b border-[#dde5e0] bg-white/78 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 pwa-safe-top">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 lg:flex-nowrap lg:px-8">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <button
            aria-label="Open navigation"
            className="flex-shrink-0 rounded-lg p-2 text-[#5f6a64] hover:bg-[#eaf1e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
            onClick={onToggleMobileNav}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#5f6a64] sm:block">Family command centre</p>
            <h1 className="kinboard-serif truncate text-2xl leading-none text-[#18221f] dark:text-slate-100 sm:text-3xl lg:text-[2.1rem]">{title}</h1>
            {subtitle && <p className="hidden truncate text-xs text-[#5f6a64] dark:text-slate-400 xs:block sm:text-sm">{subtitle}</p>}
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#9aa5a0] dark:text-slate-500 sm:mt-1 sm:gap-2 sm:text-xs">
              <span className={`inline-flex h-2 w-2 items-center justify-center rounded-full flex-shrink-0 ${databaseStatus.connected ? 'bg-green-500' : 'bg-yellow-400'}`} />
              <span className="truncate">{statusLabel} • {statusDetail}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          <NotificationBell />
          <button className="hidden rounded-lg border border-[#dde5e0] bg-white/80 px-3 py-2 text-sm font-semibold text-[#18221f] hover:bg-[#eaf1e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#147c72]/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 lg:inline-flex">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
          </button>
          {rightContent}
        </div>
      </div>
    </header>
  );
};
