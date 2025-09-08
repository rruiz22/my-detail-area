import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { toast } from 'sonner';

export type NotificationFrequency = 'all' | 'mentions' | 'none' | 'scheduled';

export interface ChatNotificationSettings {
  user_id: string;
  dealer_id: number;
  
  // Global settings
  enable_push_notifications: boolean;
  enable_desktop_notifications: boolean;
  enable_email_notifications: boolean;
  
  // Per-type settings
  direct_message_notifications: NotificationFrequency;
  group_message_notifications: NotificationFrequency;
  channel_message_notifications: NotificationFrequency;
  
  // Do Not Disturb
  quiet_hours_start?: string; // HH:MM format
  quiet_hours_end?: string;   // HH:MM format
  quiet_days: number[];       // 0=Sunday, 1=Monday, etc.
  
  // Sound settings
  enable_message_sounds: boolean;
  enable_mention_sounds: boolean;
  custom_sound_url?: string;
}

export interface ChatNotification {
  id: string;
  type: 'direct_message' | 'group_message' | 'channel_message' | 'mention' | 'system';
  title: string;
  message: string;
  conversation_id: string;
  conversation_name?: string;
  sender_id: string;
  sender_name: string;
  created_at: string;
  is_read: boolean;
  is_muted: boolean;
  metadata: Record<string, any>;
}

interface UseChatNotificationsReturn {
  // Settings
  settings: ChatNotificationSettings | null;
  updateSettings: (updates: Partial<ChatNotificationSettings>) => Promise<boolean>;
  
  // Notification state
  notifications: ChatNotification[];
  unreadCount: number;
  
  // Actions
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  muteNotification: (notificationId: string) => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  clearAllNotifications: () => Promise<boolean>;
  
  // Utils
  isInQuietHours: () => boolean;
  shouldNotify: (conversationType: string, isMention: boolean) => boolean;
  playNotificationSound: (isMention?: boolean) => void;
  
  // Desktop/Push notifications
  requestNotificationPermission: () => Promise<boolean>;
  showDesktopNotification: (notification: Omit<ChatNotification, 'id' | 'is_read' | 'is_muted' | 'created_at'>) => void;
  
  loading: boolean;
  error: string | null;
}

