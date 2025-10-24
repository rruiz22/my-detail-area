import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Hash, Palette, Calendar, Shield, Eye, Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StockImageLightbox } from '@/components/get-ready/StockImageLightbox';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Load vehicle image from Stock inventory
  const { data: stockImage, isLoading: isLoadingImage } = useQuery({
    queryKey: ['stock-vehicle-image', order.vehicle_vin, order.stock_number, order.dealer_id],
    queryFn: async () => {
      if (!order.dealer_id) return null;

      const vin = order.vehicleVin || order.vehicle_vin;
      const stockNumber = order.stockNumber || order.stock_number;

      // Match by VIN first (more accurate)
      if (vin) {
        const { data } = await supabase
          .from('dealer_vehicle_inventory')
          .select('key_photo_url')
          .eq('dealer_id', order.dealer_id)
          .eq('vin', vin)
          .not('key_photo_url', 'is', null)
          .maybeSingle();

        if (data?.key_photo_url) {
          console.log('📸 [VehicleInfo] Found image by VIN:', vin);
          return data.key_photo_url;
        }
      }

      // Fallback: Match by stock_number
      if (stockNumber) {
        const { data } = await supabase
          .from('dealer_vehicle_inventory')
          .select('key_photo_url')
          .eq('dealer_id', order.dealer_id)
          .eq('stock_number', stockNumber.toString())
          .not('key_photo_url', 'is', null)
          .maybeSingle();

        if (data?.key_photo_url) {
          console.log('📸 [VehicleInfo] Found image by Stock:', stockNumber);
          return data.key_photo_url;
        }
      }

      console.log('📸 [VehicleInfo] No image found in Stock inventory');
      return null;
    },
    enabled: !!(order.dealer_id && (order.vehicle_vin || order.vehicleVin || order.stock_number || order.stockNumber)),
    staleTime: 5 * 60 * 1000 // Cache 5 minutes
  });

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

  // Memoize vehicle image display - Use stockImage from query or fallback to order.vehicle_image
  const vehicleImageData = useMemo(() => {
    const imageUrl = stockImage || order.vehicle_image || order.vehicleImage;
    const hasImage = imageUrl && imageUrl.trim() !== '';

    return {
      hasImage,
      imageUrl,
      fallbackText: t('vehicle_info.no_image_available'),
      fromStock: !!stockImage
    };
  }, [stockImage, order.vehicle_image, order.vehicleImage, t]);

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

        {/* Vehicle Image Display */}
        <div className="pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Image className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('vehicle_info.vehicle_image')}</span>
          </div>

          {isLoadingImage ? (
            <div className="p-3 bg-muted/50 rounded-lg border border-dashed min-h-[120px] animate-pulse" />
          ) : (
            <div
              className={`p-3 bg-muted/50 rounded-lg border border-dashed min-h-[120px] flex items-center justify-center ${
                vehicleImageData.hasImage ? 'cursor-pointer group relative' : ''
              }`}
              onClick={() => vehicleImageData.hasImage && setLightboxOpen(true)}
            >
              {vehicleImageData.hasImage ? (
                <div className="w-full">
                  <img
                    src={vehicleImageData.imageUrl}
                    alt={t('vehicle_info.vehicle_image_alt')}
                    className="w-full h-auto max-h-32 object-cover rounded-md group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== window.location.origin + '/images/vehicle-placeholder.png') {
                        target.src = '/images/vehicle-placeholder.png';
                      }
                    }}
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-md flex items-center justify-center">
                    <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {/* Badge if from Stock */}
                  {vehicleImageData.fromStock && (
                    <Badge className="absolute bottom-2 right-2 text-[10px] bg-blue-600">
                      {t('stock.image_from_inventory')}
                    </Badge>
                  )}
                </div>
              ) : (
                <img
                  src="/images/vehicle-placeholder.png"
                  alt="Photos Coming Soon"
                  className="w-full h-auto max-h-32 object-cover rounded-md opacity-60"
                />
              )}
            </div>
          )}

          {/* VIN Display under image */}
          <div className="mt-2 text-center">
            <p className="text-xs text-muted-foreground">
              VIN: <span className="font-mono">{order.vehicleVin || order.vehicle_vin || 'Not provided'}</span>
            </p>
          </div>
        </div>

        {/* Stock Image Lightbox */}
        {vehicleImageData.hasImage && vehicleImageData.imageUrl && (
          <StockImageLightbox
            imageUrl={vehicleImageData.imageUrl}
            vehicleInfo={order.vehicle_info || order.vehicleInfo || 'Vehicle'}
            open={lightboxOpen}
            onOpenChange={setLightboxOpen}
          />
        )}
      </CardContent>
    </Card>
  );
});