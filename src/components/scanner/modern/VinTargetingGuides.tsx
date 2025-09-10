import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface VinTargetingGuidesProps {
  isActive: boolean;
  confidence: number;
}

export function VinTargetingGuides({ isActive, confidence }: VinTargetingGuidesProps) {
  const { t } = useTranslation();
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setPulsePhase(prev => (prev + 1) % 4);
    }, 800);

    return () => clearInterval(interval);
  }, [isActive]);

  if (!isActive) return null;

  const getGuideColor = () => {
    if (confidence > 0.8) return 'text-success';
    if (confidence > 0.5) return 'text-warning';
    return 'text-primary';
  };

  const renderCornerGuide = (position: string, rotation: string) => (
    <div 
      className={cn(
        "absolute w-8 h-8 transition-all duration-500",
        position,
        confidence > 0.8 ? 'scale-110' : 'scale-100'
      )}
    >
      <div 
        className={cn(
          "w-full h-full border-2 transition-all duration-300",
          rotation,
          getGuideColor().replace('text-', 'border-'),
          pulsePhase === parseInt(position.split('-')[1]) % 4 && confidence < 0.8 && 'animate-pulse scale-110'
        )}
        style={{
          borderRadius: '50% 0',
          clipPath: 'polygon(0 0, 50% 0, 50% 50%, 0 50%)'
        }}
      />
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Central targeting area */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="relative w-80 h-32">
          {/* Animated corner guides */}
          {renderCornerGuide('-top-4 -left-4', 'rotate-0')}
          {renderCornerGuide('-top-4 -right-4', 'rotate-90')}
          {renderCornerGuide('-bottom-4 -left-4', 'rotate-270')}
          {renderCornerGuide('-bottom-4 -right-4', 'rotate-180')}

          {/* Center crosshair when high confidence */}
          {confidence > 0.8 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className={cn(
                "w-6 h-6 border-2 rounded-full transition-all duration-300 animate-pulse",
                "border-success bg-success/20"
              )}>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-2 h-2 bg-success rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Progress indicators along edges */}
          <div className="absolute inset-0">
            {/* Top edge indicators */}
            <div className="absolute -top-1 left-0 right-0 flex justify-between px-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={`top-${i}`}
                  className={cn(
                    "w-2 h-1 rounded-full transition-all duration-300",
                    confidence > (i + 1) * 0.25 
                      ? 'bg-success' 
                      : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            {/* Bottom edge indicators */}
            <div className="absolute -bottom-1 left-0 right-0 flex justify-between px-8">
              {[0, 1, 2].map((i) => (
                <div
                  key={`bottom-${i}`}
                  className={cn(
                    "w-2 h-1 rounded-full transition-all duration-300",
                    confidence > (i + 1) * 0.25 
                      ? 'bg-success' 
                      : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            {/* Side edge indicators */}
            <div className="absolute -left-1 top-0 bottom-0 flex flex-col justify-between py-4">
              {[0, 1].map((i) => (
                <div
                  key={`left-${i}`}
                  className={cn(
                    "w-1 h-2 rounded-full transition-all duration-300",
                    confidence > (i + 1) * 0.4 
                      ? 'bg-success' 
                      : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>

            <div className="absolute -right-1 top-0 bottom-0 flex flex-col justify-between py-4">
              {[0, 1].map((i) => (
                <div
                  key={`right-${i}`}
                  className={cn(
                    "w-1 h-2 rounded-full transition-all duration-300",
                    confidence > (i + 1) * 0.4 
                      ? 'bg-success' 
                      : 'bg-muted-foreground/30'
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hint text */}
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
          <p className={cn(
            "text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm transition-all duration-300",
            confidence > 0.8 
              ? "text-success bg-success/20" 
              : "text-white bg-black/40"
          )}>
            {confidence > 0.8 
              ? t('modern_vin_scanner.perfect_alignment')
              : t('modern_vin_scanner.adjusting_focus')
            }
          </p>
        </div>
      </div>
    </div>
  );
}