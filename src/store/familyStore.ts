import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalendarEvent, EventTemplate } from '@/types/calendar.types';
import { FamilyMember } from '@/types';

// =================================================================
// TYPE DEFINITIONS
// =================================================================

export interface BudgetData {
  income: {
    monthly: Record<string, any>;
    oneTime: any[];
  };
  expenses: {
    recurringMonthly: Record<string, any>;
    oneTimeSpends: any[];
  };
  priorMonths: Record<string, any>;
  budgetLimits: Record<string, number>;
  actualSpend: Record<string, number>;
}

export interface MealPlanning {
  planned: Record<string, any>;
  eaten: Record<string, any>;
  components: {
    proteins: string[];
    grains: string[];
    carbs: string[];
    vegetables: string[];
  };
  favorites: any[];
}

export interface ShoppingList {
  id: string;
  name: string;
  category: string;
  items: any[];
  total: number;
  estimatedTotal: number;
  lastWeekSpent: number;
  avgWeeklySpend: number;
}

export interface GoalsData {
  familyGoals: any[];
  individualGoals: any[];
  achievements: any[];
  rewardSystem: {
    points: Record<string, number>;
    badges: Record<string, string[]>;
  };
}

// =================================================================
// SLICE DEFINITIONS
// =================================================================

interface PeopleSlice {
  people: FamilyMember[];
  setPeople: (people: FamilyMember[]) => void;
  addPerson: (person: FamilyMember) => void;
  updatePerson: (id: string, updates: Partial<FamilyMember>) => void;
  deletePerson: (id: string) => void;
}

interface CalendarSlice {
  events: CalendarEvent[];
  eventTemplates: EventTemplate[];
  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  setEventTemplates: (templates: EventTemplate[]) => void;
  addEventTemplate: (template: EventTemplate) => void;
  updateEventTemplate: (id: string, updates: Partial<EventTemplate>) => void;
  deleteEventTemplate: (id: string) => void;
}

interface ViewSlice {
  currentView: string;
  currentSubView: string;
  calendarView: 'month' | 'week' | 'day';
  currentDate: Date;
  selectedPerson: string;
  setCurrentView: (view: string) => void;
  setCurrentSubView: (subView: string) => void;
  setCalendarView: (view: 'month' | 'week' | 'day') => void;
  setCurrentDate: (date: Date) => void;
  setSelectedPerson: (personId: string) => void;
}

interface BudgetSlice {
  budgetData: BudgetData | null;
  setBudgetData: (data: BudgetData) => void;
  updateBudgetData: (updates: Partial<BudgetData>) => void;
}

export interface MealPlanningSlice {
  mealPlanning: MealPlanning | null;
  setMealPlanning: (data: MealPlanning) => void;
  updateMealPlanning: (updates: Partial<MealPlanning>) => void;
}

interface ShoppingSlice {
  shoppingLists: ShoppingList[];
  setShoppingLists: (lists: ShoppingList[]) => void;
  addShoppingList: (list: ShoppingList) => void;
  updateShoppingList: (id: string, updates: Partial<ShoppingList>) => void;
  deleteShoppingList: (id: string) => void;
}

interface GoalsSlice {
  goalsData: GoalsData | null;
  setGoalsData: (data: GoalsData) => void;
  updateGoalsData: (updates: Partial<GoalsData>) => void;
}

interface DatabaseSlice {
  databaseStatus: {
    connected: boolean;
    familyId: string | null;
    mode: string;
  };
  setDatabaseStatus: (status: { connected: boolean; familyId: string | null; mode: string }) => void;
}

// Combined state
export type FamilyState = PeopleSlice & CalendarSlice & ViewSlice & BudgetSlice & MealPlanningSlice & ShoppingSlice & GoalsSlice & DatabaseSlice;

// =================================================================
// SLICE CREATORS
// =================================================================

const createPeopleSlice: StateCreator<FamilyState, [], [], PeopleSlice> = (set) => ({
  people: [],
  setPeople: (people) => set({ people }),
  addPerson: (person) => set((state) => ({ people: [...state.people, person] })),
  updatePerson: (id, updates) =>
    set((state) => ({
      people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deletePerson: (id) =>
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
    })),
});

