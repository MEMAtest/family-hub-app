'use client'

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  ReportFilter,
  MonthlyBudgetReport,
  BudgetInsight,
  BudgetRecommendation
} from '@/types/reporting.types';
import {
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface MonthlyBudgetReportProps {
  filter: ReportFilter;
}

const MonthlyBudgetReportComponent: React.FC<MonthlyBudgetReportProps> = ({ filter }) => {
  const [reportData, setReportData] = useState<MonthlyBudgetReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mock data for demonstration
  const mockReportData: MonthlyBudgetReport = {
    reportId: 'monthly-2025-09',
    familyId: 'family-1',
    reportMonth: 9,
    reportYear: 2025,
    generatedAt: new Date(),

    summary: {
      totalIncome: 8445,
      totalExpenses: 6100,
      netIncome: 2345,
      savingsRate: 27.8,
      budgetVariance: 150 // Over budget by £150
    },

    categoryAnalysis: {
      'Housing': {
        budgeted: 3500,
        actual: 3500,
        variance: 0,
        variancePercentage: 0,
        trend: 'stable',
        transactions: 3
      },
      'Transportation': {
        budgeted: 450,
        actual: 520,
        variance: -70,
        variancePercentage: -15.6,
        trend: 'increasing',
        transactions: 12
      },
      'Food & Dining': {
        budgeted: 400,
        actual: 350,
        variance: 50,
        variancePercentage: 12.5,
        trend: 'decreasing',
        transactions: 28
      },
      'Childcare': {
        budgeted: 1900,
        actual: 1817,
        variance: 83,
        variancePercentage: 4.4,
        trend: 'stable',
        transactions: 8
      },
      'Entertainment': {
        budgeted: 200,
        actual: 156,
        variance: 44,
        variancePercentage: 22.0,
        trend: 'decreasing',
        transactions: 15
      }
    },

    incomeBreakdown: {
      'Ade Salary': {
        amount: 4500,
        percentage: 53.3,
        monthOverMonthChange: 0
      },
      'Angela Salary': {
        amount: 3800,
        percentage: 45.0,
        monthOverMonthChange: 0
      },
      'Child Benefit': {
        amount: 145,
        percentage: 1.7,
        monthOverMonthChange: 0
      }
    },

    expenseAnalysis: {
      fixedExpenses: 5317, // Housing + childcare + subscriptions
      variableExpenses: 783, // Transportation + food + entertainment
      discretionarySpending: 156, // Entertainment
      necessityRatio: 87.2 // (Fixed + essential variable) / total
    },

    savingsProgress: {
      goalsOnTrack: 3,
      goalsBehindSchedule: 1,
      totalGoalProgress: 68.5,
      monthlyContributions: 800
    },

    insights: [
      {
        type: 'warning',
        title: 'Transportation Over Budget',
        description: 'Transportation expenses exceeded budget by £70 (15.6%)',
        impact: 'medium',
        category: 'Transportation',
        amount: 70,
        actionable: true,
        suggestedActions: ['Review fuel costs', 'Consider carpooling', 'Track mileage']
      },
      {
        type: 'achievement',
        title: 'Food Budget Success',
        description: 'Food expenses came in £50 under budget',
        impact: 'low',
        category: 'Food & Dining',
        amount: 50,
        actionable: false
      },
      {
        type: 'opportunity',
        title: 'High Savings Rate',
        description: 'Savings rate of 27.8% exceeds recommended 20%',
        impact: 'high',
        actionable: true,
        suggestedActions: ['Consider increasing investment contributions', 'Review additional savings goals']
      }
    ],

    recommendations: [
      {
        type: 'budget-adjustment',
        title: 'Increase Transportation Budget',
        description: 'Consider increasing transportation budget by £50-70 based on recent trends',
        effortLevel: 'low',
        timeframe: 'immediate',
        priority: 'medium',
        steps: [
          'Review last 3 months of transportation expenses',
          'Identify consistent overspending patterns',
          'Adjust monthly budget allocation',
          'Set up alerts for future monitoring'
        ]
      },
      {
        type: 'savings-optimization',
        title: 'Optimize Emergency Fund Goal',
        description: 'Emergency fund is ahead of schedule - consider reallocating excess to other goals',
        potentialSavings: 200,
        effortLevel: 'medium',
        timeframe: 'short-term',
        priority: 'low',
        steps: [
          'Evaluate current emergency fund target',
          'Compare to recommended 6-month expenses',
          'Consider reallocating £200/month to vacation fund',
          'Update automatic transfer amounts'
        ]
      }
    ]
  };

  useEffect(() => {
    // Simulate loading data
    setIsLoading(true);
    setTimeout(() => {
      setReportData(mockReportData);
      setIsLoading(false);
    }, 1000);
  }, [filter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <ArrowUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <ArrowDown className="w-4 h-4 text-green-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBudgetHealthColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Generating monthly report...</p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p className="text-gray-600">Unable to load report data</p>
      </div>
    );
  }

  // Prepare chart data
  const categoryData = Object.entries(reportData.categoryAnalysis).map(([name, data]) => ({
    name,
    budgeted: data.budgeted,
    actual: data.actual,
    variance: data.variance
  }));

  const incomeData = Object.entries(reportData.incomeBreakdown).map(([name, data]) => ({
    name,
    value: data.amount,
    percentage: data.percentage
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Monthly Budget Report - {new Date(reportData.reportYear, reportData.reportMonth - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="text-sm text-gray-500">
            Generated on {reportData.generatedAt.toLocaleDateString('en-GB')}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Total Income</p>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(reportData.summary.totalIncome)}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Total Expenses</p>
                <p className="text-xl font-bold text-red-800">
                  {formatCurrency(reportData.summary.totalExpenses)}
                </p>
              </div>
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Net Income</p>
                <p className="text-xl font-bold text-blue-800">
                  {formatCurrency(reportData.summary.netIncome)}
                </p>
              </div>
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Savings Rate</p>
                <p className="text-xl font-bold text-purple-800">
                  {reportData.summary.savingsRate.toFixed(1)}%
                </p>
              </div>
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Budget vs Actual Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Budget vs Actual by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `£${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => [`£${value.toLocaleString()}`, '']} />
              <Legend />
              <Bar dataKey="budgeted" name="Budgeted" fill="#3b82f6" />
              <Bar dataKey="actual" name="Actual" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Income Breakdown Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Income Sources</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={incomeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name}: ${(percentage as number).toFixed(1)}%`}
              >
                {incomeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `£${value.toLocaleString()}`} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Analysis Table */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Performance Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 font-medium text-gray-900">Category</th>
                <th className="text-right py-3 font-medium text-gray-900">Budgeted</th>
                <th className="text-right py-3 font-medium text-gray-900">Actual</th>
                <th className="text-right py-3 font-medium text-gray-900">Variance</th>
                <th className="text-center py-3 font-medium text-gray-900">Trend</th>
                <th className="text-center py-3 font-medium text-gray-900">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(reportData.categoryAnalysis).map(([category, data]) => (
                <tr key={category} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 font-medium text-gray-900">{category}</td>
                  <td className="text-right py-3 text-gray-700">
                    {formatCurrency(data.budgeted)}
                  </td>
                  <td className="text-right py-3 text-gray-700">
                    {formatCurrency(data.actual)}
                  </td>
                  <td className={`text-right py-3 font-medium ${getVarianceColor(data.variance)}`}>
                    {data.variance >= 0 ? '+' : ''}{formatCurrency(data.variance)}
                    <br />
                    <span className="text-xs">
                      ({data.variancePercentage >= 0 ? '+' : ''}{data.variancePercentage.toFixed(1)}%)
                    </span>
                  </td>
                  <td className="text-center py-3">
                    <div className="flex items-center justify-center">
                      {getTrendIcon(data.trend)}
                    </div>
                  </td>
                  <td className="text-center py-3 text-gray-700">{data.transactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights and Recommendations */}
      <div className="grid grid-cols-2 gap-6">
        {/* Key Insights */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-4">
            {reportData.insights.map((insight, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start space-x-3">
                  {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />}
                  {insight.type === 'achievement' && <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />}
                  {insight.type === 'opportunity' && <TrendingUp className="w-5 h-5 text-blue-500 mt-0.5" />}
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    {insight.amount && (
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        Amount: {formatCurrency(insight.amount)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          <div className="space-y-4">
            {reportData.recommendations.map((rec, index) => (
              <div key={index} className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900">{rec.title}</h4>
                <p className="text-sm text-blue-800 mt-1">{rec.description}</p>
                {rec.potentialSavings && (
                  <p className="text-sm font-medium text-blue-900 mt-1">
                    Potential savings: {formatCurrency(rec.potentialSavings)}/month
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-2 text-xs text-blue-700">
                  <span>Priority: {rec.priority}</span>
                  <span>Effort: {rec.effortLevel}</span>
                  <span>Timeline: {rec.timeframe}</span>
                </div>
                {rec.steps && rec.steps.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-blue-700 font-medium mb-1">Action steps:</p>
                    <ol className="text-xs text-blue-700 space-y-1 pl-4">
                      {rec.steps.map((step, stepIndex) => (
                        <li key={stepIndex} className="list-decimal">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expense Analysis */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Analysis</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Fixed Expenses</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(reportData.expenseAnalysis.fixedExpenses)}
            </p>
            <p className="text-xs text-gray-500">
              {((reportData.expenseAnalysis.fixedExpenses / reportData.summary.totalExpenses) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Variable Expenses</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(reportData.expenseAnalysis.variableExpenses)}
            </p>
            <p className="text-xs text-gray-500">
              {((reportData.expenseAnalysis.variableExpenses / reportData.summary.totalExpenses) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Discretionary</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(reportData.expenseAnalysis.discretionarySpending)}
            </p>
            <p className="text-xs text-gray-500">
              {((reportData.expenseAnalysis.discretionarySpending / reportData.summary.totalExpenses) * 100).toFixed(1)}% of total
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">Necessity Ratio</p>
            <p className="text-xl font-bold text-gray-900">
              {reportData.expenseAnalysis.necessityRatio.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">Essential vs total</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlyBudgetReportComponent;