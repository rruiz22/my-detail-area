/**
 * Dealer Channel Matrix Component
 *
 * Enterprise UI for configuring notification channels (SMS, Email, Push, In-App, Slack)
 * per event type at the dealership level.
 *
 * Features:
 * - Matrix view: Events × Channels
 * - Bulk actions per channel
 * - Cost impact preview for SMS
 * - Module tabs (Sales, Service, Recon, etc.)
 * - Validation and warnings
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import {
  Save,
  RotateCcw,
  Info,
  DollarSign,
  Mail,
  MessageSquare,
  Bell,
  Smartphone,
  AlertTriangle,
  CheckCircle2,
  Hash
} from 'lucide-react';
import {
  NOTIFICATION_EVENT_OPTIONS,
  DEFAULT_CHANNEL_CONFIG,
  calculateSMSCostImpact,
  validateChannelConfig,
  type NotificationModule,
  type EventChannelMatrix,
  type NotificationChannel
} from '@/types/dealerChannelDefaults';

export function DealerChannelMatrix() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();
  const queryClient = useQueryClient();

  const [activeModule, setActiveModule] = useState<NotificationModule>('sales_orders');
  const [channelConfig, setChannelConfig] = useState<EventChannelMatrix>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch current configuration
  const { data: configData, isLoading, error } = useQuery({
    queryKey: ['dealer-channel-defaults', enhancedUser?.dealership_id, activeModule],
    queryFn: async () => {
      if (!enhancedUser?.dealership_id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('dealer_notification_channel_defaults')
        .select('*')
        .eq('dealer_id', enhancedUser.dealership_id)
        .eq('module', activeModule)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
    enabled: !!enhancedUser?.dealership_id
  });

  // Initialize config when data loads
  useEffect(() => {
    if (configData?.event_channel_config) {
      setChannelConfig(configData.event_channel_config as EventChannelMatrix);
    } else {
      // Use defaults for new configuration
      setChannelConfig(DEFAULT_CHANNEL_CONFIG);
    }
    setHasChanges(false);
  }, [configData, activeModule]);

  // Mutation to save configuration
  const saveMutation = useMutation({
    mutationFn: async (config: EventChannelMatrix) => {
      if (!enhancedUser?.dealership_id) {
        throw new Error('No dealership selected');
      }

      const { error } = await supabase
        .from('dealer_notification_channel_defaults')
        .upsert({
          dealer_id: enhancedUser.dealership_id,
          module: activeModule,
          event_channel_config: config,
          updated_by: enhancedUser.id
        }, {
          onConflict: 'dealer_id,module'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dealer-channel-defaults'] });
      toast({
        title: t('common.success'),
        description: t('settings.channel_matrix.save_success')
      });
      setHasChanges(false);
    },
    onError: (error: any) => {
      console.error('Error saving channel config:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('settings.channel_matrix.save_error'),
        variant: 'destructive'
      });
    }
  });

  // Toggle specific event-channel combination
  const handleToggle = (eventType: string, channel: NotificationChannel) => {
    setChannelConfig(prev => {
      const eventConfig = prev[eventType] || {};
      const newEventConfig = {
        ...eventConfig,
        [channel]: !eventConfig[channel]
      };

      return {
        ...prev,
        [eventType]: newEventConfig
      };
    });
    setHasChanges(true);
  };

  // Bulk action: Enable/Disable all events for a specific channel
  const handleBulkChannelAction = (channel: NotificationChannel, enable: boolean) => {
    setChannelConfig(prev => {
      const newConfig = { ...prev };

      NOTIFICATION_EVENT_OPTIONS.forEach(option => {
        if (!newConfig[option.event]) {
          newConfig[option.event] = {};
        }
        newConfig[option.event][channel] = enable;
      });

      return newConfig;
    });
    setHasChanges(true);
  };

  // Reset to defaults
  const handleReset = () => {
    setChannelConfig(DEFAULT_CHANNEL_CONFIG);
    setHasChanges(true);
  };

  // Save changes
  const handleSave = () => {
    // Validate before saving
    const errors = validateChannelConfig(channelConfig);
    const criticalErrors = errors.filter(e => !e.startsWith('Warning'));

    if (criticalErrors.length > 0) {
      toast({
        title: 'Validation Error',
        description: criticalErrors[0],
        variant: 'destructive'
      });
      return;
    }

    // Show warnings but allow save
    if (errors.length > 0) {
      console.warn('Channel config warnings:', errors);
    }

    saveMutation.mutate(channelConfig);
  };

  // Calculate impact
  const impact = calculateSMSCostImpact(channelConfig);
  const channelIcons: Record<NotificationChannel, any> = {
    in_app: Bell,
    email: Mail,
    sms: Smartphone,
    push: MessageSquare,
    slack: Hash
  };

  if (isLoading) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load notification configuration: {(error as Error).message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('settings.channel_matrix.title')}
          </CardTitle>
          <CardDescription>
            {t('settings.channel_matrix.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('settings.channel_matrix.how_it_works')}:</strong> {t('settings.channel_matrix.priority_info')}
            </AlertDescription>
          </Alert>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkChannelAction('in_app', true)}
            >
              <Bell className="h-4 w-4 mr-2" />
              {t('settings.channel_matrix.enable_all_in_app')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkChannelAction('email', true)}
            >
              <Mail className="h-4 w-4 mr-2" />
              {t('settings.channel_matrix.enable_all_email')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkChannelAction('sms', true)}
            >
              <Smartphone className="h-4 w-4 mr-2" />
              {t('settings.channel_matrix.enable_all_sms')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkChannelAction('push', true)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('settings.channel_matrix.enable_all_push')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkChannelAction('slack', true)}
            >
              <Hash className="h-4 w-4 mr-2" />
              {t('settings.channel_matrix.enable_all_slack')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('settings.channel_matrix.reset_defaults')}
            </Button>
          </div>

          {/* Module Tabs */}
          <Tabs value={activeModule} onValueChange={(v) => setActiveModule(v as NotificationModule)}>
            <TabsList>
              <TabsTrigger value="sales_orders">{t('settings.channel_matrix.modules.sales_orders')}</TabsTrigger>
              <TabsTrigger value="service_orders">{t('settings.channel_matrix.modules.service_orders')}</TabsTrigger>
              <TabsTrigger value="recon_orders">{t('settings.channel_matrix.modules.recon_orders')}</TabsTrigger>
              <TabsTrigger value="car_wash">{t('settings.channel_matrix.modules.car_wash')}</TabsTrigger>
              <TabsTrigger value="get_ready">{t('settings.channel_matrix.modules.get_ready')}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeModule} className="space-y-4">
              {/* Matrix Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[35%]">Event</TableHead>
                      <TableHead className="text-center w-[13%]">
                        <div className="flex items-center justify-center gap-2">
                          <Bell className="h-4 w-4" />
                          In-App
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[13%]">
                        <div className="flex items-center justify-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[13%]">
                        <div className="flex items-center justify-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          SMS
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[13%]">
                        <div className="flex items-center justify-center gap-2">
                          <MessageSquare className="h-4 w-4" />
                          Push
                        </div>
                      </TableHead>
                      <TableHead className="text-center w-[13%]">
                        <div className="flex items-center justify-center gap-2">
                          <Hash className="h-4 w-4" />
                          Slack
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {NOTIFICATION_EVENT_OPTIONS.map(option => {
                      const eventConfig = channelConfig[option.event] || {};

                      return (
                        <TableRow key={option.event} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{option.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {option.description}
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {option.category}
                              </Badge>
                            </div>
                          </TableCell>

                          {/* In-App Checkbox */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={eventConfig.in_app === true}
                              onCheckedChange={() => handleToggle(option.event, 'in_app')}
                            />
                          </TableCell>

                          {/* Email Checkbox */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={eventConfig.email === true}
                              onCheckedChange={() => handleToggle(option.event, 'email')}
                            />
                          </TableCell>

                          {/* SMS Checkbox */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={eventConfig.sms === true}
                              onCheckedChange={() => handleToggle(option.event, 'sms')}
                            />
                          </TableCell>

                          {/* Push Checkbox */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={eventConfig.push === true}
                              onCheckedChange={() => handleToggle(option.event, 'push')}
                            />
                          </TableCell>

                          {/* Slack Checkbox */}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={eventConfig.slack === true}
                              onCheckedChange={() => handleToggle(option.event, 'slack')}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Impact Preview */}
              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {t('settings.channel_matrix.impact_preview')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        In-App
                      </div>
                      <div className="text-2xl font-bold">
                        {Object.values(channelConfig).filter(c => c.in_app).length}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('settings.channel_matrix.events_enabled')}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email
                      </div>
                      <div className="text-2xl font-bold">
                        {Object.values(channelConfig).filter(c => c.email).length}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('settings.channel_matrix.events_enabled')}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        SMS
                      </div>
                      <div className="text-2xl font-bold text-amber-600">
                        {impact.eventsWithSMS}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('settings.channel_matrix.events_enabled')}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        Push
                      </div>
                      <div className="text-2xl font-bold">
                        {Object.values(channelConfig).filter(c => c.push).length}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('settings.channel_matrix.events_enabled')}</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-medium flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        Slack
                      </div>
                      <div className="text-2xl font-bold">
                        {Object.values(channelConfig).filter(c => c.slack).length}
                      </div>
                      <div className="text-xs text-muted-foreground">{t('settings.channel_matrix.events_enabled')}</div>
                    </div>
                  </div>

                  {/* SMS Cost Warning */}
                  {impact.eventsWithSMS > 0 && (
                    <Alert variant={impact.estimatedMonthlyCost > 50 ? 'destructive' : 'default'}>
                      <DollarSign className="h-4 w-4" />
                      <AlertDescription>
                        <strong>{t('settings.channel_matrix.estimated_cost')}:</strong> ${impact.estimatedMonthlyCost.toFixed(2)}{t('settings.channel_matrix.per_month')}
                        {impact.highRiskEvents.length > 0 && (
                          <span className="block mt-1 text-xs">
                            ⚠️ {t('settings.channel_matrix.high_frequency_events')}: {impact.highRiskEvents.join(', ')}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validation Warnings */}
                  {validateChannelConfig(channelConfig).map((warning, idx) => (
                    <Alert key={idx} variant={warning.startsWith('Warning') ? 'default' : 'destructive'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{warning}</AlertDescription>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? t('common.action_buttons.saving') : t('common.action_buttons.save_changes')}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setChannelConfig(configData?.event_channel_config || DEFAULT_CHANNEL_CONFIG);
                setHasChanges(false);
              }}
              disabled={!hasChanges}
            >
              {t('common.action_buttons.cancel')}
            </Button>

            {hasChanges && (
              <Badge variant="outline" className="ml-auto">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t('settings.channel_matrix.unsaved_changes')}
              </Badge>
            )}

            {!hasChanges && configData && (
              <Badge variant="outline" className="ml-auto text-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('settings.channel_matrix.saved_successfully')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
