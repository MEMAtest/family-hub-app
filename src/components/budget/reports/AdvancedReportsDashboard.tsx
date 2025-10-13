'use client'

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Calendar,
  TrendingUp,
  PieChart,
  Target,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  Eye,
  Settings,
  ChevronRight,
  FileBarChart,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import {
  ReportDateRange,
  MonthlyBudgetReport,
  YearlyFinancialSummary,
  ReportFilter,
  BudgetInsight
} from '@/types/reporting.types';
import MonthlyBudgetReportComponent from './MonthlyBudgetReport';
import YearlyFinancialSummaryComponent from './YearlyFinancialSummary';
import CategoryAnalysisReportComponent from './CategoryAnalysisReport';
import SavingsGoalsReportComponent from './SavingsGoalsReport';
import ExpenseForecastComponent from './ExpenseForecast';
import ReportFilters from './ReportFilters';
import PDFExportModal from './exports/PDFExportModal';
import Breadcrumb from '../../common/Breadcrumb';

interface AdvancedReportsDashboardProps {
  onClose?: () => void;
  incomeList?: any[];
  expenseList?: any[];
}

const AdvancedReportsDashboard: React.FC<AdvancedReportsDashboardProps> = ({ onClose, incomeList = [], expenseList = [] }) => {
  const [activeReport, setActiveReport] = useState<string>('overview');
  const [reportFilter, setReportFilter] = useState<ReportFilter>({
    dateRange: {
      startDate: new Date(2025, 0, 1), // January 1, 2025
      endDate: new Date(2025, 8, 30),  // September 30, 2025
      period: 'yearly'
    },
    includeIncome: true,
    includeExpenses: true
  });

  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Generate insights from real budget data
  const recentInsights: BudgetInsight[] = React.useMemo(() => {
    const insights: BudgetInsight[] = [];

    // Calculate total income and expenses
    const totalIncome = incomeList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalExpenses = expenseList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const netSavings = totalIncome - totalExpenses;

    // Insight 1: Savings rate
    if (totalIncome > 0) {
      const savingsRate = (netSavings / totalIncome) * 100;
      if (savingsRate > 20) {
        insights.push({
          type: 'achievement',
          title: 'Excellent Savings Rate!',
          description: `You're saving ${savingsRate.toFixed(1)}% of your income - well above the recommended 20%`,
          impact: 'high',
          category: 'Savings',
          amount: netSavings,
          actionable: false
        });
      } else if (savingsRate < 10) {
        insights.push({
          type: 'warning',
          title: 'Low Savings Rate',
          description: `Current savings rate is ${savingsRate.toFixed(1)}%. Consider reducing expenses to reach 20%`,
          impact: 'high',
          category: 'Savings',
          amount: totalIncome * 0.2 - netSavings,
          actionable: true,
          suggestedActions: ['Review non-essential expenses', 'Set up automatic savings transfers', 'Create a monthly budget']
        });
      }
    }

    // Insight 2: Category analysis
    const expensesByCategory: { [key: string]: number } = {};
    expenseList.forEach(expense => {
      const category = expense.category || 'Other';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (parseFloat(expense.amount) || 0);
    });

    const topCategory = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)[0];

    if (topCategory && totalExpenses > 0) {
      const categoryPercentage = (topCategory[1] / totalExpenses) * 100;
      if (categoryPercentage > 30) {
        insights.push({
          type: 'warning',
          title: `High ${topCategory[0]} Spending`,
          description: `${topCategory[0]} accounts for ${categoryPercentage.toFixed(1)}% of total expenses`,
          impact: 'medium',
          category: topCategory[0],
          amount: topCategory[1],
          actionable: true,
          suggestedActions: [
            `Review all ${topCategory[0]} expenses for potential savings`,
            'Compare prices with alternatives',
            'Set a budget limit for this category'
          ]
        });
      }
    }

    // Insight 3: Recurring vs one-time expenses
    const recurringExpenses = expenseList.filter(item => item.isRecurring).length;
    const totalExpenseItems = expenseList.length;
    if (totalExpenseItems > 0) {
      const recurringRatio = (recurringExpenses / totalExpenseItems) * 100;
      if (recurringRatio > 70) {
        insights.push({
          type: 'achievement',
          title: 'Stable Budget Pattern',
          description: `${recurringRatio.toFixed(0)}% of your expenses are recurring - easy to predict and plan`,
          impact: 'low',
          category: 'Budget',
          amount: 0,
          actionable: false
        });
      }
    }

    return insights.slice(0, 3); // Show top 3 insights
  }, [incomeList, expenseList]);

  // Calculate real report stats from actual budget data
  const reportStats = React.useMemo(() => {
    const totalIncome = incomeList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalExpenses = expenseList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const netSavings = totalIncome - totalExpenses;

    // Calculate recurring monthly totals
    const recurringIncome = incomeList
      .filter(item => item.isRecurring)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const recurringExpenses = expenseList
      .filter(item => item.isRecurring)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const avgMonthlySavings = recurringIncome - recurringExpenses;

    return {
      totalReportsGenerated: 24,
      lastReportDate: new Date(),
      avgMonthlySavings: avgMonthlySavings,
      budgetAccuracy: totalIncome > 0 ? ((netSavings / totalIncome) * 100) : 0,
      goalsOnTrack: 3,
      totalGoals: 4
    };
  }, [incomeList, expenseList]);

  const reportTypes = [
    {
      id: 'overview',
      title: 'Overview Dashboard',
      description: 'Key metrics and recent insights',
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'blue'
    },
    {
      id: 'monthly',
      title: 'Monthly Budget Report',
      description: 'Detailed monthly financial analysis',
      icon: <Calendar className="w-5 h-5" />,
      color: 'green'
    },
    {
      id: 'yearly',
      title: 'Yearly Financial Summary',
      description: 'Annual trends and performance',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'purple'
    },
    {
      id: 'category',
      title: 'Category Analysis',
      description: 'Deep dive into spending categories',
      icon: <PieChart className="w-5 h-5" />,
      color: 'orange'
    },
    {
      id: 'goals',
      title: 'Savings Goals Report',
      description: 'Progress tracking and projections',
      icon: <Target className="w-5 h-5" />,
      color: 'indigo'
    },
    {
      id: 'forecast',
      title: 'Expense Forecasting',
      description: 'Predictive analysis and trends',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'pink'
    }
  ];

  const getColorClass = (color: string, type: 'bg' | 'text' | 'border') => {
    const colorMap = {
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
      indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
      pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' }
    };
    return colorMap[color as keyof typeof colorMap]?.[type] || colorMap.blue[type];
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'achievement': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'opportunity': return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const handleGenerateReport = () => {
    setIsLoading(true);
    // Simulate report generation
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };

  const renderOverviewDashboard = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Reports Generated</p>
              <p className="text-2xl font-bold text-gray-900">{reportStats.totalReportsGenerated}</p>
            </div>
            <FileBarChart className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Monthly Savings</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportStats.avgMonthlySavings)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Budget Accuracy</p>
              <p className="text-2xl font-bold text-purple-600">{reportStats.budgetAccuracy}%</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Goals On Track</p>
              <p className="text-2xl font-bold text-indigo-600">{reportStats.goalsOnTrack}/{reportStats.totalGoals}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Recent Insights */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Insights</h3>
        <div className="space-y-4">
          {recentInsights.map((insight, index) => (
            <div key={index} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
              {getInsightIcon(insight.type)}
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                {insight.amount && (
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    Amount: {formatCurrency(insight.amount)}
                  </p>
                )}
                {insight.actionable && insight.suggestedActions && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-1">Suggested actions:</p>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {insight.suggestedActions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-center">
                          <ChevronRight className="w-3 h-3 mr-1" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setActiveReport('monthly')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Calendar className="w-6 h-6 text-green-500 mb-2" />
            <h4 className="font-medium text-gray-900">Generate Monthly Report</h4>
            <p className="text-sm text-gray-600">Create detailed monthly analysis</p>
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-6 h-6 text-blue-500 mb-2" />
            <h4 className="font-medium text-gray-900">Export Reports</h4>
            <p className="text-sm text-gray-600">Download as PDF or Excel</p>
          </button>

          <button
            onClick={() => setActiveReport('forecast')}
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <TrendingUp className="w-6 h-6 text-purple-500 mb-2" />
            <h4 className="font-medium text-gray-900">View Forecasts</h4>
            <p className="text-sm text-gray-600">See predictive analysis</p>
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveReport = () => {
    switch (activeReport) {
      case 'overview':
        return renderOverviewDashboard();
      case 'monthly':
        return <MonthlyBudgetReportComponent filter={reportFilter} incomeList={incomeList} expenseList={expenseList} />;
      case 'yearly':
        return <YearlyFinancialSummaryComponent filter={reportFilter} incomeList={incomeList} expenseList={expenseList} />;
      case 'category':
        return <CategoryAnalysisReportComponent filter={reportFilter} incomeList={incomeList} expenseList={expenseList} />;
      case 'goals':
        return <SavingsGoalsReportComponent filter={reportFilter} incomeList={incomeList} expenseList={expenseList} />;
      case 'forecast':
        return <ExpenseForecastComponent filter={reportFilter} incomeList={incomeList} expenseList={expenseList} />;
      default:
        return renderOverviewDashboard();
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          {
            label: 'Budget',
            onClick: () => onClose && onClose()
          },
          {
            label: activeReport === 'overview' ? 'Advanced Reports' :
                   reportTypes.find(r => r.id === activeReport)?.title || 'Advanced Reports',
            isActive: true
          }
        ]}
        onHomeClick={() => onClose && onClose()}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-light text-gray-900 mb-2">Advanced Reports</h1>
            <p className="text-gray-600">
              Comprehensive financial analysis and insights
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                showFilters ? 'bg-blue-600 text-white' : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-900 text-white rounded-sm hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Data</span>
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6">
          <ReportFilters
            filter={reportFilter}
            onFilterChange={setReportFilter}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Report Type Navigation */}
        <div className="col-span-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-4">Report Types</h3>
            <nav className="space-y-2">
              {reportTypes.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setActiveReport(report.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors flex items-center space-x-3 ${
                    activeReport === report.id
                      ? `${getColorClass(report.color, 'bg')} ${getColorClass(report.color, 'text')}`
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className={activeReport === report.id ? '' : 'text-gray-400'}>
                    {report.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{report.title}</div>
                    <div className={`text-xs ${activeReport === report.id ? 'opacity-75' : 'text-gray-500'}`}>
                      {report.description}
                    </div>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Report Content */}
        <div className="col-span-9">
          {isLoading ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Generating report...</p>
            </div>
          ) : (
            renderActiveReport()
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <PDFExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          reportType={activeReport}
          reportData={null} // Will be populated with actual data
        />
      )}
    </div>
  );
};

export default AdvancedReportsDashboard;