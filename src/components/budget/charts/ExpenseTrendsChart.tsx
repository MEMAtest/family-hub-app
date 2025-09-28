'use client'

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { BudgetDashboardData } from '@/types/budget.types';

interface ExpenseTrendsChartProps {
  data: BudgetDashboardData;
}

const ExpenseTrendsChart: React.FC<ExpenseTrendsChartProps> = ({ data }) => {
  // Mock category trend data
  const trendData = [
    { month: 'Jan', Housing: 3500, Children: 1800, Transport: 420, Food: 380 },
    { month: 'Feb', Housing: 3500, Children: 1850, Transport: 445, Food: 355 },
    { month: 'Mar', Housing: 3500, Children: 1780, Transport: 465, Food: 355 },
    { month: 'Apr', Housing: 3500, Children: 1820, Transport: 430, Food: 400 },
    { month: 'May', Housing: 3500, Children: 1817, Transport: 450, Food: 333 }
  ];

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
        <LineChart
          data={trendData}
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
            tickFormatter={(value) => `£${value.toLocaleString()}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="Housing"
            stroke="#374151"
            strokeWidth={2}
            dot={{ fill: '#374151', strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Children"
            stroke="#6B7280"
            strokeWidth={2}
            dot={{ fill: '#6B7280', strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Transport"
            stroke="#9CA3AF"
            strokeWidth={2}
            dot={{ fill: '#9CA3AF', strokeWidth: 2, r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="Food"
            stroke="#D1D5DB"
            strokeWidth={2}
            dot={{ fill: '#D1D5DB', strokeWidth: 2, r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 grid grid-cols-4 gap-4">
        {['Housing', 'Children', 'Transport', 'Food'].map((category, index) => {
          const colors = ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB'];
          const currentValue = Number(trendData[trendData.length - 1][category as keyof typeof trendData[0]]);
          const previousValue = Number(trendData[trendData.length - 2][category as keyof typeof trendData[0]]);
          const change = currentValue - previousValue;

          return (
            <div key={category} className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center mb-1">
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: colors[index] }}
                />
                <p className="text-sm text-gray-700">{category}</p>
              </div>
              <p className="font-semibold text-gray-900">
                £{currentValue.toLocaleString()}
              </p>
              <p className={`text-xs ${change >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                {change >= 0 ? '+' : ''}£{change}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseTrendsChart;