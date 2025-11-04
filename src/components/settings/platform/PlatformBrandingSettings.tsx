import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useSettingsPermissions } from '@/hooks/useSettingsPermissions';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Upload, X, Loader2, Eye, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { compressImage, shouldCompressImage } from '@/utils/imageCompression';

/**
 * PlatformBrandingSettings
 *
 * System admin interface to customize authentication page branding
 *
 * FEATURES:
 * - Logo upload (max 2MB, auto-compressed)
 * - Title customization (max 50 chars)
 * - Tagline customization (max 100 chars)
 * - Live preview
 * - Permission guard (system_admin only)
 *
 * LOCATION: Settings → Platform tab
 */

export function PlatformBrandingSettings() {
  const { t } = useTranslation();
  const perms = useSettingsPermissions();
  const { branding, isLoading, updateBranding, isUpdating } = useSystemSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deleteLogoDialogOpen, setDeleteLogoDialogOpen] = useState(false);

  // Update local state when branding loads
  useEffect(() => {
    if (branding) {
      setTitle(branding.title);
      setTagline(branding.tagline);
      setLogoUrl(branding.logo_url);
    }
  }, [branding]);

  const handleLogoUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(t('settings.invalid_file_type', 'Please select an image file'));
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      alert(t('settings.file_too_large', 'File size must be less than 2MB'));
      return;
    }

    setUploadingLogo(true);
    setUploadProgress(0);

    try {
      // Step 1: Client-side compression
      let fileToUpload = file;

      if (shouldCompressImage(file)) {
        setUploadProgress(25);
        const compressed = await compressImage(file, {
          maxWidth: 512,
          maxHeight: 512,
          quality: 0.9
        });
        fileToUpload = compressed;
      }

      setUploadProgress(50);

      // Step 2: Upload to Supabase Storage
      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `system/auth-logo.${fileExt}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage
          .from('auth-branding')
          .remove([oldPath]);
      }

      setUploadProgress(75);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('auth-branding')
        .upload(fileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      setUploadProgress(100);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('auth-branding')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);

      alert(t('settings.logo_uploaded', 'Logo uploaded successfully! Click Save Changes to apply.'));
    } catch (error) {
      console.error('[Branding] Upload failed:', error);
      alert(t('settings.logo_upload_error', 'Failed to upload logo'));
    } finally {
      setUploadingLogo(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveLogo = () => {
    if (!logoUrl) return;
    setDeleteLogoDialogOpen(true);
  };

  const confirmRemoveLogo = async () => {
    setLogoUrl(null);
  };

  const handleSave = () => {
    updateBranding({
      logo_url: logoUrl,
      title: title.trim() || 'My Detail Area',
      tagline: tagline.trim() || 'Dealership Operations Platform',
      enabled: true
    });
  };

  // Permission check
  if (!perms.canEditBranding) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {t('settings.system_admin_required', 'System Administrator access required')}
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Editor Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                {t('settings.auth_branding', 'Authentication Page Branding')}
              </CardTitle>
              <CardDescription className="mt-2">
                {t('settings.auth_branding_description', 'Customize the login page logo, title, and tagline')}
              </CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {t('settings.system_admin_only', 'System Admin Only')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-3">
            <Label>{t('settings.auth_logo', 'Login Page Logo')}</Label>
            <div className="flex items-center gap-4">
              {/* Logo Preview */}
              <div className="w-24 h-24 rounded-lg border-2 border-border bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Auth logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                )}
              </div>

              {/* Upload Controls */}
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="flex items-center gap-2"
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {uploadProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {logoUrl ? t('common.change', 'Change') : t('common.upload', 'Upload')}
                      </>
                    )}
                  </Button>

                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                    >
                      <X className="h-4 w-4" />
                      {t('common.remove', 'Remove')}
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  {t('settings.logo_requirements', 'PNG, JPG, SVG, WebP. Max 2MB. Recommended: 512x512px')}
                </p>
              </div>
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="auth-title">{t('settings.auth_title', 'Page Title')}</Label>
            <Input
              id="auth-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={50}
              placeholder="My Detail Area"
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              {title.length}/50 {t('common.characters', 'characters')}
            </p>
          </div>

          {/* Tagline Input */}
          <div className="space-y-2">
            <Label htmlFor="auth-tagline">{t('settings.auth_tagline', 'Tagline')}</Label>
            <Input
              id="auth-tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={100}
              placeholder="Dealership Operations Platform"
            />
            <p className="text-xs text-muted-foreground">
              {tagline.length}/100 {t('common.characters', 'characters')}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isUpdating || uploadingLogo}
              className="min-w-[120px]"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.saving', 'Saving...')}
                </>
              ) : (
                t('common.save_changes', 'Save Changes')
              )}
            </Button>

            <p className="text-sm text-muted-foreground">
              {t('settings.branding_note', 'Changes appear on login page immediately')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {t('settings.preview', 'Preview')}
          </CardTitle>
          <CardDescription>
            {t('settings.preview_description', 'This is how the login page will look')}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Simulated Auth Page Preview */}
          <div className="rounded-lg border-2 border-border p-8 bg-background text-center space-y-4">
            {/* Logo Preview */}
            {logoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={logoUrl}
                  alt={title}
                  className="h-16 w-auto object-contain max-w-full"
                />
              </div>
            )}

            {/* Title Preview */}
            <h2 className="text-3xl font-bold text-foreground">
              {title || 'My Detail Area'}
            </h2>

            {/* Tagline Preview */}
            <p className="text-muted-foreground">
              {tagline || 'Dealership Operations Platform'}
            </p>

            {/* Sample Card */}
            <div className="mt-6 max-w-sm mx-auto">
              <Card className="shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {t('auth.welcome_title', 'Welcome back')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder={t('auth.email_placeholder', 'Email')} disabled />
                  <Input type="password" placeholder={t('auth.password_placeholder', 'Password')} disabled />
                  <Button className="w-full" disabled>
                    {t('auth.sign_in_button', 'Sign In')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Logo Confirmation Dialog */}
      <ConfirmDialog
        open={deleteLogoDialogOpen}
        onOpenChange={setDeleteLogoDialogOpen}
        title={t('settings.remove_logo_title', { defaultValue: 'Remove Logo?' })}
        description={t('settings.confirm_remove_logo', { defaultValue: 'Remove logo? This will take effect when you save changes.' })}
        confirmText={t('common.action_buttons.remove', { defaultValue: 'Remove' })}
        cancelText={t('common.action_buttons.cancel')}
        onConfirm={confirmRemoveLogo}
        variant="destructive"
      />
    </div>
  );
}
