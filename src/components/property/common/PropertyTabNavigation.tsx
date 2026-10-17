'use client';

import { LayoutDashboard, ClipboardList, Box, BarChart3, FolderKanban, Eye, MessageSquareWarning } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PropertyTabId = 'overview' | 'issues' | 'tasks' | 'projects' | 'digital-twin' | 'analytics' | 'awareness';

interface PropertyTab {
  id: PropertyTabId;
  label: string;
  icon: LucideIcon;
}

const tabs: PropertyTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'issues', label: 'Issues', icon: MessageSquareWarning },
  { id: 'tasks', label: 'Survey plan', icon: ClipboardList },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'digital-twin', label: 'Digital Twin', icon: Box },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'awareness', label: 'Awareness', icon: Eye },
];

interface PropertyTabNavigationProps {
  activeTab: PropertyTabId;
  onTabChange: (tab: PropertyTabId) => void;
  variant?: 'horizontal' | 'vertical';
}

export const PropertyTabNavigation = ({ activeTab, onTabChange, variant = 'horizontal' }: PropertyTabNavigationProps) => {
  if (variant === 'vertical') {
    return (
      <nav className="space-y-1" aria-label="Property sections">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex min-h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 shadow-[inset_3px_0_0_#2563eb] dark:bg-blue-500/15 dark:text-blue-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <div className="overflow-hidden border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <nav className="flex overflow-x-auto px-1 scrollbar-hide" aria-label="Property tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex min-h-12 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-xs font-medium transition-colors touch-manipulation sm:gap-2 sm:px-4 sm:text-sm
                ${isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {/* Always labelled: the bar scrolls sideways, and icon-only tabs on small phones left people guessing. */}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
