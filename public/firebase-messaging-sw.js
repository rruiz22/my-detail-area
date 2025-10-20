// Firebase Cloud Messaging Service Worker
// This file handles background push notifications from FCM

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

console.log('[FCM SW] Firebase Messaging Service Worker loaded');

// Firebase configuration
// IMPORTANT: These values must match your Firebase Console configuration
const firebaseConfig = {
  apiKey: 'AIzaSyD3QeCOdORBuMSpbeqsfML9lPS5wFMOXmQ',
  authDomain: 'my-detail-area.firebaseapp.com',
  projectId: 'my-detail-area',
  storageBucket: 'my-detail-area.firebasestorage.app',
  messagingSenderId: '242154179799',
  appId: '1:242154179799:web:7c5b71cdcdeedac9277492',
};

// VAPID Public Key (Web Push Certificate from Firebase Console - Current pair Oct 19, 2025)
// This must match VITE_FCM_VAPID_KEY in .env.local
const vapidKey = 'BKxpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8ZI6rOVVUgtVtn6LCpRj07anNaUSLnqO0PkpkXUPm6Q';

// Initialize Firebase app in service worker
try {
  firebase.initializeApp(firebaseConfig);
  console.log('[FCM SW] Firebase app initialized');
} catch (error) {
  console.error('[FCM SW] Firebase initialization error:', error);
}

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'My Detail Area';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/favicon-mda.svg',
    badge: '/favicon-mda.svg',
    tag: payload.data?.tag || 'default',
    data: {
      ...payload.data,
      url: payload.data?.url || '/',
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
  };

  console.log('[FCM SW] Showing notification:', notificationTitle);

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification click received:', event);

  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window/tab open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // Open a new window if none exists
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('[FCM SW] Notification closed:', event);
});

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[FCM SW] Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Service Worker activating');
  event.waitUntil(self.clients.claim());
});