export const useChatNotifications = (dealerId?: number): UseChatNotificationsReturn => {
  const { user } = useAuth();
  const { dealerships } = useAccessibleDealerships();
  
  const [settings, setSettings] = useState<ChatNotificationSettings | null>(null);
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>();
  const mentionAudioRef = useRef<HTMLAudioElement>();
  
  const activeDealerId = dealerId || dealerships[0]?.id;

  // Initialize notification settings
  const initializeSettings = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      setError(null);

      const { data: existingSettings, error: fetchError } = await supabase
        .from('chat_notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create default settings
        const defaultSettings: Omit<ChatNotificationSettings, 'user_id' | 'dealer_id'> = {
          enable_push_notifications: true,
          enable_desktop_notifications: true,
          enable_email_notifications: false,
          direct_message_notifications: 'all',
          group_message_notifications: 'mentions',
          channel_message_notifications: 'mentions',
          quiet_hours_start: undefined,
          quiet_hours_end: undefined,
          quiet_days: [],
          enable_message_sounds: true,
          enable_mention_sounds: true,
          custom_sound_url: undefined
        };

        const { data: newSettings, error: createError } = await supabase
          .from('chat_notification_settings')
          .insert({
            user_id: user.id,
            dealer_id: activeDealerId,
            ...defaultSettings
          })
          .select()
          .single();

        if (createError) throw createError;
        const typedNewSettings = {
          ...newSettings,
          quiet_days: (newSettings.quiet_days as number[]) || []
        };
        setSettings(typedNewSettings);
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Cast JSON fields to proper types
        const typedSettings = {
          ...existingSettings,
          quiet_days: (existingSettings.quiet_days as number[]) || []
        };
        setSettings(typedSettings);
      }
    } catch (err) {
      console.error('Error initializing notification settings:', err);
      setError(err instanceof Error ? err.message : 'Error initializing notification settings');
    }
  }, [user?.id, activeDealerId]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      // For demo purposes, we'll simulate notifications
      // In a real implementation, this would fetch from a notifications table
      const mockNotifications: ChatNotification[] = [];
      setNotifications(mockNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Error fetching notifications');
    }
  }, [user?.id, activeDealerId]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<ChatNotificationSettings>): Promise<boolean> => {
    if (!user?.id || !activeDealerId) return false;

    try {
      const { error } = await supabase
        .from('chat_notification_settings')
        .update(updates)
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId);

      if (error) throw error;

      setSettings(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating notification settings:', err);
      setError(err instanceof Error ? err.message : 'Error updating notification settings');
      return false;
    }
  }, [user?.id, activeDealerId]);

  // Check if currently in quiet hours
  const isInQuietHours = useCallback((): boolean => {
    if (!settings?.quiet_hours_start || !settings?.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const currentDay = now.getDay(); // 0 = Sunday

    // Check if today is a quiet day
    if (settings.quiet_days.includes(currentDay)) {
      return true;
    }

    // Parse quiet hours
    const [startHour, startMinute] = settings.quiet_hours_start.split(':').map(Number);
    const [endHour, endMinute] = settings.quiet_hours_end.split(':').map(Number);
    
    const startTime = startHour * 100 + startMinute;
    const endTime = endHour * 100 + endMinute;

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime;
    } else {
      return currentTime >= startTime && currentTime <= endTime;
    }
  }, [settings]);

  // Check if should notify based on settings
  const shouldNotify = useCallback((conversationType: string, isMention: boolean): boolean => {
    if (!settings || isInQuietHours()) return false;

    let frequency: NotificationFrequency;
    
    switch (conversationType) {
      case 'direct':
        frequency = settings.direct_message_notifications;
        break;
      case 'group':
        frequency = settings.group_message_notifications;
        break;
      case 'channel':
      case 'announcement':
        frequency = settings.channel_message_notifications;
        break;
      default:
        return false;
    }

    switch (frequency) {
      case 'all':
        return true;
      case 'mentions':
        return isMention;
      case 'none':
        return false;
      case 'scheduled':
        return !isInQuietHours();
      default:
        return false;
    }
  }, [settings, isInQuietHours]);

  // Play notification sound
  const playNotificationSound = useCallback((isMention = false) => {
    if (!settings) return;

    if (isMention && settings.enable_mention_sounds) {
      if (mentionAudioRef.current) {
        mentionAudioRef.current.play().catch(console.error);
      }
    } else if (settings.enable_message_sounds) {
      if (audioRef.current) {
        audioRef.current.play().catch(console.error);
      }
    }
  }, [settings]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: Omit<ChatNotification, 'id' | 'is_read' | 'is_muted' | 'created_at'>) => {
    if (!settings?.enable_desktop_notifications) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    try {
      const desktopNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.conversation_id, // Prevent duplicate notifications
        requireInteraction: notification.type === 'mention',
        silent: false
      });

      desktopNotification.onclick = () => {
        window.focus();
        // Navigate to conversation
        window.location.hash = `/chat/conversation/${notification.conversation_id}`;
        desktopNotification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        desktopNotification.close();
      }, 5000);
    } catch (err) {
      console.error('Error showing desktop notification:', err);
    }
  }, [settings?.enable_desktop_notifications]);

  // Show in-app notification
  const showInAppNotification = useCallback((notification: Omit<ChatNotification, 'id' | 'is_read' | 'is_muted' | 'created_at'>) => {
    const isMention = notification.type === 'mention';
    
    toast(notification.title, {
      description: notification.message,
      action: {
        label: 'Ver',
        onClick: () => {
          window.location.hash = `/chat/conversation/${notification.conversation_id}`;
        }
      },
      duration: isMention ? 10000 : 5000,
      className: isMention ? 'border-orange-500' : undefined
    });

    // Play sound
    playNotificationSound(isMention);
  }, [playNotificationSound]);

  // Process incoming message for notifications
  const processMessageForNotification = useCallback((message: any, conversationType: string, conversationName?: string) => {
    if (!user?.id || message.user_id === user.id) return; // Don't notify for own messages

    const isMention = message.mentions?.includes(user.id);
    
    if (!shouldNotify(conversationType, isMention)) return;

    const notification = {
      type: isMention ? 'mention' : `${conversationType}_message`,
      title: isMention ? 'Te mencionaron' : conversationName || 'Nuevo mensaje',
      message: `${message.sender?.name}: ${message.content || '📎 Archivo adjunto'}`,
      conversation_id: message.conversation_id,
      conversation_name: conversationName,
      sender_id: message.user_id,
      sender_name: message.sender?.name || 'Usuario desconocido',
      metadata: {
        message_id: message.id,
        message_type: message.message_type
      }
    } as Omit<ChatNotification, 'id' | 'is_read' | 'is_muted' | 'created_at'>;

    // Show notifications
    showInAppNotification(notification);
    showDesktopNotification(notification);

    // Add to notifications list
    const fullNotification: ChatNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random()}`,
      is_read: false,
      is_muted: false,
      created_at: new Date().toISOString()
    };

    setNotifications(prev => [fullNotification, ...prev].slice(0, 100)); // Keep last 100 notifications
  }, [user?.id, shouldNotify, showInAppNotification, showDesktopNotification]);

  // Notification actions
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, is_read: true } : notif
    ));
    return true;
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
    return true;
  }, []);

  const muteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    setNotifications(prev => prev.map(notif => 
      notif.id === notificationId ? { ...notif, is_muted: true } : notif
    ));
    return true;
  }, []);

  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
    return true;
  }, []);

  const clearAllNotifications = useCallback(async (): Promise<boolean> => {
    setNotifications([]);
    return true;
  }, []);

  // Computed values
  const unreadCount = notifications.filter(n => !n.is_read && !n.is_muted).length;

  // Initialize audio elements
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3');
    mentionAudioRef.current = new Audio('/sounds/mention.mp3');
    
    // Set volume
    if (audioRef.current) audioRef.current.volume = 0.5;
    if (mentionAudioRef.current) mentionAudioRef.current.volume = 0.7;

    return () => {
      audioRef.current = undefined;
      mentionAudioRef.current = undefined;
    };
  }, []);

  // Real-time message subscription for notifications
  useEffect(() => {
    if (!user?.id || !activeDealerId) return;

    const messageChannel = supabase
      .channel(`notifications:${activeDealerId}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=neq.${user.id}` // Only listen to messages from others
        },
        async (payload) => {
          // Get conversation info
          const { data: conversation } = await supabase
            .from('chat_conversations')
            .select('conversation_type, name')
            .eq('id', payload.new.conversation_id)
            .single();

          if (conversation) {
            processMessageForNotification(
              payload.new, 
              conversation.conversation_type,
              conversation.name
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
    };
  }, [user?.id, activeDealerId, processMessageForNotification]);

  // Initialize on mount
  useEffect(() => {
    if (user?.id && activeDealerId) {
      setLoading(true);
      Promise.all([
        initializeSettings(),
        fetchNotifications()
      ]).finally(() => setLoading(false));
    }
  }, [user?.id, activeDealerId, initializeSettings, fetchNotifications]);

  return {
    settings,
    updateSettings,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    muteNotification,
    deleteNotification,
    clearAllNotifications,
    isInQuietHours,
    shouldNotify,
    playNotificationSound,
    requestNotificationPermission,
    showDesktopNotification,
    loading,
    error
  };
};