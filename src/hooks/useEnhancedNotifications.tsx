import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  notificationService, 
  NotificationRequest, 
  NotificationResult,
  NotificationTemplate,
  DealerNotificationConfig,
  UserNotificationPreferences,
  NotificationChannel
} from '@/services/notificationService';
import { useTranslation } from 'react-i18next';

export interface EnhancedNotification {
  id: string;
  dealer_id: number;
  user_id?: string;
  notification_type: string;
  entity_type?: string;
  entity_id?: string;
  channels: NotificationChannel[];
  notification_data: Record<string, any>;
  priority: string;
  scheduled_for: string;
  status: string;
  attempts: number;
  created_at: string;
}

export function useEnhancedNotifications(dealerId?: number) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [dealerConfig, setDealerConfig] = useState<DealerNotificationConfig | null>(null);
  const [userPreferences, setUserPreferences] = useState<UserNotificationPreferences | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!dealerId || !user) return;
    
    setLoading(true);
    try {
      const [templatesData, configData, prefsData] = await Promise.all([
        notificationService.getTemplates(dealerId),
        notificationService.getDealerConfig(dealerId),
        notificationService.getUserPreferences(user.id, dealerId)
      ]);

      setTemplates(templatesData);
      setDealerConfig(configData);
      setUserPreferences(prefsData);

      // Load notifications from queue
      const { data: queueData } = await supabase
        .from('notification_queue')
        .select('*')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (queueData) {
        setNotifications(queueData as unknown as EnhancedNotification[]);
      }

      // Load analytics
      const analyticsData = await notificationService.getAnalytics(dealerId, {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        endDate: new Date()
      });
      setAnalytics(analyticsData);

    } catch (error) {
      console.error('Load notifications data error:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.loadError'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [dealerId, user, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates
  useEffect(() => {
    if (!dealerId) return;

    const channel = supabase
      .channel(`notifications_${dealerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_queue',
          filter: `dealer_id=eq.${dealerId}`
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealerId, loadData]);

  // Core notification functions
  const sendNotification = useCallback(async (request: NotificationRequest): Promise<NotificationResult> => {
    if (!dealerId) throw new Error('Dealer ID required');
    
    setLoading(true);
    try {
      const result = await notificationService.send({
        ...request,
        dealerId,
        userId: request.userId || user?.id
      });

      if (result.success) {
        toast({
          title: t('notifications.sent'),
          description: t('notifications.sentSuccessfully')
        });
        loadData(); // Refresh data
      } else {
        throw new Error('Failed to send notification');
      }

      return result;
    } catch (error) {
      console.error('Send notification error:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.sendError'),
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dealerId, user, t, loadData]);

  const sendBatchNotifications = useCallback(async (requests: NotificationRequest[]): Promise<NotificationResult[]> => {
    if (!dealerId) throw new Error('Dealer ID required');
    
    setLoading(true);
    try {
      const enrichedRequests = requests.map(req => ({
        ...req,
        dealerId,
        userId: req.userId || user?.id
      }));

      const results = await notificationService.sendBatch(enrichedRequests);
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      toast({
        title: t('notifications.batchSent'),
        description: t('notifications.batchSentMessage', { successful, failed })
      });

      loadData(); // Refresh data
      return results;
    } catch (error) {
      console.error('Send batch notifications error:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.batchSendError'),
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [dealerId, user, t, loadData]);

  // Configuration management
  const updateUserPreferences = useCallback(async (
    preferences: Partial<UserNotificationPreferences>
  ): Promise<boolean> => {
    if (!user || !dealerId) return false;

    setLoading(true);
    try {
      const success = await notificationService.updateUserPreferences(
        user.id,
        dealerId,
        preferences
      );

      if (success) {
        toast({
          title: t('notifications.preferencesUpdated'),
          description: t('notifications.preferencesUpdatedMessage')
        });
        loadData(); // Refresh data
      }

      return success;
    } catch (error) {
      console.error('Update preferences error:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.preferencesUpdateError'),
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, dealerId, t, loadData]);

  // Template management
  const renderTemplate = useCallback(async (
    templateId: string, 
    data: Record<string, any>
  ): Promise<Record<NotificationChannel, any>> => {
    try {
      return await notificationService.renderTemplate(templateId, data);
    } catch (error) {
      console.error('Render template error:', error);
      return {} as Record<NotificationChannel, any>;
    }
  }, []);

  // Quick notification methods
  const notifyOrderUpdate = useCallback(async (orderData: any) => {
    if (!user || !dealerId) return;

    return sendNotification({
      dealerId,
      userId: user.id,
      notificationType: 'order_update',
      entityType: 'order',
      entityId: orderData.id,
      channels: ['in_app', 'push'],
      data: {
        order_number: orderData.order_number,
        status: orderData.status,
        customer_name: orderData.customer_name
      },
      priority: 'normal'
    });
  }, [user, dealerId, sendNotification]);

  const notifyNewMessage = useCallback(async (messageData: any) => {
    if (!user || !dealerId) return;

    return sendNotification({
      dealerId,
      userId: user.id,
      notificationType: 'new_message',
      entityType: 'message',
      entityId: messageData.id,
      channels: ['in_app', 'push'],
      data: {
        sender_name: messageData.sender_name,
        message_preview: messageData.content?.substring(0, 100) || ''
      },
      priority: 'high'
    });
  }, [user, dealerId, sendNotification]);

  const notifySystemAlert = useCallback(async (alertData: any) => {
    if (!dealerId) return;

    return notificationService.notifySystemAlert(dealerId, alertData);
  }, [dealerId]);

  // Analytics helpers
  const getChannelStats = useCallback(() => {
    if (!analytics || !Array.isArray(analytics)) return {};

    const stats: Record<NotificationChannel, { sent: number; delivered: number; failed: number }> = {
      sms: { sent: 0, delivered: 0, failed: 0 },
      email: { sent: 0, delivered: 0, failed: 0 },
      push: { sent: 0, delivered: 0, failed: 0 },
      in_app: { sent: 0, delivered: 0, failed: 0 }
    };

    analytics.forEach((record: any) => {
      const channel = record.channel as NotificationChannel;
      if (stats[channel]) {
        if (record.event_type === 'sent') stats[channel].sent++;
        else if (record.event_type === 'delivered') stats[channel].delivered++;
        else if (record.event_type === 'failed') stats[channel].failed++;
      }
    });

    return stats;
  }, [analytics]);

  const getTotalNotifications = useCallback(() => {
    return notifications.length;
  }, [notifications]);

  const getPendingNotifications = useCallback(() => {
    return notifications.filter(n => n.status === 'queued').length;
  }, [notifications]);

  const getFailedNotifications = useCallback(() => {
    return notifications.filter(n => n.status === 'failed').length;
  }, [notifications]);

  return {
    // Data
    loading,
    notifications,
    templates,
    dealerConfig,
    userPreferences,
    analytics,

    // Core functions
    sendNotification,
    sendBatchNotifications,
    updateUserPreferences,
    renderTemplate,

    // Quick methods
    notifyOrderUpdate,
    notifyNewMessage,
    notifySystemAlert,

    // Analytics
    getChannelStats,
    getTotalNotifications,
    getPendingNotifications,
    getFailedNotifications,

    // Utility
    refresh: loadData
  };
}

// Hook for notification preferences management
export function useNotificationPreferences(dealerId?: number) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPreferences = useCallback(async () => {
    if (!user || !dealerId) return;

    setLoading(true);
    try {
      const prefs = await notificationService.getUserPreferences(user.id, dealerId);
      setPreferences(prefs);
    } catch (error) {
      console.error('Load preferences error:', error);
    } finally {
      setLoading(false);
    }
  }, [user, dealerId]);

  const updatePreferences = useCallback(async (updates: Partial<UserNotificationPreferences>) => {
    if (!user || !dealerId) return false;

    setLoading(true);
    try {
      const success = await notificationService.updateUserPreferences(user.id, dealerId, updates);
      if (success) {
        await loadPreferences();
      }
      return success;
    } catch (error) {
      console.error('Update preferences error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, dealerId, loadPreferences]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    loading,
    updatePreferences,
    refresh: loadPreferences
  };
}