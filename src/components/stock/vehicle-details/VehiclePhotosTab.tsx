import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { useVehiclePhotos } from '@/hooks/useVehiclePhotos';
import { VehiclePhotoUploader } from '@/components/stock/VehiclePhotoUploader';
import { cn } from '@/lib/utils';
import { Camera, Star, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VehiclePhotosTabProps {
  vehicle: VehicleInventory;
  canEdit: boolean;
  canDelete: boolean;
}

export const VehiclePhotosTab: React.FC<VehiclePhotosTabProps> = ({ vehicle, canEdit, canDelete }) => {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // Fetch vehicle photos
  const { photos, setKeyPhoto, deletePhoto } = useVehiclePhotos({
    vehicleId: vehicle.id,
    dealerId: vehicle.dealer_id
  });

  const handlePhotoClick = (index: number) => {
    setSelectedPhotoIndex(index);
    setLightboxOpen(true);
  };

  const handleSetKeyPhoto = async (photoId: string) => {
    try {
      await setKeyPhoto(photoId);
    } catch (error) {
      console.error('Failed to set key photo:', error);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    setPhotoToDelete(photoId);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      await deletePhoto(photoToDelete);
      setPhotoToDelete(null);
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Upload Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">
            {t('stock.vehicleDetails.photos', 'Photos')}
            {photos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {photos.length}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('stock.vehicleDetails.photosDescription', 'Manage vehicle photos')}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Camera className="w-4 h-4 mr-2" />
            {t('stock.vehicleDetails.actions.uploadPhoto', 'Upload Photos')}
          </Button>
        )}
      </div>

      {/* Photo Gallery */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo, index) => (
            <Card
              key={photo.id}
              className="overflow-hidden group relative cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handlePhotoClick(index)}
            >
              <CardContent className="p-0">
                <div className="aspect-square relative bg-muted">
                  <img
                    src={photo.photo_url}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model} - Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== window.location.origin + '/images/vehicle-placeholder.png') {
                        target.src = '/images/vehicle-placeholder.png';
                      }
                    }}
                  />

                  {/* Hover Overlay with Actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {canEdit && !photo.is_key_photo && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetKeyPhoto(photo.id);
                        }}
                      >
                        <Star className="w-4 h-4 mr-1" />
                        {t('stock.vehicleDetails.actions.setKeyPhoto', 'Set Key')}
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePhoto(photo.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Key Photo Badge */}
                  {photo.is_key_photo && (
                    <Badge className="absolute top-2 left-2 bg-primary shadow-md">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      {t('stock.vehicleDetails.keyPhoto', 'Key Photo')}
                    </Badge>
                  )}

                  {/* Display Order */}
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                    #{index + 1}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Camera className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('stock.vehicleDetails.noPhotos', 'No Photos Available')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('stock.vehicleDetails.noPhotosDescription', 'Upload photos to showcase this vehicle')}
            </p>
            {canEdit && (
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Camera className="w-4 h-4 mr-2" />
                {t('stock.vehicleDetails.actions.uploadPhoto', 'Upload Photos')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogTitle>
            {t('stock.photos.upload_title', 'Upload Vehicle Photos')}
          </DialogTitle>
          <DialogDescription>
            {t('stock.photos.upload_description', 'Upload and manage photos for this vehicle. JPG, PNG, WebP up to 5MB.')}
          </DialogDescription>
          <VehiclePhotoUploader
            vehicleId={vehicle.id}
            dealerId={vehicle.dealer_id}
            onUploadComplete={() => {
              setUploadDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Lightbox Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-7xl max-h-[95vh] p-0" aria-describedby="lightbox-description">
          <DialogDescription id="lightbox-description" className="sr-only">
            View vehicle photo in full screen
          </DialogDescription>
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative h-[90vh] bg-black">
            <img
              src={photos[selectedPhotoIndex]?.photo_url || '/images/vehicle-placeholder.png'}
              alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-contain"
            />

            {/* Navigation in lightbox */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3"
                >
                  <span className="text-2xl">←</span>
                </button>
                <button
                  onClick={() => setSelectedPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3"
                >
                  <span className="text-2xl">→</span>
                </button>

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-black/70 text-white">
                    {selectedPhotoIndex + 1} / {photos.length}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - Team Chat Style */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('stock.photos.confirm_delete_title', 'Delete Photo?')}
        description={t('stock.photos.confirm_delete', 'Are you sure you want to delete this photo? This action cannot be undone.')}
        confirmText={t('common.delete', 'Delete')}
        cancelText={t('common.cancel', 'Cancel')}
        onConfirm={confirmDeletePhoto}
        variant="destructive"
      />
    </div>
  );
};
