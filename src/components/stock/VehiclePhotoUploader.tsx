import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useVehiclePhotos } from '@/hooks/useVehiclePhotos';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';

interface VehiclePhotoUploaderProps {
  vehicleId: string;
  dealerId: number;
  onUploadComplete?: () => void;
}

interface PhotoPreview {
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

export const VehiclePhotoUploader: React.FC<VehiclePhotoUploaderProps> = ({
  vehicleId,
  dealerId,
  onUploadComplete
}) => {
  const { t } = useTranslation();
  const { uploadPhoto } = useVehiclePhotos({ vehicleId, dealerId });
  const [previews, setPreviews] = useState<PhotoPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejected => {
        const errors = rejected.errors.map((e: any) => {
          if (e.code === 'file-too-large') {
            return t('stock.photos.error_file_too_large', 'File is larger than 5MB');
          }
          if (e.code === 'file-invalid-type') {
            return t('stock.photos.error_invalid_type', 'Only JPG, PNG, WebP allowed');
          }
          return e.message;
        });
        console.warn(`Rejected file: ${rejected.file.name}`, errors);
      });
    }

    // Add accepted files to preview
    const newPreviews: PhotoPreview[] = acceptedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
  }, [t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: isUploading
  });

  const removePreview = (index: number) => {
    setPreviews(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const uploadAllPhotos = async () => {
    setIsUploading(true);

    for (let i = 0; i < previews.length; i++) {
      const preview = previews[i];

      if (preview.status !== 'pending') continue;

      try {
        // Update status to uploading
        setPreviews(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'uploading', progress: 0 };
          return updated;
        });

        // Simulate progress (real progress tracking would need additional implementation)
        const progressInterval = setInterval(() => {
          setPreviews(prev => {
            const updated = [...prev];
            if (updated[i] && updated[i].progress < 90) {
              updated[i] = { ...updated[i], progress: updated[i].progress + 10 };
            }
            return updated;
          });
        }, 100);

        // Upload photo
        await uploadPhoto(preview.file);

        clearInterval(progressInterval);

        // Update status to success
        setPreviews(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'success', progress: 100 };
          return updated;
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        setPreviews(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'error', error: errorMessage };
          return updated;
        });
      }
    }

    setIsUploading(false);

    // Clear successful uploads after delay
    setTimeout(() => {
      setPreviews(prev => prev.filter(p => p.status !== 'success'));
      if (onUploadComplete) onUploadComplete();
    }, 2000);
  };

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => URL.revokeObjectURL(preview.preview));
    };
  }, []);

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
            isUploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />

          {isDragActive ? (
            <p className="text-lg font-medium text-primary">
              {t('stock.photos.drop_here', 'Drop photos here...')}
            </p>
          ) : (
            <div>
              <p className="text-lg font-medium mb-2">
                {t('stock.photos.drag_drop', 'Drag & drop photos here')}
              </p>
              <p className="text-sm text-muted-foreground mb-2">
                {t('stock.photos.or_click', 'or click to browse')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('stock.photos.accepted_formats', 'JPG, PNG, WebP up to 5MB')}
              </p>
            </div>
          )}
        </div>

        {/* Preview Grid */}
        {previews.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {previews.length} {t('stock.photos.photos_selected', 'photos selected')}
              </p>
              <Button
                onClick={uploadAllPhotos}
                disabled={isUploading || previews.every(p => p.status !== 'pending')}
                size="sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? t('stock.photos.uploading', 'Uploading...') : t('stock.photos.upload_all', 'Upload All')}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted border-2 border-border">
                    <img
                      src={preview.preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Status Overlay */}
                    {preview.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center w-full px-4">
                          <Progress value={preview.progress} className="w-full mb-2" />
                          <p className="text-white text-xs">{preview.progress}%</p>
                        </div>
                      </div>
                    )}

                    {preview.status === 'success' && (
                      <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                      </div>
                    )}

                    {preview.status === 'error' && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-2">
                        <p className="text-white text-xs text-center">{preview.error}</p>
                      </div>
                    )}

                    {/* Remove button */}
                    {preview.status === 'pending' && (
                      <button
                        onClick={() => removePreview(index)}
                        className="absolute top-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* File info */}
                  <div className="mt-1 text-xs text-muted-foreground truncate">
                    {preview.file.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(preview.file.size / 1024).toFixed(0)} KB
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {previews.length === 0 && (
          <div className="text-center py-4">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {t('stock.photos.no_photos_selected', 'No photos selected yet')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
