// Advanced Budget Reporting Types

export interface ReportDateRange {
  startDate: Date;
  endDate: Date;
  period: 'monthly' | 'quarterly' | 'yearly' | 'custom';
}

export interface MonthlyBudgetReport {
  reportId: string;
  familyId: string;
  reportMonth: number;
  reportYear: number;
  generatedAt: Date;

  // Financial Summary
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netIncome: number;
    savingsRate: number;
    budgetVariance: number; // Actual vs budgeted
  };

  // Category Analysis
  categoryAnalysis: {
    [categoryName: string]: {
      budgeted: number;
      actual: number;
      variance: number;
      variancePercentage: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      transactions: number;
    };
  };

  // Income Breakdown
  incomeBreakdown: {
    [source: string]: {
      amount: number;
      percentage: number;
      monthOverMonthChange: number;
    };
  };

  // Expense Analysis
  expenseAnalysis: {
    fixedExpenses: number;
    variableExpenses: number;
    discretionarySpending: number;
    necessityRatio: number; // Fixed + essential variable / total
  };

  // Savings Goals Progress
  savingsProgress: {
    goalsOnTrack: number;
    goalsBehindSchedule: number;
    totalGoalProgress: number;
    monthlyContributions: number;
  };

  // Key Insights
  insights: BudgetInsight[];

  // Recommendations
  recommendations: BudgetRecommendation[];
}

export interface YearlyFinancialSummary {
  reportId: string;
  familyId: string;
  reportYear: number;
  generatedAt: Date;

  // Annual Totals
  annualSummary: {
    totalIncome: number;
    totalExpenses: number;
    totalSavings: number;
    averageMonthlySavingsRate: number;
    bestMonth: { month: string; netIncome: number };
    worstMonth: { month: string; netIncome: number };
  };

  // Monthly Trends
  monthlyTrends: Array<{
    month: string;
    income: number;
    expenses: number;
    netIncome: number;
    savingsRate: number;
  }>;

  // Category Performance
  categoryPerformance: {
    [categoryName: string]: {
      totalSpent: number;
      averageMonthly: number;
      budgetAdherence: number; // Percentage of months within budget
      biggestSpend: { month: string; amount: number };
      trend: 'increasing' | 'decreasing' | 'stable';
      yearOverYearChange?: number;
    };
  };

  // Goals Achievement
  goalsAchievement: {
    goalsCompleted: number;
    goalsMissed: number;
    totalSavedForGoals: number;
    averageGoalCompletionTime: number; // months
  };

  // Financial Health Metrics
  financialHealth: {
    emergencyFundMonths: number;
    debtToIncomeRatio: number;
    savingsGrowthRate: number;
    expenseGrowthRate: number;
    financialStabilityScore: number; // 0-100
  };

  // Predictions for Next Year
  nextYearProjections: {
    projectedIncome: number;
    projectedExpenses: number;
    projectedSavings: number;
    recommendedBudgetAdjustments: BudgetAdjustment[];
  };
}

export interface CategoryAnalysisReport {
  reportId: string;
  categoryName: string;
  categoryType: 'income' | 'expense';
  analysisDateRange: ReportDateRange;
  generatedAt: Date;

  // Spending Pattern Analysis
  spendingPatterns: {
    averageMonthlyAmount: number;
    highestSpend: { date: Date; amount: number; description: string };
    lowestSpend: { date: Date; amount: number; description: string };
    volatility: number; // Standard deviation
    seasonality: SeasonalPattern[];
  };

  // Budget Performance
  budgetPerformance: {
    budgetLimit: number;
    averageActual: number;
    monthsOverBudget: number;
    totalMonths: number;
    adherenceRate: number;
    averageVariance: number;
  };

  // Transaction Analysis
  transactionAnalysis: {
    totalTransactions: number;
    averageTransactionSize: number;
    frequentVendors: Array<{ vendor: string; amount: number; count: number }>;
    unusualTransactions: Array<{ date: Date; amount: number; description: string; reasonFlags: string[] }>;
  };

  // Trends and Insights
  trends: {
    monthOverMonthGrowth: number;
    quarterOverQuarterGrowth: number;
    yearOverYearGrowth: number;
    trendDirection: 'increasing' | 'decreasing' | 'stable';
    cyclicalPatterns: string[];
  };

