/**
 * NotificationItem Component
 * Enhanced notification item with delivery tracking
 * Enterprise-grade with expandable details
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Check,
  MoreVertical,
  X,
  Package,
  MessageSquare,
  Phone,
  AlertCircle,
  Clock,
  Archive,
  Star,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';
import { DeliveryDetails } from './DeliveryDetails';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';
import type { SmartNotification } from '@/hooks/useSmartNotifications';

interface NotificationItemProps {
  notification: SmartNotification;
  showEntity?: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

/**
 * Get icon for notification type
 */
function getNotificationIcon(type: string) {
  switch (type) {
    case 'sms':
      return <Phone className="h-4 w-4" />;
    case 'in_app':
      return <MessageSquare className="h-4 w-4" />;
    case 'order':
      return <Package className="h-4 w-4" />;
    case 'urgent':
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
}

/**
 * Get priority color (Notion-style)
 */
function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'border-red-300 bg-red-50/30';
    case 'high':
      return 'border-amber-300 bg-amber-50/30';
    case 'normal':
      return 'border-gray-200 bg-white';
    case 'low':
      return 'border-gray-200 bg-gray-50/50';
    default:
      return 'border-gray-200 bg-white';
  }
}

/**
 * NotificationItem - Enhanced with delivery tracking
 */
export function NotificationItem({
  notification,
  showEntity = false,
  onMarkAsRead,
  onDelete,
  className,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Track delivery status
  const { status: deliveryStatus, metadata: deliveryMetadata, loading: trackingLoading } =
    useDeliveryTracking(notification.id);

  const isRead = notification.status === 'read';

  return (
    <div
      className={cn(
        'border-l-4 transition-all',
        getPriorityColor(notification.priority as string),
        isRead && 'opacity-60',
        className
      )}
    >
      {/* Main Content */}
      <div className="flex items-start gap-3 p-4 hover:bg-muted/50">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-full',
            isRead ? 'bg-muted' : 'bg-primary/10'
          )}
        >
          {getNotificationIcon(notification.notification_type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1">
              <h4 className="font-medium text-sm leading-tight">
                {notification.title}
              </h4>
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isRead && (
                  <DropdownMenuItem onClick={() => onMarkAsRead(notification.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    {t('notifications.actions.mark_read')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(notification.id)}>
                  <X className="h-4 w-4 mr-2" />
                  {t('notifications.actions.delete')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Star className="h-4 w-4 mr-2" />
                  {t('notifications.actions.save_later')}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="h-4 w-4 mr-2" />
                  {t('notifications.actions.archive')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Message */}
          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>

          {/* Entity Badge */}
          {showEntity && notification.entity_type && (
            <Badge variant="outline" className="mb-2 text-xs">
              {notification.entity_type}: {notification.entity_id?.slice(0, 8)}
            </Badge>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Left side: Timestamp */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </div>

            {/* Right side: Badges and Expand */}
            <div className="flex items-center gap-2">
              {/* Priority Badge */}
              <Badge
                variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {notification.priority}
              </Badge>

              {/* Delivery Status Badge */}
              {deliveryStatus && !trackingLoading && (
                <DeliveryStatusBadge
                  status={deliveryStatus}
                  channel={notification.channel}
                  latencyMs={deliveryMetadata?.latency_ms}
                  showLatency={false}
                  size="sm"
                />
              )}

              {/* Expand Button */}
              {deliveryStatus && deliveryMetadata && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="h-6 px-2 text-xs"
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      {t('notifications.delivery.hide_details')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      {t('notifications.delivery.view_details')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Delivery Details */}
      {expanded && deliveryStatus && deliveryMetadata && (
        <div className="px-4 pb-4">
          <DeliveryDetails
            notificationId={notification.id}
            status={deliveryStatus}
            metadata={deliveryMetadata}
          />
        </div>
      )}
    </div>
  );
}
