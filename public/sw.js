// Family Hub Service Worker – offline caching, install promotion helpers, push notifications

const APP_SHELL_CACHE = 'family-hub-app-shell-v2';
const RUNTIME_CACHE = 'family-hub-runtime-v2';
const MEDIA_CACHE = 'family-hub-media-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-256x256.png',
  '/icon-384x384.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png'
];

const APP_SHELL_URLS = new Set([
  '/',
  '/manifest.json',
  '/offline.html'
]);

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((error) => console.error('[ServiceWorker] Pre-cache failed', error))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheKeys = await caches.keys();
    await Promise.all(
      cacheKeys
        .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE, MEDIA_CACHE].includes(key))
        .map((key) => caches.delete(key))
    );

    if ('navigationPreload' in self.registration) {
      await self.registration.navigationPreload.enable();
    }

    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const acceptHeader = request.headers.get('accept') || '';

  if (request.mode === 'navigate' || (acceptHeader.includes('text/html') && isSameOrigin)) {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  if (isSameOrigin && (APP_SHELL_URLS.has(url.pathname) || url.pathname.startsWith('/icon'))) {
    event.respondWith(cacheFirst(request, APP_SHELL_CACHE));
    return;
  }

  if (isSameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  if (request.destination === 'image' || request.destination === 'font') {
    event.respondWith(staleWhileRevalidate(request, MEDIA_CACHE, { maxEntries: 40 }));
    return;
  }

  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

async function handleNavigationRequest(event) {
  const { request } = event;
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      return preload;
    }

    const networkResponse = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(APP_SHELL_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const offlineFallback = await cache.match(OFFLINE_URL);
    if (offlineFallback) {
      return offlineFallback;
    }
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await fetch(request);
  if (networkResponse && networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}

async function staleWhileRevalidate(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse && networkResponse.ok) {
        cache.put(request, networkResponse.clone());
        if (options.maxEntries) {
          limitCacheEntries(cache, options.maxEntries);
        }
      }
      return networkResponse;
    })
    .catch(() => undefined);

  if (cachedResponse) {
    fetchPromise.catch(() => undefined);
    return cachedResponse;
  }

  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }

  const fallback = await cache.match(request);
  if (fallback) {
    return fallback;
  }

  return new Response('', { status: 503, statusText: 'Service Unavailable' });
}

async function limitCacheEntries(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) {
    return;
  }
  await cache.delete(keys[0]);
  return limitCacheEntries(cache, maxEntries);
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  let notificationData = {
    title: 'Family Hub Reminder',
    body: 'You have an upcoming event',
    icon: '/icon.svg',
    badge: '/icon.svg',
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
          title: 'View Event'
        },
        {
          action: 'snooze',
          title: 'Snooze 10m'
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
  if (!event.data) {
    return;
  }

  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

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
          icon: notificationData.icon || '/icon.svg',
          badge: '/icon.svg',
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
