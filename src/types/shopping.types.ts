// Shopping Management System Types

export interface ShoppingList {
  id: string;
  familyId: string;
  listName: string;
  listType: 'grocery' | 'household' | 'clothing' | 'school' | 'other';
  storeId?: string;
  store?: Store;
  status: 'active' | 'completed' | 'archived';
  scheduledDate?: Date;
  completedDate?: Date;
  sharedWith: string[]; // email addresses or user ids
  estimatedTotal?: number;
  actualTotal?: number;
  createdBy?: string;
  createdAt: Date;
  items: ShoppingItem[];
}

export interface ShoppingItem {
  id: string;
  listId: string;
  itemName: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
  estimatedPrice?: number;
  actualPrice?: number;
  regularPrice?: number;
  salePrice?: number;
  personId?: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  notes?: string;
  imageUrl?: string;
  barcode?: string;
  aisleLocation?: string;
  isCompleted: boolean;
  completedAt?: Date;
  isRecurring: boolean;
  recurringFrequency?: string;
  createdAt: Date;
}

export interface Store {
  id: string;
  familyId: string;
  storeName: string;
  storeChain?: string;
  locationAddress?: string;
  locationCoords?: { lat: number; lng: number };
  storeLayout?: StoreLayout;
  openingHours?: OpeningHours;
  preferredFor: string[]; // Categories this store is preferred for
  loyaltyCardNumber?: string;
  onlineOrdering: boolean;
  deliveryAvailable: boolean;
  notes?: string;
  createdAt: Date;
}

export interface StoreLayout {
  aisles: StoreAisle[];
  departments: StoreDepartment[];
  specialSections: SpecialSection[];
}

export interface StoreAisle {
  aisleNumber: string;
  aisleLabel: string;
  categories: string[];
  position: { x: number; y: number };
}

export interface StoreDepartment {
  name: string;
  description: string;
  aisles: string[];
  position: { x: number; y: number };
}

export interface SpecialSection {
  name: string;
  description: string;
  position: { x: number; y: number };
  categories: string[];
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string; // "09:00"
  close: string; // "22:00"
  is24Hours: boolean;
  isClosed: boolean;
}

export interface ShoppingHistory {
  id: string;
  familyId: string;
  itemName: string;
  brand?: string;
  storeId?: string;
  store?: Store;
  quantity: number;
  unit?: string;
  price: number;
  purchaseDate: Date;
  purchasedBy?: string;
  category: string;
  satisfactionRating?: number;
  wouldBuyAgain?: boolean;
  notes?: string;
  createdAt: Date;
}

export interface PriceTracking {
  id: string;
  itemName: string;
  brand?: string;
  storeId?: string;
  store?: Store;
  price: number;
  isSalePrice: boolean;
  priceDate: Date;
  unit?: string;
  createdAt: Date;
}

export interface ShoppingTemplate {
  id: string;
  familyId: string;
  templateName: string;
  templateType: string;
  items: TemplateItem[];
  frequency: 'weekly' | 'biweekly' | 'monthly';
  lastUsed?: Date;
  usageCount: number;
  createdAt: Date;
}

export interface TemplateItem {
  itemName: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
  estimatedPrice?: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  notes?: string;
}

// Smart Features & AI
export interface ShoppingAI {
  naturalLanguageInput: string;
  photoRecognition: {
    image: File;
    recognizedItem: string;
    confidence: number;
  };
  budgetOptimization: {
    currentBudget: number;
    recommendations: string[];
    alternatives: ProductAlternative[];
    potentialSavings: number;
  };
  mealToList: {
    mealDescription: string;
    generatedItems: ShoppingItem[];
  };
}

export interface ProductAlternative {
  originalItem: string;
  alternativeItem: string;
  priceDifference: number;
  savings: number;
  reason: string;
  quality: 'same' | 'better' | 'lower';
}

export interface AIShoppingSavings {
  summary: string;
  estimatedSavings?: {
    weekly?: number | null;
    monthly?: number | null;
  };
  listRecommendations: Array<{
    listName: string;
    actions: string[];
    storeSuggestions?: string[];
    estimatedSavings?: number | null;
  }>;
  substitutions: Array<{
    originalItem: string;
    alternative: string;
    reason: string;
    savings?: number | null;
    store?: string;
  }>;
  stockAlerts?: string[];
  nextActions?: string[];
}

// Price Intelligence
export interface PriceIntelligence {
  tracking: {
    historicalPrices: PricePoint[];
    priceAlerts: PriceAlert[];
    bestPriceStore: Store;
    priceDropNotifications: boolean;
  };
  comparison: {
    multiStore: StoreComparison[];
    unitPrice: UnitPriceComparison;
    bulkSavings: BulkSavingsAnalysis;
    brandComparison: BrandComparison[];
  };
  predictions: {
    saleCycles: SalePattern[];
    bestBuyTime: BuyRecommendation;
    stockUpAlerts: StockAlert[];
  };
}

