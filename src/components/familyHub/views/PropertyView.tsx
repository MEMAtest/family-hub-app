'use client'

import { PropertyDashboard } from '@/components/property/PropertyDashboard';

export const PropertyView = () => {
  return (
    <div className="flex h-full flex-col bg-gray-50">
      <PropertyDashboard />
    </div>
  );
};
