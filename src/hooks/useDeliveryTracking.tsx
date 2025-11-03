/**
 * useDeliveryTracking Hook
 * Real-time delivery status tracking for notifications
 * Enterprise-grade with optimistic updates and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type {
  DeliveryStatus,
  DeliveryMetadata,
  NotificationDeliveryLog
} from '@/types/notification-delivery';

interface UseDeliveryTrackingReturn {
  status: DeliveryStatus | null;
  metadata: DeliveryMetadata | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Track delivery status for a single notification
 * Subscribes to real-time updates from notification_log table
 */
export function useDeliveryTracking(
  notificationId: string | undefined
): UseDeliveryTrackingReturn {
  const [status, setStatus] = useState<DeliveryStatus | null>(null);
  const [metadata, setMetadata] = useState<DeliveryMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch current delivery status
  const fetchDeliveryStatus = useCallback(async () => {
    if (!notificationId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError} = await supabase
        .from('notification_log')
        .select('*')
        .eq('notification_id', notificationId)
        .single();

      if (fetchError) {
        // If no delivery log exists yet, that's okay (notification might be pending)
        if (fetchError.code === 'PGRST116') {
          setStatus('pending');
          setMetadata(null);
        } else {
          throw fetchError;
        }
      } else if (data) {
        const log = data as NotificationDeliveryLog;
        setStatus(log.status);
        setMetadata({
          channel: log.channel,
          provider: log.provider,
          sent_at: log.sent_at,
          delivered_at: log.delivered_at,
          clicked_at: log.clicked_at,
          read_at: log.read_at,
          failed_at: log.failed_at,
          latency_ms: log.latency_ms,
          error_code: log.error_code,
          error_message: log.error_message,
          retry_count: log.retry_count,
          cost: log.cost,
          metadata: log.metadata,
        });
      }
    } catch (err) {
      console.error('[useDeliveryTracking] Error fetching delivery status:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch delivery status'));
    } finally {
      setLoading(false);
    }
  }, [notificationId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!notificationId) return;

    console.log('[useDeliveryTracking] Setting up subscription for:', notificationId);

    const channel = supabase
      .channel(`delivery_tracking_${notificationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_log',
          filter: `notification_id=eq.${notificationId}`,
        },
        (payload) => {
          console.log('[useDeliveryTracking] Real-time update:', payload);

          const log = payload.new as NotificationDeliveryLog;

          // Optimistic update
          setStatus(log.status);
          setMetadata({
            channel: log.channel,
            provider: log.provider,
            sent_at: log.sent_at,
            delivered_at: log.delivered_at,
            clicked_at: log.clicked_at,
            read_at: log.read_at,
            failed_at: log.failed_at,
            latency_ms: log.latency_ms,
            error_code: log.error_code,
            error_message: log.error_message,
            retry_count: log.retry_count,
            cost: log.cost,
            metadata: log.metadata,
          });
        }
      )
      .subscribe((subscriptionStatus) => {
        console.log('[useDeliveryTracking] Subscription status:', subscriptionStatus);
      });

    return () => {
      console.log('[useDeliveryTracking] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [notificationId]);

  // Initial fetch
  useEffect(() => {
    fetchDeliveryStatus();
  }, [fetchDeliveryStatus]);

  return {
    status,
    metadata,
    loading,
    error,
    refetch: fetchDeliveryStatus,
  };
}
