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

interface IncomeVsExpensesChartProps {
  data: BudgetDashboardData;
}

const IncomeVsExpensesChart: React.FC<IncomeVsExpensesChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-900">{`${label} 2025`}</p>
          {payload.map((entry: any, index: number) => (
            <p
              key={index}
              className="text-sm"
              style={{ color: entry.color }}
            >
              {`${entry.name}: £${entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="80%">
        <BarChart
          data={data.monthlyTrends}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#10b981" />
          <Bar dataKey="expenses" name="Expenses" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">Average Monthly Income</p>
          <p className="text-xl font-semibold text-green-600">
            £{Math.round(data.monthlyTrends.reduce((sum, item) => sum + item.income, 0) / data.monthlyTrends.length).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">Average Monthly Expenses</p>
          <p className="text-xl font-semibold text-red-600">
            £{Math.round(data.monthlyTrends.reduce((sum, item) => sum + item.expenses, 0) / data.monthlyTrends.length).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default IncomeVsExpensesChart;