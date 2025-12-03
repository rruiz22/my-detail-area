/**
 * Slack Channel Selector Component
 *
 * Allows system_admin and supermanager to map modules to specific Slack channels.
 * Only visible to users with appropriate roles.
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_member: boolean;
  num_members?: number;
}

interface ChannelMapping {
  module: string;
  channel_id: string | null;
  channel_name: string | null;
}

interface SlackChannelSelectorProps {
  integrationId: string;
  dealerId: number;
  userRole: 'system_admin' | 'supermanager' | null;
}

// Modules that support Slack notifications
// Must match modules used in SlackEventSelector
const SLACK_MODULES = [
  { key: 'sales_orders' },
  { key: 'service_orders' },
  { key: 'recon_orders' },
  { key: 'car_wash' },
  { key: 'get_ready' }
] as const;

export function SlackChannelSelector({ integrationId, dealerId, userRole }: SlackChannelSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [mappings, setMappings] = useState<Map<string, ChannelMapping>>(new Map());
  const [isLoadingChannels, setIsLoadingChannels] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing channel mappings on mount
  useEffect(() => {
    loadChannelMappings();
  }, [integrationId, dealerId]);

  /**
   * Load existing channel mappings from database
   */
  const loadChannelMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('dealer_slack_channel_mappings')
        .select('module, channel_id, channel_name')
        .eq('dealer_id', dealerId)
        .eq('integration_id', integrationId);

      if (error) throw error;

      const mappingMap = new Map<string, ChannelMapping>();
      data?.forEach(mapping => {
        mappingMap.set(mapping.module, mapping);
      });

      setMappings(mappingMap);
    } catch (error) {
      console.error('Failed to load channel mappings:', error);
    }
  };

  /**
   * Load available channels from Slack workspace
   */
  const loadChannels = async () => {
    setIsLoadingChannels(true);

    try {
      const { data, error } = await supabase.functions.invoke('slack-list-channels', {
        body: {
          dealer_id: dealerId,
          integration_id: integrationId
        }
      });

      if (error) throw error;

      if (data?.success && data?.channels) {
        setChannels(data.channels);
        toast({
          title: t('common.success'),
          description: `${data.total} channels loaded from Slack`
        });
      } else {
        throw new Error(data?.error || 'Failed to load channels');
      }
    } catch (error) {
      console.error('Failed to load Slack channels:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to load channels'
      });
    } finally {
      setIsLoadingChannels(false);
    }
  };

  /**
   * Save channel mapping for a module
   */
  const saveChannelMapping = async (module: string, channelId: string, channelName: string) => {
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('dealer_slack_channel_mappings')
        .upsert({
          dealer_id: dealerId,
          integration_id: integrationId,
          module: module,
          channel_id: channelId,
          channel_name: channelName,
          enabled: true
        }, {
          onConflict: 'dealer_id,integration_id,module'
        });

      if (error) throw error;

      // Update local state
      setMappings(prev => {
        const updated = new Map(prev);
        updated.set(module, { module, channel_id: channelId, channel_name: channelName });
        return updated;
      });

      toast({
        title: t('common.success'),
        description: `Channel configured for ${module.replace(/_/g, ' ')}`
      });
    } catch (error) {
      console.error('Failed to save channel mapping:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to save channel configuration'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Don't render if user doesn't have permission
  if (!userRole || (userRole !== 'system_admin' && userRole !== 'supermanager')) {
    return null;
  }

  return (
    <Card className="card-enhanced mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('integrations.slack_channel_selector.title')}</CardTitle>
            <CardDescription className="text-sm mt-1">
              {t('integrations.slack_channel_selector.description')}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadChannels}
            disabled={isLoadingChannels}
          >
            {isLoadingChannels ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isLoadingChannels ? t('integrations.slack_channel_selector.loading') : t('integrations.slack_channel_selector.load_channels')}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {channels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">{t('integrations.slack_channel_selector.load_channels_prompt')}</p>
          </div>
        ) : (
          SLACK_MODULES.map(({ key }) => {
            const currentMapping = mappings.get(key);
            const isConfigured = !!currentMapping?.channel_id;

            return (
              <div key={key} className="flex items-center justify-between py-3 px-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {t(`integrations.slack_events.modules.${key}`)}
                    </span>
                    {isConfigured ? (
                      <Badge variant="default" className="bg-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('integrations.slack_channel_selector.active')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500">
                        {t('integrations.slack_channel_selector.not_configured')}
                      </Badge>
                    )}
                  </div>
                  {currentMapping?.channel_name && (
                    <p className="text-xs text-gray-500 mt-1">
                      → {currentMapping.channel_name}
                    </p>
                  )}
                </div>

                <Select
                  value={currentMapping?.channel_id || ''}
                  onValueChange={(value) => {
                    const channel = channels.find(c => c.id === value);
                    if (channel) {
                      saveChannelMapping(key, channel.id, channel.name);
                    }
                  }}
                  disabled={isSaving}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder={t('integrations.slack_channel_selector.select_channel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map(channel => (
                      <SelectItem key={channel.id} value={channel.id}>
                        <span className="flex items-center gap-2">
                          {channel.name}
                          {channel.is_private && (
                            <Badge variant="outline" className="text-xs">Private</Badge>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
