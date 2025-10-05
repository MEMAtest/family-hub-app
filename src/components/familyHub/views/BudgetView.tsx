'use client'

import { DollarSign, Plus } from 'lucide-react';
import BudgetDashboard from '@/components/budget/BudgetDashboard';
import { useBudgetContext } from '@/contexts/familyHub/BudgetContext';

export const BudgetView = () => {
  const { openForm } = useBudgetContext();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Budget &amp; Finances</h2>
          <p className="text-sm text-gray-500">Track income, spending, and savings goals.</p>
        </div>
        <button
          onClick={openForm}
          className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add entry
        </button>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <BudgetDashboard />
      </div>
    </div>
  );
};
