'use client'

import KitchenDashboard from '@/components/kitchen/KitchenDashboard';

export const KitchenView = () => (
  <div className="h-full overflow-y-auto overflow-x-hidden bg-gray-50 p-3 sm:p-4 lg:p-6 dark:bg-slate-950">
    <KitchenDashboard />
  </div>
);
