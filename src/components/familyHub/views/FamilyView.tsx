'use client'

import FamilyDashboard from '@/components/family/FamilyDashboard';

export const FamilyView = () => (
  <div className="flex h-full flex-col">
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900">Family Management</h2>
      <p className="text-sm text-gray-500">Manage members, roles, and household operations.</p>
    </div>
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <FamilyDashboard />
    </div>
  </div>
);
