import { useEffect, useState, useCallback } from 'react';
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
  const { user } = useAuth();

  const [state, setState] = useState<FirebaseMessagingState>({
    token: null,
    permission: getNotificationPermission(),
    isSupported: isNotificationSupported(),
    loading: false,
    error: null,
  });

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
        // Get user's dealership_id from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('dealership_id')
          .eq('id', user.id)
          .single();

        const dealershipId = profile?.dealership_id;

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

      toast({ description: t('notifications.enabled') });
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

      toast({ description: t('notifications.disabled') });
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

      // Show toast notification for foreground messages
      const title = payload.notification?.title || t('notifications.new_message');
      const body = payload.notification?.body || '';

      toast(title, {
        description: body,
        action: payload.data?.url
          ? {
              label: t('common.view'),
              onClick: () => {
                window.location.href = payload.data.url;
              },
            }
          : undefined,
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.isSupported, user?.id, t]);

  /**
   * Auto-request permission if previously granted
   */
  useEffect(() => {
    if (
      state.isSupported &&
      user?.id &&
      state.permission === 'granted' &&
      !state.token &&
      !state.loading
    ) {
      requestPermission();
    }
  }, [state.isSupported, user?.id, state.permission, state.token, state.loading, requestPermission]);

  return {
    ...state,
    requestPermission,
    clearToken,
    refreshToken,
  };
}
