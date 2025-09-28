'use client'

import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { BudgetDashboardData } from '@/types/budget.types';

interface CategorySpendingChartProps {
  data: BudgetDashboardData;
}

const CategorySpendingChart: React.FC<CategorySpendingChartProps> = ({ data }) => {
  const RADIAN = Math.PI / 180;

  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent
  }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Amount: £{data.value.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Percentage: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full h-96">
      <div className="grid grid-cols-2 gap-8">
        {/* Pie Chart */}
        <div className="flex flex-col">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.categorySpending}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomizedLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.categorySpending.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <Legend content={<CustomLegend />} />
        </div>

        {/* Category Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Category Breakdown</h3>
          {data.categorySpending.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium text-gray-900">{category.name}</span>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  £{category.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600">
                  {category.percentage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border-t-2 border-blue-200">
            <span className="font-semibold text-blue-900">Total Expenses</span>
            <span className="font-bold text-blue-900">
              £{data.categorySpending.reduce((sum, cat) => sum + cat.value, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">Largest Category</p>
          <p className="text-lg font-semibold text-yellow-900">
            {data.categorySpending[0]?.name}
          </p>
          <p className="text-sm text-yellow-700">
            {data.categorySpending[0]?.percentage.toFixed(1)}% of total
          </p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">Number of Categories</p>
          <p className="text-lg font-semibold text-green-900">
            {data.categorySpending.length}
          </p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-800">Average per Category</p>
          <p className="text-lg font-semibold text-purple-900">
            £{Math.round(data.categorySpending.reduce((sum, cat) => sum + cat.value, 0) / data.categorySpending.length).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategorySpendingChart;