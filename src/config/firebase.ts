/**
 * Firebase Cloud Messaging (FCM) Configuration
 *
 * IMPORTANT: Replace placeholders with actual credentials
 * Never commit real credentials to version control
 *
 * Firebase Project: my-detail-area
 * Created: 2025-10-18
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging } from 'firebase/messaging';

// Firebase configuration - REPLACE PLACEHOLDERS WITH ACTUAL VALUES
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_FIREBASE_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'my-detail-area.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'my-detail-area',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'my-detail-area.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '242154179799',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_FIREBASE_APP_ID',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'YOUR_MEASUREMENT_ID',
};

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase App
 * Singleton pattern - initializes only once
 */
export function initializeFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    try {
      firebaseApp = initializeApp(firebaseConfig);
      console.log('[Firebase] App initialized successfully');
    } catch (error: any) {
      console.error('[Firebase] Initialization error:', error);
      throw new Error(`Firebase initialization failed: ${error.message}`);
    }
  }
  return firebaseApp;
}

/**
 * Get Firebase Messaging instance
 * Requires Service Worker to be registered
 */
export function getFirebaseMessaging(): Messaging | null {
  if (!messaging) {
    try {
      const app = initializeFirebaseApp();
      messaging = getMessaging(app);
      console.log('[Firebase] Messaging initialized successfully');
    } catch (error: any) {
      console.error('[Firebase] Messaging initialization error:', error);
      return null;
    }
  }
  return messaging;
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
  const requiredKeys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
  ];

  const missingKeys = requiredKeys.filter(
    key => !import.meta.env[key] || import.meta.env[key]?.startsWith('YOUR_')
  );

  if (missingKeys.length > 0) {
    console.warn('[Firebase] Missing configuration keys:', missingKeys);
    return false;
  }

  return true;
}

/**
 * Get Firebase configuration status
 */
export function getFirebaseConfigStatus() {
  return {
    apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY && !import.meta.env.VITE_FIREBASE_API_KEY.startsWith('YOUR_'),
    authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: !!import.meta.env.VITE_FIREBASE_APP_ID && !import.meta.env.VITE_FIREBASE_APP_ID.startsWith('YOUR_'),
    measurementId: !!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    isFullyConfigured: isFirebaseConfigured(),
  };
}
