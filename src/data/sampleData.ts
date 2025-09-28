import { FamilyMember, CalendarEvent, BudgetData } from '@/types'

// Sample family members with realistic data
export const sampleFamilyMembers: FamilyMember[] = [
  {
    id: 'member-1',
    familyId: 'family-1',
    userId: 'user-1',
    name: 'John Smith',
    role: 'Parent',
    ageGroup: 'Adult',
    color: '#3B82F6',
    icon: '👨',
    fitnessGoals: {
      steps: 10000,
      workouts: 4,
      activeHours: 8,
      activities: 5
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-09-18T10:00:00Z'
  },
  {
    id: 'member-2',
    familyId: 'family-1',
    userId: 'user-2',
    name: 'Sarah Smith',
    role: 'Parent',
    ageGroup: 'Adult',
    color: '#EC4899',
    icon: '👩',
    fitnessGoals: {
      steps: 8000,
      workouts: 3,
      activeHours: 6,
      activities: 4
    },
    createdAt: '2024-01-15T10:05:00Z',
    updatedAt: '2024-09-18T10:05:00Z'
  },
  {
    id: 'member-3',
    familyId: 'family-1',
    name: 'Emma Smith',
    role: 'Student',
    ageGroup: 'Teen',
    color: '#10B981',
    icon: '👧',
    fitnessGoals: {
      steps: 6000,
      workouts: 2,
      activities: 3
    },
    createdAt: '2024-01-15T10:10:00Z',
    updatedAt: '2024-09-18T10:10:00Z'
  },
  {
    id: 'member-4',
    familyId: 'family-1',
    name: 'Lucas Smith',
    role: 'Student',
    ageGroup: 'Child',
    color: '#F59E0B',
    icon: '👦',
    fitnessGoals: {
      steps: 5000,
      activities: 2
    },
    createdAt: '2024-01-15T10:15:00Z',
    updatedAt: '2024-09-18T10:15:00Z'
  }
]

// Sample calendar events with variety
export const sampleCalendarEvents: CalendarEvent[] = [
  {
    id: 'event-1',
    familyId: 'family-1',
    personId: 'member-3',
    title: 'Soccer Practice',
    description: 'Weekly soccer training session with the school team',
    date: '2024-09-20',
    time: '16:00',
    duration: 90,
    location: 'Riverside Sports Complex',
    cost: 0,
    type: 'sport',
    recurring: 'weekly',
    isRecurring: true,
    notes: 'Bring water bottle and cleats',
    createdAt: '2024-09-15T10:00:00Z',
    updatedAt: '2024-09-18T10:00:00Z'
  },
  {
    id: 'event-2',
    familyId: 'family-1',
    personId: 'member-1',
    title: 'Parent-Teacher Conference',
    description: 'Quarterly meeting with Emma\'s teachers',
    date: '2024-09-22',
    time: '14:30',
    duration: 45,
    location: 'Hillcrest High School',
    cost: 0,
    type: 'education',
    recurring: 'none',
    isRecurring: false,
    notes: 'Room 204, Main Building',
    createdAt: '2024-09-15T11:00:00Z',
    updatedAt: '2024-09-18T11:00:00Z'
  },
  {
    id: 'event-3',
    familyId: 'family-1',
    personId: 'member-2',
    title: 'Family Dentist Appointment',
    description: 'Regular check-up for the whole family',
    date: '2024-09-23',
    time: '10:00',
    duration: 120,
    location: 'Bright Smiles Dental Clinic',
    cost: 180,
    type: 'appointment',
    recurring: 'none',
    isRecurring: false,
    notes: 'All family members',
    createdAt: '2024-09-16T09:00:00Z',
    updatedAt: '2024-09-18T09:00:00Z'
  },
  {
    id: 'event-4',
    familyId: 'family-1',
    personId: 'member-4',
    title: 'Swimming Lessons',
    description: 'Beginner swimming class',
    date: '2024-09-21',
    time: '11:00',
    duration: 60,
    location: 'Community Pool',
    cost: 25,
    type: 'sport',
    recurring: 'weekly',
    isRecurring: true,
    notes: 'Bring swimsuit and towel',
    createdAt: '2024-09-14T14:00:00Z',
    updatedAt: '2024-09-18T14:00:00Z'
  },
  {
    id: 'event-5',
    familyId: 'family-1',
    personId: 'member-1',
    title: 'Book Club Meeting',
    description: 'Monthly neighborhood book club discussion',
    date: '2024-09-25',
    time: '19:30',
    duration: 90,
    location: 'Johnson\'s House',
    cost: 0,
    type: 'social',
    recurring: 'monthly',
    isRecurring: true,
    notes: 'Currently reading "The Seven Husbands of Evelyn Hugo"',
    createdAt: '2024-09-10T16:00:00Z',
    updatedAt: '2024-09-18T16:00:00Z'
  },
  {
    id: 'event-6',
    familyId: 'family-1',
    personId: 'member-2',
    title: 'Yoga Class',
    description: 'Morning yoga session',
    date: '2024-09-19',
    time: '07:00',
    duration: 60,
    location: 'Zen Studio',
    cost: 20,
    type: 'sport',
    recurring: 'weekly',
    isRecurring: true,
    createdAt: '2024-09-12T08:00:00Z',
    updatedAt: '2024-09-18T08:00:00Z'
  }
]

// Sample budget data with detailed categories
export const sampleBudgetData: BudgetData = {
  income: [
    {
      id: 'income-1',
      familyId: 'family-1',
      personId: 'member-1',
      name: 'John\'s Salary',
      amount: 3500,
      category: 'employment',
      isRecurring: true,
      paymentDate: '2024-09-30',
      createdAt: '2024-09-01T09:00:00Z',
      type: 'income'
    },
    {
      id: 'income-2',
      familyId: 'family-1',
      personId: 'member-2',
      name: 'Sarah\'s Salary',
      amount: 2800,
      category: 'employment',
      isRecurring: true,
      paymentDate: '2024-09-30',
      createdAt: '2024-09-01T09:05:00Z',
      type: 'income'
    },
    {
      id: 'income-3',
      familyId: 'family-1',
      name: 'Freelance Projects',
      amount: 600,
      category: 'freelance',
      isRecurring: false,
      paymentDate: '2024-09-15',
      createdAt: '2024-09-10T14:00:00Z',
      type: 'income'
    }
  ],
  expenses: [
    {
      id: 'expense-1',
      familyId: 'family-1',
      name: 'Mortgage Payment',
      amount: 1800,
      category: 'housing',
      budgetLimit: 1800,
      isRecurring: true,
      paymentDate: '2024-09-01',
      createdAt: '2024-08-25T10:00:00Z',
      type: 'expense'
    },
    {
      id: 'expense-2',
      familyId: 'family-1',
      name: 'Groceries',
      amount: 650,
      category: 'food',
      budgetLimit: 700,
      isRecurring: true,
      createdAt: '2024-09-01T12:00:00Z',
      type: 'expense'
    },
    {
      id: 'expense-3',
      familyId: 'family-1',
      name: 'Utilities',
      amount: 280,
      category: 'utilities',
      budgetLimit: 300,
      isRecurring: true,
      paymentDate: '2024-09-15',
      createdAt: '2024-09-01T13:00:00Z',
      type: 'expense'
    },
    {
      id: 'expense-4',
      familyId: 'family-1',
      name: 'Car Insurance',
      amount: 180,
      category: 'transport',
      budgetLimit: 200,
      isRecurring: true,
      paymentDate: '2024-09-10',
      createdAt: '2024-08-28T11:00:00Z',
      type: 'expense'
    },
    {
      id: 'expense-5',
      familyId: 'family-1',
      name: 'Kids Activities',
      amount: 320,
      category: 'entertainment',
      budgetLimit: 400,
      isRecurring: true,
      createdAt: '2024-09-05T15:00:00Z',
      type: 'expense'
    },
    {
      id: 'expense-6',
      familyId: 'family-1',
      name: 'Phone Bills',
      amount: 120,
      category: 'utilities',
      budgetLimit: 150,
      isRecurring: true,
      paymentDate: '2024-09-20',
      createdAt: '2024-08-30T16:00:00Z',
      type: 'expense'
    },
    {
      id: 'expense-7',
      familyId: 'family-1',
      name: 'Dining Out',
      amount: 220,
      category: 'food',
      budgetLimit: 300,
      isRecurring: false,
      createdAt: '2024-09-08T19:00:00Z',
      type: 'expense'
    }
  ]
}

// Calculate budget totals and category breakdowns
export const calculateBudgetTotals = (budgetData: BudgetData) => {
  const totalIncome = budgetData.income.reduce((sum, item) => sum + item.amount, 0)
  const totalExpenses = budgetData.expenses.reduce((sum, item) => sum + item.amount, 0)
  const netAmount = totalIncome - totalExpenses

  const categoryTotals: Record<string, number> = {}
  budgetData.expenses.forEach(expense => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
  })

  return {
    totalIncome,
    totalExpenses,
    netAmount,
    categoryTotals
  }
}

