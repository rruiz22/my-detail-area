import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook for managing user_sms_notification_preferences (Level 3 of 3-level validation)
 * Handles user's personal notification preferences with multi-channel support
 *
 * IMPORTANT: Only shows events that are enabled in the user's Custom Role (Level 2)
 */

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export interface UserNotificationPreference {
  id?: string;
  user_id: string;
  dealer_id: number;
  module: string;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  event_preferences: Record<string, MultiChannelEventPreference>;
  max_sms_per_hour: number;
  max_sms_per_day: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  phone_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MultiChannelEventPreference {
  in_app: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

export interface AllowedEvent {
  module: string;
  event_type: string;
  allowed_by_role: boolean;
  event_config?: {
    allowed_statuses?: string[];
    default_minutes_before?: number;
    allowed_fields?: string[];
  };
}

export const useEventBasedNotificationPreferences = (
  dealerId: number | null,
  module: string
) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserNotificationPreference | null>(null);
  const [allowedEvents, setAllowedEvents] = useState<AllowedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Fetch user's custom role and allowed events (Level 2 validation)
   */
  const fetchAllowedEvents = useCallback(async () => {
    if (!user?.id || !dealerId) return;

    try {
      // 1. Get user's custom role
      const { data: membership, error: membershipError } = await supabase
        .from('dealer_memberships')
        .select('custom_role_id')
        .eq('user_id', user.id)
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .single();

      if (membershipError || !membership) {
        console.error('[useEventBasedNotificationPreferences] Error fetching membership:', membershipError);
        return;
      }

      // 2. Get allowed events for this role and module
      const { data: roleEvents, error: roleEventsError } = await supabase
        .from('role_notification_events')
        .select('*')
        .eq('role_id', membership.custom_role_id)
        .eq('module', module)
        .eq('enabled', true);

      if (roleEventsError) {
        console.error('[useEventBasedNotificationPreferences] Error fetching role events:', roleEventsError);
        return;
      }

      const allowed: AllowedEvent[] = (roleEvents || []).map(event => ({
        module: event.module,
        event_type: event.event_type,
        allowed_by_role: event.enabled,
        event_config: event.event_config,
      }));

      setAllowedEvents(allowed);
    } catch (error) {
      console.error('[useEventBasedNotificationPreferences] Error:', error);
    }
  }, [user?.id, dealerId, module]);

  /**
   * Fetch user's notification preferences (Level 3)
   */
  const fetchPreferences = useCallback(async () => {
    if (!user?.id || !dealerId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_sms_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', dealerId)
        .eq('module', module)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }

      if (data) {
        setPreferences(data);
      } else {
        // Create default preferences
        setPreferences({
          user_id: user.id,
          dealer_id: dealerId,
          module,
          sms_enabled: false,
          in_app_enabled: true,
          email_enabled: false,
          push_enabled: false,
          event_preferences: {},
          max_sms_per_hour: 10,
          max_sms_per_day: 50,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        });
      }
    } catch (error) {
      console.error('[useEventBasedNotificationPreferences] Error fetching preferences:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.fetch_preferences'),
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, dealerId, module, toast, t]);

  useEffect(() => {
    fetchAllowedEvents();
    fetchPreferences();
  }, [fetchAllowedEvents, fetchPreferences]);

  /**
   * Toggle channel for specific event
   */
  const toggleEventChannel = useCallback(
    (eventType: string, channel: NotificationChannel, enabled: boolean) => {
      if (!preferences) return;

      setPreferences(prev => {
        if (!prev) return null;

        const currentEventPref = prev.event_preferences[eventType] || {
          in_app: false,
          email: false,
          sms: false,
          push: false,
        };

        return {
          ...prev,
          event_preferences: {
            ...prev.event_preferences,
            [eventType]: {
              ...currentEventPref,
              [channel]: enabled,
            },
          },
        };
      });
    },
    [preferences]
  );

  /**
   * Toggle global channel enable/disable
   */
  const toggleGlobalChannel = useCallback(
    (channel: 'sms' | 'in_app' | 'email' | 'push', enabled: boolean) => {
      if (!preferences) return;

      const field = `${channel}_enabled` as keyof UserNotificationPreference;
      setPreferences(prev => (prev ? { ...prev, [field]: enabled } : null));
    },
    [preferences]
  );

  /**
   * Update rate limits
   */
  const updateRateLimits = useCallback(
    (maxPerHour: number, maxPerDay: number) => {
      if (!preferences) return;

      setPreferences(prev =>
        prev
          ? {
              ...prev,
              max_sms_per_hour: maxPerHour,
              max_sms_per_day: maxPerDay,
            }
          : null
      );
    },
    [preferences]
  );

  /**
   * Update quiet hours
   */
  const updateQuietHours = useCallback(
    (enabled: boolean, start: string, end: string) => {
      if (!preferences) return;

      setPreferences(prev =>
        prev
          ? {
              ...prev,
              quiet_hours_enabled: enabled,
              quiet_hours_start: start,
              quiet_hours_end: end,
            }
          : null
      );
    },
    [preferences]
  );

  /**
   * Save all preferences to database
   */
  const savePreferences = async (): Promise<boolean> => {
    if (!preferences || !user?.id || !dealerId) return false;

    setSaving(true);
    try {
      const { id, created_at, updated_at, ...prefsToSave } = preferences;

      const { error } = await supabase
        .from('user_sms_notification_preferences')
        .upsert(
          {
            ...prefsToSave,
            user_id: user.id,
            dealer_id: dealerId,
            module,
          },
          {
            onConflict: 'user_id,dealer_id,module',
          }
        );

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('notifications.preferences_saved'),
      });

      await fetchPreferences(); // Reload to get updated timestamps
      return true;
    } catch (error) {
      console.error('[useEventBasedNotificationPreferences] Error saving preferences:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.save_preferences'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Check if an event is allowed by user's role
   */
  const isEventAllowedByRole = useCallback(
    (eventType: string): boolean => {
      return allowedEvents.some(e => e.event_type === eventType);
    },
    [allowedEvents]
  );

  /**
   * Get event configuration from role
   */
  const getEventConfig = useCallback(
    (eventType: string) => {
      const event = allowedEvents.find(e => e.event_type === eventType);
      return event?.event_config || null;
    },
    [allowedEvents]
  );

  /**
   * Check if user has specific channel enabled for an event
   */
  const isChannelEnabledForEvent = useCallback(
    (eventType: string, channel: NotificationChannel): boolean => {
      if (!preferences) return false;

      const eventPref = preferences.event_preferences[eventType];
      return eventPref?.[channel] || false;
    },
    [preferences]
  );

  /**
   * Get summary of enabled notifications
   */
  const getEnabledSummary = useCallback(() => {
    if (!preferences) return { total: 0, byChannel: { in_app: 0, email: 0, sms: 0, push: 0 } };

    const summary = {
      total: 0,
      byChannel: { in_app: 0, email: 0, sms: 0, push: 0 },
    };

    Object.values(preferences.event_preferences).forEach(pref => {
      if (pref.in_app) summary.byChannel.in_app++;
      if (pref.email) summary.byChannel.email++;
      if (pref.sms) summary.byChannel.sms++;
      if (pref.push) summary.byChannel.push++;
      if (pref.in_app || pref.email || pref.sms || pref.push) summary.total++;
    });

    return summary;
  }, [preferences]);

  return {
    preferences,
    allowedEvents,
    loading,
    saving,
    toggleEventChannel,
    toggleGlobalChannel,
    updateRateLimits,
    updateQuietHours,
    savePreferences,
    isEventAllowedByRole,
    getEventConfig,
    isChannelEnabledForEvent,
    getEnabledSummary,
    fetchPreferences,
    fetchAllowedEvents,
  };
};