  // Optimization Opportunities
  optimizationOpportunities: CategoryOptimization[];
}

export interface SavingsGoalsProgressReport {
  reportId: string;
  familyId: string;
  reportDate: Date;
  generatedAt: Date;

  // Overall Progress
  overallProgress: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    totalTargetAmount: number;
    totalCurrentAmount: number;
    overallProgressPercentage: number;
  };

  // Individual Goal Analysis
  goalAnalysis: Array<{
    goalId: string;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
    progressPercentage: number;
    monthlyContribution: number;
    projectedCompletionDate: Date;
    daysToTarget: number;
    onTrackStatus: 'ahead' | 'on-track' | 'behind' | 'at-risk';
    contributionHistory: Array<{ date: Date; amount: number }>;
    milestones: Array<{ percentage: number; achievedDate?: Date; projectedDate: Date }>;
  }>;

  // Performance Metrics
  performanceMetrics: {
    averageMonthlyContributions: number;
    contributionConsistency: number; // 0-100 score
    goalCompletionRate: number; // Historical success rate
    averageTimeToCompletion: number; // months
  };

  // Recommendations
  savingsRecommendations: SavingsRecommendation[];
}

export interface BudgetInsight {
  type: 'warning' | 'opportunity' | 'achievement' | 'trend';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category?: string;
  amount?: number;
  actionable: boolean;
  suggestedActions?: string[];
}

export interface BudgetRecommendation {
  type: 'budget-adjustment' | 'cost-reduction' | 'income-increase' | 'savings-optimization';
  title: string;
  description: string;
  potentialSavings?: number;
  effortLevel: 'low' | 'medium' | 'high';
  timeframe: 'immediate' | 'short-term' | 'long-term';
  priority: 'high' | 'medium' | 'low';
  steps: string[];
}

export interface SavingsRecommendation {
  type: 'increase-contribution' | 'adjust-timeline' | 'rebalance-goals' | 'new-goal';
  goalId?: string;
  title: string;
  description: string;
  impact: string;
  suggestedAction: string;
}

export interface BudgetAdjustment {
  category: string;
  currentBudget: number;
  recommendedBudget: number;
  reason: string;
  impact: number;
}

export interface CategoryOptimization {
  type: 'reduce-spending' | 'negotiate-rates' | 'find-alternatives' | 'eliminate-waste';
  description: string;
  potentialSavings: number;
  effortLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

export interface SeasonalPattern {
  period: 'winter' | 'spring' | 'summer' | 'autumn' | 'holiday' | 'back-to-school';
  averageIncrease: number;
  description: string;
}

// Report Export Types
export interface ReportExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts: boolean;
  includeDetails: boolean;
  includeRecommendations: boolean;
  customTemplate?: string;
}

export interface ReportFilter {
  dateRange: ReportDateRange;
  categories?: string[];
  people?: string[];
  minAmount?: number;
  maxAmount?: number;
  includeIncome: boolean;
  includeExpenses: boolean;
}

// Forecasting Types
export interface ExpenseForecast {
  category: string;
  currentMonthlyAverage: number;
  forecastedAmounts: Array<{
    month: string;
    predictedAmount: number;
    confidence: number;
    factors: string[];
  }>;
  seasonalAdjustments: SeasonalPattern[];
  trendAdjustment: number;
  uncertaintyRange: { min: number; max: number };
}

export interface IncomeForecast {
  source: string;
  currentMonthlyAverage: number;
  forecastedAmounts: Array<{
    month: string;
    predictedAmount: number;
    confidence: number;
  }>;
  growthAssumptions: {
    salaryIncrease?: number;
    bonusExpectation?: number;
    freelanceGrowth?: number;
  };
}

// Dashboard Integration Types
export interface ReportWidget {
  type: 'summary-card' | 'trend-chart' | 'insight-list' | 'recommendation-panel';
  title: string;
  data: any;
  refreshInterval?: number;
  drillDownAvailable: boolean;
}

export interface ReportingDashboard {
  widgets: ReportWidget[];
  lastUpdated: Date;
  autoRefresh: boolean;
  customLayout?: any;
}