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
import { getCalendarEventIcon, getEventNotificationMetadata } from '@/utils/eventSemantics';
import conflictDetectionService, { DetectedConflict } from './conflictDetectionService';
import { emailService } from './emailService';
import { isFamilyReminder, type FamilyReminderAction } from '@/lib/familyReminderContract';
import { isActionableNotification } from '@/lib/notificationDelivery';

export class FamilyHubNotificationService implements NotificationService {
  private notifications: InAppNotification[] = [];
  private reminders: NotificationReminder[] = [];
  private settings: NotificationSettings;
  private familyId: string | null = null;
  private personId: string | null = null;
  private scopeVersion = 0;
  private binding: Promise<void> = Promise.resolve();
  private delivered = new Map<string, number>();
  private activityTimeout?: ReturnType<typeof setTimeout>;
  private reminderTimeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private serviceWorkerRegistration?: ServiceWorkerRegistration;
  private pushSubscriptionInFlight: Promise<void> | null = null;
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
    }
  }

  setFamilyId(familyId: string | null): Promise<void> {
    this.binding = this.bindFamily(familyId);
    return this.binding;
  }

  private async bindFamily(familyId: string | null) {
    const version = ++this.scopeVersion;
    this.familyId = familyId;
    this.personId = null;
    this.delivered.clear();
    this.settings = this.getDefaultSettings();
    this.notifications = [];
    this.reminders = [];
    clearTimeout(this.activityTimeout);
    this.reminderTimeouts.forEach(clearTimeout);
    this.reminderTimeouts.clear();
    this.snoozeTimeouts.forEach(clearTimeout);
    this.snoozeTimeouts.clear();
    this.notifySubscribers();
    if (typeof window === 'undefined' || !familyId) return;
    try {
      const response = await fetch('/api/auth/me');
      if (!response.ok) return;
      const identity = await response.json();
      if (version !== this.scopeVersion || identity.family?.id !== familyId) return;
      this.personId = identity.familyMember?.id ?? null;
      this.settings = this.getDefaultSettings();
      this.loadPersistedData();
      this.notifySubscribers();
      if (this.settings.channels.push && this.checkPermission().granted) await this.syncPushSubscription();
    } catch (error) {
      console.warn('Unable to bind notification account:', error);
    }
  }

  private storageKey(kind: string) {
    return `family-hub:${this.familyId ?? 'none'}:${this.personId ?? 'unclaimed'}:${kind}`;
  }

  async syncFromDatabase(): Promise<void> {
    await this.binding;
    if (!this.familyId || !this.personId) return;

    const version = this.scopeVersion;
    try {
      const url = `/api/families/${this.familyId}/notifications`;
      const [response, actionableResponse] = await Promise.all([
        fetch(`${url}?limit=100&offset=0`, { cache: 'no-store' }),
        fetch(`${url}?actionable=true&limit=200&offset=0`, { cache: 'no-store' }),
      ]);
      if (!response.ok || !actionableResponse.ok) {
        return;
      }

      const [payload, actionable] = await Promise.all([response.json(), actionableResponse.json()]);
      if (version !== this.scopeVersion) return;
      const remote = [...(Array.isArray(payload) ? payload : []), ...(Array.isArray(actionable) ? actionable : [])];

      const remoteNotifications: InAppNotification[] = remote.map((n: any) => ({
        ...n,
        metadata: { ...n.metadata, serverBacked: true },
        timestamp: new Date(n.timestamp),
        expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
        snoozedUntil: n.snoozedUntil ? new Date(n.snoozedUntil) : undefined,
      }));

      // Merge: remote first, keep any local-only notifications not present remotely.
      const merged = new Map<string, InAppNotification>();
      remoteNotifications.forEach((n) => merged.set(n.id, n));
      this.notifications.forEach((n) => {
        if (!merged.has(n.id) && !isFamilyReminder(n) && !n.metadata?.serverBacked) {
          merged.set(n.id, n);
        }
      });

      this.notifications = this.dedupeNotifications(Array.from(merged.values()))
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 300);

      this.persistData();
      this.normalizeSnoozes();
      this.notifySubscribers();
    } catch (error) {
      console.warn('Failed to sync notifications from database:', error);
    }
  }

  /**
   * Initialize service worker for push notifications
   */
  private async initializeServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      } catch (error) {
        console.warn('Failed to clear development service worker:', error);
      }
      return;
    }

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
      this.delivered = new Map(JSON.parse(localStorage.getItem(this.storageKey('delivery-receipts')) || '[]'));
      const storedNotifications = localStorage.getItem(this.storageKey('notifications'));
      if (storedNotifications) {
        const parsedNotifications = JSON.parse(storedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp),
          expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
          snoozedUntil: n.snoozedUntil ? new Date(n.snoozedUntil) : undefined
        }));
        this.notifications = this.dedupeNotifications(parsedNotifications);
        if (this.notifications.length !== parsedNotifications.length) {
          this.persistData();
        }
      }

      const storedSettings = localStorage.getItem(this.storageKey('notification-settings'));
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        this.settings = {
          ...this.settings,
          ...parsedSettings,
          channels: {
            ...this.settings.channels,
            ...(parsedSettings.channels ?? {}),
          },
          quietHours: {
            ...this.settings.quietHours,
            ...(parsedSettings.quietHours ?? {}),
          },
        };
      }

      const storedReminders = localStorage.getItem(this.storageKey('reminders'));
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
      if (this.settings.enabled && this.settings.channels.browser && this.checkPermission().granted) {
        this.reminders.filter((reminder) => reminder.status === 'pending' && reminder.scheduledFor > new Date())
          .forEach((reminder) => this.scheduleBrowserReminder(reminder));
      }
    } catch (error) {
      console.error('Failed to load persisted notification data:', error);
    }
  }

  /**
   * Persist notification data to localStorage
   */
  private persistData() {
    try {
      if (!this.familyId || !this.personId) return;
      // A bounded receipt ledger outlives inbox retention and dismissal.
      const sharedReceipts: [string, number][] = JSON.parse(localStorage.getItem(this.storageKey('delivery-receipts')) || '[]');
      this.delivered = new Map([...new Map([...sharedReceipts, ...this.delivered])].slice(-2000));
      localStorage.setItem(this.storageKey('delivery-receipts'), JSON.stringify([...this.delivered]));
      localStorage.setItem(this.storageKey('notifications'), JSON.stringify(this.notifications));
      localStorage.setItem(this.storageKey('notification-settings'), JSON.stringify(this.settings));
      localStorage.setItem(this.storageKey('reminders'), JSON.stringify(this.reminders));
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
        push: true,
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
      if (this.settings.channels.push) await this.syncPushSubscription();
    }

    return result;
  }

  async syncPushSubscription(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    if (!this.familyId || typeof window === 'undefined') return;
    if (!this.personId || !this.settings.channels.push || !this.settings.enabled) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (!this.checkPermission().granted) return;

    if (this.pushSubscriptionInFlight) {
      return this.pushSubscriptionInFlight;
    }

    this.pushSubscriptionInFlight = this.registerPushSubscription()
      .finally(() => {
        this.pushSubscriptionInFlight = null;
      });

    return this.pushSubscriptionInFlight;
  }

  private async registerPushSubscription(): Promise<void> {
    const registration = await this.getReadyServiceWorkerRegistration();
    this.serviceWorkerRegistration = registration;

    const keyResponse = await fetch('/api/push/vapid-public-key');
    if (!keyResponse.ok) {
      throw new Error('Unable to fetch push notification key');
    }

    const keyPayload = await keyResponse.json();
    if (!keyPayload.configured || !keyPayload.publicKey) {
      throw new Error('Push notifications are not configured on the server');
    }

    const applicationServerKey = this.urlBase64ToArrayBuffer(keyPayload.publicKey);
    const existingSubscription = await registration.pushManager.getSubscription();
    const subscription = existingSubscription ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });

    const response = await fetch(`/api/families/${this.familyId}/push-subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: navigator.userAgent,
        deviceLabel: this.getDeviceLabel(),
        enabled: this.settings.channels.push && this.settings.enabled,
      }),
    });

    if (!response.ok) {
      throw new Error('Unable to save push notification subscription');
    }
  }

  private async getReadyServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
    if (this.serviceWorkerRegistration) {
      return this.serviceWorkerRegistration;
    }

    await navigator.serviceWorker.register('/sw.js');
    const registration = await navigator.serviceWorker.ready;
    this.serviceWorkerRegistration = registration;
    return registration;
  }

  private urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; i += 1) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray.buffer as ArrayBuffer;
  }

  private getDeviceLabel(): string {
    const userAgent = navigator.userAgent;
    if (/Android/i.test(userAgent)) return 'Android phone';
    if (/iPhone/i.test(userAgent)) return 'iPhone';
    if (/iPad/i.test(userAgent)) return 'iPad';
    return 'Web browser';
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
      const previous = this.reminderTimeouts.get(reminder.id);
      if (previous) clearTimeout(previous);
      const timeout = setTimeout(() => {
        this.reminderTimeouts.delete(reminder.id);
        if (!this.reminders.some((item) => item.id === reminder.id) || reminder.status !== 'pending') return;
        if (reminder.scheduledFor > new Date()) this.scheduleBrowserReminder(reminder);
        else void this.deliverBrowserReminder(reminder);
      }, Math.min(timeUntilReminder, 2_147_483_647));
      this.reminderTimeouts.set(reminder.id, timeout);
    }
  }

  /**
   * Deliver browser push notification
   */
  private async deliverBrowserReminder(reminder: NotificationReminder) {
    const version = this.scopeVersion;
    const deliver = async () => {
      if (version !== this.scopeVersion) return;
      await this.deliverBrowserReminderOnce(reminder);
    };
    if (typeof navigator !== 'undefined' && navigator.locks?.request) {
      await navigator.locks.request(`${this.storageKey('browser-delivery')}:${reminder.eventId}:${reminder.scheduledFor.toISOString()}`, deliver);
    } else {
      await deliver();
    }
  }

  private async deliverBrowserReminderOnce(reminder: NotificationReminder) {
    if (!this.settings.enabled || !this.settings.channels.browser || !this.personId ||
        !this.checkPermission().granted || !reminder.metadata || reminder.status !== 'pending') return;
    const deliveryKey = `browser:${reminder.eventId}:${reminder.scheduledFor.toISOString()}`;
    try {
      const sharedReceipts: [string, number][] = JSON.parse(localStorage.getItem(this.storageKey('delivery-receipts')) || '[]');
      this.delivered = new Map([...this.delivered, ...sharedReceipts]);
    } catch (error) {
      console.warn('Unable to refresh shared delivery receipts:', error);
    }
    const startsAt = reminder.metadata.startsAt ? new Date(reminder.metadata.startsAt).getTime() : Infinity;
    if (this.delivered.has(deliveryKey) || Date.now() - reminder.scheduledFor.getTime() > 5 * 60_000 || startsAt <= Date.now()) {
      reminder.status = 'sent';
      this.persistData();
      return;
    }

    // Check quiet hours
    if (this.isQuietHours()) {
      this.snoozeUntilQuietHoursEnd(reminder);
      return;
    }

    try {
      this.delivered.set(deliveryKey, Date.now());
      this.persistData();
      const notification = new Notification(reminder.metadata.title, {
        body: reminder.metadata.body,
        icon: reminder.metadata.icon || '/icons/calendar-icon.png',
        badge: reminder.metadata.badge || '/icons/badge-icon.png',
        tag: reminder.metadata.tag || `event-${reminder.eventId}`,
        data: reminder.metadata.data,
        requireInteraction: false
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
      icon: reminder.metadata?.iconEmoji,
      priority: 'medium',
      category: 'event',
      read: false,
      actionRequired: false,
      relatedEventId: reminder.eventId,
      metadata: {
        eventIcon: reminder.metadata?.iconEmoji,
        eventType: reminder.metadata?.eventType,
        eventLocation: reminder.metadata?.location,
        eventStartsAt: reminder.metadata?.startsAt,
      },
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
    const timeout = this.reminderTimeouts.get(reminderId);
    if (timeout) clearTimeout(timeout);
    this.reminderTimeouts.delete(reminderId);
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
    await this.binding;
    const metadata = notificationData.metadata;
    const dedupeKey = metadata?.dedupeKey;
    const metadataType = metadata?.type;
    const metadataNodeId = metadata?.nodeId;

    const titleDedupeKey =
      notificationData.type === 'system' && notificationData.title === 'Enable Notifications?'
        ? 'system-enable-browser-notifications'
        : null;

    if (dedupeKey || titleDedupeKey || (metadataType && metadataNodeId)) {
      const existing = this.notifications.find(
        (notification) =>
          (dedupeKey && notification.metadata?.dedupeKey === dedupeKey) ||
          (titleDedupeKey && notification.type === 'system' && notification.title === notificationData.title) ||
          (
            metadataType &&
            metadataNodeId &&
            notification.metadata?.type === metadataType &&
            notification.metadata?.nodeId === metadataNodeId
          )
      );
      if (existing) return existing;
    }

    const notification: InAppNotification = {
      id: this.generateId('notification'),
      timestamp: new Date(),
      ...notificationData,
      read: notificationData.read
    };

    const receiptKey = dedupeKey || titleDedupeKey || (metadataType && metadataNodeId ? `${metadataType}:${metadataNodeId}` : null);
    if (!this.familyId || !this.personId || (receiptKey && this.delivered.has(receiptKey))) return notification;
    if (receiptKey) this.delivered.set(receiptKey, Date.now());

    this.notifications.unshift(notification);

    // Limit to 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }

    this.persistData();
    this.notifySubscribers();

    if (this.familyId) {
      // Best-effort persistence; localStorage remains the offline cache.
      const version = this.scopeVersion;
      fetch(`/api/families/${this.familyId}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notification,
          timestamp: notification.timestamp.toISOString(),
          expiresAt: notification.expiresAt?.toISOString(),
          snoozedUntil: notification.snoozedUntil?.toISOString(),
        }),
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Notification persistence failed: ${response.status}`);
        const saved = await response.json();
        if (version !== this.scopeVersion) return;
        this.notifications = this.notifications.filter((item) => item.id !== notification.id && item.id !== saved.id);
        this.notifications.unshift({ ...saved, timestamp: new Date(saved.timestamp),
          expiresAt: saved.expiresAt ? new Date(saved.expiresAt) : undefined,
          snoozedUntil: saved.snoozedUntil ? new Date(saved.snoozedUntil) : undefined,
          metadata: { ...saved.metadata, serverBacked: true } });
        this.persistData();
        this.notifySubscribers();
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

  async getHistory(offset = 0): Promise<InAppNotification[]> {
    await this.binding;
    if (!this.familyId || !this.personId) return [];
    const version = this.scopeVersion;
    const response = await fetch(`/api/families/${this.familyId}/notifications?includeHistory=true&limit=100&offset=${offset}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Unable to load notification history.');
    const saved = await response.json();
    if (version !== this.scopeVersion) return [];
    return saved.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp),
      expiresAt: n.expiresAt ? new Date(n.expiresAt) : undefined,
      snoozedUntil: n.snoozedUntil ? new Date(n.snoozedUntil) : undefined }));
  }

  async getDeviceDeliveryState(): Promise<{ connection: string; acceptance: string }> {
    const acceptance = localStorage.getItem(this.storageKey('last-push-acceptance'));
    const registration = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      ? await navigator.serviceWorker.getRegistration('/sw.js') : undefined;
    const subscription = await registration?.pushManager.getSubscription();
    return { connection: !this.checkPermission().granted ? 'Permission not granted' :
      subscription ? 'Browser subscribed; server connection unverified' : 'Not subscribed',
    acceptance: acceptance ? `${new Date(acceptance).toLocaleString('en-GB')} (provider accepted; device receipt unverified)` : 'No acceptance recorded on this device' };
  }

  recordPushAcceptance(): void {
    localStorage.setItem(this.storageKey('last-push-acceptance'), new Date().toISOString());
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification?.metadata?.canAct === false) throw new Error('Sign in as the named recipient.');
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
    this.getActiveNotifications().forEach(n => { if (n.metadata?.canAct !== false) n.read = true; });
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
    const notification = this.notifications.find((item) => item.id === notificationId);
    if (notification?.metadata?.canAct === false) throw new Error('Sign in as the named recipient.');
    if (notification && isFamilyReminder(notification)) {
      await this.applyReminderAction(notificationId, 'not_needed');
      return;
    }
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
    if (notification?.metadata?.canAct === false) throw new Error('Sign in as the named recipient.');
    if (!Number.isFinite(until.getTime()) || until.getTime() <= Date.now()) throw new Error('Choose a future snooze time.');
    if (notification && isFamilyReminder(notification)) {
      await this.applyReminderAction(notificationId, 'snooze', until);
      return;
    }
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
    if (this.familyId && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if ((!this.settings.channels.push || !this.settings.enabled) && subscription) {
        const response = await fetch(`/api/families/${this.familyId}/push-subscriptions`, {
          method: 'DELETE', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error('Could not disable this device subscription.');
      } else if (this.settings.channels.push && this.checkPermission().granted) await this.syncPushSubscription();
    }
    return { ...this.settings };
  }

  async applyReminderAction(id: string, action: FamilyReminderAction, until?: Date): Promise<{ url?: string }> {
    if (!this.familyId) throw new Error('Family account is not connected.');
    const notification = this.notifications.find((item) => item.id === id);
    if (notification?.metadata?.canAct === false) throw new Error('Sign in as the named recipient.');
    const response = await fetch(`/api/families/${this.familyId}/notifications/${id}/actions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, until: until?.toISOString() }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Could not update reminder.');
    await this.syncFromDatabase();
    return payload;
  }

  /**
   * Schedule reminders for a calendar event
   */
  async scheduleEventReminders(event: CalendarEvent): Promise<void> {
    await this.cancelEventReminders(event.id);
    // Travel is scheduled server-side; a second browser timer would duplicate private prompts.
    if (event.workStatus?.type === 'travel' || (event as CalendarEvent & { metadata?: { travel?: unknown } }).metadata?.travel) return;
    if (!this.settings.enabled || event.status === 'cancelled' || event.person !== this.personId) return;
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const eventIcon = getCalendarEventIcon(event);
    const reminderKey =
      event.type === 'education'
        ? 'school'
        : event.type === 'appointment'
        ? 'medical'
        : event.type === 'sport' || event.type === 'fitness'
        ? 'activities'
        : event.type === 'social'
        ? 'social'
        : 'other';
    const reminderTimes = event.reminders
      ? event.reminders.filter((reminder) => reminder.enabled && reminder.type === 'notification').map((reminder) => reminder.time)
      : this.settings.defaultReminders[reminderKey] || this.settings.defaultReminders.other;

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
            body: `${event.title} starts in ${this.formatDuration(minutesBefore)}.`,
            icon: '/icon-192x192.png',
            iconEmoji: eventIcon,
            badge: '/icon-96x96.png',
            tag: `event-${event.id}`,
            location: event.location,
            startsAt: eventDateTime.toISOString(),
            ...getEventNotificationMetadata(event),
            data: { eventId: event.id, type: 'reminder', url: '/?view=calendar' }
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
    clearTimeout(this.activityTimeout);
    const now = Date.now();
    const nextBoundary = this.notifications.flatMap(n => [n.expiresAt?.getTime(), n.snoozedUntil?.getTime()])
      .filter((time): time is number => time !== undefined && time > now).sort((a, b) => a - b)[0];
    if (nextBoundary !== undefined) {
      this.activityTimeout = setTimeout(() => this.notifySubscribers(), Math.min(nextBoundary - now, 2_147_483_647));
    }
  }

  // Get unread count
  getUnreadCount(): number {
    return this.getActiveNotifications().filter(n => isActionableNotification(n)).length;
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
        if (target.snoozedUntil && target.snoozedUntil.getTime() > Date.now()) {
          this.scheduleSnoozeWakeup(target);
          return;
        }
        target.snoozedUntil = undefined;
        this.persistData();
        this.notifySubscribers();
      }
      this.snoozeTimeouts.delete(notification.id);
    }, Math.min(delay, 2_147_483_647));

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

  private dedupeNotifications(notifications: InAppNotification[]): InAppNotification[] {
    const seen = new Set<string>();
    return notifications.filter((notification) => {
      const key =
        notification.metadata?.dedupeKey ||
        (
          notification.metadata?.type && notification.metadata?.nodeId
            ? `${notification.metadata.type}:${notification.metadata.nodeId}`
            : null
        ) ||
        (
          notification.type === 'system' && notification.title === 'Enable Notifications?'
            ? 'system-enable-browser-notifications'
            : null
        ) ||
        notification.id;

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private getActiveNotifications(): InAppNotification[] {
    const now = Date.now();
    return this.notifications.filter(notification => (
      (!notification.expiresAt || notification.expiresAt.getTime() > now) &&
      (!notification.snoozedUntil || notification.snoozedUntil.getTime() <= now) &&
      (!notification.recipientPersonId || notification.recipientPersonId === this.personId || notification.metadata?.recipientClaimed === false)
    ));
  }

  refreshActiveNotifications(): void {
    this.notifySubscribers();
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
