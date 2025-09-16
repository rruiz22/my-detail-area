import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  CheckCheck,
  Filter,
  MoreVertical,
  X,
  Package,
  MessageSquare,
  Phone,
  AlertCircle,
  Clock,
  Archive,
  Star
} from 'lucide-react';
import { useSmartNotifications } from '@/hooks/useSmartNotifications';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface SmartNotificationCenterProps {
  dealerId?: number;
  className?: string;
}

export function SmartNotificationCenter({ dealerId, className }: SmartNotificationCenterProps) {
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
  const [selectedTab, setSelectedTab] = useState('grouped');

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    switch (selectedFilter) {
      case 'unread':
        filtered = notifications.filter(n => n.status !== 'read');
        break;
      case 'important':
        filtered = notifications.filter(n => n.priority === 'high' || n.priority === 'urgent');
        break;
      default:
        break;
    }

    return filtered;
  }, [notifications, selectedFilter]);

  const getNotificationIcon = (type: string) => {
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
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-500 border-red-200';
      case 'high':
        return 'text-orange-500 border-orange-200';
      case 'normal':
        return 'text-blue-500 border-blue-200';
      case 'low':
        return 'text-gray-500 border-gray-200';
      default:
        return 'text-gray-500 border-gray-200';
    }
  };

  const NotificationItem = ({ notification, showEntity = false }: {
    notification: Record<string, unknown>;
    showEntity?: boolean;
  }) => (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border-l-4 transition-all hover:bg-muted/50',
        notification.status === 'read' ? 'opacity-60' : '',
        getPriorityColor(notification.priority)
      )}
    >
      <div className={cn(
        'flex-shrink-0 p-2 rounded-full',
        notification.status === 'read' ? 'bg-muted' : 'bg-primary/10'
      )}>
        {getNotificationIcon(notification.notification_type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-sm leading-tight">
              {notification.title}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {notification.message}
            </p>
            {showEntity && notification.entity_type && (
              <Badge variant="outline" className="mt-2 text-xs">
                {notification.entity_type}: {notification.entity_id?.slice(0, 8)}
              </Badge>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {notification.status !== 'read' && (
                <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => deleteNotification(notification.id)}>
                <X className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Star className="h-4 w-4 mr-2" />
                Save for later
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </div>
          <Badge variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
            {notification.priority}
          </Badge>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center text-muted-foreground">
            <Bell className="h-6 w-6 animate-pulse mr-2" />
            Loading notifications...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary">{unreadCount}</Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  {selectedFilter === 'all' ? 'All' : selectedFilter === 'unread' ? 'Unread' : 'Important'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedFilter('all')}>
                  All notifications
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedFilter('unread')}>
                  Unread only
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedFilter('important')}>
                  Important only
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="grouped">By Context</TabsTrigger>
            <TabsTrigger value="chronological">Recent</TabsTrigger>
          </TabsList>

          <TabsContent value="grouped" className="mt-0">
            <ScrollArea className="h-[400px]">
              {groupedNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No notifications to display</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedNotifications.map((group) => (
                    <div key={`${group.entity_type}_${group.entity_id}`} className="border-b last:border-b-0">
                      <div className="flex items-center justify-between p-4 bg-muted/30">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {group.entity_type}
                          </Badge>
                          <span className="text-sm font-medium">
                            {group.notifications.length} notification{group.notifications.length === 1 ? '' : 's'}
                          </span>
                          {group.unreadCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {group.unreadCount} unread
                            </Badge>
                          )}
                        </div>
                        {group.unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markEntityAsRead(group.entity_type, group.entity_id)}
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
                          />
                        ))}
                        {group.notifications.length > 3 && (
                          <div className="p-4 text-center">
                            <Button variant="ghost" size="sm">
                              Show {group.notifications.length - 3} more
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
            <ScrollArea className="h-[400px]">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-4 opacity-50" />
                  <p>No notifications match your filter</p>
                </div>
              ) : (
                <div className="space-y-0">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      showEntity={true}
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