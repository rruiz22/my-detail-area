/**
 * Push Notification Devices Component
 *
 * Displays a list of registered devices for push notifications
 * Allows users to view and remove individual devices
 *
 * @component
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Trash2, Loader2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PushDevice {
  id: string;
  device_name: string | null;
  browser: string | null;
  os: string | null;
  fcm_token: string;
  last_used_at: string | null;
  created_at: string;
}

interface PushNotificationDevicesProps {
  /** Show as collapsible section (default: false) */
  collapsible?: boolean;
}

export function PushNotificationDevices({ collapsible = false }: PushNotificationDevicesProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [devices, setDevices] = useState<PushDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingDeviceId, setRemovingDeviceId] = useState<string | null>(null);

  /**
   * Load user's registered devices
   */
  useEffect(() => {
    if (!user?.id) return;

    loadDevices();
  }, [user?.id]);

  /**
   * Fetch devices from database
   */
  const loadDevices = async () => {
    if (!user?.id) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('fcm_tokens')
        .select('id, device_name, browser, os, fcm_token, last_used_at, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) throw error;

      setDevices(data || []);
    } catch (error) {
      console.error('Failed to load push notification devices:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to load registered devices'
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Remove a specific device by deactivating its token
   */
  const handleRemoveDevice = async (deviceId: string) => {
    setRemovingDeviceId(deviceId);

    try {
      const { error } = await supabase.rpc('deactivate_fcm_token', {
        p_token_id: deviceId
      });

      if (error) throw error;

      // Update local state
      setDevices(prev => prev.filter(d => d.id !== deviceId));

      toast({
        title: t('common.success'),
        description: 'Device removed successfully'
      });
    } catch (error) {
      console.error('Failed to remove device:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to remove device'
      });
    } finally {
      setRemovingDeviceId(null);
    }
  };

  /**
   * Format token for display (show first 8 and last 8 characters)
   */
  const formatToken = (token: string): string => {
    if (token.length <= 16) return token;
    return `${token.substring(0, 8)}...${token.substring(token.length - 8)}`;
  };

  /**
   * Get device display name
   */
  const getDeviceName = (device: PushDevice): string => {
    if (device.device_name) return device.device_name;

    // Fallback: Browser + OS
    const parts = [];
    if (device.browser) parts.push(device.browser);
    if (device.os) parts.push(device.os);

    return parts.length > 0 ? parts.join(' on ') : 'Unknown Device';
  };

  /**
   * Format last used timestamp
   */
  const formatLastUsed = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';

    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Loading devices...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" />
              Registered Devices
            </CardTitle>
            <CardDescription>
              Manage devices that can receive push notifications
            </CardDescription>
          </div>
          <Badge variant="secondary">
            {devices.length} {devices.length === 1 ? 'device' : 'devices'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? (
          <div className="text-center py-6">
            <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-sm text-muted-foreground">No registered devices</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enable push notifications above to register this device
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <p className="font-medium text-sm truncate">
                      {getDeviceName(device)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-mono">{formatToken(device.fcm_token)}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatLastUsed(device.last_used_at)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveDevice(device.id)}
                  disabled={removingDeviceId === device.id}
                  className="flex-shrink-0"
                >
                  {removingDeviceId === device.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
