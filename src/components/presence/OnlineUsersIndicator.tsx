import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUserPresence } from '@/hooks/useUserPresence';
import { usePermissions } from '@/hooks/usePermissions';
import { OnlineUsersList } from './OnlineUsersList';
import { cn } from '@/lib/utils';

interface OnlineUsersIndicatorProps {
  dealerId?: number;
  className?: string;
}

export function OnlineUsersIndicator({
  dealerId,
  className
}: OnlineUsersIndicatorProps) {
  const { t } = useTranslation();
  const { enhancedUser } = usePermissions();
  const { usersPresence, loading } = useUserPresence(dealerId);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Permission guard: Any authenticated user with dealer membership can see this
  // This allows all team members to see who's online and start chats
  const canView = !!enhancedUser && !!dealerId;

  if (!canView) {
    return null;
  }

  // Filter online users only
  const onlineUsers = useMemo(
    () => usersPresence.filter(user => user.is_online),
    [usersPresence]
  );

  const onlineCount = onlineUsers.length;

  // Detect mobile on mount
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Trigger button (shared between Popover and Sheet)
  const TriggerButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'relative',
        className
      )}
      aria-label={t('presence.online_users')}
    >
      <Users className="h-5 w-5" />
      {onlineCount > 0 && (
        <Badge
          variant="default"
          className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 py-0 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600"
        >
          {onlineCount}
        </Badge>
      )}
    </Button>
  );

  // Mobile: Sheet (full-screen drawer)
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {TriggerButton}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              {t('presence.online_users')}
              {onlineCount > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {onlineCount}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <OnlineUsersList
              users={onlineUsers}
              loading={loading}
              emptyMessage={t('presence.no_users_online')}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {TriggerButton}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0"
        sideOffset={8}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-500" />
            <h3 className="font-semibold text-sm">
              {t('presence.online_users')}
            </h3>
          </div>
          {onlineCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {t('presence.online_users_count', { count: onlineCount })}
            </Badge>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <OnlineUsersList
            users={onlineUsers}
            loading={loading}
            emptyMessage={t('presence.no_users_online')}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
