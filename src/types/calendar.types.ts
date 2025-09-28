// Calendar System TypeScript Definitions

export interface CalendarEvent {
  id: string;
  title: string;
  person: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  duration: number; // minutes
  location?: string;
  recurring: 'weekly' | 'monthly' | 'yearly' | 'none';
  cost: number;
  type: 'sport' | 'meeting' | 'fitness' | 'social' | 'education' | 'family' | 'other' | 'appointment' | 'work' | 'personal';
  notes?: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  reminders?: Reminder[];
  attendees?: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'confirmed' | 'tentative' | 'cancelled';
  color?: string;
  googleEventId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Work-specific properties
  workStatus?: WorkStatus;
}

export interface WorkStatus {
  type: 'office' | 'remote' | 'travel' | 'client_site';
  location?: string; // Specific office, travel destination, or client site
  affectsPickup: boolean; // Whether this affects pickup times
  pickupTimeAdjustment?: number; // Minutes earlier/later than normal
  travelDetails?: {
    destination: string;
    departureTime?: string;
    returnTime?: string;
    transportation: 'flight' | 'train' | 'car' | 'other';
  };
  notes?: string;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every N days/weeks/months/years
  endDate?: string;
  endAfter?: number; // number of occurrences
  daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
  dayOfMonth?: number;
  monthOfYear?: number;
}

export interface Reminder {
  id: string;
  type: 'notification' | 'email' | 'sms';
  time: number; // minutes before event
  enabled: boolean;
}

export interface EventTemplate {
  id: string;
  name: string;
  title: string;
  duration: number;
  location?: string;
  type: CalendarEvent['type'];
  notes?: string;
  defaultReminders: Reminder[];
  category: 'work' | 'personal' | 'family' | 'health' | 'education';
}

export interface CalendarView {
  type: 'day' | 'week' | 'month' | 'year' | 'agenda';
  date: Date;
}

export interface CalendarSettings {
  defaultView: CalendarView['type'];
  startWeekOn: 0 | 1; // 0=Sunday, 1=Monday
  workingHours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  timeZone: string;
  defaultEventDuration: number;
  defaultReminders: Reminder[];
  notifications: {
    browser: boolean;
    email: boolean;
    sms: boolean;
  };
  autoSync: {
    googleCalendar: boolean;
    interval: number; // minutes
  };
}

export interface ImportExportOptions {
  format: 'ical' | 'csv' | 'pdf' | 'google';
  dateRange?: {
    start: string;
    end: string;
  };
  categories?: CalendarEvent['type'][];
  includePastEvents: boolean;
}

export interface EventConflict {
  type: 'overlap' | 'travel_time' | 'double_booking';
  severity: 'warning' | 'error';
  message: string;
  conflictingEvents: CalendarEvent[];
  suggestions?: string[];
}

export interface NotificationPreferences {
  enabled: boolean;
  types: {
    eventReminder: boolean;
    dailyAgenda: boolean;
    weeklyPreview: boolean;
    conflictAlert: boolean;
    weatherAlert: boolean;
  };
  timing: {
    dailyAgendaTime: string; // HH:MM
    weeklyPreviewDay: number; // 0=Sunday
    weeklyPreviewTime: string; // HH:MM
  };
  channels: {
    browser: boolean;
    email: boolean;
    sms: boolean;
  };
}

// Big Calendar specific types
export interface BigCalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: CalendarEvent;
  allDay?: boolean;
}

export interface CalendarContextType {
  events: CalendarEvent[];
  view: CalendarView;
  settings: CalendarSettings;
  templates: EventTemplate[];
  notifications: NotificationPreferences;
  // Actions
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  setView: (view: CalendarView) => void;
  updateSettings: (settings: Partial<CalendarSettings>) => void;
  importEvents: (file: File, options: ImportExportOptions) => Promise<CalendarEvent[]>;
  exportEvents: (options: ImportExportOptions) => Promise<string | Blob>;
  checkConflicts: (event: CalendarEvent) => EventConflict[];
}

// Utility types
export type CalendarAction =
  | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
  | { type: 'ADD_EVENT'; payload: CalendarEvent }
  | { type: 'UPDATE_EVENT'; payload: { id: string; updates: Partial<CalendarEvent> } }
  | { type: 'DELETE_EVENT'; payload: string }
  | { type: 'SET_VIEW'; payload: CalendarView }
  | { type: 'SET_SETTINGS'; payload: Partial<CalendarSettings> };

// People type from existing app
export interface Person {
  id: string;
  name: string;
  color: string;
  icon: string;
  role: string;
}