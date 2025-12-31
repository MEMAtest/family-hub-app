'use client';

import { LayoutDashboard, ClipboardList, Box, BarChart3, FolderKanban, Eye } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PropertyTabId = 'overview' | 'tasks' | 'projects' | 'digital-twin' | 'analytics' | 'awareness';

interface PropertyTab {
  id: PropertyTabId;
  label: string;
  icon: LucideIcon;
}

const tabs: PropertyTab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', icon: ClipboardList },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'digital-twin', label: 'Digital Twin', icon: Box },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'awareness', label: 'Awareness', icon: Eye },
];

interface PropertyTabNavigationProps {
  activeTab: PropertyTabId;
  onTabChange: (tab: PropertyTabId) => void;
}

export const PropertyTabNavigation = ({ activeTab, onTabChange }: PropertyTabNavigationProps) => {
  return (
    <div className="border-b border-gray-200 dark:border-slate-700">
      <nav className="-mb-px flex space-x-1 overflow-x-auto px-1" aria-label="Property tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                ${isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
