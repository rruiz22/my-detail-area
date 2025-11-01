import { AvatarSystem, type AvatarSeed } from '@/components/ui/avatar-system';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useDeleteProfileAvatar, useUploadProfileAvatar } from '@/hooks/useProfileAvatar';
import { Info, Loader2, Upload, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

interface AvatarSelectionModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  currentSeed: AvatarSeed;
  onSeedChange: (seed: AvatarSeed) => void;
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string | null;
}

export function AvatarSelectionModal({
  open,
  onClose,
  userName,
  firstName,
  lastName,
  email,
  avatarUrl
}: AvatarSelectionModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useUploadProfileAvatar();
  const deleteMutation = useDeleteProfileAvatar();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate({
        file: acceptedFiles[0]
      });
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
  });

  const handleRemovePhoto = () => {
    deleteMutation.mutate();
  };

  const isUploading = uploadMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('profile.your_avatar', 'Your Avatar')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {avatarUrl
              ? t('profile.custom_photo', 'Custom Photo')
              : t('profile.avatar_info', 'Your avatar is automatically generated from your name initials.')
            }
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center justify-center gap-4 p-6 bg-muted/30 rounded-lg">
            <AvatarSystem
              name={userName}
              firstName={firstName}
              lastName={lastName}
              email={email}
              avatarUrl={avatarUrl}
              size={96}
              className="flex-shrink-0"
            />
            <div className="text-center space-y-2">
              <h3 className="font-medium text-lg">
                {firstName && lastName ? `${firstName} ${lastName}` : userName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {avatarUrl ? (
                  t('profile.custom_photo', 'Custom Photo')
                ) : (
                  <>
                    {t('profile.initials', 'Initials')}: {firstName && lastName ? `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() : 'N/A'}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Upload / Remove Photo Section */}
          <div className="space-y-3">
            {avatarUrl ? (
              <Button
                onClick={handleRemovePhoto}
                disabled={isDeleting}
                variant="destructive"
                className="w-full"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading', 'Loading...')}
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    {t('profile.remove_photo', 'Remove Photo')}
                  </>
                )}
              </Button>
            ) : (
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                  ${isDragActive || dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 hover:border-primary/50 hover:bg-muted/50'
                  }
                  ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}
              >
                <input {...getInputProps()} />
                <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm text-muted-foreground">
                      {t('profile.uploading_photo', 'Uploading photo...')}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.drag_drop_photo', 'Drag and drop your photo here, or click to select')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, JPEG, WEBP (max 5MB)
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Info Message */}
          {!avatarUrl && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-medium">{t('profile.avatar_automatic', 'Automatic Avatar')}</p>
                <p className="text-xs opacity-90">
                  {t('profile.avatar_explanation', 'Your avatar displays the first letter of your first name and last name. To change it, update your name in Personal Information.')}
                </p>
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              {t('common.close', 'Close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
