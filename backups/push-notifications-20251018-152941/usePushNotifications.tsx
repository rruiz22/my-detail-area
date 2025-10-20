import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Hook for managing Web Push Notifications
 *
 * Features:
 * - Check browser support for push notifications
 * - Request notification permission
 * - Subscribe/unsubscribe to push notifications
 * - Manage push subscriptions in database
 * - Test push notifications
 *
 * Requirements:
 * - Service worker registered (via vite-plugin-pwa)
 * - VAPID public key in environment variables
 * - push_subscriptions table in database
 * - push-notification-sender Edge Function deployed
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const { selectedDealerId } = useDealerFilter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);

  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  // Check browser support
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'Notification' in window &&
                       'serviceWorker' in navigator &&
                       'PushManager' in window;
      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check service worker registration
  useEffect(() => {
    if (!isSupported) return;

    const checkServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        setIsServiceWorkerReady(!!registration);
      } catch (error) {
        console.error('Service worker not ready:', error);
        setIsServiceWorkerReady(false);
      }
    };

    checkServiceWorker();
  }, [isSupported]);

  // Get current subscription status from database
  const { data: subscription, isLoading } = useQuery({
    queryKey: ['pushSubscription', user?.id, selectedDealerId],
    queryFn: async () => {
      if (!user?.id || !selectedDealerId) return null;

      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', selectedDealerId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      return data;
    },
    enabled: isSupported && !!user?.id && !!selectedDealerId,
  });

  // Request notification permission
  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications not supported in this browser');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  };

  // Subscribe to push notifications
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedDealerId) {
        throw new Error('User not authenticated or dealer not selected');
      }

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('VAPID public key not configured');
      }

      // Request permission if not granted
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          throw new Error('Notification permission denied');
        }
      }

      // Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push manager
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Parse subscription
      const subscriptionJSON = pushSubscription.toJSON();

      if (!subscriptionJSON.endpoint || !subscriptionJSON.keys) {
        throw new Error('Invalid push subscription');
      }

      // Save to database
      console.log('[Push] Saving subscription to database:', {
        user_id: user.id,
        dealer_id: selectedDealerId,
        endpoint: subscriptionJSON.endpoint?.substring(0, 50) + '...',
      });

      const { data, error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          dealer_id: selectedDealerId,
          endpoint: subscriptionJSON.endpoint,
          p256dh_key: subscriptionJSON.keys.p256dh,
          auth_key: subscriptionJSON.keys.auth,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,dealer_id,endpoint',
        })
        .select()
        .single();

      if (error) {
        console.error('[Push] Database save error:', error);
        throw error;
      }

      console.log('[Push] Subscription saved successfully:', data);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscription'] });
      toast({
        title: 'Push Notifications Enabled',
        description: 'You will now receive push notifications for Get Ready alerts',
      });
    },
    onError: (error: any) => {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Subscription Failed',
        description: error.message || 'Failed to enable push notifications',
        variant: 'destructive',
      });
    },
  });

  // Unsubscribe from push notifications
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedDealerId) {
        throw new Error('User not authenticated or dealer not selected');
      }

      // Unsubscribe from push manager
      try {
        const registration = await navigator.serviceWorker.ready;
        const pushSubscription = await registration.pushManager.getSubscription();

        if (pushSubscription) {
          await pushSubscription.unsubscribe();
        }
      } catch (error) {
        console.error('Error unsubscribing from push manager:', error);
      }

      // Mark as inactive in database
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('dealer_id', selectedDealerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pushSubscription'] });
      toast({
        title: 'Push Notifications Disabled',
        description: 'You will no longer receive push notifications',
      });
    },
    onError: (error: any) => {
      console.error('Error unsubscribing:', error);
      toast({
        title: 'Unsubscribe Failed',
        description: error.message || 'Failed to disable push notifications',
        variant: 'destructive',
      });
    },
  });

  // Test push notification
  const testNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !selectedDealerId) {
        throw new Error('User not authenticated or dealer not selected');
      }

      // Call Edge Function to send test notification
      console.log('[Push Test] Sending test notification:', {
        userId: user.id,
        dealerId: selectedDealerId,
      });

      const { data, error } = await supabase.functions.invoke('push-notification-sender', {
        body: {
          userId: user.id,
          dealerId: selectedDealerId,
          payload: {
            title: 'Test Notification',
            body: 'This is a test push notification from Get Ready module',
            icon: '/favicon-mda.svg',
            tag: 'test',
            url: '/get-ready',
            data: {
              type: 'test',
              module: 'get_ready',
            },
          },
        },
      });

      if (error) {
        console.error('[Push Test] Edge Function error:', error);
        throw error;
      }

      console.log('[Push Test] Edge Function response:', data);

      return data;
    },
    onSuccess: (data: any) => {
      if (data?.sent > 0) {
        toast({
          title: 'Test Notification Sent',
          description: 'Check your browser for the push notification',
        });
      } else {
        toast({
          title: 'No Active Subscriptions',
          description: 'Please enable push notifications first',
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error sending test notification:', error);
      toast({
        title: 'Test Failed',
        description: error.message || 'Failed to send test notification',
        variant: 'destructive',
      });
    },
  });

  return {
    // State
    isSupported,
    isServiceWorkerReady,
    permission,
    isSubscribed: !!subscription && subscription.is_active,
    subscription,
    isLoading,

    // Actions
    requestPermission,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    testNotification: testNotificationMutation.mutate,

    // Mutation states
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    isTesting: testNotificationMutation.isPending,
  };
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
