# BUDGET MANAGEMENT SYSTEM - BUILD SPECIFICATION

## SYSTEM OVERVIEW
Build a comprehensive budget management system that tracks income, expenses, savings goals, and provides financial insights through interactive charts and visualizations.

## DATABASE SCHEMA

```sql
-- Enhanced budget tables
CREATE TABLE IF NOT EXISTS budget_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'income' or 'expense'
  color VARCHAR(7) NOT NULL,
  icon VARCHAR(50),
  budget_limit DECIMAL(12,2),
  is_essential BOOLEAN DEFAULT FALSE,
  parent_category_id UUID REFERENCES budget_categories(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  category_id UUID REFERENCES budget_categories(id),
  person_id UUID REFERENCES family_members(id),
  amount DECIMAL(12,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'income' or 'expense'
  description VARCHAR(500),
  transaction_date DATE NOT NULL,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(50), -- 'weekly', 'monthly', 'yearly'
  receipt_url TEXT,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  goal_name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) DEFAULT 0,
  target_date DATE,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'medium',
  auto_contribute BOOLEAN DEFAULT FALSE,
  monthly_contribution DECIMAL(12,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budget_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  alert_type VARCHAR(100) NOT NULL, -- 'overspend', 'goal_reached', 'bill_due'
  threshold_amount DECIMAL(12,2),
  category_id UUID REFERENCES budget_categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  notification_channels JSONB DEFAULT '["in-app"]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## COMPONENT STRUCTURE

```
src/components/budget/
├── BudgetDashboard.tsx       // Main budget view with overview
├── IncomeManager.tsx         // Income sources and tracking
├── ExpenseTracker.tsx        // Expense entry and categorization
├── BudgetCharts.tsx          // All chart visualizations
├── SavingsGoals.tsx          // Savings goals and progress
├── BillReminders.tsx         // Recurring bills and due dates
├── BudgetReports.tsx         // Monthly/yearly reports
├── CategoryManager.tsx       // Category creation and budgets
├── TransactionList.tsx       // Searchable transaction history
└── BudgetAlerts.tsx         // Alert configuration and display
```

## CHARTS & VISUALIZATIONS REQUIRED

### 1. Income vs Expenses Chart (Main Dashboard)
```typescript
interface IncomeExpenseChart {
  type: 'AreaChart' | 'BarChart';
  data: {
    month: string;
    income: number;
    expenses: number;
    netIncome: number;
  }[];
  features: {
    tooltips: boolean;
    animations: boolean;
    responsive: boolean;
    exportable: boolean;
  };
}
```

### 2. Category Breakdown Pie Chart
```typescript
interface CategoryPieChart {
  type: 'PieChart' | 'DonutChart';
  data: {
    category: string;
    amount: number;
    percentage: number;
    color: string;
  }[];
  interactions: {
    clickToFilter: boolean;
    hoverDetails: boolean;
    legendToggle: boolean;
  };
}
```

### 3. Spending Trends Line Graph
```typescript
interface SpendingTrendsChart {
  type: 'LineChart';
  timeframes: ['Daily', 'Weekly', 'Monthly', 'Yearly'];
  data: {
    date: string;
    [category: string]: number;
  }[];
  features: {
    multiLine: boolean;
    smoothCurves: boolean;
    zoomable: boolean;
    brushSelection: boolean;
  };
}
```

### 4. Budget vs Actual Bar Chart
```typescript
interface BudgetComparisonChart {
  type: 'GroupedBarChart';
  data: {
    category: string;
    budgeted: number;
    actual: number;
    remaining: number;
    percentUsed: number;
  }[];
  visualIndicators: {
    overBudget: 'red';
    nearLimit: 'yellow';
    onTrack: 'green';
  };
}
```

### 5. Cash Flow Waterfall Chart
```typescript
interface CashFlowChart {
  type: 'WaterfallChart';
  data: {
    name: string;
    value: number;
    type: 'income' | 'expense' | 'total';
  }[];
  features: {
    runningTotal: boolean;
    colorCoding: boolean;
  };
}
```

### 6. Savings Progress Radial Chart
```typescript
interface SavingsProgressChart {
  type: 'RadialBarChart';
  data: {
    goal: string;
    current: number;
    target: number;
    percentage: number;
  }[];
  animations: {
    fillAnimation: boolean;
    pulseOnComplete: boolean;
  };
}
```

### 7. Family Member Spending Comparison
```typescript
interface FamilySpendingChart {
  type: 'StackedBarChart';
  data: {
    person: string;
    categories: {
      [category: string]: number;
    };
    total: number;
  }[];
}
```

### 8. Monthly Bill Calendar Heatmap
```typescript
interface BillCalendarHeatmap {
  type: 'CalendarHeatmap';
  data: {
    date: string;
    amount: number;
    bills: string[];
  }[];
  colorScale: {
    min: '#f0f9ff';
    max: '#1e3a8a';
  };
}
```

## FEATURES TO BUILD

### Core Features

#### 1. Income Management
```typescript
interface IncomeFeatures {
  sources: {
    salary: MonthlyIncome[];
    freelance: IrregularIncome[];
    benefits: GovernmentBenefits[];
    investments: InvestmentReturns[];
    other: OtherIncome[];
  };
  
