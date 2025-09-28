# MEAL PLANNING SYSTEM - BUILD SPECIFICATION

## SYSTEM OVERVIEW
Build a comprehensive meal planning system that helps manage weekly meal plans, track nutrition, generate shopping lists, store recipes, and provide meal suggestions based on family preferences.

## DATABASE SCHEMA

```sql
-- Meal planning tables
CREATE TABLE IF NOT EXISTS meal_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  recipe_name VARCHAR(255) NOT NULL,
  cuisine_type VARCHAR(100),
  meal_type VARCHAR(50), -- 'breakfast', 'lunch', 'dinner', 'snack'
  prep_time INTEGER, -- minutes
  cook_time INTEGER, -- minutes
  servings INTEGER DEFAULT 4,
  difficulty VARCHAR(20) DEFAULT 'medium',
  ingredients JSONB NOT NULL,
  instructions TEXT[],
  nutrition_info JSONB,
  image_url TEXT,
  source VARCHAR(255),
  tags TEXT[],
  rating DECIMAL(3,2),
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  recipe_id UUID REFERENCES meal_recipes(id),
  custom_meal VARCHAR(255), -- For non-recipe meals
  assigned_to UUID REFERENCES family_members(id),
  status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'prepared', 'eaten', 'skipped'
  actual_meal VARCHAR(255), -- What was actually eaten
  notes TEXT,
  leftovers BOOLEAN DEFAULT FALSE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  person_id UUID REFERENCES family_members(id),
  dietary_restrictions TEXT[],
  allergies TEXT[],
  favorite_cuisines TEXT[],
  disliked_foods TEXT[],
  meal_frequency JSONB, -- {"breakfast": 7, "lunch": 5, "dinner": 7}
  calorie_target INTEGER,
  protein_target INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  ingredient_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  location VARCHAR(100), -- 'pantry', 'fridge', 'freezer'
  expiry_date DATE,
  purchase_date DATE,
  min_quantity DECIMAL(10,2), -- For auto-shopping list
  preferred_brand VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  list_name VARCHAR(255),
  week_of DATE,
  items JSONB NOT NULL,
  generated_from_meals BOOLEAN DEFAULT FALSE,
  total_estimated_cost DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## COMPONENT STRUCTURE

```
src/components/meals/
├── MealPlanner.tsx           // Weekly/monthly meal planning calendar
├── RecipeManager.tsx         // Recipe CRUD and search
├── RecipeImporter.tsx        // Import from URL, photo, or manual
├── MealCalendar.tsx          // Visual meal calendar
├── NutritionTracker.tsx      // Nutritional analysis and goals
├── ShoppingListGen.tsx       // Auto-generate shopping lists
├── MealSuggestions.tsx       // AI-powered meal suggestions
├── CookingMode.tsx           // Step-by-step cooking view
├── MealHistory.tsx           // Track what was actually eaten
├── InventoryManager.tsx      // Pantry/fridge inventory
└── MealPreferences.tsx       // Family dietary preferences
```

## FEATURES TO BUILD

### Core Features

#### 1. Meal Planning Calendar
```typescript
interface MealCalendar {
  views: {
    weekView: {
      days: 7;
      meals: ['breakfast', 'lunch', 'dinner', 'snacks'];
      layout: 'grid' | 'list';
    };
    monthView: {
      simplified: boolean;
      colorCoding: 'mealType' | 'cuisine' | 'cookingTime';
    };
  };
  
  planning: {
    dragAndDrop: boolean;
    copyMeals: boolean;
    mealRotation: boolean;
    batchPlanning: boolean;
    mealTemplates: boolean;
  };
  
  features: {
    nutritionSummary: boolean;
    costEstimate: boolean;
    prepTimeTotal: boolean;
    servingSizeAdjustment: boolean;
  };
}
```

#### 2. Recipe Management
```typescript
interface RecipeFeatures {
  storage: {
    familyRecipes: Recipe[];
    importedRecipes: Recipe[];
    favoriteRecipes: Recipe[];
    customTags: string[];
  };
  
  import: {
    urlImport: boolean; // Parse from recipe websites
    photoScan: boolean; // OCR from cookbook photos
    manualEntry: boolean;
    csvImport: boolean;
    pdfImport: boolean;
  };
  
  search: {
    byIngredients: boolean; // What can I make with...
    byTime: boolean; // Meals under 30 minutes
    byNutrition: boolean; // Low calorie, high protein
    byCuisine: boolean;
    byDietary: boolean; // Vegetarian, gluten-free
  };
  
