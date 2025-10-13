'use client'

import SimpleBudgetDashboard from '@/components/budget/SimpleBudgetDashboard';

export const BudgetView = () => {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <SimpleBudgetDashboard />
    </div>
  );
};
