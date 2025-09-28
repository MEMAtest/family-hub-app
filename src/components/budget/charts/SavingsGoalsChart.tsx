'use client'

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { BudgetDashboardData } from '@/types/budget.types';

interface SavingsGoalsChartProps {
  data: BudgetDashboardData;
}

const SavingsGoalsChart: React.FC<SavingsGoalsChartProps> = ({ data }) => {
  const mockGoalsData = [
    {
      name: 'Emergency Fund',
      progress: 65,
      target: 10000,
      current: 6500,
      fill: '#3b82f6'
    },
    {
      name: 'Holiday Fund',
      progress: 45,
      target: 5000,
      current: 2250,
      fill: '#10b981'
    },
    {
      name: 'Home Improvements',
      progress: 58,
      target: 15000,
      current: 8750,
      fill: '#f59e0b'
    },
    {
      name: 'Car Replacement',
      progress: 16,
      target: 20000,
      current: 3200,
      fill: '#ef4444'
    }
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Progress: {data.progress}%
          </p>
          <p className="text-sm text-gray-600">
            Current: £{data.current.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Target: £{data.target.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96">
      <div className="grid grid-cols-2 gap-8">
        {/* Radial Chart */}
        <div>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="20%"
              outerRadius="90%"
              data={mockGoalsData}
            >
              <RadialBar
                background
                dataKey="progress"
              />
              <Tooltip content={<CustomTooltip />} />
            </RadialBarChart>
          </ResponsiveContainer>
        </div>

        {/* Goals List */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Savings Goals</h3>
          {mockGoalsData.map((goal, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-900">{goal.name}</h4>
                <span className="text-sm font-medium text-gray-600">
                  {goal.progress}%
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Current: £{goal.current.toLocaleString()}</span>
                  <span>Target: £{goal.target.toLocaleString()}</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${goal.progress}%`,
                      backgroundColor: goal.fill
                    }}
                  ></div>
                </div>

                <div className="text-sm text-gray-600">
                  £{(goal.target - goal.current).toLocaleString()} remaining
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">Total Goal Amount</p>
          <p className="text-xl font-semibold text-blue-600">
            £{mockGoalsData.reduce((sum, goal) => sum + goal.target, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">Total Saved</p>
          <p className="text-xl font-semibold text-green-600">
            £{mockGoalsData.reduce((sum, goal) => sum + goal.current, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-800">Average Progress</p>
          <p className="text-xl font-semibold text-purple-600">
            {Math.round(mockGoalsData.reduce((sum, goal) => sum + goal.progress, 0) / mockGoalsData.length)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default SavingsGoalsChart;