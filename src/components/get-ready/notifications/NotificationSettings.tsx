import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useGetReadyNotifications } from '@/hooks/useGetReadyNotifications';
import { useFCMNotifications } from '@/hooks/useFCMNotifications';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  Mail,
  Volume2,
  Monitor,
  Clock,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Wrench,
  Smartphone,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface NotificationSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Notification Settings Modal
 *
 * Allows users to configure their notification preferences:
 * - Which types of notifications to receive
 * - Delivery methods (in-app, email, sound, desktop)
 * - Quiet hours
 * - Auto-dismiss settings
 *
 * @param open - Whether the modal is open
 * @param onOpenChange - Callback when modal open state changes
 */
export function NotificationSettings({
  open,
  onOpenChange,
}: NotificationSettingsProps) {
  const { t } = useTranslation();
  const { preferences, updatePreferences, isUpdatingPreferences } =
    useGetReadyNotifications({ enabled: open });

  // FCM notifications hook
  const {
    isSupported: isPushSupported,
    isConfigured: isFirebaseConfigured,
    isSubscribed: isPushSubscribed,
    permission: pushPermission,
    subscribe: subscribeToPush,
    unsubscribe: unsubscribeFromPush,
    testNotification,
    isSubscribing,
    isUnsubscribing,
    isTesting,
  } = useFCMNotifications();

  // Local state for form values
  const [formValues, setFormValues] = useState({
    // Notification types
    sla_warnings_enabled: true,
    sla_critical_enabled: true,
    approval_notifications_enabled: true,
    bottleneck_alerts_enabled: true,
    vehicle_status_enabled: true,
    work_item_notifications_enabled: false,
    step_completion_enabled: true,
    system_alerts_enabled: true,

    // Delivery preferences
    in_app_enabled: true,
    email_enabled: false,
    sound_enabled: true,
    desktop_enabled: false,

    // Quiet hours
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',

    // Auto-dismiss
    auto_dismiss_read_after_days: 7,
    auto_dismiss_unread_after_days: 30,
  });

  // Load preferences when modal opens
  useEffect(() => {
    if (preferences) {
      setFormValues({
        sla_warnings_enabled: preferences.sla_warnings_enabled,
        sla_critical_enabled: preferences.sla_critical_enabled,
        approval_notifications_enabled:
          preferences.approval_notifications_enabled,
        bottleneck_alerts_enabled: preferences.bottleneck_alerts_enabled,
        vehicle_status_enabled: preferences.vehicle_status_enabled,
        work_item_notifications_enabled:
          preferences.work_item_notifications_enabled,
        step_completion_enabled: preferences.step_completion_enabled,
        system_alerts_enabled: preferences.system_alerts_enabled,
        in_app_enabled: preferences.in_app_enabled,
        email_enabled: preferences.email_enabled,
        sound_enabled: preferences.sound_enabled,
        desktop_enabled: preferences.desktop_enabled,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        quiet_hours_start: preferences.quiet_hours_start || '22:00',
        quiet_hours_end: preferences.quiet_hours_end || '08:00',
        auto_dismiss_read_after_days:
          preferences.auto_dismiss_read_after_days || 7,
        auto_dismiss_unread_after_days:
          preferences.auto_dismiss_unread_after_days || 30,
      });
    }
  }, [preferences]);

  // Handle save
  const handleSave = () => {
    updatePreferences(formValues, {
      onSuccess: () => {
        onOpenChange(false);
      },
    });
  };

  // Preference sections for organization
  const notificationTypes = [
    {
      key: 'sla_warnings_enabled',
      icon: AlertCircle,
      label: t('get_ready.notifications.settings.types.sla_warnings'),
      description: t(
        'get_ready.notifications.settings.types.sla_warnings_desc'
      ),
    },
    {
      key: 'sla_critical_enabled',
      icon: AlertCircle,
      label: t('get_ready.notifications.settings.types.sla_critical'),
      description: t('get_ready.notifications.settings.types.sla_critical_desc'),
      className: 'text-red-600',
    },
    {
      key: 'approval_notifications_enabled',
      icon: CheckCircle2,
      label: t('get_ready.notifications.settings.types.approvals'),
      description: t('get_ready.notifications.settings.types.approvals_desc'),
    },
    {
      key: 'bottleneck_alerts_enabled',
      icon: TrendingUp,
      label: t('get_ready.notifications.settings.types.bottlenecks'),
      description: t('get_ready.notifications.settings.types.bottlenecks_desc'),
    },
    {
      key: 'vehicle_status_enabled',
      icon: Wrench,
      label: t('get_ready.notifications.settings.types.vehicle_status'),
      description: t(
        'get_ready.notifications.settings.types.vehicle_status_desc'
      ),
    },
  ];

  const deliveryMethods = [
    {
      key: 'in_app_enabled',
      icon: Bell,
      label: t('get_ready.notifications.settings.delivery.in_app'),
      description: t('get_ready.notifications.settings.delivery.in_app_desc'),
    },
    {
      key: 'email_enabled',
      icon: Mail,
      label: t('get_ready.notifications.settings.delivery.email'),
      description: t('get_ready.notifications.settings.delivery.email_desc'),
    },
    {
      key: 'sound_enabled',
      icon: Volume2,
      label: t('get_ready.notifications.settings.delivery.sound'),
      description: t('get_ready.notifications.settings.delivery.sound_desc'),
    },
    {
      key: 'desktop_enabled',
      icon: Monitor,
      label: t('get_ready.notifications.settings.delivery.desktop'),
      description: t('get_ready.notifications.settings.delivery.desktop_desc'),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('get_ready.notifications.settings.title')}
          </DialogTitle>
          <DialogDescription>
            {t('get_ready.notifications.settings.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Notification Types Section */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('get_ready.notifications.settings.sections.types')}
              </h4>
              <div className="space-y-3">
                {notificationTypes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Icon
                          className={cn(
                            'h-5 w-5 mt-0.5 flex-shrink-0',
                            item.className
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <Label className="text-sm font-medium cursor-pointer">
                            {item.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formValues[item.key as keyof typeof formValues] as boolean}
                        onCheckedChange={(checked) =>
                          setFormValues((prev) => ({ ...prev, [item.key]: checked }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Delivery Methods Section */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('get_ready.notifications.settings.sections.delivery')}
              </h4>
              <div className="space-y-3">
                {deliveryMethods.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.key}
                      className="flex items-start justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <Label className="text-sm font-medium cursor-pointer">
                            {item.label}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.description}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={formValues[item.key as keyof typeof formValues] as boolean}
                        onCheckedChange={(checked) =>
                          setFormValues((prev) => ({ ...prev, [item.key]: checked }))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* FCM Push Notifications Section */}
            {isPushSupported && (
              <>
                <div>
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    Firebase Cloud Messaging (FCM)
                  </h4>

                  {/* Firebase Configuration Warning */}
                  {!isFirebaseConfigured && (
                    <div className="mb-3 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        Firebase no está configurado correctamente. Verifica las variables de entorno VITE_FIREBASE_*.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Push Status Card */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Label className="text-sm font-medium">
                              FCM Push Notifications
                            </Label>
                            <Badge
                              variant={isPushSubscribed ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {isPushSubscribed ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {isPushSubscribed
                              ? 'Recibe alertas incluso cuando la app esté cerrada (Firebase)'
                              : 'Activa para recibir alertas en tiempo real en tu dispositivo'}
                          </p>
                          {pushPermission === 'denied' && (
                            <p className="text-xs text-red-600 mt-2">
                              ⚠️ Permiso denegado. Actívalo en la configuración del navegador.
                            </p>
                          )}
                        </div>
                        <Switch
                          checked={isPushSubscribed}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              subscribeToPush();
                            } else {
                              unsubscribeFromPush();
                            }
                          }}
                          disabled={
                            isSubscribing ||
                            isUnsubscribing ||
                            pushPermission === 'denied'
                          }
                        />
                      </div>

                      {/* Test Button */}
                      {isPushSubscribed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => testNotification()}
                          disabled={isTesting}
                        >
                          <Send className="h-3 w-3 mr-2" />
                          {isTesting ? 'Sending...' : 'Send Test Notification'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Quiet Hours Section */}
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('get_ready.notifications.settings.sections.quiet_hours')}
              </h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <Label className="text-sm font-medium cursor-pointer">
                      {t('get_ready.notifications.settings.quiet_hours.enabled')}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t(
                        'get_ready.notifications.settings.quiet_hours.description'
                      )}
                    </p>
                  </div>
                  <Switch
                    checked={formValues.quiet_hours_enabled}
                    onCheckedChange={(checked) =>
                      setFormValues((prev) => ({
                        ...prev,
                        quiet_hours_enabled: checked,
                      }))
                    }
                  />
                </div>

                {formValues.quiet_hours_enabled && (
                  <div className="grid grid-cols-2 gap-3 pl-8">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('get_ready.notifications.settings.quiet_hours.start')}
                      </Label>
                      <Input
                        type="time"
                        value={formValues.quiet_hours_start}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            quiet_hours_start: e.target.value,
                          }))
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {t('get_ready.notifications.settings.quiet_hours.end')}
                      </Label>
                      <Input
                        type="time"
                        value={formValues.quiet_hours_end}
                        onChange={(e) =>
                          setFormValues((prev) => ({
                            ...prev,
                            quiet_hours_end: e.target.value,
                          }))
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpdatingPreferences}
          >
            {t('common.action_buttons.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isUpdatingPreferences}>
            {isUpdatingPreferences
              ? t('common.action_buttons.saving')
              : t('common.action_buttons.save_changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
