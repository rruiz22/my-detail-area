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

// 🔴 CRITICAL FIX: Clean up old service workers and update current ones
// Unregisters legacy sw.js and keeps only sw-custom.js and firebase-messaging-sw.js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
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
