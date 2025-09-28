// Meal Planning System Types

export interface MealRecipe {
  id: string;
  familyId: string;
  recipeName: string;
  cuisineType?: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  nutritionInfo?: NutritionInfo;
  imageUrl?: string;
  source?: string;
  tags: string[];
  rating?: number;
  isFavorite: boolean;
  createdBy?: string;
  createdAt: Date;
}

export interface RecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  notes?: string;
  optional?: boolean;
}

export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  vitamins?: VitaminProfile;
  minerals?: MineralProfile;
}

export interface VitaminProfile {
  vitaminA?: number; // IU
  vitaminC?: number; // mg
  vitaminD?: number; // IU
  vitaminE?: number; // mg
  vitaminK?: number; // mcg
  thiamin?: number; // mg
  riboflavin?: number; // mg
  niacin?: number; // mg
  vitaminB6?: number; // mg
  folate?: number; // mcg
  vitaminB12?: number; // mcg
}

export interface MineralProfile {
  calcium?: number; // mg
  iron?: number; // mg
  magnesium?: number; // mg
  phosphorus?: number; // mg
  potassium?: number; // mg
  zinc?: number; // mg
}

export interface MealPlan {
  id: string;
  familyId: string;
  planDate: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  recipe?: MealRecipe;
  customMeal?: string;
  assignedTo?: string;
  status: 'planned' | 'prepared' | 'eaten' | 'skipped';
  actualMeal?: string;
  notes?: string;
  leftovers: boolean;
  rating?: number;
  createdAt: Date;
}

export interface MealPreferences {
  id: string;
  familyId: string;
  personId?: string;
  dietaryRestrictions: string[];
  allergies: string[];
  favoriteCuisines: string[];
  dislikedFoods: string[];
  mealFrequency: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snacks: number;
  };
  calorieTarget?: number;
  proteinTarget?: number;
  createdAt: Date;
}

export interface InventoryItem {
  id: string;
  familyId: string;
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  location: 'pantry' | 'fridge' | 'freezer';
  expiryDate?: Date;
  purchaseDate?: Date;
  minQuantity?: number;
  preferredBrand?: string;
  notes?: string;
  createdAt: Date;
}

export interface ShoppingList {
  id: string;
  familyId: string;
  listName: string;
  weekOf: Date;
  items: ShoppingListItem[];
  generatedFromMeals: boolean;
  totalEstimatedCost?: number;
  status: 'pending' | 'shopping' | 'completed';
  createdAt: Date;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  estimatedCost?: number;
  store?: string;
  aisle?: string;
  priority: 'high' | 'medium' | 'low';
  purchased: boolean;
  notes?: string;
}

export interface WeekPlan {
  weekOf: Date;
  days: DayPlan[];
  nutritionSummary: WeeklyNutritionSummary;
  totalCost: number;
  totalPrepTime: number;
  shoppingList: ShoppingList;
}

export interface DayPlan {
  date: Date;
  meals: {
    breakfast?: MealPlan;
    lunch?: MealPlan;
    dinner?: MealPlan;
    snacks?: MealPlan[];
  };
  dailyNutrition: NutritionInfo;
  dailyCost: number;
  dailyPrepTime: number;
}

export interface WeeklyNutritionSummary {
  averageDaily: NutritionInfo;
  weeklyTotals: NutritionInfo;
  nutritionScore: number;
  deficiencies: string[];
  excesses: string[];
  recommendations: string[];
}

// Meal Suggestions & AI
export interface MealSuggestion {
  recipe: MealRecipe;
  confidence: number;
  reasoning: string[];
  factors: {
    seasonality: number;
    weather: number;
    previousMeals: number;
    inventory: number;
    preferences: number;
    nutrition: number;
    budget: number;
    time: number;
  };
  alternatives: MealRecipe[];
}

export interface MealSearchCriteria {
  ingredients?: string[];
  maxPrepTime?: number;
  maxCookTime?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dietary?: string[];
  maxCalories?: number;
  minProtein?: number;
  tags?: string[];
  rating?: number;
  servings?: number;
}

export interface CookingSession {
  id: string;
  recipeId: string;
  recipe: MealRecipe;
  startTime: Date;
  currentStep: number;
  completedSteps: boolean[];
  timers: CookingTimer[];
  notes: string[];
  photos: string[];
  modifications: string[];
  servingAdjustment: number;
  status: 'preparation' | 'cooking' | 'completed' | 'paused';
}

export interface CookingTimer {
  id: string;
  name: string;
  duration: number; // seconds
  startTime: Date;
  isActive: boolean;
  isCompleted: boolean;
}

