import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, getToken, onMessage } from 'firebase/messaging';
import * as logger from '@/utils/logger';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// FCM VAPID Key for web push
const FCM_VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY;

// Check if Firebase is properly configured
const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

try {
  // Only initialize if Firebase is configured
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);

    // Initialize Firebase Cloud Messaging only in browser environment
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      messaging = getMessaging(app);
      logger.dev('🔥 Firebase Cloud Messaging initialized successfully');
    }
  } else {
    logger.dev('⚠️ Firebase not configured - FCM features disabled');
  }
} catch (error) {
  // Only log error in development
  logger.dev('Firebase initialization error:', error);
}

/**
 * Request notification permission and get FCM token
 * @returns FCM registration token or null if permission denied
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!messaging) {
    logger.dev('Firebase Messaging not initialized');
    return null;
  }

  try {
    // Request notification permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      logger.dev('Notification permission denied');
      return null;
    }

    // Register service worker
    const registration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );

    logger.dev('Service Worker registered successfully');

    // Get FCM token
    const token = await getToken(messaging, {
      vapidKey: FCM_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      logger.dev('FCM Token obtained:', token);
      return token;
    } else {
      logger.dev('No FCM token received');
      return null;
    }
  } catch (error) {
    logger.dev('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Listen for foreground messages
 * @param callback Function to handle incoming messages
 */
export function onForegroundMessage(
  callback: (payload: any) => void
): (() => void) | null {
  if (!messaging) {
    logger.dev('Firebase Messaging not initialized');
    return null;
  }

  return onMessage(messaging, (payload) => {
    logger.dev('Foreground message received:', payload);
    callback(payload);
  });
}

/**
 * Check if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }
  return Notification.permission;
}

export { app, messaging };
