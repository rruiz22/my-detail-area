import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Save, Upload } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

export function PersonalInformationTab() {
  const { t } = useTranslation();
  const { profile, preferences, loading, updateProfile, updatePreferences } = useUserProfile();
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    phone: preferences?.phone || '',
    bio: preferences?.bio || '',
    job_title: preferences?.job_title || '',
    department: preferences?.department || '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const profileUpdates = {
      first_name: formData.first_name,
      last_name: formData.last_name,
    };

    const preferencesUpdates = {
      phone: formData.phone,
      bio: formData.bio,
      job_title: formData.job_title,
      department: formData.department,
    };

    await updateProfile(profileUpdates);
    await updatePreferences(preferencesUpdates);
  };

  const getInitials = () => {
    const first = profile?.first_name?.[0] || '';
    const last = profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div className="space-y-6">
      {/* Profile Photo Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {t('profile.profile_photo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={preferences?.avatar_url} />
              <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" disabled>
                <Upload className="h-4 w-4 mr-2" />
                {t('profile.upload_photo')}
              </Button>
              <p className="text-sm text-muted-foreground">
                {t('profile.photo_requirements')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.basic_information')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">{t('profile.first_name')}</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                placeholder={t('profile.enter_first_name')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">{t('profile.last_name')}</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                placeholder={t('profile.enter_last_name')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('profile.email')}</Label>
            <Input
              id="email"
              value={profile?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              {t('profile.email_readonly')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('profile.phone')}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder={t('profile.enter_phone')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.professional_info')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">{t('profile.job_title')}</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder={t('profile.enter_job_title')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">{t('profile.department')}</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder={t('profile.enter_department')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('profile.bio')}</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder={t('profile.enter_bio')}
              rows={3}
            />
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