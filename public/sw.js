// Family Hub Service Worker for Push Notifications

const CACHE_NAME = 'family-hub-v1';
const urlsToCache = [
  '/'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event for offline support
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'Family Hub Reminder',
    body: 'You have an upcoming event',
    icon: '/icons/calendar-icon.png',
    badge: '/icons/badge-icon.png',
    tag: 'family-hub-reminder',
    requireInteraction: true,
    data: {}
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: [
        {
          action: 'view',
          title: 'View Event',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'snooze',
          title: 'Snooze 10m',
          icon: '/icons/snooze-icon.png'
        }
      ]
    }
  );

  event.waitUntil(promiseChain);
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);

  event.notification.close();

  const clickedAction = event.action;
  const notificationData = event.notification.data || {};

  if (clickedAction === 'view') {
    // Open the app and navigate to the event
    const urlToOpen = notificationData.eventId
      ? `/?event=${notificationData.eventId}`
      : '/';

    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICKED',
              eventId: notificationData.eventId,
              action: 'view'
            });
            return;
          }
        }

        // Open new window if app not open
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  } else if (clickedAction === 'snooze') {
    // Send snooze message to app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({
            type: 'NOTIFICATION_SNOOZED',
            eventId: notificationData.eventId,
            snoozeMinutes: 10
          });
        });
      })
    );
  } else {
    // Default click action - open app
    const urlToOpen = '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(
      // Sync pending notifications when back online
      syncPendingNotifications()
    );
  }
});

async function syncPendingNotifications() {
  try {
    // Get pending notifications from IndexedDB or other storage
    // This would sync with the server when back online
    console.log('Syncing pending notifications...');
  } catch (error) {
    console.error('Error syncing notifications:', error);
  }
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service worker received message:', event.data);

  const { type, data } = event.data;

  switch (type) {
    case 'SCHEDULE_NOTIFICATION':
      scheduleNotification(data);
      break;
    case 'CANCEL_NOTIFICATION':
      cancelNotification(data.notificationId);
      break;
    case 'UPDATE_SETTINGS':
      updateNotificationSettings(data.settings);
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

function scheduleNotification(notificationData) {
  // Schedule a notification to be shown at a specific time
  const delay = new Date(notificationData.scheduledFor).getTime() - Date.now();

  if (delay > 0) {
    setTimeout(() => {
      self.registration.showNotification(
        notificationData.title,
        {
          body: notificationData.body,
          icon: notificationData.icon || '/icons/calendar-icon.png',
          badge: '/icons/badge-icon.png',
          tag: notificationData.tag || 'family-hub-reminder',
          data: notificationData.data,
          requireInteraction: true
        }
      );
    }, delay);
  }
}

function cancelNotification(notificationId) {
  // Cancel a scheduled notification
  console.log('Cancelling notification:', notificationId);
}

function updateNotificationSettings(settings) {
  // Update notification preferences
  console.log('Updating notification settings:', settings);
}

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);

  // Track notification dismissal analytics if needed
  const notificationData = event.notification.data || {};

  // Send message to app about dismissal
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      clientList.forEach((client) => {
        client.postMessage({
          type: 'NOTIFICATION_DISMISSED',
          eventId: notificationData.eventId,
          tag: event.notification.tag
        });
      });
    })
  );
});