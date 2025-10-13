'use client'

import React, { useMemo } from 'react';
import { ReportFilter } from '@/types/reporting.types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface YearlyFinancialSummaryProps {
  filter: ReportFilter;
  incomeList?: any[];
  expenseList?: any[];
}

const YearlyFinancialSummaryComponent: React.FC<YearlyFinancialSummaryProps> = ({ filter, incomeList = [], expenseList = [] }) => {
  // Calculate real data from income and expense lists
  const { monthlyData, totalIncome, totalExpenses, totalSavings, avgSavingsRate, healthMetrics } = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    // Calculate monthly totals for recurring items (appear every month)
    const recurringIncome = incomeList
      .filter(item => item.isRecurring)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const recurringExpenses = expenseList
      .filter(item => item.isRecurring)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // Generate monthly data
    const monthlyData = months.map((month, index) => {
      const income = recurringIncome;
      const expenses = recurringExpenses;
      const netIncome = income - expenses;
      const savingsRate = income > 0 ? ((netIncome / income) * 100) : 0;

      return {
        month,
        income,
        expenses,
        netIncome,
        savingsRate
      };
    });

    const monthsWithData = monthlyData.length;
    const totalIncome = recurringIncome * monthsWithData;
    const totalExpenses = recurringExpenses * monthsWithData;
    const totalSavings = totalIncome - totalExpenses;
    const avgSavingsRate = totalIncome > 0 ? ((totalSavings / totalIncome) * 100) : 0;

    // Calculate Financial Health Metrics
    // 1. Emergency Fund - months of expenses that could be covered by current savings
    const monthlyExpenses = recurringExpenses;
    const assumedSavings = totalSavings > 0 ? totalSavings : 0; // Simplified: use year's total savings
    const emergencyFundMonths = monthlyExpenses > 0 ? (assumedSavings / monthlyExpenses) : 0;

    // 2. Stability Score (0-100) based on savings rate and consistency
    // Higher savings rate = better score, capped at 100
    const savingsRateScore = Math.min(avgSavingsRate * 2, 60); // Up to 60 points for 30%+ savings rate
    const consistencyScore = recurringIncome > 0 && recurringExpenses > 0 ? 30 : 0; // 30 points for having recurring items
    const positiveBalanceScore = totalSavings > 0 ? 10 : 0; // 10 points for positive balance
    const stabilityScore = Math.round(savingsRateScore + consistencyScore + positiveBalanceScore);

    // 3. Growth Rate - for now, use savings rate as proxy (in real app, compare to previous year)
    const growthRate = avgSavingsRate;

    const healthMetrics = {
      emergencyFundMonths,
      stabilityScore,
      growthRate
    };

    return { monthlyData, totalIncome, totalExpenses, totalSavings, avgSavingsRate, healthMetrics };
  }, [incomeList, expenseList]);

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
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-center">
            <p className="text-sm text-red-700">Total Expenses</p>
            <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
            <p className="text-sm text-green-700">Total Savings</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(totalSavings)}</p>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg text-center">
            <p className="text-sm text-purple-700">Avg Savings Rate</p>
            <p className="text-2xl font-bold text-purple-800">{avgSavingsRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Trends Chart */}
        <div className="h-96">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
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
            <p className="text-xl font-bold text-gray-900">
              {healthMetrics.emergencyFundMonths.toFixed(1)} months
            </p>
            <p className={`text-xs ${healthMetrics.emergencyFundMonths >= 6 ? 'text-green-600' : healthMetrics.emergencyFundMonths >= 3 ? 'text-yellow-600' : 'text-red-600'}`}>
              {healthMetrics.emergencyFundMonths >= 6 ? 'Above recommended' : healthMetrics.emergencyFundMonths >= 3 ? 'Adequate' : 'Below recommended'}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Stability Score</p>
            <p className="text-xl font-bold text-gray-900">{healthMetrics.stabilityScore}/100</p>
            <p className={`text-xs ${healthMetrics.stabilityScore >= 80 ? 'text-green-600' : healthMetrics.stabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
              {healthMetrics.stabilityScore >= 80 ? 'Excellent' : healthMetrics.stabilityScore >= 60 ? 'Good' : 'Needs improvement'}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Savings Rate</p>
            <p className="text-xl font-bold text-gray-900">
              {healthMetrics.growthRate >= 0 ? '+' : ''}{healthMetrics.growthRate.toFixed(1)}%
            </p>
            <p className={`text-xs ${healthMetrics.growthRate >= 20 ? 'text-green-600' : healthMetrics.growthRate >= 10 ? 'text-blue-600' : healthMetrics.growthRate >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
              {healthMetrics.growthRate >= 20 ? 'Excellent savings' : healthMetrics.growthRate >= 10 ? 'Good savings' : healthMetrics.growthRate >= 0 ? 'Modest savings' : 'Deficit'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YearlyFinancialSummaryComponent;