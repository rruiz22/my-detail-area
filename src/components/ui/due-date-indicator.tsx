import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { 
  calculateTimeStatus, 
  formatCountdown, 
  TimeStatusInfo,
  type AttentionLevel 
} from '@/utils/dueDateUtils';

interface DueDateIndicatorProps {
  dueDate: string | null;
  orderType?: string;
  compact?: boolean;
  className?: string;
}

export function DueDateIndicator({ 
  dueDate, 
  orderType = 'sales',
  compact = false,
  className 
}: DueDateIndicatorProps) {
  const { t } = useTranslation();
  const [timeStatus, setTimeStatus] = useState<TimeStatusInfo | null>(null);

  // Update time status every minute for real-time countdown
  useEffect(() => {
    const updateTimeStatus = () => {
      if (!dueDate) {
        setTimeStatus(null);
        return;
      }
      
      const status = calculateTimeStatus(dueDate);
      setTimeStatus(status);
    };

    updateTimeStatus();
    
    // Update every 60 seconds for live countdown
    const interval = setInterval(updateTimeStatus, 60000);
    
    return () => clearInterval(interval);
  }, [dueDate]);

  // Don't render if no due date or no time status
  if (!timeStatus || timeStatus.status === 'no-due-date') {
    return null;
  }

  const getIcon = (status: string) => {
    switch (status) {
      case 'on-time':
        return <CheckCircle className="w-3 h-3" />;
      case 'need-attention':
        return <Clock className="w-3 h-3" />;
      case 'delayed':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'on-time':
        return 'default';
      case 'need-attention':
        return 'secondary';
      case 'delayed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        <div className={cn("flex items-center gap-1", timeStatus.color)}>
          {getIcon(timeStatus.status)}
          <span className="text-xs font-medium">
            {formatCountdown(timeStatus.timeRemaining)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Status Badge */}
      <Badge 
        variant={getBadgeVariant(timeStatus.status)}
        className={cn(
          "text-xs font-medium h-5 px-2",
          timeStatus.bgColor,
          timeStatus.color,
          "border border-current/20"
        )}
      >
        <div className="flex items-center gap-1">
          {getIcon(timeStatus.status)}
          <span>{timeStatus.badge}</span>
        </div>
      </Badge>
      
      {/* Time Countdown */}
      <div className={cn(
        "flex items-center gap-1 text-xs font-mono",
        timeStatus.color
      )}>
        <Clock className="w-3 h-3" />
        <span>{timeStatus.formattedTime}</span>
      </div>
    </div>
  );
}

/**
 * Hook to get attention level for row styling
 */
export function useDueDateAttention(dueDate: string | null): AttentionLevel {
  const [attentionLevel, setAttentionLevel] = useState<AttentionLevel>('none');

  useEffect(() => {
    if (!dueDate) {
      setAttentionLevel('none');
      return;
    }

    const updateAttention = () => {
      const status = calculateTimeStatus(dueDate);
      setAttentionLevel(status.attentionLevel);
    };

    updateAttention();
    
    // Update every minute
    const interval = setInterval(updateAttention, 60000);
    return () => clearInterval(interval);
  }, [dueDate]);

  return attentionLevel;
}