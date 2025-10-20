/**
 * Push Notification Settings Component
 *
 * Enterprise-grade notification preferences for My Detail Area
 * Follows Notion design system with muted palette and no gradients
 *
 * Features:
 * - Permission request with clear messaging
 * - Subscription management (subscribe/unsubscribe)
 * - Test notification functionality
 * - Visual feedback for subscription status
 * - Error handling with user-friendly messages
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { pushNotificationService } from '@/services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';

export function PushNotificationSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize on mount
  useEffect(() => {
    async function initialize() {
      const supported = pushNotificationService.isSupported();
      setIsSupported(supported);

      if (supported) {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        // Initialize service worker
        await pushNotificationService.initialize();

        // Check current subscription status
        const subscription = await pushNotificationService.getSubscription();
        setIsSubscribed(!!subscription);
      }

      setIsInitializing(false);
    }

    initialize();
  }, []);

  // Request permission and subscribe
  const handleEnableNotifications = async () => {
    if (!user) {
      toast({
        title: t('notifications.error'),
        description: t('notifications.must_be_logged_in'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Request permission
      const permissionResult = await pushNotificationService.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        // Subscribe to push notifications
        // TODO: Get dealer_id from user context
        const dealerId = 1; // Placeholder
        const subscription = await pushNotificationService.subscribe(user.id, dealerId);

        if (subscription) {
          setIsSubscribed(true);
          toast({
            title: t('notifications.enabled'),
            description: t('notifications.enabled_description'),
          });
        }
      } else if (permissionResult === 'denied') {
        toast({
          title: t('notifications.permission_denied'),
          description: t('notifications.permission_denied_description'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Enable notifications failed:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.enable_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Unsubscribe from notifications
  const handleDisableNotifications = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const dealerId = 1; // Placeholder
      const success = await pushNotificationService.unsubscribe(user.id, dealerId);

      if (success) {
        setIsSubscribed(false);
        toast({
          title: t('notifications.disabled'),
          description: t('notifications.disabled_description'),
        });
      }
    } catch (error) {
      console.error('Disable notifications failed:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.disable_failed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle subscription
  const handleToggle = async (checked: boolean) => {
    if (checked) {
      await handleEnableNotifications();
    } else {
      await handleDisableNotifications();
    }
  };

  // Send test notification
  const handleTestNotification = async () => {
    try {
      const success = await pushNotificationService.sendTestNotification();

      if (success) {
        toast({
          title: t('notifications.test_sent'),
          description: t('notifications.test_sent_description'),
        });
      } else {
        toast({
          title: t('notifications.test_failed'),
          description: t('notifications.test_failed_description'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      toast({
        title: t('notifications.error'),
        description: t('notifications.test_failed'),
        variant: 'destructive',
      });
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-gray-500" />
            {t('notifications.not_supported')}
          </CardTitle>
          <CardDescription>
            {t('notifications.not_supported_description')}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Loading state
  if (isInitializing) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            {t('notifications.initializing')}
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="card-enhanced">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-700" />
          {t('notifications.push_notifications')}
        </CardTitle>
        <CardDescription>
          {t('notifications.push_notifications_description')}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Subscription Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="text-base">
              {t('notifications.enable_push')}
            </Label>
            <p className="text-sm text-gray-500">
              {t('notifications.enable_push_description')}
            </p>
          </div>
          <Switch
            id="push-notifications"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 p-3 rounded-md bg-gray-50 border border-gray-200">
          {isSubscribed ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm font-medium text-gray-700">
                {t('notifications.status_enabled')}
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {t('notifications.status_disabled')}
              </span>
            </>
          )}
        </div>

        {/* Permission Denied Warning */}
        {permission === 'denied' && (
          <div className="p-3 rounded-md bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">
              {t('notifications.permission_denied_help')}
            </p>
          </div>
        )}

        {/* Test Notification Button */}
        {isSubscribed && (
          <Button
            variant="outline"
            onClick={handleTestNotification}
            className="w-full"
            disabled={isLoading}
          >
            <Bell className="h-4 w-4 mr-2" />
            {t('notifications.send_test')}
          </Button>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
