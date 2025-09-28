# SHOPPING MANAGEMENT SYSTEM - BUILD SPECIFICATION

## SYSTEM OVERVIEW
Build a comprehensive shopping management system that handles multiple shopping lists, tracks prices, manages recurring purchases, integrates with stores, and provides spending insights.

## DATABASE SCHEMA

```sql
-- Shopping system tables
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  list_name VARCHAR(255) NOT NULL,
  list_type VARCHAR(50), -- 'grocery', 'household', 'clothing', 'school', 'other'
  store_id UUID REFERENCES stores(id),
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
  scheduled_date DATE,
  completed_date TIMESTAMP,
  shared_with TEXT[], -- email addresses or user ids
  estimated_total DECIMAL(10,2),
  actual_total DECIMAL(10,2),
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  quantity INTEGER DEFAULT 1,
  unit VARCHAR(50),
  category VARCHAR(100),
  estimated_price DECIMAL(10,2),
  actual_price DECIMAL(10,2),
  regular_price DECIMAL(10,2), -- For price tracking
  sale_price DECIMAL(10,2),
  person_id UUID REFERENCES family_members(id),
  priority VARCHAR(20) DEFAULT 'normal', -- 'urgent', 'high', 'normal', 'low'
  notes TEXT,
  image_url TEXT,
  barcode VARCHAR(50),
  aisle_location VARCHAR(50),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_frequency VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  store_name VARCHAR(255) NOT NULL,
  store_chain VARCHAR(100),
  location_address TEXT,
  location_coords POINT,
  store_layout JSONB, -- Aisle mappings
  opening_hours JSONB,
  preferred_for TEXT[], -- Categories this store is preferred for
  loyalty_card_number VARCHAR(100),
  online_ordering BOOLEAN DEFAULT FALSE,
  delivery_available BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  store_id UUID REFERENCES stores(id),
  quantity INTEGER,
  unit VARCHAR(50),
  price DECIMAL(10,2),
  purchase_date DATE NOT NULL,
  purchased_by UUID REFERENCES family_members(id),
  category VARCHAR(100),
  satisfaction_rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  would_buy_again BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS price_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  store_id UUID REFERENCES stores(id),
  price DECIMAL(10,2) NOT NULL,
  is_sale_price BOOLEAN DEFAULT FALSE,
  price_date DATE NOT NULL,
  unit VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shopping_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  template_name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50),
  items JSONB NOT NULL,
  frequency VARCHAR(50), -- 'weekly', 'biweekly', 'monthly'
  last_used TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## COMPONENT STRUCTURE

```
src/components/shopping/
├── ShoppingDashboard.tsx     // Main shopping view
├── ListManager.tsx           // Create and manage lists
├── ItemEntry.tsx             // Add items interface
├── StoreManager.tsx          // Store preferences and info
├── PriceTracker.tsx          // Price history and comparisons
├── ShoppingTemplates.tsx     // Recurring list templates
├── BarcodeScanner.tsx        // Scan items to add
├── ReceiptScanner.tsx        // OCR receipt processing
├── ShareList.tsx             // Share with family/others
├── ShoppingInsights.tsx      // Analytics and trends
└── StoreMap.tsx             // In-store navigation
```

## FEATURES TO BUILD

### Core Features

#### 1. Smart List Management
```typescript
interface SmartListFeatures {
  creation: {
    quickAdd: boolean; // Voice or text
    photoAdd: boolean; // Take photo of empty item
    barcodeAdd: boolean; // Scan barcode
    importFromRecipe: boolean;
    importFromMealPlan: boolean;
    copyPreviousList: boolean;
  };
  
  organization: {
    autoCategories: boolean;
    storeLayout: boolean; // Organize by store aisles
    priority: 'urgent' | 'high' | 'normal' | 'low';
    assignToPerson: boolean;
    groupByDepartment: boolean;
  };
  
  intelligence: {
    suggestMissingItems: boolean; // Based on patterns
    quantitySuggestions: boolean; // Based on family size
    alternativeProducts: boolean;
    dealAlerts: boolean;
    seasonalReminders: boolean;
  };
}
```

#### 2. Price Intelligence
```typescript
interface PriceIntelligence {
  tracking: {
    historicalPrices: PricePoint[];
    priceAlerts: Alert[];
    bestPriceStore: Store;
    priceDropNotifications: boolean;
  };
  
  comparison: {
    multiStore: boolean; // Compare across stores
    unitPrice: boolean; // Price per unit
    bulkSavings: boolean;
    brandComparison: boolean;
  };
  
  predictions: {
    saleCycles: Pattern[]; // When items go on sale
    bestBuyTime: Recommendation;
    stockUpAlerts: boolean; // Buy now, price increasing
  };
  
