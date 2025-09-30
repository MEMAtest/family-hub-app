// Initial data for the application
// This can be replaced with actual data from a database

export const initialFamilyMembers = [
  {
    id: 'member-1',
    name: 'Parent 1',
    color: '#3B82F6',
    icon: '👤',
    age: 'Adult',
    role: 'Parent',
    fitnessGoals: { steps: 10000, workouts: 4 }
  },
  {
    id: 'member-2',
    name: 'Parent 2',
    color: '#EC4899',
    icon: '👤',
    age: 'Adult',
    role: 'Parent',
    fitnessGoals: { steps: 8000, workouts: 3 }
  },
  {
    id: 'member-3',
    name: 'Child 1',
    color: '#10B981',
    icon: '🧒',
    age: 'Child',
    role: 'Student',
    fitnessGoals: { activeHours: 2, activities: 5 }
  },
  {
    id: 'member-4',
    name: 'Child 2',
    color: '#F59E0B',
    icon: '🧒',
    age: 'Child',
    role: 'Student',
    fitnessGoals: { activeHours: 3, activities: 6 }
  }
];

export const initialEvents = [];

export const initialBudgetData = {
  income: [],
  expenses: []
};

export const initialShoppingLists = [];

export const initialMeals = [];

// Icon options for family members
export const iconOptions = [
  '👤', '👨', '👩', '🧒', '👶', '🏃', '💼', '🎓', '⚽', '🎭',
  '🎨', '🎵', '💻', '📚', '🔬', '🍳', '🌟', '🚗', '✈️', '🏠',
  '🌸', '🦋', '🐝', '🎪', '🎯', '💎', '🌊', '🏔️', '🔥', '⚡',
  '🌙', '☀️', '🌈', '🎹', '🎸', '🎮', '🏋️', '🧘', '📱', '💪'
];

// Color options for family members
export const colorOptions = [
  '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444',
  '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F59E0B'
];

// Activity type options
export const activityTypes = [
  { value: 'meeting', label: 'Meeting', icon: '📅', color: '#3B82F6' },
  { value: 'sport', label: 'Sport', icon: '⚽', color: '#10B981' },
  { value: 'education', label: 'Education', icon: '📚', color: '#8B5CF6' },
  { value: 'social', label: 'Social', icon: '👥', color: '#EC4899' },
  { value: 'fitness', label: 'Fitness', icon: '💪', color: '#F59E0B' },
  { value: 'appointment', label: 'Appointment', icon: '🏥', color: '#EF4444' },
  { value: 'other', label: 'Other', icon: '📌', color: '#6B7280' }
];

// Budget categories
export const budgetCategories = {
  income: [
    'Salary', 'Freelance', 'Investment', 'Benefits', 'Other'
  ],
  expenses: [
    'Mortgage/Rent', 'Utilities', 'Groceries', 'Transport', 'Insurance',
    'Education', 'Healthcare', 'Entertainment', 'Savings', 'Other'
  ]
};

// Shopping categories
export const shoppingCategories = [
  'General', 'Groceries', 'Household', 'Personal Care', 'Electronics',
  'Clothing', 'School Supplies', 'Sports Equipment', 'Other'
];

// Meal categories
export const mealCategories = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'
];

// News categories for family news
export const newsCategories = [
  { id: 'family', name: 'Family Updates', icon: '👨‍👩‍👧‍👦', color: 'blue' },
  { id: 'school', name: 'School News', icon: '🏫', color: 'green' },
  { id: 'local', name: 'Local Events', icon: '📍', color: 'purple' },
  { id: 'activities', name: 'Activities', icon: '🎯', color: 'orange' },
  { id: 'health', name: 'Health & Safety', icon: '🏥', color: 'red' }
];