  tracking: {
    expectedVsActual: boolean;
    multiplePayees: boolean;
    taxCalculation: boolean;
    yearToDate: boolean;
  };
  
  automation: {
    bankImport: boolean;
    recurringIncomeDetection: boolean;
    incomeForecasting: boolean;
  };
}
```

#### 2. Expense Tracking
```typescript
interface ExpenseFeatures {
  entry: {
    quickEntry: boolean;
    receiptScanning: boolean;
    voiceEntry: boolean;
    bulkImport: boolean;
  };
  
  categorization: {
    autoCategoriztion: boolean;
    customCategories: boolean;
    subcategories: boolean;
    tagging: boolean;
    splitTransactions: boolean;
  };
  
  analysis: {
    unusualSpendingAlerts: boolean;
    merchantAnalysis: boolean;
    priceTracking: boolean;
    subscriptionDetection: boolean;
  };
}
```

#### 3. Budget Planning
```typescript
interface BudgetPlanning {
  budgets: {
    zeroBased: boolean;
    50_30_20_rule: boolean;
    envelope: boolean;
    custom: boolean;
  };
  
  recommendations: {
    aiSuggestions: boolean;
    historicalAnalysis: boolean;
    seasonalAdjustments: boolean;
    familySizeConsiderations: boolean;
  };
  
  forecasting: {
    cashFlowProjection: boolean;
    scenarioPlanning: boolean;
    emergencyFundCalculator: boolean;
  };
}
```

#### 4. Savings Goals
```typescript
interface SavingsGoalsFeatures {
  goalTypes: {
    vacation: SavingsGoal;
    emergency: SavingsGoal;
    education: SavingsGoal;
    home: SavingsGoal;
    custom: SavingsGoal;
  };
  
  automation: {
    autoTransfer: boolean;
    roundUpSavings: boolean;
    surplusAllocation: boolean;
    goalPrioritization: boolean;
  };
  
  tracking: {
    progressVisualization: boolean;
    milestoneNotifications: boolean;
    projectionCalculator: boolean;
    contributionHistory: boolean;
  };
}
```

#### 5. Bill Management
```typescript
interface BillManagement {
  tracking: {
    dueDateCalendar: boolean;
    amountHistory: boolean;
    paymentConfirmation: boolean;
    latePaymentAlerts: boolean;
  };
  
  optimization: {
    billNegotiation: boolean;
    providerComparison: boolean;
    usageAnalysis: boolean;
    contractEndDates: boolean;
  };
}
```

### Smart Features

#### 1. Financial Insights
```typescript
interface FinancialInsights {
  spending: {
    unusualActivity: Alert[];
    savingOpportunities: Suggestion[];
    categoryTrends: Trend[];
    peerComparison: Benchmark[];
  };
  
  recommendations: {
    budgetOptimization: string[];
    subscriptionAudit: Subscription[];
    taxSavings: TaxTip[];
    investmentSuggestions: Investment[];
  };
}
```

#### 2. Alerts & Notifications
```typescript
interface BudgetAlerts {
  types: {
    overBudget: boolean;
    billDue: boolean;
    goalMilestone: boolean;
    unusualSpending: boolean;
    lowBalance: boolean;
    savingsOpportunity: boolean;
  };
  
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  
  customization: {
    thresholds: number[];
    frequency: string;
    quietHours: TimeRange;
    recipients: FamilyMember[];
  };
}
```

## UI/UX REQUIREMENTS

### Dashboard Layout
```typescript
interface BudgetDashboardLayout {
  topSection: {
    monthSelector: boolean;
    quickStats: MetricCard[];
    netIncomeIndicator: boolean;
    savingsRate: ProgressBar;
  };
  
