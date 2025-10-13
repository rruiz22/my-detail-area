import React, { useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImagePreviewModalProps {
  imageUrl: string | null;
  imageName?: string;
  open: boolean;
  onClose: () => void;
  onDownload?: () => void;
  // Gallery support
  images?: Array<{ url: string; name: string }>;
  currentIndex?: number;
  onNavigate?: (direction: 'prev' | 'next') => void;
}

export function ImagePreviewModal({
  imageUrl,
  imageName = 'Image',
  open,
  onClose,
  onDownload,
  images,
  currentIndex,
  onNavigate
}: ImagePreviewModalProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);

  // Reset zoom and rotation when image changes
  useEffect(() => {
    if (open) {
      setZoom(100);
      setRotation(0);
    }
  }, [imageUrl, open]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (onNavigate && images && currentIndex !== undefined && currentIndex > 0) {
            onNavigate('prev');
          }
          break;
        case 'ArrowRight':
          if (onNavigate && images && currentIndex !== undefined && currentIndex < images.length - 1) {
            onNavigate('next');
          }
          break;
        case '+':
        case '=':
          setZoom(prev => Math.min(prev + 10, 200));
          break;
        case '-':
        case '_':
          setZoom(prev => Math.max(prev - 10, 50));
          break;
        case 'r':
        case 'R':
          setRotation(prev => (prev + 90) % 360);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, onNavigate, images, currentIndex]);

  if (!imageUrl) return null;

  const hasGallery = images && images.length > 1;
  const canGoPrev = hasGallery && currentIndex !== undefined && currentIndex > 0;
  const canGoNext = hasGallery && currentIndex !== undefined && currentIndex < images.length - 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0">
        <DialogTitle className="sr-only">{imageName}</DialogTitle>
        <DialogDescription className="sr-only">
          Image preview with zoom and rotation controls
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{imageName}</h3>
            {hasGallery && currentIndex !== undefined && (
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} / {images.length}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(prev => Math.max(prev - 10, 50))}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <span className="text-xs text-muted-foreground min-w-[3rem] text-center">
              {zoom}%
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setZoom(prev => Math.min(prev + 10, 200))}
              disabled={zoom >= 200}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setRotation(prev => (prev + 90) % 360)}
            >
              <RotateCw className="h-4 w-4" />
            </Button>

            {onDownload && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image Container */}
        <div className="flex-1 relative bg-gray-100 overflow-hidden">
          {/* Gallery Navigation */}
          {hasGallery && (
            <>
              {canGoPrev && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur"
                  onClick={() => onNavigate?.('prev')}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}

              {canGoNext && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur"
                  onClick={() => onNavigate?.('next')}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </>
          )}

          {/* Image */}
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={imageUrl}
              alt={imageName}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`
              }}
            />
          </div>
        </div>

        {/* Footer - Keyboard hints */}
        <div className="p-2 border-t bg-muted/30 text-xs text-muted-foreground text-center">
          <span className="hidden sm:inline">
            ESC: Close • ←/→: Navigate • +/-: Zoom • R: Rotate
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
