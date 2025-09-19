import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Hash, Palette, Calendar, Shield, Eye, Image } from 'lucide-react';
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

  // Memoize vehicle image display
  const vehicleImageData = useMemo(() => {
    const imageUrl = order.vehicle_image || order.vehicleImage;
    const hasImage = imageUrl && imageUrl.trim() !== '';

    return {
      hasImage,
      imageUrl,
      fallbackText: t('vehicle_info.no_image_available')
    };
  }, [order.vehicle_image, order.vehicleImage, t]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Car className="h-5 w-5 text-gray-700" />
          {t('orders.vehicle_information')}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Simplified Vehicle Details Grid */}
        <div className="space-y-3">
          {vehicleInfo.map((info, index) => {
            const Icon = info.icon;
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg bg-muted/30 ${
                  info.fullWidth ? 'col-span-full' : ''
                }`}
              >
                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {info.label}
                  </p>
                  <p className={`text-sm font-medium break-words ${info.mono ? 'font-mono' : ''}`}>
                    {info.value}
                  </p>
                  {info.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {info.description}
                    </p>
                  )}
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

        {/* Vehicle Image Display - Replaces Display Preview */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('vehicle_info.vehicle_image')}</span>
          </div>

          <div className="p-3 bg-muted/50 rounded-lg border border-dashed min-h-[120px] flex items-center justify-center">
            {vehicleImageData.hasImage ? (
              <div className="w-full">
                <img
                  src={vehicleImageData.imageUrl}
                  alt={t('vehicle_info.vehicle_image_alt')}
                  className="w-full h-auto max-h-32 object-cover rounded-md"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLDivElement;
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <div className="hidden text-center text-sm text-muted-foreground">
                  <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  {vehicleImageData.fallbackText}
                </div>
              </div>
            ) : (
              <div className="text-center text-sm text-muted-foreground">
                <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                {vehicleImageData.fallbackText}
              </div>
            )}
          </div>

          {/* VIN Display under image */}
          <div className="mt-2 text-center">
            <p className="text-xs text-muted-foreground">
              VIN: <span className="font-mono">{order.vehicleVin || order.vehicle_vin || 'Not provided'}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});