  insights: {
    monthlySpending: Chart;
    categoryBreakdown: PieChart;
    savingsTracking: number;
    costPerMeal: number;
  };
}
```

#### 3. Store Integration
```typescript
interface StoreFeatures {
  storeProfiles: {
    preferredStores: Store[];
    storeLayouts: Map<StoreId, Layout>;
    openingHours: Schedule[];
    specialOffers: Offer[];
  };
  
  navigation: {
    inStoreMap: boolean;
    aisleLocator: boolean;
    efficientRoute: boolean; // Optimal path through store
    parkingReminder: boolean;
  };
  
  loyalty: {
    cardStorage: boolean;
    pointsTracking: boolean;
    rewardsAlerts: boolean;
    digitalCoupons: boolean;
  };
  
  ordering: {
    onlineIntegration: boolean;
    clickAndCollect: boolean;
    deliveryScheduling: boolean;
    substitutionPreferences: boolean;
  };
}
```

#### 4. Collaborative Shopping
```typescript
interface CollaborativeShopping {
  sharing: {
    familyMembers: boolean;
    realTimeSync: boolean;
    assignItems: boolean;
    splitLists: boolean; // Divide among shoppers
  };
  
  communication: {
    comments: boolean;
    photoRequests: boolean; // "Get this specific brand"
    voiceNotes: boolean;
    liveLocation: boolean; // See who's at store
  };
  
  coordination: {
    duplicatePrevention: boolean;
    completionTracking: boolean;
    multiStoreLists: boolean;
    handoffMode: boolean; // Pass list to another person
  };
}
```

#### 5. Shopping Templates & Automation
```typescript
interface ShoppingAutomation {
  templates: {
    weeklyEssentials: Template;
    monthlyStock: Template;
    seasonalItems: Template;
    eventShopping: Template; // Birthday party supplies
    customTemplates: Template[];
  };
  
  automation: {
    autoGenerate: boolean; // From meal plans
    recurringLists: boolean;
    restockAlerts: boolean; // Low on regular items
    subscriptionItems: boolean; // Auto-order
    habitLearning: boolean; // Learn patterns
  };
  
  smart: {
    weatherBased: boolean; // BBQ items if sunny
    eventBased: boolean; // School supplies in August
    healthTracking: boolean; // Healthier alternatives
    budgetOptimization: boolean;
  };
}
```

### Visual Components

#### 1. Shopping List Interface
```typescript
interface ShoppingListUI {
  layout: {
    view: 'list' | 'grid' | 'category';
    grouping: 'aisle' | 'category' | 'priority' | 'person';
    sorting: 'alphabetical' | 'priority' | 'price' | 'aisle';
  };
  
  itemCards: {
    display: {
      image: boolean;
      price: boolean;
      quantity: boolean;
      assignee: Avatar;
      notes: boolean;
    };
    
    interactions: {
      swipeToComplete: boolean;
      tapToEdit: boolean;
      longPressOptions: boolean;
      dragToReorder: boolean;
    };
    
    indicators: {
      onSale: Badge;
      recurring: Icon;
      urgent: Color;
      assigned: Avatar;
    };
  };
  
  toolbar: {
    search: boolean;
    filter: boolean;
    sort: boolean;
    share: boolean;
    export: boolean;
  };
}
```

#### 2. In-Store Mode
```typescript
interface InStoreMode {
  features: {
    largeButtons: boolean; // Easy tap while shopping
    checkOffAnimation: boolean;
    runningTotal: boolean;
    voiceAdd: boolean;
    cartMode: boolean; // Track what's in cart
  };
  
  helpers: {
    aisleMap: boolean;
    itemLocator: boolean;
    priceChecker: boolean;
    substitutesFinder: boolean;
    budgetTracker: ProgressBar;
  };
  
