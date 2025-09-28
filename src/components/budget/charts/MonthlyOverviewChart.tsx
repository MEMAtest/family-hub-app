'use client'

import React from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BudgetDashboardData } from '@/types/budget.types';

interface MonthlyOverviewChartProps {
  data: BudgetDashboardData;
}

const MonthlyOverviewChart: React.FC<MonthlyOverviewChartProps> = ({ data }) => {
  const chartData = data.monthlyTrends.map(item => ({
    ...item,
    formattedIncome: `£${item.income.toLocaleString()}`,
    formattedExpenses: `£${item.expenses.toLocaleString()}`,
    formattedNetIncome: `£${item.netIncome.toLocaleString()}`,
    savingsRateFormatted: `${item.savingsRate}%`
  }));

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
              {`${entry.name}: ${
                entry.dataKey === 'savingsRate'
                  ? `${entry.value}%`
                  : `£${entry.value.toLocaleString()}`
              }`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
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
            yAxisId="left"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Bar
            yAxisId="left"
            dataKey="income"
            name="Income"
            fill="#10b981"
            opacity={0.8}
          />
          <Bar
            yAxisId="left"
            dataKey="expenses"
            name="Expenses"
            fill="#ef4444"
            opacity={0.8}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="savingsRate"
            name="Savings Rate"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Average Monthly Income</p>
          <p className="text-xl font-semibold text-green-600">
            £{Math.round(data.monthlyTrends.reduce((sum, item) => sum + item.income, 0) / data.monthlyTrends.length).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Average Monthly Expenses</p>
          <p className="text-xl font-semibold text-red-600">
            £{Math.round(data.monthlyTrends.reduce((sum, item) => sum + item.expenses, 0) / data.monthlyTrends.length).toLocaleString()}
          </p>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">Average Savings Rate</p>
          <p className="text-xl font-semibold text-blue-600">
            {(data.monthlyTrends.reduce((sum, item) => sum + item.savingsRate, 0) / data.monthlyTrends.length).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default MonthlyOverviewChart;