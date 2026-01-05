'use client'

import ShoppingDashboard from '@/components/shopping/ShoppingDashboard';
import { useAppView } from '@/contexts/familyHub/AppViewContext';

export const ShoppingView = () => {
  const { currentSubView, setSubView } = useAppView();

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-slate-100">Shopping &amp; Pantry</h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">Manage lists, track spending, and optimise shopping trips.</p>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-slate-950">
        <ShoppingDashboard currentSubView={currentSubView} onSubViewChange={setSubView} />
      </div>
    </div>
  );
};
