import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalendarEvent, EventTemplate } from '@/types/calendar.types';
import { FamilyMember } from '@/types';
import {
  AreaWatchItem,
  PropertyBaseline,
  PropertyComponent,
  PropertyTask,
  PropertyValueEntry,
  PropertyWorkLog,
  PropertyDocument,
} from '@/types/property.types';
import {
  tremaineRoadAreaWatch,
  tremaineRoadBaseline,
  tremaineRoadComponents,
  tremaineRoadTasks,
  tremaineRoadValues,
} from '@/data/property/tremaineRoad';

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
  familyMembers: FamilyMember[];
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
  currentDate: Date | null;
  isHydrated: boolean;
  selectedPerson: string;
  setCurrentView: (view: string) => void;
  setCurrentSubView: (subView: string) => void;
  setCalendarView: (view: 'month' | 'week' | 'day') => void;
  setCurrentDate: (date: Date) => void;
  setSelectedPerson: (personId: string) => void;
  hydrate: () => void;
}

interface BudgetSlice {
  budgetData: BudgetData | null;
  setBudgetData: (data: BudgetData | null) => void;
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

interface PropertySlice {
  propertyProfile: PropertyBaseline;
  propertyTasks: PropertyTask[];
  propertyValues: PropertyValueEntry[];
  areaWatchItems: AreaWatchItem[];
  propertyComponents: PropertyComponent[];
  propertyRole: 'owner' | 'contractor' | 'viewer';
  setPropertyProfile: (profile: PropertyBaseline) => void;
  updatePropertyProfile: (updates: Partial<PropertyBaseline>) => void;
  addPropertyDocument: (document: PropertyDocument) => void;
  removePropertyDocument: (id: string) => void;
  setPropertyTasks: (tasks: PropertyTask[]) => void;
  addPropertyTask: (task: PropertyTask) => void;
  updatePropertyTask: (id: string, updates: Partial<PropertyTask>) => void;
  removePropertyTask: (id: string) => void;
  addPropertyWorkLog: (taskId: string, workLog: PropertyWorkLog) => void;
  setPropertyValues: (values: PropertyValueEntry[]) => void;
  addPropertyValue: (value: PropertyValueEntry) => void;
  removePropertyValue: (id: string) => void;
  setAreaWatchItems: (items: AreaWatchItem[]) => void;
  addAreaWatchItem: (item: AreaWatchItem) => void;
  updateAreaWatchItem: (id: string, updates: Partial<AreaWatchItem>) => void;
  removeAreaWatchItem: (id: string) => void;
  setPropertyComponents: (components: PropertyComponent[]) => void;
  setPropertyRole: (role: 'owner' | 'contractor' | 'viewer') => void;
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
export type FamilyState = PeopleSlice & CalendarSlice & ViewSlice & BudgetSlice & MealPlanningSlice & ShoppingSlice & GoalsSlice & PropertySlice & DatabaseSlice;

// =================================================================
// SLICE CREATORS
// =================================================================

const createPeopleSlice: StateCreator<FamilyState, [], [], PeopleSlice> = (set) => ({
  people: [],
  familyMembers: [],
  setPeople: (people) => set({ people, familyMembers: people }),
  addPerson: (person) =>
    set((state) => ({
      people: [...state.people, person],
      familyMembers: [...state.familyMembers, person],
    })),
  updatePerson: (id, updates) =>
    set((state) => ({
      people: state.people.map((p) => (p.id === id ? { ...p, ...updates } : p)),
      familyMembers: state.familyMembers.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),
  deletePerson: (id) =>
    set((state) => ({
      people: state.people.filter((p) => p.id !== id),
      familyMembers: state.familyMembers.filter((p) => p.id !== id),
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
  currentDate: null, // Initialize as null to prevent hydration mismatch
  isHydrated: false,
  selectedPerson: 'all',
  setCurrentView: (view) => set({ currentView: view, currentSubView: '' }),
  setCurrentSubView: (subView) => set({ currentSubView: subView }),
  setCalendarView: (view) => set({ calendarView: view }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSelectedPerson: (personId) => set({ selectedPerson: personId }),
  hydrate: () => set({ currentDate: new Date(), isHydrated: true }),
});

const createBudgetSlice: StateCreator<FamilyState, [], [], BudgetSlice> = (set) => ({
  budgetData: null,
  setBudgetData: (data) => set({ budgetData: data }),
  updateBudgetData: (updates) =>
    set((state) => ({
      budgetData: state.budgetData ? { ...state.budgetData, ...updates } : null,
    })),
});

const createMealPlanningSlice: StateCreator<FamilyState, [], [], MealPlanningSlice> = (set) => ({
  mealPlanning: null, // Load from database, no hardcoded data
  setMealPlanning: (data) => set({ mealPlanning: data }),
  updateMealPlanning: (updates) =>
    set((state) => ({
      mealPlanning: state.mealPlanning ? { ...state.mealPlanning, ...updates } : null,
    })),
});

const createShoppingSlice: StateCreator<FamilyState, [], [], ShoppingSlice> = (set) => ({
  shoppingLists: [], // Load from database, no hardcoded data
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
  goalsData: null, // Load from database, no hardcoded data
  setGoalsData: (data) => set({ goalsData: data }),
  updateGoalsData: (updates) =>
    set((state) => ({
      goalsData: state.goalsData ? { ...state.goalsData, ...updates } : null,
    })),
});

const createPropertySlice: StateCreator<FamilyState, [], [], PropertySlice> = (set) => ({
  propertyProfile: tremaineRoadBaseline,
  propertyTasks: tremaineRoadTasks,
  propertyValues: tremaineRoadValues,
  areaWatchItems: tremaineRoadAreaWatch,
  propertyComponents: tremaineRoadComponents,
  propertyRole: 'owner',
  setPropertyProfile: (profile) => set({ propertyProfile: profile }),
  updatePropertyProfile: (updates) =>
    set((state) => ({
      propertyProfile: { ...state.propertyProfile, ...updates },
    })),
  addPropertyDocument: (document) =>
    set((state) => ({
      propertyProfile: {
        ...state.propertyProfile,
        documents: [...state.propertyProfile.documents, document],
      },
    })),
  removePropertyDocument: (id) =>
    set((state) => ({
      propertyProfile: {
        ...state.propertyProfile,
        documents: state.propertyProfile.documents.filter((doc) => doc.id !== id),
      },
    })),
  setPropertyTasks: (tasks) => set({ propertyTasks: tasks }),
  addPropertyTask: (task) =>
    set((state) => ({ propertyTasks: [...state.propertyTasks, task] })),
  updatePropertyTask: (id, updates) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === id
          ? { ...task, ...updates, updatedAt: new Date().toISOString() }
          : task
      ),
    })),
  removePropertyTask: (id) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.filter((task) => task.id !== id),
    })),
  addPropertyWorkLog: (taskId, workLog) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
            ...task,
            workLogs: [...task.workLogs, workLog],
            updatedAt: new Date().toISOString(),
          }
          : task
      ),
    })),
  setPropertyValues: (values) => set({ propertyValues: values }),
  addPropertyValue: (value) =>
    set((state) => ({ propertyValues: [...state.propertyValues, value] })),
  removePropertyValue: (id) =>
    set((state) => ({
      propertyValues: state.propertyValues.filter((entry) => entry.id !== id),
    })),
  setAreaWatchItems: (items) => set({ areaWatchItems: items }),
  addAreaWatchItem: (item) =>
    set((state) => ({ areaWatchItems: [...state.areaWatchItems, item] })),
  updateAreaWatchItem: (id, updates) =>
    set((state) => ({
      areaWatchItems: state.areaWatchItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    })),
  removeAreaWatchItem: (id) =>
    set((state) => ({
      areaWatchItems: state.areaWatchItems.filter((item) => item.id !== id),
    })),
  setPropertyComponents: (components) => set({ propertyComponents: components }),
  setPropertyRole: (role) => set({ propertyRole: role }),
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
      ...createPropertySlice(...a),
      ...createDatabaseSlice(...a),
    }),
    {
      name: 'family-storage',
      version: 4, // Bumped to clear old cache with hardcoded data
      partialize: (state) => ({
        // Only persist UI preferences, NOT dynamic data
        // Dynamic data (people, events, budgetData, mealPlanning, shoppingLists, goalsData)
        // should be loaded from the database via useDatabaseSync
        currentView: state.currentView,
        currentSubView: state.currentSubView,
        calendarView: state.calendarView,
        selectedPerson: state.selectedPerson,
        eventTemplates: state.eventTemplates,
        // Property data (loaded from static files for now)
        propertyProfile: state.propertyProfile,
        propertyTasks: state.propertyTasks,
        propertyValues: state.propertyValues,
        areaWatchItems: state.areaWatchItems,
        propertyComponents: state.propertyComponents,
        propertyRole: state.propertyRole,
      }),
      migrate: (persistedState: any, version: number) => {
        // Clear old cache to force fresh load from database
        if (version < 4) {
          console.log('Migrating from version', version, 'to version 4 - clearing old cache');
          return {} as any;
        }
        return persistedState;
      },
    }
  )
);
