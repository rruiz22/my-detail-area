import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGetReadyNotifications } from '@/hooks/useGetReadyNotifications';
import { NotificationSettings } from './NotificationSettings';
import type { NotificationType, NotificationPriority } from '@/types/getReady';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  CheckCheck,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  onClose?: () => void;
  className?: string;
}

/**
 * Notification Panel Component
 *
 * Displays a list of notifications with filtering options and actions.
 * Shown in a popover from the NotificationBell component.
 *
 * Features:
 * - List of notifications with details
 * - Filter by type and priority
 * - Mark as read/unread
 * - Dismiss notifications
 * - Mark all as read
 * - Navigate to related entities
 * - Empty state when no notifications
 *
 * @param onClose - Callback when panel should close (e.g., after navigation)
 * @param className - Additional CSS classes
 */
export function NotificationPanel({
  onClose,
  className,
}: NotificationPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<
    NotificationPriority | 'all'
  >('all');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    isMarkingAllAsRead,
  } = useGetReadyNotifications({
    enabled: true,
    type: filterType,
    priority: filterPriority,
    limit: 50,
  });

  // Get icon for notification type
  const getNotificationIcon = (
    type: NotificationType,
    priority: NotificationPriority
  ) => {
    if (priority === 'critical') {
      return <AlertCircle className="h-5 w-5 text-red-600" />;
    }

    switch (type) {
      case 'sla_warning':
      case 'sla_critical':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'approval_pending':
        return <Info className="h-5 w-5 text-blue-600" />;
      case 'approval_approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'approval_rejected':
        return <X className="h-5 w-5 text-red-600" />;
      case 'bottleneck_detected':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'bottleneck_resolved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  // Get priority color classes
  const getPriorityClasses = (priority: NotificationPriority) => {
    switch (priority) {
      case 'critical':
        return 'border-l-red-600 bg-red-50 dark:bg-red-950/20';
      case 'high':
        return 'border-l-amber-600 bg-amber-50 dark:bg-amber-950/20';
      case 'medium':
        return 'border-l-blue-600 bg-blue-50 dark:bg-blue-950/20';
      case 'low':
        return 'border-l-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: typeof notifications[0]) => {
    // Mark as read if unread
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose?.();
    }
  };

  // Handle dismiss
  const handleDismiss = (
    e: React.MouseEvent,
    notificationId: string
  ) => {
    e.stopPropagation(); // Prevent notification click
    dismissNotification(notificationId);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return dateString;
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-base">
            {t('get_ready.notifications.title')}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {unreadCount} {t('get_ready.notifications.unread')}
          </Badge>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <Select
            value={filterType}
            onValueChange={(value) =>
              setFilterType(value as NotificationType | 'all')
            }
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('get_ready.notifications.filter.all_types')}
              </SelectItem>
              <SelectItem value="sla_warning">SLA</SelectItem>
              <SelectItem value="approval_pending">Approvals</SelectItem>
              <SelectItem value="bottleneck_detected">Bottlenecks</SelectItem>
              <SelectItem value="vehicle_status_change">Status</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={filterPriority}
            onValueChange={(value) =>
              setFilterPriority(value as NotificationPriority | 'all')
            }
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('get_ready.notifications.filter.all_priorities')}
              </SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="flex-1 h-96">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {t('common.loading')}
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              {t('get_ready.notifications.empty.title')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('get_ready.notifications.empty.description')}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  'p-3 cursor-pointer transition-colors hover:bg-muted/50 border-l-4',
                  getPriorityClasses(notification.priority),
                  !notification.is_read && 'font-medium'
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(
                      notification.notification_type,
                      notification.priority
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground line-clamp-1">
                        {notification.title}
                      </p>

                      {/* Dismiss Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={(e) => handleDismiss(e, notification.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.message}
                    </p>

                    {/* Vehicle Info (if available) */}
                    {notification.vehicle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {notification.vehicle.vehicle_year} {notification.vehicle.vehicle_make}{' '}
                        {notification.vehicle.vehicle_model} • Stock:{' '}
                        {notification.vehicle.stock_number}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.created_at)}
                      </span>

                      {!notification.is_read && (
                        <Badge
                          variant="secondary"
                          className="h-4 px-1.5 text-xs bg-primary/10 text-primary"
                        >
                          {t('get_ready.notifications.new')}
                        </Badge>
                      )}

                      {notification.priority === 'critical' && (
                        <Badge
                          variant="destructive"
                          className="h-4 px-1.5 text-xs"
                        >
                          {t('get_ready.notifications.critical')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer Actions */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="px-4 py-3 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0 || isMarkingAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              {t('get_ready.notifications.actions.mark_all_read')}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings2 className="h-3 w-3 mr-1" />
              {t('get_ready.notifications.actions.settings')}
            </Button>
          </div>
        </>
      )}

      {/* Settings Modal */}
      <NotificationSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
      />
    </div>
  );
}
