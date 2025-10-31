/**
 * DeliveryStatusBadge Component
 * Visual indicator for notification delivery status
 * Notion-style design with muted colors
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  MousePointerClick,
  Eye,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { DeliveryStatus, DeliveryChannel } from '@/types/notification-delivery';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
  channel: DeliveryChannel;
  latencyMs?: number;
  className?: string;
  showLatency?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Get Notion-style color for delivery status
 */
function getStatusColor(status: DeliveryStatus): string {
  const colors: Record<DeliveryStatus, string> = {
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
    sent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    clicked: 'bg-purple-50 text-purple-700 border-purple-200',
    read: 'bg-gray-50 text-gray-600 border-gray-200',
  };

  return colors[status] || colors.pending;
}

/**
 * Get icon for delivery status
 */
function getStatusIcon(status: DeliveryStatus): React.ReactNode {
  const iconClass = 'h-3 w-3';

  const icons: Record<DeliveryStatus, React.ReactNode> = {
    pending: <Loader2 className={cn(iconClass, 'animate-spin')} />,
    sent: <Send className={iconClass} />,
    delivered: <CheckCircle2 className={iconClass} />,
    failed: <XCircle className={iconClass} />,
    clicked: <MousePointerClick className={iconClass} />,
    read: <Eye className={iconClass} />,
  };

  return icons[status] || icons.pending;
}

/**
 * DeliveryStatusBadge - Display notification delivery status
 */
export function DeliveryStatusBadge({
  status,
  channel,
  latencyMs,
  className,
  showLatency = false,
  size = 'sm',
}: DeliveryStatusBadgeProps) {
  const { t } = useTranslation();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 font-medium border',
        getStatusColor(status),
        sizeClasses[size],
        className
      )}
    >
      {getStatusIcon(status)}
      <span>{t(`notifications.delivery.status.${status}`)}</span>
      {showLatency && latencyMs !== undefined && latencyMs > 0 && (
        <>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500 text-[10px]">{latencyMs}ms</span>
        </>
      )}
    </Badge>
  );
}

/**
 * ChannelBadge - Display delivery channel
 */
interface ChannelBadgeProps {
  channel: DeliveryChannel;
  className?: string;
}

export function ChannelBadge({ channel, className }: ChannelBadgeProps) {
  const { t } = useTranslation();

  const channelColors: Record<DeliveryChannel, string> = {
    push: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    email: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    in_app: 'bg-gray-100 text-gray-700 border-gray-200',
    sms: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium border',
        channelColors[channel],
        className
      )}
    >
      {t(`notifications.channels.${channel}`)}
    </Badge>
  );
}
