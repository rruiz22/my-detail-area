import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useStockPhotosForVehicle } from '@/hooks/useStockPhotosForVehicle';
import { cn } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { ChevronLeft, ChevronRight, Download, Loader2, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StockImageLightboxProps {
  vehicleVin: string;           // Changed: Now receives VIN instead of imageUrl
  vehicleInfo: string;          // e.g., "2024 Toyota Camry - A1234"
  dealerId: number;             // New: Dealer ID for photo lookup
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockImageLightbox({
  vehicleVin,
  vehicleInfo,
  dealerId,
  open,
  onOpenChange
}: StockImageLightboxProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Fetch photos from Stock by VIN
  const { data: photos = [], isLoading } = useStockPhotosForVehicle({
    vin: vehicleVin,
    dealerId
  });

  // Determine current image (photo or placeholder)
  const currentImage = photos.length > 0
    ? photos[currentPhotoIndex].photo_url
    : '/images/vehicle-placeholder.png';

  const hasMultiplePhotos = photos.length > 1;

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setZoom(1);
      setIsFullscreen(false);
      setCurrentPhotoIndex(0); // Reset to first photo
    }
  }, [open]);

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  // Navigation functions
  const goToNext = () => {
    if (hasMultiplePhotos) {
      setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
      setZoom(1); // Reset zoom when changing photos
    }
  };

  const goToPrevious = () => {
    if (hasMultiplePhotos) {
      setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
      setZoom(1); // Reset zoom when changing photos
    }
  };

  // Keyboard controls
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'Escape':
          onOpenChange(false);
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case '0':
          resetZoom();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, onOpenChange, currentPhotoIndex, photos.length]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = `${vehicleInfo}_${currentPhotoIndex + 1}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 border-0 bg-black/95',
          isFullscreen
            ? 'max-w-none w-screen h-screen rounded-none'
            : 'max-w-6xl w-[90vw] h-[85vh] rounded-lg'
        )}
      >
        {/* Hidden title for accessibility */}
        <VisuallyHidden>
          <DialogTitle>{vehicleInfo}</DialogTitle>
        </VisuallyHidden>

        {/* Header Controls */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-medium">{vehicleInfo}</h3>
                {photos.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {currentPhotoIndex + 1} / {photos.length}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-300">
                {photos.length > 0 ? t('stock.image_from_inventory') : t('stock.no_photos_available', 'No photos available')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomOut}
                disabled={zoom <= 0.5}
                className="text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={zoomIn}
                disabled={zoom >= 3}
                className="text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>

              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
                title={t('common.download')}
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Fullscreen */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
                title="Close (ESC)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Arrows - Only show if multiple photos */}
        {hasMultiplePhotos && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/20 h-12 w-12"
              title={t('common.previous', 'Previous')}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-40 text-white hover:bg-white/20 h-12 w-12"
              title={t('common.next', 'Next')}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </>
        )}

        {/* Image Display */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-white" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-16">
              <img
                src={currentImage}
                alt={vehicleInfo}
                className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-pointer"
                style={{ transform: `scale(${zoom})` }}
                onClick={resetZoom}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== window.location.origin + '/images/vehicle-placeholder.png') {
                    target.src = '/images/vehicle-placeholder.png';
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Thumbnails - Only show if multiple photos */}
        {hasMultiplePhotos && (
          <div className="absolute bottom-16 left-0 right-0 z-50 px-4">
            <div className="bg-black/80 rounded-lg p-2 mx-auto max-w-4xl">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    onClick={() => {
                      setCurrentPhotoIndex(index);
                      setZoom(1);
                    }}
                    className={cn(
                      "flex-shrink-0 w-20 h-16 rounded overflow-hidden border-2 transition-all",
                      index === currentPhotoIndex
                        ? "border-primary ring-2 ring-primary/50"
                        : "border-transparent opacity-60 hover:opacity-100 hover:border-white/30"
                    )}
                  >
                    <img
                      src={photo.photo_url}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/vehicle-placeholder.png';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer - Keyboard Shortcuts */}
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent p-4">
          <div className="text-xs text-gray-300 text-center space-y-1">
            <div>
              {hasMultiplePhotos && '← → Navigate | '}
              +/- Zoom | 0 Reset | F Fullscreen | ESC Close
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
