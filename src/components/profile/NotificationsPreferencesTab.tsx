import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Globe,
  Calendar,
  Save,
  Filter,
  AlertCircle,
  ChevronDown,
  Settings,
  Volume2,
  Vibrate,
  Moon
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useProfileMutations } from '@/hooks/useProfileMutations';
import { NotificationEventsTable, NotificationChannel } from '@/components/profile/NotificationEventsTable';
import { getEventsForModule, getAllCategories } from '@/constants/notificationEvents';
import { supabase } from '@/integrations/supabase/client';
import { useEventBasedNotificationPreferences } from '@/hooks/useEventBasedNotificationPreferences';
import { Info } from 'lucide-react';
import { AlertTitle } from '@/components/ui/alert';
import { useFirebaseMessaging } from '@/hooks/useFirebaseMessaging';
import { PushNotificationDevices } from '@/components/profile/PushNotificationDevices';

export function NotificationsPreferencesTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const { loading, updatePreferences, updateSMSPreferences } = useProfileMutations();

  // Firebase messaging hook for push notifications
  const { requestPermission, clearToken, loading: fcmLoading } = useFirebaseMessaging();
  const [isPushToggling, setIsPushToggling] = useState(false);

  // Advanced push notification preferences
  const [advancedPushSettings, setAdvancedPushSettings] = useState({
    allow_background: true,
    allow_sound: true,
    allow_vibration: true,
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00'
  });
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Get dealership ID for 3-level validation
  const [dealerId, setDealerId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    notification_email: true,
    notification_sms: false,
    notification_push: false, // Changed from true → false to respect user's explicit disable choice
    notification_in_app: true,
    notification_frequency: 'immediate',
    quiet_hours_start: '',
    quiet_hours_end: '',
    timezone: 'America/New_York',
    language_preference: 'en',
    date_format: 'MM/dd/yyyy',
    time_format: '12h',
  });

  // Granular event preferences state
  const [activeModule, setActiveModule] = useState('sales_orders');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Integrate 3-level validation hook
  const {
    preferences: eventBasedPrefs,
    allowedEvents,
    loading: eventsLoading,
    saving: eventsSaving,
    toggleEventChannel,
    savePreferences: saveEventPreferences,
    isEventAllowedByRole,
  } = useEventBasedNotificationPreferences(dealerId, activeModule);

  // Load preferences from database
  useEffect(() => {
    if (preferences) {
      setFormData({
        notification_email: preferences.notification_email ?? true,
        notification_sms: preferences.notification_sms ?? false,
        notification_push: preferences.notification_push ?? true,
        notification_in_app: preferences.notification_in_app ?? true,
        notification_frequency: preferences.notification_frequency || 'immediate',
        quiet_hours_start: preferences.quiet_hours_start || '',
        quiet_hours_end: preferences.quiet_hours_end || '',
        timezone: preferences.timezone || 'America/New_York',
        language_preference: preferences.language_preference || 'en',
        date_format: preferences.date_format || 'MM/dd/yyyy',
        time_format: preferences.time_format || '12h',
      });
    }
  }, [preferences]);

  // Load push notification preferences from new table
  useEffect(() => {
    if (!user?.id) return;

    const loadPushPreferences = async () => {
      const { data: pushPrefs } = await supabase
        .from('user_push_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Handle both cases: when row exists and when it doesn't
      // Default to false if no preferences exist (user hasn't explicitly enabled)
      const pushEnabled = pushPrefs?.push_enabled ?? false;

      setFormData((prev) => ({ ...prev, notification_push: pushEnabled }));
      setAdvancedPushSettings({
        allow_background: pushPrefs?.allow_background ?? true,
        allow_sound: pushPrefs?.allow_sound ?? true,
        allow_vibration: pushPrefs?.allow_vibration ?? true,
        quiet_hours_enabled: pushPrefs?.quiet_hours_enabled ?? false,
        quiet_hours_start: pushPrefs?.quiet_hours_start || '22:00',
        quiet_hours_end: pushPrefs?.quiet_hours_end || '08:00'
      });
    };

    loadPushPreferences();
  }, [user?.id]);

  // Fetch dealership ID for 3-level validation
  useEffect(() => {
    if (!user?.id) return;

    const fetchDealerId = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single();

      if (profile?.dealership_id) {
        setDealerId(profile.dealership_id);
      }
    };

    fetchDealerId();
  }, [user?.id]);

  // Derive eventPreferences from hook (replaces manual state)
  const eventPreferences = useMemo(() => {
    if (!eventBasedPrefs?.event_preferences) return {};

    const prefs: Record<string, Record<NotificationChannel, boolean>> = {};
    Object.entries(eventBasedPrefs.event_preferences).forEach(([eventId, channels]) => {
      prefs[eventId] = channels;
    });

    return prefs;
  }, [eventBasedPrefs]);

  const handleSwitchChange = (field: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEventToggle = (eventId: string, channel: NotificationChannel, value: boolean) => {
    // Validate that event is allowed by user's Custom Role (Level 2)
    if (!isEventAllowedByRole(eventId)) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.errors.event_not_allowed_by_role', 'This event is not enabled for your role. Contact your administrator.'),
      });
      return;
    }

    // Use hook method to toggle channel
    toggleEventChannel(eventId, channel, value);
  };

  /**
   * Handle push notification toggle with FCM token management
   */
  const handlePushToggle = async (enabled: boolean) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:entry',message:'Push toggle called',data:{enabled,userId:user?.id,hasUser:!!user},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion

    if (!user?.id) return;

    setIsPushToggling(true);

    try {
      if (enabled) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:beforeRequestPermission',message:'About to call requestPermission',data:{enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        // Request notification permission and register FCM token
        await requestPermission();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:afterRequestPermission',message:'requestPermission completed successfully',data:{enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:beforeClearToken',message:'About to call clearToken',data:{enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
        // Deactivate all user's FCM tokens
        await clearToken();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:afterClearToken',message:'clearToken completed successfully',data:{enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
        // #endregion
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:beforeUpsert',message:'About to upsert preferences',data:{userId:user.id,enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      // Update user_push_notification_preferences table
      const { error } = await supabase
        .from('user_push_notification_preferences')
        .upsert(
          {
            user_id: user.id,
            push_enabled: enabled,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:afterUpsert',message:'Upsert completed',data:{error:error?.message||null,errorCode:error?.code||null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H2'})}).catch(()=>{});
      // #endregion

      if (error) throw error;

      // Update local state
      setFormData((prev) => ({ ...prev, notification_push: enabled }));

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:success',message:'Push toggle SUCCESS',data:{enabled},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion

      toast({
        title: t('common.success'),
        description: enabled
          ? t('notifications.push_enabled', 'Push notifications enabled')
          : t('notifications.push_disabled', 'Push notifications disabled'),
      });
    } catch (error) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/56b3cffb-5a48-451a-8ffb-de0d6680f06b',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'NotificationsPreferencesTab.tsx:handlePushToggle:catch',message:'Push toggle FAILED',data:{errorMessage:(error as Error)?.message,errorName:(error as Error)?.name},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H3'})}).catch(()=>{});
      // #endregion
      console.error('Failed to toggle push notifications:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('notifications.push_toggle_error', 'Failed to update push notification settings'),
      });
    } finally {
      setIsPushToggling(false);
    }
  };

  /**
   * Handle advanced push notification settings update
   */
  const handleAdvancedPushSettingChange = async (
    field: keyof typeof advancedPushSettings,
    value: boolean | string
  ) => {
    if (!user?.id) return;

    // Update local state
    setAdvancedPushSettings((prev) => ({ ...prev, [field]: value }));

    try {
      // Update database
      const { error } = await supabase
        .from('user_push_notification_preferences')
        .upsert(
          {
            user_id: user.id,
            [field]: value,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id',
          }
        );

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update advanced push setting:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: 'Failed to update push notification settings',
      });
      // Revert local state on error
      setAdvancedPushSettings((prev) => ({ ...prev, [field]: !value }));
    }
  };

  const handleSave = async () => {
    // Validate SMS notifications
    if (formData.notification_sms && !hasPhoneNumber) {
      // Allow saving but show warning that SMS won't work
      console.warn('SMS notifications enabled but no phone number configured');
    }

    // 1. Save general preferences (profiles table)
    const sanitizedData = {
      ...formData,
      quiet_hours_start: formData.quiet_hours_start || null,
      quiet_hours_end: formData.quiet_hours_end || null,
    };

    await updatePreferences(sanitizedData);

    // 2. Save event-based notification preferences (user_sms_notification_preferences table)
    // Uses 3-level validation architecture
    await saveEventPreferences();
  };

  // Filter events: Only show events allowed by Custom Role (Level 2) and category filter
  const filteredEvents = getEventsForModule(activeModule)
    .filter(event => isEventAllowedByRole(event.id)) // ✅ LEVEL 2 VALIDATION
    .filter(event => categoryFilter === 'all' || event.category === categoryFilter);

  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'UTC', label: 'UTC' },
  ];

  const languages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'pt-BR', label: 'Português (Brasil)' },
  ];

  const dateFormats = [
    { value: 'MM/dd/yyyy', label: '12/31/2024 (MM/dd/yyyy)' },
    { value: 'dd/MM/yyyy', label: '31/12/2024 (dd/MM/yyyy)' },
    { value: 'yyyy-MM-dd', label: '2024-12-31 (yyyy-MM-dd)' },
  ];

  const timeFormats = [
    { value: '12h', label: '12:00 PM (12-hour)' },
    { value: '24h', label: '12:00 (24-hour)' },
  ];

  // Check if user has phone number for SMS
  const hasPhoneNumber = !!preferences?.phone;

  if (preferencesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading notification preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SMS Warning if no phone number */}
      {formData.notification_sms && !hasPhoneNumber && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            📱 You need to add a phone number in <strong>Personal Information</strong> tab to receive SMS notifications.
          </AlertDescription>
        </Alert>
      )}

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t('profile.notification_types')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label className="font-medium">{t('profile.email_notifications')}</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.email_notifications_desc')}
              </p>
            </div>
            <Switch
              checked={formData.notification_email}
              onCheckedChange={(checked) => handleSwitchChange('notification_email', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5 flex-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <Label className="font-medium">{t('profile.sms_notifications')}</Label>
                {hasPhoneNumber ? (
                  <span className="text-xs text-emerald-600 font-medium">✓ {preferences?.phone}</span>
                ) : (
                  <span className="text-xs text-amber-600 font-medium">⚠️ No phone</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.sms_notifications_desc', 'Receive notifications via SMS')}
              </p>
            </div>
            <Switch
              checked={formData.notification_sms}
              onCheckedChange={(checked) => handleSwitchChange('notification_sms', checked)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                <Label className="font-medium">{t('profile.push_notifications')}</Label>
                {isPushToggling && (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    {formData.notification_push ? 'Disabling...' : 'Enabling...'}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.push_notifications_desc')}
              </p>
            </div>
            <Switch
              checked={formData.notification_push}
              onCheckedChange={handlePushToggle}
              disabled={isPushToggling || fcmLoading}
            />
          </div>

          {/* Advanced Push Notification Settings - Collapsible */}
          {formData.notification_push && (
            <div className="pl-8 mt-4">
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Advanced Settings
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isAdvancedOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3 space-y-3 pb-2">
                  {/* Background notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm font-normal">Background Notifications</Label>
                    </div>
                    <Switch
                      checked={advancedPushSettings.allow_background}
                      onCheckedChange={(checked) =>
                        handleAdvancedPushSettingChange('allow_background', checked)
                      }
                      className="scale-90"
                    />
                  </div>

                  {/* Sound */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm font-normal">Notification Sound</Label>
                    </div>
                    <Switch
                      checked={advancedPushSettings.allow_sound}
                      onCheckedChange={(checked) =>
                        handleAdvancedPushSettingChange('allow_sound', checked)
                      }
                      className="scale-90"
                    />
                  </div>

                  {/* Vibration */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Vibrate className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-sm font-normal">Vibration</Label>
                    </div>
                    <Switch
                      checked={advancedPushSettings.allow_vibration}
                      onCheckedChange={(checked) =>
                        handleAdvancedPushSettingChange('allow_vibration', checked)
                      }
                      className="scale-90"
                    />
                  </div>

                  <Separator className="my-2" />

                  {/* Quiet Hours */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-sm font-normal">Quiet Hours</Label>
                      </div>
                      <Switch
                        checked={advancedPushSettings.quiet_hours_enabled}
                        onCheckedChange={(checked) =>
                          handleAdvancedPushSettingChange('quiet_hours_enabled', checked)
                        }
                        className="scale-90"
                      />
                    </div>
                    {advancedPushSettings.quiet_hours_enabled && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pl-6">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Start</Label>
                          <Select
                            value={advancedPushSettings.quiet_hours_start}
                            onValueChange={(value) =>
                              handleAdvancedPushSettingChange('quiet_hours_start', value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem
                                  key={i}
                                  value={`${i.toString().padStart(2, '0')}:00`}
                                >
                                  {`${i.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">End</Label>
                          <Select
                            value={advancedPushSettings.quiet_hours_end}
                            onValueChange={(value) =>
                              handleAdvancedPushSettingChange('quiet_hours_end', value)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem
                                  key={i}
                                  value={`${i.toString().padStart(2, '0')}:00`}
                                >
                                  {`${i.toString().padStart(2, '0')}:00`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                <Label className="font-medium">{t('profile.in_app_notifications')}</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.in_app_notifications_desc')}
              </p>
            </div>
            <Switch
              checked={formData.notification_in_app}
              onCheckedChange={(checked) => handleSwitchChange('notification_in_app', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Push Notification Devices - Show only if push is enabled */}
      {formData.notification_push && (
        <PushNotificationDevices />
      )}

      {/* 3-Level Architecture Info Alert */}
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-900 dark:text-blue-100">
          {t('notifications.level_3_title', 'Level 3: Your Personal Preferences')}
        </AlertTitle>
        <AlertDescription className="text-blue-800 dark:text-blue-200 text-sm">
          {t('notifications.level_3_description', 'You can only enable notifications for events allowed by your Custom Role. You must also be a follower of orders to receive notifications.')}
        </AlertDescription>
      </Alert>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('profile.notification_settings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('profile.notification_frequency')}</Label>
            <Select
              value={formData.notification_frequency}
              onValueChange={(value) => handleSelectChange('notification_frequency', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">{t('profile.immediate')}</SelectItem>
                <SelectItem value="hourly">{t('profile.hourly')}</SelectItem>
                <SelectItem value="daily">{t('profile.daily')}</SelectItem>
                <SelectItem value="weekly">{t('profile.weekly')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.quiet_hours_start')}</Label>
              <Select
                value={formData.quiet_hours_start}
                onValueChange={(value) => handleSelectChange('quiet_hours_start', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('profile.select_time')} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                      {formData.time_format === '12h'
                        ? `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i >= 12 ? 'PM' : 'AM'}`
                        : `${i.toString().padStart(2, '0')}:00`
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('profile.quiet_hours_end')}</Label>
              <Select
                value={formData.quiet_hours_end}
                onValueChange={(value) => handleSelectChange('quiet_hours_end', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('profile.select_time')} />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                      {formData.time_format === '12h'
                        ? `${i === 0 ? 12 : i > 12 ? i - 12 : i}:00 ${i >= 12 ? 'PM' : 'AM'}`
                        : `${i.toString().padStart(2, '0')}:00`
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Localization Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('profile.localization')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.language')}</Label>
              <Select
                value={formData.language_preference}
                onValueChange={(value) => handleSelectChange('language_preference', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('profile.timezone')}</Label>
              <Select
                value={formData.timezone}
                onValueChange={(value) => handleSelectChange('timezone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('profile.date_format')}</Label>
              <Select
                value={formData.date_format}
                onValueChange={(value) => handleSelectChange('date_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('profile.time_format')}</Label>
              <Select
                value={formData.time_format}
                onValueChange={(value) => handleSelectChange('time_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      {format.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Granular Event Notifications - DISABLED (Implementing Soon) */}
      <Card className="card-enhanced relative">
        {/* Overlay for "Implementing Soon" */}
        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm z-10 rounded-lg flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 px-8 py-6 rounded-lg shadow-xl border-2 border-amber-500 text-center">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-8 w-8 text-amber-500 animate-pulse" />
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Implementing Soon
              </h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm max-w-md">
              Event-based notification preferences are being redesigned for a better user experience.
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-xs mt-2">
              Use the global SMS toggle above to control notifications.
            </p>
          </div>
        </div>

        <CardHeader className="pointer-events-none">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 opacity-50">
              <Bell className="h-5 w-5" />
              {t('notifications.granular_settings', 'Event-Based Notifications')}
            </CardTitle>
            <div className="flex items-center gap-2 opacity-50">
              <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('notifications.all_categories', 'All Categories')}</SelectItem>
                  <SelectItem value="orders">{t('notifications.categories.orders', 'Orders')}</SelectItem>
                  <SelectItem value="team">{t('notifications.categories.team', 'Team')}</SelectItem>
                  <SelectItem value="deadlines">{t('notifications.categories.deadlines', 'Deadlines')}</SelectItem>
                  <SelectItem value="financial">{t('notifications.categories.financial', 'Financial')}</SelectItem>
                  <SelectItem value="system">{t('notifications.categories.system', 'System')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pointer-events-none">
          <Tabs value={activeModule} onValueChange={setActiveModule}>
            <TabsList className="grid w-full grid-cols-5 mb-4 opacity-50">
              <TabsTrigger value="sales_orders" disabled>{t('notifications.modules.sales', 'Sales')}</TabsTrigger>
              <TabsTrigger value="service_orders" disabled>{t('notifications.modules.service', 'Service')}</TabsTrigger>
              <TabsTrigger value="recon_orders" disabled>{t('notifications.modules.recon', 'Recon')}</TabsTrigger>
              <TabsTrigger value="car_wash" disabled>{t('notifications.modules.car_wash', 'Car Wash')}</TabsTrigger>
              <TabsTrigger value="get_ready" disabled>{t('notifications.modules.get_ready', 'Get Ready')}</TabsTrigger>
            </TabsList>

            <TabsContent value="sales_orders" className="opacity-50">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="service_orders" className="opacity-50">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="recon_orders" className="opacity-50">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="car_wash" className="opacity-50">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="get_ready" className="opacity-50">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading || eventsSaving}>
          <Save className="h-4 w-4 mr-2" />
          {(loading || eventsSaving) ? t('common.saving') : t('common.save_changes')}
        </Button>
      </div>
    </div>
  );
}
