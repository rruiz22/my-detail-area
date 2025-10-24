import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { useStockVehicleActivity } from '@/hooks/useStockVehicleActivity';
import {
  Activity,
  Calendar,
  Clock,
  DollarSign,
  Camera,
  Trash2,
  Star,
  ShoppingCart,
  Wrench,
  CheckCircle,
  XCircle,
  TrendingUp,
  MapPin,
  Award,
  BarChart3,
  Mail,
  PlusCircle
} from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleActivityTabProps {
  vehicle: VehicleInventory;
}

export const VehicleActivityTab: React.FC<VehicleActivityTabProps> = ({ vehicle }) => {
  const { t } = useTranslation();
  const { data: activities, isLoading } = useStockVehicleActivity(vehicle.id);

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'vehicle_created': <PlusCircle className="w-4 h-4" />,
      'price_changed': <DollarSign className="w-4 h-4" />,
      'msrp_changed': <DollarSign className="w-4 h-4" />,
      'unit_cost_changed': <DollarSign className="w-4 h-4" />,
      'repriced': <TrendingUp className="w-4 h-4" />,
      'status_changed': <Activity className="w-4 h-4" />,
      'vehicle_activated': <CheckCircle className="w-4 h-4" />,
      'vehicle_deactivated': <XCircle className="w-4 h-4" />,
      'objective_changed': <Activity className="w-4 h-4" />,
      'lot_location_changed': <MapPin className="w-4 h-4" />,
      'certified_status_changed': <Award className="w-4 h-4" />,
      'photo_uploaded': <Camera className="w-4 h-4" />,
      'photo_deleted': <Trash2 className="w-4 h-4" />,
      'key_photo_changed': <Star className="w-4 h-4" />,
      'photo_category_changed': <Camera className="w-4 h-4" />,
      'order_created': <ShoppingCart className="w-4 h-4" />,
      'get_ready_linked': <Wrench className="w-4 h-4" />,
      'market_data_updated': <BarChart3 className="w-4 h-4" />,
      'leads_received': <Mail className="w-4 h-4" />,
      'cargurus_updated': <BarChart3 className="w-4 h-4" />,
      'vehicle_deleted': <XCircle className="w-4 h-4" />
    };
    return icons[type] || <Clock className="w-4 h-4" />;
  };

  const getActivityColor = (type: string) => {
    // Using Notion-approved muted colors (no gradients, no bright blues)
    const colors: Record<string, string> = {
      'vehicle_created': 'bg-emerald-500/10 text-emerald-700',
      'price_changed': 'bg-emerald-500/10 text-emerald-700',
      'msrp_changed': 'bg-emerald-500/10 text-emerald-700',
      'unit_cost_changed': 'bg-emerald-500/10 text-emerald-700',
      'repriced': 'bg-emerald-500/10 text-emerald-700',
      'status_changed': 'bg-amber-500/10 text-amber-700',
      'vehicle_activated': 'bg-emerald-500/10 text-emerald-700',
      'vehicle_deactivated': 'bg-red-500/10 text-red-700',
      'objective_changed': 'bg-indigo-500/10 text-indigo-700',
      'lot_location_changed': 'bg-indigo-500/10 text-indigo-700',
      'certified_status_changed': 'bg-amber-500/10 text-amber-700',
      'photo_uploaded': 'bg-indigo-500/10 text-indigo-700',
      'photo_deleted': 'bg-red-500/10 text-red-700',
      'key_photo_changed': 'bg-amber-500/10 text-amber-700',
      'photo_category_changed': 'bg-indigo-500/10 text-indigo-700',
      'order_created': 'bg-emerald-500/10 text-emerald-700',
      'get_ready_linked': 'bg-indigo-500/10 text-indigo-700',
      'market_data_updated': 'bg-gray-500/10 text-gray-700',
      'leads_received': 'bg-emerald-500/10 text-emerald-700',
      'cargurus_updated': 'bg-gray-500/10 text-gray-700',
      'vehicle_deleted': 'bg-red-500/10 text-red-700'
    };
    return colors[type] || 'bg-gray-500/10 text-gray-700';
  };

  const getActivityLabel = (type: string) => {
    const labels: Record<string, string> = {
      vehicle_created: t('stock.vehicleDetails.activity.created', 'Created'),
      price_changed: t('stock.vehicleDetails.activity.priceChanged', 'Price Changed'),
      msrp_changed: t('stock.vehicleDetails.activity.msrpChanged', 'MSRP Changed'),
      unit_cost_changed: t('stock.vehicleDetails.activity.unitCostChanged', 'Unit Cost Changed'),
      repriced: t('stock.vehicleDetails.activity.repriced', 'Repriced'),
      status_changed: t('stock.vehicleDetails.activity.statusChanged', 'Status Changed'),
      vehicle_activated: t('stock.vehicleDetails.activity.activated', 'Activated'),
      vehicle_deactivated: t('stock.vehicleDetails.activity.deactivated', 'Deactivated'),
      objective_changed: t('stock.vehicleDetails.activity.objectiveChanged', 'Objective Changed'),
      lot_location_changed: t('stock.vehicleDetails.activity.lotLocationChanged', 'Lot Location Changed'),
      certified_status_changed: t('stock.vehicleDetails.activity.certifiedStatusChanged', 'Certification Changed'),
      photo_uploaded: t('stock.vehicleDetails.activity.photoAdded', 'Photo Added'),
      photo_deleted: t('stock.vehicleDetails.activity.photoDeleted', 'Photo Deleted'),
      key_photo_changed: t('stock.vehicleDetails.activity.keyPhotoChanged', 'Key Photo Changed'),
      photo_category_changed: t('stock.vehicleDetails.activity.photoCategoryChanged', 'Photo Category Changed'),
      order_created: t('stock.vehicleDetails.activity.orderCreated', 'Order Created'),
      get_ready_linked: t('stock.vehicleDetails.activity.getReadyLinked', 'Get Ready Linked'),
      market_data_updated: t('stock.vehicleDetails.activity.marketDataUpdated', 'Market Data Updated'),
      leads_received: t('stock.vehicleDetails.activity.leadsReceived', 'Leads Received'),
      cargurus_updated: t('stock.vehicleDetails.activity.cargurusUpdated', 'CarGurus Updated'),
      vehicle_deleted: t('stock.vehicleDetails.activity.deleted', 'Deleted')
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground">
            {t('stock.vehicleDetails.loadingActivities', 'Loading activities...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('stock.vehicleDetails.activityTimeline', 'Activity Timeline')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('stock.vehicleDetails.activityDescription', 'All actions and changes for this vehicle')}
        </p>
      </div>

      {/* Timeline */}
      {!activities || activities.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('stock.vehicleDetails.noActivitiesYet', 'No activities yet')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('stock.vehicleDetails.activitiesWillAppear', 'Activities will appear here when changes are made to this vehicle')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activities?.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="flex items-start gap-4 p-6">
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getActivityColor(activity.activity_type)}`}>
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold">{getActivityLabel(activity.activity_type)}</h4>
                        {activity.action_by_profile && (
                          <Badge variant="outline" className="text-xs">
                            {activity.action_by_profile.first_name} {activity.action_by_profile.last_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {activity.description}
                      </p>

                      {/* Show field changes */}
                      {activity.field_name && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          <span className="font-mono bg-muted px-2 py-1 rounded">
                            {activity.field_name}
                          </span>
                          {activity.old_value && activity.new_value && (
                            <>
                              : {activity.old_value} → {activity.new_value}
                            </>
                          )}
                        </div>
                      )}

                      {/* Show metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            {t('stock.vehicleDetails.viewDetails', 'View details')}
                          </summary>
                          <div className="mt-2 text-xs bg-muted p-3 rounded overflow-x-auto">
                            {Object.entries(activity.metadata).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-foreground">{key}:</span>
                                <span className="text-muted-foreground">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.action_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.action_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
