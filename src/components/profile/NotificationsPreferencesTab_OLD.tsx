import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useProfileMutations } from '@/hooks/useProfileMutations';
import { NotificationEventsTable, NotificationChannel } from '@/components/profile/NotificationEventsTable';
import { getEventsForModule, getAllCategories } from '@/constants/notificationEvents';
import { supabase } from '@/integrations/supabase/client';

export function NotificationsPreferencesTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();
  const { loading, updatePreferences, updateSMSPreferences } = useProfileMutations();

  const [formData, setFormData] = useState({
    notification_email: true,
    notification_sms: false,
    notification_push: true,
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
  const [eventPreferences, setEventPreferences] = useState<Record<string, Record<NotificationChannel, boolean>>>({});

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

  // Load SMS event preferences for current module
  useEffect(() => {
    if (!user?.id) return;

    const loadSMSPreferences = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', user.id)
        .single();

      if (!profile?.dealership_id) return;

      const { data: smsPrefs } = await supabase
        .from('user_sms_notification_preferences')
        .select('event_preferences, sms_enabled')
        .eq('user_id', user.id)
        .eq('dealer_id', profile.dealership_id)
        .eq('module', activeModule)
        .single();

      if (smsPrefs && smsPrefs.event_preferences) {
        // Convert DB format to UI format
        const uiPreferences: Record<string, Record<NotificationChannel, boolean>> = {};

        Object.entries(smsPrefs.event_preferences).forEach(([eventId, value]) => {
          let smsEnabled = false;

          if (typeof value === 'boolean') {
            smsEnabled = value;
          } else if (typeof value === 'object' && value !== null && 'enabled' in value) {
            smsEnabled = (value as any).enabled;
          }

          if (smsEnabled) {
            uiPreferences[eventId] = {
              ...(eventPreferences[eventId] || {}),
              sms: true
            };
          }
        });

        setEventPreferences(prev => ({
          ...prev,
          ...uiPreferences
        }));
      }
    };

    loadSMSPreferences();
  }, [user?.id, activeModule]);

  const handleSwitchChange = (field: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEventToggle = (eventId: string, channel: NotificationChannel, value: boolean) => {
    setEventPreferences(prev => ({
      ...prev,
      [eventId]: {
        ...(prev[eventId] || {}),
        [channel]: value,
      }
    }));
  };

  const handleSave = async () => {
    // Validate SMS notifications
    if (formData.notification_sms && !hasPhoneNumber) {
      // Allow saving but show warning that SMS won't work
      console.warn('SMS notifications enabled but no phone number configured');
    }

    // ✅ FIX: Convert empty strings to null for TIME fields
    const sanitizedData = {
      ...formData,
      quiet_hours_start: formData.quiet_hours_start || null,
      quiet_hours_end: formData.quiet_hours_end || null,
    };

    await updatePreferences(sanitizedData);

    // ✅ NEW: Save SMS event preferences per module
    if (formData.notification_sms && Object.keys(eventPreferences).length > 0) {
      // Extract SMS preferences for the active module
      const smsPreferencesForModule: Record<string, boolean> = {};

      Object.entries(eventPreferences).forEach(([eventId, channels]) => {
        if (channels.sms) {
          smsPreferencesForModule[eventId] = true;
        }
      });

      // Save SMS preferences for the active module
      await updateSMSPreferences(activeModule, smsPreferencesForModule, formData.notification_sms);
    }
  };

  const filteredEvents = getEventsForModule(activeModule).filter(
    event => categoryFilter === 'all' || event.category === categoryFilter
  );

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
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.push_notifications_desc')}
              </p>
            </div>
            <Switch
              checked={formData.notification_push}
              onCheckedChange={(checked) => handleSwitchChange('notification_push', checked)}
            />
          </div>

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

      {/* Granular Event Notifications */}
      <Card className="card-enhanced">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t('notifications.granular_settings', 'Event-Based Notifications')}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
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
        <CardContent>
          <Tabs value={activeModule} onValueChange={setActiveModule}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="sales_orders">{t('notifications.modules.sales', 'Sales')}</TabsTrigger>
              <TabsTrigger value="service_orders">{t('notifications.modules.service', 'Service')}</TabsTrigger>
              <TabsTrigger value="recon_orders">{t('notifications.modules.recon', 'Recon')}</TabsTrigger>
              <TabsTrigger value="car_wash">{t('notifications.modules.car_wash', 'Car Wash')}</TabsTrigger>
              <TabsTrigger value="get_ready">{t('notifications.modules.get_ready', 'Get Ready')}</TabsTrigger>
            </TabsList>

            <TabsContent value="sales_orders">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="service_orders">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="recon_orders">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="car_wash">
              <NotificationEventsTable
                events={filteredEvents}
                preferences={eventPreferences}
                onToggle={handleEventToggle}
              />
            </TabsContent>

            <TabsContent value="get_ready">
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
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? t('common.saving') : t('common.save_changes')}
        </Button>
      </div>
    </div>
  );
}
