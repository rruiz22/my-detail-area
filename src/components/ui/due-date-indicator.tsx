import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
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
  orderStatus?: string;
  orderType?: string;
  compact?: boolean;
  showDateTime?: boolean;
  className?: string;
}

export function DueDateIndicator({
  dueDate,
  orderStatus,
  orderType = 'sales',
  compact = false,
  showDateTime = false,
  className
}: DueDateIndicatorProps) {
  const { t } = useTranslation();
  const [timeStatus, setTimeStatus] = useState<TimeStatusInfo | null>(null);

  // Update time status every minute for real-time countdown
  useEffect(() => {
    const updateTimeStatus = () => {
      const status = calculateTimeStatus(dueDate, orderStatus);
      setTimeStatus(status);
    };

    updateTimeStatus();
    
    // Update every 60 seconds for live countdown
    const interval = setInterval(updateTimeStatus, 60000);

    return () => clearInterval(interval);
  }, [dueDate, orderStatus]);

  // Don't render if no time status, but do render for completed/cancelled
  if (!timeStatus || (timeStatus.status === 'no-due-date' && !timeStatus.badge)) {
    return null;
  }

  const getIcon = (status: string, orderStatus?: string) => {
    // Special icons for finalized orders
    if (orderStatus === 'completed') {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (orderStatus === 'cancelled') {
      return null; // No icon for cancelled orders
    }

    // Normal icons for active orders
    switch (status) {
      case 'on-time':
        return <CheckCircle className="w-4 h-4" />;
      case 'need-attention':
        return <Clock className="w-4 h-4" />;
      case 'delayed':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
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
          {getIcon(timeStatus.status, orderStatus)}
          <span className="text-sm font-semibold whitespace-nowrap">
            {timeStatus.formattedTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
      {/* Status Badge - Primera fila */}
      <Badge
        variant={getBadgeVariant(timeStatus.status)}
        className={cn(
          "text-xs font-medium h-5 px-2 whitespace-nowrap",
          timeStatus.bgColor,
          timeStatus.color,
          "border border-current/20"
        )}
      >
        <div className="flex items-center gap-1">
          {getIcon(timeStatus.status, orderStatus)}
          <span>{timeStatus.badge}</span>
        </div>
      </Badge>

      {/* Date and Time Display - Segunda fila (más notable) */}
      {showDateTime && dueDate && (
        <div className="text-sm font-semibold text-foreground text-center">
          <Calendar className="w-4 h-4 mr-1 text-gray-700 inline" />
          {new Date(dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
          })}, {new Date(dueDate).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </div>
      )}

      {/* Time Countdown - Tercera fila (Solo para órdenes activas) */}
      {!['completed', 'cancelled'].includes(orderStatus || '') && timeStatus.formattedTime && (
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold justify-center",
          timeStatus.color
        )}>
          <Clock className="w-3.5 h-3.5" />
          <span className="whitespace-nowrap">{timeStatus.formattedTime}</span>
        </div>
      )}
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