export interface PricePoint {
  date: Date;
  price: number;
  store: string;
  isSale: boolean;
}

export interface PriceAlert {
  id: string;
  itemName: string;
  targetPrice: number;
  currentPrice: number;
  storeId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface StoreComparison {
  store: Store;
  price: number;
  distance: number;
  savings: number;
  isAvailable: boolean;
}

export interface UnitPriceComparison {
  item: string;
  options: {
    size: string;
    unitPrice: number;
    totalPrice: number;
    bestValue: boolean;
  }[];
}

export interface BulkSavingsAnalysis {
  item: string;
  regularPrice: number;
  bulkPrice: number;
  savings: number;
  breakEvenQuantity: number;
  recommendation: string;
}

export interface BrandComparison {
  category: string;
  brands: {
    name: string;
    price: number;
    rating: number;
    features: string[];
  }[];
}

export interface SalePattern {
  item: string;
  frequency: number; // weeks
  averageDiscount: number;
  nextPredictedSale: Date;
  confidence: number;
}

export interface BuyRecommendation {
  item: string;
  action: 'buy_now' | 'wait_for_sale' | 'bulk_buy' | 'find_alternative';
  reason: string;
  predictedSavings: number;
  timeframe: string;
}

export interface StockAlert {
  item: string;
  currentStock: number;
  recommendedStock: number;
  reason: string;
  urgency: 'high' | 'medium' | 'low';
}

// Collaborative Features
export interface CollaborativeShopping {
  sharing: {
    familyMembers: string[];
    realTimeSync: boolean;
    assignedItems: Map<string, string[]>; // personId -> itemIds
    splitLists: SplitList[];
  };
  communication: {
    comments: ItemComment[];
    photoRequests: PhotoRequest[];
    voiceNotes: VoiceNote[];
    liveLocation: LocationShare[];
  };
}

export interface SplitList {
  personId: string;
  personName: string;
  assignedItems: ShoppingItem[];
  estimatedTotal: number;
  status: 'pending' | 'shopping' | 'completed';
}

export interface ItemComment {
  id: string;
  itemId: string;
  userId: string;
  userName: string;
  comment: string;
  timestamp: Date;
}

export interface PhotoRequest {
  id: string;
  itemId: string;
  requestedBy: string;
  requestMessage: string;
  photoUrl?: string;
  status: 'pending' | 'fulfilled';
  timestamp: Date;
}

export interface VoiceNote {
  id: string;
  itemId: string;
  userId: string;
  audioUrl: string;
  transcript?: string;
  duration: number;
  timestamp: Date;
}

export interface LocationShare {
  userId: string;
  userName: string;
  storeId: string;
  storeName: string;
  timestamp: Date;
  isActive: boolean;
}

// Analytics & Insights
export interface ShoppingAnalytics {
  metrics: {
    weeklyAverage: number;
    monthlyTrend: 'up' | 'down' | 'stable';
    categoryBreakdown: CategorySpending[];
    personBreakdown: PersonSpending[];
    storeComparison: StoreSpending[];
  };
  insights: {
    unusualSpending: SpendingAlert[];
    savingOpportunities: SavingOpportunity[];
    priceIncreases: PriceIncrease[];
    betterAlternatives: ProductAlternative[];
  };
  reports: {
    monthly: MonthlyReport;
    yearly: YearlyReport;
    taxDeductible: TaxReport;
    healthSpending: HealthReport;
  };
}

export interface CategorySpending {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  itemCount: number;
}

export interface PersonSpending {
  personId: string;
  personName: string;
  amount: number;
  percentage: number;
  categories: string[];
}

export interface StoreSpending {
  store: Store;
  amount: number;
  visits: number;
  averageBasket: number;
  savings: number;
}

export interface SpendingAlert {
  type: 'unusual_category' | 'unusual_amount' | 'budget_exceeded';
  message: string;
  amount: number;
  category?: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SavingOpportunity {
  type: 'switch_store' | 'bulk_buy' | 'generic_brand' | 'seasonal';
  item: string;
  currentCost: number;
  potentialSavings: number;
  action: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PriceIncrease {
  item: string;
  oldPrice: number;
  newPrice: number;
  increasePercentage: number;
  store: string;
  dateDetected: Date;
}

export interface MonthlyReport {
  month: string;
  totalSpent: number;
  categoryBreakdown: CategorySpending[];
  topItems: TopItem[];
  savings: number;
  budgetComparison: number;
}

export interface YearlyReport {
  year: number;
  totalSpent: number;
  monthlyTrends: MonthlyTrend[];
  topCategories: CategorySpending[];
  topStores: StoreSpending[];
  totalSavings: number;
}

export interface TaxReport {
  year: number;
  deductibleCategories: {
    category: string;
    amount: number;
    items: string[];
  }[];
  totalDeductible: number;
}

export interface HealthReport {
  period: string;
  healthyFoodSpending: number;
  organicSpending: number;
  processedFoodSpending: number;
  nutritionScore: number;
  recommendations: string[];
}

export interface TopItem {
  itemName: string;
  quantity: number;
  totalSpent: number;
  averagePrice: number;
}

export interface MonthlyTrend {
  month: string;
  amount: number;
  change: number;
}

// In-Store Features
export interface InStoreMode {
  features: {
    largeButtons: boolean;
    checkOffAnimation: boolean;
    runningTotal: number;
    voiceAdd: boolean;
    cartMode: boolean;
  };
  helpers: {
    aisleMap: boolean;
    itemLocator: boolean;
    priceChecker: boolean;
    substitutesFinder: boolean;
    budgetTracker: number;
  };
  navigation: {
    currentAisle: string;
    nextItems: ShoppingItem[];
    efficientRoute: string[];
    timeEstimate: number;
  };
}

export interface ReceiptScan {
  id: string;
  imageUrl: string;
  scanDate: Date;
  storeDetected?: string;
  totalDetected?: number;
  items: ScannedItem[];
  confidence: number;
  errors: string[];
}

export interface ScannedItem {
  name: string;
  quantity: number;
  price: number;
  confidence: number;
  matched: boolean;
  originalListItem?: string;
}

// Dashboard Integration
export interface ShoppingDashboardWidget {
  activeLists: {
    count: number;
    nextShop?: Date;
    itemsRemaining: number;
    urgentItems: number;
  };
  spending: {
    weekTotal: number;
    monthTotal: number;
    vsLastMonth: number;
    budget: number;
  };
  alerts: {
    priceDrops: PriceAlert[];
    lowStock: StockAlert[];
    expiringCoupons: Coupon[];
    urgentItems: ShoppingItem[];
  };
  quickActions: {
    viewLists: boolean;
    quickAdd: boolean;
    templates: boolean;
    scan: boolean;
  };
}

export interface Coupon {
  id: string;
  title: string;
  description: string;
  discount: number;
  discountType: 'percentage' | 'fixed';
  minimumSpend?: number;
  validFrom: Date;
  validUntil: Date;
  storeId?: string;
  categories: string[];
  isUsed: boolean;
}

// Form Types
export interface ShoppingListFormData {
  listName: string;
  listType: 'grocery' | 'household' | 'clothing' | 'school' | 'other';
  storeId?: string;
  scheduledDate?: Date;
  sharedWith: string[];
}

export interface ShoppingItemFormData {
  itemName: string;
  brand?: string;
  quantity: number;
  unit?: string;
  category: string;
  estimatedPrice?: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  notes?: string;
  personId?: string;
  isRecurring: boolean;
  recurringFrequency?: string;
}

export interface StoreFormData {
  storeName: string;
  storeChain?: string;
  locationAddress?: string;
  locationCoords?: { lat: number; lng: number };
  preferredFor: string[];
  loyaltyCardNumber?: string;
  onlineOrdering: boolean;
  deliveryAvailable: boolean;
  notes?: string;
  openingHours?: OpeningHours;
}

// Export Types
export type ShoppingExportFormat = 'pdf' | 'csv' | 'txt' | 'email';
export type ShoppingExportType = 'shopping-list' | 'spending-report' | 'price-history' | 'receipt';

export interface ShoppingExportOptions {
  format: ShoppingExportFormat;
  type: ShoppingExportType;
  includeImages: boolean;
  includePrices: boolean;
  includeNotes: boolean;
  includeCompleted: boolean;
  groupBy: 'category' | 'aisle' | 'priority' | 'person' | 'none';
}

// API Response Types
export interface ShoppingApiResponse<T> {
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

export interface ShoppingPaginatedResponse<T> extends ShoppingApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Barcode and Scanning
export interface BarcodeData {
  code: string;
  format: string;
  product?: ProductInfo;
}

export interface ProductInfo {
  name: string;
  brand: string;
  category: string;
  image?: string;
  nutritionFacts?: NutritionFacts;
  allergens?: string[];
  ingredients?: string[];
}

export interface NutritionFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

// Search and Filtering
export interface ShoppingSearchCriteria {
  query?: string;
  category?: string;
  store?: string;
  priceRange?: { min: number; max: number };
  priority?: string[];
  assignedTo?: string;
  status?: 'active' | 'completed' | 'all';
  dateRange?: { start: Date; end: Date };
}

export interface ShoppingSortOptions {
  field: 'name' | 'price' | 'priority' | 'category' | 'date' | 'aisle';
  direction: 'asc' | 'desc';
}

// Mobile Features
export interface MobileShoppingFeatures {
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
