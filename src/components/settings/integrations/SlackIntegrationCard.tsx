/**
 * Slack Integration Card Component
 *
 * Handles Slack OAuth flow and displays integration status
 * Follows enterprise security patterns with CSRF protection
 *
 * @component
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { generateOAuthState } from '@/lib/crypto/encryption';
import { Loader2, CheckCircle2, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';

interface SlackIntegration {
  id: string;
  dealer_id: number;
  integration_name: string;
  config: {
    team_id?: string;
    team_name?: string;
    bot_user_id?: string;
    incoming_webhook_channel?: string;
  };
  enabled: boolean;
  status: 'active' | 'inactive' | 'error' | 'pending_auth' | 'revoked';
  oauth_scopes: string[];
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export function SlackIntegrationCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();

  const [integration, setIntegration] = useState<SlackIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);

  // Check for OAuth callback status in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slackStatus = params.get('slack');
    const reason = params.get('reason');

    if (slackStatus === 'connected') {
      toast({
        title: t('integrations.slack.connected_title'),
        description: t('integrations.slack.connected_description'),
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
      loadIntegration();
    } else if (slackStatus === 'error') {
      toast({
        variant: 'destructive',
        title: t('integrations.slack.error_title'),
        description: t('integrations.slack.error_description', { reason: reason || 'unknown' }),
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    }
  }, []);

  // Load existing integration
  const loadIntegration = async () => {
    if (!enhancedUser?.dealership_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('dealer_integrations')
        .select('*')
        .eq('dealer_id', enhancedUser.dealership_id)
        .eq('integration_type', 'slack')
        .maybeSingle();

      if (error) throw error;
      setIntegration(data);
    } catch (error) {
      console.error('Failed to load Slack integration:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.load_error'),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegration();
  }, [enhancedUser?.dealership_id]);

  // Initiate OAuth flow
  const handleConnect = async () => {
    if (!enhancedUser?.dealership_id || !enhancedUser?.id) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.user_not_found'),
      });
      return;
    }

    setConnecting(true);

    try {
      // Generate CSRF-protected state token
      const stateToken = generateOAuthState(
        enhancedUser.dealership_id,
        enhancedUser.id
      );

      // Store state in database for validation
      const { error: stateError } = await supabase
        .from('oauth_states')
        .insert({
          state_token: stateToken,
          dealer_id: enhancedUser.dealership_id,
          user_id: enhancedUser.id,
          integration_type: 'slack',
        });

      if (stateError) throw stateError;

      // Build OAuth URL
      const slackClientId = import.meta.env.VITE_SLACK_CLIENT_ID;
      if (!slackClientId) {
        throw new Error('Slack client ID not configured');
      }

      const redirectUri = `${window.location.origin}/api/slack/callback`;
      const scopes = [
        'chat:write',
        'channels:read',
        'groups:read',
        'im:write',
        'incoming-webhook'
      ].join(',');

      const authUrl = new URL('https://slack.com/oauth/v2/authorize');
      authUrl.searchParams.set('client_id', slackClientId);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('state', stateToken);

      // Redirect to Slack OAuth
      window.location.href = authUrl.toString();

    } catch (error) {
      console.error('Failed to initiate OAuth:', error);
      toast({
        variant: 'destructive',
        title: t('integrations.slack.connect_error'),
        description: error instanceof Error ? error.message : t('common.unknown_error'),
      });
      setConnecting(false);
    }
  };

  // Toggle integration enabled/disabled
  const handleToggleEnabled = async (enabled: boolean) => {
    if (!integration) return;

    setToggling(true);

    try {
      const { error } = await supabase
        .from('dealer_integrations')
        .update({ enabled, updated_by: enhancedUser?.id })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration(prev => prev ? { ...prev, enabled } : null);

      toast({
        title: t('common.success'),
        description: enabled
          ? t('integrations.slack.enabled')
          : t('integrations.slack.disabled'),
      });
    } catch (error) {
      console.error('Failed to toggle integration:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.update_error'),
      });
    } finally {
      setToggling(false);
    }
  };

  // Disconnect integration
  const handleDisconnect = () => {
    if (!integration) return;
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = async () => {
    if (!integration) return;

    try {
      const { error } = await supabase
        .from('dealer_integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration(null);

      toast({
        title: t('common.success'),
        description: t('integrations.slack.disconnected'),
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('integrations.delete_error'),
      });
    }
  };

  // Render status badge
  const renderStatusBadge = () => {
    if (!integration) return null;

    const statusConfig = {
      active: { icon: CheckCircle2, variant: 'default' as const, label: t('integrations.status.active') },
      inactive: { icon: XCircle, variant: 'secondary' as const, label: t('integrations.status.inactive') },
      error: { icon: AlertTriangle, variant: 'destructive' as const, label: t('integrations.status.error') },
      pending_auth: { icon: Loader2, variant: 'secondary' as const, label: t('integrations.status.pending') },
      revoked: { icon: XCircle, variant: 'destructive' as const, label: t('integrations.status.revoked') },
    };

    const config = statusConfig[integration.status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1.5">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="card-enhanced">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
    <Card className="card-enhanced">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              {/* Slack Logo SVG */}
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <path d="M6 15a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2h2v2zm1 0a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-5z" fill="#E01E5A"/>
                <path d="M9 6a2 2 0 0 1-2-2a2 2 0 0 1 2-2a2 2 0 0 1 2 2v2H9zm0 1a2 2 0 0 1 2 2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5z" fill="#36C5F0"/>
                <path d="M18 9a2 2 0 0 1 2-2a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-2V9zm-1 0a2 2 0 0 1-2 2a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2a2 2 0 0 1 2 2v5z" fill="#2EB67D"/>
                <path d="M15 18a2 2 0 0 1 2 2a2 2 0 0 1-2 2a2 2 0 0 1-2-2v-2h2zm0-1a2 2 0 0 1-2-2a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2a2 2 0 0 1-2 2h-5z" fill="#ECB22E"/>
              </svg>
            </div>
            <div>
              <CardTitle className="text-lg">
                {t('integrations.slack.title')}
              </CardTitle>
              <CardDescription>
                {t('integrations.slack.description')}
              </CardDescription>
            </div>
          </div>
          {renderStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {integration ? (
          <>
            {/* Connected workspace info */}
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {t('integrations.slack.workspace')}
                </span>
                <span className="text-sm text-gray-900">
                  {integration.config.team_name || 'Unknown'}
                </span>
              </div>
              {integration.config.incoming_webhook_channel && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {t('integrations.slack.channel')}
                  </span>
                  <span className="text-sm text-gray-900">
                    #{integration.config.incoming_webhook_channel}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  {t('integrations.slack.bot_id')}
                </span>
                <span className="text-sm font-mono text-gray-900">
                  {integration.config.bot_user_id || 'N/A'}
                </span>
              </div>
            </div>

            {/* OAuth scopes */}
            {integration.oauth_scopes && integration.oauth_scopes.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('integrations.slack.scopes')}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {integration.oauth_scopes.map(scope => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {integration.status === 'error' && integration.last_error && (
              <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">
                      {t('integrations.slack.error_occurred')}
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {integration.last_error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Enable/Disable toggle */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label htmlFor="slack-enabled" className="text-sm font-medium">
                  {t('integrations.slack.enable_integration')}
                </Label>
                <p className="text-sm text-gray-500">
                  {t('integrations.slack.enable_description')}
                </p>
              </div>
              <Switch
                id="slack-enabled"
                checked={integration.enabled}
                onCheckedChange={handleToggleEnabled}
                disabled={toggling}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleDisconnect}
                className="flex-1"
              >
                {t('integrations.slack.disconnect')}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://api.slack.com/apps', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t('integrations.slack.manage')}
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Not connected state */}
            <div className="text-center py-6">
              <p className="text-sm text-gray-500 mb-4">
                {t('integrations.slack.not_connected')}
              </p>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('integrations.slack.connecting')}
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 15a2 2 0 0 1-2 2a2 2 0 0 1-2-2a2 2 0 0 1 2-2h2v2z"/>
                    </svg>
                    {t('integrations.slack.connect')}
                  </>
                )}
              </Button>
            </div>

            {/* Benefits list */}
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700">
                {t('integrations.slack.benefits_title')}
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{t('integrations.slack.benefit_1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{t('integrations.slack.benefit_2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span>{t('integrations.slack.benefit_3')}</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>

    {/* Disconnect Confirmation Dialog */}
    <ConfirmDialog
      open={disconnectDialogOpen}
      onOpenChange={setDisconnectDialogOpen}
      title={t('integrations.slack.disconnect_title', { defaultValue: 'Disconnect Slack?' })}
      description={t('integrations.slack.disconnect_confirm', { defaultValue: 'Are you sure you want to disconnect your Slack integration? This action cannot be undone.' })}
      confirmText={t('common.action_buttons.disconnect', { defaultValue: 'Disconnect' })}
      cancelText={t('common.action_buttons.cancel')}
      onConfirm={confirmDisconnect}
      variant="destructive"
    />
  );
}
