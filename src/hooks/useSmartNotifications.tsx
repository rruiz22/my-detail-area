import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type {
    GetReadyNotification,
    NotificationSource,
    SmartNotification,
    UnifiedNotification
} from '@/types/notifications';
import { validateDealerId } from '@/utils/dealerValidation';
import * as logger from '@/utils/logger';
import {
    areBrowserNotificationsEnabled,
    playNotificationSound,
    showBrowserNotification,
} from '@/utils/notificationUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';

// Import transformation functions
import {
    transformGetReadyToUnified as transformGetReady,
    transformSmartNotificationToUnified as transformSmart,
} from '@/types/notifications';

// Legacy export for backward compatibility
export type { NotificationData, SmartNotification } from '@/types/notifications';

export interface NotificationGroup {
  entity_type: string;
  entity_id: string;
  notifications: UnifiedNotification[];
  unreadCount: number;
  latestNotification: UnifiedNotification;
}

export interface UseSmartNotificationsReturn {
  notifications: UnifiedNotification[];
  groupedNotifications: NotificationGroup[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (notificationId: string, source?: NotificationSource) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markEntityAsRead: (entityType: string, entityId: string) => Promise<void>;
  deleteNotification: (notificationId: string, source?: NotificationSource) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

/**
 * useSmartNotifications - Unified notification hook
 *
 * COMBINES notifications from BOTH:
 * - notification_log (enterprise notification system)
 * - get_ready_notifications (Get Ready module notifications)
 *
 * This allows the bell icon to show all notifications across the system
 * until we fully migrate Get Ready to the unified notification system.
 *
 * FEATURES:
 * - Dual table queries with TanStack Query
 * - Real-time subscriptions for both tables
 * - Unified notification interface
 * - Source-aware actions (mark as read, dismiss)
 * - Backward compatible with existing NotificationBell component
 *
 * @param dealerId - Optional dealerId (deprecated, uses DealerFilterContext internally)
 */
export function useSmartNotifications(dealerId?: number): UseSmartNotificationsReturn {
  const { user } = useAuth();
  const { selectedDealerId } = useDealerFilter();
  const queryClient = useQueryClient();

  // Use validated dealer ID from context (or fallback to prop for backward compatibility)
  const validatedDealerId = validateDealerId(dealerId || selectedDealerId);

  // =====================================================
  // QUERY 1: notification_log
  // =====================================================

  const {
    data: smartNotifications = [],
    isLoading: isLoadingSmartNotifications,
    error: smartNotificationsError,
  } = useQuery({
    queryKey: ['smartNotifications', validatedDealerId, user?.id],
    queryFn: async (): Promise<SmartNotification[]> => {
      if (!user?.id || !validatedDealerId) {
        return [];
      }

      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', validatedDealerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
    enabled: !!user?.id && !!validatedDealerId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  // =====================================================
  // QUERY 2: get_ready_notifications
  // =====================================================

  const {
    data: getReadyNotifications = [],
    isLoading: isLoadingGetReadyNotifications,
    error: getReadyNotificationsError,
  } = useQuery({
    queryKey: ['getReadyNotifications', validatedDealerId, user?.id],
    queryFn: async (): Promise<GetReadyNotification[]> => {
      if (!user?.id || !validatedDealerId) {
        return [];
      }

      const { data, error } = await supabase
        .from('get_ready_notifications')
        .select('*')
        .eq('dealer_id', validatedDealerId)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
    enabled: !!user?.id && !!validatedDealerId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute
  });

  // =====================================================
  // COMBINE & TRANSFORM NOTIFICATIONS
  // =====================================================

  const notifications = useMemo(() => {
    // Transform notification_log entries to unified format
    const transformedSmart = smartNotifications.map(transformSmart);

    // Transform get_ready_notifications entries to unified format
    const transformedGetReady = getReadyNotifications.map(transformGetReady);

    // Combine both arrays
    const combined = [...transformedSmart, ...transformedGetReady];

    // Sort by created_at (newest first)
    return combined.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [smartNotifications, getReadyNotifications]);

  // =====================================================
  // LOADING & ERROR STATE
  // =====================================================

  const loading = isLoadingSmartNotifications || isLoadingGetReadyNotifications;

  const error = useMemo(() => {
    if (smartNotificationsError) {
      return smartNotificationsError instanceof Error
        ? smartNotificationsError.message
        : 'Error fetching smart notifications';
    }
    if (getReadyNotificationsError) {
      return getReadyNotificationsError instanceof Error
        ? getReadyNotificationsError.message
        : 'Error fetching Get Ready notifications';
    }
    return null;
  }, [smartNotificationsError, getReadyNotificationsError]);

  // =====================================================
  // MARK AS READ (Source-aware with auto-detection)
  // =====================================================

  const markAsRead = useCallback(
    async (notificationId: string, source?: NotificationSource) => {
      try {
        // Auto-detect source if not provided (for backward compatibility)
        let detectedSource = source;
        if (!detectedSource) {
          const notification = notifications.find(n => n.id === notificationId);
          if (notification) {
            detectedSource = notification.source;
          } else {
            throw new Error('Notification not found');
          }
        }

        // ✅ OPTIMISTIC UPDATE: Actualizar cache inmediatamente para UI instantánea
        const queryKey = detectedSource === 'notification_log'
          ? ['smartNotifications', validatedDealerId, user?.id]
          : ['getReadyNotifications', validatedDealerId, user?.id];

        // Cancelar refetches en curso
        await queryClient.cancelQueries({ queryKey });

        // Snapshot del estado anterior (para rollback en caso de error)
        const previousData = queryClient.getQueryData(queryKey);

        // Actualizar cache optimísticamente
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return old.map((n: any) =>
            n.id === notificationId
              ? { ...n, is_read: true, read_at: new Date().toISOString() }
              : n
          );
        });

        // Ejecutar actualización en BD
        if (detectedSource === 'notification_log') {
          // Update notification_log table
          const { error } = await supabase
            .from('notification_log')
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
            })
            .eq('id', notificationId);

          if (error) {
            // Rollback en caso de error
            queryClient.setQueryData(queryKey, previousData);
            throw error;
          }
        } else {
          // Update get_ready_notifications table via CORRECT RPC
          if (!user?.id) throw new Error('User not authenticated');

          const { data, error } = await supabase.rpc('mark_get_ready_notification_as_read', {
            p_notification_id: notificationId,
          });

          if (error) {
            // Rollback en caso de error
            queryClient.setQueryData(queryKey, previousData);
            logger.error('[markAsRead] RPC error:', error);
            throw error;
          }

          // Check if the RPC returned false (notification not found or unauthorized)
          if (data === false) {
            // Rollback
            queryClient.setQueryData(queryKey, previousData);
            throw new Error('Failed to mark notification as read - not found or unauthorized');
          }
        }

        // Invalidar queries para sincronizar con BD (en background)
        queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });
        queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
        queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });

        logger.dev('[markAsRead] Successfully marked notification as read:', notificationId);
      } catch (err) {
        logger.error('[markAsRead] Error:', err);
        console.error('Error marking notification as read:', err);
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to mark notification as read',
          variant: 'destructive',
        });
        throw err;
      }
    },
    [notifications, user?.id, validatedDealerId, queryClient]
  );

  // =====================================================
  // MARK ALL AS READ
  // =====================================================

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || !validatedDealerId) return;

    try {
      // Mark all notification_log as read
      const { error: smartError } = await supabase
        .from('notification_log')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('dealer_id', validatedDealerId)
        .eq('is_read', false);

      if (smartError) throw smartError;

      // Mark all get_ready_notifications as read via RPC
      const { error: getReadyError } = await supabase.rpc(
        'mark_all_notifications_read',
        {
          p_user_id: user.id,
          p_dealer_id: validatedDealerId,
        }
      );

      if (getReadyError) throw getReadyError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });

      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    }
  }, [user?.id, validatedDealerId, queryClient]);

  // =====================================================
  // MARK ENTITY AS READ (notification_log only)
  // =====================================================

  const markEntityAsRead = useCallback(
    async (entityType: string, entityId: string) => {
      if (!user?.id || !validatedDealerId) return;

      try {
        const { error } = await supabase
          .from('notification_log')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('dealer_id', validatedDealerId)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .eq('is_read', false);

        if (error) throw error;

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });
      } catch (err) {
        console.error('Error marking entity notifications as read:', err);
      }
    },
    [user?.id, validatedDealerId, queryClient]
  );

  // =====================================================
  // DELETE/DISMISS NOTIFICATION (Source-aware with auto-detection)
  // =====================================================

  const deleteNotification = useCallback(
    async (notificationId: string, source?: NotificationSource) => {
      try {
        // Auto-detect source if not provided (for backward compatibility)
        let detectedSource = source;
        if (!detectedSource) {
          const notification = notifications.find(n => n.id === notificationId);
          if (notification) {
            detectedSource = notification.source;
          } else {
            throw new Error('Notification not found');
          }
        }

        // ✅ OPTIMISTIC UPDATE: Remover de cache inmediatamente para UI instantánea
        const queryKey = detectedSource === 'notification_log'
          ? ['smartNotifications', validatedDealerId, user?.id]
          : ['getReadyNotifications', validatedDealerId, user?.id];

        // Cancelar refetches en curso
        await queryClient.cancelQueries({ queryKey });

        // Snapshot del estado anterior (para rollback en caso de error)
        const previousData = queryClient.getQueryData(queryKey);

        // Remover notificación del cache optimísticamente
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old;
          return old.filter((n: any) => n.id !== notificationId);
        });

        // Ejecutar borrado en BD
        if (detectedSource === 'notification_log') {
          // Delete from notification_log
          const { error } = await supabase
            .from('notification_log')
            .delete()
            .eq('id', notificationId);

          if (error) {
            // Rollback en caso de error
            queryClient.setQueryData(queryKey, previousData);
            throw error;
          }
        } else {
          // Dismiss get_ready_notification via CORRECT RPC
          if (!user?.id) throw new Error('User not authenticated');

          const { data, error } = await supabase.rpc('dismiss_get_ready_notification', {
            p_notification_id: notificationId,
          });

          if (error) {
            // Rollback en caso de error
            queryClient.setQueryData(queryKey, previousData);
            logger.error('[deleteNotification] RPC error:', error);
            throw error;
          }

          // Check if the RPC returned false (notification not found or unauthorized)
          if (data === false) {
            // Rollback
            queryClient.setQueryData(queryKey, previousData);
            throw new Error('Failed to dismiss notification - not found or unauthorized');
          }
        }

        // Invalidar queries para sincronizar con BD (en background)
        queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });
        queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
        queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });

        logger.dev('[deleteNotification] Successfully deleted/dismissed notification:', notificationId);
      } catch (err) {
        logger.error('[deleteNotification] Error:', err);
        console.error('Error deleting/dismissing notification:', err);
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : 'Failed to dismiss notification',
          variant: 'destructive',
        });
        throw err; // Re-throw to allow caller to handle
      }
    },
    [notifications, user?.id, validatedDealerId, queryClient]
  );

  // =====================================================
  // REFRESH NOTIFICATIONS
  // =====================================================

  const refreshNotifications = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });
    await queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
  }, [queryClient]);

  // =====================================================
  // GROUP NOTIFICATIONS BY ENTITY (for notification_log)
  // =====================================================

  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: NotificationGroup } = {};

    notifications.forEach((notification) => {
      // Only group notification_log entries (which have entity metadata)
      if (notification.source !== 'notification_log') return;

      const entityType = notification.metadata?.entity_type as string | undefined;
      const entityId = notification.metadata?.entity_id as string | undefined;

      if (!entityType || !entityId) return;

      const key = `${entityType}_${entityId}`;

      if (!groups[key]) {
        groups[key] = {
          entity_type: entityType,
          entity_id: entityId,
          notifications: [],
          unreadCount: 0,
          latestNotification: notification,
        };
      }

      groups[key].notifications.push(notification);
      if (!notification.is_read) {
        groups[key].unreadCount++;
      }

      // Update latest notification if this one is newer
      if (
        new Date(notification.created_at) >
        new Date(groups[key].latestNotification.created_at)
      ) {
        groups[key].latestNotification = notification;
      }
    });

    return Object.values(groups).sort(
      (a, b) =>
        new Date(b.latestNotification.created_at).getTime() -
        new Date(a.latestNotification.created_at).getTime()
    );
  }, [notifications]);

  // =====================================================
  // UNREAD COUNT
  // =====================================================

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read && !n.is_dismissed).length,
    [notifications]
  );

  // =====================================================
  // REAL-TIME SUBSCRIPTIONS
  // =====================================================

  useEffect(() => {
    if (!user?.id || !validatedDealerId) return;

    logger.dev('[useSmartNotifications] Setting up dual real-time subscriptions', {
      userId: user.id,
      dealerId: validatedDealerId,
    });

    // SUBSCRIPTION 1: notification_log
    const smartChannel = supabase
      .channel(`notifications_${user.id}_${validatedDealerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            logger.dev('[useSmartNotifications] notification_log INSERT:', payload);

            const newNotification = payload.new as SmartNotification;

            // Verify notification belongs to current dealer
            if (newNotification.dealer_id !== validatedDealerId) {
              return;
            }

            // Invalidate query to refetch
            queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });

            // Play notification sound
            await playNotificationSound(newNotification.priority);

            // Show browser notification if enabled
            if (areBrowserNotificationsEnabled()) {
              await showBrowserNotification({
                title: newNotification.title,
                message: newNotification.message,
                priority: newNotification.priority,
                data: newNotification.data,
              });
            }

            // Show toast for high priority
            if (
              newNotification.priority === 'high' ||
              newNotification.priority === 'urgent'
            ) {
              toast({
                title: newNotification.title,
                description: newNotification.message,
                duration: newNotification.priority === 'urgent' ? 10000 : 5000,
                variant: newNotification.priority === 'urgent' ? 'destructive' : 'default',
              });
            }
          } catch (error) {
            console.error('[useSmartNotifications] Error handling notification_log INSERT:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['smartNotifications'] });
        }
      )
      .subscribe();

    // SUBSCRIPTION 2: get_ready_notifications
    const getReadyChannel = supabase
      .channel(`get_ready_notifications_${validatedDealerId}_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'get_ready_notifications',
          filter: `dealer_id=eq.${validatedDealerId}`,
        },
        async (payload) => {
          try {
            logger.dev('[useSmartNotifications] get_ready_notifications INSERT:', payload);

            const newNotification = payload.new as GetReadyNotification;

            // Check if notification is for this user
            if (
              newNotification.user_id !== null &&
              newNotification.user_id !== user.id
            ) {
              return;
            }

            // Invalidate query to refetch
            queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
            queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });

            // Play notification sound
            const mappedPriority =
              newNotification.priority === 'medium'
                ? 'normal'
                : newNotification.priority === 'critical'
                ? 'urgent'
                : newNotification.priority;
            await playNotificationSound(mappedPriority);

            // Show toast for high/critical priority
            if (
              newNotification.priority === 'high' ||
              newNotification.priority === 'critical'
            ) {
              toast({
                title: newNotification.title,
                description: newNotification.message,
                variant: newNotification.priority === 'critical' ? 'destructive' : 'default',
              });
            }
          } catch (error) {
            console.error('[useSmartNotifications] Error handling get_ready_notifications INSERT:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'get_ready_notifications',
          filter: `dealer_id=eq.${validatedDealerId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
          queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
        }
      )
      .subscribe();

    return () => {
      logger.dev('[useSmartNotifications] Cleaning up dual subscriptions');
      supabase.removeChannel(smartChannel);
      supabase.removeChannel(getReadyChannel);
    };
  }, [user?.id, validatedDealerId, queryClient]);

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    notifications,
    groupedNotifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    markEntityAsRead,
    deleteNotification,
    refreshNotifications,
  };
}
