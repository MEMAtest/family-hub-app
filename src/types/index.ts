// Core family and user types
export interface User {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface Family {
  id: string;
  familyName: string;
  familyCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId?: string;
  name: string;
  role: 'Parent' | 'Student' | 'Family Member';
  ageGroup: 'Toddler' | 'Preschool' | 'Child' | 'Teen' | 'Adult';
  dateOfBirth?: string; // YYYY-MM-DD format
  age?: number;
  avatarUrl?: string;
  color: string;        // Hex color code
  icon: string;         // Emoji character
  fitnessGoals?: {
    steps?: number;
    workouts?: number;
    activeHours?: number;
    activities?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type MilestoneType = 'birthday' | 'anniversary' | 'achievement' | 'life_event' | 'family_event' | 'other';

export interface FamilyMilestone {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  type: MilestoneType;
  participants: string[];
  photos: string[];
  tags: string[];
  isRecurring: boolean;
  reminderDays: number[];
  isPrivate: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  familyId: string;
  personId: string;
  title: string;
  description?: string;
  date: string;         // YYYY-MM-DD format
  time: string;         // HH:MM format
  duration: number;     // minutes
  location?: string;
  cost: number;         // pounds
  type: 'sport' | 'education' | 'social' | 'meeting' | 'appointment' | 'other';
  recurring: 'none' | 'weekly' | 'monthly';
  isRecurring: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CalendarView = 'month' | 'week' | 'day';

// Budget types
export interface BudgetItem {
  id: string;
  familyId: string;
  personId?: string;
  name: string;
  amount: number;
  category: string;
  isRecurring: boolean;
  budgetLimit?: number;
  paymentDate?: string;
  createdAt: string;
}

export interface IncomeItem extends BudgetItem {
  type: 'income';
}

export interface ExpenseItem extends BudgetItem {
  type: 'expense';
}

export interface BudgetData {
  income: IncomeItem[];
  expenses: ExpenseItem[];
}

export interface BudgetTotals {
  totalIncome: number;
  totalExpenses: number;
  netAmount: number;
  categoryTotals: Record<string, number>;
}

export interface BudgetProgress {
  category: string;
  spent: number;
  limit: number;
  percentage: number;
  status: 'normal' | 'warning' | 'over';
}

// Meal planning types
export interface MealPlan {
  id: string;
  familyId: string;
  date: string;         // YYYY-MM-DD format
  name: string;
  protein?: string;
  carbohydrate?: string;
  vegetable?: string;
  calories?: number;
  notes?: string;
  isEaten: boolean;
  eatenAt?: string;
  createdAt: string;
}

export interface MealComponent {
  id: string;
  name: string;
  type: 'protein' | 'carbohydrate' | 'vegetable';
  calories?: number;
}

// Shopping types
export interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  category: string;
  items: ShoppingItem[];
  isActive: boolean;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  listId: string;
  name: string;
  estimatedPrice: number;
  category: string;
  frequency?: string;
  personId?: string;
  isCompleted: boolean;
  completedAt?: string;
  createdAt: string;
}

// Goals and achievements types
export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface FamilyGoal {
  id: string;
  familyId: string;
  title: string;
  description: string;
  type: 'family' | 'individual';
  targetValue: string;
  currentProgress: number;    // 0-100 percentage
  deadline: string;          // YYYY-MM-DD format
  participants: string[];    // Array of member IDs
  milestones: Milestone[];
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  id: string;
  familyId: string;
  personId: string;
  title: string;
  description: string;
  category: string;
  badge: string;           // Emoji
  pointsAwarded: number;
  achievedDate: string;    // YYYY-MM-DD format
  createdAt: string;
}

// Fitness tracking types
export interface FitnessActivity {
  id: string;
  personId: string;
  activityType: string;
  durationMinutes: number;
  intensityLevel: 'low' | 'moderate' | 'high';
  activityDate: string;    // YYYY-MM-DD format
  notes?: string;
  createdAt: string;
}

// Context types for state management
export interface FamilyContextType {
  currentFamily: Family | null;
  familyMembers: FamilyMember[];
  setCurrentFamily: (family: Family | null) => void;
  addFamilyMember: (member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateFamilyMember: (id: string, data: Partial<FamilyMember>) => void;
  deleteFamilyMember: (id: string) => void;
  loading: boolean;
  error: string | null;
}

export interface CalendarContextType {
  events: CalendarEvent[];
  currentDate: Date;
  calendarView: CalendarView;
  selectedPerson: string;
  setCurrentDate: (date: Date) => void;
  setCalendarView: (view: CalendarView) => void;
  setSelectedPerson: (personId: string) => void;
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  loading: boolean;
  error: string | null;
}

export interface BudgetContextType {
  budgetData: BudgetData;
  budgetTotals: BudgetTotals;
  budgetProgress: BudgetProgress[];
  addIncome: (income: Omit<IncomeItem, 'id' | 'createdAt'>) => void;
  addExpense: (expense: Omit<ExpenseItem, 'id' | 'createdAt'>) => void;
  updateIncome: (id: string, data: Partial<IncomeItem>) => void;
  updateExpense: (id: string, data: Partial<ExpenseItem>) => void;
  deleteIncome: (id: string) => void;
  deleteExpense: (id: string) => void;
  loading: boolean;
  error: string | null;
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  familyName: string;
  memberName: string;
  role: FamilyMember['role'];
  ageGroup: FamilyMember['ageGroup'];
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Form types
export interface EventFormData {
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  location?: string;
  cost: number;
  type: CalendarEvent['type'];
  recurring: CalendarEvent['recurring'];
  notes?: string;
  personId: string;
}

export interface MealFormData {
  date: string;
  name: string;
  protein?: string;
  carbohydrate?: string;
  vegetable?: string;
  calories?: number;
  notes?: string;
}

export interface BudgetFormData {
  name: string;
  amount: number;
  category: string;
  isRecurring: boolean;
  budgetLimit?: number;
  paymentDate?: string;
  personId?: string;
}

export interface ShoppingFormData {
  name: string;
  estimatedPrice: number;
  category: string;
  frequency?: string;
  personId?: string;
}

export interface FamilyMemberFormData {
  name: string;
  role: FamilyMember['role'];
  ageGroup: FamilyMember['ageGroup'];
  color: string;
  icon: string;
  fitnessGoals?: FamilyMember['fitnessGoals'];
}

export interface GoalFormData {
  title: string;
  description: string;
  type: FamilyGoal['type'];
  targetValue: string;
  deadline: string;
  participants: string[];
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}

// Dashboard widget types
export interface DashboardWidget {
  id: string;
  title: string;
  type: 'calendar' | 'budget' | 'meals' | 'shopping' | 'goals' | 'achievements';
  data: any;
  size: 'small' | 'medium' | 'large';
  position: {
    x: number;
    y: number;
  };
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Theme and UI types
export interface Theme {
  primary: string;
  secondary: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  surface: string;
  text: string;
}

export interface UIPreferences {
  theme: 'light' | 'dark' | 'auto';
  compactMode: boolean;
  showAvatars: boolean;
  defaultCalendarView: CalendarView;
}

// Export all types as a namespace for easier imports
export type * from './index';
