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
import { useToast } from '@/hooks/use-toast';
import { NotificationGroup, useSmartNotifications } from '@/hooks/useSmartNotifications';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  Filter,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationItem } from './NotificationItem';

interface SmartNotificationCenterProps {
  dealerId?: number;
  className?: string;
}

// ✅ Unified scroll height constant
const SCROLL_HEIGHT = "h-[400px] max-h-[calc(100vh-280px)] min-h-[300px]";

export function SmartNotificationCenter({ dealerId, className }: SmartNotificationCenterProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // ✅ ROBUST: Hook with error handling
  const {
    notifications = [], // Fallback to empty array
    groupedNotifications = [],
    unreadCount = 0,
    loading = false,
    markAsRead,
    markAllAsRead,
    markEntityAsRead,
    deleteNotification,
    refreshNotifications
  } = useSmartNotifications(dealerId);

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'important'>('all');

  // ✅ ROBUST: Tab persistence with explicit default
  const [selectedTab, setSelectedTab] = useTabPersistence('notification-center', 'chronological');

  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedNotifications(new Set());
    }
  };

  // Toggle individual notification selection
  const toggleNotificationSelection = (notificationId: string) => {
    setSelectedNotifications(prev => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  // Select all notifications
  const selectAllNotifications = () => {
    const allIds = new Set(filteredNotifications.map(n => n.id));
    setSelectedNotifications(allIds);
  };

  // Deselect all notifications
  const deselectAllNotifications = () => {
    setSelectedNotifications(new Set());
  };

  // Delete selected notifications
  const deleteSelectedNotifications = async () => {
    if (selectedNotifications.size === 0) return;

    const totalCount = selectedNotifications.size;

    try {
      // Delete each notification individually with Promise.allSettled to handle partial failures
      const deletePromises = Array.from(selectedNotifications).map(async (id) => {
        try {
          await deleteNotification(id);
          return { id, success: true };
        } catch (error) {
          console.error(`Failed to delete notification ${id}:`, error);
          return { id, success: false, error };
        }
      });

      // Wait for all deletions to complete (even if some fail)
      const results = await Promise.allSettled(deletePromises);

      // Count successes and failures
      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length;
      const failureCount = totalCount - successCount;

      // Clear selection and exit selection mode
      setSelectedNotifications(new Set());
      setIsSelectionMode(false);

      // Force refresh to update the UI
      await refreshNotifications();

      // Show appropriate toast based on results
      if (failureCount === 0) {
        // All deleted successfully
        toast({
          title: t('common.success'),
          description: t('notifications.bulk_delete_success', { count: successCount }),
        });
      } else if (successCount === 0) {
        // All failed
        toast({
          title: t('common.error'),
          description: t('notifications.bulk_delete_error'),
          variant: 'destructive',
        });
      } else {
        // Partial success
        toast({
          title: t('common.warning'),
          description: `${successCount} deleted, ${failureCount} failed`,
          variant: 'default',
        });
      }
    } catch (error) {
      console.error('Unexpected error during bulk delete:', error);
      toast({
        title: t('common.error'),
        description: t('notifications.bulk_delete_error'),
        variant: 'destructive',
      });
    }
  };

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
      {/* ✅ COMPACT HEADER - Reduced padding */}
      <CardHeader className="space-y-2 pb-3">
        {/* Title Row - More compact */}
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span className="truncate">{t('notifications.title')}</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="flex-shrink-0 h-5 px-1.5 text-xs">{unreadCount}</Badge>
            )}
          </CardTitle>
        </div>

        {/* Actions Row - More compact buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {!isSelectionMode ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 text-xs">
                    <Filter className="h-3 w-3 mr-1.5" />
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
                <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-7 text-xs">
                  <CheckCheck className="h-3 w-3 mr-1.5" />
                  <span className="hidden sm:inline">{t('notifications.actions.mark_all_read')}</span>
                  <span className="inline sm:hidden">Mark all</span>
                </Button>
              )}

              {filteredNotifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={toggleSelectionMode} className="h-7 text-xs">
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  <span className="hidden sm:inline">{t('notifications.actions.select_to_delete')}</span>
                  <span className="inline sm:hidden">Select</span>
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={selectAllNotifications} className="h-7 text-xs">
                <CheckCheck className="h-3 w-3 mr-1.5" />
                <span className="hidden sm:inline">{t('notifications.actions.select_all')}</span>
                <span className="inline sm:hidden">All</span>
              </Button>

              {selectedNotifications.size > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={deselectAllNotifications} className="h-7 text-xs">
                    {t('notifications.actions.deselect_all')}
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedNotifications}
                    className="h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />
                    <span className="hidden sm:inline">
                      {t('notifications.actions.delete_selected', { count: selectedNotifications.size })}
                    </span>
                    <span className="inline sm:hidden">Delete ({selectedNotifications.size})</span>
                  </Button>
                </>
              )}

              <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="h-7 text-xs">
                {t('common.action_buttons.cancel')}
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          {/* ✅ COMPACT TABS - Smaller text */}
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="chronological" className="text-xs">{t('notifications.tabs.recent')}</TabsTrigger>
            <TabsTrigger value="grouped" className="text-xs">{t('notifications.tabs.grouped')}</TabsTrigger>
          </TabsList>

          {/* ✅ GROUPED VIEW */}
          <TabsContent value="grouped" className="mt-0">
            <ScrollArea className={SCROLL_HEIGHT}>
              {filteredGroupedNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  {notifications.length === 0 ? (
                    <p>{t('notifications.empty.message')}</p>
                  ) : (
                    <div className="space-y-2">
                      {/* ✅ Using translations */}
                      <p className="font-medium">{t('notifications.empty.no_grouped')}</p>
                      <p className="text-sm">{t('notifications.empty.switch_to_recent', { count: notifications.length })}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 p-2">
                  {filteredGroupedNotifications.map((group) => (
                    <div key={`${group.entity_type}_${group.entity_id}`} className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
                      {/* ✅ COMPACT GROUP HEADER */}
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50/80 border-b border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5 font-medium">
                            {group.entity_type}
                          </Badge>
                          <span className="text-[11px] sm:text-xs font-medium text-gray-700">
                            {group.notifications.length} {group.notifications.length === 1 ? t('notifications.count.singular') : t('notifications.count.plural')}
                          </span>
                          {group.unreadCount > 0 && (
                            <Badge variant="default" className="text-[10px] h-5">
                              {group.unreadCount} {t('notifications.count.unread')}
                            </Badge>
                          )}
                        </div>
                        {group.unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markEntityAsRead(group.entity_type, group.entity_id)}
                            className="flex-shrink-0 h-7 text-[11px]"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">Mark all read</span>
                          </Button>
                        )}
                      </div>

                      {/* ✅ COMPACT NOTIFICATION ITEMS */}
                      <div className="divide-y divide-gray-100">
                        {group.notifications.slice(0, 3).map((notification) => (
                          <NotificationItem
                            key={notification.id}
                            notification={notification}
                            onMarkAsRead={markAsRead}
                            onDelete={deleteNotification}
                            isSelectionMode={isSelectionMode}
                            isSelected={selectedNotifications.has(notification.id)}
                            onToggleSelect={toggleNotificationSelection}
                          />
                        ))}
                        {group.notifications.length > 3 && (
                          <div className="px-3 py-2 text-center bg-gray-50/50 border-t border-gray-100">
                            <Button variant="ghost" size="sm" className="h-7 text-[11px] font-medium text-primary hover:text-primary/80">
                              <ChevronDown className="h-3 w-3 mr-1" />
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

          {/* ✅ CHRONOLOGICAL VIEW */}
          <TabsContent value="chronological" className="mt-0">
            <ScrollArea className={SCROLL_HEIGHT}>
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium text-base mb-1">{t('notifications.empty.title')}</p>
                  <p className="text-sm">{t('notifications.empty.description')}</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      showEntity={true}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      isSelectionMode={isSelectionMode}
                      isSelected={selectedNotifications.has(notification.id)}
                      onToggleSelect={toggleNotificationSelection}
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
