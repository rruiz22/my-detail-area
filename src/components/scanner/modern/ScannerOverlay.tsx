import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ScannerOverlayProps {
  isActive: boolean;
  confidence: number;
}

export function ScannerOverlay({ isActive, confidence }: ScannerOverlayProps) {
  const { t } = useTranslation();

  if (!isActive) return null;

  const getOverlayColor = () => {
    if (confidence > 0.8) return 'border-success shadow-glow';
    if (confidence > 0.5) return 'border-warning';
    return 'border-primary';
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Lighter dark overlay with central cutout - improved visibility */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Central scanning area with clearer cutout */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-32 sm:h-40">
        {/* Main scanning frame */}
        <div
          className={cn(
            "w-full h-full border-4 rounded-xl transition-all duration-300",
            "shadow-2xl",
            getOverlayColor()
          )}
          style={{
            boxShadow: confidence > 0.8
              ? '0 0 0 2000px rgba(0,0,0,0.3), 0 0 20px rgba(16, 185, 129, 0.6)'
              : '0 0 0 2000px rgba(0,0,0,0.3)',
          }}
        />

        {/* Instructions */}
        <div className="absolute -bottom-12 sm:-bottom-16 left-1/2 transform -translate-x-1/2 text-center whitespace-nowrap">
          <p className="text-white text-xs sm:text-sm font-medium bg-black/70 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm shadow-lg">
            {confidence > 0.8
              ? t('modern_vin_scanner.ready_to_capture')
              : t('modern_vin_scanner.align_vin_sticker')
            }
          </p>
        </div>
      </div>

      {/* Scanning animation - more visible line */}
      {confidence < 0.8 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-32 sm:h-40">
          <div className="w-full h-full rounded-xl overflow-hidden">
            <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-scan-line shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.8))' }} />
          </div>
        </div>
      )}

      {/* Enhanced corner indicators with better visibility */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-80 sm:w-96 h-32 sm:h-40">
          {/* Top-left corner */}
          <div className="absolute -top-1 -left-1 w-8 h-8 sm:w-10 sm:h-10">
            <div className={cn("absolute top-0 left-0 w-full h-1.5 rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
            <div className={cn("absolute top-0 left-0 w-1.5 h-full rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
          </div>

          {/* Top-right corner */}
          <div className="absolute -top-1 -right-1 w-8 h-8 sm:w-10 sm:h-10">
            <div className={cn("absolute top-0 right-0 w-full h-1.5 rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
            <div className={cn("absolute top-0 right-0 w-1.5 h-full rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
          </div>

          {/* Bottom-left corner */}
          <div className="absolute -bottom-1 -left-1 w-8 h-8 sm:w-10 sm:h-10">
            <div className={cn("absolute bottom-0 left-0 w-1.5 h-full rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
            <div className={cn("absolute bottom-0 left-0 w-full h-1.5 rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
          </div>

          {/* Bottom-right corner */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-10 sm:h-10">
            <div className={cn("absolute bottom-0 right-0 w-1.5 h-full rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
            <div className={cn("absolute bottom-0 right-0 w-full h-1.5 rounded-full transition-colors shadow-lg", getOverlayColor().split(' ')[0])} />
          </div>
        </div>
      </div>
    </div>
  );
}