// Calculate budget progress by category
export const calculateBudgetProgress = (budgetData: BudgetData) => {
  const categoryData: Array<{
    category: string
    budgeted: number
    spent: number
    percentage: number
  }> = []

  const categoryTotals: Record<string, { spent: number; budgeted: number }> = {}

  // Aggregate expenses by category
  budgetData.expenses.forEach(expense => {
    if (!categoryTotals[expense.category]) {
      categoryTotals[expense.category] = { spent: 0, budgeted: 0 }
    }
    categoryTotals[expense.category].spent += expense.amount
    if (expense.budgetLimit) {
      categoryTotals[expense.category].budgeted += expense.budgetLimit
    }
  })

  // Convert to array format for charts
  Object.entries(categoryTotals).forEach(([category, data]) => {
    if (data.budgeted > 0) {
      categoryData.push({
        category,
        budgeted: data.budgeted,
        spent: data.spent,
        percentage: (data.spent / data.budgeted) * 100
      })
    }
  })

  return categoryData
}

// Sample recent activities
export const sampleRecentActivities = [
  {
    id: 'activity-1',
    type: 'event' as const,
    title: 'Added Soccer Practice',
    description: 'Weekly recurring event for Emma',
    timestamp: '2024-09-18T09:30:00Z',
    user: 'John Smith',
    userColor: '#3B82F6'
  },
  {
    id: 'activity-2',
    type: 'budget' as const,
    title: 'Updated Grocery Budget',
    description: 'Increased monthly grocery allowance to £700',
    timestamp: '2024-09-18T08:15:00Z',
    user: 'Sarah Smith',
    userColor: '#EC4899'
  },
  {
    id: 'activity-3',
    type: 'achievement' as const,
    title: 'Reading Goal Completed!',
    description: 'Emma finished her monthly reading challenge',
    timestamp: '2024-09-17T20:00:00Z',
    user: 'Emma Smith',
    userColor: '#10B981'
  },
  {
    id: 'activity-4',
    type: 'meal' as const,
    title: 'Meal Plan Updated',
    description: 'Added healthy dinner options for the week',
    timestamp: '2024-09-17T18:30:00Z',
    user: 'Sarah Smith',
    userColor: '#EC4899'
  },
  {
    id: 'activity-5',
    type: 'shopping' as const,
    title: 'Shopping List Created',
    description: 'Weekly grocery list with 12 items',
    timestamp: '2024-09-17T14:20:00Z',
    user: 'John Smith',
    userColor: '#3B82F6'
  },
  {
    id: 'activity-6',
    type: 'goal' as const,
    title: 'Family Fitness Goal Progress',
    description: 'Achieved 75% of monthly fitness target',
    timestamp: '2024-09-16T19:45:00Z',
    user: 'Lucas Smith',
    userColor: '#F59E0B'
  }
]

// Export all calculated data
export const sampleDashboardData = {
  familyMembers: sampleFamilyMembers,
  calendarEvents: sampleCalendarEvents,
  budgetData: sampleBudgetData,
  budgetTotals: calculateBudgetTotals(sampleBudgetData),
  budgetProgress: calculateBudgetProgress(sampleBudgetData),
  recentActivities: sampleRecentActivities
}