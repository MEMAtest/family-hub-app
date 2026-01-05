'use client'

import GoalsDashboard from '@/components/goals/GoalsDashboard';

export const GoalsView = () => (
  <div className="flex h-full flex-col overflow-hidden">
    <div className="border-b border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Family Goals</h2>
      <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Track achievements, rewards, and motivation across the family.</p>
    </div>
    <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-950">
      <GoalsDashboard />
    </div>
  </div>
);
