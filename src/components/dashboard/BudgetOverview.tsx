import React from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { BudgetTotals } from '@/types'

interface BudgetOverviewProps {
  budgetTotals: BudgetTotals
  onViewDetails: () => void
}

export default function BudgetOverview({ budgetTotals, onViewDetails }: BudgetOverviewProps) {
  const { totalIncome, totalExpenses, netAmount } = budgetTotals
  const isPositive = netAmount >= 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span className="ml-2 text-sm font-medium text-green-700">Income</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-green-900">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <span className="ml-2 text-sm font-medium text-red-700">Expenses</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-red-900">
            {formatCurrency(totalExpenses)}
          </p>
        </div>

        <div className={`p-4 rounded-lg ${isPositive ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <div className="flex items-center">
            <DollarSign className={`h-5 w-5 ${isPositive ? 'text-blue-600' : 'text-orange-600'}`} />
            <span className={`ml-2 text-sm font-medium ${isPositive ? 'text-blue-700' : 'text-orange-700'}`}>
              Net
            </span>
          </div>
          <p className={`mt-2 text-lg font-semibold ${isPositive ? 'text-blue-900' : 'text-orange-900'}`}>
            {formatCurrency(netAmount)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Budget Health</span>
          <span className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? 'On Track' : 'Over Budget'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isPositive ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{
              width: `${Math.min(100, Math.abs((totalExpenses / totalIncome) * 100))}%`
            }}
          />
        </div>
        <p className="text-xs text-gray-500">
          {totalIncome > 0
            ? `Spending ${((totalExpenses / totalIncome) * 100).toFixed(1)}% of income`
            : 'No income recorded'
          }
        </p>
      </div>

      {/* Top categories */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">Top Spending Categories</h4>
        {Object.entries(budgetTotals.categoryTotals)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([category, amount]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="text-sm text-gray-600 capitalize">{category}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(amount)}
              </span>
            </div>
          ))}
      </div>

      <button
        onClick={onViewDetails}
        className="w-full text-center py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        View detailed budget
      </button>
    </div>
  )
}