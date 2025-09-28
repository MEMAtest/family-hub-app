'use client'

import React from 'react';
import { ReportFilter } from '@/types/reporting.types';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, Target } from 'lucide-react';

interface CategoryAnalysisReportProps {
  filter: ReportFilter;
}

const CategoryAnalysisReportComponent: React.FC<CategoryAnalysisReportProps> = ({ filter }) => {
  const mockCategoryData = [
    {
      category: 'Food & Dining',
      budgeted: 800,
      actual: 875,
      variance: 75,
      trend: 'increasing',
      transactions: 42,
      topVendor: 'Tesco',
      avgTransaction: 20.83
    },
    {
      category: 'Transportation',
      budgeted: 450,
      actual: 520,
      variance: 70,
      trend: 'increasing',
      transactions: 18,
      topVendor: 'Shell',
      avgTransaction: 28.89
    },
    {
      category: 'Utilities',
      budgeted: 250,
      actual: 235,
      variance: -15,
      trend: 'stable',
      transactions: 4,
      topVendor: 'British Gas',
      avgTransaction: 58.75
    },
    {
      category: 'Entertainment',
      budgeted: 300,
      actual: 245,
      variance: -55,
      trend: 'decreasing',
      transactions: 12,
      topVendor: 'Netflix',
      avgTransaction: 20.42
    },
    {
      category: 'Shopping',
      budgeted: 400,
      actual: 485,
      variance: 85,
      trend: 'increasing',
      transactions: 23,
      topVendor: 'Amazon',
      avgTransaction: 21.09
    },
    {
      category: 'Healthcare',
      budgeted: 150,
      actual: 120,
      variance: -30,
      trend: 'stable',
      transactions: 3,
      topVendor: 'Boots',
      avgTransaction: 40.00
    }
  ];

  const pieChartData = mockCategoryData.map(item => ({
    name: item.category,
    value: item.actual,
    color: item.variance > 0 ? '#ef4444' : item.variance < -10 ? '#10b981' : '#f59e0b'
  }));

  const trendData = [
    { month: 'May', 'Food & Dining': 820, Transportation: 480, Shopping: 430, Entertainment: 280 },
    { month: 'Jun', 'Food & Dining': 850, Transportation: 495, Shopping: 445, Entertainment: 260 },
    { month: 'Jul', 'Food & Dining': 865, Transportation: 510, Shopping: 470, Entertainment: 250 },
    { month: 'Aug', 'Food & Dining': 875, Transportation: 520, Shopping: 485, Entertainment: 245 }
  ];

  const optimizationOpportunities = [
    {
      category: 'Food & Dining',
      type: 'reduce-spending',
      description: 'Consider meal planning and bulk buying to reduce food costs',
      potentialSavings: 125,
      effortLevel: 'medium',
      confidence: 85
    },
    {
      category: 'Transportation',
      type: 'find-alternatives',
      description: 'Explore public transport or carpooling options',
      potentialSavings: 90,
      effortLevel: 'medium',
      confidence: 70
    },
    {
      category: 'Shopping',
      type: 'eliminate-waste',
      description: 'Review subscription services and reduce impulse purchases',
      potentialSavings: 75,
      effortLevel: 'low',
      confidence: 90
    }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 50) return 'text-red-600 bg-red-50';
    if (variance < -20) return 'text-green-600 bg-green-50';
    return 'text-yellow-600 bg-yellow-50';
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Category Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Category Analysis - August 2025</h2>

        <div className="grid grid-cols-2 gap-8">
          {/* Spending Distribution */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Spending Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget vs Actual */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Budget vs Actual</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockCategoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="category"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    fontSize={12}
                  />
                  <YAxis tickFormatter={(value) => `£${value}`} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="budgeted" fill="#e5e7eb" name="Budgeted" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Category Performance Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Performance Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Budgeted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockCategoryData.map((category, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{category.category}</div>
                    <div className="text-sm text-gray-500">{category.topVendor}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(category.budgeted)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(category.actual)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getVarianceColor(category.variance)}`}>
                      {category.variance > 0 ? '+' : ''}{formatCurrency(category.variance)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTrendIcon(category.trend)}
                      <span className="ml-2 text-sm text-gray-600 capitalize">{category.trend}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {category.transactions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(category.avgTransaction)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trends Chart */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Trends (Last 4 Months)</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `£${value}`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Line type="monotone" dataKey="Food & Dining" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="Transportation" stroke="#f97316" strokeWidth={2} />
              <Line type="monotone" dataKey="Shopping" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="Entertainment" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Optimization Opportunities */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Optimization Opportunities</h3>
        <div className="space-y-4">
          {optimizationOpportunities.map((opportunity, index) => (
            <div key={index} className="flex items-start space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <Target className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{opportunity.category}</h4>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(opportunity.potentialSavings)} savings
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{opportunity.description}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span>Effort: <span className="capitalize">{opportunity.effortLevel}</span></span>
                  <span>Confidence: {opportunity.confidence}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
            <span className="font-medium text-green-800">Total Potential Monthly Savings: {formatCurrency(290)}</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Implementing these optimizations could save £3,480 annually
          </p>
        </div>
      </div>
    </div>
  );
};

export default CategoryAnalysisReportComponent;