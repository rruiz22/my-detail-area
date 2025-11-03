import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationGroup, useSmartNotifications } from '@/hooks/useSmartNotifications';
import {
  Bell,
  Check,
  CheckCheck,
  Filter,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationItem } from './NotificationItem';

interface SmartNotificationCenterProps {
  dealerId?: number;
  className?: string;
}

export function SmartNotificationCenter({ dealerId, className }: SmartNotificationCenterProps) {
  const { t } = useTranslation();
  const {
    notifications,
    groupedNotifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    markEntityAsRead,
    deleteNotification
  } = useSmartNotifications(dealerId);

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'important'>('all');
  const [selectedTab, setSelectedTab] = useState('chronological'); // Default to recent notifications first

  // Filter notifications based on selected filter
  // Filter notifications for chronological view
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    switch (selectedFilter) {
      case 'unread':
        filtered = notifications.filter(n => !n.is_read);
        break;
      case 'important':
        filtered = notifications.filter(n => n.priority === 'high' || n.priority === 'urgent' || n.priority === 'critical');
        break;
      default:
        break;
    }

    return filtered;
  }, [notifications, selectedFilter]);

  // Filtered grouped notifications
  const filteredGroupedNotifications = useMemo(() => {
    if (selectedFilter === 'all') return groupedNotifications;

    return groupedNotifications
      .map(group => {
        const filteredNotifs = group.notifications.filter(n => {
          if (selectedFilter === 'unread') return !n.is_read;
          if (selectedFilter === 'important') return n.priority === 'high' || n.priority === 'urgent' || n.priority === 'critical';
          return true;
        });

        if (filteredNotifs.length === 0) return null;

        return {
          ...group,
          notifications: filteredNotifs,
          unreadCount: filteredNotifs.filter(n => !n.is_read).length,
        };
      })
      .filter(Boolean) as NotificationGroup[];
  }, [groupedNotifications, selectedFilter]);


  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <Bell className="h-6 w-6 animate-pulse mr-2" />
            {t('notifications.loading')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        {/* Title Row */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="flex-shrink-0">{unreadCount}</Badge>
            )}
          </CardTitle>
        </div>

        {/* Actions Row - Responsive */}
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">
                  {selectedFilter === 'all' ? t('notifications.filter.all') : selectedFilter === 'unread' ? t('notifications.filter.unread') : t('notifications.filter.important')}
                </span>
                <span className="inline sm:hidden capitalize">{selectedFilter}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedFilter('all')}>
                {t('notifications.filter.all_description')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('unread')}>
                {t('notifications.filter.unread_description')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('important')}>
                {t('notifications.filter.important_description')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="text-xs sm:text-sm">
              <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">{t('notifications.actions.mark_all_read')}</span>
              <span className="inline sm:hidden">Mark all</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chronological">{t('notifications.tabs.recent')}</TabsTrigger>
            <TabsTrigger value="grouped">{t('notifications.tabs.grouped')}</TabsTrigger>
          </TabsList>

          <TabsContent value="grouped" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px] sm:h-[400px]">
              {filteredGroupedNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  {notifications.length === 0 ? (
                    <p>{t('notifications.empty.message')}</p>
                  ) : (
                    <div className="space-y-2">
                      <p className="font-medium">No grouped notifications</p>
                      <p className="text-sm">Switch to "Recent" tab to view all {notifications.length} notification{notifications.length !== 1 ? 's' : ''}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGroupedNotifications.map((group) => (
                    <div key={`${group.entity_type}_${group.entity_id}`} className="border-b last:border-b-0">
                      <div className="flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {group.entity_type}
                          </Badge>
                          <span className="text-xs sm:text-sm font-medium">
                            {group.notifications.length} {group.notifications.length === 1 ? t('notifications.count.singular') : t('notifications.count.plural')}
                          </span>
                          {group.unreadCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.unreadCount} {t('notifications.count.unread')}
                            </Badge>
                          )}
                        </div>
                        {group.unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markEntityAsRead(group.entity_type, group.entity_id)}
                            className="flex-shrink-0"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-0">
                        {group.notifications.slice(0, 3).map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDelete={deleteNotification}
                          />
                        ))}
                        {group.notifications.length > 3 && (
                          <div className="p-4 text-center">
                            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                              {t('notifications.show_more', { count: group.notifications.length - 3 })}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="chronological" className="mt-0">
            <ScrollArea className="h-[calc(100vh-280px)] min-h-[300px] sm:h-[400px]">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>{t('notifications.empty.filtered')}</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      showEntity={true}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
