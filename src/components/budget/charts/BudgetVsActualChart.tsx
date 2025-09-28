'use client'

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BudgetDashboardData } from '@/types/budget.types';

interface BudgetVsActualChartProps {
  data: BudgetDashboardData;
}

const BudgetVsActualChart: React.FC<BudgetVsActualChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const budgeted = payload.find((p: any) => p.dataKey === 'budgeted')?.value || 0;
      const actual = payload.find((p: any) => p.dataKey === 'actual')?.value || 0;
      const difference = budgeted - actual;

      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">Budgeted: £{budgeted.toLocaleString()}</p>
          <p className="text-sm text-green-600">Actual: £{actual.toLocaleString()}</p>
          <p className={`text-sm ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {difference >= 0 ? 'Under budget' : 'Over budget'}: £{Math.abs(difference).toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data.budgetVsActual}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => `£${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="budgeted" name="Budgeted" fill="#3b82f6" />
          <Bar dataKey="actual" name="Actual" fill="#10b981" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">Total Budgeted</p>
          <p className="text-xl font-semibold text-blue-600">
            £{data.budgetVsActual.reduce((sum, item) => sum + item.budgeted, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">Total Actual</p>
          <p className="text-xl font-semibold text-green-600">
            £{data.budgetVsActual.reduce((sum, item) => sum + item.actual, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-800">Total Savings</p>
          <p className="text-xl font-semibold text-purple-600">
            £{data.budgetVsActual.reduce((sum, item) => sum + item.difference, 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BudgetVsActualChart;