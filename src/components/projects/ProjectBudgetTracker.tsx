'use client';

import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  PoundSterling,
  Target,
  Receipt,
  Wallet,
} from 'lucide-react';
import { ExtractedQuote } from '@/types/quote.types';
import { PropertyProject } from '@/types/property.types';

interface ProjectBudgetTrackerProps {
  project: PropertyProject;
  quotes: ExtractedQuote[];
  acceptedQuoteId?: string;
  actualExpenses?: { description: string; amount: number; date: string }[];
}

interface BudgetMetric {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtext?: string;
}

export default function ProjectBudgetTracker({
  project,
  quotes,
  acceptedQuoteId,
  actualExpenses = [],
}: ProjectBudgetTrackerProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const budgetData = useMemo(() => {
    const acceptedQuote = quotes.find((q) => q.id === acceptedQuoteId);
    const lowestQuote = quotes.length > 0
      ? quotes.reduce((min, q) => (q.total < min.total ? q : min))
      : null;
    const highestQuote = quotes.length > 0
      ? quotes.reduce((max, q) => (q.total > max.total ? q : max))
      : null;
    const averageQuote = quotes.length > 0
      ? quotes.reduce((sum, q) => sum + q.total, 0) / quotes.length
      : 0;

    const totalActualSpend = actualExpenses.reduce((sum, e) => sum + e.amount, 0);
    const budget = acceptedQuote?.total || project.budgetMax || averageQuote || 0;
    const remainingBudget = budget - totalActualSpend;
    const budgetUsedPercent = budget > 0 ? (totalActualSpend / budget) * 100 : 0;

    return {
      acceptedQuote,
      lowestQuote,
      highestQuote,
      averageQuote,
      totalActualSpend,
      budget,
      remainingBudget,
      budgetUsedPercent,
      isOverBudget: remainingBudget < 0,
      quotesRange: highestQuote && lowestQuote
        ? highestQuote.total - lowestQuote.total
        : 0,
    };
  }, [quotes, acceptedQuoteId, actualExpenses, project.budgetMax]);

  const metrics: BudgetMetric[] = [
    {
      label: 'Project Budget',
      value: budgetData.budget,
      icon: <Target className="w-5 h-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      subtext: budgetData.acceptedQuote
        ? `Based on accepted quote from ${budgetData.acceptedQuote.contractorName}`
        : quotes.length > 0
        ? 'Based on average of quotes'
        : 'Set your budget',
    },
    {
      label: 'Spent So Far',
      value: budgetData.totalActualSpend,
      icon: <Receipt className="w-5 h-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      subtext: `${actualExpenses.length} expense${actualExpenses.length !== 1 ? 's' : ''} recorded`,
    },
    {
      label: 'Remaining',
      value: budgetData.remainingBudget,
      icon: budgetData.isOverBudget ? (
        <TrendingDown className="w-5 h-5" />
      ) : (
        <Wallet className="w-5 h-5" />
      ),
      color: budgetData.isOverBudget ? 'text-red-600' : 'text-green-600',
      bgColor: budgetData.isOverBudget ? 'bg-red-50' : 'bg-green-50',
      subtext: budgetData.isOverBudget
        ? `${formatCurrency(Math.abs(budgetData.remainingBudget))} over budget`
        : `${(100 - budgetData.budgetUsedPercent).toFixed(0)}% remaining`,
    },
    {
      label: 'Quote Range',
      value: budgetData.quotesRange,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      subtext: quotes.length > 1
        ? `Across ${quotes.length} quotes`
        : quotes.length === 1
        ? '1 quote received'
        : 'No quotes yet',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Budget Status Alert */}
      {budgetData.isOverBudget && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-red-800">Over Budget</h4>
            <p className="text-sm text-red-700 mt-1">
              You've exceeded your project budget by{' '}
              {formatCurrency(Math.abs(budgetData.remainingBudget))}. Consider
              reviewing your expenses or adjusting the budget.
            </p>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={`${metric.bgColor} rounded-lg p-4 border border-opacity-50`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{metric.label}</span>
              <span className={metric.color}>{metric.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${metric.color}`}>
              {formatCurrency(metric.value)}
            </p>
            {metric.subtext && (
              <p className="text-xs text-gray-500 mt-1">{metric.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Budget Usage</span>
          <span className="text-sm text-gray-600">
            {budgetData.budgetUsedPercent.toFixed(0)}% used
          </span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              budgetData.budgetUsedPercent > 100
                ? 'bg-red-500'
                : budgetData.budgetUsedPercent > 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(budgetData.budgetUsedPercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>£0</span>
          <span>{formatCurrency(budgetData.budget)}</span>
        </div>
      </div>

      {/* Quote Summary */}
      {quotes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">Quote Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">Lowest</p>
              <p className="text-lg font-bold text-green-800">
                {formatCurrency(budgetData.lowestQuote?.total || 0)}
              </p>
              <p className="text-xs text-green-600 truncate">
                {budgetData.lowestQuote?.contractorName}
              </p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">Average</p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(budgetData.averageQuote)}
              </p>
              <p className="text-xs text-gray-600">{quotes.length} quotes</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">Highest</p>
              <p className="text-lg font-bold text-red-800">
                {formatCurrency(budgetData.highestQuote?.total || 0)}
              </p>
              <p className="text-xs text-red-600 truncate">
                {budgetData.highestQuote?.contractorName}
              </p>
            </div>
          </div>

          {/* Accepted Quote Badge */}
          {budgetData.acceptedQuote && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Accepted: {budgetData.acceptedQuote.contractorName}
                </p>
                <p className="text-xs text-blue-600">
                  {formatCurrency(budgetData.acceptedQuote.total)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Expenses */}
      {actualExpenses.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-4">Recent Expenses</h3>
          <div className="space-y-2">
            {actualExpenses.slice(0, 5).map((expense, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {expense.description}
                  </p>
                  <p className="text-xs text-gray-500">{expense.date}</p>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
          </div>
          {actualExpenses.length > 5 && (
            <p className="text-sm text-gray-500 mt-3 text-center">
              +{actualExpenses.length - 5} more expenses
            </p>
          )}
        </div>
      )}

      {/* Empty State */}
      {quotes.length === 0 && actualExpenses.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <PoundSterling className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">No Budget Data Yet</h3>
          <p className="text-sm text-gray-500">
            Upload quotes or record expenses to start tracking your project budget
          </p>
        </div>
      )}
    </div>
  );
}
