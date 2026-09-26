'use client'

import { Search } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'notes', label: 'Notes' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'due', label: 'Due' },
  { value: 'open', label: 'Open' },
  { value: 'done', label: 'Done' },
  { value: 'tagged', label: 'Tagged' },
] as const;

const BrainFilterBar = () => {
  const { quickFilter, setQuickFilter, searchQuery, setSearchQuery } = useBrainContext();

  return (
    <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      {/* Status pills - scrollable on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.label}
            onClick={() => setQuickFilter(opt.value)}
            className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
              quickFilter === opt.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative ml-auto flex-shrink-0">
        <Search className="pointer-events-none absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-400" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search..."
          className="w-32 rounded-lg border border-gray-200 bg-white py-1 pl-7 pr-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-100 sm:w-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  );
};

export default BrainFilterBar;
