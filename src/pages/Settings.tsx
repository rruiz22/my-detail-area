import { StorageDevTools } from "@/components/dev/StorageDevTools";
import { NotificationPreferencesModal } from '@/components/notifications/NotificationPreferencesModal';
import { IntegrationSettings } from '@/components/settings/IntegrationSettings';
import { NotificationSoundSettings } from '@/components/settings/NotificationSoundSettings';
import { NotificationTemplatesManager, PushNotificationSettings } from '@/components/settings/notifications';
import { DealerChannelMatrix } from '@/components/settings/notifications/DealerChannelMatrix';
import { PlatformBrandingSettings } from '@/components/settings/platform/PlatformBrandingSettings';
import { PlatformGeneralSettings } from '@/components/settings/platform/PlatformGeneralSettings';
import { SecurityAuditLogViewer } from '@/components/settings/security/SecurityAuditLogViewer';
import { SMSHistoryTab } from '@/components/settings/SMSHistoryTab';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { developmentConfig } from "@/config/development";
import { useToast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { usePermissions } from '@/hooks/usePermissions';
import { useSettingsPermissions } from '@/hooks/useSettingsPermissions';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Building2, Database, Mail, MessageSquare, Palette, Save, Settings as SettingsIcon, Shield, User, Volume2 } from "lucide-react";
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface UserPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_alerts: boolean;
  theme_preference: string;
  language: string;
}

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();
  const { currentDealership } = useAccessibleDealerships();
  const [activeTab, setActiveTab] = useTabPersistence('settings');
  const perms = useSettingsPermissions();

  const [userPrefs, setUserPrefs] = useState<UserPreferences>({
    email_notifications: true,
    sms_notifications: false,
    in_app_alerts: true,
    theme_preference: 'system',
    language: 'en'
  });

  const [dealershipInfo, setDealershipInfo] = useState({
    name: '',
    location: '',
    address: '',
    phone: '',
    email: ''
  });

  const [senderInfo, setSenderInfo] = useState({
    company_name: 'Dealer Detail Service',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    website: ''
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvancedPreferences, setShowAdvancedPreferences] = useState(false);

  // Optimized data loading with parallel queries to prevent flashing
  const loadSettings = useCallback(async () => {
    // Early exit if no user data
    if (!enhancedUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // PARALLEL LOADING: Execute both queries simultaneously to reduce flashing
      const [dealershipResult, notificationResult, senderInfoResult] = await Promise.all([
        // Query 1: Dealership info (only if user has dealership)
        enhancedUser.dealership_id
          ? supabase
              .from('dealerships')
              .select('name, city, state, address, phone, email')
              .eq('id', enhancedUser.dealership_id)
              .single()
          : Promise.resolve({ data: null, error: null }),

        // Query 2: User notification settings
        supabase
          .from('user_notification_settings')
          .select('*')
          .eq('user_id', enhancedUser.id)
          .single(),

        // Query 3: Sender info from system settings
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'sender_info')
          .single()
      ]);

      // Process dealership data
      if (!dealershipResult.error && dealershipResult.data) {
        const dealershipData = dealershipResult.data;
        setDealershipInfo({
          name: dealershipData.name || '',
          location: `${dealershipData.city || ''}, ${dealershipData.state || ''}`.trim().replace(/^,|,$/, ''),
          address: dealershipData.address || '',
          phone: dealershipData.phone || '',
          email: dealershipData.email || ''
        });
      }

      // Process notification data with better defaults
      if (!notificationResult.error && notificationResult.data) {
        const notificationData = notificationResult.data;
        setUserPrefs({
          email_notifications: notificationData.email_notifications ?? true,
          sms_notifications: notificationData.push_notifications ?? false,
          in_app_alerts: notificationData.in_app_notifications ?? true,
          theme_preference: 'system',
          language: 'en'
        });
      } else {
        // Set defaults if no notification settings exist
        setUserPrefs({
          email_notifications: true,
          sms_notifications: false,
          in_app_alerts: true,
          theme_preference: 'system',
          language: 'en'
        });
      }

      // Process sender info
      if (!senderInfoResult.error && senderInfoResult.data?.setting_value) {
        const savedInfo = senderInfoResult.data.setting_value as any;
        setSenderInfo({
          company_name: savedInfo.company_name || 'Dealer Detail Service',
          address: savedInfo.address || '',
          city: savedInfo.city || '',
          state: savedInfo.state || '',
          zip_code: savedInfo.zip_code || '',
          phone: savedInfo.phone || '',
          email: savedInfo.email || '',
          website: savedInfo.website || ''
        });
      }

    } catch (error) {
      console.error('Error loading settings:', error);

      // Graceful fallback with user data
      setUserPrefs({
        email_notifications: true,
        sms_notifications: false,
        in_app_alerts: true,
        theme_preference: 'system',
        language: 'en'
      });
    } finally {
      setLoading(false);
    }
  }, [enhancedUser?.id, enhancedUser?.dealership_id]); // Optimized dependencies

  useEffect(() => {
    if (enhancedUser) {
      loadSettings();
    }
  }, [enhancedUser, loadSettings]);

  // Save user preferences
  const saveUserPreferences = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('user_notification_settings')
        .upsert({
          user_id: enhancedUser?.id,
          dealer_id: enhancedUser?.dealership_id,
          email_notifications: userPrefs.email_notifications,
          push_notifications: userPrefs.sms_notifications,
          in_app_notifications: userPrefs.in_app_alerts,
          notification_frequency: 'immediate',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: t('settings.preferences_saved')
      });

    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t('common.error'),
        description: t('settings.save_error'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // Save sender information
  const saveSenderInfo = async () => {
    try {
      setSaving(true);

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'sender_info',
          setting_value: senderInfo,
          setting_type: 'features',
          updated_by: enhancedUser?.id
        });

      if (error) throw error;

      toast({
        title: t('common.success'),
        description: 'Sender information saved successfully'
      });

      // Reload settings to reflect changes
      await loadSettings();

    } catch (error) {
      console.error('Error saving sender info:', error);
      toast({
        title: t('common.error'),
        description: 'Failed to save sender information',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 w-full">
        {/* Header Skeleton */}
        <div className="border-b pb-6">
          <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-6">
          <div className="flex space-x-1 border rounded-lg p-1">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-9 bg-muted rounded flex-1 animate-pulse"></div>
            ))}
          </div>

          {/* Content Skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 bg-muted rounded w-40 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="h-5 bg-muted-foreground/20 rounded w-32 mb-2 animate-pulse"></div>
                      <div className="h-4 bg-muted-foreground/20 rounded w-24 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7">
          {perms.canManagePlatform && (
            <TabsTrigger value="platform" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.platform')}</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="sms-history" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">SMS History</span>
          </TabsTrigger>
          <TabsTrigger value="dealership" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Sender</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.integrations')}</span>
          </TabsTrigger>
          {perms.canManageSecurity && (
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">{t('settings.security')}</span>
            </TabsTrigger>
          )}
        </TabsList>


        {/* Platform Settings */}
        {perms.canManagePlatform && (
          <TabsContent value="platform" className="space-y-6">
            <Tabs defaultValue="branding" className="space-y-6">
              <TabsList>
                <TabsTrigger value="branding" className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  {t('settings.branding')}
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-2">
                  <SettingsIcon className="h-4 w-4" />
                  {t('settings.general')}
                </TabsTrigger>
                {perms.isSystemAdmin && (
                  <TabsTrigger value="sounds" className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    {t('settings.notification_sound.title')}
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="branding">
                <PlatformBrandingSettings />
              </TabsContent>

              <TabsContent value="general">
                <PlatformGeneralSettings />
              </TabsContent>

              <TabsContent value="sounds">
                {perms.isSystemAdmin ? (
                  <NotificationSoundSettings />
                ) : (
                  <Card>
                    <CardContent className="p-6 text-center text-muted-foreground">
                      <p>{t('settings.admin_only')}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        )}

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('settings.profile_settings')}
              </CardTitle>
              <CardDescription>
                {t('settings.profile_description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>{t('settings.current_user')}</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">{enhancedUser?.email}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.role')}: {enhancedUser?.role}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.user_type')}</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium capitalize">{enhancedUser?.user_type}</p>
                    <p className="text-sm text-muted-foreground">{t('settings.dealership')}: {dealershipInfo.name}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.dealership_id')}</Label>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">ID: {enhancedUser?.dealership_id}</p>
                    <p className="text-sm text-muted-foreground">{dealershipInfo.location}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Tabs defaultValue="preferences" className="space-y-6">
            <TabsList>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                {t('settings.preferences')}
              </TabsTrigger>
              {perms.canManageTemplates && (
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {t('settings.templates')}
                </TabsTrigger>
              )}
              {perms.canManageTemplates && (
                <TabsTrigger value="channels" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Channel Matrix
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="preferences" className="space-y-6">
              {/* Push Notifications (FCM) */}
              <PushNotificationSettings />

              {/* Email/SMS/In-App Preferences */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    {t('settings.notification_preferences')}
                  </CardTitle>
                  <CardDescription>
                    {t('settings.notification_description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.email_notifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.email_alerts_description')}
                      </p>
                    </div>
                    <Switch
                      checked={userPrefs.email_notifications}
                      onCheckedChange={(checked) => setUserPrefs(prev => ({ ...prev, email_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.sms_notifications')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.sms_alerts_description')}
                      </p>
                    </div>
                    <Switch
                      checked={userPrefs.sms_notifications}
                      onCheckedChange={(checked) => setUserPrefs(prev => ({ ...prev, sms_notifications: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t('settings.in_app_alerts')}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t('settings.toast_description')}
                      </p>
                    </div>
                    <Switch
                      checked={userPrefs.in_app_alerts}
                      onCheckedChange={(checked) => setUserPrefs(prev => ({ ...prev, in_app_alerts: checked }))}
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <Button onClick={saveUserPreferences} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {t('settings.save_preferences')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowAdvancedPreferences(true)}
                      className="flex items-center gap-2"
                    >
                      <Bell className="h-4 w-4" />
                      {t('notifications.preferences')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {perms.canManageTemplates && (
              <TabsContent value="templates">
                <NotificationTemplatesManager />
              </TabsContent>
            )}

            {perms.canManageTemplates && (
              <TabsContent value="channels">
                <DealerChannelMatrix />
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>

        {/* SMS History */}
        <TabsContent value="sms-history" className="space-y-6">
          <SMSHistoryTab />
        </TabsContent>

        {/* Sender Information Settings */}
        <TabsContent value="dealership" className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Sender Information
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Configure your company information that will appear on all exported reports for all dealerships in the system
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="ml-4">Global Settings</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={senderInfo.company_name}
                  onChange={(e) => setSenderInfo({ ...senderInfo, company_name: e.target.value })}
                  placeholder="Dealer Detail Service"
                  className="font-medium"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={senderInfo.address}
                  onChange={(e) => setSenderInfo({ ...senderInfo, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>

              {/* City, State, Zip Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={senderInfo.city}
                    onChange={(e) => setSenderInfo({ ...senderInfo, city: e.target.value })}
                    placeholder="Miami"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={senderInfo.state}
                    onChange={(e) => setSenderInfo({ ...senderInfo, state: e.target.value })}
                    placeholder="FL"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">Zip Code</Label>
                  <Input
                    id="zip_code"
                    value={senderInfo.zip_code}
                    onChange={(e) => setSenderInfo({ ...senderInfo, zip_code: e.target.value })}
                    placeholder="33101"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={senderInfo.phone}
                    onChange={(e) => setSenderInfo({ ...senderInfo, phone: e.target.value })}
                    placeholder="(305) 555-0123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={senderInfo.email}
                    onChange={(e) => setSenderInfo({ ...senderInfo, email: e.target.value })}
                    placeholder="info@dealerdetailservice.com"
                  />
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={senderInfo.website}
                  onChange={(e) => setSenderInfo({ ...senderInfo, website: e.target.value })}
                  placeholder="https://www.dealerdetailservice.com"
                />
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t">
                <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="mt-0.5">
                    <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Global Configuration
                    </p>
                    <p className="text-xs text-blue-700">
                      This sender information will appear on all exported reports (PDF, Excel) for <strong>all dealerships</strong> in the system. The current working dealership is: <strong>{currentDealership?.name || 'N/A'}</strong>
                    </p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={saveSenderInfo} disabled={saving} size="lg">
                    <Save className="h-4 w-4 mr-2" />
                    Save Sender Information
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Security Settings */}
        {perms.canAccessSecurity && (
          <TabsContent value="security" className="space-y-6">
            <SecurityAuditLogViewer />
          </TabsContent>
        )}

        {/* System Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <IntegrationSettings />
        </TabsContent>
      </Tabs>

      {/* Development Tools - Only shown in development mode */}
      {developmentConfig.features.enableStorageDebug && (
        <div className="mt-8 border-t pt-6">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
              <span className="group-open:rotate-90 transition-transform">▶</span>
              🛠️ Storage Development Tools
              <Badge variant="outline" className="text-xs">Dev Only</Badge>
            </summary>
            <div className="mt-4">
              <StorageDevTools />
            </div>
          </details>
        </div>
      )}

      {/* Advanced Notification Preferences Modal */}
      <NotificationPreferencesModal
        open={showAdvancedPreferences}
        onOpenChange={setShowAdvancedPreferences}
        dealerId={enhancedUser?.dealership_id || 0}
      />
    </div>
  );
}
