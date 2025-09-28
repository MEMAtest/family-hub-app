// Budget System Types
export interface BudgetCategory {
  id: string;
  familyId: string;
  categoryName: string;
  categoryType: 'income' | 'expense';
  budgetLimit?: number;
  colorCode?: string;
  iconName?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetIncome {
  id: string;
  familyId: string;
  personId?: string;
  incomeName: string;
  amount: number;
  category: string;
  isRecurring: boolean;
  paymentDate?: Date;
  createdAt: Date;
}

export interface BudgetExpense {
  id: string;
  familyId: string;
  personId?: string;
  expenseName: string;
  amount: number;
  category: string;
  budgetLimit?: number;
  isRecurring: boolean;
  paymentDate?: Date;
  createdAt: Date;
}

export interface SavingsGoal {
  id: string;
  familyId: string;
  goalName: string;
  goalDescription?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date;
  priority: 'high' | 'medium' | 'low';
  category: string;
  isActive: boolean;
  autoContribution?: number;
  contributionFreq?: 'weekly' | 'monthly' | 'yearly';
  createdAt: Date;
  updatedAt: Date;
  contributions: SavingsContribution[];
}

export interface SavingsContribution {
  id: string;
  savingsGoalId: string;
  contributionAmount: number;
  contributionDate: Date;
  contributionType: 'manual' | 'automatic';
  notes?: string;
  createdAt: Date;
}

export interface BudgetAlert {
  id: string;
  familyId: string;
  alertType: 'overspend' | 'goal_progress' | 'recurring_reminder';
  alertTitle: string;
  alertMessage: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  triggerCondition: any; // JSON object
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyBudgetSummary {
  id: string;
  familyId: string;
  summaryMonth: number;
  summaryYear: number;
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  savingsRate: number;
  categoryBreakdown: CategoryBreakdown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryBreakdown {
  [categoryName: string]: {
    budgeted: number;
    actual: number;
    difference: number;
    percentage: number;
  };
}

// Chart data interfaces
export interface PieChartData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

export interface BarChartData {
  name: string;
  budgeted: number;
  actual: number;
  difference: number;
}

export interface LineChartData {
  month: string;
  income: number;
  expenses: number;
  netIncome: number;
  savingsRate: number;
}

export interface TrendData {
  date: string;
  value: number;
  category?: string;
}

// Budget dashboard data
export interface BudgetDashboardData {
  currentMonth: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    savingsRate: number;
  };
  categorySpending: PieChartData[];
  monthlyTrends: LineChartData[];
  budgetVsActual: BarChartData[];
  savingsGoals: SavingsGoal[];
  recentTransactions: (BudgetIncome | BudgetExpense)[];
  alerts: BudgetAlert[];
}

// Form interfaces
export interface IncomeFormData {
  incomeName: string;
  amount: number;
  category: string;
  isRecurring: boolean;
  paymentDate?: string;
  personId?: string;
}

export interface ExpenseFormData {
  expenseName: string;
  amount: number;
  category: string;
  budgetLimit?: number;
  isRecurring: boolean;
  paymentDate?: string;
  personId?: string;
}

export interface SavingsGoalFormData {
  goalName: string;
  goalDescription?: string;
  targetAmount: number;
  targetDate?: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  autoContribution?: number;
  contributionFreq?: 'weekly' | 'monthly' | 'yearly';
}

export interface CategoryFormData {
  categoryName: string;
  categoryType: 'income' | 'expense';
  budgetLimit?: number;
  colorCode?: string;
  iconName?: string;
}

// Budget calculation helpers
export interface BudgetCalculations {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlyNetIncome: number;
  monthlySavingsRate: number;
  categoryTotals: { [category: string]: number };
  budgetHealth: 'excellent' | 'good' | 'concerning' | 'critical';
  projectedEndOfYear: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
  };
}

// Export types for components
export type BudgetChartType =
  | 'monthly-overview'
  | 'category-spending'
  | 'income-vs-expenses'
  | 'savings-progress'
  | 'budget-vs-actual'
  | 'expense-trends'
  | 'savings-goals'
  | 'cash-flow';