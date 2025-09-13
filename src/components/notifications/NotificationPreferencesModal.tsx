import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useEnhancedNotifications';
import { pushNotificationService } from '@/services/pushNotificationService';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface NotificationPreferencesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: number;
}

export function NotificationPreferencesModal({
  open,
  onOpenChange,
  dealerId
}: NotificationPreferencesModalProps) {
  const { t } = useTranslation();
  const { preferences, loading, updatePreferences } = useNotificationPreferences(dealerId);
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
    }
  }, [preferences]);

  useEffect(() => {
    // Check push notification support
    const supported = pushNotificationService.isSupported();
    setPushSupported(supported);
    
    if (supported) {
      setPushPermission(Notification.permission);
    }
  }, []);

  const handleChannelToggle = (channel: string, enabled: boolean) => {
    if (!localPrefs) return;

    const channelPrefs = localPrefs.channel_preferences as any;
    setLocalPrefs({
      ...localPrefs,
      channel_preferences: {
        ...channelPrefs,
        [channel]: {
          ...channelPrefs[channel],
          enabled
        }
      }
    });
  };

  const handleFrequencyChange = (channel: string, frequency: string) => {
    if (!localPrefs) return;

    const channelPrefs = localPrefs.channel_preferences as any;
    setLocalPrefs({
      ...localPrefs,
      channel_preferences: {
        ...channelPrefs,
        [channel]: {
          ...channelPrefs[channel],
          frequency
        }
      }
    });
  };

  const handlePriorityToggle = (priority: string, enabled: boolean) => {
    if (!localPrefs) return;

    const priorityFilters = localPrefs.priority_filters as any;
    setLocalPrefs({
      ...localPrefs,
      priority_filters: {
        ...priorityFilters,
        [priority]: enabled
      }
    });
  };

  const handleQuietHoursToggle = (enabled: boolean) => {
    if (!localPrefs) return;

    const quietHours = localPrefs.quiet_hours as any;
    setLocalPrefs({
      ...localPrefs,
      quiet_hours: {
        ...quietHours,
        enabled
      }
    });
  };

  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    if (!localPrefs) return;

    const quietHours = localPrefs.quiet_hours as any;
    setLocalPrefs({
      ...localPrefs,
      quiet_hours: {
        ...quietHours,
        [field]: value
      }
    });
  };

  const handleEntitySubscriptionToggle = (entityType: string, enabled: boolean) => {
    if (!localPrefs) return;

    const entitySubs = localPrefs.entity_subscriptions as any;
    setLocalPrefs({
      ...localPrefs,
      entity_subscriptions: {
        ...entitySubs,
        [entityType]: {
          ...entitySubs[entityType],
          enabled
        }
      }
    });
  };

  const requestPushPermission = async () => {
    try {
      const permission = await pushNotificationService.requestPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        await pushNotificationService.initialize();
        toast({
          title: t('notifications.pushEnabled'),
          description: t('notifications.pushEnabledMessage')
        });
      }
    } catch (error) {
      console.error('Push permission error:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.pushPermissionError'),
        variant: 'destructive'
      });
    }
  };

  const testNotification = async () => {
    const success = await pushNotificationService.sendTestNotification();
    if (success) {
      toast({
        title: t('notifications.testSent'),
        description: t('notifications.testSentMessage')
      });
    } else {
      toast({
        title: t('notifications.error'),
        description: t('notifications.testFailedMessage'),
        variant: 'destructive'
      });
    }
  };

  const savePreferences = async () => {
    if (!localPrefs) return;

    setSaving(true);
    try {
      const success = await updatePreferences(localPrefs);
      if (success) {
        toast({
          title: t('notifications.saved'),
          description: t('notifications.savedMessage')
        });
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: t('notifications.error'),
        description: t('notifications.saveError'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const channelIcons = {
    sms: MessageSquare,
    email: Mail,
    push: Smartphone,
    in_app: Bell
  };

  const priorityIcons = {
    low: Info,
    normal: CheckCircle,
    high: AlertTriangle,
    urgent: Zap,
    critical: AlertTriangle
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    normal: 'bg-green-100 text-green-800',
    high: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  };

  if (!localPrefs) {
    return null;
  }

  const channelPrefs = localPrefs.channel_preferences as any;
  const priorityFilters = localPrefs.priority_filters as any;
  const quietHours = localPrefs.quiet_hours as any;
  const entitySubs = localPrefs.entity_subscriptions as any;
  const notificationSound = localPrefs.notification_sound as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('notifications.preferences')}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="channels" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="channels">{t('notifications.channels')}</TabsTrigger>
            <TabsTrigger value="priorities">{t('notifications.priorities')}</TabsTrigger>
            <TabsTrigger value="schedule">{t('notifications.schedule')}</TabsTrigger>
            <TabsTrigger value="entities">{t('notifications.entities')}</TabsTrigger>
          </TabsList>

          <TabsContent value="channels" className="space-y-6">
            <div className="grid gap-6">
              {Object.entries(channelPrefs).map(([channel, config]: [string, any]) => {
                const Icon = channelIcons[channel as keyof typeof channelIcons];
                const isPushChannel = channel === 'push';
                const needsPermission = isPushChannel && pushPermission !== 'granted';
                
                return (
                  <Card key={channel}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5" />
                          {t(`notifications.channels.${channel}`)}
                          {isPushChannel && !pushSupported && (
                            <Badge variant="secondary">
                              {t('notifications.notSupported')}
                            </Badge>
                          )}
                          {needsPermission && (
                            <Badge variant="destructive">
                              {t('notifications.permissionRequired')}
                            </Badge>
                          )}
                        </div>
                        <Switch
                          checked={config.enabled && (!needsPermission || pushSupported)}
                          onCheckedChange={(checked) => handleChannelToggle(channel, checked)}
                          disabled={needsPermission || (isPushChannel && !pushSupported)}
                        />
                      </CardTitle>
                      <CardDescription>
                        {t(`notifications.channels.${channel}Description`)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {config.enabled && (!needsPermission || pushSupported) && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Label>{t('notifications.frequency')}:</Label>
                            <Select
                              value={config.frequency}
                              onValueChange={(value) => handleFrequencyChange(channel, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('notifications.frequency.all')}</SelectItem>
                                <SelectItem value="mentions">{t('notifications.frequency.mentions')}</SelectItem>
                                <SelectItem value="important">{t('notifications.frequency.important')}</SelectItem>
                                <SelectItem value="none">{t('notifications.frequency.none')}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {isPushChannel && pushSupported && (
                            <div className="flex gap-2">
                              {pushPermission !== 'granted' ? (
                                <Button onClick={requestPushPermission} size="sm">
                                  {t('notifications.enablePush')}
                                </Button>
                              ) : (
                                <Button onClick={testNotification} variant="outline" size="sm">
                                  {t('notifications.testNotification')}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="priorities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('notifications.priorityFilters')}</CardTitle>
                <CardDescription>
                  {t('notifications.priorityFiltersDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(priorityFilters).map(([priority, enabled]: [string, any]) => {
                    const Icon = priorityIcons[priority as keyof typeof priorityIcons];
                    
                    return (
                      <div key={priority} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <div className="flex items-center gap-2">
                            <Label>{t(`notifications.priorities.${priority}`)}</Label>
                            <Badge className={priorityColors[priority as keyof typeof priorityColors]}>
                              {priority.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => handlePriorityToggle(priority, checked)}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  {t('notifications.quietHours')}
                </CardTitle>
                <CardDescription>
                  {t('notifications.quietHoursDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>{t('notifications.enableQuietHours')}</Label>
                    <Switch
                      checked={quietHours.enabled}
                      onCheckedChange={handleQuietHoursToggle}
                    />
                  </div>
                  
                  {quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{t('notifications.quietStart')}</Label>
                        <Select
                          value={quietHours.start}
                          onValueChange={(value) => handleQuietHoursChange('start', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              return (
                                <SelectItem key={i} value={`${hour}:00`}>
                                  {`${hour}:00`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{t('notifications.quietEnd')}</Label>
                        <Select
                          value={quietHours.end}
                          onValueChange={(value) => handleQuietHoursChange('end', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const hour = i.toString().padStart(2, '0');
                              return (
                                <SelectItem key={i} value={`${hour}:00`}>
                                  {`${hour}:00`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {notificationSound.enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                  {t('notifications.sounds')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Label>{t('notifications.enableSounds')}</Label>
                  <Switch
                    checked={notificationSound.enabled}
                    onCheckedChange={(enabled) => 
                      setLocalPrefs({
                        ...localPrefs,
                        notification_sound: {
                          ...notificationSound,
                          enabled
                        }
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="entities" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('notifications.entitySubscriptions')}</CardTitle>
                <CardDescription>
                  {t('notifications.entitySubscriptionsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(entitySubs).map(([entityType, config]: [string, any]) => (
                    <div key={entityType} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <Label className="text-base">{t(`notifications.entities.${entityType}`)}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t(`notifications.entities.${entityType}Description`)}
                        </p>
                      </div>
                      <Switch
                        checked={config.enabled}
                        onCheckedChange={(checked) => handleEntitySubscriptionToggle(entityType, checked)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={savePreferences} disabled={saving || loading}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}