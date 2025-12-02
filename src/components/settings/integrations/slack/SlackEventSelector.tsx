/**
 * Slack Event Selector Component
 *
 * Allows users to configure which events trigger Slack notifications
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
interface SlackEvent {
  eventType: string;
  category: 'orders' | 'collaboration' | 'vehicles' | 'admin';
  enabled: boolean;
}

// Event group by module
interface EventGroup {
  module: string;
  moduleName: string;
  events: SlackEvent[];
  enabledCount: number;
  totalCount: number;
}

interface SlackEventSelectorProps {
  webhookId: string;
  dealerId: number;
  onSave?: () => void;
}

// Event definitions with their categories
const EVENT_DEFINITIONS: Record<string, { category: 'orders' | 'collaboration' | 'vehicles' | 'admin', module: string }> = {
  order_created: { category: 'orders', module: 'orders' },
  order_status_changed: { category: 'orders', module: 'orders' },
  order_completed: { category: 'orders', module: 'orders' },
  order_deleted: { category: 'orders', module: 'orders' },
  order_assigned: { category: 'orders', module: 'orders' },
  comment_added: { category: 'collaboration', module: 'orders' },
  file_uploaded: { category: 'collaboration', module: 'orders' },
  user_mentioned: { category: 'collaboration', module: 'orders' },
  follower_added: { category: 'collaboration', module: 'orders' },
  vehicle_added: { category: 'vehicles', module: 'vehicles' },
  vehicle_step_changed: { category: 'vehicles', module: 'vehicles' },
  vehicle_completed: { category: 'vehicles', module: 'vehicles' },
  vehicle_blocked: { category: 'vehicles', module: 'vehicles' },
};

export function SlackEventSelector({ webhookId, dealerId, onSave }: SlackEventSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['orders']));
  const [error, setError] = useState<string | null>(null);

  // Load event preferences on mount
  React.useEffect(() => {
    loadEventPreferences();
  }, [webhookId, dealerId]);

  /**
   * Load existing event preferences from database
   */
  const loadEventPreferences = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch existing preferences
      const { data: preferences, error: fetchError } = await supabase
        .from('dealer_slack_event_preferences')
        .select('event_type, enabled')
        .eq('webhook_id', webhookId)
        .eq('dealer_id', dealerId);

      if (fetchError) throw fetchError;

      // Build preference map
      const preferenceMap = new Map<string, boolean>();
      preferences?.forEach(pref => {
        preferenceMap.set(pref.event_type, pref.enabled);
      });

      // Group events by module
      const groups: Record<string, EventGroup> = {};

      Object.entries(EVENT_DEFINITIONS).forEach(([eventType, config]) => {
        const module = config.module;

        if (!groups[module]) {
          groups[module] = {
            module,
            moduleName: t(`integrations.slack_events.modules.${module}`, { defaultValue: module }),
            events: [],
            enabledCount: 0,
            totalCount: 0
          };
        }

        const enabled = preferenceMap.get(eventType) ?? false;

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

      setEventGroups(Object.values(groups));
    } catch (err) {
      console.error('Failed to load event preferences:', err);
      setError(t('integrations.slack_events.errors.load_failed', { defaultValue: 'Failed to load event preferences' }));
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.slack_events.errors.load_failed')
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update a single event preference
   */
  const updateEventPreference = async (eventType: string, enabled: boolean) => {
    setIsUpdating(true);

    try {
      const { error: upsertError } = await supabase
        .from('dealer_slack_event_preferences')
        .upsert({
          webhook_id: webhookId,
          dealer_id: dealerId,
          event_type: eventType,
          enabled
        }, {
          onConflict: 'webhook_id,dealer_id,event_type'
        });

      if (upsertError) throw upsertError;

      // Update local state
      setEventGroups(prev => prev.map(group => ({
        ...group,
        events: group.events.map(event =>
          event.eventType === eventType ? { ...event, enabled } : event
        ),
        enabledCount: group.events.reduce((count, event) =>
          count + ((event.eventType === eventType ? enabled : event.enabled) ? 1 : 0)
        , 0)
      })));

      onSave?.();
    } catch (err) {
      console.error('Failed to update event preference:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.slack_events.errors.update_failed')
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Toggle all events in a module
   */
  const batchUpdateModule = async (module: string, enabled: boolean) => {
    setIsUpdating(true);

    try {
      const group = eventGroups.find(g => g.module === module);
      if (!group) return;

      // Prepare batch upsert data
      const upsertData = group.events.map(event => ({
        webhook_id: webhookId,
        dealer_id: dealerId,
        event_type: event.eventType,
        enabled
      }));

      const { error: upsertError } = await supabase
        .from('dealer_slack_event_preferences')
        .upsert(upsertData, {
          onConflict: 'webhook_id,dealer_id,event_type'
        });

      if (upsertError) throw upsertError;

      // Update local state
      setEventGroups(prev => prev.map(g =>
        g.module === module
          ? {
              ...g,
              events: g.events.map(event => ({ ...event, enabled })),
              enabledCount: enabled ? g.totalCount : 0
            }
          : g
      ));

      toast({
        title: t('common.success'),
        description: t('integrations.slack_events.messages.batch_update_success')
      });

      onSave?.();
    } catch (err) {
      console.error('Failed to batch update events:', err);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.slack_events.errors.batch_update_failed')
      });
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Toggle group expansion
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
   * Calculate total enabled events across all groups
   */
  const totalEnabled = eventGroups.reduce((sum, group) => sum + group.enabledCount, 0);
  const totalEvents = eventGroups.reduce((sum, group) => sum + group.totalCount, 0);

  // Loading state
  if (isLoading) {
    return (
      <Card className="card-enhanced">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="card-enhanced border-red-200">
        <CardContent className="py-6">
          <div className="flex items-center gap-3 text-red-600">
            <MinusCircle className="h-5 w-5" />
            <p className="text-sm">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadEventPreferences}
            className="mt-4"
          >
            {t('common.action_buttons.retry', { defaultValue: 'Retry' })}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info header */}
      <Card className="card-enhanced bg-gray-50 border-gray-200">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
            <div>
              <CardTitle className="text-base font-medium text-gray-900">
                {t('integrations.slack_events.selector.title')}
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 mt-1">
                {t('integrations.slack_events.selector.description')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Event groups */}
      {eventGroups.map(group => (
        <EventGroupCard
          key={group.module}
          group={group}
          expanded={expandedGroups.has(group.module)}
          onToggleExpand={() => toggleGroup(group.module)}
          onUpdateEvent={updateEventPreference}
          onToggleAll={batchUpdateModule}
          isUpdating={isUpdating}
        />
      ))}

      {/* Summary footer */}
      <Card className="card-enhanced bg-emerald-50 border-emerald-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-900">
                {t('integrations.slack_events.selector.summary', {
                  enabled: totalEnabled,
                  total: totalEvents
                })}
              </span>
            </div>
            <Badge variant="default" className="bg-emerald-600">
              {totalEnabled}/{totalEvents}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Event Group Card - Collapsible module with toggle all
 */
interface EventGroupCardProps {
  group: EventGroup;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdateEvent: (eventType: string, enabled: boolean) => Promise<void>;
  onToggleAll: (module: string, enabled: boolean) => Promise<void>;
  isUpdating: boolean;
}

function EventGroupCard({
  group,
  expanded,
  onToggleExpand,
  onUpdateEvent,
  onToggleAll,
  isUpdating
}: EventGroupCardProps) {
  const { t } = useTranslation();

  const allEnabled = group.enabledCount === group.totalCount;
  const someEnabled = group.enabledCount > 0 && group.enabledCount < group.totalCount;
  const noneEnabled = group.enabledCount === 0;

  const handleToggleAll = () => {
    onToggleAll(group.module, !allEnabled);
  };

  return (
    <Collapsible open={expanded} onOpenChange={onToggleExpand}>
      <Card className="card-enhanced">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
                <div>
                  <CardTitle className="text-base font-medium text-gray-900">
                    {group.moduleName}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 mt-0.5">
                    {t('integrations.slack_events.selector.events_enabled', {
                      count: group.enabledCount,
                      total: group.totalCount,
                      defaultValue: `${group.enabledCount} events enabled`
                    })}
                  </CardDescription>
                </div>
              </div>

              <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                {allEnabled && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                {someEnabled && (
                  <MinusCircle className="h-5 w-5 text-amber-500" />
                )}
                {noneEnabled && (
                  <Circle className="h-5 w-5 text-gray-300" />
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleAll}
                  disabled={isUpdating}
                  className="text-xs"
                >
                  {allEnabled
                    ? t('common.action_buttons.disable_all', { defaultValue: 'Disable All' })
                    : t('common.action_buttons.enable_all', { defaultValue: 'Enable All' })}
                </Button>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-0 border-t pt-4">
            {/* Group events by category */}
            {['orders', 'collaboration', 'vehicles', 'admin'].map(category => {
              const categoryEvents = group.events.filter(e => e.category === category);
              if (categoryEvents.length === 0) return null;

              return (
                <div key={category} className="space-y-3 mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs font-medium">
                      {t(`integrations.slack_events.categories.${category}`)}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {categoryEvents.map(event => (
                      <EventRow
                        key={event.eventType}
                        event={event}
                        onToggle={(enabled) => onUpdateEvent(event.eventType, enabled)}
                        disabled={isUpdating}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Event Row - Individual event with toggle switch
 */
interface EventRowProps {
  event: SlackEvent;
  onToggle: (enabled: boolean) => void;
  disabled: boolean;
}

function EventRow({ event, onToggle, disabled }: EventRowProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <Label
          htmlFor={`event-${event.eventType}`}
          className="text-sm font-medium text-gray-900 cursor-pointer"
        >
          {t(`integrations.slack_events.${event.eventType}.title`)}
        </Label>
        <p className="text-xs text-gray-500 mt-0.5">
          {t(`integrations.slack_events.${event.eventType}.description`)}
        </p>
      </div>

      <Switch
        id={`event-${event.eventType}`}
        checked={event.enabled}
        onCheckedChange={onToggle}
        disabled={disabled}
      />
    </div>
  );
}
