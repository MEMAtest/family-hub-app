'use client'

import ShoppingDashboard from '@/components/shopping/ShoppingDashboard';
import { useAppView } from '@/contexts/familyHub/AppViewContext';

export const ShoppingView = () => {
  const { currentSubView, setSubView } = useAppView();

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Shopping &amp; Pantry</h2>
        <p className="text-sm text-gray-500">Manage lists, track spending, and optimise shopping trips.</p>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <ShoppingDashboard currentSubView={currentSubView} onSubViewChange={setSubView} />
      </div>
    </div>
  );
};
