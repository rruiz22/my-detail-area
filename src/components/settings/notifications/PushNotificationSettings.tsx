import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { useAuth } from '@/contexts/AuthContext';
import { Bell, BellOff, AlertCircle, CheckCircle2, Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Push Notification Settings Component
 * Manages Firebase Cloud Messaging (FCM) push notification preferences
 * Allows users to enable/disable browser push notifications
 */
export function PushNotificationSettings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    permission,
    isSupported,
    loading,
    token,
    requestPermission,
    clearToken,
  } = useFirebaseMessaging();

  // Browser doesn't support notifications
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {t('notifications.title')}
          </CardTitle>
          <CardDescription>
            {t('notifications.settings.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('notifications.not_supported')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Get status badge color and text
  const getStatusBadge = () => {
    if (loading) {
      return <Badge variant="secondary">{t('common.loading')}</Badge>;
    }

    switch (permission) {
      case 'granted':
        return (
          <Badge variant="default" className="bg-emerald-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('notifications.enabled')}
          </Badge>
        );
      case 'denied':
        return (
          <Badge variant="destructive">
            <BellOff className="h-3 w-3 mr-1" />
            {t('notifications.permission_denied')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Bell className="h-3 w-3 mr-1" />
            {t('common.status.disabled')}
          </Badge>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              {t('notifications.settings.title')}
            </CardTitle>
            <CardDescription>
              {t('notifications.settings.description')}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('notifications.status')}</label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium capitalize">
                {permission || t('common.unknown')}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {permission === 'granted'
                  ? t('notifications.settings.enable_push')
                  : permission === 'denied'
                  ? t('notifications.permission_denied')
                  : t('common.status.disabled')}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('common.user')}</label>
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {token ? t('common.status.connected') : t('common.status.disconnected')}
              </p>
            </div>
          </div>
        </div>

        {/* Enable/Disable Actions */}
        <div className="space-y-4">
          {permission !== 'granted' ? (
            <>
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  {t('notifications.settings.enable_push')}
                </AlertDescription>
              </Alert>
              <Button
                onClick={requestPermission}
                disabled={loading || permission === 'denied'}
                className="w-full sm:w-auto"
              >
                <Bell className="h-4 w-4 mr-2" />
                {loading ? t('common.loading') : t('notifications.enable')}
              </Button>
              {permission === 'denied' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {t('notifications.permission_denied')}
                    <br />
                    <span className="text-xs">
                      Please enable notifications in your browser settings.
                    </span>
                  </AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {t('notifications.enabled')}
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button
                  onClick={clearToken}
                  variant="destructive"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  {t('notifications.disable')}
                </Button>
                <Button
                  onClick={requestPermission}
                  variant="outline"
                  disabled={loading}
                  className="w-full sm:w-auto"
                >
                  {t('common.refresh')}
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Additional Information */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">
            {t('common.about')} Push Notifications
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Receive real-time updates about your orders</li>
            <li>• Get notified when team members comment or update orders</li>
            <li>• Stay informed about important dealership activities</li>
            <li>• Works even when the app is closed or in the background</li>
          </ul>
        </div>

        {/* Debug Info (only in development) */}
        {import.meta.env.DEV && token && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              🔧 Developer Info
            </summary>
            <div className="mt-2 p-2 bg-muted rounded font-mono break-all">
              <p className="mb-1">
                <strong>FCM Token:</strong>
              </p>
              <p className="text-[10px]">{token}</p>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
