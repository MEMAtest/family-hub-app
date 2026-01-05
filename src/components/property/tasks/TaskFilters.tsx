'use client';

import { Search, X } from 'lucide-react';
import type { PropertyTaskStatus } from '@/types/property.types';

export type GroupByOption = 'category' | 'priority' | 'status';

interface TaskFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: string[];
  groupBy: GroupByOption;
  onGroupByChange: (value: GroupByOption) => void;
  selectedComponent?: string | null;
  onClearComponent?: () => void;
}

const statusOptions: { value: string; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'verify', label: 'Verify' },
  { value: 'completed', label: 'Completed' },
];

export const TaskFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  groupBy,
  onGroupByChange,
  selectedComponent,
  onClearComponent,
}: TaskFiltersProps) => {
  return (
    <div className="space-y-4">
      {/* Search and Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:placeholder-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 sm:w-auto"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Group By and Active Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Group By */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-slate-400">Group by:</span>
          <div className="inline-flex rounded-lg border border-gray-200 dark:border-slate-700 p-1 bg-gray-50 dark:bg-slate-800">
            {(['category', 'priority', 'status'] as GroupByOption[]).map((option) => (
              <button
                key={option}
                onClick={() => onGroupByChange(option)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  groupBy === option
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-700 dark:text-blue-400'
                    : 'text-gray-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Component Filter Badge */}
        {selectedComponent && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              Filtered by component
              {onClearComponent && (
                <button onClick={onClearComponent} className="ml-1 hover:text-blue-900">
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
