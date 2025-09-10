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
      {/* Dark overlay with central cutout */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Central scanning area */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div 
          className={cn(
            "w-80 h-32 border-2 rounded-lg transition-all duration-300",
            "bg-background/5 backdrop-blur-sm",
            getOverlayColor()
          )}
          style={{
            boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.6)',
            clipPath: 'polygon(0% 0%, 0% 100%, 40% 100%, 40% 40%, 60% 40%, 60% 100%, 100% 100%, 100% 0%)'
          }}
        />
        
        {/* Instructions */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
          <p className="text-white text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
            {confidence > 0.8 
              ? t('modern_vin_scanner.ready_to_capture')
              : t('modern_vin_scanner.align_vin_sticker')
            }
          </p>
        </div>
      </div>

      {/* Scanning animation */}
      {confidence < 0.8 && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-80 h-32 border-2 border-primary rounded-lg overflow-hidden">
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
          </div>
        </div>
      )}

      {/* Corner indicators */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-80 h-32">
          {/* Top-left corner */}
          <div className="absolute -top-2 -left-2 w-6 h-6">
            <div className={cn("w-full h-1 rounded-full transition-colors", getOverlayColor().split(' ')[0])} />
            <div className={cn("w-1 h-full rounded-full transition-colors", getOverlayColor().split(' ')[0])} />
          </div>
          
          {/* Top-right corner */}
          <div className="absolute -top-2 -right-2 w-6 h-6">
            <div className={cn("w-full h-1 rounded-full transition-colors", getOverlayColor().split(' ')[0])} />
            <div className={cn("w-1 h-full rounded-full ml-auto transition-colors", getOverlayColor().split(' ')[0])} />
          </div>
          
          {/* Bottom-left corner */}
          <div className="absolute -bottom-2 -left-2 w-6 h-6">
            <div className={cn("w-1 h-full rounded-full mt-auto transition-colors", getOverlayColor().split(' ')[0])} />
            <div className={cn("w-full h-1 rounded-full mt-auto transition-colors", getOverlayColor().split(' ')[0])} />
          </div>
          
          {/* Bottom-right corner */}
          <div className="absolute -bottom-2 -right-2 w-6 h-6">
            <div className={cn("w-1 h-full rounded-full ml-auto mt-auto transition-colors", getOverlayColor().split(' ')[0])} />
            <div className={cn("w-full h-1 rounded-full mt-auto transition-colors", getOverlayColor().split(' ')[0])} />
          </div>
        </div>
      </div>
    </div>
  );
}