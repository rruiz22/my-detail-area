import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useRoleNotificationEvents, RoleNotificationEvent } from '@/hooks/useRoleNotificationEvents';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, Save, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface RoleNotificationsModalProps {
  open: boolean;
  onClose: () => void;
  role: any;
  dealerId: string;
}

const MODULES = [
  { value: 'sales_orders', label: 'Sales Orders', icon: '💰' },
  { value: 'service_orders', label: 'Service Orders', icon: '🔧' },
  { value: 'recon_orders', label: 'Recon Orders', icon: '🚗' },
  { value: 'car_wash', label: 'Car Wash', icon: '🧼' },
  { value: 'get_ready', label: 'Get Ready', icon: '🚀' },
];

const EVENTS = [
  { value: 'order_created', label: 'Order Created', description: 'When a new order is created' },
  { value: 'order_assigned', label: 'Order Assigned', description: 'When an order is assigned' },
  { value: 'status_changed', label: 'Status Changed', description: 'When order status changes', hasConfig: true },
  { value: 'comment_added', label: 'Comment Added', description: 'When someone adds a comment' },
  { value: 'attachment_added', label: 'Attachment Added', description: 'When a file is attached' },
  { value: 'follower_added', label: 'Follower Added', description: 'When added as follower' },
  { value: 'field_updated', label: 'Field Updated', description: 'When important fields change', hasConfig: true },
  { value: 'due_date_approaching', label: 'Due Date Approaching', description: 'When due date is near', hasConfig: true },
  { value: 'overdue', label: 'Overdue', description: 'When order is overdue' },
  { value: 'priority_changed', label: 'Priority Changed', description: 'When priority changes' },
];

