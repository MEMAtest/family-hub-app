'use client';

import React, { useMemo } from 'react';
import { X, Receipt, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface CategoryDrilldownPanelProps {
  category: string | null;
  isOpen: boolean;
  onClose: () => void;
  matchingExpenses: any[];
  allExpenses: any[];
  isMobile?: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (value?: string | Date | null) => {
  if (!value) return 'No date';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const CategoryDrilldownPanel: React.FC<CategoryDrilldownPanelProps> = ({
  category,
  isOpen,
  onClose,
  matchingExpenses,
  allExpenses,
  isMobile = false,
}) => {
  const isVisible = isOpen && !!category;
  const expensesForCategory = useMemo(
    () =>
      !category
        ? []
        : allExpenses
        .filter((expense) => (expense.category || 'Other') === category)
        .map((expense) => ({
          ...expense,
          numericAmount: parseFloat(expense.amount) || 0,
          normalizedDate: expense.paymentDate || expense.createdAt,
        })),
    [allExpenses, category]
  );

  const matchingExpensesForCategory = useMemo(
    () =>
      !category
        ? []
        : matchingExpenses
        .filter((expense) => (expense.category || 'Other') === category)
        .map((expense) => ({
          ...expense,
          numericAmount: parseFloat(expense.amount) || 0,
          normalizedDate: expense.paymentDate || expense.createdAt,
        })),
    [matchingExpenses, category]
  );

  const sortedExpenses = useMemo(
    () =>
      [...matchingExpensesForCategory].sort((a, b) => {
        const dateA = new Date(a.normalizedDate || Date.now()).getTime();
        const dateB = new Date(b.normalizedDate || Date.now()).getTime();
        return dateB - dateA;
      }),
    [matchingExpensesForCategory]
  );

  const totals = useMemo(() => {
    const sum = expensesForCategory.reduce(
      (acc, expense) => acc + expense.numericAmount,
      0
    );
    const count = expensesForCategory.length;
    const average = count > 0 ? sum / count : 0;

    return {
      sum,
      count,
      average,
    };
  }, [expensesForCategory]);

  const monthlyData = useMemo(() => {
    const map = new Map<string, number>();

    expensesForCategory.forEach((expense) => {
      const date = new Date(expense.normalizedDate || Date.now());
      if (Number.isNaN(date.getTime())) return;
      const isoMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map.set(isoMonth, (map.get(isoMonth) || 0) + expense.numericAmount);
    });

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys.map((key) => {
      const [year, month] = key.split('-');
      const labelDate = new Date(Number(year), Number(month) - 1, 1);
      return {
        month: labelDate.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
        total: map.get(key) || 0,
      };
    });
  }, [expensesForCategory]);

  const trend = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const last = monthlyData[monthlyData.length - 1].total;
    const prev = monthlyData[monthlyData.length - 2].total;
    if (prev === 0) return { direction: 'flat' as const, delta: last };
    const change = last - prev;
    if (change === 0) return { direction: 'flat' as const, delta: 0 };
    return {
      direction: change > 0 ? 'up' : 'down',
      delta: Math.abs(change),
      percentage: Math.abs((change / prev) * 100),
    };
  }, [monthlyData]);

  if (!isVisible || !category) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative ml-auto h-full bg-white shadow-xl ${
          isMobile ? 'w-full rounded-t-2xl' : 'w-full max-w-2xl rounded-l-2xl'
        } flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-label={`${category} details`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
            <p className="text-sm text-gray-500">
              Showing {matchingExpensesForCategory.length} of {expensesForCategory.length}{' '}
              transactions in this category
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close category details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-6 overflow-y-auto">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-blue-600 font-medium">
                Total Spent
              </p>
              <p className="text-xl font-semibold text-blue-900 mt-1">
                {formatCurrency(totals.sum)}
              </p>
              <p className="text-xs text-blue-700 mt-2">
                Across {totals.count} transaction{totals.count === 1 ? '' : 's'}
              </p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-600 font-medium">
                Average Spend
              </p>
              <p className="text-xl font-semibold text-emerald-900 mt-1">
                {formatCurrency(totals.average || 0)}
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                Per transaction
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-xs uppercase tracking-wide text-purple-600 font-medium">
                Recent Trend
              </p>
              {trend ? (
                <div className="flex items-center gap-2 mt-2 text-purple-900">
                  {trend.direction === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-red-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <p className="text-sm font-semibold">
                      {trend.direction === 'up' ? '+' : '-'}
                      {formatCurrency(trend.delta || 0)}
                    </p>
                    {trend.percentage && (
                      <p className="text-xs text-purple-700">
                        {trend.percentage.toFixed(1)}% vs previous month
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-2 text-purple-900">
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-semibold">Not enough data</span>
                </div>
              )}
            </div>
          </div>

          {/* Trend chart */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Monthly Trend</h3>
            {monthlyData.length > 0 ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Not enough historical data to display a trend.
              </p>
            )}
          </div>

          {/* Transactions */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Transactions</h3>
              <span className="text-xs text-gray-500">
                Showing {sortedExpenses.length} of {expensesForCategory.length}
              </span>
            </div>

            {sortedExpenses.length > 0 ? (
              <div className="space-y-3">
                {sortedExpenses.map((expense) => {
                  const label =
                    expense.expenseName ||
                    expense.name ||
                    `${category} expense`;
                  const person =
                    expense.personName ||
                    expense.personId ||
                    'Family (All Members)';
                  const receiptDate = expense.receiptScanDate
                    ? formatDate(expense.receiptScanDate)
                    : null;
                  const budgetLimit =
                    expense.budgetLimit !== undefined && expense.budgetLimit !== null
                      ? Number(expense.budgetLimit)
                      : null;

                  return (
                    <div
                      key={expense.id}
                      className="border border-gray-200 rounded-lg p-3 flex items-start justify-between gap-3 hover:border-blue-200 transition"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(expense.normalizedDate)}
                          {' · '}
                          {person}
                        </p>
                        {expense.notes && (
                          <p className="text-xs text-gray-500 mt-1">
                            {expense.notes}
                          </p>
                        )}
                        {expense.isReceiptScan && (
                          <div className="inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-full">
                            <Receipt className="w-3 h-3" />
                            Scanned receipt
                            {receiptDate ? ` · ${receiptDate}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(expense.numericAmount)}
                        </p>
                        {budgetLimit !== null && Number.isFinite(budgetLimit) && (
                          <p className="text-xs text-gray-500">
                            Budget: {formatCurrency(budgetLimit)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No transactions match the current filters.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDrilldownPanel;
