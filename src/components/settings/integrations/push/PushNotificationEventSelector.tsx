/**
 * Push Notification Event Selector Component
 *
 * Allows admins to configure which events trigger push notifications
 * Organized by module with collapsible groups and batch toggle functionality
 *
 * @component
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  MinusCircle,
  Loader2,
  Info
} from 'lucide-react';

// Event definition interface
interface PushEvent {
  eventType: string;
  category: 'orders' | 'collaboration' | 'vehicles';
  enabled: boolean;
}

// Event group by module
interface EventGroup {
  module: string;
  moduleName: string;
  events: PushEvent[];
  enabledCount: number;
  totalCount: number;
}

interface PushNotificationEventSelectorProps {
  dealerId: number;
}

// Event definitions - same 13 events as Slack
const EVENT_DEFINITIONS: Record<string, { category: 'orders' | 'collaboration' | 'vehicles', modules: string[] }> = {
  order_created: { category: 'orders', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash'] },
  order_status_changed: { category: 'orders', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash'] },
  order_completed: { category: 'orders', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash'] },
  order_deleted: { category: 'orders', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash'] },
  order_assigned: { category: 'orders', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash'] },
  comment_added: { category: 'collaboration', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready'] },
  file_uploaded: { category: 'collaboration', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready'] },
  user_mentioned: { category: 'collaboration', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready'] },
  follower_added: { category: 'collaboration', modules: ['sales_orders', 'service_orders', 'recon_orders', 'car_wash', 'get_ready'] },
  vehicle_added: { category: 'vehicles', modules: ['get_ready'] },
  vehicle_step_changed: { category: 'vehicles', modules: ['get_ready'] },
  vehicle_completed: { category: 'vehicles', modules: ['get_ready'] },
  vehicle_blocked: { category: 'vehicles', modules: ['get_ready'] },
};

export function PushNotificationEventSelector({ dealerId }: PushNotificationEventSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['sales_orders']));
  const [error, setError] = useState<string | null>(null);

  // Load event preferences on mount
  React.useEffect(() => {
    loadEventPreferences();
  }, [dealerId]);

  /**
   * Load existing event preferences from database
   */
  const loadEventPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch existing preferences
      const { data: preferences, error: fetchError } = await supabase
        .from('dealer_push_notification_preferences')
        .select('module, event_type, enabled')
        .eq('dealer_id', dealerId);

      if (fetchError) throw fetchError;

      // Build preference map
      const preferenceMap = new Map<string, boolean>();
      preferences?.forEach(pref => {
        const key = `${pref.module}:${pref.event_type}`;
        preferenceMap.set(key, pref.enabled);
      });

      // Group events by module
      const groups: Record<string, EventGroup> = {};

      Object.entries(EVENT_DEFINITIONS).forEach(([eventType, config]) => {
        config.modules.forEach(module => {
          if (!groups[module]) {
            groups[module] = {
              module,
              moduleName: getModuleName(module),
              events: [],
              enabledCount: 0,
              totalCount: 0
            };
          }

          const key = `${module}:${eventType}`;
          const enabled = preferenceMap.get(key) ?? true; // Default to enabled

          groups[module].events.push({
            eventType,
            category: config.category,
            enabled
          });

          groups[module].totalCount++;
          if (enabled) {
            groups[module].enabledCount++;
          }
        });
      });

      setEventGroups(Object.values(groups));
    } catch (err) {
      console.error('Failed to load push event preferences:', err);
      setError('Failed to load event preferences');
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to load push notification event preferences'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get module display name
   */
  const getModuleName = (module: string): string => {
    const names: Record<string, string> = {
      sales_orders: 'Sales Orders',
      service_orders: 'Service Orders',
      recon_orders: 'Recon Orders',
      car_wash: 'Car Wash',
      get_ready: 'Get Ready'
    };
    return names[module] || module;
  };

  /**
   * Get event display name
   */
  const getEventName = (eventType: string): string => {
    const names: Record<string, string> = {
      order_created: 'Order Created',
      order_status_changed: 'Order Status Changed',
      order_completed: 'Order Completed',
      order_deleted: 'Order Deleted',
      order_assigned: 'Order Assigned',
      comment_added: 'Comment Added',
      file_uploaded: 'File Uploaded',
      user_mentioned: 'User Mentioned',
      follower_added: 'Follower Added',
      vehicle_added: 'Vehicle Added',
      vehicle_step_changed: 'Vehicle Step Changed',
      vehicle_completed: 'Vehicle Completed',
      vehicle_blocked: 'Vehicle Blocked',
    };
    return names[eventType] || eventType;
  };

  /**
   * Update a single event preference
   */
  const updateEventPreference = async (module: string, eventType: string, enabled: boolean) => {
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from('dealer_push_notification_preferences')
        .upsert({
          dealer_id: dealerId,
          module,
          event_type: eventType,
          enabled,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'dealer_id,module,event_type'
        });

      if (error) throw error;

      // Update local state
      setEventGroups(groups => groups.map(group => {
        if (group.module !== module) return group;

        const updatedEvents = group.events.map(event =>
          event.eventType === eventType ? { ...event, enabled } : event
        );

        return {
          ...group,
          events: updatedEvents,
          enabledCount: updatedEvents.filter(e => e.enabled).length
        };
      }));

      toast({
        title: t('common.success'),
        description: `Push notification ${enabled ? 'enabled' : 'disabled'} for ${getEventName(eventType)}`
      });
    } catch (err) {
      console.error('Failed to update push event preference:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to update push notification preference'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Enable all events for a module
   */
  const enableAllForModule = async (module: string) => {
    setIsUpdating(true);

    try {
      const group = eventGroups.find(g => g.module === module);
      if (!group) return;

      const updates = group.events.map(event => ({
        dealer_id: dealerId,
        module,
        event_type: event.eventType,
        enabled: true,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('dealer_push_notification_preferences')
        .upsert(updates, {
          onConflict: 'dealer_id,module,event_type'
        });

      if (error) throw error;

      // Update local state
      setEventGroups(groups => groups.map(g => {
        if (g.module !== module) return g;
        return {
          ...g,
          events: g.events.map(e => ({ ...e, enabled: true })),
          enabledCount: g.totalCount
        };
      }));

      toast({
        title: t('common.success'),
        description: `All push notifications enabled for ${group.moduleName}`
      });
    } catch (err) {
      console.error('Failed to enable all events:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to enable all events'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Disable all events for a module
   */
  const disableAllForModule = async (module: string) => {
    setIsUpdating(true);

    try {
      const group = eventGroups.find(g => g.module === module);
      if (!group) return;

      const updates = group.events.map(event => ({
        dealer_id: dealerId,
        module,
        event_type: event.eventType,
        enabled: false,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('dealer_push_notification_preferences')
        .upsert(updates, {
          onConflict: 'dealer_id,module,event_type'
        });

      if (error) throw error;

      // Update local state
      setEventGroups(groups => groups.map(g => {
        if (g.module !== module) return g;
        return {
          ...g,
          events: g.events.map(e => ({ ...e, enabled: false })),
          enabledCount: 0
        };
      }));

      toast({
        title: t('common.success'),
        description: `All push notifications disabled for ${group.moduleName}`
      });
    } catch (err) {
      console.error('Failed to disable all events:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to disable all events'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Toggle expanded state for a module group
   */
  const toggleGroup = (module: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      return next;
    });
  };

  /**
   * Get status badge for module
   */
  const getModuleStatusBadge = (group: EventGroup) => {
    if (group.enabledCount === 0) {
      return <Badge variant="secondary"><Circle className="h-3 w-3 mr-1" />All Off</Badge>;
    } else if (group.enabledCount === group.totalCount) {
      return <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />All On</Badge>;
    } else {
      return <Badge variant="outline"><MinusCircle className="h-3 w-3 mr-1" />{group.enabledCount}/{group.totalCount}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Loading push notification preferences...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-enhanced border-destructive">
        <CardContent className="py-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={loadEventPreferences} variant="outline" size="sm" className="mt-4">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="text-lg">
          Event Configuration
        </CardTitle>
        <CardDescription>
          Configure which events trigger push notifications for each module
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Info banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Enable notifications per event type. Users will receive push notifications based on their individual preferences and active devices.
            </p>
          </div>
        </div>

        {/* Module groups */}
        <div className="space-y-3">
          {eventGroups.map((group) => (
            <Collapsible
              key={group.module}
              open={expandedGroups.has(group.module)}
              onOpenChange={() => toggleGroup(group.module)}
            >
              <div className="rounded-lg border bg-card">
                {/* Module header */}
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      {expandedGroups.has(group.module) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div>
                        <h3 className="font-semibold text-sm">{group.moduleName}</h3>
                        <p className="text-xs text-muted-foreground">{group.totalCount} events</p>
                      </div>
                    </div>
                    {getModuleStatusBadge(group)}
                  </div>
                </CollapsibleTrigger>

                {/* Event list */}
                <CollapsibleContent>
                  <div className="border-t">
                    {/* Batch actions */}
                    <div className="px-4 py-2 bg-muted/30 flex gap-2 border-b">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          enableAllForModule(group.module);
                        }}
                        disabled={isUpdating || group.enabledCount === group.totalCount}
                      >
                        Enable All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          disableAllForModule(group.module);
                        }}
                        disabled={isUpdating || group.enabledCount === 0}
                      >
                        Disable All
                      </Button>
                    </div>

                    {/* Individual events */}
                    <div className="divide-y">
                      {group.events.map((event) => (
                        <div
                          key={event.eventType}
                          className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex-1">
                            <Label
                              htmlFor={`${group.module}-${event.eventType}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {getEventName(event.eventType)}
                            </Label>
                            <p className="text-xs text-muted-foreground capitalize">
                              {event.category}
                            </p>
                          </div>
                          <Switch
                            id={`${group.module}-${event.eventType}`}
                            checked={event.enabled}
                            onCheckedChange={(enabled) =>
                              updateEventPreference(group.module, event.eventType, enabled)
                            }
                            disabled={isUpdating}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
