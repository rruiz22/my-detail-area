import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, X, CheckCircle, AlertTriangle, Clock, Car, Filter } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { ColorTriggerAlert } from '@/types/recon-hub';

interface ReconNotificationCenterProps {
  dealerId: number;
  alerts: ColorTriggerAlert[];
}

interface Notification {
  id: string;
  type: 'alert' | 'workflow' | 'milestone' | 'system';
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actionable: boolean;
  entityId?: string;
  entityType?: 'order' | 'workflow' | 'system';
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'alert',
    severity: 'critical',
    title: 'Critical T2L Alert',
    message: '2018 Honda Civic has been in recon for 12 days - immediate action required',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    isRead: false,
    actionable: true,
    entityId: 'order-123',
    entityType: 'order'
  },
  {
    id: '2',
    type: 'workflow',
    severity: 'high',
    title: 'Workflow Step Completed',
    message: 'Body shop work completed for 2020 Toyota Camry - ready for detailing',
    timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
    isRead: false,
    actionable: true,
    entityId: 'order-124',
    entityType: 'order'
  },
  {
    id: '3',
    type: 'milestone',
    severity: 'info',
    title: 'Monthly Target Achieved',
    message: 'Average T2L for March: 3.8 days - 5% below target!',
    timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    isRead: true,
    actionable: false,
    entityType: 'system'
  },
  {
    id: '4',
    type: 'alert',
    severity: 'medium',
    title: 'Holding Cost Alert',
    message: '2019 Ford F-150 holding cost exceeded $400 - consider priority processing',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    isRead: true,
    actionable: true,
    entityId: 'order-125',
    entityType: 'order'
  },
  {
    id: '5',
    type: 'system',
    severity: 'info',
    title: 'System Update',
    message: 'ReconHub analytics updated with new predictive features',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    isRead: true,
    actionable: false,
    entityType: 'system'
  }
];

export function ReconNotificationCenter({ dealerId, alerts }: ReconNotificationCenterProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'actionable'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'alert' | 'workflow' | 'milestone' | 'system'>('all');
  const [enableRealTime, setEnableRealTime] = useState(true);

  // Convert alerts to notifications
  useEffect(() => {
    const alertNotifications: Notification[] = alerts.slice(0, 5).map((alert, index) => ({
      id: `alert-${alert.id}-${index}`,
      type: 'alert' as const,
      severity: alert.severity,
      title: t('reconHub.notifications.alertTitle', 'T2L Alert'),
      message: t('reconHub.notifications.alertMessage', '{{vehicle}} has been overdue for {{days}} days', {
        vehicle: alert.vehicleInfo,
        days: alert.daysOverdue
      }),
      timestamp: new Date(Date.now() - index * 10 * 60 * 1000), // Stagger timestamps
      isRead: false,
      actionable: true,
      entityId: alert.orderId,
      entityType: 'order' as const
    }));

    // Merge with existing notifications, avoiding duplicates
    setNotifications(prev => {
      const existing = prev.filter(n => !n.id.startsWith('alert-'));
      return [...alertNotifications, ...existing].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });
  }, [alerts, t]);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'actionable' && !notification.actionable) return false;
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    toast({
      title: t('reconHub.notifications.allRead', 'All notifications marked as read'),
      description: t('reconHub.notifications.allReadDesc', 'Your notification list has been cleared')
    });
  };

  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    toast({
      title: t('reconHub.notifications.dismissed', 'Notification dismissed'),
      description: t('reconHub.notifications.dismissedDesc', 'The notification has been removed from your list')
    });
  };

  const handleTakeAction = (notification: Notification) => {
    if (notification.entityType === 'order' && notification.entityId) {
      // In a real implementation, this would navigate to the order details
      toast({
        title: t('reconHub.notifications.actionTaken', 'Opening Order Details'),
        description: t('reconHub.notifications.actionDesc', 'Redirecting to order {{id}}', { 
          id: notification.entityId 
        })
      });
    }
    handleMarkAsRead(notification.id);
  };

  const getNotificationIcon = (type: Notification['type'], severity: Notification['severity']) => {
    if (type === 'alert') {
      return severity === 'critical' ? 
        <AlertTriangle className="h-4 w-4 text-destructive" /> :
        <AlertTriangle className="h-4 w-4 text-warning" />;
    }
    if (type === 'workflow') {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    if (type === 'milestone') {
      return <Car className="h-4 w-4 text-primary" />;
    }
    return <Bell className="h-4 w-4 text-muted-foreground" />;
  };

  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return t('reconHub.notifications.justNow', 'Just now');
    if (minutes < 60) return t('reconHub.notifications.minutesAgo', '{{count}}m ago', { count: minutes });
    if (hours < 24) return t('reconHub.notifications.hoursAgo', '{{count}}h ago', { count: hours });
    return t('reconHub.notifications.daysAgo', '{{count}}d ago', { count: days });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>
              {t('reconHub.notifications.title', 'Notification Center')}
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                {t('reconHub.notifications.realTime', 'Real-time')}
              </span>
              <Switch
                checked={enableRealTime}
                onCheckedChange={setEnableRealTime}
              />
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                {t('reconHub.notifications.markAllRead', 'Mark All Read')}
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          {t('reconHub.notifications.description', 'Stay updated with real-time alerts and workflow notifications')}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('reconHub.notifications.all', 'All')}</SelectItem>
                <SelectItem value="unread">{t('reconHub.notifications.unread', 'Unread')}</SelectItem>
                <SelectItem value="actionable">{t('reconHub.notifications.actionable', 'Actionable')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reconHub.notifications.allTypes', 'All Types')}</SelectItem>
              <SelectItem value="alert">{t('reconHub.notifications.alerts', 'Alerts')}</SelectItem>
              <SelectItem value="workflow">{t('reconHub.notifications.workflow', 'Workflow')}</SelectItem>
              <SelectItem value="milestone">{t('reconHub.notifications.milestones', 'Milestones')}</SelectItem>
              <SelectItem value="system">{t('reconHub.notifications.system', 'System')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {t('reconHub.notifications.noNotifications', 'No Notifications')}
              </h3>
              <p className="text-muted-foreground">
                {t('reconHub.notifications.noNotificationsDesc', 'All caught up! No new notifications at this time.')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div className={`p-4 rounded-lg border transition-colors ${
                    notification.isRead 
                      ? 'bg-muted/20 border-muted' 
                      : 'bg-background border-primary/20 shadow-sm'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type, notification.severity)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium text-sm ${
                                notification.isRead ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {notification.title}
                              </h4>
                              <Badge variant={getSeverityColor(notification.severity)} className="h-4 px-1.5 text-xs">
                                {t(`reconHub.notifications.severity.${notification.severity}`, notification.severity)}
                              </Badge>
                            </div>
                            <p className={`text-sm ${
                              notification.isRead ? 'text-muted-foreground' : 'text-muted-foreground'
                            }`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                              {!notification.isRead && (
                                <div className="w-2 h-2 bg-primary rounded-full" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {notification.actionable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTakeAction(notification)}
                                className="h-8 px-2 text-xs"
                              >
                                {t('reconHub.notifications.viewDetails', 'View')}
                              </Button>
                            )}
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsRead(notification.id)}
                                className="h-8 px-2 text-xs"
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDismiss(notification.id)}
                              className="h-8 px-2 text-xs"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {index < filteredNotifications.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Real-time Status */}
        {enableRealTime && (
          <Alert className="mt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <AlertDescription className="text-sm">
                {t('reconHub.notifications.realTimeActive', 'Real-time notifications are active. You\'ll receive alerts as they happen.')}
              </AlertDescription>
            </div>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}