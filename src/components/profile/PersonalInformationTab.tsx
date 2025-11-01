import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfileMutations } from '@/hooks/useProfileMutations';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  personalInformationSchema,
  formatPhoneNumber,
  phoneToE164,
  phoneFromE164,
  type PersonalInformationInput
} from '@/schemas/profileSchemas';
import { z } from 'zod';

export function PersonalInformationTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { loading, updateProfileAndPreferences } = useProfileMutations();
  const { preferences, isLoading: preferencesLoading } = useUserPreferences();

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    bio: '',
    job_title: '',
    department: '',
  });
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Update form when user data and preferences load from database
  useEffect(() => {
    if (user) {
      setFormData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        // Convert from E.164 format (+15551234567) to display format (555) 123-4567
        phone: phoneFromE164(preferences?.phone || ''),
        bio: preferences?.bio || '',
        job_title: preferences?.job_title || '',
        department: preferences?.department || '',
      });
    }
  }, [user, preferences]);

  // Validate a single field
  const validateField = (field: keyof PersonalInformationInput, value: string) => {
    try {
      personalInformationSchema.pick({ [field]: true }).parse({ [field]: value });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(err => err.path[0] === field);
        if (fieldError) {
          setErrors(prev => ({ ...prev, [field]: fieldError.message }));
        }
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    let processedValue = value;

    // Format phone number as user types
    if (field === 'phone') {
      processedValue = formatPhoneNumber(value);
    }

    setFormData(prev => ({ ...prev, [field]: processedValue }));
    setIsDirty(true);

    // Validate if field has been touched
    if (touched[field]) {
      validateField(field as keyof PersonalInformationInput, processedValue);
    }
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field as keyof PersonalInformationInput, formData[field as keyof typeof formData]);
  };

  const handleSave = async () => {
    // Validate all fields before saving
    try {
      personalInformationSchema.parse(formData);

      // Build profile updates (first_name, last_name)
      const profileUpdates = {
        first_name: formData.first_name,
        last_name: formData.last_name,
      };

      // Build preferences update object with ALL fields (including empty ones)
      const preferencesUpdates: Record<string, any> = {
        // Convert phone from display format (555) 123-4567 to E.164 format +15551234567
        phone: formData.phone ? phoneToE164(formData.phone) : '',
        bio: formData.bio || '',
        job_title: formData.job_title || '',
        department: formData.department || '',
      };

      // Execute BOTH updates in a single operation (ONE toast, atomic transaction)
      const success = await updateProfileAndPreferences(profileUpdates, preferencesUpdates);

      if (success) {
        setIsDirty(false);
        setErrors({});
        setTouched({});
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as string;
          formattedErrors[field] = err.message;
        });
        setErrors(formattedErrors);

        // Mark all fields with errors as touched
        const touchedFields: Record<string, boolean> = {};
        Object.keys(formattedErrors).forEach(field => {
          touchedFields[field] = true;
        });
        setTouched(prev => ({ ...prev, ...touchedFields }));
      }
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    try {
      personalInformationSchema.parse(formData);
      return true;
    } catch {
      return false;
    }
  };


  return (
    <div className="space-y-6">
      {/* Unsaved Changes Warning */}
      {isDirty && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('profile.unsaved_changes', 'You have unsaved changes')}
          </AlertDescription>
        </Alert>
      )}

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.basic_information', 'Basic Information')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">
                {t('profile.first_name', 'First Name')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  onBlur={() => handleBlur('first_name')}
                  placeholder={t('profile.enter_first_name', 'Enter your first name')}
                  className={errors.first_name && touched.first_name ? 'border-red-500' : ''}
                />
                {!errors.first_name && touched.first_name && formData.first_name && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 absolute right-3 top-3" />
                )}
              </div>
              {errors.first_name && touched.first_name && (
                <p className="text-sm text-red-500">{errors.first_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">
                {t('profile.last_name', 'Last Name')} <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  onBlur={() => handleBlur('last_name')}
                  placeholder={t('profile.enter_last_name', 'Enter your last name')}
                  className={errors.last_name && touched.last_name ? 'border-red-500' : ''}
                />
                {!errors.last_name && touched.last_name && formData.last_name && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 absolute right-3 top-3" />
                )}
              </div>
              {errors.last_name && touched.last_name && (
                <p className="text-sm text-red-500">{errors.last_name}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('profile.email', 'Email')}</Label>
            <Input
              id="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              {t('profile.email_readonly', 'Email cannot be changed')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('profile.phone', 'Phone (SMS Notifications)')}</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                placeholder="(555) 123-4567"
                maxLength={14}
                className={errors.phone && touched.phone ? 'border-red-500' : ''}
              />
              {!errors.phone && touched.phone && formData.phone && (
                <CheckCircle2 className="h-4 w-4 text-green-500 absolute right-3 top-3" />
              )}
            </div>
            {errors.phone && touched.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
            <p className="text-sm text-muted-foreground">
              📱 Enter 10 digits. System automatically adds +1 for SMS notifications.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.professional_info', 'Professional Information')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="job_title">{t('profile.job_title', 'Job Title')}</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                placeholder={t('profile.enter_job_title', 'Enter your job title')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">{t('profile.department', 'Department')}</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder={t('profile.enter_department', 'Enter your department')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t('profile.bio', 'Bio')}</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder={t('profile.enter_bio', 'Tell us about yourself...')}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
          <p className="text-sm text-red-500 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {t('profile.fix_errors', 'Please fix validation errors before saving')}
          </p>
        )}
        <Button
          onClick={handleSave}
          disabled={loading || !isDirty || !isFormValid()}
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? t('common.saving', 'Saving...') : t('common.save_changes', 'Save Changes')}
        </Button>
      </div>

    </div>
  );
}
