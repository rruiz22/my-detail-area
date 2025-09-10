import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VinConfidenceIndicatorProps {
  confidence: number; // 0-1 range
}

export function VinConfidenceIndicator({ confidence }: VinConfidenceIndicatorProps) {
  const { t } = useTranslation();
  
  const percentage = Math.round(confidence * 100);
  
  const getStatusConfig = () => {
    if (confidence >= 0.8) {
      return {
        color: 'text-success',
        bgColor: 'bg-success/10',
        borderColor: 'border-success/20',
        icon: CheckCircle,
        label: t('modern_vin_scanner.confidence.excellent'),
        description: t('modern_vin_scanner.confidence.ready_capture')
      };
    }
    
    if (confidence >= 0.5) {
      return {
        color: 'text-warning',
        bgColor: 'bg-warning/10',
        borderColor: 'border-warning/20',
        icon: AlertCircle,
        label: t('modern_vin_scanner.confidence.good'),
        description: t('modern_vin_scanner.confidence.adjust_position')
      };
    }
    
    return {
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-muted',
      icon: Target,
      label: t('modern_vin_scanner.confidence.detecting'),
      description: t('modern_vin_scanner.confidence.position_vin')
    };
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={cn(
      "flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all duration-300",
      config.bgColor,
      config.borderColor
    )}>
      {/* Status icon */}
      <div className={cn("flex-shrink-0", config.color)}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className={cn("text-sm font-medium", config.color)}>
            {config.label}
          </span>
          <span className={cn("text-sm font-bold", config.color)}>
            {percentage}%
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 ease-out rounded-full",
              confidence >= 0.8 ? 'bg-success' :
              confidence >= 0.5 ? 'bg-warning' : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Description */}
        <p className="text-xs text-muted-foreground mt-1">
          {config.description}
        </p>
      </div>

      {/* Animated pulse for low confidence */}
      {confidence < 0.5 && (
        <div className="absolute inset-0 rounded-lg animate-pulse opacity-20">
          <div className="w-full h-full bg-primary rounded-lg" />
        </div>
      )}
    </div>
  );
}