import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { Bell } from 'lucide-react';
import React from 'react';
import { SmartNotificationCenter } from './SmartNotificationCenter';

interface NotificationBellProps {
  dealerId?: number;
}

// Lightweight bell + responsive wrapper (Sheet on mobile, Popover on desktop)
export function NotificationBell({ dealerId }: NotificationBellProps) {
  const { unreadCount } = useSmartNotifications(dealerId);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [open, setOpen] = React.useState(false);

  const bellButton = (
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
  );

  // Mobile: Use Sheet (full-screen drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {bellButton}
        </SheetTrigger>
        <SheetContent side="right" className="w-full p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <SmartNotificationCenter dealerId={dealerId} className="w-full h-full border-0 shadow-none" />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Use Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {bellButton}
      </PopoverTrigger>
      <PopoverContent align="end" className="p-0 w-[420px]">
        <SmartNotificationCenter dealerId={dealerId} className="w-full border-0 shadow-none" />
      </PopoverContent>
    </Popover>
  );
}
