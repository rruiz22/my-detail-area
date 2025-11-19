/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

// 🔴 CRITICAL FIX: Skip waiting and claim clients immediately
self.skipWaiting();
clientsClaim();

// Precache all static assets
precacheAndRoute(self.__WB_MANIFEST);

// Clean up outdated caches
cleanupOutdatedCaches();

// 🔴 CRITICAL FIX: Custom NavigationRoute with redirect support
// Override default navigation handling to properly handle redirects
const navigationHandler = createHandlerBoundToURL('index.html');
const navigationRoute = new NavigationRoute(navigationHandler, {
  denylist: [
    // Don't intercept API calls
    /^\/api/,
    // Don't intercept translation files
    /^\/translations/,
    // Don't intercept static assets
    /\.(?:png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|otf|js|css)$/,
  ],
});
registerRoute(navigationRoute);

// 🔴 CRITICAL FIX: Cache translation JSON files with NetworkFirst
// ALWAYS tries network first (fresh translations)
// Falls back to cache only if network fails
registerRoute(
  /\/translations\/.*\.json$/,
  new NetworkFirst({
    cacheName: 'translations-cache',
    networkTimeoutSeconds: 20, // Increased for mobile (3G/4G)
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 5, // 5 minutes only - fresh translations
      }),
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Cache API responses from Supabase
registerRoute(
  ({ url }) => url.origin === 'https://swfnnrpzpkdypbrzmgnr.supabase.co',
  new NetworkFirst({
    cacheName: 'supabase-api-cache',
    networkTimeoutSeconds: 10,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
  })
);

// Cache static images
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache fonts
registerRoute(
  /\.(?:woff|woff2|ttf|otf)$/,
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// 🔴 CRITICAL FIX: Custom fetch handler to explicitly handle redirects
// This ensures all fetch requests follow redirects properly
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle navigation requests explicitly to ensure redirect: 'follow'
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Create a new request with explicit redirect: 'follow'
          const fetchRequest = new Request(request.url, {
            method: request.method,
            headers: request.headers,
            mode: request.mode,
            credentials: request.credentials,
            redirect: 'follow', // 🔴 CRITICAL: Explicitly follow redirects
          });

          // Fetch with redirect support
          const response = await fetch(fetchRequest);

          // If successful, return the response
          if (response.ok || response.type === 'opaqueredirect') {
            return response;
          }

          // If not found, fall back to index.html for SPA routing
          if (response.status === 404) {
            const cache = await caches.open('workbox-precache-v2-' + self.registration.scope);
            const cachedResponse = await cache.match('index.html');
            if (cachedResponse) {
              return cachedResponse;
            }
          }

          return response;
        } catch (error) {
          console.error('Navigation fetch failed:', error);

          // Fall back to cached index.html
          const cache = await caches.open('workbox-precache-v2-' + self.registration.scope);
          const cachedResponse = await cache.match('index.html');
          if (cachedResponse) {
            return cachedResponse;
          }

          // If all else fails, return a basic error response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          });
        }
      })()
    );
  }
});
