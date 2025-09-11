import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Hash, Palette, Calendar, Shield, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface VehicleInfoBlockProps {
  order: any;
}

// Memoized component to prevent unnecessary re-renders
export const VehicleInfoBlock = React.memo(function VehicleInfoBlock({ order }: VehicleInfoBlockProps) {
  const { t } = useTranslation();

  // Memoize vehicle info array to prevent recreation on every render
  const vehicleInfo = useMemo(() => [
    {
      icon: Calendar,
      label: t('common.year'),
      value: order.vehicle_year || 'N/A'
    },
    {
      icon: Car,
      label: t('common.make'),
      value: order.vehicle_make || 'N/A'
    },
    {
      icon: Car,
      label: t('common.model'), 
      value: order.vehicle_model || 'N/A'
    },
    {
      icon: Hash,
      label: 'VIN',
      value: order.vehicle_vin || t('data_table.vin_not_provided'),
      mono: true
    },
    {
      icon: Hash,
      label: 'Stock#',
      value: order.stock_number || t('data_table.no_stock')
    },
    {
      icon: Palette,
      label: t('common.color'),
      value: order.vehicle_color || 'N/A'
    }
  ], [order.vehicle_year, order.vehicle_make, order.vehicle_model, order.vehicle_vin, order.stock_number, order.vehicle_color, t]);

  // Memoize decode status calculation
  const decodeStatus = useMemo(() => {
    if (order.vin_decoded) {
      return {
        status: 'success',
        text: t('car_wash_orders.decoded'),
        desc: t('car_wash_orders.auto_populated')
      };
    }
    return {
      status: 'manual',
      text: t('vehicle_info.manual_entry'),
      desc: t('vehicle_info.manually_entered')
    };
  }, [order.vin_decoded, t]);

  // Memoize vehicle summary for display preview
  const vehicleSummary = useMemo(() => ({
    displayName: `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() || 'Unknown Vehicle',
    vinDisplay: order.vehicle_vin ? `${order.vehicle_vin.slice(0, 8)}...${order.vehicle_vin.slice(-4)}` : 'N/A'
  }), [order.vehicle_year, order.vehicle_make, order.vehicle_model, order.vehicle_vin]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="h-5 w-5 text-primary" />
          {t('orders.vehicle_information')}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Vehicle Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {vehicleInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {info.label}
                  </p>
                  <p className={`text-sm font-medium truncate ${info.mono ? 'font-mono' : ''}`}>
                    {info.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* VIN Decode Status */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('vehicle_info.vin_status')}</span>
            </div>
            <Badge 
              variant={decodeStatus.status === 'success' ? 'default' : 'outline'}
              className="text-xs"
            >
              {decodeStatus.text}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {decodeStatus.desc}
          </p>
        </div>

        {/* Vehicle Summary Display */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('vehicle_info.display_preview')}</span>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-sm font-semibold text-center">
              {vehicleSummary.displayName}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-1">
              VIN: {vehicleSummary.vinDisplay}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});