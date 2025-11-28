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

// 🔴 SERVICE WORKER DISABLED - Cache cleanup for all users
// Date: 2025-11-28
// Reason: BMW of Sudbury reported stale data due to 24h API cache
// Solution: Remove all service workers and rely on TanStack Query cache only
const CURRENT_VERSION = packageJson.version;
const SW_CLEANUP_KEY = 'sw_cleanup_completed';
const SW_CLEANUP_VERSION = '1.3.52'; // Version with complete Spanish translations (83 files)

console.log(`🚀 MyDetailArea v${CURRENT_VERSION} starting...`);

// 🔴 CRITICAL: Aggressive Service Worker cleanup - BLOCKS app rendering if SW detected
// This prevents old SW from intercepting translation requests and causing timeouts
if ('serviceWorker' in navigator) {
  // Check immediately (synchronous check for already-completed cleanup)
  const cleanupCompleted = localStorage.getItem(SW_CLEANUP_KEY);
  const needsCleanup = cleanupCompleted !== SW_CLEANUP_VERSION;

  if (needsCleanup) {
    console.warn('⚠️ OLD SERVICE WORKER DETECTED - Starting aggressive cleanup...');

    // BLOCKING: Wait for SW cleanup before rendering app
    navigator.serviceWorker.getRegistrations().then(async registrations => {
      if (registrations.length > 0) {
        console.warn('🗑️ SERVICE WORKER CLEANUP: Removing all service workers...');

        // Unregister ALL service workers (including firebase-messaging-sw.js)
        for (const registration of registrations) {
          const scriptURL = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL;
          await registration.unregister();
          console.log(`  ✅ Unregistered: ${scriptURL}`);
        }

        // Clear ALL caches (translations, API, images, fonts, etc)
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          if (cacheNames.length > 0) {
            console.warn('🗑️ Clearing all service worker caches...');
            for (const cacheName of cacheNames) {
              await caches.delete(cacheName);
              console.log(`  ✅ Deleted cache: ${cacheName}`);
            }
          }
        }

        // Mark cleanup as completed
        localStorage.setItem(SW_CLEANUP_KEY, SW_CLEANUP_VERSION);
        console.log('✅ Service worker cleanup completed!');

        // 🔴 CRITICAL: Force immediate reload to ensure SW doesn't interfere
        console.log('🔄 Reloading app without service worker...');
        window.location.reload();

        // Stop execution - reload will re-run this script
        throw new Error('SW cleanup - reloading');
      } else {
        // No SW found but cleanup wasn't marked complete
        console.log('✅ No service workers found - marking cleanup as done');
        localStorage.setItem(SW_CLEANUP_KEY, SW_CLEANUP_VERSION);
      }
    }).catch(error => {
      if (error.message !== 'SW cleanup - reloading') {
        console.error('❌ Service worker cleanup failed:', error);
        // Continue with app render even if cleanup fails
      }
    });
  } else {
    console.log('✅ Service worker cleanup already completed for v' + SW_CLEANUP_VERSION);
    console.log('📊 App uses:');
    console.log('  • TanStack Query (5min cache for API)');
    console.log('  • localStorage (user preferences)');
    console.log('  • Browser cache (static assets)');
  }
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
