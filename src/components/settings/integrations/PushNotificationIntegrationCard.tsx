/**
 * Push Notification Integration Card Component
 *
 * Handles dealer-level push notification configuration
 * No OAuth required - direct event configuration
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { useDealerships } from '@/hooks/useDealerships';
import { Loader2, CheckCircle2, Bell, AlertTriangle, Building2, Smartphone } from 'lucide-react';
import { PushNotificationEventSelector } from './push/PushNotificationEventSelector';

export function PushNotificationIntegrationCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();
  const { data: dealerships, isLoading: isLoadingDealerships } = useDealerships();

  const [loading, setLoading] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hasActiveTokens, setHasActiveTokens] = useState(false);

  // Initialize selectedDealerId with user's dealership on mount
  useEffect(() => {
    if (enhancedUser?.dealership_id && selectedDealerId === null) {
      setSelectedDealerId(enhancedUser.dealership_id);
    }
  }, [enhancedUser?.dealership_id, selectedDealerId]);

  // Check if dealer has any active FCM tokens when dealer changes
  useEffect(() => {
    if (selectedDealerId) {
      checkActiveTokens();
    }
  }, [selectedDealerId]);

  // Check if dealer has any users with active push tokens
  const checkActiveTokens = async () => {
    if (!selectedDealerId) return;

    try {
      // Count active tokens for this dealer
      const { count, error } = await supabase
        .from('fcm_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('dealer_id', selectedDealerId)
        .eq('is_active', true);

      if (error) throw error;

      setHasActiveTokens((count || 0) > 0);
    } catch (error) {
      console.error('Failed to check active tokens:', error);
    }
  };

  // Check if user can manage push settings (system_admin or dealer_admin)
  const canManageSettings =
    enhancedUser?.is_system_admin ||
    enhancedUser?.role === 'dealer_admin';

  if (!canManageSettings) {
    return (
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('integrations.push.title', 'Push Notifications')}
          </CardTitle>
          <CardDescription>
            {t('integrations.push.description', 'Configure push notification events for your dealership')}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {t('integrations.push.admin_only', 'Only dealer administrators can configure push notifications')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading || isLoadingDealerships) {
    return (
      <Card className="card-enhanced">
        <CardContent className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('integrations.push.title', 'Push Notifications')}
          </CardTitle>
          <CardDescription>
            {t('integrations.push.description', 'Configure which events trigger push notifications for each module')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dealer Selector */}
          <div className="space-y-2">
            <Label htmlFor="dealer-selector" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t('integrations.select_dealer', 'Select Dealer')}
            </Label>
            <Select
              value={selectedDealerId?.toString() || ''}
              onValueChange={(value) => setSelectedDealerId(parseInt(value))}
            >
              <SelectTrigger id="dealer-selector" className="w-full">
                <SelectValue placeholder={t('integrations.select_dealer_placeholder', 'Choose a dealership')} />
              </SelectTrigger>
              <SelectContent>
                {dealerships?.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id.toString()}>
                    {dealer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('integrations.push.dealer_hint', 'Configure push notification events for this dealership')}
            </p>
          </div>

          {/* Status Info */}
          {selectedDealerId && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {t('integrations.push.active_devices', 'Active Devices')}
                  </span>
                </div>
                <Badge variant={hasActiveTokens ? 'default' : 'secondary'}>
                  {hasActiveTokens ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t('integrations.push.configured', 'Configured')}
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('integrations.push.no_devices', 'No devices')}
                    </>
                  )}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasActiveTokens
                  ? t('integrations.push.devices_info', 'Users in this dealership have registered devices for push notifications')
                  : t('integrations.push.no_devices_info', 'No users have enabled push notifications yet. Users can enable push in their Profile settings.')
                }
              </p>
            </div>
          )}

          {/* Info Alert */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <div className="flex gap-3">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {t('integrations.push.how_it_works_title', 'How Push Notifications Work')}
                </p>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>{t('integrations.push.step1', 'Configure which events trigger notifications below')}</li>
                  <li>{t('integrations.push.step2', 'Users enable push in Profile → Notifications')}</li>
                  <li>{t('integrations.push.step3', 'Notifications sent automatically when events occur')}</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event Configuration */}
      {selectedDealerId && (
        <PushNotificationEventSelector dealerId={selectedDealerId} />
      )}
    </div>
  );
}