// Dashboard Integration
export interface MealDashboardWidget {
  todaysMeals: {
    breakfast?: MealPlan;
    lunch?: MealPlan;
    dinner?: MealPlan;
    nextMeal?: MealPlan;
  };
  weekOverview: {
    plannedMeals: number;
    totalMeals: number;
    shoppingNeeded: boolean;
    prepReminders: MealReminder[];
  };
  metrics: {
    mealsPlanned: number;
    nutritionScore: number;
    estimatedCost: number;
    prepTimeTotal: number;
  };
}

export interface MealReminder {
  id: string;
  type: 'prep' | 'cook' | 'shop' | 'defrost';
  mealId: string;
  mealName: string;
  reminderTime: Date;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

// Recipe Import Types
export interface RecipeImportData {
  url?: string;
  photo?: File;
  text?: string;
  csv?: File;
  pdf?: File;
}

export interface ImportedRecipeData {
  title: string;
  ingredients: string[];
  instructions: string[];
  servings?: number;
  prepTime?: number;
  cookTime?: number;
  imageUrl?: string;
  source?: string;
  nutrition?: Partial<NutritionInfo>;
  confidence: number;
  errors: string[];
}

// Calendar View Types
export interface MealCalendarView {
  type: 'week' | 'month';
  startDate: Date;
  endDate: Date;
  meals: MealPlan[];
  filter?: {
    mealType?: string[];
    assignedTo?: string[];
    status?: string[];
  };
}

export interface MealCalendarDay {
  date: Date;
  meals: {
    breakfast?: MealPlan;
    lunch?: MealPlan;
    dinner?: MealPlan;
    snacks?: MealPlan[];
  };
  nutritionSummary: NutritionInfo;
  isToday: boolean;
  hasAllMealsPlanned: boolean;
}

// Seasonal & Local Integration
export interface SeasonalData {
  seasonalProduce: {
    current: string[];
    upcoming: string[];
    ending: string[];
  };
  localEvents: {
    farmersMarkets: LocalEvent[];
    foodFestivals: LocalEvent[];
    seasonalSales: Sale[];
  };
  suggestions: {
    seasonalRecipes: MealRecipe[];
    preservingGuides: Guide[];
    bulkBuyOpportunities: InventoryItem[];
  };
}

export interface LocalEvent {
  id: string;
  name: string;
  date: Date;
  location: string;
  description: string;
  type: 'market' | 'festival' | 'sale';
}

export interface Sale {
  id: string;
  store: string;
  item: string;
  originalPrice: number;
  salePrice: number;
  startDate: Date;
  endDate: Date;
}

export interface Guide {
  id: string;
  title: string;
  content: string;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

// Nutrition Goals & Tracking
export interface NutritionGoals {
  personId?: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyFiber: number;
  dailySodium: number;
  vitamins?: Partial<VitaminProfile>;
  minerals?: Partial<MineralProfile>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NutritionAnalysis {
  date: Date;
  actual: NutritionInfo;
  goals: NutritionGoals;
  score: number;
  percentages: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  status: {
    calories: 'under' | 'within' | 'over';
    protein: 'under' | 'within' | 'over';
    carbs: 'under' | 'within' | 'over';
    fat: 'under' | 'within' | 'over';
  };
  recommendations: string[];
}

// Export Types
export type MealExportFormat = 'pdf' | 'csv' | 'text' | 'image';
export type MealExportType = 'recipe' | 'meal-plan' | 'shopping-list' | 'nutrition-report';

export interface MealExportOptions {
  format: MealExportFormat;
  type: MealExportType;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeImages: boolean;
  includeNutrition: boolean;
  includeInstructions: boolean;
  includeShoppingList: boolean;
}

// API Response Types
export interface MealApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MealPaginatedResponse<T> extends MealApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Form Types
export interface RecipeFormData {
  recipeName: string;
  cuisineType: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  ingredients: RecipeIngredient[];
  instructions: string[];
  tags: string[];
  imageUrl?: string;
  source?: string;
}

export interface MealPlanFormData {
  planDate: Date;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string;
  customMeal?: string;
  assignedTo?: string;
  notes?: string;
}

export interface InventoryFormData {
  ingredientName: string;
  category: string;
  quantity: number;
  unit: string;
  location: 'pantry' | 'fridge' | 'freezer';
  expiryDate?: Date;
  purchaseDate?: Date;
  minQuantity?: number;
  preferredBrand?: string;
  notes?: string;
}