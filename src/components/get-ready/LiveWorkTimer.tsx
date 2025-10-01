import React from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, StopCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useRealTimeElapsed } from '@/hooks/useRealTimeDaysInStep';

interface LiveWorkTimerProps {
  /** ISO timestamp of when work started */
  startTime: string;
  /** Callback when user clicks stop button */
  onStop?: (elapsedHours: number) => void;
  /** Show stop button */
  showStopButton?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

/**
 * LiveWorkTimer - Real-time countdown timer for active work items
 * Updates every second to show elapsed time since work started
 */
export function LiveWorkTimer({
  startTime,
  onStop,
  showStopButton = false,
  size = 'md',
  className,
}: LiveWorkTimerProps) {
  const { t } = useTranslation();
  const { formatted, totalHours, hours } = useRealTimeElapsed(startTime);

  // Visual indicator based on elapsed time
  const getStatusColor = () => {
    if (hours < 2) return 'bg-green-100 text-green-800 border-green-200';
    if (hours < 4) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (hours < 8) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Size variants
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        variant="outline"
        className={cn('font-mono tabular-nums', getStatusColor(), sizeClasses[size])}
      >
        <Clock className={cn('mr-1', iconSize[size])} />
        {formatted}
      </Badge>

      {showStopButton && onStop && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onStop(totalHours)}
          className="h-auto py-1 px-2"
          title={t('get_ready.work_items.stop_timer')}
        >
          <StopCircle className="h-4 w-4 text-red-600" />
        </Button>
      )}
    </div>
  );
}

/**
 * Compact version for inline display
 */
export function LiveWorkTimerCompact({ startTime, className }: { startTime: string; className?: string }) {
  const { formatted } = useRealTimeElapsed(startTime);

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground', className)}>
      <Clock className="h-3 w-3" />
      <span className="font-mono tabular-nums">{formatted}</span>
    </span>
  );
}
