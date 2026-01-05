'use client'

import SimpleBudgetDashboard from '@/components/budget/SimpleBudgetDashboard';

export const BudgetView = () => {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-gray-50 dark:bg-slate-950">
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <SimpleBudgetDashboard />
      </div>
    </div>
  );
};
