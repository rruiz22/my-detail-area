import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell } from 'lucide-react';
import { SmartNotificationCenter } from './SmartNotificationCenter';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';

interface NotificationBellProps {
  dealerId?: number;
}

// Lightweight bell + popover wrapper to avoid rendering the full panel in the topbar
export function NotificationBell({ dealerId }: NotificationBellProps) {
  const { unreadCount } = useSmartNotifications(dealerId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full text-[10px] flex items-center justify-center pointer-events-none"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 w-[calc(100vw-2rem)] max-w-[420px] sm:w-[420px]">
        <SmartNotificationCenter dealerId={dealerId} className="w-full border-0 shadow-none" />
      </PopoverContent>
    </Popover>
  );
}
