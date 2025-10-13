# Meals, Shopping & Goals - Complete Implementation Plan

**Date:** October 7, 2025
**Scope:** Full database integration, mock data removal, cross-platform sync, and dashboard updates

---

## 🎯 EXECUTIVE SUMMARY

### Current State
- ✅ **Database Schema**: Complete for all three modules (MealPlan, ShoppingList/Item, FamilyGoal/Achievement)
- ⚠️ **Components**: UI built but using **MOCK DATA**
- ❌ **API Routes**: Missing for Meals & Shopping (only Goals has partial API)
- ❌ **Database Sync**: Not connected to databaseService
- ❌ **Dashboard Integration**: No updates reflected on main Dashboard

### Goal
Transform all three modules from mock-data prototypes to fully functional, database-backed features that:
1. Save all changes to PostgreSQL database
2. Sync across the platform in real-time
3. Update the main Dashboard with live data
4. Match the quality and integration level of Calendar and Budget modules

---

## 📋 DETAILED AUDIT FINDINGS

### 1. MEALS MODULE

#### Current Implementation
**Components Found:**
- `MealsDashboard.tsx` - Main dashboard with mock data
- `MealPlanner.tsx` - Calendar-based meal planning
- `RecipeManager.tsx` - Recipe collection management
- `NutritionTracker.tsx` - Nutrition tracking
- `MealCalendar.tsx`, `RecipeCard.tsx`, `RecipeForm.tsx`, `RecipeImporter.tsx`

**Database Schema (READY):**
```prisma
model MealPlan {
  id                 String    @id @default(cuid())
  familyId           String    @map("family_id")
  mealDate           DateTime  @map("meal_date")
  mealName           String    @map("meal_name")
  proteinSource      String?   @map("protein_source")
  carbohydrateSource String?   @map("carbohydrate_source")
  vegetableSource    String?   @map("vegetable_source")
  estimatedCalories  Int?      @map("estimated_calories")
  mealNotes          String?   @map("meal_notes")
  isEaten            Boolean   @default(false) @map("is_eaten")
  eatenAt            DateTime? @map("eaten_at")
  createdAt          DateTime  @default(now()) @map("created_at")

  family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
}
```

#### Issues Identified
❌ **No API Routes** - Missing: `/api/families/[familyId]/meals/route.ts`
❌ **Mock Data in Component** - Lines 50-62 in MealsDashboard.tsx:
```typescript
const todaysMeals = {
  breakfast: { name: 'Classic Pancakes', time: '8:00 AM', calories: 320 },
  lunch: { name: 'Caesar Salad', time: '12:30 PM', calories: 280 },
  dinner: { name: 'Spaghetti Bolognese', time: '7:00 PM', calories: 450 }
};
```
❌ **Not using databaseService** - No connection to global state
❌ **No Dashboard updates** - Main Dashboard shows no meal data
❌ **Shopping list integration incomplete** - Lines 86-97 show alert() instead of actual integration

---

### 2. SHOPPING MODULE

#### Current Implementation
**Components Found:**
- `ShoppingDashboard.tsx` - Main dashboard with mock data
- `ShoppingListManager.tsx` - List management
- `StoreManager.tsx` - Store preferences
- `PriceTracker.tsx` - Price comparison
- `ShoppingAnalytics.tsx` - Shopping insights

**Database Schema (READY):**
```prisma
model ShoppingList {
  id        String   @id @default(cuid())
  familyId  String   @map("family_id")
  listName  String   @map("list_name")
  category  String   @default("General")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  family Family         @relation(fields: [familyId], references: [id], onDelete: Cascade)
  items  ShoppingItem[]
}

model ShoppingItem {
  id             String    @id @default(cuid())
  listId         String    @map("list_id")
  itemName       String    @map("item_name")
  estimatedPrice Float     @default(0.00) @map("estimated_price")
  category       String    @default("General")
  frequency      String?
  personId       String?   @map("person_id")
  isCompleted    Boolean   @default(false) @map("is_completed")
  completedAt    DateTime? @map("completed_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  list   ShoppingList  @relation(fields: [listId], references: [id], onDelete: Cascade)
  person FamilyMember? @relation(fields: [personId], references: [id])
}
```

#### Issues Identified
❌ **No API Routes** - Missing: `/api/families/[familyId]/shopping-lists/route.ts` and `/api/families/[familyId]/shopping-lists/[listId]/items/route.ts`
❌ **Mock Data in Component** - Lines 72-111 in ShoppingDashboard.tsx:
```typescript
const activeLists = [
  { id: '1', name: 'Weekly Groceries', store: 'Tesco', itemCount: 12, ... },
  { id: '2', name: 'Household Items', store: 'ASDA', itemCount: 6, ... },
  ...
];
```
❌ **Not using databaseService** - No connection to global state
❌ **No Dashboard updates** - Main Dashboard shows no shopping data
🚨 **CRITICAL UX ISSUE**: Store field is free text - should be dropdown with:
  - Tesco
  - Morrisons
  - ASDA
  - Sainsbury's
  - Lidl
  - Aldi
  - Waitrose
  - Co-op
  - Iceland
  - Custom (for other stores)

---

### 3. GOALS MODULE

#### Current Implementation
**Components Found:**
- `GoalsDashboard.tsx` - Main dashboard with mock data
- `GoalForm.tsx` - Goal creation/editing
- `AchievementTracker.tsx` - Achievement display
- `GoalAnalytics.tsx` - Progress analytics

**Database Schema (READY):**
```prisma
model FamilyGoal {
  id              String   @id @default(cuid())
  familyId        String   @map("family_id")
  goalTitle       String   @map("goal_title")
  goalDescription String?  @map("goal_description")
  goalType        String   @map("goal_type") // family, individual
  targetValue     String   @map("target_value")
  currentProgress Int      @default(0) @map("current_progress") // Percentage 0-100
  deadline        DateTime?
  participants    Json     // Array of member IDs
  milestones      Json     // Array of milestone objects
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  family Family @relation(fields: [familyId], references: [id], onDelete: Cascade)
}

model Achievement {
  id                     String   @id @default(cuid())
  familyId               String   @map("family_id")
  personId               String   @map("person_id")
  achievementTitle       String   @map("achievement_title")
  achievementDescription String?  @map("achievement_description")
  category               String
  badgeEmoji             String?  @map("badge_emoji")
  pointsAwarded          Int      @default(0) @map("points_awarded")
  achievedDate           DateTime @default(now()) @map("achieved_date")
  createdAt              DateTime @default(now()) @map("created_at")

  family Family       @relation(fields: [familyId], references: [id], onDelete: Cascade)
  person FamilyMember @relation(fields: [personId], references: [id], onDelete: Cascade)
}
```

#### Issues Identified
✅ **Partial API Route exists** - `/api/families/[familyId]/goals/route.ts` (needs verification)
❌ **Mock Data in Component** - Lines 73-145 in GoalsDashboard.tsx:
```typescript
const familyMembers = [
  { id: 'ade', name: 'Ade', color: '#3B82F6', avatar: '🏃' },
  ...
];

const mockGoals = [
  { id: '1', title: 'Family Fitness Challenge', ... },
  ...
];
```
❌ **Using databaseService partially** - Line 41 imports but doesn't use it properly
❌ **No Dashboard updates** - Main Dashboard shows no goal data

---

## 🚀 PHASE-BY-PHASE IMPLEMENTATION PLAN

### PHASE 1: MEALS MODULE (Days 1-3)

#### Step 1.1: Create API Routes
**File**: `/src/app/api/families/[familyId]/meals/route.ts`

```typescript
// GET - Fetch all meals for a family (with date filtering)
// POST - Create new meal plan
// PUT - Update existing meal
// DELETE - Delete meal
```

**Required Endpoints:**
- `GET /api/families/:familyId/meals?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- `POST /api/families/:familyId/meals`
- `PUT /api/families/:familyId/meals/:mealId`
- `DELETE /api/families/:familyId/meals/:mealId`
- `PATCH /api/families/:familyId/meals/:mealId/mark-eaten`

#### Step 1.2: Update databaseService
**File**: `/src/services/databaseService.ts`

Add methods:
```typescript
interface DatabaseState {
  // ... existing
  mealPlans: MealPlan[];
}

// Add methods:
- loadMealsForDateRange(familyId, startDate, endDate)
- createMeal(familyId, mealData)
- updateMeal(mealId, mealData)
- deleteMeal(mealId)
- markMealAsEaten(mealId)
```

#### Step 1.3: Remove Mock Data from Components
**Files to update:**
- `MealsDashboard.tsx` - Remove lines 50-62 (mock todaysMeals and weekStats)
- `MealPlanner.tsx` - Connect to API via databaseService
- `RecipeManager.tsx` - Connect to API (if using Recipe table)

Replace with:
```typescript
const { mealPlans } = useDatabaseSync();
// Filter and display real data
```

#### Step 1.4: Dashboard Integration
**File**: `/src/components/familyHub/views/DashboardView.tsx`

Add Meals widget:
```typescript
// Display:
- Today's planned meals (Breakfast/Lunch/Dinner)
- This week's meal planning completion (X/21 meals)
- Upcoming meals requiring shopping
```

#### Step 1.5: Shopping List Integration
**File**: `MealsDashboard.tsx` (Quick Action)

Replace alert() with actual functionality:
```typescript
onClick: async () => {
  const ingredients = await generateShoppingListFromMeals(weekMeals);
  await createShoppingList(familyId, 'From Meal Plan', ingredients);
  setActiveView('shopping'); // Navigate to Shopping module
}
```

---

### PHASE 2: SHOPPING MODULE (Days 4-6)

#### Step 2.1: Create API Routes
**Files**:
- `/src/app/api/families/[familyId]/shopping-lists/route.ts`
- `/src/app/api/families/[familyId]/shopping-lists/[listId]/route.ts`
- `/src/app/api/families/[familyId]/shopping-lists/[listId]/items/route.ts`
- `/src/app/api/shopping-items/[itemId]/route.ts`

**Required Endpoints:**
- `GET /api/families/:familyId/shopping-lists`
- `POST /api/families/:familyId/shopping-lists`
- `PUT /api/families/:familyId/shopping-lists/:listId`
- `DELETE /api/families/:familyId/shopping-lists/:listId`
- `GET /api/families/:familyId/shopping-lists/:listId/items`
- `POST /api/families/:familyId/shopping-lists/:listId/items`
- `PUT /api/shopping-items/:itemId`
- `DELETE /api/shopping-items/:itemId`
- `PATCH /api/shopping-items/:itemId/toggle`

#### Step 2.2: Update databaseService
**File**: `/src/services/databaseService.ts`

Add methods:
```typescript
interface DatabaseState {
  // ... existing
  shoppingLists: ShoppingList[];
  shoppingItems: ShoppingItem[];
}

// Add methods:
- loadShoppingLists(familyId)
- createShoppingList(familyId, listData)
- updateShoppingList(listId, listData)
- deleteShoppingList(listId)
- addShoppingItem(listId, itemData)
- updateShoppingItem(itemId, itemData)
- deleteShoppingItem(itemId)
- toggleShoppingItem(itemId)
```

#### Step 2.3: Add Store Dropdown Component
**NEW File**: `/src/components/common/StoreSelector.tsx`

```typescript
const STORE_CHAINS = [
  { value: 'tesco', label: 'Tesco', icon: '🛒' },
  { value: 'morrisons', label: 'Morrisons', icon: '🛒' },
  { value: 'asda', label: 'ASDA', icon: '🛒' },
  { value: 'sainsburys', label: 'Sainsbury\'s', icon: '🛒' },
  { value: 'lidl', label: 'Lidl', icon: '🛒' },
  { value: 'aldi', label: 'Aldi', icon: '🛒' },
  { value: 'waitrose', label: 'Waitrose', icon: '🛒' },
  { value: 'coop', label: 'Co-op', icon: '🛒' },
  { value: 'iceland', label: 'Iceland', icon: '🛒' },
  { value: 'custom', label: 'Other', icon: '📝' }
];

// Dropdown component with search/filter
```

#### Step 2.4: Update ShoppingList Schema (if needed)
**File**: `prisma/schema.prisma`

Add `storeChain` field:
```prisma
model ShoppingList {
  // ... existing fields
  storeChain    String?  @map("store_chain") // tesco, morrisons, asda, etc.
  customStore   String?  @map("custom_store") // For "Other" option
}
```

Run migration:
```bash
npx prisma migrate dev --name add_store_chain_to_shopping_lists
```

#### Step 2.5: Remove Mock Data from Components
**Files to update:**
- `ShoppingDashboard.tsx` - Remove lines 72-155 (mock activeLists and recentPurchases)
- `ShoppingListManager.tsx` - Connect to API via databaseService
- `StoreManager.tsx` - Replace with StoreSelector dropdown
- `PriceTracker.tsx` - Connect to API (if using PriceHistory table)

#### Step 2.6: Dashboard Integration
**File**: `/src/components/familyHub/views/DashboardView.tsx`

Add Shopping widget:
```typescript
// Display:
- Active shopping lists count
- Total items pending (X items across Y lists)
- Estimated total cost
- Next scheduled shopping trip
```

---

### PHASE 3: GOALS MODULE (Days 7-9)

#### Step 3.1: Verify/Complete API Routes
**File**: `/src/app/api/families/[familyId]/goals/route.ts`

Ensure complete CRUD:
- `GET /api/families/:familyId/goals`
- `POST /api/families/:familyId/goals`
- `PUT /api/families/:familyId/goals/:goalId`
- `DELETE /api/families/:familyId/goals/:goalId`
- `PATCH /api/families/:familyId/goals/:goalId/progress` (Update progress)
- `POST /api/families/:familyId/goals/:goalId/milestone` (Add milestone)

**NEW File**: `/src/app/api/families/[familyId]/achievements/route.ts`
- `GET /api/families/:familyId/achievements`
- `POST /api/families/:familyId/achievements`
- `DELETE /api/families/:familyId/achievements/:achievementId`

#### Step 3.2: Update databaseService
**File**: `/src/services/databaseService.ts`

Add methods:
```typescript
interface DatabaseState {
  // ... existing
  familyGoals: FamilyGoal[];
  achievements: Achievement[];
}

// Add methods:
- loadFamilyGoals(familyId)
- createGoal(familyId, goalData)
- updateGoal(goalId, goalData)
- deleteGoal(goalId)
- updateGoalProgress(goalId, progress)
- addGoalMilestone(goalId, milestone)
- loadAchievements(familyId)
- createAchievement(familyId, personId, achievementData)
- deleteAchievement(achievementId)
```

#### Step 3.3: Remove Mock Data from Components
**Files to update:**
- `GoalsDashboard.tsx` - Remove lines 73-145 (mock familyMembers, goalCategories, mockGoals)
- `GoalForm.tsx` - Connect to API via databaseService
- `AchievementTracker.tsx` - Use real achievement data
- `GoalAnalytics.tsx` - Calculate from real goal data

Replace with:
```typescript
const { familyGoals, achievements, familyMembers } = useDatabaseSync();
// Use real data from global state
```

#### Step 3.4: Dashboard Integration
**File**: `/src/components/familyHub/views/DashboardView.tsx`

Add Goals widget:
```typescript
// Display:
- Active goals count (family vs individual)
- Overall progress (average %)
- Recent achievements (last 3)
- Goals approaching deadline
```

---

### PHASE 4: CROSS-MODULE INTEGRATION (Days 10-11)

#### Step 4.1: Meal ↔ Shopping Integration
**Features:**
1. Generate shopping list from weekly meal plan
2. Link shopping items to specific meals
3. Mark ingredients as "purchased" when shopping item completed
4. Shopping completion triggers meal planner update

**Implementation:**
```typescript
// In MealsDashboard.tsx
const handleGenerateShoppingList = async () => {
  const weekMeals = await loadMealsForWeek(selectedWeekStart);
  const ingredients = extractIngredients(weekMeals);
  const newList = await createShoppingList(familyId, {
    listName: `Meal Plan - Week of ${formatDate(selectedWeekStart)}`,
    storeChain: 'tesco',
    items: ingredients.map(ing => ({
      itemName: ing.name,
      estimatedPrice: ing.estimatedPrice,
      category: ing.category,
      linkedMealId: ing.mealId // NEW field to link
    }))
  });

  setActiveView('shopping');
};
```

#### Step 4.2: Goals ↔ Calendar Integration
**Features:**
1. Goals with deadlines appear on Calendar
2. Milestone dates show as calendar events
3. Completing calendar events updates goal progress
4. Goal achievements create calendar "celebration" events

**Implementation:**
```typescript
// When goal created with deadline:
if (goalData.deadline) {
  await createCalendarEvent(familyId, {
    title: `Goal Deadline: ${goalData.goalTitle}`,
    eventDate: goalData.deadline,
    eventType: 'goal-deadline',
    linkedGoalId: newGoal.id // NEW field to link
  });
}
```

#### Step 4.3: Shopping ↔ Budget Integration
**Features:**
1. Shopping list estimated costs appear in Budget forecast
2. Mark shopping list as "completed" creates Budget expense
3. Price tracking updates Budget category limits
4. Budget alerts when shopping list exceeds category limit

**Implementation:**
```typescript
// When shopping list marked complete:
const handleCompleteShoppingList = async (listId: string) => {
  const list = await getShoppingList(listId);
  const totalCost = list.items.reduce((sum, item) => sum + item.estimatedPrice, 0);

  // Create budget expense
  await createExpense(familyId, {
    expenseName: `Shopping: ${list.listName}`,
    amount: totalCost,
    category: 'Food & Groceries',
    paymentDate: new Date(),
    isRecurring: false,
    linkedShoppingListId: listId // NEW field to link
  });

  // Update list status
  await updateShoppingList(listId, { isActive: false, completedAt: new Date() });
};
```

---

### PHASE 5: DASHBOARD & ANALYTICS (Days 12-13)

#### Step 5.1: Main Dashboard Updates
**File**: `/src/components/familyHub/views/DashboardView.tsx`

Add comprehensive widgets:

```typescript
// MEALS WIDGET
<DashboardWidget
  title="Today's Meals"
  icon={<Utensils />}
  metrics={[
    { label: 'Breakfast', value: todayMeals.breakfast?.name || 'Not planned' },
    { label: 'Lunch', value: todayMeals.lunch?.name || 'Not planned' },
    { label: 'Dinner', value: todayMeals.dinner?.name || 'Not planned' }
  ]}
  action={{ label: 'View Meal Plan', onClick: () => setView('meals') }}
/>

// SHOPPING WIDGET
<DashboardWidget
  title="Shopping Lists"
  icon={<ShoppingCart />}
  metrics={[
    { label: 'Active Lists', value: activeListsCount },
    { label: 'Pending Items', value: totalPendingItems },
    { label: 'Est. Cost', value: `£${estimatedTotalCost.toFixed(2)}` }
  ]}
  action={{ label: 'Manage Lists', onClick: () => setView('shopping') }}
/>

// GOALS WIDGET
<DashboardWidget
  title="Family Goals"
  icon={<Target />}
  metrics={[
    { label: 'Active Goals', value: activeGoalsCount },
    { label: 'Avg Progress', value: `${avgProgress}%` },
    { label: 'Recent Achievements', value: recentAchievementsCount }
  ]}
  action={{ label: 'View Goals', onClick: () => setView('goals') }}
/>
```

#### Step 5.2: Analytics Enhancements
**Files:**
- `MealPlanner.tsx` - Add nutrition trends
- `ShoppingAnalytics.tsx` - Add price history charts
- `GoalAnalytics.tsx` - Add progress trends

---

## 🧪 TESTING PLAN

### Phase 1: Unit Tests (Per Module)
```bash
# Create test files:
- meals.test.ts (API routes)
- shopping.test.ts (API routes)
- goals.test.ts (API routes)
- databaseService.meals.test.ts
- databaseService.shopping.test.ts
- databaseService.goals.test.ts
```

### Phase 2: Integration Tests
```typescript
// Test cross-module workflows:
1. Create meal plan → Generate shopping list → Complete shopping → Create budget expense
2. Create goal → Add milestone → Complete milestone → Award achievement
3. Plan meals for week → Check calendar for meal times → Update nutrition tracker
```

### Phase 3: E2E Tests
```typescript
// User journey tests:
1. Family member logs in
2. Plans meals for the week
3. Generates shopping list from meals
4. Completes shopping at Tesco
5. Shopping cost reflects in Budget
6. Meal completion tracked
7. Nutrition goals updated
8. Achievement awarded
9. Dashboard shows all updates
```

---

## 📝 CHECKLIST FOR COMPLETION

### Meals Module
- [ ] Create `/api/families/[familyId]/meals/route.ts`
- [ ] Add meals methods to databaseService
- [ ] Remove mock data from MealsDashboard
- [ ] Connect MealPlanner to API
- [ ] Implement shopping list generation
- [ ] Add Meals widget to Dashboard
- [ ] Test meal CRUD operations
- [ ] Test meal ↔ shopping integration
- [ ] Test dashboard updates

### Shopping Module
- [ ] Create shopping list API routes
- [ ] Create shopping items API routes
- [ ] Add shopping methods to databaseService
- [ ] Create StoreSelector dropdown component
- [ ] Update schema with storeChain field
- [ ] Remove mock data from ShoppingDashboard
- [ ] Connect ShoppingListManager to API
- [ ] Replace store text input with dropdown
- [ ] Add Shopping widget to Dashboard
- [ ] Test shopping list CRUD operations
- [ ] Test item toggle/completion
- [ ] Test shopping ↔ budget integration
- [ ] Test dashboard updates

### Goals Module
- [ ] Verify/complete Goals API routes
- [ ] Create Achievements API routes
- [ ] Add goals methods to databaseService
- [ ] Remove mock data from GoalsDashboard
- [ ] Connect GoalForm to API
- [ ] Connect AchievementTracker to API
- [ ] Add Goals widget to Dashboard
- [ ] Test goal CRUD operations
- [ ] Test achievement creation
- [ ] Test goals ↔ calendar integration
- [ ] Test dashboard updates

### Cross-Platform Integration
- [ ] Meal plan → Shopping list generation working
- [ ] Shopping completion → Budget expense creation working
- [ ] Goal deadlines → Calendar events working
- [ ] All changes reflect on Dashboard immediately
- [ ] Database sync working across all modules
- [ ] No console errors or warnings

---

## 🚨 CRITICAL ISSUES TO FIX

### Priority 1 (Blocking)
1. **No API routes for Meals** - Cannot save any meal data
2. **No API routes for Shopping** - Cannot save any shopping data
3. **Store field is text input** - Must be dropdown (Tesco, Morrisons, etc.)
4. **Mock data everywhere** - Nothing connects to real database

### Priority 2 (Important)
1. **No dashboard integration** - Changes invisible to users
2. **No cross-module links** - Modules work in isolation
3. **Incomplete Goals API** - May be missing endpoints
4. **No budget integration** - Shopping costs don't affect budget

### Priority 3 (Enhancement)
1. **No analytics** - Missing insights and trends
2. **No achievements** - Goals have no rewards
3. **No meal ↔ shopping link** - Manual ingredient entry
4. **No progress tracking** - Can't see improvements over time

---

## 📊 SUCCESS CRITERIA

### Data Persistence
✅ All meals saved to database
✅ All shopping lists saved to database
✅ All goals saved to database
✅ All achievements saved to database

### Cross-Platform Sync
✅ Meals show on Dashboard
✅ Shopping shows on Dashboard
✅ Goals show on Dashboard
✅ Calendar shows goal deadlines
✅ Budget shows shopping costs

### User Experience
✅ Store dropdown working (not text input)
✅ Meal plan generates shopping list
✅ Shopping completion creates expense
✅ Goal completion awards achievement
✅ All changes immediate (no refresh needed)

### Code Quality
✅ Zero mock data in components
✅ All CRUD operations tested
✅ No console errors
✅ TypeScript types correct
✅ API routes follow REST conventions

---

## ⏱️ ESTIMATED TIMELINE

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Meals | 3 days | API + DB integration + Dashboard widget |
| Phase 2: Shopping | 3 days | API + DB integration + Store dropdown + Dashboard widget |
| Phase 3: Goals | 3 days | API completion + DB integration + Dashboard widget |
| Phase 4: Integration | 2 days | Cross-module links working |
| Phase 5: Dashboard | 2 days | All widgets live + Analytics |
| Testing | 2 days | E2E tests passing |
| **TOTAL** | **15 days** | **Fully functional modules** |

---

## 🎯 NEXT STEPS

1. **Review this plan** - Confirm scope and approach
2. **Set up branch** - `git checkout -b feature/meals-shopping-goals-integration`
3. **Start Phase 1** - Begin with Meals API routes
4. **Daily check-ins** - Track progress against checklist
5. **Test as you go** - Don't batch testing at the end

---

**Questions? Ready to start?** 🚀
