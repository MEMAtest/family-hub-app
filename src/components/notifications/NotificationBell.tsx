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
        className={`relative rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${className}`}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5" />
        ) : (
          <Bell className="w-5 h-5" />
        )}

        {/* Notification badge */}
        {unreadCount > 0 && (
          // `-right-1` already lifts the badge clear of the bell. The old
          // `translate-x-1/2` added half the badge's own width on top of that,
          // so a two-digit count sat ~16px beyond a button that is only 8px
          // from the screen edge — the "50" was clipped on every phone width.
          <span className="absolute -top-1 -right-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.625rem] font-bold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* Permission indicator */}
        {permission.prompt && (
          <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-yellow-400 dark:border-slate-900" />
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
