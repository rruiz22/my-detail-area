import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  requestNotificationPermission,
  onForegroundMessage,
  isNotificationSupported,
  getNotificationPermission,
} from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface FirebaseMessagingState {
  token: string | null;
  permission: NotificationPermission | null;
  isSupported: boolean;
  loading: boolean;
  error: string | null;
}

interface UseFirebaseMessagingReturn extends FirebaseMessagingState {
  requestPermission: () => Promise<void>;
  clearToken: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

/**
 * Custom hook for Firebase Cloud Messaging integration
 * Handles FCM token management, notification permissions, and message listening
 *
 * @returns {UseFirebaseMessagingReturn} Firebase messaging state and methods
 *
 * @example
 * ```tsx
 * function NotificationManager() {
 *   const { t } = useTranslation();
  const { toast } = useToast();
 *   const { permission, requestPermission, loading } = useFirebaseMessaging();
 *
 *   return (
 *     <Button onClick={requestPermission} disabled={loading}>
 *       {permission === 'granted' ? t('notifications.enabled') : t('notifications.enable')}
 *     </Button>
 *   );
 * }
 * ```
 */
export function useFirebaseMessaging(): UseFirebaseMessagingReturn {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [state, setState] = useState<FirebaseMessagingState>({
    token: null,
    permission: getNotificationPermission(),
    isSupported: isNotificationSupported(),
    loading: false,
    error: null,
  });

  // 🔴 FIX: Prevent infinite loop when auto-registration fails
  // This ref ensures we only attempt auto-registration ONCE per component lifecycle
  const hasAttemptedAutoRegister = useRef(false);

  /**
   * Save FCM token to Supabase database
   */
  const saveTokenToDatabase = useCallback(
    async (fcmToken: string) => {
      if (!user?.id) {
        console.warn('[FCM] No user ID available, cannot save token');
        return;
      }

      try {
        // ⚡ PERF FIX: Use dealership_id from AuthContext (already loaded by loadUserProfile)
        // This eliminates redundant query to profiles table that was competing for connection pool
        const dealershipId = (user as any).dealershipId;

        if (!dealershipId) {
          console.warn('[FCM] No dealership_id found for user, cannot save token');
          return;
        }

        // Use UPSERT for atomic operation (prevents race conditions and duplicate key errors)
        const { error } = await supabase
          .from('fcm_tokens')
          .upsert({
            user_id: user.id,
            dealer_id: dealershipId,
            fcm_token: fcmToken,
            is_active: true,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,dealer_id,fcm_token'
          });

        if (error) {
          console.error('[FCM] Error upserting token:', error);
          throw error;
        }

        console.log('[FCM] Token saved successfully');
      } catch (error) {
        console.error('[FCM] Error saving token to database:', error);
        throw error;
      }
    },
    [user?.id]
  );

  /**
   * Request notification permission and get FCM token
   */
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast({ variant: 'destructive', description: t('notifications.not_supported') });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const token = await requestNotificationPermission();

      if (!token) {
        setState((prev) => ({
          ...prev,
          loading: false,
          permission: getNotificationPermission(),
          error: t('notifications.permission_denied'),
        }));
        toast({ variant: 'destructive', description: t('notifications.permission_denied') });
        return;
      }

      // Save token to database
      await saveTokenToDatabase(token);

      setState((prev) => ({
        ...prev,
        token,
        permission: 'granted',
        loading: false,
        error: null,
      }));

      // Removed toast to avoid annoying notification on every page refresh
      // toast({ description: t('notifications.enabled') });
    } catch (error) {
      console.error('[FCM] Error requesting permission:', error);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      toast({ variant: 'destructive', description: t('notifications.error') });
    }
  }, [state.isSupported, t, saveTokenToDatabase]);

  /**
   * Clear FCM token (deactivate notifications)
   */
  const clearToken = useCallback(async () => {
    if (!user?.id) return;

    setState((prev) => ({ ...prev, loading: true }));

    try {
      // Deactivate all tokens for user
      const { error } = await supabase
        .from('fcm_tokens')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        token: null,
        loading: false,
      }));

      // Removed toast - already shown by NotificationsPreferencesTab component to avoid duplicate
      // toast({ description: t('notifications.disabled') });
    } catch (error) {
      console.error('[FCM] Error clearing token:', error);
      setState((prev) => ({ ...prev, loading: false }));
      toast({ variant: 'destructive', description: t('notifications.error') });
    }
  }, [user?.id, t]);

  /**
   * Refresh FCM token
   */
  const refreshToken = useCallback(async () => {
    if (state.permission === 'granted') {
      await requestPermission();
    }
  }, [state.permission, requestPermission]);

  /**
   * Initialize FCM and listen for foreground messages
   */
  useEffect(() => {
    if (!state.isSupported || !user?.id) return;

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      console.log('[FCM] Foreground message:', payload);
      console.log('[FCM] Notification object:', payload.notification);
      console.log('[FCM] Data object:', payload.data);

      // Show toast notification for foreground messages
      const title = payload.notification?.title || t('notifications.new_message');
      const body = payload.notification?.body || '';

      console.log('[FCM] Extracted title:', title);
      console.log('[FCM] Extracted body:', body);
      console.log('[FCM] URL:', payload.data?.url);

      // Show toast notification (click to navigate is handled by background click)
      toast({
        title,
        description: body,
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.isSupported, user?.id, t]);

  /**
   * Auto-request permission if previously granted AND user has enabled push notifications
   * Only auto-register if user explicitly enabled push_enabled in their preferences
   *
   * ⚡ PERF FIX: Deferred until user.email is available (after AuthContext.loadUserProfile completes)
   * This naturally serializes queries and eliminates connection pool competition on initial load
   *
   * 🔴 FIX: Uses hasAttemptedAutoRegister ref to prevent infinite loop when FCM registration fails
   * (e.g., AbortError: Registration failed - push service error in localhost)
   */
  useEffect(() => {
    // Wait for user profile to fully load before checking push preferences
    // user.email is only available after AuthContext.loadUserProfile() completes
    if (!state.isSupported || !user?.id || !user?.email) return;

    // 🔴 FIX: Only attempt auto-registration ONCE per component lifecycle
    // This prevents infinite loop when FCM registration fails
    if (hasAttemptedAutoRegister.current) return;

    const autoRegisterIfEnabled = async () => {
      // Check if user has push notifications enabled in their preferences
      const { data: pushPrefs } = await supabase
        .from('user_push_notification_preferences')
        .select('push_enabled')
        .eq('user_id', user.id)
        .maybeSingle(); // ⚡ PERF FIX: Use maybeSingle() instead of single() to avoid 406 error if row doesn't exist

      // Only auto-register if:
      // 1. Browser permission is granted
      // 2. User has explicitly enabled push_enabled in DB (or no preferences exist yet)
      // 3. No active token yet
      const pushEnabled = pushPrefs?.push_enabled ?? false; // Default to false to respect user choice

      if (
        state.permission === 'granted' &&
        pushEnabled === true &&
        !state.token &&
        !state.loading
      ) {
        // 🔴 FIX: Mark as attempted BEFORE calling requestPermission
        // This prevents re-entry if requestPermission fails and triggers a re-render
        hasAttemptedAutoRegister.current = true;
        requestPermission();
      }
    };

    autoRegisterIfEnabled();
  }, [state.isSupported, user?.id, user?.email, state.permission, state.token, state.loading, requestPermission]);

  return {
    ...state,
    requestPermission,
    clearToken,
    refreshToken,
  };
}
