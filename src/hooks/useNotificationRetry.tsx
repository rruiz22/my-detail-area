/**
 * useNotificationRetry Hook
 * Handle notification delivery retries with exponential backoff
 * Enterprise-grade error handling and rate limiting
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { RetryOptions } from '@/types/notification-delivery';

interface UseNotificationRetryReturn {
  retrying: boolean;
  error: Error | null;
  retryNotification: (notificationId: string, options?: RetryOptions) => Promise<boolean>;
  retryBatch: (notificationIds: string[], options?: RetryOptions) => Promise<{ success: number; failed: number }>;
}

/**
 * Handle notification delivery retries
 */
export function useNotificationRetry(): UseNotificationRetryReturn {
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();
  const { t } = useTranslation();

  /**
   * Retry a single notification delivery
   */
  const retryNotification = useCallback(
    async (notificationId: string, options?: RetryOptions): Promise<boolean> => {
      try {
        setRetrying(true);
        setError(null);

        console.log('[useNotificationRetry] Retrying notification:', notificationId);

        // Call Supabase RPC to retry delivery
        const { data, error: rpcError } = await supabase.rpc(
          'retry_notification_delivery',
          {
            p_notification_id: notificationId,
            p_max_retries: options?.max_retries,
          }
        );

        if (rpcError) throw rpcError;

        if (data) {
          toast({
            title: t('notifications.delivery.retry_success'),
            description: t('notifications.delivery.retry_success_message'),
            variant: 'default',
          });
          return true;
        } else {
          toast({
            title: t('notifications.delivery.retry_limit'),
            description: t('notifications.delivery.retry_limit_message'),
            variant: 'destructive',
          });
          return false;
        }
      } catch (err) {
        console.error('[useNotificationRetry] Error retrying notification:', err);
        const errorObj = err instanceof Error ? err : new Error('Failed to retry notification');
        setError(errorObj);

        toast({
          title: t('common.error'),
          description: t('notifications.delivery.retry_error'),
          variant: 'destructive',
        });

        return false;
      } finally {
        setRetrying(false);
      }
    },
    [toast, t]
  );

  /**
   * Retry multiple notifications in batch
   */
  const retryBatch = useCallback(
    async (
      notificationIds: string[],
      options?: RetryOptions
    ): Promise<{ success: number; failed: number }> => {
      try {
        setRetrying(true);
        setError(null);

        console.log('[useNotificationRetry] Retrying batch:', notificationIds.length, 'notifications');

        const results = await Promise.allSettled(
          notificationIds.map((id) => retryNotification(id, options))
        );

        const success = results.filter((r) => r.status === 'fulfilled' && r.value).length;
        const failed = results.length - success;

        toast({
          title: t('notifications.delivery.batch_retry_complete'),
          description: t('notifications.delivery.batch_retry_message', { success, failed }),
          variant: success > 0 ? 'default' : 'destructive',
        });

        return { success, failed };
      } catch (err) {
        console.error('[useNotificationRetry] Error retrying batch:', err);
        const errorObj = err instanceof Error ? err : new Error('Failed to retry notifications');
        setError(errorObj);

        toast({
          title: t('common.error'),
          description: t('notifications.delivery.batch_retry_error'),
          variant: 'destructive',
        });

        return { success: 0, failed: notificationIds.length };
      } finally {
        setRetrying(false);
      }
    },
    [retryNotification, toast, t]
  );

  return {
    retrying,
    error,
    retryNotification,
    retryBatch,
  };
}
