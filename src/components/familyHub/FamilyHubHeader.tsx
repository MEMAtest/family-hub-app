'use client'

import { ReactNode } from 'react';
import { Bell, Menu } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';

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
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
            onClick={onToggleMobileNav}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
              <span className={`inline-flex h-2 w-2 items-center justify-center rounded-full ${databaseStatus.connected ? 'bg-green-500' : 'bg-yellow-400'}`} />
              <span>{databaseStatus.connected ? 'Database Connected' : `Offline • ${databaseStatus.mode}`}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button className="hidden rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 lg:inline-flex">
            <Bell className="mr-2 h-4 w-4" />
            Alerts
          </button>
          {rightContent}
        </div>
      </div>
    </header>
  );
};
