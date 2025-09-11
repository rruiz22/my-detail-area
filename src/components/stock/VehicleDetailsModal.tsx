import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Car, DollarSign, Info, MapPin, TrendingUp, Database, Camera } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VehicleDetailsModalProps {
  vehicle: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  open,
  onOpenChange
}) => {
  const { t } = useTranslation();

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 px-6 py-4 border-b bg-background/95 backdrop-blur shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl font-bold">
                  {vehicle.year} {vehicle.make} {vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim()}
                </DialogTitle>
                <p className="text-muted-foreground">
                  {t('stock.vehicleDetails.stockNumber')}: {vehicle.stock_number} | VIN: {vehicle.vin}
                </p>
              </div>
              <DialogClose className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100">
                <X className="h-4 w-4" />
              </DialogClose>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* First Row - Image and Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Vehicle Image */}
                <Card className="lg:col-span-1 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-0">
                    <div className="relative h-96 bg-muted rounded-lg overflow-hidden">
                      {vehicle.key_photo_url ? (
                        <img
                          src={vehicle.key_photo_url}
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim()}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Camera className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Enhanced Status Badges */}
                      <div className="absolute bottom-2 right-2 flex flex-col gap-1">
                        {vehicle.photo_count && (
                          <div className="bg-black/70 text-white px-2 py-1 rounded text-sm">
                            {vehicle.photo_count} {t('stock.vehicleDetails.photos')}
                          </div>
                        )}
                        {(vehicle.objective || vehicle.raw_data?.Objective) && (
                          <div className={`px-2 py-1 rounded text-sm font-medium ${
                            (vehicle.objective || vehicle.raw_data?.Objective)?.toLowerCase() === 'retail' 
                              ? 'bg-green-500/90 text-white' 
                              : 'bg-blue-500/90 text-white'
                          }`}>
                            {vehicle.objective || vehicle.raw_data?.Objective}
                          </div>
                        )}
                        {(vehicle.age_days || vehicle.raw_data?.Age) && (
                          <div className="bg-orange-500/90 text-white px-2 py-1 rounded text-sm">
                            {vehicle.age_days || vehicle.raw_data?.Age}d
                          </div>
                        )}
                        {vehicle.is_certified && (
                          <div className="bg-yellow-500/90 text-white px-2 py-1 rounded text-sm">
                            {t('stock.vehicleDetails.certified')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Overview */}
                <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {t('stock.vehicleDetails.overview')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.year')}</Label>
                        <p className="font-medium">{vehicle.year || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.make')}</Label>
                        <p className="font-medium">{vehicle.make || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.model')}</Label>
                        <p className="font-medium">{vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim() || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.trim')}</Label>
                        <p className="font-medium">{vehicle.trim || vehicle.raw_data?.Trim || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.vin')}</Label>
                        <p className="font-medium font-mono text-sm">{vehicle.vin || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.stockNumber')}</Label>
                        <p className="font-medium">{vehicle.stock_number || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Second Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Pricing Information */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      {t('stock.vehicleDetails.pricing')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.price')}</Label>
                        <p className="font-medium text-lg">
                          {vehicle.price ? `$${vehicle.price.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.msrp')}</Label>
                        <p className="font-medium">
                          {vehicle.msrp ? `$${vehicle.msrp.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Vehicle Details */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      {t('stock.vehicleDetails.details')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.mileage')}</Label>
                        <p className="font-medium">
                          {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.color')}</Label>
                        <p className="font-medium">{vehicle.color || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.drivetrain')}</Label>
                        <p className="font-medium">{vehicle.drivetrain || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.certified')}</Label>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {vehicle.is_certified ? t('common.yes') : t('common.no')}
                          </span>
                          {vehicle.is_certified && (
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                              {t('stock.vehicleDetails.certified')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location & Status */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      {t('stock.vehicleDetails.locationStatus')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.lotLocation')}</Label>
                        <p className="font-medium">{vehicle.lot_location || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.dmsStatus')}</Label>
                        <p className="font-medium">{vehicle.dms_status || 'N/A'}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.objective')}</Label>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vehicle.objective || vehicle.raw_data?.Objective || 'N/A'}</span>
                          {(vehicle.objective || vehicle.raw_data?.Objective) && (
                            <Badge variant="outline" className={
                              (vehicle.objective || vehicle.raw_data?.Objective)?.toLowerCase() === 'retail' 
                                ? 'border-green-500 text-green-700' 
                                : 'border-blue-500 text-blue-700'
                            }>
                              {vehicle.objective || vehicle.raw_data?.Objective}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.ageDays')}</Label>
                        <p className="font-medium">{vehicle.age_days || vehicle.raw_data?.Age || 0} days</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.riskLight')}</Label>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${
                            vehicle.risk_light?.toLowerCase() === 'red' ? 'bg-red-500' :
                            vehicle.risk_light?.toLowerCase() === 'yellow' ? 'bg-yellow-500' :
                            vehicle.risk_light?.toLowerCase() === 'green' ? 'bg-green-500' :
                            'bg-gray-300'
                          }`} />
                          <span className="font-medium">{vehicle.risk_light || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Third Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Lead Performance */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      {t('stock.vehicleDetails.leadPerformance')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.leadsLast7Days')}</Label>
                        <p className="font-medium text-lg">{vehicle.leads_last_7_days || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">{t('stock.vehicleDetails.leadsTotal')}</Label>
                        <p className="font-medium">{vehicle.leads_total || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Raw Data */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {t('stock.vehicleDetails.rawData')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-40 overflow-y-auto">
                      <pre className="text-xs bg-muted p-2 rounded">
                        {JSON.stringify(vehicle.raw_data, null, 2)}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};