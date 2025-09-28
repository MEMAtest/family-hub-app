'use client'

import React, { useState, useEffect } from 'react';
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
  Filter,
  Search,
  ChevronDown,
  Volume2,
  VolumeX
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
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
    markAsRead,
    markAllAsRead,
    clearNotification,
    snoozeNotification,
    settings,
    updateSettings
  } = useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'today'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);

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
    if (notification.icon) return notification.icon;

    switch (notification.type) {
      case 'reminder':
        return <Bell className="w-4 h-4" />;
      case 'conflict':
        return <AlertTriangle className="w-4 h-4" />;
      case 'sync':
        return <Calendar className="w-4 h-4" />;
      case 'system':
        return <Info className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  // Get notification color
  const getNotificationColor = (notification: InAppNotification) => {
    switch (notification.priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-blue-500 bg-blue-50';
      case 'low':
        return 'border-l-gray-500 bg-gray-50';
      default:
        return 'border-l-gray-300 bg-white';
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
        // Navigate to event view
        console.log('Navigate to event:', notification.relatedEventId);
        break;
      case 'request_permission':
        // This would trigger permission request
        console.log('Request permission');
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

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 ${className}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h2>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Settings"
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-gray-600" />
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters and Actions */}
              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  {(['all', 'unread', 'today'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        filter === filterOption
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                    </button>
                  ))}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-blue-600 hover:text-blue-700 transition-colors"
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
            <div className="border-b border-gray-200 p-4 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Settings</h3>
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
                  <span className="text-sm text-gray-700">Browser notifications</span>
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
                  <span className="text-sm text-gray-700">Quiet hours</span>
                </label>
              </div>
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Bell className="w-12 h-12 text-gray-300 mb-2" />
                <p className="text-sm">
                  {searchTerm ? 'No matching notifications' : 'No notifications'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification)} ${
                      !notification.read ? 'bg-opacity-100' : 'bg-opacity-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-600'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className={`text-sm mt-1 ${
                              !notification.read ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.timestamp.toLocaleString()}
                            </p>
                          </div>

                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                                title="Mark as read"
                              >
                                <Check className="w-3 h-3 text-gray-600" />
                              </button>
                            )}

                            {/* Snooze dropdown */}
                            <div className="relative group">
                              <button
                                className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                                title="Snooze"
                              >
                                <Clock className="w-3 h-3 text-gray-600" />
                              </button>
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                {snoozeOptions.map((option) => (
                                  <button
                                    key={option.label}
                                    onClick={() => handleSnooze(notification, option.minutes)}
                                    className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              onClick={() => clearNotification(notification.id)}
                              className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3 text-gray-600" />
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
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
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
};

export default NotificationCenter;