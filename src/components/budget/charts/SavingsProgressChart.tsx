'use client'

import React from 'react';
import { BudgetDashboardData } from '@/types/budget.types';

interface SavingsProgressChartProps {
  data: BudgetDashboardData;
}

const SavingsProgressChart: React.FC<SavingsProgressChartProps> = ({ data }) => {
  // Mock savings goals data for display
  const mockSavingsGoals = [
    { name: 'Emergency Fund', target: 10000, current: 6500, progress: 65 },
    { name: 'Holiday Fund', target: 5000, current: 2250, progress: 45 },
    { name: 'Home Improvements', target: 15000, current: 8750, progress: 58.3 },
    { name: 'Car Replacement', target: 20000, current: 3200, progress: 16 }
  ];

  return (
    <div className="w-full h-96">
      <div className="space-y-6">
        {mockSavingsGoals.map((goal, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900">{goal.name}</h3>
              <span className="text-sm text-gray-600">
                £{goal.current.toLocaleString()} / £{goal.target.toLocaleString()}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>{goal.progress.toFixed(1)}% complete</span>
              <span>£{(goal.target - goal.current).toLocaleString()} remaining</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">Total Savings Target</p>
          <p className="text-xl font-semibold text-blue-600">
            £{mockSavingsGoals.reduce((sum, goal) => sum + goal.target, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">Current Savings</p>
          <p className="text-xl font-semibold text-green-600">
            £{mockSavingsGoals.reduce((sum, goal) => sum + goal.current, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavingsProgressChart;