# Testing Shopping Lists and Goals Functionality

## Test Environment
- **Family ID**: `cmg741w2h0000ljcb3f6fo19g`
- **Database**: PostgreSQL on Neon (configured via DATABASE_URL env var)

## Fixed Issues

### 1. Shopping Lists Fixed
**Problem**: Shopping lists didn't persist and couldn't add items
**Solution**: Connected ShoppingListManager component to use real API endpoints

### 2. Goals Updates Fixed
**Problem**: Goals were not updating when user tried to update them
**Solution**: Connected GoalsDashboard component to use real API endpoints for create and update operations

## How to Test

### Testing Shopping Lists

1. **Navigate to Shopping Dashboard**
   - Open the app and go to the Shopping section
   - Click on "Lists" tab

2. **Create a New Shopping List**
   - Click "New List" button
   - Fill in:
     - List Name: e.g., "Weekly Groceries"
     - Category: Select from dropdown (Food, Household, etc.)
     - Store Chain: Select a UK store (Tesco, Morrisons, ASDA, Sainsbury's, Lidl, Aldi, Waitrose, Co-op, Iceland, or Custom)
   - Click "Create List"
   - **Expected**: List should appear in the grid and persist after page refresh

3. **Add Items to Shopping List**
   - Click on a shopping list card to open it
   - Click "Add Item" button
   - Fill in:
     - Item Name: e.g., "Organic Bananas"
     - Category: Select from dropdown (Fruit, Vegetables, Dairy, etc.)
     - Estimated Price: e.g., "2.50"
     - Frequency: Optional (weekly, bi-weekly, monthly)
   - Click "Add Item"
   - **Expected**: Item should appear in the list

4. **Toggle Item Completion**
   - Click the checkbox next to an item
   - **Expected**: Item should be marked as completed with strikethrough
   - Click again to toggle back
   - **Expected**: Changes should persist after page refresh

5. **Verify Persistence**
   - Refresh the page (Ctrl+R or Cmd+R)
   - **Expected**: All shopping lists and items should still be there
   - **Expected**: Completion status should be preserved

### Testing Goals

1. **Navigate to Goals Dashboard**
   - Open the app and go to the Goals section

2. **Create a New Goal**
   - Click "+ New Goal" button
   - Fill in the goal form:
     - Title: e.g., "Run 5K in under 25 minutes"
     - Description: e.g., "Improve running speed and endurance"
     - Type: Select "individual" or "family"
     - Participants: Select family members
     - Target Date: Set a future date
   - Click "Save" or "Create Goal"
   - **Expected**: Goal should appear in the goals list

3. **Edit an Existing Goal**
   - Find a goal in the list
   - Click the Edit icon (pencil icon)
   - Modify any fields:
     - Title
     - Description
     - Target Date
     - Participants
   - Click "Save"
   - **Expected**: Changes should be reflected in the goals list
   - **Expected**: Changes should persist after page refresh

4. **Verify Persistence**
   - Refresh the page (Ctrl+R or Cmd+R)
   - **Expected**: All goals should still be there
   - **Expected**: Edited changes should be preserved

## API Endpoints Used

### Shopping Lists
- `GET /api/families/{familyId}/shopping-lists` - Fetch all lists
- `POST /api/families/{familyId}/shopping-lists` - Create new list
- `POST /api/families/{familyId}/shopping-lists/{listId}/items` - Add item to list
- `PATCH /api/shopping-items/{itemId}` - Toggle item completion

### Goals
- `GET /api/families/{familyId}/goals` - Fetch all goals
- `POST /api/families/{familyId}/goals` - Create new goal
- `PUT /api/families/{familyId}/goals/{goalId}` - Update existing goal

## Database Schema

### Shopping Lists Tables
- **shopping_lists**: id, familyId, listName, category, storeChain, customStore, isActive, createdAt
- **shopping_items**: id, listId, itemName, estimatedPrice, category, frequency, personId, isCompleted, completedAt, createdAt

### Goals Tables
- **family_goals**: id, familyId, goalTitle, goalDescription, goalType, targetValue, currentProgress, deadline, participants (JSONB), milestones (JSONB), createdAt, updatedAt

## Common Issues and Troubleshooting

### Issue: "No family ID available" error
**Solution**: Make sure the family database status is set in the store. The familyId should be loaded from the database connection status.

### Issue: Shopping lists not loading
**Check**:
1. Network tab in browser dev tools - is the API call succeeding?
2. Console for any error messages
3. Verify DATABASE_URL environment variable is set correctly

### Issue: Goals not saving
**Check**:
1. Network tab - look for the POST/PUT request
2. Check request payload format matches API expectations
3. Verify response status code (should be 200 or 201)

## Success Criteria

### Shopping Lists
- ✅ Can create new shopping lists
- ✅ Lists persist after page refresh
- ✅ Can add items to lists
- ✅ Items persist after page refresh
- ✅ Can toggle item completion status
- ✅ Completion status persists
- ✅ Store chain dropdown shows UK stores

### Goals
- ✅ Can create new goals
- ✅ Goals persist after page refresh
- ✅ Can edit existing goals
- ✅ Updates persist after page refresh
- ✅ Goal details are saved correctly

## Test Results

Date: [To be filled]
Tester: [To be filled]

### Shopping Lists Test Results
- [ ] Create list - PASS/FAIL
- [ ] Add items - PASS/FAIL
- [ ] Toggle completion - PASS/FAIL
- [ ] Persistence - PASS/FAIL

### Goals Test Results
- [ ] Create goal - PASS/FAIL
- [ ] Edit goal - PASS/FAIL
- [ ] Persistence - PASS/FAIL

## Notes
[Add any additional observations here]
