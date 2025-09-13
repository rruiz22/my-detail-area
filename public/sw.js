// Service Worker for Push Notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let notificationData = {
    title: 'My Detail Area',
    body: 'You have a new notification',
    icon: '/favicon-mda.svg',
    badge: '/favicon-mda.svg',
    tag: 'default',
    data: {}
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        ...notificationData,
        ...payload
      };
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
      data: notificationData.data,
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/favicon-mda.svg'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ],
      requireInteraction: notificationData.data?.priority === 'urgent',
      silent: false,
      vibrate: [200, 100, 200]
    }
  );

  event.waitUntil(promiseChain);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);
  
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no existing window, open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );

  // Track notification interaction
  if (event.notification.data?.notificationId) {
    fetch('/api/track-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
        action: event.action || 'clicked',
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to track notification:', err));
  }
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event);
  
  // Track notification dismissal
  if (event.notification.data?.notificationId) {
    fetch('/api/track-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: event.notification.data.notificationId,
        action: 'closed',
        timestamp: new Date().toISOString()
      })
    }).catch(err => console.error('Failed to track notification:', err));
  }
});

// Handle background sync for offline notifications
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-notification-sync') {
    event.waitUntil(syncOfflineNotifications());
  }
});

async function syncOfflineNotifications() {
  try {
    // Get stored offline notifications
    const cache = await caches.open('notifications-v1');
    const requests = await cache.keys();
    
    for (const request of requests) {
      if (request.url.includes('offline-notification')) {
        try {
          const response = await cache.match(request);
          const notificationData = await response.json();
          
          // Try to send the notification
          await fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationData)
          });
          
          // Remove from cache if successful
          await cache.delete(request);
        } catch (error) {
          console.error('Failed to sync notification:', error);
        }
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: '1.0.0' });
  }
});