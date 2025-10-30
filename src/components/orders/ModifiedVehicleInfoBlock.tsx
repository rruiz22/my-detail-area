import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Hash } from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

interface ModifiedVehicleInfoBlockProps {
  order: {
    vehicle_info?: string;
    vehicleInfo?: string;
    vehicle_vin?: string;
    vehicleVin?: string;
    stock_number?: string;
    stockNumber?: string;
    vehicle_image?: string;
    vehicleImage?: string;
    vin_decoded?: boolean;
    dealer_id?: number;
    [key: string]: unknown;
  };
}

// Modified Vehicle Info Block according to new specifications:
// - Remove individual color, year, make, model fields
// - Add vehicle_info field (shows/decodes VIN)
// - Show complete VIN
// - Display vehicle image in preview area
export const ModifiedVehicleInfoBlock = React.memo(function ModifiedVehicleInfoBlock({
  order
}: ModifiedVehicleInfoBlockProps) {
  const { t } = useTranslation();

  // Memoize vehicle info array - simplified version with required fields only
  const vehicleInfo = useMemo(() => [
    {
      icon: Car,
      label: t('vehicle_info.vehicle_information'),
      value: order.vehicle_info || order.vehicleInfo || 'Vehicle information not available',
      description: t('vehicle_info.decoded_from_vin')
    },
    {
      icon: Hash,
      label: 'VIN',
      value: order.vehicleVin || order.vehicle_vin || t('data_table.vin_not_provided'),
      mono: true,
      fullWidth: true
    },
    {
      icon: Hash,
      label: 'Stock#',
      value: order.stockNumber || order.stock_number || t('data_table.no_stock')
    }
  ], [
    order.vehicle_info,
    order.vehicleInfo,
    order.vehicleVin,
    order.vehicle_vin,
    order.stockNumber,
    order.stock_number,
    t
  ]);

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

  return (
    <Card className="h-full shadow-sm border-border/60">
      <CardHeader className="pb-4 bg-gradient-to-br from-background to-muted/20">
        <CardTitle className="flex items-center gap-2.5 text-base">
          <div className="p-2 rounded-lg bg-primary/10">
            <Car className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold">{t('orders.vehicle_information')}</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* VIN Decode Status Badge */}
        {order.vin_decoded !== undefined && (
          <div className={`p-3 rounded-xl border-2 ${
            decodeStatus.status === 'success'
              ? 'bg-green-50 border-green-200'
              : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${
                decodeStatus.status === 'success'
                  ? 'bg-green-100'
                  : 'bg-blue-100'
              }`}>
                <Hash className={`h-4 w-4 ${
                  decodeStatus.status === 'success'
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`} />
              </div>
              <div className="flex-1">
                <span className={`text-sm font-bold block ${
                  decodeStatus.status === 'success'
                    ? 'text-green-700'
                    : 'text-blue-700'
                }`}>
                  {decodeStatus.text}
                </span>
                <span className={`text-xs ${
                  decodeStatus.status === 'success'
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`}>
                  {decodeStatus.desc}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Simplified Vehicle Details Grid */}
        <div className="space-y-3">
          {vehicleInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-background to-muted/30 border border-border/50 shadow-sm hover:shadow-md transition-shadow ${
                  info.fullWidth ? 'col-span-full' : ''
                }`}
              >
                <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {info.label}
                  </p>
                  <p className={`text-sm font-bold text-foreground break-words ${info.mono ? 'font-mono' : ''}`}>
                    {info.value}
                  </p>
                  {info.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                      {info.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
