import { create, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';
import { CalendarEvent, EventTemplate } from '@/types/calendar.types';
import { FamilyMember, FamilyMilestone } from '@/types';
import {
  AreaWatchItem,
  PropertyBaseline,
  PropertyComponent,
  PropertyTask,
  PropertyValueEntry,
  PropertyWorkLog,
  PropertyDocument,
  TaskContact,
  TaskQuote,
  TaskScheduledVisit,
  TaskFollowUp,
  PropertyProject,
  ProjectEmail,
  ProjectTask,
  ProjectMilestone,
} from '@/types/property.types';
import { Contractor, ContractorAppointment } from '@/types/contractor.types';
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

interface TimelineSlice {
  familyMilestones: FamilyMilestone[];
  setFamilyMilestones: (milestones: FamilyMilestone[]) => void;
  addFamilyMilestone: (milestone: FamilyMilestone) => void;
  updateFamilyMilestone: (id: string, updates: Partial<FamilyMilestone>) => void;
  deleteFamilyMilestone: (id: string) => void;
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
  // CRM Actions
  addTaskContact: (taskId: string, contact: TaskContact) => void;
  updateTaskContact: (taskId: string, contactId: string, updates: Partial<TaskContact>) => void;
  removeTaskContact: (taskId: string, contactId: string) => void;
  addTaskQuote: (taskId: string, quote: TaskQuote) => void;
  updateTaskQuote: (taskId: string, quoteId: string, updates: Partial<TaskQuote>) => void;
  removeTaskQuote: (taskId: string, quoteId: string) => void;
  addTaskVisit: (taskId: string, visit: TaskScheduledVisit) => void;
  updateTaskVisit: (taskId: string, visitId: string, updates: Partial<TaskScheduledVisit>) => void;
  removeTaskVisit: (taskId: string, visitId: string) => void;
  addTaskFollowUp: (taskId: string, followUp: TaskFollowUp) => void;
  updateTaskFollowUp: (taskId: string, followUpId: string, updates: Partial<TaskFollowUp>) => void;
  removeTaskFollowUp: (taskId: string, followUpId: string) => void;
  // Projects
  propertyProjects: PropertyProject[];
  activeProjectId: string | null;
  setPropertyProjects: (projects: PropertyProject[]) => void;
  addPropertyProject: (project: PropertyProject) => void;
  updatePropertyProject: (id: string, updates: Partial<PropertyProject>) => void;
  removePropertyProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  // Project Emails
  addProjectEmail: (projectId: string, email: ProjectEmail) => void;
  updateProjectEmail: (projectId: string, emailId: string, updates: Partial<ProjectEmail>) => void;
  removeProjectEmail: (projectId: string, emailId: string) => void;
  // Project Tasks
  addProjectTask: (projectId: string, task: ProjectTask) => void;
  updateProjectTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  removeProjectTask: (projectId: string, taskId: string) => void;
  // Project Milestones
  addProjectMilestone: (projectId: string, milestone: ProjectMilestone) => void;
  updateProjectMilestone: (projectId: string, milestoneId: string, updates: Partial<ProjectMilestone>) => void;
  removeProjectMilestone: (projectId: string, milestoneId: string) => void;
  // Project CRM
  addProjectContact: (projectId: string, contact: TaskContact) => void;
  updateProjectContact: (projectId: string, contactId: string, updates: Partial<TaskContact>) => void;
  removeProjectContact: (projectId: string, contactId: string) => void;
  addProjectQuote: (projectId: string, quote: TaskQuote) => void;
  updateProjectQuote: (projectId: string, quoteId: string, updates: Partial<TaskQuote>) => void;
  removeProjectQuote: (projectId: string, quoteId: string) => void;
  addProjectVisit: (projectId: string, visit: TaskScheduledVisit) => void;
  updateProjectVisit: (projectId: string, visitId: string, updates: Partial<TaskScheduledVisit>) => void;
  removeProjectVisit: (projectId: string, visitId: string) => void;
  addProjectFollowUp: (projectId: string, followUp: TaskFollowUp) => void;
  updateProjectFollowUp: (projectId: string, followUpId: string, updates: Partial<TaskFollowUp>) => void;
  removeProjectFollowUp: (projectId: string, followUpId: string) => void;
}

interface DatabaseSlice {
  databaseStatus: {
    connected: boolean;
    familyId: string | null;
    mode: string;
  };
  setDatabaseStatus: (status: { connected: boolean; familyId: string | null; mode: string }) => void;
}

interface ContractorSlice {
  contractors: Contractor[];
  contractorAppointments: ContractorAppointment[];
  setContractors: (contractors: Contractor[]) => void;
  addContractor: (contractor: Contractor) => void;
  updateContractor: (id: string, updates: Partial<Contractor>) => void;
  deleteContractor: (id: string) => void;
  setContractorAppointments: (appointments: ContractorAppointment[]) => void;
  addContractorAppointment: (appointment: ContractorAppointment) => void;
  updateContractorAppointment: (id: string, updates: Partial<ContractorAppointment>) => void;
  deleteContractorAppointment: (id: string) => void;
}

// Combined state
export type FamilyState = PeopleSlice & CalendarSlice & ViewSlice & BudgetSlice & MealPlanningSlice & ShoppingSlice & GoalsSlice & TimelineSlice & PropertySlice & DatabaseSlice & ContractorSlice;

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

const createTimelineSlice: StateCreator<FamilyState, [], [], TimelineSlice> = (set) => ({
  familyMilestones: [],
  setFamilyMilestones: (milestones) => set({ familyMilestones: milestones }),
  addFamilyMilestone: (milestone) =>
    set((state) => ({ familyMilestones: [...state.familyMilestones, milestone] })),
  updateFamilyMilestone: (id, updates) =>
    set((state) => ({
      familyMilestones: state.familyMilestones.map((milestone) =>
        milestone.id === id ? { ...milestone, ...updates } : milestone
      ),
    })),
  deleteFamilyMilestone: (id) =>
    set((state) => ({
      familyMilestones: state.familyMilestones.filter((milestone) => milestone.id !== id),
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
  // CRM Actions
  addTaskContact: (taskId, contact) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              contacts: [...(task.contacts || []), contact],
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  updateTaskContact: (taskId, contactId, updates) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              contacts: (task.contacts || []).map((c) =>
                c.id === contactId ? { ...c, ...updates } : c
              ),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  removeTaskContact: (taskId, contactId) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              contacts: (task.contacts || []).filter((c) => c.id !== contactId),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  addTaskQuote: (taskId, quote) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              quotes: [...(task.quotes || []), quote],
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  updateTaskQuote: (taskId, quoteId, updates) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              quotes: (task.quotes || []).map((q) =>
                q.id === quoteId ? { ...q, ...updates } : q
              ),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  removeTaskQuote: (taskId, quoteId) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              quotes: (task.quotes || []).filter((q) => q.id !== quoteId),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  addTaskVisit: (taskId, visit) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              scheduledVisits: [...(task.scheduledVisits || []), visit],
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  updateTaskVisit: (taskId, visitId, updates) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              scheduledVisits: (task.scheduledVisits || []).map((v) =>
                v.id === visitId ? { ...v, ...updates } : v
              ),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  removeTaskVisit: (taskId, visitId) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              scheduledVisits: (task.scheduledVisits || []).filter((v) => v.id !== visitId),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  addTaskFollowUp: (taskId, followUp) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              followUps: [...(task.followUps || []), followUp],
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  updateTaskFollowUp: (taskId, followUpId, updates) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              followUps: (task.followUps || []).map((f) =>
                f.id === followUpId ? { ...f, ...updates } : f
              ),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  removeTaskFollowUp: (taskId, followUpId) =>
    set((state) => ({
      propertyTasks: state.propertyTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              followUps: (task.followUps || []).filter((f) => f.id !== followUpId),
              updatedAt: new Date().toISOString(),
            }
          : task
      ),
    })),
  // Projects
  propertyProjects: [],
  activeProjectId: null,
  setPropertyProjects: (projects) => set({ propertyProjects: projects }),
  addPropertyProject: (project) =>
    set((state) => ({ propertyProjects: [...state.propertyProjects, project] })),
  updatePropertyProject: (id, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      ),
    })),
  removePropertyProject: (id) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.filter((p) => p.id !== id),
      activeProjectId: state.activeProjectId === id ? null : state.activeProjectId,
    })),
  setActiveProject: (id) => set({ activeProjectId: id }),
  // Project Emails
  addProjectEmail: (projectId, email) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, emails: [...p.emails, email], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectEmail: (projectId, emailId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              emails: p.emails.map((e) => (e.id === emailId ? { ...e, ...updates } : e)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectEmail: (projectId, emailId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, emails: p.emails.filter((e) => e.id !== emailId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  // Project Tasks
  addProjectTask: (projectId, task) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: [...p.tasks, task], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectTask: (projectId, taskId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectTask: (projectId, taskId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  // Project Milestones
  addProjectMilestone: (projectId, milestone) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, milestones: [...p.milestones, milestone], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectMilestone: (projectId, milestoneId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              milestones: p.milestones.map((m) => (m.id === milestoneId ? { ...m, ...updates } : m)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectMilestone: (projectId, milestoneId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, milestones: p.milestones.filter((m) => m.id !== milestoneId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  // Project CRM - Contacts
  addProjectContact: (projectId, contact) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, contacts: [...p.contacts, contact], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectContact: (projectId, contactId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              contacts: p.contacts.map((c) => (c.id === contactId ? { ...c, ...updates } : c)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectContact: (projectId, contactId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, contacts: p.contacts.filter((c) => c.id !== contactId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  // Project CRM - Quotes
  addProjectQuote: (projectId, quote) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, quotes: [...p.quotes, quote], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectQuote: (projectId, quoteId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              quotes: p.quotes.map((q) => (q.id === quoteId ? { ...q, ...updates } : q)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectQuote: (projectId, quoteId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, quotes: p.quotes.filter((q) => q.id !== quoteId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  // Project CRM - Visits
  addProjectVisit: (projectId, visit) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, scheduledVisits: [...p.scheduledVisits, visit], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectVisit: (projectId, visitId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              scheduledVisits: p.scheduledVisits.map((v) => (v.id === visitId ? { ...v, ...updates } : v)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectVisit: (projectId, visitId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, scheduledVisits: p.scheduledVisits.filter((v) => v.id !== visitId), updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  // Project CRM - Follow-ups
  addProjectFollowUp: (projectId, followUp) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, followUps: [...p.followUps, followUp], updatedAt: new Date().toISOString() }
          : p
      ),
    })),
  updateProjectFollowUp: (projectId, followUpId, updates) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              followUps: p.followUps.map((f) => (f.id === followUpId ? { ...f, ...updates } : f)),
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
    })),
  removeProjectFollowUp: (projectId, followUpId) =>
    set((state) => ({
      propertyProjects: state.propertyProjects.map((p) =>
        p.id === projectId
          ? { ...p, followUps: p.followUps.filter((f) => f.id !== followUpId), updatedAt: new Date().toISOString() }
          : p
      ),
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

const createContractorSlice: StateCreator<FamilyState, [], [], ContractorSlice> = (set) => ({
  contractors: [],
  contractorAppointments: [],
  setContractors: (contractors) => set({ contractors }),
  addContractor: (contractor) =>
    set((state) => ({ contractors: [...state.contractors, contractor] })),
  updateContractor: (id, updates) =>
    set((state) => ({
      contractors: state.contractors.map((c) =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      ),
    })),
  deleteContractor: (id) =>
    set((state) => ({
      contractors: state.contractors.filter((c) => c.id !== id),
    })),
  setContractorAppointments: (appointments) => set({ contractorAppointments: appointments }),
  addContractorAppointment: (appointment) =>
    set((state) => ({ contractorAppointments: [...state.contractorAppointments, appointment] })),
  updateContractorAppointment: (id, updates) =>
    set((state) => ({
      contractorAppointments: state.contractorAppointments.map((a) =>
        a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a
      ),
    })),
  deleteContractorAppointment: (id) =>
    set((state) => ({
      contractorAppointments: state.contractorAppointments.filter((a) => a.id !== id),
    })),
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
      ...createTimelineSlice(...a),
      ...createPropertySlice(...a),
      ...createDatabaseSlice(...a),
      ...createContractorSlice(...a),
    }),
    {
      name: 'family-storage',
      version: 6, // Bumped to sync property baseline updates
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
        // Projects
        propertyProjects: state.propertyProjects,
        activeProjectId: state.activeProjectId,
        // Contractors (persisted locally for now)
        contractors: state.contractors,
        contractorAppointments: state.contractorAppointments,
      }),
      migrate: (persistedState: any, version: number) => {
        // Clear old cache to force fresh load from database
        if (version < 4) {
          console.log('Migrating from version', version, 'to version 4 - clearing old cache');
          return {} as any;
        }
        if (version < 6 && persistedState?.propertyProfile?.propertyName === tremaineRoadBaseline.propertyName) {
          const updatedProfile = {
            ...tremaineRoadBaseline,
            ...persistedState.propertyProfile,
          };
          updatedProfile.address = tremaineRoadBaseline.address;
          updatedProfile.propertyType = tremaineRoadBaseline.propertyType;
          updatedProfile.nearbyStreets = tremaineRoadBaseline.nearbyStreets;
          if (updatedProfile.purchasePrice == null) {
            updatedProfile.purchasePrice = tremaineRoadBaseline.purchasePrice;
          }
          if (!updatedProfile.purchaseDate) {
            updatedProfile.purchaseDate = tremaineRoadBaseline.purchaseDate;
          }
          persistedState.propertyProfile = updatedProfile;
        }
        return persistedState;
      },
    }
  )
);
