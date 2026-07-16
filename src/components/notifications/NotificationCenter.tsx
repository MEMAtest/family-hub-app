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
  Smartphone,
  type LucideIcon
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

  const getNotificationIconTone = (notification: InAppNotification) => {
    if (notification.category === 'event' || notification.type === 'reminder') {
      return 'bg-[#eaf1e7] text-[#147c72] ring-[#b8d8d1] dark:bg-[#147c72]/20 dark:text-[#7ddbd0] dark:ring-[#56c6b8]/25';
    }
    if (notification.type === 'conflict' || notification.category === 'conflict') {
      return 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-300/25';
    }
    if (notification.type === 'sync') {
      return 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:ring-blue-300/25';
    }
    if (notification.category === 'error' || notification.priority === 'urgent') {
      return 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-300/25';
    }
    return 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700';
  };

  const renderIconFrame = (
    notification: InAppNotification,
    content: React.ReactNode,
    label?: string
  ) => (
    <span
      className={`flex h-9 w-9 items-center justify-center rounded-lg shadow-sm ring-1 ${getNotificationIconTone(notification)}`}
      aria-label={label}
    >
      {content}
    </span>
  );

  const renderLucideIcon = (
    notification: InAppNotification,
    Icon: LucideIcon,
    label: string
  ) => renderIconFrame(notification, <Icon className="h-4 w-4" />, label);

  // Get notification icon
  const getNotificationIcon = (notification: InAppNotification) => {
    const iconValue = notification.metadata?.eventIcon || notification.metadata?.iconEmoji || notification.icon;
    const isUrlIcon = typeof iconValue === 'string' && /^(\/|https?:\/\/|data:image\/)/i.test(iconValue);

    if (isUrlIcon) {
      return renderIconFrame(notification, <img src={iconValue} alt="" className="h-5 w-5" />);
    }

    if (iconValue) {
      return renderIconFrame(notification, <span className="text-lg leading-none">{iconValue}</span>);
    }

    switch (notification.type) {
      case 'reminder':
        return renderLucideIcon(notification, Bell, 'Reminder');
      case 'conflict':
        return renderLucideIcon(notification, AlertTriangle, 'Conflict');
      case 'sync':
        return renderLucideIcon(notification, Calendar, 'Calendar sync');
      case 'system':
        return renderLucideIcon(notification, Info, 'System');
      default:
        return renderLucideIcon(notification, Bell, 'Notification');
    }
  };

  // Get notification color
  const getNotificationColor = (notification: InAppNotification) => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-red-200 border-l-red-500 bg-red-50/95 dark:border-red-900/60 dark:border-l-red-400 dark:bg-red-950/35';
      case 'high':
        return 'border-orange-200 border-l-orange-500 bg-orange-50/95 dark:border-orange-900/60 dark:border-l-orange-300 dark:bg-orange-950/35';
      case 'medium':
        return 'border-[#b8d8d1] border-l-[#147c72] bg-[#f1f7f4] dark:border-[#147c72]/35 dark:border-l-[#56c6b8] dark:bg-[#12302d]/55';
      case 'low':
        return 'border-slate-200 border-l-slate-500 bg-slate-50 dark:border-slate-700 dark:border-l-slate-400 dark:bg-slate-800/80';
      default:
        return 'border-slate-200 border-l-slate-300 bg-white dark:border-slate-700 dark:border-l-slate-500 dark:bg-slate-900';
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
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 dark:bg-[#111a22] dark:text-slate-100 dark:ring-white/10">
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
                  className="p-1 text-gray-600 transition-colors hover:bg-gray-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 text-gray-600 transition-colors hover:bg-gray-100 rounded-md dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Close"
                >
                  <X className="w-4 h-4" />
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
          <div className="flex-1 overflow-y-auto bg-gray-50/70 dark:bg-[#0b1117]">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-slate-400">
                <Bell className="w-12 h-12 text-gray-300 mb-2 dark:text-slate-700" />
                <p className="text-sm">
                  {searchTerm ? 'No matching notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`rounded-lg border border-l-4 p-4 shadow-sm transition-colors ${getNotificationColor(notification)} ${notification.read ? 'opacity-80' : 'opacity-100'}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-950 dark:text-slate-50' : 'text-gray-600 dark:text-slate-300'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              !notification.read ? 'text-gray-700 dark:text-slate-200' : 'text-gray-500 dark:text-slate-400'
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
                                className="p-1 rounded text-gray-600 transition-colors hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}

                            {/* Snooze dropdown */}
                            <div className="relative group">
                              <button
                                className="p-1 rounded text-gray-600 transition-colors hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10"
                                title="Snooze"
                              >
                                <Clock className="w-3 h-3" />
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
                              className="p-1 rounded text-gray-600 transition-colors hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/10"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Actions */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
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
