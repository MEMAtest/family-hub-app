'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Plus,
  Settings,
  BarChart3,
  RefreshCw,
  Menu,
  X,
  PieChart as PieChartIcon,
  Camera,
  Search,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, LabelList
} from 'recharts';
import AddIncomeModal from './modals/AddIncomeModal';
import AddExpenseModal from './modals/AddExpenseModal';
import AddSavingsGoalModal from './modals/AddSavingsGoalModal';
import BudgetSettingsModal from './modals/BudgetSettingsModal';
import AdvancedReportsDashboard from './reports/AdvancedReportsDashboard';
import { AIInsightsCard } from './AIInsightsCard';
import { ReceiptScanner } from './ReceiptScanner';
import databaseService from '@/services/databaseService';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { filterExpenses, filterIncome } from '@/utils/budgetFilters';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number; // Allow additional properties for Recharts
}

const SimpleBudgetDashboard: React.FC = () => {
  const budgetData = useFamilyStore((state) => state.budgetData);
  const databaseStatus = useFamilyStore((state) => state.databaseStatus);
  const familyId = databaseStatus.familyId;

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<'all' | 'receipt-scans'>('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Month/Year navigation state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Modal states
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddSavingsGoal, setShowAddSavingsGoal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedReports, setShowAdvancedReports] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);

  // Edit mode states
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Lists state - derived from budgetData
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [expenseList, setExpenseList] = useState<any[]>([]);

  // Expand/collapse state for lists
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // Color palette for charts
  const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#F43F5E'];

  // Helper function to assign colors to categories (must be defined before useMemo)
  const getColorForCategory = useCallback((category: string, index: number = 0): string => {
    const colorMap: { [key: string]: string } = {
      // Expense categories
      'Housing': '#3B82F6',        // Blue
      'Children': '#10B981',       // Green
      'Transportation': '#F59E0F', // Amber
      'Food & Dining': '#EF4444',  // Red
      'Food': '#EF4444',           // Red
      'Utilities': '#8B5CF6',      // Purple
      'Entertainment': '#EC4899',  // Pink
      'Healthcare': '#06B6D4',     // Cyan
      'Education': '#F97316',      // Orange
      'Other': '#6B7280',          // Gray
      // Income categories
      'Salary': '#10B981',         // Green
      'Test': '#3B82F6',           // Blue - distinct from Salary
      'Employment': '#059669',     // Emerald
      'Freelance': '#06B6D4',      // Cyan
      'Investment': '#F59E0B',     // Amber
      'Business': '#8B5CF6',       // Purple
      'Rental': '#EC4899',         // Pink
      'Other Income': '#6B7280'    // Gray
    };
    return colorMap[category] || CHART_COLORS[index % CHART_COLORS.length];
  }, []);

  const sanitizeBudgetItems = useCallback((items: any[]) => {
    return (items ?? []).filter((item): item is Record<string, any> => !!item && typeof item === 'object');
  }, []);

  const persistBudgetLists = useCallback((incomeItems: any[], expenseItems: any[]) => {
    if (typeof window === 'undefined') return;
    try {
      const safeIncome = sanitizeBudgetItems(incomeItems);
      const safeExpenses = sanitizeBudgetItems(expenseItems);
      window.localStorage.setItem('budgetIncome', JSON.stringify(safeIncome));
      window.localStorage.setItem('budgetExpenses', JSON.stringify(safeExpenses));
    } catch (error) {
      console.warn('Failed to persist budget lists to localStorage', error);
    }
  }, [sanitizeBudgetItems]);

  // Load budget data from store
  useEffect(() => {
    const loadBudgetData = async () => {
      try {
        if (!familyId) {
          console.log('No family ID available yet');
          return;
        }

        console.log('Loading budget data for family:', familyId);

        let incomeItems: any[] = [];
        let expenseItems: any[] = [];

        const hasStoreBudget = Boolean(budgetData && (budgetData.income || budgetData.expenses));

        if (hasStoreBudget) {
          console.log('Using budget data from store');

          incomeItems = [
            ...Object.values(budgetData?.income?.monthly || {}),
            ...(budgetData?.income?.oneTime || [])
          ];

          expenseItems = [
            ...Object.values(budgetData?.expenses?.recurringMonthly || {}),
            ...(budgetData?.expenses?.oneTimeSpends || [])
          ];
        } else {
          console.log('Fetching budget data from API');
          const [incomeData, expenseData] = await Promise.all([
            fetch(`/api/families/${familyId}/budget/income`).then((res) => res.json()),
            fetch(`/api/families/${familyId}/budget/expenses`).then((res) => res.json()),
          ]);

          if (Array.isArray(incomeData)) {
            incomeItems = incomeData;
            console.log('Loaded income from API:', incomeData.length, 'items');
          }

          if (Array.isArray(expenseData)) {
            expenseItems = expenseData;
            console.log('Loaded expenses from API:', expenseData.length, 'items');
          }
        }

        if (incomeItems.length || expenseItems.length) {
          const safeIncome = sanitizeBudgetItems(incomeItems);
          const safeExpenses = sanitizeBudgetItems(expenseItems);
          setIncomeList(safeIncome);
          setExpenseList(safeExpenses);
          persistBudgetLists(safeIncome, safeExpenses);
        }
      } catch (error) {
        console.error('Error loading budget data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBudgetData();
  }, [familyId, budgetData, persistBudgetLists, sanitizeBudgetItems]);

  // Helper function to filter items by selected month/year (must be before useMemo hooks)
  const filterByMonth = useCallback((item: any) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    // For recurring items, check if selected month falls within the recurring date range
    if ((item as any).isRecurring) {
      const selectedDate = new Date(selectedYear, selectedMonth - 1, 1); // First day of selected month
      const selectedDateEnd = new Date(selectedYear, selectedMonth, 0); // Last day of selected month

      // Determine the start date for the recurring item
      const startDate = item.recurringStartDate
        ? new Date(item.recurringStartDate)
        : item.createdAt
          ? new Date(item.createdAt)
          : selectedDate;

      if (Number.isNaN(startDate.getTime())) {
        return false;
      }

      // Check if the selected month is before the start date
      if (selectedDateEnd < startDate) {
        return false; // Selected month is before the recurring period starts
      }

      // Determine the end date for the recurring item
      if (item.recurringEndDate) {
        const endDate = new Date(item.recurringEndDate);
        if (Number.isNaN(endDate.getTime())) {
          return false;
        }
        // Check if the selected month is after the end date
        if (selectedDate > endDate) {
          return false; // Selected month is after the recurring period ends
        }
      }

      // Apply frequency logic
      const frequency = item.recurringFrequency || 'monthly';

      if (frequency === 'weekly') {
        // For weekly, include if the selected month is within the range
        // (weekly items appear in every month they're active)
        return true;
      } else if (frequency === 'monthly') {
        // For monthly, include if the selected month is within the range
        return true;
      } else if (frequency === 'yearly') {
        // For yearly, only include if the selected month matches the start month
        const startMonth = startDate.getMonth();
        return (selectedMonth - 1) === startMonth;
      }

      return true; // Default: include the item
    }

    // For one-time items, match the exact month/year using paymentDate
    if (!item.paymentDate && !item.createdAt) return false;
    const dateToCheck = new Date(item.paymentDate || item.createdAt);
    if (Number.isNaN(dateToCheck.getTime())) return false;
    return (
      dateToCheck.getMonth() + 1 === selectedMonth &&
      dateToCheck.getFullYear() === selectedYear
    );
  }, [selectedMonth, selectedYear]);

  // Calculate all dashboard data from real income and expense lists filtered by selected month
  const dashboardData = useMemo(() => {
    // Filter lists by selected month/year
    const filteredIncome = sanitizeBudgetItems(incomeList).filter(filterByMonth);
    const filteredExpenses = sanitizeBudgetItems(expenseList).filter(filterByMonth);

    const totalIncome = filteredIncome.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const netIncome = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

    // Calculate category spending from filtered expenses
    const categoryMap: { [key: string]: number } = {};
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryMap[category] = (categoryMap[category] || 0) + (parseFloat(expense.amount) || 0);
    });

    const categorySpending: CategoryData[] = Object.entries(categoryMap).map(([name, value], index) => ({
      name,
      value,
      color: getColorForCategory(name, index),
      percentage: totalExpenses > 0 ? ((value / totalExpenses) * 100) : 0
    }));

    // Calculate income by category from filtered income
    const incomeCategoryMap: { [key: string]: number } = {};
    filteredIncome.forEach(income => {
      const category = income.category || 'Other Income';
      incomeCategoryMap[category] = (incomeCategoryMap[category] || 0) + (parseFloat(income.amount) || 0);
    });

    const incomeByCategory: CategoryData[] = Object.entries(incomeCategoryMap).map(([name, value], index) => ({
      name,
      value,
      color: getColorForCategory(name, index),
      percentage: totalIncome > 0 ? ((value / totalIncome) * 100) : 0
    }));

    // Prepare comparison chart data
    const comparisonData = [
      { name: 'Income', amount: totalIncome, fill: '#10B981' },
      { name: 'Expenses', amount: totalExpenses, fill: '#EF4444' },
      { name: 'Net', amount: netIncome, fill: netIncome >= 0 ? '#3B82F6' : '#F59E0B' }
    ];

    return {
      totalIncome,
      totalExpenses,
      netIncome,
      savingsRate,
      categorySpending,
      incomeByCategory,
      comparisonData,
      filteredIncome,
      filteredExpenses
    };
  }, [incomeList, expenseList, selectedMonth, selectedYear, getColorForCategory, filterByMonth, sanitizeBudgetItems]);

  const visibleIncome = useMemo(() => {
    if (!dashboardData) return [] as any[];
    return filterIncome(dashboardData.filteredIncome as any[], searchQuery);
  }, [dashboardData, searchQuery]);

  const visibleExpenses = useMemo(() => {
    if (!dashboardData) return [] as any[];
    return filterExpenses(dashboardData.filteredExpenses as any[], searchQuery, { viewTab });
  }, [dashboardData, searchQuery, viewTab]);

  // Helper function for currency formatting (defined before useMemo hooks that use it)
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }, []);

  // Calculate monthly trends for last 6 months
  const monthlyTrendsData = useMemo(() => {
    const trends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - 1 - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const monthIncome = incomeList.filter(item => {
        if (!item.paymentDate && !item.createdAt) return false;
        const itemDate = new Date(item.paymentDate || item.createdAt);
        return itemDate.getMonth() + 1 === month && itemDate.getFullYear() === year;
      }).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

      const monthExpenses = expenseList.filter(item => {
        if (!item.paymentDate && !item.createdAt) return false;
        const itemDate = new Date(item.paymentDate || item.createdAt);
        return itemDate.getMonth() + 1 === month && itemDate.getFullYear() === year;
      }).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

      trends.push({
        month: date.toLocaleDateString('en-GB', { month: 'short' }),
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses,
        savingsRate: monthIncome > 0 ? ((monthIncome - monthExpenses) / monthIncome * 100) : 0
      });
    }
    return trends;
  }, [incomeList, expenseList, selectedMonth, selectedYear]);


  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const getHealthColor = (savingsRate: number) => {
    if (savingsRate >= 20) return 'text-green-600';
    if (savingsRate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1];
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Mobile Header Component
  const renderMobileHeader = () => (
    <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-4 py-3 sticky top-0 z-40 pwa-safe-top">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <DollarSign className="w-6 h-6 text-blue-600" />
          <h1 className="mobile-title">Budget</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="mobile-btn-secondary p-2"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPreviousMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <p className="text-sm font-medium text-gray-900">
          {getMonthName(selectedMonth)} {selectedYear}
        </p>
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );

  // Mobile Menu Overlay Component
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;

    return (
      <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowMobileMenu(false)}>
        <div className="absolute right-0 top-0 h-full w-80 surface-card shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 pwa-safe-top">
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
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-slate-950 min-h-screen">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading budget data...</span>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="p-3 sm:p-4 md:p-6 lg:p-8 bg-gray-50 dark:bg-slate-950 min-h-screen">
        <div className="max-w-xl mx-auto text-center surface-card rounded-lg p-6">
          <p className="text-gray-600">
            Budget data is not available yet. Please add income or expenses to get started.
          </p>
          <button
            onClick={() => setShowAddExpense(true)}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Add first expense
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 dark:bg-slate-950 min-h-screen ${isMobile ? 'pb-safe-bottom' : 'p-3 sm:p-4 md:p-6 lg:p-8'}`}>
      {/* Mobile Header */}
      {isMobile && renderMobileHeader()}

      {/* Desktop Header */}
      {!isMobile && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-light text-gray-900 mb-2">Budget Management</h1>
              <div className="flex items-center gap-3">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Previous month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-lg font-medium text-gray-900 min-w-[200px] text-center">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Next month"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
                onClick={() => setShowReceiptScanner(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-sm hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Scan Receipt
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
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-sm hover:bg-gray-50 dark:bg-slate-950 transition-colors text-sm font-medium"
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
        <div className={`surface-card ${
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
                  ? `£${(dashboardData.totalIncome / 1000).toFixed(1)}k`
                  : formatCurrency(dashboardData.totalIncome)
                }
              </p>
            </div>
            <TrendingUp className={`text-green-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>

        <div className={`surface-card ${
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
                  ? `£${(dashboardData.totalExpenses / 1000).toFixed(1)}k`
                  : formatCurrency(dashboardData.totalExpenses)
                }
              </p>
            </div>
            <TrendingDown className={`text-red-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>

        <div className={`surface-card ${
          isMobile ? 'p-3 rounded-xl' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-gray-600 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Net Income</p>
              <p className={`font-light mt-2 ${
                dashboardData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
              } ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl lg:text-3xl'
              }`}>
                {isMobile
                  ? `£${(dashboardData.netIncome / 1000).toFixed(1)}k`
                  : formatCurrency(dashboardData.netIncome)
                }
              </p>
            </div>
            <DollarSign className={`text-gray-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>

        <div className={`surface-card ${
          isMobile ? 'p-3 rounded-xl' : 'p-3 sm:p-4 md:p-6'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-medium text-gray-600 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Savings Rate</p>
              <p className={`font-light mt-2 ${getHealthColor(dashboardData.savingsRate)} ${
                isMobile ? 'text-lg' : 'text-xl md:text-2xl lg:text-3xl'
              }`}>
                {dashboardData.savingsRate.toFixed(1)}%
              </p>
            </div>
            <Target className={`text-blue-400 ${
              isMobile ? 'w-6 h-6' : 'w-8 h-8'
            }`} />
          </div>
        </div>
      </div>

      {/* 6-Month Trend Chart */}
      <div className={`surface-card mb-4 md:mb-8 ${
        isMobile ? 'mx-4 p-4 rounded-xl' : 'p-6'
      }`}>
        <h2 className={`font-medium text-gray-900 mb-6 ${
          isMobile ? 'text-base' : 'text-lg'
        }`}>
          6-Month Trend
        </h2>
        <div className={isMobile ? 'h-64' : 'h-80'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Expenses" />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Net" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Showing trends from {monthlyTrendsData[0]?.month} to {monthlyTrendsData[5]?.month} {selectedYear}</p>
        </div>
      </div>

      {/* Smart Spending Insights Section */}
      <div className={isMobile ? 'mx-4 mb-4 md:mb-8' : 'mb-4 md:mb-8'}>
        <AIInsightsCard
          familyId={familyId || ''}
          month={selectedMonth}
          year={selectedYear}
        />
      </div>

      {/* Charts Grid */}
      <div className={`grid gap-4 md:gap-6 mb-4 md:mb-8 ${
        isMobile ? 'grid-cols-1 px-4' : 'grid-cols-1 lg:grid-cols-2'
      }`}>
        {/* Income vs Expenses Comparison */}
        <div className={`surface-card ${
          isMobile ? 'p-4 rounded-xl' : 'p-6'
        }`}>
          <h2 className={`font-medium text-gray-900 mb-6 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            Income vs Expenses
          </h2>
          <div className={isMobile ? 'h-64' : 'h-80'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>Savings Rate:</strong> {dashboardData.savingsRate.toFixed(1)}% - This is calculated as (Net Income / Total Income) × 100</p>
            <p className="mt-2"><strong>Net Income:</strong> Total Income (£{dashboardData.totalIncome.toLocaleString()}) - Total Expenses (£{dashboardData.totalExpenses.toLocaleString()}) = £{dashboardData.netIncome.toLocaleString()}</p>
          </div>
        </div>

        {/* Expense Breakdown by Category */}
        {dashboardData.categorySpending.length > 0 && (
          <div className={`surface-card ${
            isMobile ? 'p-4 rounded-xl' : 'p-6'
          }`}>
            <h2 className={`font-medium text-gray-900 mb-6 flex items-center ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              <PieChartIcon className="w-5 h-5 mr-2" />
              Expense Breakdown
            </h2>
            <div className={isMobile ? 'h-64' : 'h-80'}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.categorySpending}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }: any) => `${name}: ${(percentage as number).toFixed(0)}%`}
                    outerRadius={isMobile ? 90 : 120}
                    dataKey="value"
                    nameKey="name"
                  >
                    {dashboardData.categorySpending.map((entry, index) => {
                      console.log('Expense category:', entry.name, 'Color:', entry.color);
                      return <Cell key={`cell-expense-${index}`} fill={entry.color} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                  />
                  <Legend
                    formatter={(value, entry: any) => value}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Income Breakdown by Category */}
        {dashboardData.incomeByCategory.length > 0 && (
          <div className={`surface-card ${
            isMobile ? 'p-4 rounded-xl' : 'p-6'
          }`}>
            <h2 className={`font-medium text-gray-900 mb-6 flex items-center ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              <PieChartIcon className="w-5 h-5 mr-2" />
              Income Breakdown
            </h2>
            <div className={isMobile ? 'h-64' : 'h-80'}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.incomeByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }: any) => `${name}: ${(percentage as number).toFixed(0)}%`}
                    outerRadius={isMobile ? 90 : 120}
                    dataKey="value"
                    nameKey="name"
                  >
                    {dashboardData.incomeByCategory.map((entry, index) => {
                      console.log('Income category:', entry.name, 'Color:', entry.color);
                      return <Cell key={`cell-income-${index}`} fill={entry.color} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc' }}
                  />
                  <Legend
                    formatter={(value, entry: any) => value}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Category Summary Table */}
        <div className={`surface-card ${
          isMobile ? 'p-4 rounded-xl' : 'p-6'
        }`}>
          <h2 className={`font-medium text-gray-900 mb-4 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            Category Summary
          </h2>
          <div className="overflow-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-950">
                <tr>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-right p-2">%</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.categorySpending.map((cat, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{cat.name}</td>
                    <td className="text-right p-2 font-medium">{formatCurrency(cat.value)}</td>
                    <td className="text-right p-2">{cat.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="border-t font-bold bg-gray-50 dark:bg-slate-950">
                  <td className="p-2">Total Expenses</td>
                  <td className="text-right p-2">{formatCurrency(dashboardData.totalExpenses)}</td>
                  <td className="text-right p-2">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className={`${isMobile ? 'px-4' : ''} mb-6`}>
        <div
          className={`surface-card ${
            isMobile
              ? 'p-3 rounded-xl space-y-3'
              : 'p-4 rounded-lg flex items-center justify-between gap-4'
          }`}
        >
          <div className={`relative ${isMobile ? 'w-full' : 'w-80'}`}>
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              type="search"
              placeholder="Search income, expenses, or amounts"
              className="w-full border border-gray-200 dark:border-slate-800 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className={`flex ${isMobile ? 'w-full' : ''} gap-2`}>
            <button
              type="button"
              onClick={() => setViewTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'flex-1 text-center' : ''}`}
            >
              All items
            </button>
            <button
              type="button"
              onClick={() => setViewTab('receipt-scans')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewTab === 'receipt-scans'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'flex-1 text-center' : ''}`}
            >
              Receipt scans
            </button>
          </div>
        </div>
      </div>

      {/* Income & Expense Lists */}
      <div className={`grid gap-6 mb-8 ${
        isMobile
          ? 'grid-cols-1 px-4'
          : 'grid-cols-1 md:grid-cols-2'
      }`}>
        {/* Income List */}
        <div className={`surface-card ${
          isMobile ? 'p-4 rounded-xl' : 'p-6'
        }`}>
          <h3 className={`font-medium text-gray-900 mb-4 flex items-center ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Income ({visibleIncome.length})
          </h3>
          {visibleIncome.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? `No income matching "${searchQuery}"`
                  : `No income for ${getMonthName(selectedMonth)} ${selectedYear}`}
              </p>
              <button
                onClick={() => setShowAddIncome(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Income
              </button>
            </div>
          ) : (
            <>
              <div className={`${isMobile ? 'space-y-2' : 'space-y-3'} max-h-96 overflow-y-auto`}>
                {(showAllIncome ? visibleIncome : visibleIncome.slice(0, 5)).map((income, index) => (
                  <div
                    key={income.id || index}
                    onClick={() => {
                      setEditingIncome(income);
                      setShowAddIncome(true);
                    }}
                    className={`flex justify-between items-center bg-green-50 border cursor-pointer hover:bg-green-100 transition-colors ${
                      isMobile ? 'p-2 rounded-lg' : 'p-3 rounded-lg'
                    }`}
                  >
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
                        <p className="text-xs text-gray-500">Date: {formatDate(income.paymentDate)}</p>
                      )}
                      {income.createdAt && !income.paymentDate && (
                        <p className="text-xs text-gray-500">Added: {formatDate(income.createdAt)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {visibleIncome.length > 5 && (
                <button
                  onClick={() => setShowAllIncome(!showAllIncome)}
                  className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {showAllIncome ? '▲ Show Less' : `▼ Show More (${visibleIncome.length - 5} more)`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Expense List */}
        <div className={`surface-card ${
          isMobile ? 'p-4 rounded-xl' : 'p-6'
        }`}>
          <h3 className={`font-medium text-gray-900 mb-4 flex items-center ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            {viewTab === 'receipt-scans' ? 'Receipt Scans' : 'Expenses'} ({visibleExpenses.length})
          </h3>
          {visibleExpenses.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
              <p className="text-gray-500 text-sm">
                {searchQuery || viewTab === 'receipt-scans'
                  ? `No ${viewTab === 'receipt-scans' ? 'receipt scans' : 'expenses'} matching your filters`
                  : `No expenses for ${getMonthName(selectedMonth)} ${selectedYear}`}
              </p>
              <button
                onClick={() => setShowAddExpense(true)}
                className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                + Add Expense
              </button>
            </div>
          ) : (
            <>
              <div className={`${isMobile ? 'space-y-2' : 'space-y-3'} max-h-96 overflow-y-auto`}>
                {(showAllExpenses ? visibleExpenses : visibleExpenses.slice(0, 5)).map((expense, index) => {
                  // Calculate budget usage percentage
                  const budgetLimit = expense.budgetLimit;
                  const amount = parseFloat(expense.amount) || 0;
                  const percentageUsed = budgetLimit ? (amount / budgetLimit) * 100 : 0;

                  // Determine color based on usage
                  let budgetColor = 'bg-green-500'; // Good: < 70%
                  let textColor = 'text-green-700';
                  let bgColor = 'bg-red-50';
                  let borderColor = 'border-green-200';

                  if (percentageUsed >= 90) {
                    budgetColor = 'bg-red-500'; // Danger: >= 90%
                    textColor = 'text-red-700';
                    bgColor = 'bg-red-100';
                    borderColor = 'border-red-300';
                  } else if (percentageUsed >= 70) {
                    budgetColor = 'bg-yellow-500'; // Warning: >= 70%
                    textColor = 'text-yellow-700';
                    bgColor = 'bg-yellow-50';
                    borderColor = 'border-yellow-200';
                  }

                  return (
                    <div
                      key={expense.id || index}
                      onClick={() => {
                        setEditingExpense(expense);
                        setShowAddExpense(true);
                      }}
                      className={`cursor-pointer hover:shadow-md transition-all ${
                        isMobile ? 'p-2 rounded-lg' : 'p-3 rounded-lg'
                      } ${bgColor} border ${borderColor}`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-medium text-gray-900 truncate ${
                            isMobile ? 'text-sm' : ''
                          }`}>{expense.expenseName}</h4>
                          <p className={`text-gray-600 ${
                            isMobile ? 'text-xs' : 'text-sm'
                          }`}>{expense.category}</p>
                          {expense.isRecurring && (
                            <span className={`inline-block mt-1 text-red-600 bg-red-100 px-2 py-1 rounded ${
                              isMobile ? 'text-xs' : 'text-xs'
                            }`}>Recurring</span>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className={`font-semibold text-red-600 ${
                            isMobile ? 'text-sm' : ''
                          }`}>£{expense.amount?.toLocaleString()}</p>
                          {expense.paymentDate && (
                            <p className="text-xs text-gray-500">Date: {formatDate(expense.paymentDate)}</p>
                          )}
                          {expense.createdAt && !expense.paymentDate && (
                            <p className="text-xs text-gray-500">Added: {formatDate(expense.createdAt)}</p>
                          )}
                        </div>
                      </div>

                      {/* Budget Limit Indicator */}
                      {budgetLimit && (
                        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`text-xs font-medium ${textColor}`}>
                              Budget: £{amount.toLocaleString()} / £{budgetLimit.toLocaleString()}
                            </span>
                            <span className={`text-xs font-bold ${textColor}`}>
                              {percentageUsed.toFixed(0)}%
                            </span>
                          </div>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${budgetColor} transition-all duration-300 rounded-full`}
                              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
                            />
                          </div>
                          {/* Warning Messages */}
                          {percentageUsed >= 100 && (
                            <p className="text-xs text-red-700 font-semibold mt-1">
                              ⚠️ Budget exceeded by £{(amount - budgetLimit).toLocaleString()}!
                            </p>
                          )}
                          {percentageUsed >= 90 && percentageUsed < 100 && (
                            <p className="text-xs text-red-700 font-semibold mt-1">
                              ⚠️ Approaching budget limit
                            </p>
                          )}
                          {percentageUsed >= 70 && percentageUsed < 90 && (
                            <p className="text-xs text-yellow-700 font-medium mt-1">
                              ⚡ 70% of budget used
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {visibleExpenses.length > 5 && (
                <button
                  onClick={() => setShowAllExpenses(!showAllExpenses)}
                  className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  {showAllExpenses ? '▲ Show Less' : `▼ Show More (${visibleExpenses.length - 5} more)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => {
          setShowAddIncome(false);
          setEditingIncome(null);
        }}
        editData={editingIncome}
        onSave={async (data) => {
          try {
            if (editingIncome) {
              // Update existing income
              console.log('Updating income:', { ...editingIncome, ...data });
              const updatedIncome = await databaseService.saveBudgetIncome({ ...data, id: editingIncome.id });

              if (updatedIncome) {
                console.log('Income updated successfully:', updatedIncome);
                setIncomeList(prev => prev.map(item => item.id === editingIncome.id ? updatedIncome : item));
              }
            } else {
              // Create new income
              const newIncome = {
                id: `income-${Date.now()}`,
                ...data,
                createdAt: new Date().toISOString(),
              };

              console.log('Saving new income:', newIncome);
              const savedIncome = await databaseService.saveBudgetIncome(newIncome);

              if (savedIncome) {
                console.log('Income saved successfully:', savedIncome);
                setIncomeList(prev => [...prev, savedIncome]);
              }
            }
          } catch (error) {
            console.error('Failed to save income:', error);
          }
          setShowAddIncome(false);
          setEditingIncome(null);
        }}
      />

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => {
          setShowAddExpense(false);
          setEditingExpense(null);
        }}
        editData={editingExpense}
        onSave={async (data) => {
          try {
            if (editingExpense) {
              // Update existing expense
              console.log('Updating expense:', { ...editingExpense, ...data });
              const updatedExpense = await databaseService.saveBudgetExpense({ ...data, id: editingExpense.id });

              if (updatedExpense) {
                console.log('Expense updated successfully:', updatedExpense);
                setExpenseList(prev => prev.map(item => item.id === editingExpense.id ? updatedExpense : item));
              }
            } else {
              // Create new expense
              const newExpense = {
                id: `expense-${Date.now()}`,
                ...data,
                createdAt: new Date().toISOString(),
              };

              console.log('Saving new expense:', newExpense);
              const savedExpense = await databaseService.saveBudgetExpense(newExpense);

              if (savedExpense) {
                console.log('Expense saved successfully:', savedExpense);
                setExpenseList(prev => [...prev, savedExpense]);
              }
            }
          } catch (error) {
            console.error('Failed to save expense:', error);
          }
          setShowAddExpense(false);
          setEditingExpense(null);
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
          <div className="surface-card w-full h-full overflow-auto">
            <AdvancedReportsDashboard
              onClose={() => setShowAdvancedReports(false)}
              incomeList={incomeList}
              expenseList={expenseList}
            />
          </div>
        </div>
      )}

      {/* Receipt Scanner Modal */}
      {showReceiptScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <ReceiptScanner
            familyId={familyId || ''}
            onExpenseExtracted={(expense) => {
              console.log('Expense extracted from receipt:', expense);

              if (!expense) return;

              setExpenseList(prevExpenses => {
                // Avoid adding duplicates if the expense already exists
                if (expense.id && prevExpenses.some(item => item.id === expense.id)) {
                  return prevExpenses;
                }

                return [expense, ...prevExpenses];
              });

              setShowReceiptScanner(false);
            }}
            onClose={() => {
              setShowReceiptScanner(false);
            }}
          />
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {renderMobileMenu()}
    </div>
  );
};

export default SimpleBudgetDashboard;
