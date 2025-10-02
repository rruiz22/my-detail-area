import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, Tag, User } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ModifiedVehicleInfoBlock } from './ModifiedVehicleInfoBlock';

interface CarWashOrderFieldsProps {
  order: {
    tag?: string;
    service_performer?: string;
    servicePerformer?: string;
    is_waiter?: boolean;
    isWaiter?: boolean;
    service_type?: string;
    serviceType?: string;
    [key: string]: unknown;
    id: string;
    dealer_id: string | number;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  };
}

// Car Wash Order specific fields component
// Contains: TAG only (Service fields without RO/PO) + modified vehicle information
// Header shows "Service Performer" instead of "Usuario Asignado"
export const CarWashOrderFields = React.memo(function CarWashOrderFields({
  order
}: CarWashOrderFieldsProps) {
  const { t } = useTranslation();

  const carWashInfo = React.useMemo(() => ({
    tag: order.tag || t('common.not_assigned'),
    hasTag: !!order.tag,
    servicePerformer: order.service_performer || order.servicePerformer || t('common.not_assigned'),
    hasServicePerformer: !!(order.service_performer || order.servicePerformer),
    isWaiter: order.is_waiter || order.isWaiter || false,
    serviceType: order.service_type || order.serviceType || t('car_wash_orders.standard_wash')
  }), [
    order.tag,
    order.service_performer,
    order.servicePerformer,
    order.is_waiter,
    order.isWaiter,
    order.service_type,
    order.serviceType,
    t
  ]);

  return (
    <div className="space-y-4">
      {/* Car Wash Information Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Droplets className="h-5 w-5 text-gray-700" />
            {t('car_wash_orders.car_wash_information')}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Service Performer */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('car_wash_orders.service_performer')}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {carWashInfo.servicePerformer}
                </p>
                <Badge
                  variant={carWashInfo.hasServicePerformer ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {carWashInfo.hasServicePerformer ? t('common.assigned') : t('common.not_assigned')}
                </Badge>
              </div>
            </div>
          </div>

          {/* TAG Field */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                TAG
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium font-mono">
                  {carWashInfo.tag}
                </p>
                <Badge
                  variant={carWashInfo.hasTag ? 'default' : 'outline'}
                  className="text-xs"
                >
                  {carWashInfo.hasTag ? t('common.assigned') : t('common.not_assigned')}
                </Badge>
              </div>
            </div>
          </div>

          {/* Service Type */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Droplets className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {t('car_wash_orders.service_type')}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">
                  {carWashInfo.serviceType}
                </p>
                {carWashInfo.isWaiter && (
                  <Badge variant="secondary" className="text-xs">
                    {t('car_wash_orders.waiter')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modified Vehicle Information */}
      <ModifiedVehicleInfoBlock order={order} />
    </div>
  );
});
