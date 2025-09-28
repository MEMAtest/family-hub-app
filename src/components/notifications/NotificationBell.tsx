'use client'

import React, { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';
import NotificationCenter from './NotificationCenter';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const { unreadCount, permission, requestPermission } = useNotifications();
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

  const handleBellClick = async () => {
    // If permission not granted, request it first
    if (permission.prompt) {
      await requestPermission();
    }
    setIsNotificationCenterOpen(true);
  };

  return (
    <>
      <button
        onClick={handleBellClick}
        className={`relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors ${className}`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Notification badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Permission indicator */}
        {permission.prompt && (
          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full" />
        )}
      </button>

      {/* Notification Center */}
      <NotificationCenter
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
      />
    </>
  );
};

export default NotificationBell;