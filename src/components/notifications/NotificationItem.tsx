/**
 * NotificationItem Component
 * Enhanced notification item with delivery tracking
 * Enterprise-grade with expandable details
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeliveryTracking } from '@/hooks/useDeliveryTracking';
import { cn } from '@/lib/utils';
import type { UnifiedNotification } from '@/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import {
    AlertCircle,
    Archive,
    Bell,
    Check,
    ChevronDown,
    ChevronUp,
    Clock,
    MessageSquare,
    MoreVertical,
    Package,
    Phone,
    Star,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DeliveryDetails } from './DeliveryDetails';
import { DeliveryStatusBadge } from './DeliveryStatusBadge';

interface NotificationItemProps {
  notification: UnifiedNotification;
  showEntity?: boolean;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
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
    case 'critical':
      return 'border-red-300 bg-red-50/30';
    case 'high':
      return 'border-amber-300 bg-amber-50/30';
    case 'normal':
    case 'medium':
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
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: NotificationItemProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  // Track delivery status (only for notification_log)
  const { status: deliveryStatus, metadata: deliveryMetadata, loading: trackingLoading } =
    useDeliveryTracking(notification.source === 'notification_log' ? notification.id : '');

  const isRead = notification.is_read;

  return (
    <div
      className={cn(
        'border-l-4 transition-all',
        getPriorityColor(notification.priority as string),
        // ✅ Mejor contraste visual entre leída y no leída
        isRead ? 'bg-gray-50/50 opacity-75' : 'bg-white',
        isSelected && 'bg-blue-50/50 border-l-blue-500',
        className
      )}
    >
      {/* Main Content */}
      <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        {/* Selection Checkbox */}
        {isSelectionMode && onToggleSelect && (
          <div className="flex-shrink-0 pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(notification.id)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
        )}

        {/* Unread Indicator Dot */}
        {!isRead && !isSelectionMode && (
          <div className="flex-shrink-0 pt-1.5">
            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          </div>
        )}

        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 p-2 rounded-full',
            isRead ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
          )}
        >
          {getNotificationIcon(notification.module || 'default')}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 flex items-center gap-2">
              <h4 className={cn(
                'text-sm leading-tight',
                // ✅ Bold para no leídas, normal para leídas
                isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground'
              )}>
                {notification.title}
              </h4>
              {/* Badge "New" para notificaciones muy recientes no leídas */}
              {!isRead && new Date().getTime() - new Date(notification.created_at).getTime() < 300000 && (
                <Badge variant="default" className="text-xs px-1.5 py-0 h-4">
                  {t('notifications.badge.new')}
                </Badge>
              )}
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
          <p className={cn(
            'text-sm mb-2 leading-relaxed',
            isRead ? 'text-muted-foreground/70' : 'text-muted-foreground'
          )}>
            {notification.message}
          </p>

          {/* Entity Badge */}
          {showEntity && notification.metadata?.entity_type && (
            <Badge variant="outline" className="mb-2 text-xs font-normal">
              {notification.metadata.entity_type as string}: {(notification.metadata.entity_id as string)?.slice(0, 8)}
            </Badge>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 flex-wrap mt-2 pt-2 border-t border-gray-100">
            {/* Left side: Timestamp */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 opacity-60" />
              <span className="font-medium">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
            </div>

            {/* Right side: Badges and Expand */}
            <div className="flex items-center gap-1.5">
              {/* Priority Badge - Solo si no es 'low' */}
              {notification.priority !== 'low' && (
                <Badge
                  variant={notification.priority === 'urgent' || notification.priority === 'critical' ? 'destructive' : 'secondary'}
                  className="text-xs font-medium"
                >
                  {notification.priority}
                </Badge>
              )}

              {/* Delivery Status Badge (only for notification_log) */}
              {notification.source === 'notification_log' && deliveryStatus && !trackingLoading && (
                <DeliveryStatusBadge
                  status={deliveryStatus}
                  channel={(notification.metadata?.channel as string) || 'in_app'}
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
