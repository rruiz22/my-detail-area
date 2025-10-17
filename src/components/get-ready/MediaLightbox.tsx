import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useToast } from '@/hooks/use-toast';
import { useUpdateMedia } from '@/hooks/useVehicleMedia';
import type { VehicleMedia } from '@/hooks/useVehicleMedia';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Maximize2,
  Minimize2,
  Pen,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImageAnnotator, type Annotation } from './ImageAnnotator';

interface MediaLightboxProps {
  media: VehicleMedia[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MediaLightbox({
  media,
  initialIndex,
  open,
  onOpenChange,
}: MediaLightboxProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateMedia = useUpdateMedia();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [annotationMode, setAnnotationMode] = useState(false);

  const currentMedia = media[currentIndex];
  const isPhoto = currentMedia?.media_type === 'photo';
  const isVideo = currentMedia?.media_type === 'video';

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setIsFullscreen(false);
      setAnnotationMode(false);
    }
  }, [open, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onOpenChange(false);
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case '+':
        case '=':
          if (isPhoto) zoomIn();
          break;
        case '-':
        case '_':
          if (isPhoto) zoomOut();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, currentIndex, zoom, isPhoto]);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
    setZoom(1); // Reset zoom on navigate
    setAnnotationMode(false); // Exit annotation mode
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
    setZoom(1); // Reset zoom on navigate
    setAnnotationMode(false); // Exit annotation mode
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setZoom(1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = currentMedia.file_url || '';
    link.download = currentMedia.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAnnotations = async (annotations: Annotation[]) => {
    try {
      await updateMedia.mutateAsync({
        id: currentMedia.id,
        vehicleId: currentMedia.vehicle_id,
        annotations,
      });

      toast({
        title: t('get_ready.media.annotations.saved'),
        description: t('get_ready.media.annotations.saved_success'),
      });

      setAnnotationMode(false);
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('get_ready.media.annotations.save_error'),
        variant: 'destructive',
      });
    }
  };

  if (!currentMedia) return null;

  // Ensure annotations is an array
  const safeAnnotations = Array.isArray(currentMedia.annotations)
    ? currentMedia.annotations
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'p-0 gap-0 border-0 bg-black/95',
          isFullscreen
            ? 'max-w-none w-screen h-screen rounded-none'
            : 'max-w-7xl w-[95vw] h-[90vh] rounded-lg'
        )}
      >
        {/* Hidden title and description for accessibility */}
        <VisuallyHidden>
          <DialogTitle>{currentMedia.file_name}</DialogTitle>
          <DialogDescription>Media viewer</DialogDescription>
        </VisuallyHidden>
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between text-white">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{currentMedia.file_name}</h3>
              <p className="text-xs text-gray-300">
                {currentIndex + 1} / {media.length}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Annotate button (photos only) */}
              {isPhoto && !annotationMode && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAnnotationMode(true)}
                  className="text-white hover:bg-white/20"
                >
                  <Pen className="h-4 w-4" />
                </Button>
              )}

              {/* Zoom controls (photos only, not in annotation mode) */}
              {isPhoto && !annotationMode && (
                <>
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
                </>
              )}

              {/* Download */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-4 w-4" />
              </Button>

              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>

              {/* Close */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {annotationMode && isPhoto ? (
          /* Annotation Mode */
          <ImageAnnotator
            imageUrl={currentMedia.file_url || ''}
            annotations={safeAnnotations as Annotation[]}
            onSave={handleSaveAnnotations}
            onCancel={() => setAnnotationMode(false)}
          />
        ) : (
          /* Normal View Mode */
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Previous Button */}
            {media.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevious}
                className="absolute left-4 z-40 text-white bg-black/50 hover:bg-black/70 rounded-full h-12 w-12"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}

            {/* Media Display */}
            <div className="w-full h-full flex items-center justify-center p-16">
              {isPhoto ? (
                <img
                  src={currentMedia.file_url}
                  alt={currentMedia.file_name}
                  className="max-w-full max-h-full object-contain transition-transform duration-200"
                  style={{ transform: `scale(${zoom})` }}
                  onClick={resetZoom}
                />
              ) : isVideo ? (
                <video
                  src={currentMedia.file_url}
                  controls
                  className="max-w-full max-h-full"
                  autoPlay
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="text-center text-white">
                  <p className="mb-4">{t('get_ready.media.document_preview_not_available')}</p>
                  <Button onClick={handleDownload} variant="secondary">
                    <Download className="h-4 w-4 mr-2" />
                    {t('get_ready.media.download')}
                  </Button>
                </div>
              )}
            </div>

            {/* Next Button */}
            {media.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={goToNext}
                className="absolute right-4 z-40 text-white bg-black/50 hover:bg-black/70 rounded-full h-12 w-12"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            )}
          </div>
        )}

        {/* Footer Info */}
        {!annotationMode && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent p-4">
            <div className="flex items-end justify-between">
              {/* Left: Media Info */}
              <div className="text-white text-sm space-y-1">
                {currentMedia.category && (
                  <p>
                    <span className="text-gray-400">{t('get_ready.media.category')}:</span>{' '}
                    {t(`get_ready.media.categories.${currentMedia.category}`)}
                  </p>
                )}
                {currentMedia.metadata?.width && currentMedia.metadata?.height && (
                  <p className="text-xs text-gray-400">
                    {currentMedia.metadata.width} × {currentMedia.metadata.height} px
                  </p>
                )}
              </div>

              {/* Right: Keyboard Shortcuts Hint */}
              <div className="text-xs text-gray-400 text-right">
                <div>← → {t('get_ready.media.lightbox.navigate')}</div>
                <div>ESC {t('get_ready.media.lightbox.close')} | F {t('get_ready.media.lightbox.fullscreen')}</div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
