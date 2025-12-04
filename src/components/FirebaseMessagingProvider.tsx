import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { ReactNode } from 'react';

/**
 * FirebaseMessagingProvider
 * Initializes Firebase Cloud Messaging and listens for foreground messages
 * This component must be mounted inside AuthProvider (needs user.id)
 */
export function FirebaseMessagingProvider({ children }: { children: ReactNode }) {
  // Initialize FCM - this hook handles:
  // 1. Requesting notification permission
  // 2. Registering FCM token with backend
  // 3. Listening for foreground messages and showing toasts
  useFirebaseMessaging();

  return <>{children}</>;
}
