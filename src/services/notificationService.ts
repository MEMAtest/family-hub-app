import {
  NotificationService,
  NotificationReminder,
  InAppNotification,
  NotificationSettings,
  NotificationPermission,
  NotificationFilters,
  NotificationPreferences
} from '@/types/notification.types';
import { CalendarEvent } from '@/types/calendar.types';
import conflictDetectionService, { DetectedConflict } from './conflictDetectionService';
import { emailService } from './emailService';

class FamilyHubNotificationService implements NotificationService {
  private notifications: InAppNotification[] = [];
  private reminders: NotificationReminder[] = [];
  private settings: NotificationSettings;
  private familyId: string | null = null;
  private serviceWorkerRegistration?: ServiceWorkerRegistration;
  private conflicts: DetectedConflict[] = [];
  private emailRecipients: { email: string; name: string; }[] = [
    { email: 'admin@familyhub.app', name: 'Family Hub Admin' } // Default for testing
  ];
  private snoozeTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    this.settings = this.getDefaultSettings();
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeServiceWorker();
      this.loadPersistedData();
    }
  }

  setFamilyId(familyId: string | null) {
    this.familyId = familyId;
  }

  async syncFromDatabase(): Promise<void> {
    if (!this.familyId) return;

    try {
      const response = await fetch(`/api/families/${this.familyId}/notifications?limit=100&offset=0`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const remote = Array.isArray(payload) ? payload : [];

      const remoteNotifications: InAppNotification[] = remote.map((n: any) => ({
        ...n,
        timestamp: new Date(n.timestamp),
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        snoozedUntil: n.snoozedUntil ? new Date(n.snoozedUntil) : undefined,
      }));

      // Merge: remote first, keep any local-only notifications not present remotely.
      const merged = new Map<string, InAppNotification>();
      remoteNotifications.forEach((n) => merged.set(n.id, n));
      this.notifications.forEach((n) => {
        if (!merged.has(n.id)) {
          merged.set(n.id, n);
        }
      });

      this.notifications = Array.from(merged.values())
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 100);

      this.persistData();
      this.notifySubscribers();
    } catch (error) {
      console.warn('Failed to sync notifications from database:', error);
    }
  }

  /**
   * Initialize service worker for push notifications
   */
  private async initializeServiceWorker() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  /**
   * Load persisted notification data from localStorage
   */
  private loadPersistedData() {
    try {
      const storedNotifications = localStorage.getItem('family-hub-notifications');
      if (storedNotifications) {
        this.notifications = JSON.parse(storedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
          snoozedUntil: n.snoozedUntil ? new Date(n.snoozedUntil) : undefined
        }));
      }

      const storedSettings = localStorage.getItem('family-hub-notification-settings');
      if (storedSettings) {
        this.settings = { ...this.settings, ...JSON.parse(storedSettings) };
      }

      const storedReminders = localStorage.getItem('family-hub-reminders');
      if (storedReminders) {
        this.reminders = JSON.parse(storedReminders).map((r: any) => ({
          ...r,
          scheduledFor: new Date(r.scheduledFor),
          sentAt: r.sentAt ? new Date(r.sentAt) : undefined,
          acknowledgedAt: r.acknowledgedAt ? new Date(r.acknowledgedAt) : undefined,
          snoozedUntil: r.snoozedUntil ? new Date(r.snoozedUntil) : undefined
        }));
      }
      this.normalizeSnoozes();
    } catch (error) {
      console.error('Failed to load persisted notification data:', error);
    }
  }

  /**
   * Persist notification data to localStorage
   */
  private persistData() {
    try {
      localStorage.setItem('family-hub-notifications', JSON.stringify(this.notifications));
      localStorage.setItem('family-hub-notification-settings', JSON.stringify(this.settings));
      localStorage.setItem('family-hub-reminders', JSON.stringify(this.reminders));
    } catch (error) {
      console.error('Failed to persist notification data:', error);
    }
  }

  /**
   * Get default notification settings
   */
  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      channels: {
        browser: true,
        email: false,
        inApp: true
      },
      defaultReminders: {
        school: [1440, 60], // 1 day, 1 hour
        medical: [10080, 1440, 60], // 1 week, 1 day, 1 hour
        activities: [60, 15], // 1 hour, 15 minutes
        social: [1440, 60], // 1 day, 1 hour
        other: [60] // 1 hour
      },
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00'
      },
      emailFrequency: 'daily_digest'
    };
  }

  /**
   * Check current notification permission status
   */
  checkPermission(): NotificationPermission {
    if (!('Notification' in window)) {
      return { granted: false, denied: true, prompt: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      prompt: permission === 'default'
    };
  }

  /**
   * Request notification permission from user
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    const permission = await Notification.requestPermission();
    const result = this.checkPermission();

    if (permission === 'granted') {
      result.grantedAt = new Date();
    }

    return result;
  }

  /**
   * Schedule a reminder for an event
   */
  async scheduleReminder(eventId: string, reminderData: Omit<NotificationReminder, 'id'>): Promise<NotificationReminder> {
    const reminder: NotificationReminder = {
      id: this.generateId('reminder'),
      ...reminderData,
      eventId,
      retryCount: 0,
      status: 'pending'
    };

    this.reminders.push(reminder);
    this.persistData();

    // Schedule browser reminder if enabled
    if (this.settings.channels.browser && this.checkPermission().granted) {
      this.scheduleBrowserReminder(reminder);
    }

    return reminder;
  }

  /**
   * Schedule browser reminder using setTimeout
   */
  private scheduleBrowserReminder(reminder: NotificationReminder) {
    const now = new Date();
    const timeUntilReminder = reminder.scheduledFor.getTime() - now.getTime();

    if (timeUntilReminder > 0) {
      setTimeout(() => {
        this.deliverBrowserReminder(reminder);
      }, timeUntilReminder);
    }
  }

  /**
   * Deliver browser push notification
   */
  private async deliverBrowserReminder(reminder: NotificationReminder) {
    if (!this.checkPermission().granted || !reminder.metadata) return;

    // Check quiet hours
    if (this.isQuietHours()) {
      this.snoozeUntilQuietHoursEnd(reminder);
      return;
    }

    try {
      const notification = new Notification(reminder.metadata.title, {
        body: reminder.metadata.body,
        icon: reminder.metadata.icon || '/icons/calendar-icon.png',
        badge: reminder.metadata.badge || '/icons/badge-icon.png',
        tag: reminder.metadata.tag || `event-${reminder.eventId}`,
        data: reminder.metadata.data,
        requireInteraction: true
      });

      notification.onclick = () => {
        this.handleNotificationClick(reminder);
        notification.close();
      };

      // Mark as sent
      reminder.sentAt = new Date();
      reminder.status = 'sent';
      this.persistData();

    } catch (error) {
      console.error('Failed to show notification:', error);
      reminder.status = 'failed';
      reminder.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.persistData();
    }
  }

  /**
   * Handle notification click events
   */
  private handleNotificationClick(reminder: NotificationReminder) {
    // Create in-app notification
    this.showNotification({
      type: 'reminder',
      title: reminder.metadata?.title || 'Event Reminder',
      message: reminder.metadata?.body || 'You have an upcoming event',
      priority: 'medium',
      category: 'event',
      read: false,
      actionRequired: false,
      relatedEventId: reminder.eventId,
      actions: [
        { id: 'view', label: 'View Event', type: 'primary', action: 'view_event' },
        { id: 'dismiss', label: 'Dismiss', type: 'secondary', action: 'dismiss' }
      ]
    });

    // Mark reminder as acknowledged
    reminder.acknowledgedAt = new Date();
    reminder.status = 'acknowledged';
    this.persistData();
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(reminderId: string): Promise<void> {
    this.reminders = this.reminders.filter(r => r.id !== reminderId);
    this.persistData();
  }

  /**
   * Reschedule a reminder to a new time
   */
  async rescheduleReminder(reminderId: string, newTime: Date): Promise<NotificationReminder> {
    const reminderIndex = this.reminders.findIndex(r => r.id === reminderId);
    if (reminderIndex === -1) {
      throw new Error('Reminder not found');
    }

    this.reminders[reminderIndex].scheduledFor = newTime;
    this.reminders[reminderIndex].status = 'pending';
    this.reminders[reminderIndex].sentAt = undefined;

    this.persistData();

    // Reschedule browser reminder
    if (this.settings.channels.browser && this.checkPermission().granted) {
      this.scheduleBrowserReminder(this.reminders[reminderIndex]);
    }

    return this.reminders[reminderIndex];
  }

  /**
   * Show immediate in-app notification
   */
  async showNotification(notificationData: Omit<InAppNotification, 'id' | 'timestamp'>): Promise<InAppNotification> {
    const notification: InAppNotification = {
      id: this.generateId('notification'),
      timestamp: new Date(),
      ...notificationData,
      read: false
    };

    this.notifications.unshift(notification);

    // Limit to 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.persistData();
    this.notifySubscribers();

    if (this.familyId) {
      // Best-effort persistence; localStorage remains the offline cache.
      fetch(`/api/families/${this.familyId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notification,
          timestamp: notification.timestamp.toISOString(),
          expiresAt: notification.expiresAt?.toISOString(),
          snoozedUntil: notification.snoozedUntil?.toISOString(),
        }),
      }).catch((error) => {
        console.warn('Failed to persist notification (offline mode):', error);
      });
    }

    return notification;
  }

  /**
   * Send push notification (for service worker)
   */
  async sendPushNotification(title: string, options: NotificationOptions): Promise<void> {
    if (!this.serviceWorkerRegistration || !this.checkPermission().granted) {
      throw new Error('Push notifications not available');
    }

    await this.serviceWorkerRegistration.showNotification(title, options);
  }

  /**
   * Get notifications with optional filtering
   */
  async getNotifications(filters?: NotificationFilters): Promise<InAppNotification[]> {
    let filtered = [...this.getActiveNotifications()];

    if (filters) {
      if (filters.type) {
        filtered = filtered.filter(n => filters.type!.includes(n.type));
      }
      if (filters.category) {
        filtered = filtered.filter(n => filters.category!.includes(n.category));
      }
      if (filters.priority) {
        filtered = filtered.filter(n => filters.priority!.includes(n.priority));
      }
      if (filters.read !== undefined) {
        filtered = filtered.filter(n => n.read === filters.read);
      }
      if (filters.dateRange) {
        filtered = filtered.filter(n =>
          n.timestamp >= filters.dateRange!.start &&
          n.timestamp <= filters.dateRange!.end
        );
      }
      if (filters.personId) {
        filtered = filtered.filter(n => n.relatedPersonId === filters.personId);
      }
      if (filters.eventId) {
        filtered = filtered.filter(n => n.relatedEventId === filters.eventId);
      }
    }

    return filtered;
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.persistData();
      this.notifySubscribers();

      if (this.familyId) {
        fetch(`/api/families/${this.familyId}/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ read: true }),
        }).catch((error) => {
          console.warn('Failed to mark notification read (offline mode):', error);
        });
      }
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    this.notifications.forEach(n => n.read = true);
    this.persistData();
    this.notifySubscribers();

    if (this.familyId) {
      fetch(`/api/families/${this.familyId}/notifications/read-all`, {
        method: 'POST',
      }).catch((error) => {
        console.warn('Failed to mark all notifications read (offline mode):', error);
      });
    }
  }

  /**
   * Clear a notification
   */
  async clearNotification(notificationId: string): Promise<void> {
    const timeoutId = this.snoozeTimeouts.get(notificationId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.snoozeTimeouts.delete(notificationId);
    }
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.persistData();
    this.notifySubscribers();

    if (this.familyId) {
      fetch(`/api/families/${this.familyId}/notifications/${notificationId}`, {
        method: 'DELETE',
      }).catch((error) => {
        console.warn('Failed to delete notification (offline mode):', error);
      });
    }
  }

  /**
   * Snooze a notification
   */
  async snoozeNotification(notificationId: string, until: Date): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.snoozedUntil = until;
      this.scheduleSnoozeWakeup(notification);
      this.persistData();
      this.notifySubscribers();

      if (this.familyId) {
        fetch(`/api/families/${this.familyId}/notifications/${notificationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ snoozedUntil: until.toISOString() }),
        }).catch((error) => {
          console.warn('Failed to snooze notification (offline mode):', error);
        });
      }
    }
  }

  /**
   * Get current settings
   */
  async getSettings(): Promise<NotificationSettings> {
    return { ...this.settings };
  }

  /**
   * Update notification settings
   */
  async updateSettings(updates: Partial<NotificationSettings>): Promise<NotificationSettings> {
    this.settings = { ...this.settings, ...updates };
    this.persistData();
    return { ...this.settings };
  }

  /**
   * Schedule reminders for a calendar event
   */
  async scheduleEventReminders(event: CalendarEvent): Promise<void> {
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const eventType = event.type as keyof NotificationSettings['defaultReminders'];
    const reminderTimes = this.settings.defaultReminders[eventType] || this.settings.defaultReminders.other;

    // Cancel existing reminders for this event
    await this.cancelEventReminders(event.id);

    // Schedule new reminders
    for (const minutesBefore of reminderTimes) {
      const reminderTime = new Date(eventDateTime.getTime() - (minutesBefore * 60 * 1000));

      // Only schedule future reminders
      if (reminderTime > new Date()) {
        await this.scheduleReminder(event.id, {
          eventId: event.id,
          type: 'notification',
          scheduledFor: reminderTime,
          status: 'pending',
          retryCount: 0,
          metadata: {
            title: `Upcoming: ${event.title}`,
            body: `${event.title} starts in ${this.formatDuration(minutesBefore)}`,
            icon: '/icons/calendar-icon.png',
            tag: `event-${event.id}`,
            data: { eventId: event.id, type: 'reminder' }
          }
        });
      }
    }
  }

  /**
   * Cancel all reminders for an event
   */
  async cancelEventReminders(eventId: string): Promise<void> {
    const eventReminders = this.reminders.filter(r => r.eventId === eventId);
    for (const reminder of eventReminders) {
      await this.cancelReminder(reminder.id);
    }
  }

  /**
   * Utility methods
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days !== 1 ? 's' : ''}`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  private isQuietHours(): boolean {
    if (!this.settings.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const start = this.settings.quietHours.start;
    const end = this.settings.quietHours.end;

    if (start <= end) {
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 07:00)
      return currentTime >= start || currentTime <= end;
    }
  }

  private snoozeUntilQuietHoursEnd(reminder: NotificationReminder): void {
    const now = new Date();
    const endTime = this.settings.quietHours.end.split(':');
    const quietEnd = new Date(now);
    quietEnd.setHours(parseInt(endTime[0]), parseInt(endTime[1]), 0, 0);

    // If end time is earlier than start time, it's next day
    if (this.settings.quietHours.end < this.settings.quietHours.start) {
      if (now.getHours() >= parseInt(this.settings.quietHours.start.split(':')[0])) {
        quietEnd.setDate(quietEnd.getDate() + 1);
      }
    }

    this.rescheduleReminder(reminder.id, quietEnd);
  }

  // Subscription management for real-time updates
  private subscribers: ((notifications: InAppNotification[]) => void)[] = [];

  subscribe(callback: (notifications: InAppNotification[]) => void): () => void {
    this.subscribers.push(callback);
    callback(this.getActiveNotifications()); // Send current state

    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  private notifySubscribers(): void {
    const activeNotifications = this.getActiveNotifications();
    this.subscribers.forEach(callback => callback([...activeNotifications]));
  }

  // Get unread count
  getUnreadCount(): number {
    return this.getActiveNotifications().filter(n => !n.read).length;
  }

  private scheduleSnoozeWakeup(notification: InAppNotification): void {
    if (!notification.snoozedUntil) return;

    const delay = notification.snoozedUntil.getTime() - Date.now();
    if (delay <= 0) {
      notification.snoozedUntil = undefined;
      return;
    }

    const existingTimeout = this.snoozeTimeouts.get(notification.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const timeoutId = setTimeout(() => {
      const target = this.notifications.find(n => n.id === notification.id);
      if (target) {
        target.snoozedUntil = undefined;
        this.persistData();
        this.notifySubscribers();
      }
      this.snoozeTimeouts.delete(notification.id);
    }, delay);

    this.snoozeTimeouts.set(notification.id, timeoutId);
  }

  private normalizeSnoozes(): void {
    const now = Date.now();
    let hasChanges = false;

    this.notifications.forEach(notification => {
      if (!notification.snoozedUntil) return;
      if (notification.snoozedUntil.getTime() <= now) {
        notification.snoozedUntil = undefined;
        hasChanges = true;
      } else {
        this.scheduleSnoozeWakeup(notification);
      }
    });

    if (hasChanges) {
      this.persistData();
    }
  }

  private getActiveNotifications(): InAppNotification[] {
    const now = Date.now();
    return this.notifications.filter(notification => (
      !notification.snoozedUntil || notification.snoozedUntil.getTime() <= now
    ));
  }

  /**
   * Detect conflicts for a new/updated event
   */
  async detectEventConflicts(
    newEvent: CalendarEvent,
    existingEvents: CalendarEvent[],
    people: any[]
  ): Promise<DetectedConflict[]> {
    const conflicts = conflictDetectionService.detectConflicts(newEvent, existingEvents, people);

    if (conflicts.length > 0) {
      // Store conflicts
      this.conflicts.push(...conflicts);

      // Send conflict notifications
      for (const conflict of conflicts) {
        // In-app notification
        await this.showNotification({
          type: 'conflict',
          title: `Conflict Detected: ${conflict.newEvent.title}`,
          message: `${conflict.conflictType.replace('_', ' ')} conflict detected with ${conflict.conflictingEvents.length} event(s)`,
          priority: conflict.severity === 'critical' ? 'urgent' : conflict.severity === 'major' ? 'high' : 'medium',
          category: 'conflict',
          read: false,
          actionRequired: true,
          relatedEventId: conflict.newEvent.id,
          actions: [
            { id: 'resolve', label: 'Resolve Conflict', type: 'primary', action: 'resolve_conflict' },
            { id: 'ignore', label: 'Ignore', type: 'secondary', action: 'dismiss' }
          ]
        });

        // Email notification if enabled
        if (this.settings.channels.email && conflict.severity !== 'minor') {
          try {
            await fetch('/api/emails/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'conflict_alert',
                conflictData: conflict,
                recipients: this.emailRecipients
              })
            });
          } catch (error) {
            console.error('Failed to send conflict email:', error);
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Send email reminder for an event
   */
  async sendEmailReminder(event: CalendarEvent, reminderTime: number): Promise<void> {
    if (!this.settings.channels.email) return;

    try {
      await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'event_reminder',
          event,
          recipient: this.emailRecipients[0], // Use first recipient for now
          reminderTime
        })
      });
    } catch (error) {
      console.error('Failed to send email reminder:', error);
    }
  }

  /**
   * Send daily digest email
   */
  async sendDailyDigest(events: CalendarEvent[], date: Date = new Date()): Promise<void> {
    if (!this.settings.channels.email || this.settings.emailFrequency !== 'daily_digest') return;

    try {
      await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'daily_digest',
          events,
          notifications: this.notifications.slice(0, 10), // Recent notifications
          recipient: this.emailRecipients[0],
          date: date.toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send daily digest:', error);
    }
  }

  /**
   * Send weekly summary email
   */
  async sendWeeklySummary(events: CalendarEvent[], people: any[], weekStart: Date): Promise<void> {
    if (!this.settings.channels.email || this.settings.emailFrequency !== 'weekly_digest') return;

    try {
      await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'weekly_summary',
          events,
          people,
          recipient: this.emailRecipients[0],
          weekStart: weekStart.toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to send weekly summary:', error);
    }
  }

  /**
   * Test email functionality
   */
  async testEmailService(): Promise<boolean> {
    try {
      const response = await fetch('/api/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'test',
          recipient: this.emailRecipients[0]
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Email test failed:', error);
      return false;
    }
  }

  /**
   * Get current conflicts
   */
  getConflicts(): DetectedConflict[] {
    return [...this.conflicts];
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(conflictId: string): Promise<void> {
    const conflictIndex = this.conflicts.findIndex(c => c.id === conflictId);
    if (conflictIndex !== -1) {
      this.conflicts[conflictIndex].resolved = true;
      // Remove resolved conflicts from memory after 24 hours
      setTimeout(() => {
        this.conflicts = this.conflicts.filter(c => c.id !== conflictId);
      }, 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Set email recipients
   */
  setEmailRecipients(recipients: { email: string; name: string; }[]): void {
    this.emailRecipients = recipients;
  }

}

// Export singleton instance
export const notificationService = new FamilyHubNotificationService();
export default notificationService;
