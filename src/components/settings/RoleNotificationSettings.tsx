import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { Bell, Mail, MessageSquare, Save, Smartphone } from 'lucide-react';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

interface CustomRole {
  id: string;
  role_name: string;
  description: string | null;
}

interface NotificationRule {
  id?: string;
  dealer_id: number;
  module: string;
  event: string;
  rule_name: string;
  description: string;
  recipients: {
    roles: string[];
    users: string[];
    include_assigned_user: boolean;
  };
  conditions: any;
  channels: string[];
  priority: number;
  enabled: boolean;
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
  { value: 'due_date_approaching', label: 'Due Date Approaching', description: 'When due date is near' },
  { value: 'overdue', label: 'Overdue', description: 'When order is overdue' },
];

const CHANNELS = [
  { value: 'in_app', label: 'In-App', icon: Bell },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Push', icon: Smartphone },
];

export function RoleNotificationSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { dealerships } = useAccessibleDealerships();
  const currentDealerId = dealerships[0]?.id;

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notification rules by module and event
  const [rules, setRules] = useState<Record<string, Record<string, NotificationRule>>>({});

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

  // Fetch existing notification rules for selected role
  useEffect(() => {
    if (!selectedRole || !currentDealerId) return;

    const fetchRules = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dealer_notification_rules')
          .select('*')
          .eq('dealer_id', currentDealerId)
          .contains('recipients', { roles: [selectedRole] });

        if (error) throw error;

        // Organize rules by module and event
        const organized: Record<string, Record<string, NotificationRule>> = {};
        MODULES.forEach(module => {
          organized[module.value] = {};
          EVENTS.forEach(event => {
            organized[module.value][event.value] = {
              dealer_id: currentDealerId,
              module: module.value,
              event: event.value,
              rule_name: `${module.label} - ${event.label} - ${customRoles.find(r => r.id === selectedRole)?.role_name}`,
              description: `Send notifications to ${customRoles.find(r => r.id === selectedRole)?.role_name} when ${event.label}`,
              recipients: {
                roles: [selectedRole],
                users: [],
                include_assigned_user: false,
              },
              conditions: {},
              channels: ['in_app'], // Default
              priority: 50,
              enabled: false,
            };
          });
        });

        // Override with existing rules
        data?.forEach(rule => {
          if (organized[rule.module]?.[rule.event]) {
            organized[rule.module][rule.event] = rule;
          }
        });

        setRules(organized);
      } catch (error) {
        console.error('Error fetching rules:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load notification rules',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRules();
  }, [selectedRole, currentDealerId, customRoles, toast]);

  const toggleModuleEnabled = (moduleValue: string, enabled: boolean) => {
    setRules(prev => {
      const updated = { ...prev };
      Object.keys(updated[moduleValue] || {}).forEach(eventKey => {
        updated[moduleValue][eventKey].enabled = enabled;
      });
      return updated;
    });
  };

  const toggleEventEnabled = (moduleValue: string, eventValue: string, enabled: boolean) => {
    setRules(prev => ({
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

  const toggleChannel = (moduleValue: string, eventValue: string, channel: string) => {
    setRules(prev => {
      const rule = prev[moduleValue]?.[eventValue];
      if (!rule) return prev;

      const channels = rule.channels || [];
      const newChannels = channels.includes(channel)
        ? channels.filter(c => c !== channel)
        : [...channels, channel];

      return {
        ...prev,
        [moduleValue]: {
          ...prev[moduleValue],
          [eventValue]: {
            ...rule,
            channels: newChannels,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!selectedRole || !currentDealerId) return;

    setSaving(true);
    try {
      // Collect all enabled rules
      const rulesToSave: NotificationRule[] = [];
      Object.values(rules).forEach(moduleRules => {
        Object.values(moduleRules).forEach(rule => {
          if (rule.enabled && rule.channels.length > 0) {
            rulesToSave.push(rule);
          }
        });
      });

      // Delete existing rules for this role and dealer
      const { error: deleteError } = await supabase
        .from('dealer_notification_rules')
        .delete()
        .eq('dealer_id', currentDealerId)
        .contains('recipients', { roles: [selectedRole] });

      if (deleteError) throw deleteError;

      // Insert new rules
      if (rulesToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('dealer_notification_rules')
          .insert(rulesToSave.map(rule => {
            const { id, ...ruleWithoutId } = rule; // Remove id for insert
            return {
              ...ruleWithoutId,
              created_by: user?.id,
              updated_by: user?.id,
            };
          }));

        if (insertError) throw insertError;
      }

      toast({
        title: 'Success',
        description: `Notification rules saved for ${customRoles.find(r => r.id === selectedRole)?.role_name}`,
      });
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save notification rules',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Role-Based Notification Settings
        </CardTitle>
        <CardDescription>
          Configure which custom roles receive notifications for different modules and events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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

            {/* Modules Configuration */}
            <div className="space-y-6">
              {MODULES.map(module => {
                const moduleRules = rules[module.value] || {};
                const anyEnabled = Object.values(moduleRules).some(r => r.enabled);

                return (
                  <Card key={module.value} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{module.icon}</span>
                          <div>
                            <CardTitle className="text-base">{module.label}</CardTitle>
                            <CardDescription className="text-xs">
                              {Object.values(moduleRules).filter(r => r.enabled).length} of {EVENTS.length} events enabled
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
                              </div>
                              <p className="text-xs text-muted-foreground pl-10">
                                {event.description}
                              </p>
                              {rule.enabled && (
                                <div className="flex gap-2 pl-10 pt-2">
                                  {CHANNELS.map(channel => {
                                    const Icon = channel.icon;
                                    const isActive = rule.channels?.includes(channel.value);
                                    return (
                                      <Badge
                                        key={channel.value}
                                        variant={isActive ? 'default' : 'outline'}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => toggleChannel(module.value, event.value, channel.value)}
                                      >
                                        <Icon className="h-3 w-3 mr-1" />
                                        {channel.label}
                                      </Badge>
                                    );
                                  })}
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