  scaling: {
    servingAdjustment: boolean;
    unitConversion: boolean;
    batchCooking: boolean;
  };
}
```

#### 3. Smart Meal Suggestions
```typescript
interface MealSuggestions {
  factors: {
    seasonality: boolean; // Summer salads, winter stews
    weather: boolean; // Hot soup on cold days
    previousMeals: boolean; // Avoid repetition
    inventory: boolean; // Use what's expiring
    preferences: boolean; // Family favorites
    nutrition: boolean; // Balance weekly nutrition
    budget: boolean; // Stay within budget
    time: boolean; // Quick meals on busy days
  };
  
  algorithms: {
    varietyScore: number; // Ensure meal diversity
    nutritionBalance: number;
    preferenceMatch: number;
    inventoryUsage: number;
  };
  
  output: {
    dailySuggestions: Meal[];
    weeklyPlan: WeekPlan;
    alternatives: Meal[]; // Backup options
    reasoning: string; // Why suggested
  };
}
```

#### 4. Nutrition Tracking
```typescript
interface NutritionTracking {
  metrics: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    vitamins: VitaminProfile;
    minerals: MineralProfile;
  };
  
  goals: {
    dailyTargets: NutritionGoals;
    weeklyBalance: boolean;
    personSpecific: Map<PersonId, NutritionGoals>;
  };
  
  analysis: {
    nutritionScore: number;
    deficiencies: string[];
    excesses: string[];
    recommendations: string[];
  };
  
  visualizations: {
    dailyBreakdown: PieChart;
    weeklyTrends: LineChart;
    goalProgress: ProgressBars;
    familyComparison: BarChart;
  };
}
```

#### 5. Shopping List Generation
```typescript
interface ShoppingListGeneration {
  automation: {
    fromMealPlan: boolean; // Generate from week's meals
    inventoryCheck: boolean; // Subtract what's in stock
    staplesList: boolean; // Add regular items
    quantityOptimization: boolean; // Buy efficient quantities
  };
  
  organization: {
    byStore: boolean; // Separate lists per store
    byAisle: boolean; // Group by store layout
    byCategory: boolean;
    byPriority: boolean;
  };
  
  features: {
    priceEstimation: boolean;
    couponsIntegration: boolean;
    bulkSuggestions: boolean;
    alternativeProducts: boolean;
    shareWithFamily: boolean;
  };
  
  export: {
    toShoppingSection: boolean; // Send to shopping module
    toPDF: boolean;
    toWhatsApp: boolean;
    toEmail: boolean;
  };
}
```

#### 6. Inventory Management
```typescript
interface InventoryManagement {
  tracking: {
    pantryItems: InventoryItem[];
    fridgeItems: InventoryItem[];
    freezerItems: InventoryItem[];
    expiryAlerts: boolean;
    lowStockAlerts: boolean;
  };
  
  features: {
    barcodeScan: boolean;
    voiceAdd: boolean;
    photoInventory: boolean; // Photo of shelf
    autoDepletion: boolean; // Reduce when meal cooked
    wasteTracking: boolean;
  };
  
  insights: {
    expiringFood: Item[];
    frequentlyUsed: Item[];
    rarelyUsed: Item[];
    wasteReduction: Suggestion[];
  };
}
```

### Visual Components

#### 1. Weekly Meal Planner View
```typescript
interface WeeklyPlannerUI {
  layout: {
    type: 'calendar-grid';
    headers: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    rows: ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  };
  
  mealCards: {
    display: {
      image: boolean;
      title: boolean;
      time: string;
      difficulty: 'easy' | 'medium' | 'hard';
      servings: number;
    };
    interactions: {
      clickToView: boolean;
      dragToMove: boolean;
      rightClickMenu: boolean;
      quickEdit: boolean;
    };
  };
  
  indicators: {
    nutritionScore: ColorCode;
    vegetarian: Icon;
    glutenFree: Icon;
    favorite: Star;
    leftover: Icon;
  };
}
```

#### 2. Recipe Card Component
```typescript
interface RecipeCard {
  display: {
    image: {
      size: 'thumbnail' | 'medium' | 'large';
      fallback: PlaceholderImage;
    };
    info: {
      title: string;
      cuisine: string;
      prepTime: string;
      difficulty: string;
      rating: StarRating;
      nutritionSummary: boolean;
    };
  };
  
  actions: {
    addToMealPlan: boolean;
    addToFavorites: boolean;
    share: boolean;
    print: boolean;
    scale: boolean;
  };
  
