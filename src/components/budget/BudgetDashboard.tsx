'use client'

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  Target,
  AlertTriangle,
  Plus,
  Filter,
  Calendar,
  Settings,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import { BudgetDashboardData, BudgetChartType } from '@/types/budget.types';
import MonthlyOverviewChart from './charts/MonthlyOverviewChart';
import CategorySpendingChart from './charts/CategorySpendingChart';
import IncomeVsExpensesChart from './charts/IncomeVsExpensesChart';
import SavingsProgressChart from './charts/SavingsProgressChart';
import BudgetVsActualChart from './charts/BudgetVsActualChart';
import ExpenseTrendsChart from './charts/ExpenseTrendsChart';
import SavingsGoalsChart from './charts/SavingsGoalsChart';
import CashFlowChart from './charts/CashFlowChart';
import AddIncomeModal from './modals/AddIncomeModal';
import AddExpenseModal from './modals/AddExpenseModal';
import AddSavingsGoalModal from './modals/AddSavingsGoalModal';
import BudgetSettingsModal from './modals/BudgetSettingsModal';
import AdvancedReportsDashboard from './reports/AdvancedReportsDashboard';

const BudgetDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<BudgetDashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeChartType, setActiveChartType] = useState<BudgetChartType>('monthly-overview');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddSavingsGoal, setShowAddSavingsGoal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedReports, setShowAdvancedReports] = useState(false);

  // Mock data for development
  const mockData: BudgetDashboardData = {
    currentMonth: {
      totalIncome: 8445,
      totalExpenses: 6100,
      netIncome: 2345,
      savingsRate: 27.8
    },
    categorySpending: [
      { name: 'Housing', value: 3500, color: '#374151', percentage: 57.4 },
      { name: 'Children', value: 1817, color: '#6B7280', percentage: 29.8 },
      { name: 'Transportation', value: 450, color: '#9CA3AF', percentage: 7.4 },
      { name: 'Food', value: 333, color: '#D1D5DB', percentage: 5.4 }
    ],
    monthlyTrends: [
      { month: 'Jan', income: 8300, expenses: 6200, netIncome: 2100, savingsRate: 25.3 },
      { month: 'Feb', income: 8400, expenses: 6150, netIncome: 2250, savingsRate: 26.8 },
      { month: 'Mar', income: 8350, expenses: 6300, netIncome: 2050, savingsRate: 24.6 },
      { month: 'Apr', income: 8500, expenses: 6250, netIncome: 2250, savingsRate: 26.5 },
      { month: 'May', income: 8445, expenses: 6100, netIncome: 2345, savingsRate: 27.8 }
    ],
    budgetVsActual: [
      { name: 'Housing', budgeted: 3500, actual: 3500, difference: 0 },
      { name: 'Children', budgeted: 1900, actual: 1817, difference: 83 },
      { name: 'Transport', budgeted: 500, actual: 450, difference: 50 },
      { name: 'Food', budgeted: 400, actual: 333, difference: 67 }
    ],
    savingsGoals: [],
    recentTransactions: [],
    alerts: []
  };

  useEffect(() => {
    // Simulate loading data
    const loadData = async () => {
      setIsLoading(true);
      // In a real app, this would fetch from API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDashboardData(mockData);
      setIsLoading(false);
    };

    loadData();
  }, [selectedMonth, selectedYear]);

  const chartComponents = {
    'monthly-overview': MonthlyOverviewChart,
    'category-spending': CategorySpendingChart,
    'income-vs-expenses': IncomeVsExpensesChart,
    'savings-progress': SavingsProgressChart,
    'budget-vs-actual': BudgetVsActualChart,
    'expense-trends': ExpenseTrendsChart,
    'savings-goals': SavingsGoalsChart,
    'cash-flow': CashFlowChart
  };

  const chartTitles = {
    'monthly-overview': 'Monthly Overview',
    'category-spending': 'Category Spending',
    'income-vs-expenses': 'Income vs Expenses',
    'savings-progress': 'Savings Progress',
    'budget-vs-actual': 'Budget vs Actual',
    'expense-trends': 'Expense Trends',
    'savings-goals': 'Savings Goals',
    'cash-flow': 'Cash Flow'
  };

  const getCurrentMonthName = () => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[selectedMonth - 1];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getHealthColor = (savingsRate: number) => {
    if (savingsRate >= 20) return 'text-green-600';
    if (savingsRate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const SelectedChart = chartComponents[activeChartType];

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading budget data...</span>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
        <div className="text-center text-gray-600">
          Unable to load budget data. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-light text-gray-900 mb-2">Budget Management</h1>
            <p className="text-gray-600">
              Financial overview for {getCurrentMonthName()} {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Month/Year Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2023, i).toLocaleDateString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="border border-gray-300 rounded-sm px-3 py-2 text-sm"
              >
                {Array.from({ length: 5 }, (_, i) => (
                  <option key={2021 + i} value={2021 + i}>
                    {2021 + i}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <button
              onClick={() => setShowAddIncome(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-sm hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Income
            </button>
            <button
              onClick={() => setShowAddExpense(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
            <button
              onClick={() => setShowAddSavingsGoal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Savings Goal
            </button>
            <button
              onClick={() => setShowAdvancedReports(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-sm hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Advanced Reports
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-sm hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-8">
        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Income</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-light text-green-600 mt-2">
                {formatCurrency(dashboardData.currentMonth.totalIncome)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Total Expenses</p>
              <p className="text-xl md:text-2xl lg:text-3xl font-light text-red-600 mt-2">
                {formatCurrency(dashboardData.currentMonth.totalExpenses)}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-400" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Net Income</p>
              <p className={`text-xl md:text-2xl lg:text-3xl font-light mt-2 ${dashboardData.currentMonth.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(dashboardData.currentMonth.netIncome)}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">Savings Rate</p>
              <p className={`text-xl md:text-2xl lg:text-3xl font-light mt-2 ${getHealthColor(dashboardData.currentMonth.savingsRate)}`}>
                {dashboardData.currentMonth.savingsRate.toFixed(1)}%
              </p>
            </div>
            <Target className="w-8 h-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Chart Selection Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {Object.entries(chartTitles).map(([key, title]) => (
              <button
                key={key}
                onClick={() => setActiveChartType(key as BudgetChartType)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeChartType === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {title}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Chart Display */}
      <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6 mb-4 md:mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-6">
          {chartTitles[activeChartType]}
        </h2>
        <SelectedChart data={dashboardData} />
      </div>

      {/* Modals */}
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        onSave={(data) => {
          console.log('Save income:', data);
          setShowAddIncome(false);
        }}
      />

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={(data) => {
          console.log('Save expense:', data);
          setShowAddExpense(false);
        }}
      />

      <AddSavingsGoalModal
        isOpen={showAddSavingsGoal}
        onClose={() => setShowAddSavingsGoal(false)}
        onSave={(data) => {
          console.log('Save savings goal:', data);
          setShowAddSavingsGoal(false);
        }}
      />

      <BudgetSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={() => {
          setShowSettings(false);
        }}
      />

      {/* Advanced Reports Modal */}
      {showAdvancedReports && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white w-full h-full overflow-auto">
            <AdvancedReportsDashboard onClose={() => setShowAdvancedReports(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetDashboard;