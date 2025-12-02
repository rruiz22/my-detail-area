import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { SlackIntegrationCard } from './integrations/SlackIntegrationCard';
import { DealerChannelMatrix } from './notifications/DealerChannelMatrix';
import {
  Mail,
  MessageSquare,
  Bell,
  Shield,
  Database,
  Save,
  Play,
  AlertCircle,
  CheckCircle,
  Key,
  Globe,
  Webhook
} from 'lucide-react';

interface SMTPConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun';
  api_key: string;
  from_email: string;
  from_name: string;
  enabled: boolean;
  test_mode: boolean;
}

interface SMSConfig {
  provider: 'twilio' | 'aws_sns';
  account_sid: string;
  auth_token: string;
  from_number: string;
  enabled: boolean;
  test_mode: boolean;
}

interface PushConfig {
  provider: 'firebase' | 'onesignal';
  server_key: string;
  project_id: string;
  enabled: boolean;
}

interface SlackConfig {
  url: string;
  enabled: boolean;
  channel?: string;
}

interface SecurityConfig {
  max_login_attempts: number;
  session_timeout_hours: number;
  password_min_length: number;
  require_mfa: boolean;
  allow_password_reset: boolean;
}

interface FeatureFlags {
  chat_enabled: boolean;
  nfc_tracking_enabled: boolean;
  vin_scanner_enabled: boolean;
  qr_generation_enabled: boolean;
  realtime_updates_enabled: boolean;
  file_uploads_enabled: boolean;
}

export const IntegrationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();

  const [smtpConfig, setSMTPConfig] = useState<SMTPConfig>({
    provider: 'resend',
    api_key: '',
    from_email: '',
    from_name: '',
    enabled: false,
    test_mode: true
  });

  const [smsConfig, setSMSConfig] = useState<SMSConfig>({
    provider: 'twilio',
    account_sid: '',
    auth_token: '',
    from_number: '',
    enabled: false,
    test_mode: true
  });

  const [pushConfig, setPushConfig] = useState<PushConfig>({
    provider: 'firebase',
    server_key: '',
    project_id: '',
    enabled: false
  });

  const [slackConfig, setSlackConfig] = useState<SlackConfig>({
    url: '',
    enabled: false,
    channel: ''
  });

  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>({
    max_login_attempts: 5,
    session_timeout_hours: 24,
    password_min_length: 6,
    require_mfa: false,
    allow_password_reset: true
  });

  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>({
    chat_enabled: true,
    nfc_tracking_enabled: true,
    vin_scanner_enabled: true,
    qr_generation_enabled: true,
    realtime_updates_enabled: true,
    file_uploads_enabled: true
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load configurations from database
  const loadConfigurations = useCallback(async () => {
    try {
      setLoading(true);

      console.log('📥 [LOAD CONFIG] Starting load process...');

      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['smtp_config', 'sms_config', 'push_config', 'slack_webhook_url', 'security_config', 'feature_flags']);

      if (error) {
        console.error('❌ [LOAD CONFIG] Database error:', error);
        throw error;
      }

      console.log('📊 [LOAD CONFIG] Raw data from database:', data?.map(setting => ({
        setting_key: setting.setting_key,
        setting_value: setting.setting_key === 'sms_config' ? {
          ...setting.setting_value,
          auth_token: setting.setting_value.auth_token ? '***HIDDEN***' : 'EMPTY'
        } : setting.setting_value
      })));

      // Parse and set configurations
      data?.forEach(setting => {
        console.log(`🔧 [LOAD CONFIG] Processing ${setting.setting_key}...`);

        switch (setting.setting_key) {
          case 'smtp_config':
            console.log('📧 [LOAD CONFIG] Setting SMTP config');
            setSMTPConfig(setting.setting_value as SMTPConfig);
            break;
          case 'sms_config':
            console.log('📱 [LOAD CONFIG] Setting SMS config:', {
              ...setting.setting_value,
              auth_token: setting.setting_value.auth_token ? '***HIDDEN***' : 'EMPTY'
            });
            setSMSConfig(setting.setting_value as SMSConfig);
            break;
          case 'push_config':
            console.log('🔔 [LOAD CONFIG] Setting Push config');
            setPushConfig(setting.setting_value as PushConfig);
            break;
          case 'slack_webhook_url':
            console.log('💬 [LOAD CONFIG] Setting Slack config');
            setSlackConfig(setting.setting_value as SlackConfig);
            break;
          case 'security_config':
            console.log('🔒 [LOAD CONFIG] Setting Security config');
            setSecurityConfig(setting.setting_value as SecurityConfig);
            break;
          case 'feature_flags':
            console.log('🚩 [LOAD CONFIG] Setting Feature flags');
            setFeatureFlags(setting.setting_value as FeatureFlags);
            break;
        }
      });

      console.log('✅ [LOAD CONFIG] All configurations loaded successfully');

    } catch (error) {
      console.error('💥 [LOAD CONFIG] Error loading configurations:', error);
      toast({
        title: t('common.error'),
        description: t('settings.load_error'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [t, toast]);

  useEffect(() => {
    loadConfigurations();
  }, [loadConfigurations]);

  // Save configuration to database
  const saveConfiguration = async (settingKey: string, settingValue: any, settingType: string) => {
    try {
      setSaving(true);

      console.log('🔄 [SAVE CONFIG] Starting save process:', {
        settingKey,
        settingType,
        settingValue: settingKey === 'sms_config' ? {
          ...settingValue,
          auth_token: settingValue.auth_token ? '***HIDDEN***' : 'EMPTY'
        } : settingValue,
        userId: enhancedUser?.id
      });

      const saveData = {
        setting_key: settingKey,
        setting_value: settingValue,
        setting_type: settingType,
        updated_by: enhancedUser?.id,
        updated_at: new Date().toISOString()
      };

      console.log('📤 [SAVE CONFIG] Sending to database:', {
        ...saveData,
        setting_value: settingKey === 'sms_config' ? {
          ...saveData.setting_value,
          auth_token: saveData.setting_value.auth_token ? '***HIDDEN***' : 'EMPTY'
        } : saveData.setting_value
      });

      const { error } = await supabase
        .from('system_settings')
        .upsert(saveData, {
          onConflict: 'setting_key'
        });

      if (error) {
        console.error('❌ [SAVE CONFIG] Database error:', error);
        throw error;
      }

      console.log('✅ [SAVE CONFIG] Saved successfully');

      // Immediately verify the save by reading back
      const { data: verification, error: verifyError } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value, updated_at')
        .eq('setting_key', settingKey)
        .single();

      if (verifyError) {
        console.error('❌ [SAVE CONFIG] Verification read failed:', verifyError);
      } else {
        console.log('🔍 [SAVE CONFIG] Verification - data in DB:', {
          ...verification,
          setting_value: settingKey === 'sms_config' ? {
            ...verification.setting_value,
            auth_token: verification.setting_value.auth_token ? '***HIDDEN***' : 'EMPTY'
          } : verification.setting_value
        });
      }

      toast({
        title: t('common.success'),
        description: t('settings.saved_successfully')
      });

    } catch (error) {
      console.error('💥 [SAVE CONFIG] Error saving configuration:', error);
      toast({
        title: t('common.error'),
        description: t('settings.save_error'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Test integration
  const testIntegration = async (type: 'smtp' | 'sms' | 'push') => {
    if (type === 'smtp') {
      await testSMTPIntegration();
    } else if (type === 'sms') {
      await testSMSIntegration();
    } else {
      toast({
        title: t('settings.testing_integration'),
        description: 'Push notification testing coming soon'
      });
    }
  };

  // Test SMTP configuration
  const testSMTPIntegration = async () => {
    try {
      if (!smtpConfig.api_key || !smtpConfig.from_email) {
        toast({
          title: t('common.error'),
          description: 'Please configure API key and from email first',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: t('settings.testing_integration'),
        description: t('settings.test_in_progress')
      });

      // Call our Edge Function to test SMTP
      const { data, error } = await supabase.functions.invoke('test-smtp', {
        body: {
          provider: smtpConfig.provider,
          api_key: smtpConfig.api_key,
          from_email: smtpConfig.from_email,
          from_name: smtpConfig.from_name,
          test_email: enhancedUser?.email || 'test@example.com'
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: t('common.success'),
          description: `SMTP test successful! Check ${enhancedUser?.email} for test email.`
        });
      } else {
        throw new Error(data?.message || 'SMTP test failed');
      }

    } catch (error: any) {
      console.error('SMTP test error:', error);

      let errorMessage = 'Unknown error';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.details?.message) {
        errorMessage = error.details.message;
      } else if (error.code) {
        errorMessage = `Error ${error.code}: ${error.details || 'Network error'}`;
      }

      toast({
        title: t('common.error'),
        description: `SMTP test failed: ${errorMessage}`,
        variant: 'destructive'
      });
    }
  };

  // Test SMS configuration
  const testSMSIntegration = async () => {
    try {
      if (!smsConfig.account_sid || !smsConfig.auth_token || !smsConfig.from_number) {
        toast({
          title: t('common.error'),
          description: 'Please configure Account SID, Auth Token, and From Number first',
          variant: 'destructive'
        });
        return;
      }

      // Use the real test phone number for testing
      const testPhone = '+17744108962'; // Real test number for SMS

      toast({
        title: t('settings.testing_integration'),
        description: t('settings.test_in_progress')
      });

      // Debug: Log the request data
      const requestData = {
        provider: smsConfig.provider,
        account_sid: smsConfig.account_sid,
        auth_token: smsConfig.auth_token,
        from_number: smsConfig.from_number,
        test_phone: testPhone
      };
      console.log('SMS Test Request Data:', requestData);

      // Call our real SMS test Edge Function
      const { data, error } = await supabase.functions.invoke('test-sms-debug', {
        body: requestData
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: t('common.success'),
          description: `SMS test successful! Check ${testPhone} for test message. Message SID: ${data.details?.message_sid || 'N/A'}`
        });
      } else {
        throw new Error(data?.message || 'SMS test failed');
      }

    } catch (error: any) {
      console.error('SMS test error:', error);

      let errorMessage = 'Unknown error';

      if (error.message) {
        errorMessage = error.message;
      } else if (error.details?.message) {
        errorMessage = error.details.message;
      } else if (error.code) {
        errorMessage = `Error ${error.code}: ${error.details || 'Network error'}`;
      }

      toast({
        title: t('common.error'),
        description: `SMS test failed: ${errorMessage}`,
        variant: 'destructive'
      });
    }
  };

  // Check if user can manage system settings
  const canManageSettings = enhancedUser?.is_system_admin;

  if (!canManageSettings) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{t('settings.access_denied')}</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* OAuth & Third-Party Integrations */}
      <Card className="card-enhanced">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            {t('integrations.title')}
          </CardTitle>
          <CardDescription>
            {t('integrations.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="slack" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="slack">Slack</TabsTrigger>
              <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              <TabsTrigger value="api">API Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="slack" className="mt-6">
              {/* NEW: Per-Dealer Slack Integration with Event Selection */}
              <SlackIntegrationCard />
            </TabsContent>

            <TabsContent value="webhooks" className="mt-6">
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('integrations.webhook.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('integrations.webhook.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Webhook integration coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="mt-6">
              <Card className="card-enhanced">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {t('integrations.api_keys.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('integrations.api_keys.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>API key management coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* SMTP Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t('settings.smtp_configuration')}
          </CardTitle>
          <CardDescription>
            {t('settings.smtp_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('settings.smtp_enabled')}</Label>
              <p className="text-sm text-muted-foreground">{t('settings.smtp_enabled_description')}</p>
            </div>
            <Switch
              checked={smtpConfig.enabled}
              onCheckedChange={(enabled) => setSMTPConfig(prev => ({ ...prev, enabled }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smtp_provider">{t('settings.smtp_provider')}</Label>
              <Select
                value={smtpConfig.provider}
                onValueChange={(provider: any) => setSMTPConfig(prev => ({ ...prev, provider }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_api_key">{t('settings.api_key')}</Label>
              <Input
                id="smtp_api_key"
                type="password"
                value={smtpConfig.api_key}
                onChange={(e) => setSMTPConfig(prev => ({ ...prev, api_key: e.target.value }))}
                placeholder={t('settings.enter_api_key')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_from_email">{t('settings.from_email')}</Label>
              <Input
                id="smtp_from_email"
                type="email"
                value={smtpConfig.from_email}
                onChange={(e) => setSMTPConfig(prev => ({ ...prev, from_email: e.target.value }))}
                placeholder="noreply@mydetailarea.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp_from_name">{t('settings.from_name')}</Label>
              <Input
                id="smtp_from_name"
                value={smtpConfig.from_name}
                onChange={(e) => setSMTPConfig(prev => ({ ...prev, from_name: e.target.value }))}
                placeholder="My Detail Area"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => saveConfiguration('smtp_config', smtpConfig, 'smtp')}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {t('settings.save_smtp')}
            </Button>
            <Button
              variant="outline"
              onClick={() => testIntegration('smtp')}
              disabled={!smtpConfig.enabled || !smtpConfig.api_key}
            >
              <Play className="h-4 w-4 mr-2" />
              {t('settings.test_smtp')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Notifications
          </CardTitle>
          <CardDescription>
            Configure SMS notification settings and channel preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="credentials" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="credentials">Twilio Credentials</TabsTrigger>
              <TabsTrigger value="channel-config">Event Channels</TabsTrigger>
            </TabsList>

            <TabsContent value="credentials" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('settings.sms_enabled')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.sms_enabled_description')}</p>
                </div>
                <Switch
                  checked={smsConfig.enabled}
                  onCheckedChange={(enabled) => setSMSConfig(prev => ({ ...prev, enabled }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sms_provider">{t('settings.sms_provider')}</Label>
                  <Select
                    value={smsConfig.provider}
                    onValueChange={(provider: any) => setSMSConfig(prev => ({ ...prev, provider }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="aws_sns">AWS SNS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms_account_sid">{t('settings.account_sid')}</Label>
                  <Input
                    id="sms_account_sid"
                    type="password"
                    value={smsConfig.account_sid}
                    onChange={(e) => setSMSConfig(prev => ({ ...prev, account_sid: e.target.value }))}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms_auth_token">{t('settings.auth_token')}</Label>
                  <Input
                    id="sms_auth_token"
                    type="password"
                    value={smsConfig.auth_token}
                    onChange={(e) => setSMSConfig(prev => ({ ...prev, auth_token: e.target.value }))}
                    placeholder={t('settings.enter_auth_token')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms_from_number">{t('settings.from_number')}</Label>
                  <Input
                    id="sms_from_number"
                    value={smsConfig.from_number}
                    onChange={(e) => setSMSConfig(prev => ({ ...prev, from_number: e.target.value }))}
                    placeholder="+1234567890"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => saveConfiguration('sms_config', smsConfig, 'sms')}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {t('settings.save_sms')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => testIntegration('sms')}
                  disabled={!smsConfig.enabled || !smsConfig.account_sid || !smsConfig.auth_token || !smsConfig.from_number}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t('settings.test_sms')}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="channel-config" className="mt-4">
              <DealerChannelMatrix />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('settings.feature_flags')}
          </CardTitle>
          <CardDescription>
            {t('settings.feature_flags_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            {Object.entries(featureFlags).map(([key, enabled]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <Label>{t(`settings.feature_${key}`)}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t(`settings.feature_${key}_description`)}
                  </p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) =>
                    setFeatureFlags(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Button
              onClick={() => saveConfiguration('feature_flags', featureFlags, 'features')}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {t('settings.save_features')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('settings.security_settings')}
          </CardTitle>
          <CardDescription>
            {t('settings.security_description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_login_attempts">{t('settings.max_login_attempts')}</Label>
              <Input
                id="max_login_attempts"
                type="number"
                min="3"
                max="10"
                value={securityConfig.max_login_attempts}
                onChange={(e) => setSecurityConfig(prev => ({
                  ...prev,
                  max_login_attempts: parseInt(e.target.value) || 5
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="session_timeout">{t('settings.session_timeout')}</Label>
              <Input
                id="session_timeout"
                type="number"
                min="1"
                max="168"
                value={securityConfig.session_timeout_hours}
                onChange={(e) => setSecurityConfig(prev => ({
                  ...prev,
                  session_timeout_hours: parseInt(e.target.value) || 24
                }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password_min_length">{t('settings.password_min_length')}</Label>
              <Input
                id="password_min_length"
                type="number"
                min="6"
                max="32"
                value={securityConfig.password_min_length}
                onChange={(e) => setSecurityConfig(prev => ({
                  ...prev,
                  password_min_length: parseInt(e.target.value) || 6
                }))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.require_mfa')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.mfa_description')}</p>
              </div>
              <Switch
                checked={securityConfig.require_mfa}
                onCheckedChange={(checked) => setSecurityConfig(prev => ({ ...prev, require_mfa: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t('settings.allow_password_reset')}</Label>
                <p className="text-sm text-muted-foreground">{t('settings.password_reset_description')}</p>
              </div>
              <Switch
                checked={securityConfig.allow_password_reset}
                onCheckedChange={(checked) => setSecurityConfig(prev => ({ ...prev, allow_password_reset: checked }))}
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => saveConfiguration('security_config', securityConfig, 'security')}
              disabled={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {t('settings.save_security')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('settings.integration_status')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" />
                <div>
                  <p className="font-medium">{t('settings.email_service')}</p>
                  <p className="text-sm text-muted-foreground">{smtpConfig.provider}</p>
                </div>
              </div>
              <Badge variant={smtpConfig.enabled && smtpConfig.api_key ? 'default' : 'secondary'}>
                {smtpConfig.enabled && smtpConfig.api_key ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />{t('settings.configured')}</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" />{t('settings.not_configured')}</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5" />
                <div>
                  <p className="font-medium">{t('settings.sms_service')}</p>
                  <p className="text-sm text-muted-foreground">{smsConfig.provider}</p>
                </div>
              </div>
              <Badge variant={smsConfig.enabled && smsConfig.account_sid ? 'default' : 'secondary'}>
                {smsConfig.enabled && smsConfig.account_sid ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />{t('settings.configured')}</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" />{t('settings.not_configured')}</>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <div>
                  <p className="font-medium">{t('settings.push_notifications')}</p>
                  <p className="text-sm text-muted-foreground">{pushConfig.provider}</p>
                </div>
              </div>
              <Badge variant={pushConfig.enabled && pushConfig.server_key ? 'default' : 'secondary'}>
                {pushConfig.enabled && pushConfig.server_key ? (
                  <><CheckCircle className="h-3 w-3 mr-1" />{t('settings.configured')}</>
                ) : (
                  <><AlertCircle className="h-3 w-3 mr-1" />{t('settings.not_configured')}</>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