const createCalendarSlice: StateCreator<FamilyState, [], [], CalendarSlice> = (set) => ({
  events: [],
  eventTemplates: [],
  setEvents: (events) => set({ events }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (id, updates) =>
    set((state) => ({
      events: state.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    })),
  deleteEvent: (id) =>
    set((state) => ({
      events: state.events.filter((e) => e.id !== id),
    })),
  setEventTemplates: (templates) => set({ eventTemplates: templates }),
  addEventTemplate: (template) =>
    set((state) => ({ eventTemplates: [...state.eventTemplates, template] })),
  updateEventTemplate: (id, updates) =>
    set((state) => ({
      eventTemplates: state.eventTemplates.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    })),
  deleteEventTemplate: (id) =>
    set((state) => ({
      eventTemplates: state.eventTemplates.filter((t) => t.id !== id),
    })),
});

const createViewSlice: StateCreator<FamilyState, [], [], ViewSlice> = (set) => ({
  currentView: 'dashboard',
  currentSubView: '',
  calendarView: 'month',
  currentDate: new Date(), // Fix 5: Default to current date instead of hardcoded 2025
  selectedPerson: 'all',
  setCurrentView: (view) => set({ currentView: view, currentSubView: '' }),
  setCurrentSubView: (subView) => set({ currentSubView: subView }),
  setCalendarView: (view) => set({ calendarView: view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedPerson: (personId) => set({ selectedPerson: personId }),
});

const createBudgetSlice: StateCreator<FamilyState, [], [], BudgetSlice> = (set) => ({
  budgetData: {
    income: {
      monthly: {
        salary1: { name: 'Salary 1', amount: 4500, category: 'Salary', person: 'member-1' },
        salary2: { name: 'Salary 2', amount: 3800, category: 'Salary', person: 'member-2' },
        child_benefit: { name: 'Child Benefit', amount: 145, category: 'Government', person: 'all' }
      },
      oneTime: [
        { id: 'income1', name: 'Freelance Project', amount: 1200, date: '2025-08-15', category: 'Freelance', person: 'ade' }
      ]
    },
    expenses: {
      recurringMonthly: {
        household: {
          mortgage: { name: 'Mortgage (Halifax)', amount: 3500, category: 'Essential', budgetLimit: 3500 },
          councilTax: { name: 'Council Tax', amount: 146, category: 'Essential', budgetLimit: 150 },
          utilities: { name: 'Energy (Octopus)', amount: 319, category: 'Essential', budgetLimit: 350 },
          water: { name: 'Water', amount: 100, category: 'Essential', budgetLimit: 120 }
        },
        children: {
          childcare1: { name: 'Afterschool Care', amount: 346.50, person: 'member-4', category: 'Childcare', budgetLimit: 400 },
          childcare2: { name: 'Nursery', amount: 1216.92, person: 'member-3', category: 'Childcare', budgetLimit: 1300 },
          amariGerman: { name: 'German Classes', amount: 140, person: 'amari', category: 'Education', budgetLimit: 150 },
          amariSwimming: { name: 'Swimming Lessons', amount: 36, person: 'amari', category: 'Sports', budgetLimit: 40 },
          amariFootball: { name: 'Football Training', amount: 43, person: 'amari', category: 'Sports', budgetLimit: 50 },
          amariDrama: { name: 'Drama Classes', amount: 35, person: 'amari', category: 'Education', budgetLimit: 40 }
        },
        subscriptions: {
          netflix: { name: 'Netflix', amount: 15.99, category: 'Entertainment', budgetLimit: 20 },
          spotify: { name: 'Spotify Family', amount: 14.99, category: 'Entertainment', budgetLimit: 20 }
        }
      },
      oneTimeSpends: [
        { id: 'spend1', name: 'School Books', amount: 85.50, date: '2025-08-01', category: 'Education', person: 'amari' },
        { id: 'spend2', name: 'Football Boots', amount: 65.00, date: '2025-08-02', category: 'Sports', person: 'amari' }
      ]
    },
    priorMonths: {
      '2025-07': { totalIncome: 8345, totalExpenses: 6180, netIncome: 2165, categories: { household: 4065, children: 1817, subscriptions: 31, oneTime: 267 } },
      '2025-06': { totalIncome: 8445, totalExpenses: 6350, netIncome: 2095, categories: { household: 4065, children: 1854, subscriptions: 31, oneTime: 400 } }
    },
    budgetLimits: { groceries: 600, entertainment: 200, clothing: 300, miscellaneous: 150, dining: 250 },
    actualSpend: { groceries: 487.32, entertainment: 156.78, clothing: 89.99, miscellaneous: 234.50, dining: 180.25 }
  },
  setBudgetData: (data) => set({ budgetData: data }),
  updateBudgetData: (updates) =>
    set((state) => ({
      budgetData: state.budgetData ? { ...state.budgetData, ...updates } : null,
    })),
});

const createMealPlanningSlice: StateCreator<FamilyState, [], [], MealPlanningSlice> = (set) => ({
  mealPlanning: {
    planned: {
      '2025-08-31': { name: 'Chicken & Rice Bowl', protein: 'Chicken Breast', carb: 'Rice', veg: 'Broccoli', calories: 450, notes: 'Family favorite' },
      '2025-09-01': { name: 'Salmon Pasta', protein: 'Salmon', carb: 'Pasta', veg: 'Spinach', calories: 520, notes: 'Sunday special' },
      '2025-09-03': { name: 'Beef Stir Fry', protein: 'Beef Mince', carb: 'Noodles', veg: 'Bell Peppers', calories: 480, notes: 'Quick weeknight meal' }
    },
    eaten: {
      '2025-08-30': { name: 'Turkey Sandwich', protein: 'Turkey', carb: 'Bread', veg: 'Cucumber', calories: 350, eatenDate: '2025-08-30T12:00:00' }
    },
    components: {
      proteins: ['Chicken Breast', 'Salmon', 'Beef Mince', 'Tofu', 'Eggs', 'Turkey', 'Lamb', 'Prawns', 'Tuna', 'Chickpeas'],
      grains: ['Rice', 'Pasta', 'Quinoa', 'Couscous', 'Bulgur', 'Barley', 'Noodles', 'Bread'],
      carbs: ['Sweet Potato', 'Regular Potato', 'Pasta', 'Rice', 'Bread', 'Wraps'],
      vegetables: ['Broccoli', 'Carrots', 'Spinach', 'Bell Peppers', 'Tomatoes', 'Cucumber', 'Onions', 'Mushrooms']
    },
    favorites: [
      { name: 'Chicken & Rice Bowl', protein: 'Chicken Breast', carb: 'Rice', veg: 'Broccoli', calories: 450 },
      { name: 'Salmon Pasta', protein: 'Salmon', carb: 'Pasta', veg: 'Spinach', calories: 520 }
    ]
  },
  setMealPlanning: (data) => set({ mealPlanning: data }),
  updateMealPlanning: (updates) =>
    set((state) => ({
      mealPlanning: state.mealPlanning ? { ...state.mealPlanning, ...updates } : null,
    })),
});

const createShoppingSlice: StateCreator<FamilyState, [], [], ShoppingSlice> = (set) => ({
  shoppingLists: [
    {
      id: '1', name: 'Weekly Groceries', category: 'Food',
      items: [
        { id: 'item1', name: 'Chicken Breast', completed: false, price: 6.99, category: 'Protein', frequency: 'weekly' },
        { id: 'item2', name: 'Broccoli', completed: false, price: 2.50, category: 'Vegetables', frequency: 'weekly' },
        { id: 'item3', name: 'Rice', completed: true, price: 3.99, category: 'Grains', frequency: 'bi-weekly' },
        { id: 'item4', name: 'Milk', completed: false, price: 1.85, category: 'Dairy', frequency: 'twice-weekly' },
        { id: 'item5', name: 'Bread', completed: true, price: 1.20, category: 'Bakery', frequency: 'weekly' }
      ],
      total: 5.19, estimatedTotal: 16.53, lastWeekSpent: 18.42, avgWeeklySpend: 19.65
    },
    {
      id: '2', name: 'Sports Equipment', category: 'Activities',
      items: [
        { id: 'item6', name: 'Football boots', completed: false, price: 45.00, category: 'Sports', person: 'amari', frequency: 'annual' },
        { id: 'item7', name: 'Swimming goggles', completed: false, price: 12.99, category: 'Sports', person: 'askia', frequency: 'bi-annual' }
      ],
      total: 0, estimatedTotal: 57.99, lastWeekSpent: 0, avgWeeklySpend: 8.50
    },
  ],
  setShoppingLists: (lists) => set({ shoppingLists: lists }),
  addShoppingList: (list) =>
    set((state) => ({ shoppingLists: [...state.shoppingLists, list] })),
  updateShoppingList: (id, updates) =>
    set((state) => ({
      shoppingLists: state.shoppingLists.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      ),
    })),
  deleteShoppingList: (id) =>
    set((state) => ({
      shoppingLists: state.shoppingLists.filter((l) => l.id !== id),
    })),
});

const createGoalsSlice: StateCreator<FamilyState, [], [], GoalsSlice> = (set) => ({
  goalsData: {
    familyGoals: [
      {
        id: 'fg1', title: 'Family Fitness Challenge', description: 'Each member achieves weekly fitness targets',
        progress: 65, target: 100, deadline: '2025-12-31', participants: ['ade', 'angela', 'amari', 'askia'],
        milestones: [
          { date: '2025-08-20', achievement: 'Ade reached 10K steps 5 days running', person: 'ade' },
          { date: '2025-08-25', achievement: 'Amari completed first 5K run', person: 'amari' }
        ]
      }
    ],
    individualGoals: [
      { id: 'ig1', person: 'ade', title: 'Sub-22 minute 5K', progress: 78, current: '22:45', target: '22:00', deadline: '2025-10-31', category: 'fitness' },
      { id: 'ig2', person: 'amari', title: 'Score 10 goals this season', progress: 30, current: 3, target: 10, deadline: '2025-12-20', category: 'sport' }
    ],
    achievements: [
      { id: 'ach1', person: 'amari', title: 'First Goal Scorer', description: 'Scored first goal of the season', date: '2025-08-15', category: 'sport', badge: '⚽' }
    ],
    rewardSystem: {
      points: { ade: 850, angela: 720, amari: 1200, askia: 900 },
      badges: {
        ade: ['🏋️', '🏃', '💪'],
        angela: ['📚', '💼', '🎯'],
        amari: ['⚽', '🎭', '🇩🇪'],
        askia: ['🏊', '🎨', '🌟']
      }
    }
  },
  setGoalsData: (data) => set({ goalsData: data }),
  updateGoalsData: (updates) =>
    set((state) => ({
      goalsData: state.goalsData ? { ...state.goalsData, ...updates } : null,
    })),
});

const createDatabaseSlice: StateCreator<FamilyState, [], [], DatabaseSlice> = (set) => ({
  databaseStatus: {
    connected: false,
    familyId: null,
    mode: 'localStorage',
  },
  setDatabaseStatus: (status) => set({ databaseStatus: status }),
});

// =================================================================
// STORE CREATION
// =================================================================

export const useFamilyStore = create<FamilyState>()(
  persist(
    (...a) => ({
      ...createPeopleSlice(...a),
      ...createCalendarSlice(...a),
      ...createViewSlice(...a),
      ...createBudgetSlice(...a),
      ...createMealPlanningSlice(...a),
      ...createShoppingSlice(...a),
      ...createGoalsSlice(...a),
      ...createDatabaseSlice(...a),
    }),
    {
      name: 'family-storage',
      version: 2, // Increment this to clear old cache
      partialize: (state) => ({
        people: state.people,
        events: state.events,
        eventTemplates: state.eventTemplates,
        budgetData: state.budgetData,
        mealPlanning: state.mealPlanning,
        shoppingLists: state.shoppingLists,
        goalsData: state.goalsData,
      }),
      migrate: (persistedState: any, version: number) => {
        // If migrating from version 1 or earlier, clear old data and return fresh state
        if (version < 2) {
          console.log('Migrating from version', version, 'to version 2 - clearing old cache');
          return {} as any; // Return empty state to force fresh load from database
        }
        return persistedState;
      },
    }
  )
);