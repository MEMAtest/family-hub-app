import React from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4']

interface BudgetData {
  category: string
  budgeted: number
  spent: number
  percentage: number
}

interface BudgetVisualizationProps {
  totalIncome: number
  totalExpenses: number
  categoryData: BudgetData[]
  onViewDetails: () => void
}

export default function BudgetVisualization({
  totalIncome,
  totalExpenses,
  categoryData,
  onViewDetails
}: BudgetVisualizationProps) {
  const netAmount = totalIncome - totalExpenses
  const isPositive = netAmount >= 0
  const spendingPercentage = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0

  // Prepare data for pie chart
  const pieData = categoryData.map((item, index) => ({
    name: item.category,
    value: item.spent,
    color: COLORS[index % COLORS.length]
  }))

  // Prepare data for bar chart
  const barData = categoryData.map(item => ({
    category: item.category.charAt(0).toUpperCase() + item.category.slice(1),
    budgeted: item.budgeted,
    spent: item.spent,
    percentage: item.percentage
  }))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'budgeted' ? 'Budgeted' : 'Spent'}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total Income</p>
              <p className="text-xl font-bold text-green-900 mt-1">
                {formatCurrency(totalIncome)}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-700">Total Expenses</p>
              <p className="text-xl font-bold text-red-900 mt-1">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br p-4 rounded-xl border ${
          isPositive
            ? 'from-blue-50 to-blue-100 border-blue-200'
            : 'from-orange-50 to-orange-100 border-orange-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${
                isPositive ? 'text-blue-700' : 'text-orange-700'
              }`}>
                Net Amount
              </p>
              <p className={`text-xl font-bold mt-1 ${
                isPositive ? 'text-blue-900' : 'text-orange-900'
              }`}>
                {formatCurrency(netAmount)}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isPositive ? 'bg-blue-500' : 'bg-orange-500'
            }`}>
              <DollarSign className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Spending Progress */}
      <div className="bg-gray-50 p-4 rounded-xl">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">Spending Progress</span>
          <span className={`text-sm font-semibold ${
            spendingPercentage > 100 ? 'text-red-600' : spendingPercentage > 80 ? 'text-orange-600' : 'text-green-600'
          }`}>
            {spendingPercentage.toFixed(1)}% of income
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              spendingPercentage > 100 ? 'bg-red-500' : spendingPercentage > 80 ? 'bg-orange-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, spendingPercentage)}%` }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-gray-600 capitalize">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Budget vs Actual</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="budgeted" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-gray-900">Category Breakdown</h4>
        {categoryData.map((category, index) => (
          <div key={category.category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="font-medium text-gray-900 capitalize">{category.category}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {formatCurrency(category.spent)} / {formatCurrency(category.budgeted)}
                </div>
                <div className={`text-xs ${
                  category.percentage > 100 ? 'text-red-600' : category.percentage > 80 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {category.percentage.toFixed(1)}% used
                </div>
              </div>
              <div className="w-20">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      category.percentage > 100 ? 'bg-red-500' : category.percentage > 80 ? 'bg-orange-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, category.percentage)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onViewDetails}
        className="w-full text-center py-3 text-blue-600 hover:text-blue-700 font-medium text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
      >
        View Detailed Budget Analysis
      </button>
    </div>
  )
}