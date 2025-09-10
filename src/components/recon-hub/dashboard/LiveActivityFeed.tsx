import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  MapPin, 
  User,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface LiveActivityFeedProps {
  dealerId: number;
  limit?: number;
}

interface ActivityItem {
  id: string;
  type: 'step_completed' | 'location_updated' | 'alert_triggered' | 'vehicle_created' | 'status_changed';
  orderId: string;
  vehicleInfo: string;
  description: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  metadata?: any;
}

export function LiveActivityFeed({ dealerId, limit = 20 }: LiveActivityFeedProps) {
  const { t } = useTranslation();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { 
    data: activities = [],
    isLoading,
    refetch,
    dataUpdatedAt
  } = useQuery({
    queryKey: ['recon-activity-feed', dealerId],
    queryFn: async (): Promise<ActivityItem[]> => {
      // Get recent order activity with proper join
      const { data: orderActivity, error: orderError } = await supabase
        .from('order_activity_log')
        .select(`
          id,
          order_id,
          activity_type,
          description,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (orderError) throw orderError;

      // Get order details separately to avoid join issues
      const orderIds = orderActivity?.map(a => a.order_id) || [];
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          vehicle_year,
          vehicle_make,
          vehicle_model,
          dealer_id
        `)
        .in('id', orderIds)
        .eq('dealer_id', dealerId)
        .eq('order_type', 'recon');

      if (ordersError) throw ordersError;

      // Get recent location updates
      const { data: locationActivity, error: locationError } = await supabase
        .from('recon_vehicle_locations')
        .select(`
          id,
          order_id,
          location_name,
          scanned_at,
          scanned_by
        `)
        .order('scanned_at', { ascending: false })
        .limit(Math.floor(limit / 2));

      if (locationError) throw locationError;

      // Get order details for location updates
      const locationOrderIds = locationActivity?.map(l => l.order_id) || [];
      const { data: locationOrders, error: locationOrdersError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          vehicle_year,
          vehicle_make,
          vehicle_model
        `)
        .in('id', locationOrderIds)
        .eq('dealer_id', dealerId)
        .eq('order_type', 'recon');

      if (locationOrdersError) throw locationOrdersError;

      // Transform and combine activities
      const activities: ActivityItem[] = [];

      // Add order activities
      orderActivity?.forEach(activity => {
        const order = orders?.find(o => o.id === activity.order_id);
        if (!order) return;

        const vehicleInfo = `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() || order.order_number;
        
        activities.push({
          id: activity.id,
          type: getActivityType(activity.activity_type),
          orderId: activity.order_id,
          vehicleInfo,
          description: activity.description || 'Activity logged',
          timestamp: activity.created_at,
          userId: activity.user_id
        });
      });

      // Add location activities
      locationActivity?.forEach(location => {
        const order = locationOrders?.find(o => o.id === location.order_id);
        if (!order) return;

        const vehicleInfo = `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() || order.order_number;
        
        activities.push({
          id: `location-${location.id}`,
          type: 'location_updated',
          orderId: location.order_id,
          vehicleInfo,
          description: `Vehicle moved to ${location.location_name}`,
          timestamp: location.scanned_at,
          userId: location.scanned_by
        });
      });

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    },
    enabled: !!dealerId,
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds if auto-refresh is enabled
  });

  const getActivityType = (activityType: string): ActivityItem['type'] => {
    switch (activityType) {
      case 'order_created':
        return 'vehicle_created';
      case 'status_changed':
        return 'status_changed';
      case 'step_completed':
        return 'step_completed';
      default:
        return 'status_changed';
    }
  };

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'step_completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'location_updated':
        return <MapPin className="h-4 w-4 text-blue-600" />;
      case 'alert_triggered':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'vehicle_created':
        return <Calendar className="h-4 w-4 text-primary" />;
      case 'status_changed':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'step_completed':
        return 'border-l-green-500 bg-green-50';
      case 'location_updated':
        return 'border-l-blue-500 bg-blue-50';
      case 'alert_triggered':
        return 'border-l-red-500 bg-red-50';
      case 'vehicle_created':
        return 'border-l-purple-500 bg-purple-50';
      case 'status_changed':
        return 'border-l-orange-500 bg-orange-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getActivityTypeLabel = (type: ActivityItem['type']) => {
    const labels: Record<ActivityItem['type'], string> = {
      'step_completed': t('reconHub.activity.stepCompleted', 'Step Completed'),
      'location_updated': t('reconHub.activity.locationUpdated', 'Location Updated'),
      'alert_triggered': t('reconHub.activity.alertTriggered', 'Alert Triggered'),
      'vehicle_created': t('reconHub.activity.vehicleCreated', 'Vehicle Created'),
      'status_changed': t('reconHub.activity.statusChanged', 'Status Changed')
    };
    return labels[type];
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border-l-4 border-l-gray-200">
                <Skeleton className="h-4 w-4 rounded-full mt-1" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('reconHub.activity.title', 'Live Activity Feed')}
            </CardTitle>
            <CardDescription>
              {t('reconHub.activity.description', 'Real-time updates from your reconditioning workflow')}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`text-xs ${autoRefresh ? 'bg-green-50 text-green-700' : ''}`}
            >
              <div className={`w-2 h-2 rounded-full mr-1 ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              {autoRefresh ? 'Live' : 'Paused'}
            </Badge>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? 'Pause' : 'Resume'}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {t('reconHub.activity.noActivity', 'No Recent Activity')}
            </h3>
            <p className="text-muted-foreground">
              {t('reconHub.activity.noActivityDescription', 'Activity will appear here as your team works on vehicles')}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border-l-4 transition-colors hover:bg-muted/30 ${getActivityColor(activity.type)}`}
                >
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {getActivityTypeLabel(activity.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-sm mb-1">
                      {activity.vehicleInfo}
                    </h4>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Order: {activity.orderId.substring(0, 8)}...</span>
                      {activity.userEmail && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{activity.userEmail}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Footer with last update info */}
        {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
            {t('reconHub.activity.lastUpdated', 'Last updated {{time}}', {
              time: formatDistanceToNow(new Date(dataUpdatedAt), { addSuffix: true })
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}