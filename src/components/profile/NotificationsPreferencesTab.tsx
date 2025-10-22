import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
  Globe,
  Calendar,
  Save
} from 'lucide-react';
import { useProfileMutations } from '@/hooks/useProfileMutations';

export function NotificationsPreferencesTab() {
  const { t } = useTranslation();
  const { loading, updatePreferences } = useProfileMutations();
  
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

  const handleSwitchChange = (field: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await updatePreferences(formData);
  };

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

  return (
    <div className="space-y-6">
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
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <Label className="font-medium">{t('profile.sms_notifications')}</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('profile.sms_notifications_desc')}
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