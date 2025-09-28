# Family Hub App - Complete Implementation Guide

## Project Overview
Build a comprehensive family management application with dashboard, calendar, budget tracking, meal planning, shopping lists, goals tracking, and family member management.

## Tech Stack Requirements
- **Frontend**: React 18+ with TypeScript
- **State Management**: React hooks (useState, useEffect, useContext)
- **Styling**: Tailwind CSS with custom utilities
- **Icons**: Lucide React icon library
- **Charts**: Recharts library for data visualization
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with session management

## Code Style & Naming Conventions

### Naming Standards
- **React Components**: PascalCase (`FamilyDashboard.tsx`, `CalendarView.tsx`)
- **JavaScript variables/functions**: camelCase (`currentView`, `handleEventSubmit`)
- **Database tables/columns**: snake_case (`family_members`, `calendar_events`, `created_at`)
- **API routes**: kebab-case (`/api/family-members`, `/api/calendar-events`)
- **CSS classes**: Tailwind utility classes (lowercase with hyphens)

### File Organization
```
src/
├── components/
│   ├── common/           # Reusable UI components
│   ├── dashboard/        # Dashboard-specific components
│   ├── calendar/         # Calendar components
│   ├── budget/           # Budget management components
│   ├── meals/            # Meal planning components
│   ├── shopping/         # Shopping list components
│   └── forms/            # Modal forms and inputs
├── hooks/                # Custom React hooks
├── services/             # API service functions
├── types/                # TypeScript type definitions
├── utils/                # Helper functions
├── contexts/             # React context providers
└── assets/               # Static files and images
```

## Database Schema Requirements