  completion: {
    receiptCapture: boolean;
    totalConfirmation: boolean;
    savingsCalculation: boolean;
    ratingPrompt: boolean;
  };
}
```

#### 3. Price Comparison View
```typescript
interface PriceComparisonUI {
  display: {
    multiStoreGrid: {
      stores: Store[];
      pricePerStore: Map<StoreId, Price>;
      savings: Calculation;
      distance: number;
    };
    
    historicalChart: {
      timeline: '3m' | '6m' | '1y';
      pricePoints: Point[];
      averageLine: boolean;
      salePeriods: Highlighted;
    };
    
    recommendations: {
      buyNow: Item[];
      waitForSale: Item[];
      bulkBuy: Item[];
      alternative: Item[];
    };
  };
}
```

### Smart Features

#### 1. Shopping AI Assistant
```typescript
interface ShoppingAI {
  capabilities: {
    naturalLanguage: {
      input: "Add basics for spaghetti dinner";
      output: Item[]; // pasta, sauce, parmesan, etc.
    };
    
    photoRecognition: {
      input: Photo; // Empty milk carton
      output: {
        item: "Milk - 2L";
        brand: "Previous brand";
        addToList: boolean;
      };
    };
    
    budgetOptimization: {
      input: Budget;
      output: {
        recommendations: string[];
        alternatives: Product[];
        savings: number;
      };
    };
    
    mealToList: {
      input: "Chicken stir fry for 4";
      output: ShoppingList;
    };
  };
}
```

#### 2. Spending Analytics
```typescript
interface SpendingAnalytics {
  metrics: {
    weeklyAverage: number;
    monthlyTrend: Trend;
    categoryBreakdown: PieChart;
    personBreakdown: BarChart;
    storeComparison: Table;
  };
  
  insights: {
    unusualSpending: Alert[];
    savingOpportunities: Suggestion[];
    priceIncreases: Item[];
    betterAlternatives: Product[];
  };
  
  reports: {
    monthly: Report;
    yearly: Report;
    taxDeductible: Report;
    healthSpending: Report;
  };
}
```

## INTEGRATIONS

### External Integrations
```typescript
interface ExternalIntegrations {
  stores: {
    tesco: {
      api: boolean;
      clubcard: boolean;
      delivery: boolean;
    };
    sainsburys: {
      nectar: boolean;
      smartShop: boolean;
    };
    asda: {
      rewards: boolean;
      scan_go: boolean;
    };
  };
  
  coupons: {
    honey: boolean;
    voucherCodes: boolean;
    brandCoupons: boolean;
    cashback: boolean;
  };
  
  delivery: {
    instacart: boolean;
    amazonFresh: boolean;
    deliveroo: boolean;
  };
}
```

### Dashboard Integration
```typescript
interface ShoppingDashboardWidget {
  display: {
    activeLists: {
      count: number;
      nextShop: Date;
      itemsRemaining: number;
    };
    
    spending: {
      weekTotal: number;
      monthTotal: number;
      vsLastMonth: Percentage;
    };
    
    quickActions: {
      viewLists: Button;
      quickAdd: Button;
      templates: Button;
    };
  };
  
  alerts: {
    priceDrops: Notification[];
    lowStock: Item[];
    expiringCoupons: Coupon[];
  };
}
```

## API ENDPOINTS

```typescript
// Lists
GET    /api/families/:familyId/shopping-lists
POST   /api/families/:familyId/shopping-lists
PUT    /api/families/:familyId/shopping-lists/:id
DELETE /api/families/:familyId/shopping-lists/:id
POST   /api/families/:familyId/shopping-lists/:id/share

// Items
GET    /api/families/:familyId/shopping-lists/:listId/items
POST   /api/families/:familyId/shopping-lists/:listId/items
PUT    /api/families/:familyId/shopping-items/:id
DELETE /api/families/:familyId/shopping-items/:id
PATCH  /api/families/:familyId/shopping-items/:id/complete

// Stores
GET    /api/families/:familyId/stores
POST   /api/families/:familyId/stores
PUT    /api/families/:familyId/stores/:id
GET    /api/families/:familyId/stores/:id/layout

// Prices
GET    /api/families/:familyId/prices/track/:itemId
GET    /api/families/:familyId/prices/compare
POST   /api/families/:familyId/prices/alert

// Templates
GET    /api/families/:familyId/shopping-templates
POST   /api/families/:familyId/shopping-templates
POST   /api/families/:familyId/shopping-templates/:id/apply

// Analytics
GET    /api/families/:familyId/shopping/analytics
GET    /api/families/:familyId/shopping/insights
GET    /api/families/:familyId/shopping/savings
```

## MOBILE FEATURES

### Mobile-First Design
```typescript
interface MobileFeatures {
  inStore: {
    oneHandMode: boolean;
    largeTapTargets: boolean;
    vibrateOnComplete: boolean;
    screenWakeLock: boolean;
  };
  
  scanning: {
    barcodeScanner: boolean;
    receiptOCR: boolean;
    voiceInput: boolean;
  };
  
  offline: {
    listsCached: boolean;
    syncWhenOnline: boolean;
    offlineMode: boolean;
  };
}
```

## SUCCESS METRICS
- List creation time < 2 minutes
- Item categorization 95% accurate
- Price tracking saves 10%+ on groceries
- In-store mode reduces shopping time 20%
- Receipt scan accuracy > 90%
- Real-time sync < 1 second delay