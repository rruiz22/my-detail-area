// Import network error suppressor FIRST to catch all errors
import "./utils/networkErrorSuppressor";

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import App from "./App.tsx";
import "./index.css";
import "./styles/order-animations.css";
import "./lib/i18n";

// 🔴 CRITICAL FIX: Force service worker update check on app load
// Ensures new service worker activates immediately on new version deployment
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      // Force update check - don't wait for automatic check
      registration.update();
      console.log('🔄 Service worker update check triggered');
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