### Core Tables
```sql
-- families table
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name VARCHAR(255) NOT NULL,
    family_code VARCHAR(10) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- family_members table
CREATE TABLE family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL,
    age_group VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL,     -- Hex color code
    icon VARCHAR(10) NOT NULL,     -- Emoji icon
    fitness_goals JSONB,           -- Store fitness goals as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- calendar_events table
CREATE TABLE calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    person_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    location VARCHAR(255),
    cost DECIMAL(10,2) DEFAULT 0.00,
    event_type VARCHAR(50) NOT NULL,
    recurring_pattern VARCHAR(50) DEFAULT 'none',
    is_recurring BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- budget_income table
CREATE TABLE budget_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    person_id UUID REFERENCES family_members(id),
    income_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    is_recurring BOOLEAN DEFAULT TRUE,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- budget_expenses table
CREATE TABLE budget_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    person_id UUID REFERENCES family_members(id),
    expense_name VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    budget_limit DECIMAL(12,2),
    is_recurring BOOLEAN DEFAULT TRUE,
    payment_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- meal_plans table
CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    meal_name VARCHAR(255) NOT NULL,
    protein_source VARCHAR(100),
    carbohydrate_source VARCHAR(100),
    vegetable_source VARCHAR(100),
    estimated_calories INTEGER,
    meal_notes TEXT,
    is_eaten BOOLEAN DEFAULT FALSE,
    eaten_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- shopping_lists table
CREATE TABLE shopping_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    list_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- shopping_items table
CREATE TABLE shopping_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    estimated_price DECIMAL(8,2) DEFAULT 0.00,
    category VARCHAR(100) DEFAULT 'General',
    frequency VARCHAR(50),        -- weekly, monthly, etc.
    person_id UUID REFERENCES family_members(id),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- family_goals table
CREATE TABLE family_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    goal_title VARCHAR(255) NOT NULL,
    goal_description TEXT,
    goal_type VARCHAR(50) NOT NULL,      -- family, individual
    target_value VARCHAR(255),
    current_progress INTEGER DEFAULT 0,  -- Percentage 0-100
    deadline DATE,
    participants JSONB,                  -- Array of member IDs
    milestones JSONB,                    -- Array of milestone objects
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- achievements table
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    person_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    achievement_title VARCHAR(255) NOT NULL,
    achievement_description TEXT,
    category VARCHAR(100) NOT NULL,
    badge_emoji VARCHAR(10),
    points_awarded INTEGER DEFAULT 0,
    achieved_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- fitness_tracking table
CREATE TABLE fitness_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES family_members(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    intensity_level VARCHAR(50) NOT NULL,
    activity_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Route Structure

### Authentication Routes
```
POST   /api/auth/register        # Register new family/user
POST   /api/auth/login           # Login with credentials
POST   /api/auth/logout          # Logout and clear session
GET    /api/auth/me              # Get current user info
POST   /api/auth/refresh         # Refresh JWT token
```

### Family Management Routes
```
GET    /api/families/:familyId/members        # Get all family members
POST   /api/families/:familyId/members        # Add new family member
PUT    /api/families/:familyId/members/:id    # Update family member
DELETE /api/families/:familyId/members/:id    # Delete family member
```

### Calendar Event Routes
```
GET    /api/families/:familyId/events                    # Get all events
POST   /api/families/:familyId/events                    # Create new event
PUT    /api/families/:familyId/events/:eventId           # Update event
DELETE /api/families/:familyId/events/:eventId           # Delete event
GET    /api/families/:familyId/events/month/:year/:month # Get events by month
GET    /api/families/:familyId/events/week/:date         # Get events by week
GET    /api/families/:familyId/events/day/:date          # Get events by day
```

### Budget Management Routes
```
GET    /api/families/:familyId/budget/overview           # Get budget overview
GET    /api/families/:familyId/budget/income             # Get all income
POST   /api/families/:familyId/budget/income             # Add income
PUT    /api/families/:familyId/budget/income/:id         # Update income
DELETE /api/families/:familyId/budget/income/:id         # Delete income
GET    /api/families/:familyId/budget/expenses           # Get all expenses  
POST   /api/families/:familyId/budget/expenses           # Add expense
PUT    /api/families/:familyId/budget/expenses/:id       # Update expense
DELETE /api/families/:familyId/budget/expenses/:id       # Delete expense
```

### Meal Planning Routes
```
GET    /api/families/:familyId/meals                     # Get meal plans
POST   /api/families/:familyId/meals                     # Create meal plan
PUT    /api/families/:familyId/meals/:id                 # Update meal plan
DELETE /api/families/:familyId/meals/:id                 # Delete meal plan
POST   /api/families/:familyId/meals/:id/mark-eaten      # Mark meal as eaten
GET    /api/families/:familyId/meals/components          # Get meal components
```

### Shopping Lists Routes
```
GET    /api/families/:familyId/shopping-lists            # Get all lists
POST   /api/families/:familyId/shopping-lists            # Create new list
PUT    /api/families/:familyId/shopping-lists/:listId    # Update list
DELETE /api/families/:familyId/shopping-lists/:listId    # Delete list
GET    /api/families/:familyId/shopping-lists/:listId/items    # Get list items
POST   /api/families/:familyId/shopping-lists/:listId/items    # Add item
PUT    /api/shopping-items/:itemId                       # Update item
DELETE /api/shopping-items/:itemId                       # Delete item
PATCH  /api/shopping-items/:itemId/toggle                # Toggle completion
```

### Goals & Achievement Routes
```
GET    /api/families/:familyId/goals                     # Get all goals
POST   /api/families/:familyId/goals                     # Create new goal
PUT    /api/families/:familyId/goals/:goalId             # Update goal
DELETE /api/families/:familyId/goals/:goalId             # Delete goal
POST   /api/families/:familyId/goals/:goalId/milestone   # Add milestone
GET    /api/families/:familyId/achievements              # Get achievements
POST   /api/families/:familyId/achievements              # Create achievement
```

### Fitness Tracking Routes
```
GET    /api/families/:familyId/fitness/:personId         # Get person's fitness data
POST   /api/families/:familyId/fitness/:personId         # Log fitness activity
PUT    /api/families/:familyId/fitness/:activityId       # Update activity
DELETE /api/families/:familyId/fitness/:activityId       # Delete activity
```

## Component Architecture Requirements

### Main App Structure
```typescript
// Main app component structure
const FamilyHubApp = () => {
  // Core state management
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [currentFamily, setCurrentFamily] = useState<Family | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  
  // View-specific states
  const [calendarView, setCalendarView] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  
  // Modal states
  const [showEventForm, setShowEventForm] = useState<boolean>(false);
  const [showMealForm, setShowMealForm] = useState<boolean>(false);
  // ... other modal states
};
```

### Required React Components
```typescript
// Core layout components
- DashboardView: Main overview with key metrics and summaries
- CalendarView: Event management with month/week/day views
- BudgetView: Income/expense tracking with visualizations
- MealsView: Meal planning with component system
- ShoppingView: Shopping lists with templates and tracking
- FamilyView: Family member management
- GoalsView: Goals and achievement tracking
- NewsView: Family and local news aggregation

// Shared UI components
- DashboardWidget: Reusable card container with header/content
- Modal: Base modal component for forms
- DatePicker: Custom date selection component
- ColorPicker: Color selection for family members
- IconPicker: Emoji/icon selection component
- ProgressBar: Progress visualization component
- ChartContainer: Wrapper for chart components

