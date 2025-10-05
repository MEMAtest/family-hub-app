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
  RefreshCw,
  Menu,
  X,
  ChevronDown
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
import databaseService from '@/services/databaseService';

const BudgetDashboard: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false)
  const [dashboardData, setDashboardData] = useState<BudgetDashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeChartType, setActiveChartType] = useState<BudgetChartType>('monthly-overview');
  const [isLoading, setIsLoading] = useState(true);

  // Mobile states
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showChartSelector, setShowChartSelector] = useState(false);

  // Modal states
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddSavingsGoal, setShowAddSavingsGoal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedReports, setShowAdvancedReports] = useState(false);

  // Lists state
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [expenseList, setExpenseList] = useState<any[]>([]);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load budget data from API on component mount
  useEffect(() => {
    const loadBudgetData = async () => {
      try {
        // Get current family from localStorage or state
        const familiesData = localStorage.getItem('families');
        if (!familiesData) return;

        const families = JSON.parse(familiesData);
        if (!families || families.length === 0) return;

        const currentFamily = families[0]; // Use first family for now

        // Fetch income and expenses from API
        const [incomeData, expenseData] = await Promise.all([
          fetch(`/api/families/${currentFamily.id}/budget/income`).then(res => res.json()),
          fetch(`/api/families/${currentFamily.id}/budget/expenses`).then(res => res.json())
        ]);

        if (Array.isArray(incomeData)) {
          setIncomeList(incomeData);
          console.log('Loaded income from API:', incomeData.length, 'items');
        }

        if (Array.isArray(expenseData)) {
          setExpenseList(expenseData);
          console.log('Loaded expenses from API:', expenseData.length, 'items');
        }
      } catch (error) {
        console.error('Error loading budget data:', error);

        // Fallback to localStorage
        const savedIncome = localStorage.getItem('budgetIncome');
        const savedExpenses = localStorage.getItem('budgetExpenses');

        if (savedIncome) {
          try {
            setIncomeList(JSON.parse(savedIncome));
          } catch (e) {
            console.error('Error loading saved income:', e);
          }
        }

        if (savedExpenses) {
          try {
            setExpenseList(JSON.parse(savedExpenses));
          } catch (e) {
            console.error('Error loading saved expenses:', e);
          }
        }
      }
    };

    loadBudgetData();
  }, []);

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
    // Calculate dashboard data from actual income and expense lists
    const calculateDashboardData = () => {
      setIsLoading(true);

      // Calculate totals
      const totalIncome = incomeList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const totalExpenses = expenseList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      const netIncome = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

      // Calculate category spending
      const categoryMap: { [key: string]: number } = {};
      expenseList.forEach(expense => {
        const category = expense.category || 'Other';
        categoryMap[category] = (categoryMap[category] || 0) + (parseFloat(expense.amount) || 0);
      });

      const categorySpending = Object.entries(categoryMap).map(([name, value]) => ({
        name,
        value,
        color: getColorForCategory(name),
        percentage: totalExpenses > 0 ? ((value / totalExpenses) * 100) : 0
      }));

      // Create updated dashboard data
      const updatedData: BudgetDashboardData = {
        currentMonth: {
          totalIncome,
          totalExpenses,
          netIncome,
          savingsRate
        },
        categorySpending,
        monthlyTrends: mockData.monthlyTrends, // Keep mock data for trends for now
        budgetVsActual: mockData.budgetVsActual, // Keep mock data for budget vs actual for now
        savingsGoals: [],
        recentTransactions: [],
        alerts: []
      };

      setDashboardData(updatedData);
      setIsLoading(false);
    };

    calculateDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomeList, expenseList]);

  // Helper function to assign colors to categories
  const getColorForCategory = (category: string): string => {
    const colorMap: { [key: string]: string } = {
      'Housing': '#374151',
      'Children': '#6B7280',
      'Transportation': '#9CA3AF',
      'Food': '#D1D5DB',
      'Utilities': '#6366F1',
      'Entertainment': '#8B5CF6',
      'Healthcare': '#EC4899',
      'Education': '#F59E0B',
      'Salary': '#10B981',
      'Employment': '#10B981',
      'Other': '#E5E7EB'
    };
    return colorMap[category] || '#9CA3AF';
  };

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

  // Mobile Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Budget</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChartSelector(!showChartSelector)}
            className="mobile-btn-secondary flex items-center gap-1 px-3 py-2"
          >
            <BarChart3 className="w-4 h-4" />
            <ChevronDown className={`w-4 h-4 transition-transform ${showChartSelector ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setShowMobileMenu(true)}
            className="mobile-btn-secondary p-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 text-sm">
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="mobile-select flex-1"
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
          className="mobile-select"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <option key={2021 + i} value={2021 + i}>
              {2021 + i}
            </option>
          ))}
        </select>
      </div>

      {/* Chart Selector Dropdown */}
      {showChartSelector && (
        <div className="absolute left-4 right-4 top-full bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-2">
          {Object.entries(chartTitles).map(([key, title]) => (
            <button
              key={key}
              onClick={() => {
                setActiveChartType(key as BudgetChartType);
                setShowChartSelector(false);
              }}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                activeChartType === key ? 'text-blue-600 bg-blue-50' : 'text-gray-900'
              }`}
            >
              {title}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Mobile Menu Overlay Component
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;

    return (
      <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMobileMenu(false)}>
        <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 pwa-safe-top">
            <h2 className="text-lg font-semibold text-gray-900">Budget Actions</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4 space-y-4">
            <button
              onClick={() => {
                setShowAddIncome(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-primary w-full flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Add Income
            </button>
            <button
              onClick={() => {
                setShowAddExpense(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-danger w-full flex items-center gap-3"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>
            <button
              onClick={() => {
                setShowAddSavingsGoal(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-secondary w-full flex items-center gap-3"
            >
              <Target className="w-5 h-5" />
              Savings Goal
            </button>
            <button
              onClick={() => {
                setShowAdvancedReports(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-secondary w-full flex items-center gap-3"
            >
              <BarChart3 className="w-5 h-5" />
              Advanced Reports
            </button>
            <button
              onClick={() => {
                setShowSettings(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-outline w-full flex items-center gap-3"
            >
              <Settings className="w-5 h-5" />
              Settings
            </button>
          </div>
        </div>
      </div>
    );
  };

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
    <div className={`bg-gray-50 min-h-screen ${isMobile ? 'pb-safe-bottom' : 'p-3 sm:p-4 md:p-6 lg:p-8'}`}>
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && (
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
      )}

      {/* Key Metrics Cards */}
      <div className={`grid gap-3 mb-4 md:mb-8 ${
        isMobile
          ? 'grid-cols-2 px-4'
          : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 md:gap-6'
      }`}>
        <div className={`bg-white border border-gray-200 ${
          isMobile ? 'p-3 rounded-xl' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-gray-600 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Total Income</p>
              <p className={`font-light text-green-600 mt-2 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl lg:text-3xl'
              }`}>
                {isMobile
                  ? `£${(dashboardData.currentMonth.totalIncome / 1000).toFixed(1)}k`
                  : formatCurrency(dashboardData.currentMonth.totalIncome)
                }
              </p>
            </div>
            <TrendingUp className={`text-green-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>

        <div className={`bg-white border border-gray-200 ${
          isMobile ? 'p-3 rounded-xl' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-gray-600 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Total Expenses</p>
              <p className={`font-light text-red-600 mt-2 ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl lg:text-3xl'
              }`}>
                {isMobile
                  ? `£${(dashboardData.currentMonth.totalExpenses / 1000).toFixed(1)}k`
                  : formatCurrency(dashboardData.currentMonth.totalExpenses)
                }
              </p>
            </div>
            <TrendingDown className={`text-red-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>

        <div className={`bg-white border border-gray-200 ${
          isMobile ? 'p-3 rounded-xl' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-gray-600 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Net Income</p>
              <p className={`font-light mt-2 ${
                dashboardData.currentMonth.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
              } ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl lg:text-3xl'
              }`}>
                {isMobile
                  ? `£${(dashboardData.currentMonth.netIncome / 1000).toFixed(1)}k`
                  : formatCurrency(dashboardData.currentMonth.netIncome)
                }
              </p>
            </div>
            <DollarSign className={`text-gray-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>

        <div className={`bg-white border border-gray-200 ${
          isMobile ? 'p-3 rounded-xl' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-gray-600 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Savings Rate</p>
              <p className={`font-light mt-2 ${getHealthColor(dashboardData.currentMonth.savingsRate)} ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl lg:text-3xl'
              }`}>
                {dashboardData.currentMonth.savingsRate.toFixed(1)}%
              </p>
            </div>
            <Target className={`text-blue-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>
      </div>

      {/* Chart Selection Tabs - Desktop Only */}
      {!isMobile && (
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
      )}

      {/* Main Chart Display */}
      <div className={`bg-white border border-gray-200 mb-4 md:mb-8 ${
        isMobile ? 'mx-4 p-4 rounded-xl' : 'p-3 sm:p-4 md:p-6'
      }`}>
        <h2 className={`font-medium text-gray-900 mb-6 ${
          isMobile ? 'text-base' : 'text-lg'
        }`}>
          {chartTitles[activeChartType]}
        </h2>
        <div className={isMobile ? 'mobile-chart-container' : ''}>
          <SelectedChart data={dashboardData} />
        </div>
      </div>

      {/* Income & Expense Lists */}
      <div className={`grid gap-6 mb-8 ${
        isMobile
          ? 'grid-cols-1 px-4'
          : 'grid-cols-1 md:grid-cols-2'
      }`}>
        {/* Income List */}
        <div className={`bg-white border border-gray-200 ${
          isMobile ? 'p-4 rounded-xl' : 'p-6'
        }`}>
          <h3 className={`font-medium text-gray-900 mb-4 flex items-center ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Income ({incomeList.length})
          </h3>
          {incomeList.length === 0 ? (
            <p className={`text-gray-500 text-center ${
              isMobile ? 'py-6 text-sm' : 'py-8'
            }`}>No income items added yet</p>
          ) : (
            <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
              {incomeList.map((income, index) => (
                <div key={income.id || index} className={`flex justify-between items-center bg-green-50 border ${
                  isMobile ? 'p-2 rounded-lg' : 'p-3 rounded-lg'
                }`}>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-gray-900 truncate ${
                      isMobile ? 'text-sm' : ''
                    }`}>{income.incomeName}</h4>
                    <p className={`text-gray-600 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}>{income.category}</p>
                    {income.isRecurring && (
                      <span className={`text-green-600 bg-green-100 px-2 py-1 rounded ${
                        isMobile ? 'text-xs' : 'text-xs'
                      }`}>Recurring</span>
                    )}
                  </div>
                  <div className="text-right ml-2">
                    <p className={`font-semibold text-green-600 ${
                      isMobile ? 'text-sm' : ''
                    }`}>£{income.amount?.toLocaleString()}</p>
                    {income.paymentDate && (
                      <p className="text-xs text-gray-500">{income.paymentDate}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Expense List */}
        <div className={`bg-white border border-gray-200 ${
          isMobile ? 'p-4 rounded-xl' : 'p-6'
        }`}>
          <h3 className={`font-medium text-gray-900 mb-4 flex items-center ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            Expenses ({expenseList.length})
          </h3>
          {expenseList.length === 0 ? (
            <p className={`text-gray-500 text-center ${
              isMobile ? 'py-6 text-sm' : 'py-8'
            }`}>No expense items added yet</p>
          ) : (
            <div className={isMobile ? 'space-y-2' : 'space-y-3'}>
              {expenseList.map((expense, index) => (
                <div key={expense.id || index} className={`flex justify-between items-center bg-red-50 border ${
                  isMobile ? 'p-2 rounded-lg' : 'p-3 rounded-lg'
                }`}>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium text-gray-900 truncate ${
                      isMobile ? 'text-sm' : ''
                    }`}>{expense.expenseName}</h4>
                    <p className={`text-gray-600 ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}>{expense.category}</p>
                    {expense.isRecurring && (
                      <span className={`text-red-600 bg-red-100 px-2 py-1 rounded ${
                        isMobile ? 'text-xs' : 'text-xs'
                      }`}>Recurring</span>
                    )}
                  </div>
                  <div className="text-right ml-2">
                    <p className={`font-semibold text-red-600 ${
                      isMobile ? 'text-sm' : ''
                    }`}>£{expense.amount?.toLocaleString()}</p>
                    {expense.paymentDate && (
                      <p className="text-xs text-gray-500">{expense.paymentDate}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        onSave={async (data) => {
          try {
            const newIncome = {
              id: `income-${Date.now()}`,
              ...data,
              createdAt: new Date().toISOString(),
            };

            console.log('Saving new income:', newIncome);
            const savedIncome = await databaseService.saveBudgetIncome(newIncome);

            if (savedIncome) {
              console.log('Income saved successfully:', savedIncome);
              // Update local state to show the new income
              setIncomeList(prev => [...prev, savedIncome]);
            }
          } catch (error) {
            console.error('Failed to save income:', error);
          }
          setShowAddIncome(false);
        }}
      />

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onSave={async (data) => {
          try {
            const newExpense = {
              id: `expense-${Date.now()}`,
              ...data,
              createdAt: new Date().toISOString(),
            };

            console.log('Saving new expense:', newExpense);
            const savedExpense = await databaseService.saveBudgetExpense(newExpense);

            if (savedExpense) {
              console.log('Expense saved successfully:', savedExpense);
              // Update local state to show the new expense
              setExpenseList(prev => [...prev, savedExpense]);
            }
          } catch (error) {
            console.error('Failed to save expense:', error);
          }
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

      {/* Mobile Menu Overlay */}
      {renderMobileMenu()}
    </div>
  );
};

export default BudgetDashboard;