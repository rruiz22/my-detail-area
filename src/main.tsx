// Import network error suppressor FIRST to catch all errors
import "./utils/networkErrorSuppressor";
// Import WebGL blocker SECOND to force CPU-only mode for face-api.js
import "./utils/disableWebGL";

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./styles/order-animations.css";
import "./lib/i18n";
import packageJson from "../package.json";

// 🔴 CRITICAL FIX: Version-based Service Worker invalidation
// Automatically unregisters SW and clears all caches when version changes
// This prevents "Translation Loading Failed" and stale cache issues
const CURRENT_VERSION = packageJson.version;
const SW_VERSION_KEY = 'sw_version';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async registrations => {
    const cachedVersion = localStorage.getItem(SW_VERSION_KEY);

    // 🔴 VERSION MISMATCH: Force clear all service workers and caches
    if (cachedVersion && cachedVersion !== CURRENT_VERSION) {
      console.warn(`🔄 Version changed: ${cachedVersion} → ${CURRENT_VERSION}`);
      console.log('🗑️ Clearing all service workers and caches...');

      // Unregister all service workers
      for (const registration of registrations) {
        await registration.unregister();
      }

      // Clear all caches (translations, API, images)
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName);
      }

      // Update version and force reload
      localStorage.setItem(SW_VERSION_KEY, CURRENT_VERSION);
      console.log('✅ Cache cleared. Reloading app...');
      window.location.reload();
      return; // Exit early - reload will re-register SW
    }

    // 🔴 FIRST TIME or SAME VERSION: Normal SW management
    localStorage.setItem(SW_VERSION_KEY, CURRENT_VERSION);

    registrations.forEach(registration => {
      const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;

      // Unregister legacy sw.js (no longer exists)
      if (scriptURL && scriptURL.includes('/sw.js')) {
        registration.unregister();
        console.log('🗑️ Unregistered legacy service worker: sw.js');
      }
      // Update current service workers (sw-custom.js, firebase-messaging-sw.js)
      else if (scriptURL && (scriptURL.includes('sw-custom.js') || scriptURL.includes('firebase-messaging-sw.js'))) {
        registration.update();
        if (import.meta.env.DEV) {
          console.log('🔄 Service worker update check triggered');
        }
      }
    });
  }).catch(error => {
    console.warn('Service worker update check failed:', error);
  });
}

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem
    disableTransitionOnChange
  >
    <App />
  </ThemeProvider>
);
