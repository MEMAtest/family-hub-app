'use client'

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { BudgetDashboardData } from '@/types/budget.types';

interface CashFlowChartProps {
  data: BudgetDashboardData;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  // Enhanced data with cumulative cash flow
  const cashFlowData = data.monthlyTrends.reduce((acc, month, index) => {
    const previousCumulative = index > 0 ? acc[index - 1].cumulative : 0;
    const currentNet = month.netIncome;

    acc.push({
      month: month.month,
      income: month.income,
      expenses: month.expenses,
      netIncome: month.netIncome,
      cumulative: previousCumulative + currentNet
    });

    return acc;
  }, [] as any[]);

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
        <AreaChart
          data={cashFlowData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="cumulativeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
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

          <Area
            type="monotone"
            dataKey="income"
            stackId="1"
            name="Income"
            stroke="#10b981"
            fill="url(#incomeGradient)"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stackId="2"
            name="Expenses"
            stroke="#ef4444"
            fill="url(#expensesGradient)"
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stackId="3"
            name="Cumulative Savings"
            stroke="#3b82f6"
            fill="url(#cumulativeGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Cash Flow Analysis */}
      <div className="mt-4 grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">Best Month</p>
          <p className="font-semibold text-green-600">
            {cashFlowData.reduce((best, month) =>
              month.netIncome > best.netIncome ? month : best
            ).month}
          </p>
          <p className="text-xs text-green-700">
            £{Math.max(...cashFlowData.map(m => m.netIncome)).toLocaleString()}
          </p>
        </div>

        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-sm text-red-800">Lowest Month</p>
          <p className="font-semibold text-red-600">
            {cashFlowData.reduce((worst, month) =>
              month.netIncome < worst.netIncome ? month : worst
            ).month}
          </p>
          <p className="text-xs text-red-700">
            £{Math.min(...cashFlowData.map(m => m.netIncome)).toLocaleString()}
          </p>
        </div>

        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">Total Cumulative</p>
          <p className="font-semibold text-blue-600">
            £{cashFlowData[cashFlowData.length - 1]?.cumulative.toLocaleString()}
          </p>
        </div>

        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <p className="text-sm text-purple-800">Monthly Average</p>
          <p className="font-semibold text-purple-600">
            £{Math.round(cashFlowData.reduce((sum, m) => sum + m.netIncome, 0) / cashFlowData.length).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CashFlowChart;