// Notification System TypeScript Definitions

export interface NotificationSettings {
  enabled: boolean;
  channels: {
    browser: boolean;
    email: boolean;
    inApp: boolean;
  };
  defaultReminders: {
    school: number[]; // minutes before event
    medical: number[];
    activities: number[];
    social: number[];
    other: number[];
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
  emailFrequency: 'immediate' | 'daily_digest' | 'weekly_digest';
}

export interface NotificationReminder {
  id: string;
  eventId: string;
  personId?: string;
  type: 'notification' | 'email' | 'push';
  scheduledFor: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  snoozedUntil?: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'acknowledged' | 'snoozed';
  retryCount: number;
  errorMessage?: string;
  metadata?: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: any;
  };
}

export interface InAppNotification {
  id: string;
  type: 'reminder' | 'conflict' | 'sync' | 'system';
  title: string;
  message: string;
  icon?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'event' | 'sync' | 'system' | 'error';
  timestamp: Date;
  read: boolean;
  actionRequired: boolean;
  actions?: NotificationAction[];
  relatedEventId?: string;
  relatedPersonId?: string;
  expiresAt?: Date;
  metadata?: any;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: string; // e.g., 'snooze', 'view_event', 'mark_done', 'dismiss'
  data?: any;
}

export interface NotificationPermission {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
  requestedAt?: Date;
  grantedAt?: Date;
}

export interface NotificationPreferences {
  eventTypes: {
    [key: string]: {
      enabled: boolean;
      reminders: number[]; // minutes before
      channels: ('browser' | 'email' | 'inApp')[];
      priority: 'low' | 'medium' | 'high';
    };
  };
  digestSettings: {
    dailyTime: string; // HH:MM
    weeklyDay: number; // 0=Sunday
    weeklyTime: string; // HH:MM
    includeWeather: boolean;
    includeTraffic: boolean;
  };
  smartFeatures: {
    travelTimeReminders: boolean;
    weatherAlerts: boolean;
    conflictDetection: boolean;
    preparationTimeBuffers: boolean;
  };
}

// Service interfaces
export interface NotificationService {
  // Permission management
  requestPermission(): Promise<NotificationPermission>;
  checkPermission(): NotificationPermission;

  // Reminder scheduling
  scheduleReminder(eventId: string, reminder: Omit<NotificationReminder, 'id'>): Promise<NotificationReminder>;
  cancelReminder(reminderId: string): Promise<void>;
  rescheduleReminder(reminderId: string, newTime: Date): Promise<NotificationReminder>;

  // Immediate notifications
  showNotification(notification: Omit<InAppNotification, 'id' | 'timestamp'>): Promise<InAppNotification>;
  sendPushNotification(title: string, options: NotificationOptions): Promise<void>;

  // Management
  getNotifications(filters?: NotificationFilters): Promise<InAppNotification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  clearNotification(notificationId: string): Promise<void>;
  snoozeNotification(notificationId: string, until: Date): Promise<void>;

  // Settings
  getSettings(): Promise<NotificationSettings>;
  updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings>;
}

export interface NotificationFilters {
  type?: InAppNotification['type'][];
  category?: InAppNotification['category'][];
  priority?: InAppNotification['priority'][];
  read?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  personId?: string;
  eventId?: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: 'reminder' | 'digest' | 'conflict' | 'system';
}

export interface NotificationQueue {
  id: string;
  type: 'immediate' | 'scheduled' | 'digest';
  scheduledFor: Date;
  recipients: string[];
  template: string;
  data: any;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  lastAttempt?: Date;
  nextAttempt?: Date;
  error?: string;
}

// Context and hooks
export interface NotificationContextType {
  notifications: InAppNotification[];
  unreadCount: number;
  permission: NotificationPermission;
  settings: NotificationSettings;

  // Actions
  requestPermission(): Promise<void>;
  showNotification(notification: Omit<InAppNotification, 'id' | 'timestamp'>): Promise<void>;
  markAsRead(id: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  clearNotification(id: string): Promise<void>;
  snoozeNotification(id: string, until: Date): Promise<void>;
  updateSettings(settings: Partial<NotificationSettings>): Promise<void>;

  // Event scheduling
  scheduleEventReminders(eventId: string, eventDate: Date, eventType: string): Promise<void>;
  cancelEventReminders(eventId: string): Promise<void>;
}