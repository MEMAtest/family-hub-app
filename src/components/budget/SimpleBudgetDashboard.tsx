'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  FileUp,
  Search,
  Calculator,
  ChevronLeft,
  ChevronRight,
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
import StatementImportModal from './modals/StatementImportModal';
import BudgetCalculator from './BudgetCalculator';
import { ActualCashFlowPanel } from './ActualCashFlowPanel';
import { IncomeForecastPanel } from './IncomeForecastPanel';
import { FamilyMoneyPlanner } from './FamilyMoneyPlanner';
import { RecentSpending } from './RecentSpending';
import databaseService from '@/services/databaseService';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { filterExpenses, filterIncome } from '@/utils/budgetFilters';
import toast from 'react-hot-toast';
import type { SavingsGoal } from '@/types/budget.types';
import { plannedAmountForMonth, plannedForMonth } from '@/lib/budget/plannedMonth';
import { partitionBudgetRecords } from '@/lib/budget/dataQuality';

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
  [key: string]: string | number; // Allow additional properties for Recharts
}

const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Rental',
  'Business',
  'Government Benefits',
  'Other',
];

const DEFAULT_EXPENSE_CATEGORIES = [
  'Housing',
  'Transportation',
  'Food & Dining',
  'Entertainment',
  'Healthcare',
  'Childcare',
  'Education',
  'Utilities',
  'Insurance',
  'Clothing',
  'Other',
];

