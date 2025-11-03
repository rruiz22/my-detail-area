import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
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
import { Bell, Mail, MessageSquare, Save, Smartphone } from 'lucide-react';

interface RoleNotificationsModalProps {
  open: boolean;
  onClose: () => void;
  role: any;
  dealerId: string;
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
  auto_follow_enabled?: boolean;
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
  { value: 'status_changed', label: 'Status Changed', description: 'When order status changes' },
  { value: 'due_date_approaching', label: 'Due Date Approaching', description: 'When due date is near' },
  { value: 'overdue', label: 'Overdue', description: 'When order is overdue' },
];

const CHANNELS = [
  { value: 'in_app', label: 'In-App', icon: Bell },
  { value: 'sms', label: 'SMS', icon: MessageSquare },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Push', icon: Smartphone },
];

export function RoleNotificationsModal({
  open,
  onClose,
  role,
  dealerId,
}: RoleNotificationsModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<Record<string, Record<string, NotificationRule>>>({});
  const [autoFollowSettings, setAutoFollowSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !role) return;

    const fetchRules = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('dealer_notification_rules')
          .select('*')
          .eq('dealer_id', parseInt(dealerId))
          .contains('recipients', { roles: [role.id] });

        if (error) throw error;

        // Initialize rules structure
        const organized: Record<string, Record<string, NotificationRule>> = {};
        const autoFollow: Record<string, boolean> = {};

        MODULES.forEach(module => {
          organized[module.value] = {};
          autoFollow[module.value] = false; // Default: auto-follow disabled

          EVENTS.forEach(event => {
            organized[module.value][event.value] = {
              dealer_id: parseInt(dealerId),
              module: module.value,
              event: event.value,
              rule_name: `${module.label} - ${event.label} - ${role.display_name}`,
              description: `Notify ${role.display_name} when ${event.label.toLowerCase()} in ${module.label}`,
              recipients: {
                roles: [role.id],
                users: [],
                include_assigned_user: false,
              },
              conditions: {},
              channels: ['in_app'],
              priority: 50,
              enabled: false,
              auto_follow_enabled: false,
            };
          });
        });

        // Override with existing rules
        data?.forEach(rule => {
          if (organized[rule.module]?.[rule.event]) {
            organized[rule.module][rule.event] = rule;
            // Set auto-follow from any rule in the module
            if (rule.auto_follow_enabled) {
              autoFollow[rule.module] = true;
            }
          }
        });

        setRules(organized);
        setAutoFollowSettings(autoFollow);
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
  }, [open, role, dealerId, toast]);

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
    if (!role) return;

    setSaving(true);
    try {
      // Collect all enabled rules
      const rulesToSave: NotificationRule[] = [];
      Object.keys(rules).forEach(moduleKey => {
        Object.values(rules[moduleKey]).forEach(rule => {
          if (rule.enabled && rule.channels.length > 0) {
            // Add auto_follow_enabled setting for this module
            rulesToSave.push({
              ...rule,
              auto_follow_enabled: autoFollowSettings[moduleKey] || false
            });
          }
        });
      });

      // Delete existing rules for this role and dealer
      const { error: deleteError } = await supabase
        .from('dealer_notification_rules')
        .delete()
        .eq('dealer_id', parseInt(dealerId))
        .contains('recipients', { roles: [role.id] });

      if (deleteError) throw deleteError;

      // Insert new rules
      if (rulesToSave.length > 0) {
        const { error: insertError } = await supabase
          .from('dealer_notification_rules')
          .insert(rulesToSave.map(rule => {
            const { id, ...ruleWithoutId } = rule;
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
        description: `Notification settings saved for ${role.display_name}`,
      });

      onClose();
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save notification settings',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings: {role.display_name}
          </DialogTitle>
          <DialogDescription>
            Configure which notifications this role receives for each module
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading notification rules...</p>
            </div>
          </div>
        ) : (
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

                    {/* Auto-Follow Setting */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Label className="font-semibold text-sm">
                              🔔 Auto-Follow New Orders
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Automatically add users with this role as followers when new {module.label.toLowerCase()} are created
                          </p>
                        </div>
                        <Switch
                          checked={autoFollowSettings[module.value] || false}
                          onCheckedChange={(checked) => {
                            setAutoFollowSettings(prev => ({
                              ...prev,
                              [module.value]: checked
                            }));
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Separator />

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Notification Settings'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