  quickView: {
    ingredients: string[];
    nutritionFacts: NutritionLabel;
    instructions: string[];
  };
}
```

#### 3. Cooking Mode Interface
```typescript
interface CookingMode {
  display: {
    fullScreen: boolean;
    stepByStep: boolean;
    ingredientChecklist: boolean;
    timerIntegration: boolean;
    voiceControl: boolean;
  };
  
  features: {
    ingredientSubstitutions: boolean;
    techniqueVideos: boolean;
    servingCalculator: boolean;
    notesTaking: boolean;
    photoProgress: boolean;
  };
  
  completion: {
    ratingPrompt: boolean;
    leftoverTracking: boolean;
    photoUpload: boolean;
    shareExperience: boolean;
  };
}
```

### Smart Features

#### 1. Meal AI Assistant
```typescript
interface MealAI {
  capabilities: {
    naturalLanguage: {
      input: "What can I make with chicken and rice?";
      output: Recipe[];
    };
    
    photoRecognition: {
      input: Photo;
      output: {
        ingredients: string[];
        possibleRecipes: Recipe[];
      };
    };
    
    mealBalancing: {
      input: WeekPlan;
      output: {
        nutritionScore: number;
        suggestions: string[];
        swaps: MealSwap[];
      };
    };
  };
}
```

#### 2. Seasonal & Local Integration
```typescript
interface SeasonalIntegration {
  data: {
    seasonalProduce: {
      current: string[];
      upcoming: string[];
      ending: string[];
    };
    
    localEvents: {
      farmersMarkets: Event[];
      foodFestivals: Event[];
      seasonalSales: Sale[];
    };
  };
  
  suggestions: {
    seasonalRecipes: Recipe[];
    preservingGuides: Guide[];
    bulkBuyOpportunities: Item[];
  };
}
```

## DASHBOARD INTEGRATION

### Meal Widget for Main Dashboard
```typescript
interface MealDashboardWidget {
  display: {
    todaysMeals: {
      breakfast: MealSummary;
      lunch: MealSummary;
      dinner: MealSummary;
      nextMeal: Highlighted;
    };
    
    weekOverview: {
      plannedMeals: number;
      shoppingNeeded: boolean;
      prepReminders: Reminder[];
    };
    
    quickActions: {
      planToday: Button;
      viewWeek: Button;
      generateList: Button;
      findRecipe: Button;
    };
  };
  
  metrics: {
    mealsPlanned: number;
    nutritionScore: number;
    estimatedCost: number;
    prepTimeTotal: number;
  };
}
```

## API ENDPOINTS

```typescript
// Recipes
GET    /api/families/:familyId/recipes
POST   /api/families/:familyId/recipes
PUT    /api/families/:familyId/recipes/:id
DELETE /api/families/:familyId/recipes/:id
POST   /api/families/:familyId/recipes/import
GET    /api/families/:familyId/recipes/suggestions

// Meal Plans
GET    /api/families/:familyId/meal-plans
POST   /api/families/:familyId/meal-plans
PUT    /api/families/:familyId/meal-plans/:id
DELETE /api/families/:familyId/meal-plans/:id
POST   /api/families/:familyId/meal-plans/generate
GET    /api/families/:familyId/meal-plans/week/:date

// Nutrition
GET    /api/families/:familyId/nutrition/analysis/:date
GET    /api/families/:familyId/nutrition/goals
POST   /api/families/:familyId/nutrition/goals
GET    /api/families/:familyId/nutrition/trends

// Inventory
GET    /api/families/:familyId/inventory
POST   /api/families/:familyId/inventory/items
PUT    /api/families/:familyId/inventory/items/:id
DELETE /api/families/:familyId/inventory/items/:id
GET    /api/families/:familyId/inventory/expiring

// Shopping Lists
POST   /api/families/:familyId/shopping-lists/from-meals
GET    /api/families/:familyId/shopping-lists/current
```

## UI/UX REQUIREMENTS

### Visual Design
- Recipe cards with high-quality images
- Drag-and-drop meal planning
- Color-coded nutrition indicators
- Smooth animations for interactions
- Print-friendly recipe layouts

### Mobile Optimization
- Cooking mode prevents screen sleep
- Large buttons for cooking steps
- Voice control for hands-free cooking
- Quick photo upload for meals
- Swipe gestures for navigation

### Accessibility
- High contrast mode for recipes
- Voice reading of instructions
- Large text options
- Timer audio alerts
- Keyboard navigation

## SUCCESS METRICS
- Meal plan creation < 5 minutes for full week
- Recipe import accuracy > 95%
- Shopping list generation < 10 seconds
- Nutrition tracking automated 100%
- Mobile cooking mode prevents 0 screen timeouts
- Family satisfaction rating > 4.5/5