// Status options for status_changed event
const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function RoleNotificationsModal({
  open,
  onClose,
  role,
  dealerId,
}: RoleNotificationsModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    events,
    loading,
    saving,
    fetchEvents,
    bulkSaveEvents,
  } = useRoleNotificationEvents(role?.id, parseInt(dealerId));

  const [localChanges, setLocalChanges] = useState<Map<string, RoleNotificationEvent>>(new Map());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (open && role) {
      fetchEvents();
      setLocalChanges(new Map());
      setHasUnsavedChanges(false);
    }
  }, [open, role, fetchEvents]);

  /**
   * Get event from local changes or fallback to loaded events
   */
  const getEvent = (module: string, eventType: string): RoleNotificationEvent => {
    const key = `${module}:${eventType}`;

    if (localChanges.has(key)) {
      return localChanges.get(key)!;
    }

    const existingEvent = events.find(
      e => e.module === module && e.event_type === eventType
    );

    if (existingEvent) {
      return existingEvent;
    }

    // Return default structure
    return {
      role_id: role?.id,
      module,
      event_type: eventType,
      enabled: false,
      event_config: {},
    };
  };

  /**
   * Update local event state
   */
  const updateLocalEvent = (
    module: string,
    eventType: string,
    updates: Partial<RoleNotificationEvent>
  ) => {
    const key = `${module}:${eventType}`;
    const currentEvent = getEvent(module, eventType);
    const updatedEvent = { ...currentEvent, ...updates };

    setLocalChanges(prev => {
      const newChanges = new Map(prev);
      newChanges.set(key, updatedEvent);
      return newChanges;
    });

    setHasUnsavedChanges(true);
  };

  /**
   * Toggle event enabled/disabled locally
   */
  const handleToggleEvent = (module: string, eventType: string, enabled: boolean) => {
    updateLocalEvent(module, eventType, { enabled });
  };

  /**
   * Toggle all events in a module
   */
  const handleToggleModuleEvents = (module: string, enabled: boolean) => {
    EVENTS.forEach(event => {
      updateLocalEvent(module, event.value, { enabled });
    });
  };

  /**
   * Toggle specific status in allowed_statuses array
   */
  const toggleStatusInConfig = (module: string, status: string) => {
    const event = getEvent(module, 'status_changed');
    const currentStatuses = event.event_config?.allowed_statuses || [];

    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter(s => s !== status)
      : [...currentStatuses, status];

    updateLocalEvent(module, 'status_changed', {
      event_config: { allowed_statuses: newStatuses },
    });
  };

  /**
   * Save all changes
   *
   * CRITICAL FIX (2025-11-21): When user clicks Save with all toggles OFF,
   * we must create disabled records in role_notification_events.
   * Otherwise, Edge Function treats absence as "allow all" (security bug).
   */
  const handleSave = async () => {
    // Validate role exists
    if (!role) {
      console.error('[RoleNotificationsModal] Cannot save: role is missing');
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Role information is missing. Please close and reopen the modal.',
      });
      return;
    }

    // FIX: If no local changes but user clicked Save, they want to persist current state
    // This happens when user disables all events on first-time setup
    if (localChanges.size === 0) {
      console.log('[RoleNotificationsModal] No local changes detected');

      // Check if ANY events exist in database for this role
      if (events.length === 0) {
        console.warn('[RoleNotificationsModal] SECURITY FIX: No events in DB, creating disabled defaults');

        // Generate ALL possible events with enabled=false
        const allEventsDisabled: RoleNotificationEvent[] = [];
        MODULES.forEach(module => {
          EVENTS.forEach(event => {
            allEventsDisabled.push({
              role_id: role.id,
              module: module.value,
              event_type: event.value,
              enabled: false,
              event_config: {},
            });
          });
        });

        console.log(`[RoleNotificationsModal] Creating ${allEventsDisabled.length} disabled events`);
        const success = await bulkSaveEvents(allEventsDisabled);

        if (success) {
          toast({
            title: t('common.success'),
            description: `All notifications disabled for ${role.display_name}`,
          });
          onClose();
        }
        return;
      }

      // Events exist but no changes - just close
      console.log('[RoleNotificationsModal] Events exist, no changes to save');
      toast({
        title: t('common.info'),
        description: 'No notification settings were modified.',
      });
      onClose();
      return;
    }

    console.log(`[RoleNotificationsModal] Saving ${localChanges.size} event changes for role:`, role.display_name);
    const eventsToSave = Array.from(localChanges.values());
    console.log('[RoleNotificationsModal] Events to save:', eventsToSave.map(e => ({ module: e.module, event_type: e.event_type, enabled: e.enabled })));

    const success = await bulkSaveEvents(eventsToSave);

    if (success) {
      toast({
        title: t('common.success'),
        description: `${localChanges.size} notification settings saved for ${role.display_name}`,
      });
      setHasUnsavedChanges(false);
      onClose();
    }
  };

  /**
   * Get module statistics
   */
  const getModuleStats = (moduleValue: string) => {
    let total = 0;
    let enabled = 0;

    EVENTS.forEach(event => {
      total++;
      const evt = getEvent(moduleValue, event.value);
      if (evt.enabled) enabled++;
    });

    return { total, enabled };
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Bell className="h-6 w-6 text-amber-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">Notification Settings: {role.display_name}</DialogTitle>
              <DialogDescription className="mt-1">
                Configure which notification events this role can receive
              </DialogDescription>
            </div>
            {hasUnsavedChanges && (
              <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                Unsaved changes
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* 3-Level Architecture Info */}
          <Alert className="mb-6 card-enhanced border-blue-200 bg-blue-50/30">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-900 font-semibold">
              Level 2: Custom Role Permissions
            </AlertTitle>
            <AlertDescription className="text-blue-800 text-sm mt-1">
              Events enabled here are available to all users with this role. Users must also be followers (Level 1) and enable notifications in their profile (Level 3).
            </AlertDescription>
          </Alert>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading notification events...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {MODULES.map(module => {
                const stats = getModuleStats(module.value);
                const anyEnabled = stats.enabled > 0;

                return (
                  <Card key={module.value} className="card-enhanced border-purple-200 bg-purple-50/30">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded-lg">
                            <span className="text-2xl">{module.icon}</span>
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold">{module.label}</CardTitle>
                            <CardDescription className="text-xs mt-0.5">
                              {stats.enabled} of {stats.total} events enabled
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={anyEnabled}
                          onCheckedChange={(checked) => handleToggleModuleEvents(module.value, checked)}
                        />
                      </div>
                    </CardHeader>
                  <CardContent className="space-y-3">
                    {EVENTS.map(event => {
                      const evt = getEvent(module.value, event.value);
                      const allowedStatuses = evt.event_config?.allowed_statuses || [];

                      return (
                        <div
                          key={event.value}
                          className="flex flex-col gap-2 p-3 rounded-lg border bg-card"
                        >
                          {/* Event Toggle */}
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={evt.enabled}
                                  onCheckedChange={(checked) =>
                                    handleToggleEvent(module.value, event.value, checked)
                                  }
                                  className="scale-90"
                                />
                                <Label className="font-medium text-sm cursor-pointer">
                                  {event.label}
                                </Label>
                                {evt.enabled && (
                                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground pl-10">
                                {event.description}
                              </p>
                            </div>
                          </div>

                          {/* Status Configuration for status_changed event */}
                          {event.value === 'status_changed' && evt.enabled && (
                            <div className="pl-10 pt-2 space-y-2 border-t mt-2">
                              <Label className="text-xs font-semibold">
                                Allowed Statuses (empty = all statuses):
                              </Label>
                              <div className="flex flex-wrap gap-2">
                                {STATUS_OPTIONS.map(status => {
                                  const isSelected = allowedStatuses.includes(status.value);
                                  return (
                                    <Badge
                                      key={status.value}
                                      variant={isSelected ? 'default' : 'outline'}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => toggleStatusInConfig(module.value, status.value)}
                                    >
                                      {status.label}
                                    </Badge>
                                  );
                                })}
                              </div>
                              {allowedStatuses.length === 0 && (
                                <p className="text-xs text-muted-foreground">
                                  ℹ️ All status changes will trigger notifications (no filter)
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-6 pb-4 pt-4 border-t bg-gray-50/50 space-y-3">
          {/* Unsaved Changes Warning */}
          {hasUnsavedChanges && (
            <Alert className="card-enhanced border-amber-200 bg-amber-50/30">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900 font-semibold">
                Unsaved Changes
              </AlertTitle>
              <AlertDescription className="text-amber-800 text-sm mt-1">
                You have modified notification settings. Click "Save" to apply them.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">
              Configure which events trigger notifications for this role
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
