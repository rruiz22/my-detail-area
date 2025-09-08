import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserNotification {
  id: string;
  type: 'user_invitation' | 'user_joined' | 'role_changed' | 'membership_updated' | 'system_alert';
  title: string;
  message: string;
  data: Record<string, any>;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  expires_at?: string;
  action_url?: string;
  action_label?: string;
}

export interface NotificationSettings {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  notification_types: {
    user_invitations: boolean;
    user_activity: boolean;
    role_changes: boolean;
    system_alerts: boolean;
  };
}

export const useUserNotifications = (dealerId?: number) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, this would fetch from a notifications table
      const mockNotifications: UserNotification[] = [
        {
          id: '1',
          type: 'user_invitation',
          title: 'New User Invitation',
          message: 'john.doe@example.com has been invited to join the team',
          data: { email: 'john.doe@example.com', role: 'Sales Manager' },
          read: false,
          priority: 'medium',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          action_url: '/users/invitations',
          action_label: 'View Invitations'
        },
        {
          id: '2',
          type: 'user_joined',
          title: 'New Team Member',
          message: 'Sarah Smith has joined your dealership',
          data: { user_id: 'user-123', name: 'Sarah Smith' },
          read: false,
          priority: 'low',
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          action_url: '/users',
          action_label: 'View Users'
        },
        {
          id: '3',
          type: 'role_changed',
          title: 'Role Updated',
          message: 'Mike Johnson\'s role has been changed to Detail Manager',
          data: { user_id: 'user-456', old_role: 'Detail Staff', new_role: 'Detail Manager' },
          read: true,
          priority: 'medium',
          created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '4',
          type: 'system_alert',
          title: 'System Maintenance',
          message: 'Scheduled maintenance will occur tonight from 2-4 AM',
          data: { maintenance_window: '2024-01-15T02:00:00Z' },
          read: false,
          priority: 'high',
          created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      ];

      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);

    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Error loading notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      // In a real implementation, this would fetch from user settings
      const mockSettings: NotificationSettings = {
        email_notifications: true,
        push_notifications: true,
        in_app_notifications: true,
        notification_frequency: 'immediate',
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        notification_types: {
          user_invitations: true,
          user_activity: true,
          role_changes: true,
          system_alerts: true
        }
      };

      setSettings(mockSettings);

    } catch (error: any) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Update notification in state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));

      // In a real implementation, this would update the database
      toast({
        title: 'Notification marked as read',
        duration: 2000,
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error updating notification',
        variant: 'destructive',
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      setUnreadCount(0);

      toast({
        title: 'All notifications marked as read',
        duration: 2000,
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error updating notifications',
        variant: 'destructive',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (notification && !notification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      toast({
        title: 'Notification deleted',
        duration: 2000,
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error deleting notification',
        variant: 'destructive',
      });
    }
  };

  const updateNotificationSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings } as NotificationSettings;
      setSettings(updatedSettings);

      // In a real implementation, this would update the database
      toast({
        title: t('common.success'),
        description: 'Notification settings updated',
      });

    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message || 'Error updating settings',
        variant: 'destructive',
      });
    }
  };

  const sendNotification = async (notification: Omit<UserNotification, 'id' | 'created_at' | 'read'>) => {
    try {
      const newNotification: UserNotification = {
        ...notification,
        id: `notif_${Date.now()}`,
        created_at: new Date().toISOString(),
        read: false
      };

      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Show toast for high priority notifications
      if (notification.priority === 'high' || notification.priority === 'urgent') {
        toast({
          title: notification.title,
          description: notification.message,
          duration: 5000,
        });
      }

    } catch (error: any) {
      console.error('Error sending notification:', error);
    }
  };

  const getNotificationsByType = (type: UserNotification['type']) => {
    return notifications.filter(n => n.type === type);
  };

  const getNotificationsByPriority = (priority: UserNotification['priority']) => {
    return notifications.filter(n => n.priority === priority);
  };

  useEffect(() => {
    fetchNotifications();
    fetchNotificationSettings();

    // Set up real-time notification subscription
    const subscription = supabase
      .channel('user-notifications')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_notifications',
          filter: dealerId ? `dealer_id=eq.${dealerId}` : undefined
        }, 
        (payload) => {
          console.log('Notification update:', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [dealerId]);

  return {
    notifications,
    settings,
    loading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateNotificationSettings,
    sendNotification,
    getNotificationsByType,
    getNotificationsByPriority
  };
};