// Form components
- EventForm: Create/edit calendar events
- MealForm: Plan meals with component selection
- BudgetForm: Add income/expense items
- ShoppingForm: Add shopping items
- FamilyMemberForm: Create/edit family members
- GoalForm: Create/edit family goals
```

## State Management Architecture

### Context Providers Required
```typescript
// Family context for global family data
interface FamilyContextType {
  currentFamily: Family | null;
  familyMembers: FamilyMember[];
  updateFamilyMember: (id: string, data: Partial<FamilyMember>) => void;
  deleteFamilyMember: (id: string) => void;
}

// Calendar context for event management
interface CalendarContextType {
  events: CalendarEvent[];
  currentDate: Date;
  calendarView: 'month' | 'week' | 'day';
  setCalendarView: (view: 'month' | 'week' | 'day') => void;
  addEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
}

// Budget context for financial data
interface BudgetContextType {
  budgetData: BudgetData;
  addIncome: (income: IncomeItem) => void;
  addExpense: (expense: ExpenseItem) => void;
  calculateTotals: () => BudgetTotals;
}
```

### TypeScript Type Definitions
```typescript
interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  role: 'Parent' | 'Student' | 'Family Member';
  ageGroup: 'Toddler' | 'Preschool' | 'Child' | 'Teen' | 'Adult';
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

interface CalendarEvent {
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
}

