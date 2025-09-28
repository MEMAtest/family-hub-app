'use client'

import React from 'react';
import { ReportFilter } from '@/types/reporting.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface YearlyFinancialSummaryProps {
  filter: ReportFilter;
}

const YearlyFinancialSummaryComponent: React.FC<YearlyFinancialSummaryProps> = ({ filter }) => {
  const mockData = [
    { month: 'Jan', income: 8300, expenses: 6200, netIncome: 2100, savingsRate: 25.3 },
    { month: 'Feb', income: 8400, expenses: 6150, netIncome: 2250, savingsRate: 26.8 },
    { month: 'Mar', income: 8350, expenses: 6300, netIncome: 2050, savingsRate: 24.6 },
    { month: 'Apr', income: 8500, expenses: 6250, netIncome: 2250, savingsRate: 26.5 },
    { month: 'May', income: 8445, expenses: 6100, netIncome: 2345, savingsRate: 27.8 },
    { month: 'Jun', income: 8600, expenses: 6400, netIncome: 2200, savingsRate: 25.6 },
    { month: 'Jul', income: 8550, expenses: 6350, netIncome: 2200, savingsRate: 25.7 },
    { month: 'Aug', income: 8500, expenses: 6250, netIncome: 2250, savingsRate: 26.5 },
    { month: 'Sep', income: 8445, expenses: 6100, netIncome: 2345, savingsRate: 27.8 }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Yearly Financial Summary - 2025</h2>

        {/* Annual Overview */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-center">
            <p className="text-sm text-blue-700">Total Income</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(76590)}</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-sm text-red-700">Total Expenses</p>
            <p className="text-2xl font-bold text-red-800">{formatCurrency(56540)}</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm text-green-700">Total Savings</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(20050)}</p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
            <p className="text-sm text-purple-700">Avg Savings Rate</p>
            <p className="text-2xl font-bold text-purple-800">26.2%</p>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="h-96">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
              <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="netIncome" stroke="#3b82f6" strokeWidth={2} name="Net Income" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Health Metrics */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Health Metrics</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Emergency Fund</p>
            <p className="text-xl font-bold text-gray-900">8.2 months</p>
            <p className="text-xs text-green-600">Above recommended</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Stability Score</p>
            <p className="text-xl font-bold text-gray-900">89/100</p>
            <p className="text-xs text-green-600">Excellent</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Growth Rate</p>
            <p className="text-xl font-bold text-gray-900">+12.3%</p>
            <p className="text-xs text-blue-600">Year over year</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyFinancialSummaryComponent;