'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  Info,
  Calendar,
  Settings,
  Trash2,
  Search,
  Send,
  Smartphone
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFamilyStore } from '@/store/familyStore';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import { InAppNotification } from '@/types/notification.types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  className = ''
}) => {
  const {
    notifications,
    unreadCount,
    requestPermission,
    markAsRead,
    markAllAsRead,
    clearNotification,
    snoozeNotification,
    settings,
    updateSettings
  } = useNotifications();

  const setActiveBrainProject = useFamilyStore((s) => s.setActiveBrainProject);
  const familyId = useFamilyStore((s) => s.databaseStatus.familyId);
  const { setView } = useAppView();

  const [filter, setFilter] = useState<'all' | 'unread' | 'today'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [sendingPushTest, setSendingPushTest] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter notifications based on current filter
  const filteredNotifications = notifications.filter(notification => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!notification.title.toLowerCase().includes(searchLower) &&
          !notification.message.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'today':
        const today = new Date();
        return notification.timestamp.toDateString() === today.toDateString();
      default:
        return true;
    }
  });

  // Get notification icon
  const getNotificationIcon = (notification: InAppNotification) => {
    const emojiIcon = notification.icon || notification.metadata?.eventIcon || notification.metadata?.iconEmoji;
    if (emojiIcon) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-lg shadow-sm ring-1 ring-gray-200 dark:bg-slate-950 dark:ring-slate-700">
          {emojiIcon}
        </span>
      );
    }

    switch (notification.type) {
      case 'reminder':
        return <Bell className="w-4 h-4 text-blue-600 dark:text-blue-300" />;
      case 'conflict':
        return <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-300" />;
      case 'sync':
        return <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />;
      case 'system':
        return <Info className="w-4 h-4 text-slate-600 dark:text-slate-300" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600 dark:text-blue-300" />;
    }
  };

  // Get notification color
  const getNotificationColor = (notification: InAppNotification) => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-500/10';
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-500/10';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-500/10';
      case 'low':
        return 'border-l-gray-500 bg-gray-50 dark:bg-slate-800/80';
      default:
        return 'border-l-gray-300 bg-white dark:border-l-slate-600 dark:bg-slate-900';
    }
  };

  // Handle notification action
  const handleNotificationAction = async (notification: InAppNotification, actionId: string) => {
    const action = notification.actions?.find(a => a.id === actionId);
    if (!action) return;

    switch (action.action) {
      case 'mark_done':
        await markAsRead(notification.id);
        break;
      case 'dismiss':
        await clearNotification(notification.id);
        break;
      case 'snooze':
        const snoozeTime = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        await snoozeNotification(notification.id, snoozeTime);
        break;
      case 'view_event':
      case 'view_calendar':
        setView('calendar');
        await markAsRead(notification.id);
        onClose();
        break;
      case 'view_brain_node': {
        const { projectId, url } = action.data || {};
        if (projectId) {
          setActiveBrainProject(projectId);
          setView('brain');
        } else if (typeof url === 'string' && url.includes('view=brain')) {
          setView('brain');
        }
        await markAsRead(notification.id);
        onClose();
        break;
      }
      case 'request_permission':
        await requestPermission();
        await markAsRead(notification.id);
        break;
      default:
        console.log('Unknown action:', action.action);
    }
  };

  // Snooze options
  const snoozeOptions = [
    { label: '10 minutes', minutes: 10 },
    { label: '1 hour', minutes: 60 },
    { label: '3 hours', minutes: 180 },
    { label: 'Tomorrow 9 AM', minutes: 'tomorrow' }
  ];

  const handleSnooze = async (notification: InAppNotification, minutes: number | string) => {
    let snoozeUntil: Date;

    if (minutes === 'tomorrow') {
      snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + 1);
      snoozeUntil.setHours(9, 0, 0, 0);
    } else {
      snoozeUntil = new Date(Date.now() + (minutes as number) * 60 * 1000);
    }

    await snoozeNotification(notification.id, snoozeUntil);
  };

  const handlePushToggle = async (enabled: boolean) => {
    setPushStatus(null);

    if (!enabled) {
      await updateSettings({
        channels: { ...settings.channels, push: false }
      });
      setPushStatus('Push notifications are off for this browser.');
      return;
    }

    await updateSettings({
      channels: { ...settings.channels, push: true, browser: true }
    });
    await requestPermission();
    setPushStatus('This device is ready for Family Hub push notifications.');
  };

  const handleSendPushTest = async () => {
    if (!familyId) {
      setPushStatus('Family database is still connecting. Try again in a moment.');
      return;
    }

    setSendingPushTest(true);
    setPushStatus(null);

    try {
      const response = await fetch(`/api/families/${familyId}/push-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to send test notification');
      }

      if (payload.sent > 0) {
        setPushStatus(`Sent ${payload.sent} test notification${payload.sent === 1 ? '' : 's'} to subscribed devices.`);
      } else {
        setPushStatus('No device subscriptions yet. Enable push on your Android phone first.');
      }
    } catch (error) {
      setPushStatus(error instanceof Error ? error.message : 'Unable to send test notification');
    } finally {
      setSendingPushTest(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const content = (
    <div className={`fixed inset-0 z-[100] ${className}`} role="dialog" aria-modal="true" aria-label="Notifications">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl dark:bg-slate-900">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-gray-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-200">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors dark:hover:bg-slate-800"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors dark:hover:bg-slate-800"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                </button>
              </div>
            </div>

            {/* Controls */}
            <div className="mt-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Filters and Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-1">
                  {(['all', 'unread', 'today'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        filter === filterOption
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                    </button>
                  ))}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="ml-auto text-sm text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="border-b border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-slate-100">Quick Settings</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.channels.browser}
                    onChange={(e) => updateSettings({
                      channels: { ...settings.channels, browser: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">Browser notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.channels.push}
                    onChange={(e) => handlePushToggle(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <Smartphone className="h-4 w-4" />
                    Push notifications to this device
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.quietHours.enabled}
                    onChange={(e) => updateSettings({
                      quietHours: { ...settings.quietHours, enabled: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">Quiet hours</span>
                </label>
                <button
                  type="button"
                  onClick={handleSendPushTest}
                  disabled={sendingPushTest}
                  className="mt-2 inline-flex items-center gap-2 rounded-md bg-[#4c8177] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#3d6f66] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {sendingPushTest ? 'Sending...' : 'Send test notification'}
                </button>
                {pushStatus && (
                  <p className="text-xs text-gray-600 dark:text-slate-400">{pushStatus}</p>
                )}
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400">
                <Bell className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm">
                  {searchTerm ? 'No matching notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-slate-800">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification)} ${ !notification.read ? 'bg-opacity-100' : 'bg-opacity-50' } dark:bg-opacity-80`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              !notification.read ? 'text-gray-700 dark:text-slate-300' : 'text-gray-500 dark:text-slate-400'
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1 dark:text-slate-500">
                              {notification.timestamp.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors dark:hover:bg-slate-800"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3 text-gray-600 dark:text-slate-300" />
                              </button>
                            )}

                            {/* Snooze dropdown */}
                            <div className="relative group">
                              <button
                                className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors dark:hover:bg-slate-800"
                                title="Snooze"
                              >
                                <Clock className="w-3 h-3 text-gray-600 dark:text-slate-300" />
                              </button>
                              <div className="invisible absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-gray-200 bg-white opacity-0 shadow-lg transition-all duration-200 group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
                                {snoozeOptions.map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={() => handleSnooze(notification, option.minutes)}
                                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-800"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => clearNotification(notification.id)}
                              className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors dark:hover:bg-slate-800"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3 text-gray-600 dark:text-slate-300" />
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex space-x-2 mt-3">
                            {notification.actions.map((action) => (
                              <button
                                key={action.id}
                                onClick={() => handleNotificationAction(notification, action.id)}
                                className={`px-3 py-1 text-xs rounded transition-colors ${
                                  action.type === 'primary'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : action.type === 'danger'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default NotificationCenter;
