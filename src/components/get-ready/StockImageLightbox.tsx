import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { cn } from '@/lib/utils';
import { Download, Maximize2, Minimize2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface StockImageLightboxProps {
  imageUrl: string;
  vehicleInfo: string; // e.g., "2024 Toyota Camry - A1234"
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StockImageLightbox({
  imageUrl,
  vehicleInfo,
  open,
  onOpenChange
}: StockImageLightboxProps) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Reset when modal opens/closes
  useEffect(() => {
    if (open) {
      setZoom(1);
      setIsFullscreen(false);
    }
  }, [open]);

  // Keyboard controls
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
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
  }, [open, zoom]);

  const zoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const resetZoom = () => setZoom(1);
  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `${vehicleInfo}.jpg`;
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
              <h3 className="font-medium">{vehicleInfo}</h3>
              <p className="text-xs text-gray-300">{t('stock.image_from_inventory')}</p>
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

        {/* Image Display */}
        <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
          <div className="w-full h-full flex items-center justify-center p-16">
            <img
              src={imageUrl}
              alt={vehicleInfo}
              className="max-w-full max-h-full object-contain transition-transform duration-200 cursor-pointer"
              style={{ transform: `scale(${zoom})` }}
              onClick={resetZoom}
            />
          </div>
        </div>

        {/* Footer - Keyboard Shortcuts */}
        <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/90 to-transparent p-4">
          <div className="text-xs text-gray-300 text-center space-y-1">
            <div>+/- Zoom | 0 Reset | F Fullscreen | ESC Close</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