  mainCharts: {
    incomeVsExpenses: Chart;
    categoryBreakdown: Chart;
    spendingTrends: Chart;
  };
  
  widgets: {
    upcomingBills: Widget;
    savingsProgress: Widget;
    recentTransactions: Widget;
    budgetAlerts: Widget;
  };
  
  quickActions: {
    addExpense: boolean;
    addIncome: boolean;
    payBill: boolean;
    viewReports: boolean;
  };
}
```

### Mobile Optimizations
- Swipe to categorize transactions
- Camera button for receipt capture
- Touch-friendly number pad
- Simplified chart views
- Bottom navigation for quick access

### Interactive Elements
```typescript
interface InteractiveFeatures {
  charts: {
    clickToDrill: boolean;
    hoverTooltips: boolean;
    pinchToZoom: boolean;
    swipeTimePeriod: boolean;
  };
  
  transactions: {
    swipeToDelete: boolean;
    pullToRefresh: boolean;
    longPressMenu: boolean;
    batchSelection: boolean;
  };
  
  filters: {
    dateRangePicker: boolean;
    categoryMultiSelect: boolean;
    personFilter: boolean;
    amountRangeSlider: boolean;
  };
}
```

## INTEGRATION REQUIREMENTS

### Dashboard Integration
```typescript
interface DashboardIntegration {
  widgets: {
    monthlyOverview: {
      position: 'top-right';
      data: ['income', 'expenses', 'savings'];
      size: 'medium';
    };
    
    upcomingBills: {
      position: 'sidebar';
      maxItems: 5;
      daysAhead: 7;
    };
    
    spendingAlert: {
      position: 'notification-bar';
      trigger: 'over-budget';
      style: 'warning';
    };
  };
  
  quickMetrics: {
    netIncome: number;
    savingsRate: number;
    monthlySpend: number;
    budgetHealth: 'good' | 'warning' | 'critical';
  };
}
```

### Data Export Options
- PDF reports (monthly/yearly)
- CSV transaction export
- Excel budget templates
- Tax preparation export
- Chart image export

### Third-Party Integrations
```typescript
interface Integrations {
  banking: {
    openBanking: boolean;
    plaid: boolean;
    manualImport: boolean;
  };
  
  accounting: {
    quickbooks: boolean;
    xero: boolean;
    freshbooks: boolean;
  };
  
  receipts: {
    ocrScanning: boolean;
    emailForwarding: boolean;
    cloudStorage: boolean;
  };
}
```

## API ENDPOINTS

```typescript
// Budget Categories
GET    /api/families/:familyId/budget/categories
POST   /api/families/:familyId/budget/categories
PUT    /api/families/:familyId/budget/categories/:id
DELETE /api/families/:familyId/budget/categories/:id

// Transactions
GET    /api/families/:familyId/budget/transactions
POST   /api/families/:familyId/budget/transactions
PUT    /api/families/:familyId/budget/transactions/:id
DELETE /api/families/:familyId/budget/transactions/:id
POST   /api/families/:familyId/budget/transactions/bulk-import

// Analytics
GET    /api/families/:familyId/budget/analytics/overview
GET    /api/families/:familyId/budget/analytics/trends
GET    /api/families/:familyId/budget/analytics/forecast
GET    /api/families/:familyId/budget/analytics/insights

// Goals
GET    /api/families/:familyId/budget/goals
POST   /api/families/:familyId/budget/goals
PUT    /api/families/:familyId/budget/goals/:id
POST   /api/families/:familyId/budget/goals/:id/contribute

// Reports
GET    /api/families/:familyId/budget/reports/monthly/:year/:month
GET    /api/families/:familyId/budget/reports/yearly/:year
GET    /api/families/:familyId/budget/reports/tax/:year
POST   /api/families/:familyId/budget/reports/export
```

## VALIDATION & TESTING

### Test Scenarios
1. Add income → Verify charts update
2. Set budget → Track against spending
3. Create savings goal → Auto-contribution works
4. Import transactions → Categorization correct
5. Generate report → PDF exports properly

### Performance Requirements
- Chart rendering < 500ms
- Transaction list scrolls smoothly with 1000+ items
- Real-time updates without page refresh
- Calculations accurate to 2 decimal places

## SUCCESS METRICS
- All 8 chart types rendering correctly
- Transaction categorization 95% accurate
- Budget alerts trigger within 1 minute
- Mobile responsive on all screen sizes
- Data exports match displayed values
- Dashboard widgets update in real-time