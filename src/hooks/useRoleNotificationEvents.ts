import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

/**
 * Hook for managing role_notification_events (Level 2 of 3-level validation)
 * Handles CRUD operations for Custom Role notification event configuration
 */

export interface RoleNotificationEvent {
  id?: string;
  role_id: string;
  module: string;
  event_type: string;
  enabled: boolean;
  event_config: {
    allowed_statuses?: string[]; // For status_changed events
    default_minutes_before?: number; // For due_date_approaching
    allowed_fields?: string[]; // For field_updated events
  };
  created_at?: string;
  updated_at?: string;
}

export interface RoleEventsSummary {
  total: number;
  enabled: number;
  byModule: Record<string, { total: number; enabled: number }>;
}

export const useRoleNotificationEvents = (roleId: string | null, dealerId: number | null) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [events, setEvents] = useState<RoleNotificationEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  /**
   * Fetch all notification events for a specific role
   */
  const fetchEvents = useCallback(async () => {
    if (!roleId) {
      console.warn('[useRoleNotificationEvents] fetchEvents called without roleId');
      return;
    }

    console.log('[useRoleNotificationEvents] Fetching events for role:', roleId);
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('role_notification_events')
        .select('*')
        .eq('role_id', roleId)
        .order('module')
        .order('event_type');

      if (error) throw error;

      console.log(`[useRoleNotificationEvents] Fetched ${data?.length || 0} events`);
      if (data && data.length > 0) {
        const enabledCount = data.filter(e => e.enabled).length;
        console.log(`[useRoleNotificationEvents] ${enabledCount} of ${data.length} events are enabled`);
        console.log('[useRoleNotificationEvents] Sample event:', data[0]);
      } else {
        console.warn('[useRoleNotificationEvents] No events found for this role - defaults will be shown');
      }

      setEvents(data || []);
    } catch (error) {
      console.error('[useRoleNotificationEvents] Error fetching events:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.fetch_role_events'),
      });
    } finally {
      setLoading(false);
    }
  }, [roleId, toast, t]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /**
   * Update a single event configuration
   */
  const updateEvent = async (
    module: string,
    eventType: string,
    updates: Partial<RoleNotificationEvent>
  ): Promise<boolean> => {
    if (!roleId) return false;

    try {
      const existingEvent = events.find(
        e => e.module === module && e.event_type === eventType
      );

      if (existingEvent) {
        // Update existing
        const { error } = await supabase
          .from('role_notification_events')
          .update(updates)
          .eq('id', existingEvent.id!);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('role_notification_events')
          .insert({
            role_id: roleId,
            module,
            event_type: eventType,
            ...updates,
          });

        if (error) throw error;
      }

      await fetchEvents();
      return true;
    } catch (error) {
      console.error('[useRoleNotificationEvents] Error updating event:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.update_role_event'),
      });
      return false;
    }
  };

  /**
   * Toggle event enabled/disabled
   */
  const toggleEvent = async (
    module: string,
    eventType: string,
    enabled: boolean
  ): Promise<boolean> => {
    return updateEvent(module, eventType, { enabled });
  };

  /**
   * Bulk update: Enable/disable all events for a module
   */
  const toggleModuleEvents = async (module: string, enabled: boolean): Promise<boolean> => {
    if (!roleId) return false;

    setSaving(true);
    try {
      const moduleEvents = events.filter(e => e.module === module);

      // Update existing events
      if (moduleEvents.length > 0) {
        const { error } = await supabase
          .from('role_notification_events')
          .update({ enabled })
          .eq('role_id', roleId)
          .eq('module', module);

        if (error) throw error;
      }

      await fetchEvents();

      toast({
        title: t('common.success'),
        description: t('notifications.module_events_updated', { module, enabled }),
      });

      return true;
    } catch (error) {
      console.error('[useRoleNotificationEvents] Error toggling module events:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.update_module_events'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Update event-specific configuration (e.g., allowed_statuses for status_changed)
   */
  const updateEventConfig = async (
    module: string,
    eventType: string,
    config: RoleNotificationEvent['event_config']
  ): Promise<boolean> => {
    return updateEvent(module, eventType, { event_config: config });
  };

  /**
   * Bulk save multiple events at once - OPTIMIZED
   */
  const bulkSaveEvents = async (eventsToSave: RoleNotificationEvent[]): Promise<boolean> => {
    if (!roleId) return false;

    setSaving(true);
    try {
      // Use upsert for maximum performance - single database operation
      const dataToUpsert = eventsToSave.map(e => ({
        id: e.id,
        role_id: roleId,
        module: e.module,
        event_type: e.event_type,
        enabled: e.enabled,
        event_config: e.event_config || {},
      }));

      // Single upsert operation handles both inserts and updates
      const { error } = await supabase
        .from('role_notification_events')
        .upsert(dataToUpsert, {
          onConflict: 'role_id,module,event_type',
          ignoreDuplicates: false,
        });

      if (error) throw error;

      // Refresh events from database
      await fetchEvents();

      // Toast notification handled by component, not hook
      return true;
    } catch (error) {
      console.error('[useRoleNotificationEvents] Error bulk saving events:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.save_events'),
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Get summary statistics for the role's events
   */
  const getEventsSummary = useCallback((): RoleEventsSummary => {
    const summary: RoleEventsSummary = {
      total: events.length,
      enabled: events.filter(e => e.enabled).length,
      byModule: {},
    };

    events.forEach(event => {
      if (!summary.byModule[event.module]) {
        summary.byModule[event.module] = { total: 0, enabled: 0 };
      }
      summary.byModule[event.module].total++;
      if (event.enabled) {
        summary.byModule[event.module].enabled++;
      }
    });

    return summary;
  }, [events]);

  /**
   * Check if a specific event is enabled
   */
  const isEventEnabled = useCallback(
    (module: string, eventType: string): boolean => {
      const event = events.find(e => e.module === module && e.event_type === eventType);
      return event?.enabled || false;
    },
    [events]
  );

  /**
   * Get event configuration
   */
  const getEventConfig = useCallback(
    (module: string, eventType: string): RoleNotificationEvent['event_config'] | null => {
      const event = events.find(e => e.module === module && e.event_type === eventType);
      return event?.event_config || null;
    },
    [events]
  );

  return {
    events,
    loading,
    saving,
    fetchEvents,
    updateEvent,
    toggleEvent,
    toggleModuleEvents,
    updateEventConfig,
    bulkSaveEvents,
    getEventsSummary,
    isEventEnabled,
    getEventConfig,
  };
};
