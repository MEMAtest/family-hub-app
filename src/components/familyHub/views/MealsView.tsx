'use client'

import MealsDashboard from '@/components/meals/MealsDashboard';

export const MealsView = () => (
  <div className="flex h-full flex-col">
    <div className="border-b border-gray-200 bg-white px-4 py-3">
      <h2 className="text-lg font-semibold text-gray-900">Meal Planning</h2>
      <p className="text-sm text-gray-500">Plan meals, manage recipes, and track nutrition.</p>
    </div>
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <MealsDashboard />
    </div>
  </div>
);
