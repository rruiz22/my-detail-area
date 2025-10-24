import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { useVehiclePhotos } from '@/hooks/useVehiclePhotos';
import { cn } from '@/lib/utils';
import { Award, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleHeaderProps {
  vehicle: VehicleInventory;
}

export const VehicleHeader: React.FC<VehicleHeaderProps> = ({ vehicle }) => {
  const { t } = useTranslation();
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch vehicle photos
  const { photos } = useVehiclePhotos({
    vehicleId: vehicle.id,
    dealerId: vehicle.dealer_id
  });

  // Check if vehicle has a valid photo URL from CSV
  const hasValidPhoto = vehicle.key_photo_url &&
    vehicle.key_photo_url.trim() !== '' &&
    vehicle.key_photo_url !== '""' &&
    vehicle.key_photo_url.startsWith('http');

  // Combine photos: photos from DB first, then fallback to key_photo_url
  const allPhotos = React.useMemo(() => {
    const photosList: Array<{ url: string; isKey: boolean; category?: string; id?: string }> = [];

    if (photos.length > 0) {
      photos.forEach(photo => {
        photosList.push({
          url: photo.photo_url,
          isKey: photo.is_key_photo,
          category: photo.category,
          id: photo.id
        });
      });
    } else if (hasValidPhoto) {
      photosList.push({
        url: vehicle.key_photo_url,
        isKey: true,
        category: 'exterior'
      });
    }

    if (photosList.length === 0) {
      photosList.push({
        url: '/images/vehicle-placeholder.png',
        isKey: false
      });
    }

    return photosList;
  }, [photos, vehicle.key_photo_url, hasValidPhoto]);

  const nextPhoto = () => {
    setSelectedIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const prevPhoto = () => {
    setSelectedIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'exterior': return 'E';
      case 'interior': return 'I';
      case 'engine': return 'En';
      case 'other': return 'O';
      default: return '';
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Photo Gallery - Main + Thumbnails */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,140px] gap-4 p-4 bg-gradient-to-b from-gray-50 to-gray-100">
        {/* Main Photo */}
        <div className="relative h-[400px] lg:h-[500px] bg-white rounded-lg overflow-hidden shadow-lg">
          <img
            src={allPhotos[selectedIndex].url}
            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
            className="w-full h-full object-contain"
          />

          {/* Navigation Arrows */}
          {allPhotos.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                onClick={prevPhoto}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full shadow-lg"
                onClick={nextPhoto}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          {/* Photo Counter & Key Badge */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            {allPhotos.length > 1 && (
              <Badge variant="secondary" className="bg-black/70 text-white backdrop-blur-sm">
                {selectedIndex + 1} / {allPhotos.length}
              </Badge>
            )}
            {allPhotos[selectedIndex].isKey && (
              <Badge className="bg-primary shadow-md">
                {t('stock.vehicleDetails.keyPhoto', 'Key Photo')}
              </Badge>
            )}
          </div>
        </div>

        {/* Thumbnails Grid - Vertical en desktop */}
        <div className="lg:block hidden">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-2">
              {allPhotos.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "relative w-full aspect-square rounded-lg overflow-hidden transition-all border-2",
                    index === selectedIndex
                      ? "border-primary ring-2 ring-primary/50 shadow-lg scale-105"
                      : "border-transparent hover:border-primary/30 opacity-70 hover:opacity-100"
                  )}
                >
                  <img
                    src={photo.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />

                  {/* Category Badge */}
                  {photo.category && (
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-[10px] px-1 rounded">
                      {getCategoryLabel(photo.category)}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Thumbnails Grid - Mobile (horizontal) */}
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {allPhotos.map((photo, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden transition-all border-2",
                  index === selectedIndex
                    ? "border-primary ring-2 ring-primary/50"
                    : "border-transparent hover:border-primary/30 opacity-70"
                )}
              >
                <img
                  src={photo.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {photo.category && (
                  <div className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[8px] px-1 rounded">
                    {getCategoryLabel(photo.category)}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicle Information Below Photos */}
      <div className="p-6 space-y-4 border-t">
        {/* Title */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
            {vehicle.trim && <span className="font-normal text-muted-foreground"> ({vehicle.trim})</span>}
          </h1>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-2">
          {vehicle.photo_count && vehicle.photo_count > 0 && (
            <Badge variant="secondary">
              {vehicle.photo_count} {t('stock.vehicleDetails.photos')}
            </Badge>
          )}
          {vehicle.objective && (
            <Badge className={
              vehicle.objective.toLowerCase() === 'retail'
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }>
              {vehicle.objective}
            </Badge>
          )}
          {vehicle.age_days && (
            <Badge className="bg-orange-500 text-white hover:bg-orange-600">
              {vehicle.age_days}d
            </Badge>
          )}
          {vehicle.is_certified && (
            <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">
              <Award className="w-3 h-3 mr-1" />
              {t('stock.vehicleDetails.certified')}
            </Badge>
          )}
        </div>

        {/* Stock & VIN */}
        <div className="flex flex-wrap gap-6 pt-4 border-t">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{t('stock.vehicleDetails.stockNumber')}</span>
            <span className="font-mono font-semibold text-lg">{vehicle.stock_number}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{t('stock.vehicleDetails.vin')}</span>
            <span className="font-mono font-semibold text-sm lg:text-base">{vehicle.vin}</span>
          </div>
          {vehicle.dms_status && (
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">{t('stock.vehicleDetails.status')}</span>
              <Badge variant="outline" className={
                vehicle.dms_status.toLowerCase() === 'available'
                  ? 'border-green-500 text-green-700 w-fit'
                  : vehicle.dms_status.toLowerCase() === 'sold'
                  ? 'border-red-500 text-red-700 w-fit'
                  : 'border-blue-500 text-blue-700 w-fit'
              }>
                {vehicle.dms_status}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
