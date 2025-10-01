'use client'

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Calendar,
  Store,
  Package,
  Users,
  AlertCircle,
  Download,
  Filter,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  RadialBarChart,
  RadialBar
} from 'recharts';

interface ShoppingAnalyticsProps {
  onClose?: () => void;
}

const ShoppingAnalytics: React.FC<ShoppingAnalyticsProps> = ({ onClose }) => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Mock spending data by month
  const monthlySpending = [
    { month: 'Jan', amount: 523.45, budget: 500, items: 89 },
    { month: 'Feb', amount: 478.20, budget: 500, items: 76 },
    { month: 'Mar', amount: 512.80, budget: 500, items: 82 },
    { month: 'Apr', amount: 489.30, budget: 500, items: 71 },
    { month: 'May', amount: 534.50, budget: 500, items: 93 },
    { month: 'Jun', amount: 456.90, budget: 500, items: 68 },
    { month: 'Jul', amount: 498.75, budget: 500, items: 78 },
    { month: 'Aug', amount: 521.40, budget: 500, items: 85 },
    { month: 'Sep', amount: 467.25, budget: 500, items: 72 },
    { month: 'Oct', amount: 503.60, budget: 500, items: 81 },
    { month: 'Nov', amount: 489.90, budget: 500, items: 77 },
    { month: 'Dec', amount: 545.30, budget: 500, items: 95 }
  ];

  // Category breakdown
  const categoryData = [
    { name: 'Groceries', value: 2834.50, color: '#10b981' },
    { name: 'Household', value: 892.30, color: '#3b82f6' },
    { name: 'Personal Care', value: 345.80, color: '#8b5cf6' },
    { name: 'School Supplies', value: 278.40, color: '#f59e0b' },
    { name: 'Clothing', value: 425.60, color: '#ef4444' },
    { name: 'Electronics', value: 189.90, color: '#ec4899' }
  ];

  // Store comparison
  const storeComparison = [
    { store: 'Tesco', visits: 48, avgSpend: 67.80, savings: 123.50 },
    { store: 'ASDA', visits: 32, avgSpend: 54.30, savings: 98.20 },
    { store: 'Sainsbury\'s', visits: 24, avgSpend: 78.90, savings: 67.40 },
    { store: 'Morrisons', visits: 18, avgSpend: 45.60, savings: 45.30 },
    { store: 'Aldi', visits: 28, avgSpend: 38.90, savings: 156.70 }
  ];

  // Weekly trends
  const weeklyTrends = [
    { day: 'Mon', amount: 45.30, items: 8 },
    { day: 'Tue', amount: 12.80, items: 3 },
    { day: 'Wed', amount: 67.90, items: 12 },
    { day: 'Thu', amount: 23.40, items: 5 },
    { day: 'Fri', amount: 89.50, items: 15 },
    { day: 'Sat', amount: 125.70, items: 22 },
    { day: 'Sun', amount: 78.20, items: 14 }
  ];

  // Shopping patterns
  const shoppingPatterns = {
    avgWeeklySpend: 115.60,
    avgItemsPerTrip: 8.5,
    mostExpensiveDay: 'Saturday',
    cheapestDay: 'Tuesday',
    peakShoppingTime: '10-12 AM',
    favoriteStore: 'Tesco',
    totalSavings: 491.10,
    priceAlertsUsed: 23
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSpent = monthlySpending.reduce((sum, m) => sum + m.amount, 0);
    const totalBudget = monthlySpending.reduce((sum, m) => sum + m.budget, 0);
    const totalItems = monthlySpending.reduce((sum, m) => sum + m.items, 0);
    const avgMonthly = totalSpent / monthlySpending.length;
    const savingsPercent = ((totalBudget - totalSpent) / totalBudget) * 100;

    return {
      totalSpent: totalSpent.toFixed(2),
      totalBudget: totalBudget.toFixed(2),
      totalItems,
      avgMonthly: avgMonthly.toFixed(2),
      savingsPercent: savingsPercent.toFixed(1),
      underBudget: totalSpent < totalBudget
    };
  }, [monthlySpending]);

  // Top items by frequency
  const topItems = [
    { name: 'Milk', frequency: 52, avgPrice: 1.45, trend: 'up' },
    { name: 'Bread', frequency: 48, avgPrice: 1.20, trend: 'stable' },
    { name: 'Eggs', frequency: 36, avgPrice: 2.80, trend: 'down' },
    { name: 'Bananas', frequency: 34, avgPrice: 0.85, trend: 'up' },
    { name: 'Chicken', frequency: 28, avgPrice: 5.50, trend: 'stable' }
  ];

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shopping Analytics</h2>
          <p className="text-gray-600 mt-1">Track your shopping patterns and spending habits</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'year')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Spent</span>
            <DollarSign className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">£{stats.totalSpent}</div>
              <div className={`text-sm ${stats.underBudget ? 'text-green-600' : 'text-red-600'} flex items-center mt-1`}>
                {stats.underBudget ? <ArrowDown className="w-3 h-3 mr-1" /> : <ArrowUp className="w-3 h-3 mr-1" />}
                {stats.savingsPercent}% under budget
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Items Purchased</span>
            <ShoppingCart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{stats.totalItems}</div>
          <div className="text-sm text-gray-500 mt-1">Avg {(stats.totalItems / 12).toFixed(0)} per month</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Savings</span>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-green-600">£{shoppingPatterns.totalSavings.toFixed(2)}</div>
          <div className="text-sm text-gray-500 mt-1">From deals & coupons</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Favorite Store</span>
            <Store className="w-5 h-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{shoppingPatterns.favoriteStore}</div>
          <div className="text-sm text-gray-500 mt-1">48 visits this year</div>
        </div>
      </div>

      {/* Spending Trends Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Spending Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={monthlySpending}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: any) => `£${value}`} />
            <Legend />
            <Area
              type="monotone"
              dataKey="budget"
              stackId="1"
              stroke="#e5e7eb"
              fill="#f3f4f6"
              name="Budget"
            />
            <Area
              type="monotone"
              dataKey="amount"
              stackId="2"
              stroke="#3b82f6"
              fill="#93c5fd"
              name="Actual"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }: any) => `${name}: £${value.toFixed(0)}`}
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `£${value}`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: cat.color }} />
                  <span className="text-gray-700">{cat.name}</span>
                </div>
                <span className="font-medium">£{cat.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Store Performance */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Store Comparison</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={storeComparison}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="store" />
              <YAxis />
              <Tooltip formatter={(value: any) => typeof value === 'number' ? `£${value.toFixed(2)}` : value} />
              <Legend />
              <Bar dataKey="avgSpend" fill="#3b82f6" name="Avg Spend" />
              <Bar dataKey="savings" fill="#10b981" name="Savings" />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {storeComparison.map((store) => (
              <div key={store.store} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{store.store}</span>
                <div className="flex items-center space-x-4">
                  <span className="text-gray-500">{store.visits} visits</span>
                  <span className="font-medium text-green-600">£{store.savings.toFixed(2)} saved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Pattern & Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Shopping Pattern */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Shopping Pattern</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value: any) => `£${value}`} />
              <Line type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Peak Day:</span>
              <span className="ml-2 font-medium">{shoppingPatterns.mostExpensiveDay}</span>
            </div>
            <div>
              <span className="text-gray-600">Quiet Day:</span>
              <span className="ml-2 font-medium">{shoppingPatterns.cheapestDay}</span>
            </div>
            <div>
              <span className="text-gray-600">Avg Weekly:</span>
              <span className="ml-2 font-medium">£{shoppingPatterns.avgWeeklySpend.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-600">Peak Time:</span>
              <span className="ml-2 font-medium">{shoppingPatterns.peakShoppingTime}</span>
            </div>
          </div>
        </div>

        {/* Frequently Purchased Items */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Purchased Items</h3>
          <div className="space-y-3">
            {topItems.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">Bought {item.frequency} times</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">£{item.avgPrice.toFixed(2)}</div>
                  <div className="flex items-center text-sm">
                    {item.trend === 'up' && (
                      <>
                        <ArrowUp className="w-3 h-3 text-red-500 mr-1" />
                        <span className="text-red-500">Rising</span>
                      </>
                    )}
                    {item.trend === 'down' && (
                      <>
                        <ArrowDown className="w-3 h-3 text-green-500 mr-1" />
                        <span className="text-green-500">Falling</span>
                      </>
                    )}
                    {item.trend === 'stable' && (
                      <span className="text-gray-500">Stable</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Shopping Insights</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• You save an average of 12% by shopping at Aldi compared to other stores</li>
              <li>• Your spending peaks on Saturdays - consider splitting large shops to manage budget</li>
              <li>• Price alerts have saved you £{shoppingPatterns.totalSavings.toFixed(2)} this year</li>
              <li>• Groceries account for 46% of your total shopping budget</li>
              <li>• You're consistently under budget by {stats.savingsPercent}% - great job!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShoppingAnalytics;