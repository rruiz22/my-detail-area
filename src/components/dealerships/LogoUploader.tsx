import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Upload, X, Loader2 } from 'lucide-react';
import { useUploadDealershipLogo, useDeleteDealershipLogo } from '@/hooks/useDealershipLogo';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

/**
 * LogoUploader Component
 *
 * Enterprise-grade logo upload component for dealerships
 *
 * FEATURES:
 * - Instant preview on file selection
 * - Upload with hybrid optimization (client + server)
 * - Loading states during upload
 * - Remove logo functionality
 * - File type and size validation
 * - Fallback to Building2 icon (Notion-style)
 *
 * USAGE:
 * <LogoUploader
 *   dealershipId={123}
 *   currentLogoUrl="https://..."
 *   size="md"
 * />
 */

interface LogoUploaderProps {
  dealershipId: number;
  currentLogoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export function LogoUploader({ dealershipId, currentLogoUrl, size = 'md' }: LogoUploaderProps) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadDealershipLogo();
  const deleteMutation = useDeleteDealershipLogo();

  // Size classes for different avatar sizes
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10'
  };

  /**
   * Handle file selection
   * - Validates file type and size
   * - Confirms replacement if logo exists
   * - Shows instant preview
   * - Triggers upload mutation with proper error handling
   */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ========================================================================
    // VALIDATION: File type
    // ========================================================================
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: t('dealerships.logo_invalid_format'),
        description: t('dealerships.logo_allowed_formats'),
        variant: 'destructive'
      });
      return;
    }

    // ========================================================================
    // VALIDATION: File size (2MB max)
    // ========================================================================
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      toast({
        title: t('dealerships.logo_too_large'),
        description: t('dealerships.logo_size_limit'),
        variant: 'destructive'
      });
      return;
    }

    // ========================================================================
    // CONFIRMATION: Ask user if they want to replace existing logo
    // ========================================================================
    if (currentLogoUrl) {
      const confirmed = window.confirm(t('dealerships.logo_replace_confirm'));
      if (!confirmed) {
        // User cancelled - clear file input and exit
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // User confirmed replacement
      toast({
        title: t('dealerships.logo_replacing'),
        description: t('dealerships.logo_replacing_description'),
      });
    }

    // ========================================================================
    // INSTANT PREVIEW: Show image immediately for better UX
    // ========================================================================
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // ========================================================================
    // UPLOAD: Trigger hybrid optimization upload
    // ========================================================================
    try {
      await uploadMutation.mutateAsync({ dealershipId, file });

      // Success feedback
      toast({
        title: currentLogoUrl ? t('dealerships.logo_replaced_successfully') : t('dealerships.logo_uploaded_successfully'),
        description: t('dealerships.logo_upload_success_description'),
      });
    } catch (error: any) {
      // Revert preview on error
      setPreviewUrl(currentLogoUrl || null);

      // Detailed error feedback
      console.error('Logo upload error:', error);
      toast({
        title: t('dealerships.logo_upload_failed'),
        description: error?.message || t('dealerships.logo_upload_error_description'),
        variant: 'destructive'
      });
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle logo removal
   * - Clears preview
   * - Deletes from storage and database
   */
  const handleRemoveLogo = async () => {
    setPreviewUrl(null);
    await deleteMutation.mutateAsync(dealershipId);
  };

  const isLoading = uploadMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex items-center gap-4">
      {/* ====================================================================
          AVATAR PREVIEW
          ==================================================================== */}
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage
            src={previewUrl || ''}
            alt={t('dealerships.logo')}
            loading="lazy"
          />
          <AvatarFallback className="bg-muted">
            <Building2 className={`${iconSizeClasses[size]} text-muted-foreground`} />
          </AvatarFallback>
        </Avatar>

        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* ====================================================================
          ACTION BUTTONS
          ==================================================================== */}
      <div className="flex flex-col gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileSelect}
          disabled={isLoading}
        />

        {/* Upload/Change button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {previewUrl ? t('dealerships.change_logo') : t('dealerships.upload_logo')}
        </Button>

        {/* Remove button (only show if logo exists) */}
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveLogo}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            {t('dealerships.remove_logo')}
          </Button>
        )}
      </div>
    </div>
  );
}
