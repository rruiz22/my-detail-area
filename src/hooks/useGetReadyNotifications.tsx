import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type {
  GetReadyNotification,
  NotificationWithVehicle,
  NotificationSummary,
  NotificationFilters,
  UserNotificationPreferences,
} from '@/types/getReady';

/**
 * Hook for managing Get Ready notifications with real-time updates
 *
 * Features:
 * - Fetch notifications with pagination
 * - Real-time subscription for new notifications
 * - Mark as read/unread
 * - Dismiss notifications
 * - Get unread count
 * - Filter notifications
 * - User preferences management
 *
 * @param options - Filter options for notifications
 */
export function useGetReadyNotifications(
  options?: NotificationFilters & {
    limit?: number;
    enabled?: boolean;
  }
) {
  const { user } = useAuth();
  const { selectedDealerId } = useDealerFilter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const limit = options?.limit || 50;
  const enabled = options?.enabled !== false;

  // ✅ VALIDATION: Only allow numeric dealer IDs, not "all"
  const isValidDealerId = selectedDealerId && typeof selectedDealerId === 'number' && selectedDealerId > 0;

  // =====================================================
  // FETCH NOTIFICATIONS
  // =====================================================

  const {
    data: notifications = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'getReadyNotifications',
      selectedDealerId,
      user?.id,
      options?.type,
      options?.priority,
      options?.is_read,
    ],
    queryFn: async () => {
      if (!isValidDealerId || !user?.id) {
        return [];
      }

      let query = supabase
        .from('get_ready_notifications')
        .select(
          `
          *,
          vehicle:related_vehicle_id (
            stock_number,
            vehicle_year,
            vehicle_make,
            vehicle_model,
            step_id
          )
        `
        )
        .eq('dealer_id', selectedDealerId)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply filters
      if (options?.type && options.type !== 'all') {
        query = query.eq('notification_type', options.type);
      }

      if (options?.priority && options.priority !== 'all') {
        query = query.eq('priority', options.priority);
      }

      if (options?.is_read !== undefined && options.is_read !== 'all') {
        query = query.eq('is_read', options.is_read);
      }

      if (options?.date_from) {
        query = query.gte('created_at', options.date_from);
      }

      if (options?.date_to) {
        query = query.lte('created_at', options.date_to);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []) as NotificationWithVehicle[];
    },
    enabled: enabled && isValidDealerId && !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // 1 minute auto-refresh
  });

  // =====================================================
  // GET UNREAD COUNT
  // =====================================================

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificationUnreadCount', selectedDealerId, user?.id],
    queryFn: async () => {
      if (!isValidDealerId || !user?.id) return 0;

      const { data, error } = await supabase.rpc(
        'get_unread_notification_count',
        {
          p_user_id: user.id,
          p_dealer_id: selectedDealerId,
        }
      );

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return data || 0;
    },
    enabled: enabled && isValidDealerId && !!user?.id,
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // 30 seconds auto-refresh
  });

  // =====================================================
  // GET NOTIFICATION SUMMARY
  // =====================================================

  const { data: summary } = useQuery({
    queryKey: ['notificationSummary', selectedDealerId, user?.id],
    queryFn: async (): Promise<NotificationSummary> => {
      if (!selectedDealerId || !user?.id) {
        return {
          total_unread: 0,
          unread_by_priority: { low: 0, medium: 0, high: 0, critical: 0 },
          unread_by_type: {},
        };
      }

      const { data, error } = await supabase
        .from('get_ready_notifications')
        .select('priority, notification_type')
        .eq('dealer_id', selectedDealerId)
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .eq('is_read', false)
        .is('dismissed_at', null);

      if (error) throw error;

      const summary: NotificationSummary = {
        total_unread: data.length,
        unread_by_priority: { low: 0, medium: 0, high: 0, critical: 0 },
        unread_by_type: {},
      };

      data.forEach((notif) => {
        summary.unread_by_priority[notif.priority]++;
        summary.unread_by_type[notif.notification_type] =
          (summary.unread_by_type[notif.notification_type] || 0) + 1;
      });

      return summary;
    },
    enabled: enabled && isValidDealerId && !!user?.id,
    staleTime: 30000,
  });

  // =====================================================
  // GET USER PREFERENCES
  // =====================================================

  const { data: preferences } = useQuery({
    queryKey: ['notificationPreferences', user?.id, selectedDealerId],
    queryFn: async () => {
      if (!user?.id || !isValidDealerId) return null;

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', selectedDealerId)
        .maybeSingle(); // Changed from .single() to .maybeSingle()

      if (error) {
        console.error('Error fetching preferences:', error);
        return null;
      }

      return data as UserNotificationPreferences | null;
    },
    enabled: enabled && !!user?.id && !!selectedDealerId,
  });

  // =====================================================
  // MARK AS READ MUTATION
  // =====================================================

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationSummary'] });
    },
    onError: (error) => {
      console.error('Error marking notification as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark notification as read',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // MARK ALL AS READ MUTATION
  // =====================================================

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !isValidDealerId) {
        throw new Error('User not authenticated or dealer not selected');
      }

      const { data, error } = await supabase.rpc(
        'mark_all_notifications_read',
        {
          p_user_id: user.id,
          p_dealer_id: selectedDealerId,
        }
      );

      if (error) throw error;
      return data; // Returns count of updated notifications
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationSummary'] });

      toast({
        title: 'Success',
        description: `Marked ${count} notification${count !== 1 ? 's' : ''} as read`,
      });
    },
    onError: (error) => {
      console.error('Error marking all notifications as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all notifications as read',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // DISMISS NOTIFICATION MUTATION
  // =====================================================

  const dismissNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('dismiss_notification', {
        p_notification_id: notificationId,
        p_user_id: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notificationSummary'] });

      toast({
        title: 'Notification dismissed',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Error dismissing notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to dismiss notification',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // UPDATE PREFERENCES MUTATION
  // =====================================================

  const updatePreferencesMutation = useMutation({
    mutationFn: async (
      updates: Partial<Omit<UserNotificationPreferences, 'user_id' | 'dealer_id'>>
    ) => {
      if (!user?.id || !isValidDealerId) {
        throw new Error('User not authenticated or dealer not selected');
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .upsert(
          {
            user_id: user.id,
            dealer_id: selectedDealerId,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,dealer_id',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });

      toast({
        title: 'Preferences updated',
        description: 'Your notification preferences have been saved',
      });
    },
    onError: (error) => {
      console.error('Error updating preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      });
    },
  });

  // =====================================================
  // REAL-TIME SUBSCRIPTION
  // =====================================================

  useEffect(() => {
    if (!enabled || !isValidDealerId || !user?.id) return;

    console.log('[useGetReadyNotifications] Setting up real-time subscription');

    // Subscribe to notifications table changes
    const channel = supabase
      .channel('get_ready_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'get_ready_notifications',
          filter: `dealer_id=eq.${selectedDealerId}`,
        },
        (payload) => {
          console.log('[Real-time] New notification received:', payload);

          // Check if notification is for this user (broadcast or specific user)
          const notification = payload.new as GetReadyNotification;
          if (
            notification.user_id === null ||
            notification.user_id === user.id
          ) {
            setHasNewNotifications(true);

            // Invalidate queries to fetch new data
            queryClient.invalidateQueries({
              queryKey: ['getReadyNotifications'],
            });
            queryClient.invalidateQueries({
              queryKey: ['notificationUnreadCount'],
            });
            queryClient.invalidateQueries({
              queryKey: ['notificationSummary'],
            });

            // Show toast for high/critical priority notifications
            if (
              notification.priority === 'high' ||
              notification.priority === 'critical'
            ) {
              toast({
                title: notification.title,
                description: notification.message,
                variant:
                  notification.priority === 'critical'
                    ? 'destructive'
                    : 'default',
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'get_ready_notifications',
          filter: `dealer_id=eq.${selectedDealerId}`,
        },
        () => {
          console.log('[Real-time] Notification updated');
          queryClient.invalidateQueries({
            queryKey: ['getReadyNotifications'],
          });
          queryClient.invalidateQueries({
            queryKey: ['notificationUnreadCount'],
          });
        }
      )
      .subscribe();

    return () => {
      console.log(
        '[useGetReadyNotifications] Cleaning up real-time subscription'
      );
      channel.unsubscribe();
    };
  }, [enabled, selectedDealerId, user?.id, queryClient, toast]);

  // =====================================================
  // RETURN HOOK INTERFACE
  // =====================================================

  return {
    // Data
    notifications,
    unreadCount,
    summary,
    preferences,
    hasNewNotifications,

    // State
    isLoading,
    error,

    // Actions
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    dismissNotification: dismissNotificationMutation.mutate,
    updatePreferences: updatePreferencesMutation.mutate,
    refetch,
    clearNewNotificationsFlag: () => setHasNewNotifications(false),

    // Mutation states
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDismissing: dismissNotificationMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
  };
}
