'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  NotificationContextType,
  InAppNotification,
  NotificationSettings,
  NotificationPermission
} from '@/types/notification.types';
import { CalendarEvent } from '@/types/calendar.types';
import notificationService from '@/services/notificationService';
import { useFamilyStore } from '@/store/familyStore';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>({ granted: false, denied: false, prompt: true });
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const isConnected = useFamilyStore((state) => state.databaseStatus.connected);

  // Initialize notification service
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check permission status
        const currentPermission = notificationService.checkPermission();
        setPermission(currentPermission);

        // Load settings
        const currentSettings = await notificationService.getSettings();
        setSettings(currentSettings);

        // Load notifications
        const currentNotifications = await notificationService.getNotifications();
        setNotifications(currentNotifications);

        // Subscribe to real-time updates
        const unsubscribe = notificationService.subscribe((updatedNotifications) => {
          setNotifications(updatedNotifications);
        });

        return unsubscribe;
      } catch (error) {
        console.error('Failed to initialize notifications:', error);
      }
    };

    const cleanup = initializeNotifications();

    return () => {
      cleanup?.then(unsubscribe => unsubscribe?.());
    };
  }, []);

  // Bind to current family and sync DB-backed notifications (offline-first)
  useEffect(() => {
    notificationService.setFamilyId(familyId);
    if (isConnected && familyId) {
      void notificationService.syncFromDatabase();
    }
  }, [familyId, isConnected]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    try {
      const newPermission = await notificationService.requestPermission();
      setPermission(newPermission);

      if (newPermission.granted) {
        await notificationService.showNotification({
          type: 'system',
          title: 'Notifications Enabled!',
          message: 'You\'ll now receive reminders for your calendar events.',
          priority: 'medium',
          category: 'system',
          read: false,
          actionRequired: false,
          icon: '🔔'
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      await notificationService.showNotification({
        type: 'system',
        title: 'Permission Required',
        message: 'Please enable notifications in your browser settings to receive event reminders.',
        priority: 'high',
        category: 'system',
        read: false,
        actionRequired: true
      });
    }
  }, []);

  // Show notification
  const showNotification = useCallback(async (notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    try {
      await notificationService.showNotification(notification);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Clear notification
  const clearNotification = useCallback(async (id: string) => {
    try {
      await notificationService.clearNotification(id);
    } catch (error) {
      console.error('Failed to clear notification:', error);
    }
  }, []);

  // Snooze notification
  const snoozeNotification = useCallback(async (id: string, until: Date) => {
    try {
      await notificationService.snoozeNotification(id, until);
    } catch (error) {
      console.error('Failed to snooze notification:', error);
    }
  }, []);

  // Update settings
  const updateSettings = useCallback(async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = await notificationService.updateSettings(newSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  }, []);

  // Schedule event reminders
  const scheduleEventReminders = useCallback(async (eventId: string, eventDate: Date, eventType: string) => {
    try {
      // This would be implemented when we have the full event object
      console.log('Scheduling reminders for event:', eventId, eventDate, eventType);
    } catch (error) {
      console.error('Failed to schedule event reminders:', error);
    }
  }, []);

  // Cancel event reminders
  const cancelEventReminders = useCallback(async (eventId: string) => {
    try {
      await notificationService.cancelEventReminders(eventId);
    } catch (error) {
      console.error('Failed to cancel event reminders:', error);
    }
  }, []);

  // Auto-request permission on first event creation
  useEffect(() => {
    const hasEvents = notifications.some(n => n.type === 'reminder');
    if (hasEvents && permission.prompt && !permission.granted && !permission.denied) {
      // Show a subtle prompt to enable notifications
      showNotification({
        type: 'system',
        title: 'Enable Notifications?',
        message: 'Get reminders for your calendar events',
        priority: 'medium',
        category: 'system',
        read: false,
        actionRequired: true,
        actions: [
          { id: 'enable', label: 'Enable', type: 'primary', action: 'request_permission' },
          { id: 'later', label: 'Maybe Later', type: 'secondary', action: 'dismiss' }
        ]
      });
    }
  }, [notifications, permission, showNotification]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    permission,
    settings: settings || {
      enabled: true,
      channels: { browser: true, email: false, inApp: true },
      defaultReminders: {
        school: [1440, 60],
        medical: [10080, 1440, 60],
        activities: [60, 15],
        social: [1440, 60],
        other: [60]
      },
      quietHours: { enabled: true, start: '22:00', end: '07:00' },
      emailFrequency: 'daily_digest'
    },

    // Actions
    requestPermission,
    showNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    snoozeNotification,
    updateSettings,
    scheduleEventReminders,
    cancelEventReminders
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Custom hook to use notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationContext;
