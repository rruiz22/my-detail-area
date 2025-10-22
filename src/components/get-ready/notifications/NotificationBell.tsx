import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useGetReadyNotifications } from '@/hooks/useGetReadyNotifications';
import { NotificationPanel } from './NotificationPanel';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/**
 * Notification Bell Component
 *
 * Displays a bell icon with badge counter for unread notifications.
 * Opens a popover with the NotificationPanel when clicked.
 *
 * Features:
 * - Animated bell icon when new notifications arrive
 * - Badge color changes based on highest priority notification
 * - Popover with full notification panel
 * - Auto-updates with real-time subscriptions
 *
 * @param className - Additional CSS classes
 * @param size - Button size (sm, md, lg)
 * @param showLabel - Show "Notifications" label next to bell
 */
export function NotificationBell({
  className,
  size = 'md',
  showLabel = false,
}: NotificationBellProps) {
  const { unreadCount, summary, hasNewNotifications, clearNewNotificationsFlag } =
    useGetReadyNotifications({
      enabled: true,
      is_read: false, // Only count unread
    });

  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Trigger animation when new notifications arrive
  useEffect(() => {
    if (hasNewNotifications) {
      setIsAnimating(true);

      // Clear animation after 1 second
      const timer = setTimeout(() => {
        setIsAnimating(false);
        clearNewNotificationsFlag();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [hasNewNotifications, clearNewNotificationsFlag]);

  // Determine badge color based on highest priority unread notification
  const getBadgeVariant = (): 'default' | 'destructive' | 'secondary' => {
    if (!summary) return 'default';

    if (summary.unread_by_priority.critical > 0) {
      return 'destructive'; // Red for critical
    }

    if (summary.unread_by_priority.high > 0) {
      return 'default'; // Orange/yellow for high
    }

    return 'secondary'; // Gray for medium/low
  };

  // Determine if bell should pulse (critical notifications)
  const shouldPulse = summary && summary.unread_by_priority.critical > 0;

  // Button size mapping
  const buttonSizeMap = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  };

  // Icon size mapping
  const iconSizeMap = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative',
            buttonSizeMap[size],
            shouldPulse && 'animate-pulse',
            className
          )}
          aria-label={`Notifications (${unreadCount} unread)`}
        >
          {/* Bell Icon with Animation */}
          <Bell
            className={cn(
              iconSizeMap[size],
              'transition-transform',
              isAnimating && 'animate-[wiggle_0.5s_ease-in-out]'
            )}
          />

          {/* Badge Counter */}
          {unreadCount > 0 && (
            <Badge
              variant={getBadgeVariant()}
              className={cn(
                'absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs font-semibold',
                // Critical notifications: pulsing red
                summary?.unread_by_priority.critical > 0 &&
                  'animate-pulse bg-red-600 text-white border-red-700',
                // High priority: amber
                summary?.unread_by_priority.critical === 0 &&
                  summary?.unread_by_priority.high > 0 &&
                  'bg-amber-500 text-white border-amber-600',
                // Medium/Low: muted
                summary?.unread_by_priority.critical === 0 &&
                  summary?.unread_by_priority.high === 0 &&
                  'bg-gray-500 text-white border-gray-600'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}

          {/* New Notification Indicator (small dot) */}
          {hasNewNotifications && (
            <span className="absolute top-0 right-0 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}

          {/* Optional Label */}
          {showLabel && (
            <span className="ml-2 hidden sm:inline">Notifications</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-96 p-0 max-h-[calc(100vh-80px)] overflow-hidden"
        sideOffset={8}
      >
        <NotificationPanel onClose={() => setIsOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

// Add custom animation for bell wiggle
// Add this to your global CSS (index.css or App.css):
/*
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  50% { transform: rotate(15deg); }
  75% { transform: rotate(-10deg); }
}
*/