interface BudgetItem {
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

interface MealPlan {
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

interface ShoppingList {
  id: string;
  familyId: string;
  name: string;
  category: string;
  items: ShoppingItem[];
  isActive: boolean;
  createdAt: string;
}

interface ShoppingItem {
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

interface FamilyGoal {
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

interface Achievement {
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
```

## UI/UX Requirements

### Design System
- **Color Palette**: Tailwind's default palette with custom family member colors
- **Typography**: Inter font family with font weights 300, 400, 500, 600, 700
- **Spacing**: Consistent 4px grid system (p-1, p-2, p-4, p-6, p-8)
- **Border Radius**: Consistent rounded-lg (8px) for cards, rounded-xl (12px) for modals
- **Shadows**: Subtle drop shadows using Tailwind's shadow utilities

### Responsive Design
- **Mobile First**: Design for mobile screens (320px+)
- **Tablet Support**: Optimize for iPad-sized screens (768px+)
- **Desktop**: Full feature set for desktop screens (1024px+)
- **Grid System**: Use CSS Grid and Flexbox for layouts

### Interactive Elements
- **Buttons**: Consistent hover states with 0.2s transition
- **Forms**: Focus states with ring-2 ring-{color}-500
- **Cards**: Hover elevation with subtle shadow increase
- **Animations**: Smooth transitions for all state changes

## Data Validation Rules

### Input Validation
```typescript
// Event validation
const eventValidation = {
  title: { required: true, minLength: 1, maxLength: 255 },
  date: { required: true, format: 'YYYY-MM-DD', futureOnly: false },
  time: { required: true, format: 'HH:MM' },
  duration: { required: true, min: 15, max: 1440 },  // 15 min to 24 hours
  cost: { min: 0, max: 10000, precision: 2 }
};

// Family member validation
const memberValidation = {
  name: { required: true, minLength: 1, maxLength: 255 },
  role: { required: true, enum: ['Parent', 'Student', 'Family Member'] },
  ageGroup: { required: true, enum: ['Toddler', 'Preschool', 'Child', 'Teen', 'Adult'] },
  color: { required: true, format: /^#[0-9A-Fa-f]{6}$/ },
  icon: { required: true, minLength: 1, maxLength: 10 }
};

// Budget validation  
const budgetValidation = {
  name: { required: true, minLength: 1, maxLength: 255 },
  amount: { required: true, min: 0.01, max: 1000000, precision: 2 },
  category: { required: true, minLength: 1, maxLength: 100 }
};
```

### Business Logic Rules
```typescript
// Calendar business rules
- Events cannot overlap for the same person
- Recurring events must have valid recurrence patterns
- Event end time must be after start time
- Maximum 10 events per day per person

// Budget business rules
- Total expenses cannot exceed total income by more than 20%
- Budget alerts when spending exceeds category limits
- Recurring items must have valid frequency (monthly, weekly, etc.)

// Meal planning rules
- Only one meal can be planned per date
- Meals can only be marked as eaten on or after the planned date
- Required at least one component (protein, carb, or vegetable)

// Shopping list rules
- Items must have unique names within a list
- Price must be non-negative
- Lists can have maximum 100 items each

// Goals rules
- Progress must be between 0-100%
- Deadline must be in the future for new goals
- Individual goals must have exactly one participant
- Family goals must have 2+ participants
```

## Performance Requirements

### Frontend Optimization
```typescript
// Use React.memo for expensive components
const DashboardWidget = React.memo(({ title, children, action }) => {
  // Component implementation
});

// Implement virtual scrolling for large lists
const VirtualizedEventList = ({ events }) => {
  // Use react-window or similar for 100+ items
};

// Debounce search inputs
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  // Debounce implementation
};

// Lazy load route components
const CalendarView = lazy(() => import('./components/CalendarView'));
const BudgetView = lazy(() => import('./components/BudgetView'));
```

### Backend Optimization
```sql
-- Required database indexes
CREATE INDEX idx_events_family_date ON calendar_events(family_id, event_date);
CREATE INDEX idx_events_person_date ON calendar_events(person_id, event_date);
CREATE INDEX idx_budget_family_type ON budget_expenses(family_id, is_recurring);
CREATE INDEX idx_shopping_list_active ON shopping_lists(family_id, is_active);
CREATE INDEX idx_goals_family_progress ON family_goals(family_id, current_progress);

-- Query optimization requirements
- Use SELECT with specific columns, avoid SELECT *
- Implement pagination for lists with 50+ items
- Use prepared statements for repeated queries
- Cache frequently accessed data (family members, budget totals)
```

## Security Requirements

### Authentication & Authorization
```typescript
// JWT token requirements
interface JWTPayload {
  userId: string;
  familyId: string;
  role: string;
  exp: number;
}

// Route protection middleware
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JWTPayload;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Family access validation
const requireFamilyAccess = async (req: Request, res: Response, next: NextFunction) => {
  const { familyId } = req.params;
  if (req.user.familyId !== familyId) {
    return res.status(403).json({ error: 'Access denied to this family' });
  }
  next();
};
```

### Data Protection
```typescript
// Input sanitization
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// SQL injection prevention
const queries = {
  getEvents: 'SELECT * FROM calendar_events WHERE family_id = $1 AND event_date >= $2',
  createEvent: 'INSERT INTO calendar_events (family_id, title, event_date) VALUES ($1, $2, $3) RETURNING *'
};

// Rate limiting
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
```

## Deployment Requirements

### Environment Variables
```bash
# Database configuration
DATABASE_URL=postgresql://username:password@localhost:5432/family_hub
DATABASE_POOL_SIZE=20

# JWT configuration  
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# API configuration
PORT=3001
NODE_ENV=production
API_BASE_URL=https://api.yourdomain.com

# External services (if needed)
NEWS_API_KEY=your-news-api-key
WEATHER_API_KEY=your-weather-api-key
```

### Build & Development Commands
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint . --ext .ts,.tsx",
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts"
  }
}
```

## Testing Requirements

### Unit Tests
```typescript
// Component testing with React Testing Library
describe('DashboardWidget', () => {
  test('renders title and children correctly', () => {
    render(
      <DashboardWidget title="Test Widget">
        <div>Test content</div>
      </DashboardWidget>
    );
    expect(screen.getByText('Test Widget')).toBeInTheDocument();
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});

// API endpoint testing
describe('GET /api/families/:id/events', () => {
  test('returns family events when authenticated', async () => {
    const response = await request(app)
      .get('/api/families/test-family-id/events')
      .set('Authorization', `Bearer ${validToken}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('events');
  });
});
```

### Integration Tests
```typescript
// End-to-end user flows
describe('Event Management Flow', () => {
  test('user can create, edit, and delete events', async () => {
    // Test complete event lifecycle
    // 1. Login as family member
    // 2. Navigate to calendar
    // 3. Create new event
    // 4. Verify event appears in calendar
    // 5. Edit event details
    // 6. Delete event
    // 7. Verify event is removed
  });
});
```

## Key Implementation Notes

1. **Start with Core Features**: Implement in this order - authentication, family management, calendar, budget, then additional features
2. **Mobile Responsive**: Ensure all components work well on mobile devices from the start
3. **Data Consistency**: Always validate data on both client and server side
4. **Error Handling**: Implement comprehensive error handling with user-friendly messages
5. **Loading States**: Show loading indicators for all async operations
6. **Offline Support**: Consider implementing service workers for basic offline functionality
7. **Performance**: Use React.memo, useMemo, and useCallback appropriately to prevent unnecessary re-renders
8. **Accessibility**: Include proper ARIA labels, keyboard navigation, and screen reader support
9. **Real-time Updates**: Consider WebSocket integration for live updates across family members
10. **Data Export**: Allow families to export their data (calendar, budget, etc.) in common formats

Remember to test thoroughly on multiple devices and browsers before deployment. Focus on creating a smooth, intuitive user experience that makes family coordination easier and more enjoyable.