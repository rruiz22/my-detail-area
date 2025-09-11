import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SmartNotification {
  id: string;
  user_id: string;
  dealer_id: number;
  entity_type?: string;
  entity_id?: string;
  notification_type: string;
  channel: string;
  title: string;
  message: string;
  data: any;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  read_at?: string;
}

export interface NotificationGroup {
  entity_type: string;
  entity_id: string;
  notifications: SmartNotification[];
  unreadCount: number;
  latestNotification: SmartNotification;
}

export interface UseSmartNotificationsReturn {
  notifications: SmartNotification[];
  groupedNotifications: NotificationGroup[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markEntityAsRead: (entityType: string, entityId: string) => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

export function useSmartNotifications(dealerId?: number): UseSmartNotificationsReturn {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !dealerId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Error fetching notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id, dealerId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_log')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id || !dealerId) return;

    try {
      const { error } = await supabase
        .from('notification_log')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('dealer_id', dealerId)
        .neq('status', 'read');

      if (error) throw error;

      await fetchNotifications();
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [user?.id, dealerId, fetchNotifications]);

  const markEntityAsRead = useCallback(async (entityType: string, entityId: string) => {
    if (!user?.id || !dealerId) return;

    try {
      const { error } = await supabase
        .from('notification_log')
        .update({ 
          status: 'read',
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('dealer_id', dealerId)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .neq('status', 'read');

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => 
          n.entity_type === entityType && n.entity_id === entityId && n.status !== 'read'
            ? { ...n, status: 'read' as const, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      console.error('Error marking entity notifications as read:', err);
    }
  }, [user?.id, dealerId]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_log')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  // Group notifications by entity
  const groupedNotifications = useMemo(() => {
    const groups: { [key: string]: NotificationGroup } = {};

    notifications.forEach(notification => {
      if (!notification.entity_type || !notification.entity_id) return;

      const key = `${notification.entity_type}_${notification.entity_id}`;
      
      if (!groups[key]) {
        groups[key] = {
          entity_type: notification.entity_type,
          entity_id: notification.entity_id,
          notifications: [],
          unreadCount: 0,
          latestNotification: notification
        };
      }

      groups[key].notifications.push(notification);
      if (notification.status !== 'read') {
        groups[key].unreadCount++;
      }

      // Update latest notification if this one is newer
      if (new Date(notification.created_at) > new Date(groups[key].latestNotification.created_at)) {
        groups[key].latestNotification = notification;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.latestNotification.created_at).getTime() - 
      new Date(a.latestNotification.created_at).getTime()
    );
  }, [notifications]);

  const unreadCount = useMemo(() => 
    notifications.filter(n => n.status !== 'read').length, 
    [notifications]
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id || !dealerId) return;

    const channel = supabase
      .channel(`notifications_${user.id}_${dealerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_log',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, dealerId, fetchNotifications]);

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
    refreshNotifications: fetchNotifications
  };
}