const SimpleBudgetDashboard: React.FC = () => {
  const databaseStatus = useFamilyStore((state) => state.databaseStatus);
  const familyId = databaseStatus.familyId;

  const isMobile = useMediaQuery('(max-width: 1023px)');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewTab, setViewTab] = useState<'all' | 'receipt-scans'>('all');
  const [budgetMode, setBudgetMode] = useState<'overview' | 'source' | 'plans' | 'calculator'>('overview');
  const [plansError, setPlansError] = useState('');
  const [plansReloadKey, setPlansReloadKey] = useState(0);
  const [plansFamilyId, setPlansFamilyId] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);
  const monthlyRef = useRef<HTMLDetailsElement>(null);

  // Month/Year navigation state
  const [selectedMonth, setSelectedMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).getFullYear());
  const [moneyLocationReady, setMoneyLocationReady] = useState(false);

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const month = params.get('moneyMonth');
    const mode = params.get('moneyView');
    if (month && /^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)) {
      setSelectedYear(Number(month.slice(0, 4)));
      setSelectedMonth(Number(month.slice(5, 7)));
    }
    if (mode === 'overview' || mode === 'source' || mode === 'plans' || mode === 'calculator') setBudgetMode(mode);
    setMoneyLocationReady(true);
  }, []);

  useEffect(() => {
    if (!moneyLocationReady) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('view') !== 'budget') return;
    url.searchParams.set('moneyMonth', `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
    url.searchParams.set('moneyView', budgetMode);
    window.history.replaceState(window.history.state, '', url);
  }, [moneyLocationReady, selectedMonth, selectedYear, budgetMode]);

  // Modal states
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddSavingsGoal, setShowAddSavingsGoal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdvancedReports, setShowAdvancedReports] = useState(false);
  const [showReceiptScanner, setShowReceiptScanner] = useState(false);
  const [showStatementImport, setShowStatementImport] = useState(false);
  const [cashFlowRefreshKey, setCashFlowRefreshKey] = useState(0);

  // Edit mode states
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Lists state - derived from budgetData
  const [incomeList, setIncomeList] = useState<any[]>([]);
  const [expenseList, setExpenseList] = useState<any[]>([]);

  useEffect(() => {
    setCashFlowRefreshKey(current => current + 1);
  }, [incomeList, expenseList]);

  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES);
  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [savingsGoalsLoading, setSavingsGoalsLoading] = useState(false);

  // Expand/collapse state for lists
  const [showAllIncome, setShowAllIncome] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const handleStatementImported = useCallback((income: any[], expenses: any[]) => {
    setCashFlowRefreshKey((current) => current + 1);
    if (income.length) {
      setIncomeList((prev) => [...prev, ...income]);
    }
    if (expenses.length) {
      setExpenseList((prev) => [...prev, ...expenses]);
    }

    // Auto-navigate to the month of the imported data
    const allItems = [...income, ...expenses];
    if (allItems.length > 0) {
      // Find the first valid date from imported items
      const firstItem = allItems.find(item => item.paymentDate);
      if (firstItem?.paymentDate) {
        const importedDate = new Date(firstItem.paymentDate);
        if (!isNaN(importedDate.getTime())) {
          const month = importedDate.getMonth() + 1;
          const year = importedDate.getFullYear();
          setSelectedMonth(month);
          setSelectedYear(year);
        }
      }
    }
  }, []);

  // Color palette for charts
  const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#F43F5E'];

  // Helper function to assign colors to categories (must be defined before useMemo)
  const getColorForCategory = useCallback((category: string, index: number = 0): string => {
    const colorMap: { [key: string]: string } = {
      // Expense categories - matching EXPENSE_CATEGORIES
      'Housing': '#3B82F6',        // Blue
      'Transportation': '#F59E0B', // Amber
      'Food & Dining': '#EF4444',  // Red
      'Entertainment': '#EC4899',  // Pink
      'Healthcare': '#06B6D4',     // Cyan
      'Childcare': '#10B981',      // Green
      'Education': '#F97316',      // Orange
      'Utilities': '#8B5CF6',      // Purple
      'Insurance': '#14B8A6',      // Teal
      'Clothing': '#A855F7',       // Violet
      'Other': '#6B7280',          // Gray
      // Legacy aliases
      'Children': '#10B981',       // Green (alias for Childcare)
      'Food': '#EF4444',           // Red (alias for Food & Dining)
      // Income categories - matching INCOME_CATEGORIES
      'Salary': '#22C55E',         // Green
      'Freelance': '#06B6D4',      // Cyan
      'Investment': '#F59E0B',     // Amber
      'Rental': '#EC4899',         // Pink
      'Business': '#8B5CF6',       // Purple
      'Government Benefits': '#14B8A6', // Teal
      // Legacy income aliases
      'Employment': '#22C55E',     // Green (alias for Salary)
      'Test': '#3B82F6',           // Blue
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
      const suffix = familyId ? `:${familyId}` : '';
      window.localStorage.setItem(`budgetIncome${suffix}`, JSON.stringify(safeIncome));
      window.localStorage.setItem(`budgetExpenses${suffix}`, JSON.stringify(safeExpenses));
    } catch (error) {
      console.warn('Failed to persist budget lists to localStorage', error);
    }
  }, [familyId, sanitizeBudgetItems]);

  // Load budget data from store
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setPlansError('');
    const loadBudgetData = async () => {
      try {
        if (!familyId) {
          setIncomeList([]);
          setExpenseList([]);
          return;
        }
          const [incomeData, expenseData] = await Promise.all([
            fetch(`/api/families/${familyId}/budget/income`, { cache: 'no-store', signal: controller.signal }).then((res) => {
              if (!res.ok) throw new Error(`Income request failed (${res.status})`);
              return res.json();
            }),
            fetch(`/api/families/${familyId}/budget/expenses`, { cache: 'no-store', signal: controller.signal }).then((res) => {
              if (!res.ok) throw new Error(`Expense request failed (${res.status})`);
              return res.json();
            }),
          ]);

          if (!Array.isArray(incomeData) || !Array.isArray(expenseData)) throw new Error('Saved plan response was incomplete.');
          if (controller.signal.aborted) return;
          const safeIncome = sanitizeBudgetItems(incomeData);
          const safeExpenses = sanitizeBudgetItems(expenseData);
          setIncomeList(safeIncome);
          setExpenseList(safeExpenses);
          persistBudgetLists(safeIncome, safeExpenses);
      } catch (error) {
        if (!controller.signal.aborted) {
          setIncomeList([]);
          setExpenseList([]);
          setPlansError('Saved plans could not be loaded. No device snapshot or example figures have been substituted.');
        }
      } finally {
        if (!controller.signal.aborted) { setIsLoading(false); setPlansFamilyId(familyId); }
      }
    };

    loadBudgetData();
    return () => controller.abort();
  }, [familyId, plansReloadKey, persistBudgetLists, sanitizeBudgetItems]);

  const reloadBudgetCategories = useCallback(async () => {
    if (!familyId) return;

    try {
      setCategoriesLoading(true);
      const response = await fetch(`/api/families/${familyId}/budget/categories?includeInactive=true`);
      if (!response.ok) {
        throw new Error(`Failed to load budget categories (${response.status})`);
      }
      const payload = await response.json();
      const rows = Array.isArray(payload) ? payload : [];

      if (rows.length === 0) {
        setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
        setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
        return;
      }

      const income = rows
        .filter((row: any) => row?.categoryType === 'income' && row?.isActive !== false)
        .map((row: any) => String(row?.categoryName ?? row?.name ?? '').trim())
        .filter(Boolean);
      const expenses = rows
        .filter((row: any) => row?.categoryType === 'expense' && row?.isActive !== false)
        .map((row: any) => String(row?.categoryName ?? row?.name ?? '').trim())
        .filter(Boolean);

      setIncomeCategories(income.length ? income : DEFAULT_INCOME_CATEGORIES);
      setExpenseCategories(expenses.length ? expenses : DEFAULT_EXPENSE_CATEGORIES);
    } catch (error) {
      console.warn('Failed to load budget categories:', error);
      setIncomeCategories(DEFAULT_INCOME_CATEGORIES);
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    } finally {
      setCategoriesLoading(false);
    }
  }, [familyId]);

  const reloadSavingsGoals = useCallback(async () => {
    if (!familyId) return;

    try {
      setSavingsGoalsLoading(true);
      const response = await fetch(`/api/families/${familyId}/budget/savings-goals?includeInactive=true`);
      if (!response.ok) {
        throw new Error(`Failed to load savings goals (${response.status})`);
      }
      const payload = await response.json();
      setSavingsGoals(Array.isArray(payload) ? (payload as SavingsGoal[]) : []);
    } catch (error) {
      console.warn('Failed to load savings goals:', error);
      setSavingsGoals([]);
    } finally {
      setSavingsGoalsLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    void reloadBudgetCategories();
    void reloadSavingsGoals();
  }, [reloadBudgetCategories, reloadSavingsGoals]);

  const matchesMonthYear = useCallback((item: any, month: number, year: number) =>
    Boolean(item && typeof item === 'object' && plannedForMonth(item, `${year}-${String(month).padStart(2, '0')}`)), []);

  // Helper function to filter items by selected month/year (must be before useMemo hooks)
  const filterByMonth = useCallback(
    (item: any) => matchesMonthYear(item, selectedMonth, selectedYear),
    [matchesMonthYear, selectedMonth, selectedYear]
  );

  // Calculate all dashboard data from real income and expense lists filtered by selected month
  const dashboardData = useMemo(() => {
    // Filter lists by selected month/year
    const incomeQuality = partitionBudgetRecords(sanitizeBudgetItems(incomeList));
    const expenseQuality = partitionBudgetRecords(sanitizeBudgetItems(expenseList));
    const filteredIncome = incomeQuality.operational.filter(filterByMonth);
    const filteredExpenses = expenseQuality.operational.filter(filterByMonth);
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;

    const totalIncome = filteredIncome.reduce((sum, item) => sum + plannedAmountForMonth(item, monthKey), 0);
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + plannedAmountForMonth(item, monthKey), 0);
    const netIncome = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((netIncome / totalIncome) * 100) : 0;

    // Calculate category spending from filtered expenses
    const categoryMap: { [key: string]: number } = {};
    filteredExpenses.forEach(expense => {
      const category = expense.category || 'Other';
      categoryMap[category] = (categoryMap[category] || 0) + plannedAmountForMonth(expense, monthKey);
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
      incomeCategoryMap[category] = (incomeCategoryMap[category] || 0) + plannedAmountForMonth(income, monthKey);
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
      filteredExpenses,
      excludedQaCount: incomeQuality.excludedQa.length + expenseQuality.excludedQa.length,
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

  const calculatorDefaults = useMemo(() => {
    const filteredExpenses = sanitizeBudgetItems(dashboardData?.filteredExpenses ?? []);
    const monthKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    const fixedCosts = filteredExpenses
      .filter((expense) => Boolean((expense as any).isRecurring))
      .reduce((sum, expense) => sum + plannedAmountForMonth(expense, monthKey), 0);
    const variableSpend = filteredExpenses
      .filter((expense) => !Boolean((expense as any).isRecurring))
      .reduce((sum, expense) => sum + plannedAmountForMonth(expense, monthKey), 0);

    return {
      totalIncome: dashboardData?.totalIncome ?? 0,
      fixedCosts,
      variableSpend,
    };
  }, [dashboardData, sanitizeBudgetItems, selectedMonth, selectedYear]);

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
    const safeIncome = partitionBudgetRecords(sanitizeBudgetItems(incomeList)).operational;
    const safeExpenses = partitionBudgetRecords(sanitizeBudgetItems(expenseList)).operational;

    for (let i = 5; i >= 0; i--) {
      const date = new Date(selectedYear, selectedMonth - 1 - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      const monthIncome = safeIncome
        .filter((item) => matchesMonthYear(item, month, year))
        .reduce((sum, item) => sum + plannedAmountForMonth(item, `${year}-${String(month).padStart(2, '0')}`), 0);

      const monthExpenses = safeExpenses
        .filter((item) => matchesMonthYear(item, month, year))
        .reduce((sum, item) => sum + plannedAmountForMonth(item, `${year}-${String(month).padStart(2, '0')}`), 0);

      trends.push({
        month: `${date.toLocaleDateString('en-GB', { month: 'short' })} ${String(year).slice(-2)}`,
        income: monthIncome,
        expenses: monthExpenses,
        net: monthIncome - monthExpenses,
        savingsRate: monthIncome > 0 ? ((monthIncome - monthExpenses) / monthIncome * 100) : 0
      });
    }
    return trends;
  }, [incomeList, expenseList, matchesMonthYear, sanitizeBudgetItems, selectedMonth, selectedYear]);


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
          <h1 className="text-lg font-semibold">Family Money Planner</h1>
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
      <div className="flex items-center justify-between" style={{ display: budgetMode === 'overview' ? 'none' : undefined }}>
        <button
          onClick={goToPreviousMonth}
          aria-label="Previous month"
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
          {getMonthName(selectedMonth)} {selectedYear}
        </p>
        <button
          onClick={goToNextMonth}
          aria-label="Next month"
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Money actions</h2>
            <button
              onClick={() => setShowMobileMenu(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 dark:text-slate-300" />
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
                setBudgetMode('calculator');
                setShowMobileMenu(false);
              }}
              className="mobile-btn-secondary w-full flex items-center gap-3"
            >
              <Calculator className="w-5 h-5" />
              Calculator
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
                setShowStatementImport(true);
                setShowMobileMenu(false);
              }}
              className="mobile-btn-secondary w-full flex items-center gap-3"
            >
              <FileUp className="w-5 h-5" />
              Import Statement
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

  const plansReady = !isLoading && plansFamilyId === familyId;

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
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-2">Family Money Planner</h1>
              <div className="flex items-center gap-3" style={{ display: budgetMode === 'overview' ? 'none' : undefined }}>
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Previous month"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <p className="text-lg font-medium text-gray-900 dark:text-slate-100 min-w-[200px] text-center">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
                <button
                  onClick={goToNextMonth}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Next month"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowAddIncome(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-sm hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Plan income
              </button>
              <button style={{ display: budgetMode === 'overview' ? 'none' : undefined }}
                onClick={() => setShowAddExpense(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-sm hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Expense
              </button>
              <button style={{ display: budgetMode === 'overview' ? 'none' : undefined }}
                onClick={() => setShowReceiptScanner(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-sm hover:bg-purple-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Scan Receipt
              </button>
              <button
                onClick={() => setShowStatementImport(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <FileUp className="w-4 h-4" />
                Import Statement
              </button>
              <button style={{ display: budgetMode === 'overview' ? 'none' : undefined }}
                onClick={() => setShowAddSavingsGoal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-sm hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Target className="w-4 h-4" />
                Savings Goal
              </button>
              <button style={{ display: budgetMode === 'overview' ? 'none' : undefined }}
                onClick={() => setBudgetMode('calculator')}
                className="bg-[#147c72] text-white px-4 py-2 rounded-sm hover:bg-[#0f625a] transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Calculator className="w-4 h-4" />
                Calculator
              </button>
              <button style={{ display: budgetMode === 'overview' ? 'none' : undefined }}
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

      {budgetMode === 'plans' && dashboardData.excludedQaCount > 0 && (
        <div className={`${isMobile ? 'mx-4' : ''} mb-4 border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900`}>
          {dashboardData.excludedQaCount} test or rehearsal {dashboardData.excludedQaCount === 1 ? 'row is' : 'rows are'} excluded from the household plan totals. The saved records have not been deleted.
        </div>
      )}

      <div className={`${isMobile ? 'px-4' : ''} mb-4`}>
        <div className="flex max-w-full flex-wrap gap-1 rounded-lg border border-[#dde5e0] bg-white/80 p-1 dark:border-slate-800 dark:bg-slate-900/80">
          <button
            type="button"
            onClick={() => setBudgetMode('overview')}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              budgetMode === 'overview'
                ? 'bg-[#147c72] text-white'
                : 'text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Planner
          </button>
          <button type="button" onClick={() => setBudgetMode('source')} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${budgetMode === 'source' ? 'bg-[#147c72] text-white' : 'text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800'}`}>Bank source</button>
          <button type="button" onClick={() => setBudgetMode('plans')} className={`rounded-md px-3 py-2 text-sm font-semibold transition ${budgetMode === 'plans' ? 'bg-[#147c72] text-white' : 'text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800'}`}>Saved plans</button>
          <button
            type="button"
            onClick={() => setBudgetMode('calculator')}
            style={{ display: budgetMode === 'overview' || budgetMode === 'source' ? 'none' : undefined }}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition ${
              budgetMode === 'calculator'
                ? 'bg-[#147c72] text-white'
                : 'text-[#5f6a64] hover:bg-[#eaf1e7] dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            Calculator
          </button>
        </div>
      </div>

      {budgetMode === 'overview' && <>
        <RecentSpending familyId={familyId} refreshKey={cashFlowRefreshKey} onReviewMonth={month => {
          setSelectedYear(Number(month.slice(0, 4))); setSelectedMonth(Number(month.slice(5, 7))); setMonthlyOpen(true);
          requestAnimationFrame(() => monthlyRef.current?.scrollIntoView({ block: 'start' }));
        }} />
        <details ref={monthlyRef} open={monthlyOpen} onToggle={event => setMonthlyOpen(event.currentTarget.open)} className="mt-5 scroll-mt-40 border-y border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <summary className="min-h-12 cursor-pointer px-4 py-3 text-sm font-semibold">Monthly review · {getMonthName(selectedMonth)} {selectedYear}</summary>
          {monthlyOpen && <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-y border-slate-200 px-4 py-2 dark:border-slate-700">
              <button type="button" onClick={goToPreviousMonth} className="min-h-11 rounded-md p-3" aria-label="Previous month" title="Previous month"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-sm font-medium">{getMonthName(selectedMonth)} {selectedYear}</span>
              <button type="button" onClick={goToNextMonth} className="min-h-11 rounded-md p-3" aria-label="Next month" title="Next month"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <FamilyMoneyPlanner familyId={familyId} month={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`} refreshKey={cashFlowRefreshKey} onPreferencesChanged={() => setCashFlowRefreshKey(value => value + 1)} />
          </>}
        </details>
        <details className="mt-5 border-y border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"><summary className="min-h-10 cursor-pointer text-sm font-semibold">Expected money and longer-term plans</summary><IncomeForecastPanel familyId={familyId} refreshKey={cashFlowRefreshKey} onPlanIncome={() => { setEditingIncome(null); setShowAddIncome(true); }} /></details>
      </>}
      {budgetMode === 'source' && <ActualCashFlowPanel familyId={familyId} month={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}`} refreshKey={cashFlowRefreshKey} />}
      {budgetMode === 'plans' && <section className="mb-4 border-y border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900"><h2 className="font-semibold">Saved plans, not bank-verified spending</h2><p className="mt-1">These saved entries are kept for review. They do not supply the Home or Budget Overview figures. Edit or remove entries that are not yours.</p>{plansError && <><p role="alert" className="mt-2">{plansError}</p><button type="button" onClick={() => setPlansReloadKey(value => value + 1)} className="mt-2 underline">Retry saved plans</button></>}</section>}
      {(budgetMode === 'plans' || budgetMode === 'calculator') && !plansReady && <p role="status" className="p-4 text-sm text-slate-500">Loading saved plans...</p>}

      {budgetMode === 'calculator' && plansReady ? (
        <BudgetCalculator
          totalIncome={calculatorDefaults.totalIncome}
          fixedCosts={calculatorDefaults.fixedCosts}
          variableSpend={calculatorDefaults.variableSpend}
          monthLabel={`${getMonthName(selectedMonth)} ${selectedYear}`}
          formatCurrency={formatCurrency}
        />
      ) : budgetMode === 'plans' && plansReady && !plansError ? (
      <>
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
              <p className={`font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Planned Income</p>
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
              <p className={`font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Planned Expenses</p>
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
              <p className={`font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Plan Balance</p>
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
              <p className={`font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wide ${
                isMobile ? 'text-xs' : 'text-sm'
              }`}>Planned Margin</p>
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

      {/* Savings Goals */}
      <div className={`surface-card mb-4 md:mb-8 ${
        isMobile ? 'mx-4 p-4 rounded-xl' : 'p-6'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`font-medium text-gray-900 dark:text-slate-100 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            Savings Goals
          </h2>
          <button
            onClick={() => setShowAddSavingsGoal(true)}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add goal
          </button>
        </div>

        {savingsGoalsLoading ? (
          <p className="text-sm text-gray-600 dark:text-slate-400">Loading savings goals...</p>
        ) : savingsGoals.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-slate-400">
            No savings goals yet. Add one to track your progress.
          </p>
        ) : (
          <div className="space-y-3">
            {savingsGoals.slice(0, 4).map((goal) => {
              const target = Number(goal.targetAmount || 0);
              const current = Number(goal.currentAmount || 0);
              const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
              const targetDate = goal.targetDate ? new Date(goal.targetDate as any) : null;

              return (
                <div key={goal.id} className="rounded-lg border border-gray-200 bg-white/60 p-4 dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 dark:text-slate-100 truncate">{goal.goalName}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {goal.category}{goal.priority ? ` • ${goal.priority}` : ''}
                        {targetDate && !Number.isNaN(targetDate.getTime()) ? ` • target ${targetDate.toLocaleDateString('en-GB')}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                        {formatCurrency(current)} / {formatCurrency(target)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{progress.toFixed(0)}%</p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full rounded-full bg-gray-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6-Month Trend Chart */}
      <div className={`surface-card mb-4 md:mb-8 ${
        isMobile ? 'mx-4 p-4 rounded-xl' : 'p-6'
      }`}>
        <h2 className={`font-medium text-gray-900 dark:text-slate-100 mb-6 ${
          isMobile ? 'text-base' : 'text-lg'
        }`}>
          6-Month Plan Trend
        </h2>
        <div className={isMobile ? 'h-64' : 'h-80'}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} name="Planned income" />
              <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} name="Planned expenses" />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" strokeWidth={2} name="Plan balance" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-sm text-gray-600 dark:text-slate-400">
          <p>Showing trends from {monthlyTrendsData[0]?.month} to {monthlyTrendsData[5]?.month}</p>
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
          <h2 className={`font-medium text-gray-900 dark:text-slate-100 mb-6 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            Planned Income vs Expenses
          </h2>
          <div className={isMobile ? 'h-64' : 'h-80'}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `£${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {dashboardData.comparisonData.map((entry, index) => (
                    <Cell key={`cell-comparison-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="amount" position="top" formatter={(value) => formatCurrency(value as number)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600 dark:text-slate-400">
            <p><strong>Planned margin:</strong> {dashboardData.savingsRate.toFixed(1)}% of planned income remains after planned expenses. This is not actual savings.</p>
            <p className="mt-2"><strong>Plan balance:</strong> Planned income (£{dashboardData.totalIncome.toLocaleString()}) - planned expenses (£{dashboardData.totalExpenses.toLocaleString()}) = £{dashboardData.netIncome.toLocaleString()}</p>
          </div>
        </div>

        {/* Expense Breakdown by Category */}
        {dashboardData.categorySpending.length > 0 && (
          <div className={`surface-card ${
            isMobile ? 'p-4 rounded-xl' : 'p-6'
          }`}>
            <h2 className={`font-medium text-gray-900 dark:text-slate-100 mb-6 flex items-center ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              <PieChartIcon className="w-5 h-5 mr-2" />
              Planned Expense Breakdown
            </h2>
            <div className={isMobile ? 'h-72' : 'h-96'}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={dashboardData.categorySpending}
                    cx="50%"
                    cy="45%"
                    labelLine={true}
                    label={({ name, percentage }: any) => `${name}: ${(percentage as number).toFixed(0)}%`}
                    outerRadius={isMobile ? 70 : 100}
                    dataKey="value"
                    nameKey="name"
                    style={{ fontSize: isMobile ? '10px' : '12px' }}
                  >
                    {dashboardData.categorySpending.map((entry, index) => (
                      <Cell key={`cell-expense-${index}`} fill={entry.color} />
                    ))}
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
            <h2 className={`font-medium text-gray-900 dark:text-slate-100 mb-6 flex items-center ${
              isMobile ? 'text-base' : 'text-lg'
            }`}>
              <PieChartIcon className="w-5 h-5 mr-2" />
              Planned Income Breakdown
            </h2>
            <div className={isMobile ? 'h-72' : 'h-96'}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={dashboardData.incomeByCategory}
                    cx="50%"
                    cy="45%"
                    labelLine={true}
                    label={({ name, percentage }: any) => `${name}: ${(percentage as number).toFixed(0)}%`}
                    outerRadius={isMobile ? 70 : 100}
                    dataKey="value"
                    nameKey="name"
                    style={{ fontSize: isMobile ? '10px' : '12px' }}
                  >
                    {dashboardData.incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-income-${index}`} fill={entry.color} />
                    ))}
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
          <h2 className={`font-medium text-gray-900 dark:text-slate-100 mb-4 ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            Planned Category Summary
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
              className="w-full border border-gray-200 dark:border-slate-700 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400"
            />
          </div>
          <div className={`flex ${isMobile ? 'w-full' : ''} gap-2`}>
            <button
              type="button"
              onClick={() => setViewTab('all')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                viewTab === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
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
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
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
          <h3 className={`font-medium text-gray-900 dark:text-slate-100 mb-4 flex items-center ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Income ({visibleIncome.length})
          </h3>
          {visibleIncome.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
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
                    className={`flex justify-between items-center bg-green-50 dark:bg-green-900/20 border dark:border-green-800/30 cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors ${
                      isMobile ? 'p-2 rounded-lg' : 'p-3 rounded-lg'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-gray-900 dark:text-slate-100 truncate ${
                        isMobile ? 'text-sm' : ''
                      }`}>{income.incomeName}</h4>
                      <p className={`text-gray-600 dark:text-slate-400 ${
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
                        <p className="text-xs text-gray-500 dark:text-slate-500">Date: {formatDate(income.paymentDate)}</p>
                      )}
                      {income.createdAt && !income.paymentDate && (
                        <p className="text-xs text-gray-500 dark:text-slate-500">Added: {formatDate(income.createdAt)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {visibleIncome.length > 5 && (
                <button
                  onClick={() => setShowAllIncome(!showAllIncome)}
                  className="mt-3 w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
          <h3 className={`font-medium text-gray-900 dark:text-slate-100 mb-4 flex items-center ${
            isMobile ? 'text-base' : 'text-lg'
          }`}>
            <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
            {viewTab === 'receipt-scans' ? 'Receipt Scans' : 'Expenses'} ({visibleExpenses.length})
          </h3>
          {visibleExpenses.length === 0 ? (
            <div className={`text-center ${isMobile ? 'py-6' : 'py-8'}`}>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
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
                  let bgColor = 'bg-red-50 dark:bg-red-900/20';
                  let borderColor = 'border-green-200 dark:border-green-800/30';

                  if (percentageUsed >= 90) {
                    budgetColor = 'bg-red-500'; // Danger: >= 90%
                    textColor = 'text-red-700';
                    bgColor = 'bg-red-100 dark:bg-red-900/30';
                    borderColor = 'border-red-300 dark:border-red-800/30';
                  } else if (percentageUsed >= 70) {
                    budgetColor = 'bg-yellow-500'; // Warning: >= 70%
                    textColor = 'text-yellow-700';
                    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
                    borderColor = 'border-yellow-200 dark:border-yellow-800/30';
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
                          <h4 className={`font-medium text-gray-900 dark:text-slate-100 truncate ${
                            isMobile ? 'text-sm' : ''
                          }`}>{expense.expenseName}</h4>
                          <p className={`text-gray-600 dark:text-slate-400 ${
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
                            <p className="text-xs text-gray-500 dark:text-slate-500">Date: {formatDate(expense.paymentDate)}</p>
                          )}
                          {expense.createdAt && !expense.paymentDate && (
                            <p className="text-xs text-gray-500 dark:text-slate-500">Added: {formatDate(expense.createdAt)}</p>
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
                          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
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
                  className="mt-3 w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-2 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {showAllExpenses ? '▲ Show Less' : `▼ Show More (${visibleExpenses.length - 5} more)`}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      </>
      ) : null}

      {/* Modals */}
      <AddIncomeModal
        isOpen={showAddIncome}
        onClose={() => {
          setShowAddIncome(false);
          setEditingIncome(null);
        }}
        categories={incomeCategories}
        editData={editingIncome}
        onSave={async (data) => {
          if (!familyId) throw new Error('Sign in to your household before saving income.');
          const response = await fetch(`/api/families/${encodeURIComponent(familyId)}/budget/income`, {
            method: editingIncome ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editingIncome ? { ...data, id: editingIncome.id } : data),
          });
          const saved = await response.json();
          if (!response.ok || !saved.id) throw new Error(saved.error || 'Income could not be saved. Please try again.');
          setIncomeList(prev => editingIncome ? prev.map(item => item.id === editingIncome.id ? saved : item) : [...prev, saved]);
          setPlansReloadKey(value => value + 1);
          setShowAddIncome(false);
          setEditingIncome(null);
          toast.success('Income plan saved');
        }}
      />

      <AddExpenseModal
        isOpen={showAddExpense}
        onClose={() => {
          setShowAddExpense(false);
          setEditingExpense(null);
        }}
        categories={expenseCategories}
        editData={editingExpense}
        onSave={async (data) => {
          try {
            if (editingExpense) {
              // Update existing expense
              console.log('Updating expense:', { ...editingExpense, ...data });
              const updatedExpense = await databaseService.updateBudgetExpense({ ...data, id: editingExpense.id });

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
        onSave={async (data) => {
          if (!familyId) {
            toast.error('Family not loaded yet');
            return;
          }

          try {
            const response = await fetch(`/api/families/${familyId}/budget/savings-goals`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });

            if (!response.ok) {
              const errorPayload = await response.json().catch(() => ({}));
              throw new Error(errorPayload?.error || `Failed to create savings goal (${response.status})`);
            }

            const created = await response.json();
            setSavingsGoals((prev) => [created as SavingsGoal, ...prev]);
            toast.success('Savings goal created');
            setShowAddSavingsGoal(false);
          } catch (error) {
            console.error('Failed to create savings goal:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to create savings goal');
          }
        }}
      />

      <StatementImportModal
        isOpen={showStatementImport}
        onClose={() => setShowStatementImport(false)}
        familyId={familyId}
        existingIncome={incomeList}
        existingExpenses={expenseList}
        onImported={handleStatementImported}
      />

      <BudgetSettingsModal
        isOpen={showSettings}
        familyId={familyId}
        onClose={() => {
          setShowSettings(false);
          void reloadBudgetCategories();
        }}
        onSave={() => {
          setShowSettings(false);
          void reloadBudgetCategories();
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
