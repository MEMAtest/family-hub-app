'use client'

import GoalsDashboard from '@/components/goals/GoalsDashboard';

export const GoalsView = () => (
  <div className="flex h-full flex-col">
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900">Family Goals</h2>
      <p className="text-sm text-gray-500">Track achievements, rewards, and motivation across the family.</p>
    </div>
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <GoalsDashboard />
    </div>
  </div>
);
