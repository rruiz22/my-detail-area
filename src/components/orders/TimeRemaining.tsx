import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface TimeRemainingProps {
  order: any;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface TimeInfo {
  text: string;
  color: string;
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
}

export function TimeRemaining({ order, showIcon = true, size = 'md' }: TimeRemainingProps) {
  const [timeInfo, setTimeInfo] = useState<TimeInfo | null>(null);

  useEffect(() => {
    const calculateTimeInfo = () => {
      // Handle completed orders - Only show "Completed" without on-time/late distinction
      if (order?.status === 'completed') {
        setTimeInfo({
          text: 'Completed',
          color: 'text-green-600',
          icon: <CheckCircle className="h-4 w-4" />,
          badge: 'COMPLETED',
          badgeColor: 'bg-green-100 text-green-700 border-green-300'
        });
        return;
      }

      // Handle cancelled orders
      if (order?.status === 'cancelled') {
        setTimeInfo({
          text: 'Order Cancelled',
          color: 'text-gray-600',
          icon: <XCircle className="h-4 w-4" />,
          badge: 'CANCELLED',
          badgeColor: 'bg-gray-100 text-gray-700 border-gray-300'
        });
        return;
      }

      // Handle active orders - existing logic
      if (!order?.due_date) {
        setTimeInfo({
          text: 'No due date set',
          color: 'text-gray-500',
          icon: <Calendar className="h-4 w-4" />,
          badge: 'NO DUE DATE',
          badgeColor: 'bg-gray-100 text-gray-700 border-gray-300'
        });
        return;
      }

      const now = new Date();
      const dueDate = new Date(order.due_date);
      const diffMs = dueDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffMinutes = Math.abs(diffMs / (1000 * 60));

      if (diffMs > 0) {
        // Time remaining
        const hours = Math.floor(diffMinutes / 60);
        const minutes = Math.floor(diffMinutes % 60);

        if (diffHours > 24) {
          const days = Math.floor(diffHours / 24);
          const remainingHours = Math.floor(diffHours % 24);
          setTimeInfo({
            text: `Due in ${days}d ${remainingHours}h`,
            color: 'text-emerald-700',
            icon: <CheckCircle className="h-4 w-4" />,
            badge: 'ON TIME',
            badgeColor: 'bg-emerald-500 text-white border-emerald-600'
          });
        } else if (diffHours > 6) {
          setTimeInfo({
            text: `Due in ${hours}h ${minutes}m`,
            color: 'text-green-700',
            icon: <Clock className="h-4 w-4" />,
            badge: 'ON TIME',
            badgeColor: 'bg-green-500 text-white border-green-600'
          });
        } else if (diffHours > 2) {
          setTimeInfo({
            text: `Due in ${hours}h ${minutes}m`,
            color: 'text-yellow-700',
            icon: <Clock className="h-4 w-4" />,
            badge: 'DUE SOON',
            badgeColor: 'bg-yellow-500 text-white border-yellow-600'
          });
        } else {
          setTimeInfo({
            text: `Due in ${hours}h ${minutes}m`,
            color: 'text-orange-700',
            icon: <AlertTriangle className="h-4 w-4" />,
            badge: 'DUE TODAY',
            badgeColor: 'bg-orange-500 text-white border-orange-600'
          });
        }
      } else {
        // Overdue
        const hours = Math.floor(diffMinutes / 60);
        const minutes = Math.floor(diffMinutes % 60);

        if (Math.abs(diffHours) < 24) {
          setTimeInfo({
            text: `Overdue by ${hours}h ${minutes}m`,
            color: 'text-red-700',
            icon: <AlertTriangle className="h-4 w-4" />,
            badge: 'DELAYED',
            badgeColor: 'bg-red-500 text-white border-red-600'
          });
        } else {
          const days = Math.floor(Math.abs(diffHours) / 24);
          const remainingHours = Math.floor(Math.abs(diffHours) % 24);
          setTimeInfo({
            text: `Overdue by ${days}d ${remainingHours}h`,
            color: 'text-red-800',
            icon: <AlertTriangle className="h-4 w-4" />,
            badge: 'OVERDUE',
            badgeColor: 'bg-red-600 text-white border-red-700'
          });
        }
      }
    };

    calculateTimeInfo();
    // Update every minute for live countdown (only for active orders)
    const shouldUpdateContinuously = !['completed', 'cancelled'].includes(order?.status);

    if (shouldUpdateContinuously) {
      const interval = setInterval(calculateTimeInfo, 60000);
      return () => clearInterval(interval);
    }
  }, [order?.due_date, order?.status, order?.completed_at]);

  if (!timeInfo) return null;

  const textSize = size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm';
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="space-y-2">
      {/* Timing Badge */}
      <div className="flex items-center gap-2">
        <Badge className={`${timeInfo.badgeColor} font-medium`}>
          {showIcon && timeInfo.icon}
          <span className={showIcon ? 'ml-1' : ''}>{timeInfo.badge}</span>
        </Badge>
      </div>

      {/* Precise Time Information */}
      <div className={`flex items-center gap-2 ${timeInfo.color} ${textSize} font-medium`}>
        {showIcon && <Clock className={iconSize} />}
        <span className="whitespace-nowrap">{timeInfo.text}</span>
      </div>
    </div>
  );
}
