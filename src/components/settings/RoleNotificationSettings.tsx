import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRoleNotificationEvents, RoleNotificationEvent } from '@/hooks/useRoleNotificationEvents';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, Save, AlertCircle } from 'lucide-react';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CustomRole {
  id: string;
  role_name: string;
  description: string | null;
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
  { value: 'order_assigned', label: 'Order Assigned', description: 'When an order is assigned to someone' },
  { value: 'status_changed', label: 'Status Changed', description: 'When order status changes' },
  { value: 'field_updated', label: 'Field Updated', description: 'When important fields are updated' },
  { value: 'comment_added', label: 'Comment Added', description: 'When someone adds a comment' },
  { value: 'attachment_added', label: 'Attachment Added', description: 'When a file is attached' },
  { value: 'due_date_approaching', label: 'Due Date Approaching', description: 'When due date is near' },
  { value: 'overdue', label: 'Overdue', description: 'When order is overdue' },
  { value: 'priority_changed', label: 'Priority Changed', description: 'When priority is updated' },
  { value: 'follower_added', label: 'Follower Added', description: 'When user is added as follower' },
];

export function RoleNotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { dealerships } = useAccessibleDealerships();
  const currentDealerId = dealerships[0]?.id;

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');

  // Use the role notification events hook
  const {
    events,
    loading,
    saving,
    bulkSaveEvents,
    getEventsSummary,
  } = useRoleNotificationEvents(selectedRole || null, currentDealerId || null);

  // Local state for UI changes (before saving)
  const [localEvents, setLocalEvents] = useState<Record<string, Record<string, RoleNotificationEvent>>>({});

  // Fetch custom roles for current dealer
  useEffect(() => {
    if (!currentDealerId) return;

    const fetchRoles = async () => {
      const { data, error } = await supabase
        .from('dealer_custom_roles')
        .select('id, role_name, description')
        .eq('dealer_id', currentDealerId)
        .eq('is_active', true)
        .order('role_name');

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      setCustomRoles(data || []);
    };

    fetchRoles();
  }, [currentDealerId]);

  // Initialize local events from hook data
  useEffect(() => {
    if (!selectedRole) return;

    const organized: Record<string, Record<string, RoleNotificationEvent>> = {};

    // Create structure for all modules and events
    MODULES.forEach(module => {
      organized[module.value] = {};
      EVENTS.forEach(event => {
        // Find existing event from database
        const existingEvent = events.find(
          e => e.module === module.value && e.event_type === event.value
        );

        // Use existing or create default
        organized[module.value][event.value] = existingEvent || {
          role_id: selectedRole,
          module: module.value,
          event_type: event.value,
          enabled: false,
          event_config: {},
        };
      });
    });

    setLocalEvents(organized);
  }, [events, selectedRole]);

  const toggleModuleEnabled = (moduleValue: string, enabled: boolean) => {
    setLocalEvents(prev => {
      const updated = { ...prev };
      Object.keys(updated[moduleValue] || {}).forEach(eventKey => {
        updated[moduleValue][eventKey] = {
          ...updated[moduleValue][eventKey],
          enabled,
        };
      });
      return updated;
    });
  };

  const toggleEventEnabled = (moduleValue: string, eventValue: string, enabled: boolean) => {
    setLocalEvents(prev => ({
      ...prev,
      [moduleValue]: {
        ...prev[moduleValue],
        [eventValue]: {
          ...prev[moduleValue][eventValue],
          enabled,
        },
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedRole || !currentDealerId) return;

    // Collect all events (both enabled and disabled for complete record)
    const eventsToSave: RoleNotificationEvent[] = [];
    Object.values(localEvents).forEach(moduleRules => {
      Object.values(moduleRules).forEach(event => {
        eventsToSave.push(event);
      });
    });

    console.log(`[RoleNotificationSettings] Saving ${eventsToSave.length} events for role ${selectedRole}`);
    console.log(`[RoleNotificationSettings] Enabled events:`, eventsToSave.filter(e => e.enabled).length);

    const success = await bulkSaveEvents(eventsToSave);

    if (success) {
      const roleName = customRoles.find(r => r.id === selectedRole)?.role_name;
      const enabledCount = eventsToSave.filter(e => e.enabled).length;

      toast({
        title: 'Success',
        description: `Saved ${enabledCount} enabled notification events for ${roleName}`,
      });
    }
  };

  const summary = getEventsSummary();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Role-Based Notification Settings
        </CardTitle>
        <CardDescription>
          Configure which events trigger SMS notifications for each custom role (Level 2 Validation)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>How SMS Notifications Work</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>3-Level Validation System:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li><strong>Level 1:</strong> User must be a follower of the order</li>
              <li><strong>Level 2 (This Page):</strong> User's role must allow the event type</li>
              <li><strong>Level 3:</strong> User must have SMS globally enabled in their profile</li>
            </ol>
            <p className="mt-2 text-muted-foreground">
              All 3 levels must pass for SMS to be sent. Changes here affect all users with this role.
            </p>
          </AlertDescription>
        </Alert>

        {/* Role Selector */}
        <div className="space-y-2">
          <Label>Select Custom Role</Label>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a custom role..." />
            </SelectTrigger>
            <SelectContent>
              {customRoles.map(role => (
                <SelectItem key={role.id} value={role.id}>
                  {role.role_name}
                  {role.description && (
                    <span className="text-xs text-muted-foreground ml-2">
                      - {role.description}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedRole && !loading && (
          <>
            <Separator />

            {/* Summary Stats */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{summary.enabled}</span> of{' '}
                <span className="font-medium">{summary.total}</span> events enabled
              </div>
              <Badge variant={summary.enabled > 0 ? 'default' : 'secondary'}>
                {summary.enabled > 0 ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            {/* Modules Configuration */}
            <div className="space-y-6">
              {MODULES.map(module => {
                const moduleRules = localEvents[module.value] || {};
                const moduleEventsArray = Object.values(moduleRules);
                const anyEnabled = moduleEventsArray.some(r => r.enabled);
                const enabledCount = moduleEventsArray.filter(r => r.enabled).length;

                return (
                  <Card key={module.value} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{module.icon}</span>
                          <div>
                            <CardTitle className="text-base">{module.label}</CardTitle>
                            <CardDescription className="text-xs">
                              {enabledCount} of {EVENTS.length} events enabled
                            </CardDescription>
                          </div>
                        </div>
                        <Switch
                          checked={anyEnabled}
                          onCheckedChange={(checked) => toggleModuleEnabled(module.value, checked)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {EVENTS.map(event => {
                        const rule = moduleRules[event.value];
                        if (!rule) return null;

                        return (
                          <div
                            key={event.value}
                            className="flex items-start justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={(checked) =>
                                    toggleEventEnabled(module.value, event.value, checked)
                                  }
                                  className="scale-90"
                                />
                                <Label className="font-medium text-sm cursor-pointer">
                                  {event.label}
                                </Label>
                                {rule.enabled && (
                                  <Badge variant="default" className="text-xs">
                                    SMS Enabled
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground pl-10">
                                {event.description}
                              </p>

                              {/* Show special config for status_changed */}
                              {rule.enabled && event.value === 'status_changed' && (
                                <div className="pl-10 pt-2">
                                  <p className="text-xs text-muted-foreground mb-1">
                                    Allowed statuses: {
                                      rule.event_config?.allowed_statuses?.length
                                        ? rule.event_config.allowed_statuses.join(', ')
                                        : 'All statuses'
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Notification Rules'}
              </Button>
            </div>
          </>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading notification rules...</p>
            </div>
          </div>
        )}

        {!selectedRole && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Select a custom role to configure notification settings</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
