import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { formatTimeDuration } from '@/utils/timeFormatUtils';
import { Car, Info, MapPin } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleInfoTabProps {
  vehicle: VehicleInventory;
}

export const VehicleInfoTab: React.FC<VehicleInfoTabProps> = ({ vehicle }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Vehicle Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {t('stock.vehicleDetails.overview')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
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
              <p className="font-medium">{vehicle.model || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('stock.vehicleDetails.trim')}</Label>
              <p className="font-medium">{vehicle.trim || 'N/A'}</p>
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

      {/* Vehicle Details */}
      <Card>
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
            {vehicle.segment && (
              <div>
                <Label className="text-muted-foreground">{t('stock.vehicleDetails.segment', 'Segment')}</Label>
                <p className="font-medium">{vehicle.segment}</p>
              </div>
            )}
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
            {vehicle.certified_program && (
              <div>
                <Label className="text-muted-foreground">{t('stock.vehicleDetails.certifiedProgram', 'Certified Program')}</Label>
                <p className="font-medium">{vehicle.certified_program}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location & Status */}
      <Card>
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
                <span className="font-medium">{vehicle.objective || 'N/A'}</span>
                {vehicle.objective && (
                  <Badge variant="outline" className={
                    vehicle.objective.toLowerCase() === 'retail'
                      ? 'border-green-500 text-green-700'
                      : 'border-blue-500 text-blue-700'
                  }>
                    {vehicle.objective}
                  </Badge>
                )}
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('stock.vehicleDetails.ageDays')}</Label>
              <p className="font-medium font-mono">
                {vehicle.age_days
                  ? formatTimeDuration((vehicle.age_days || 0) * 24 * 60 * 60 * 1000)
                  : '0 days'}
              </p>
            </div>
            {vehicle.risk_light && (
              <div>
                <Label className="text-muted-foreground">{t('stock.vehicleDetails.riskLight')}</Label>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    vehicle.risk_light?.toLowerCase() === 'red' ? 'bg-red-500' :
                    vehicle.risk_light?.toLowerCase() === 'yellow' ? 'bg-yellow-500' :
                    vehicle.risk_light?.toLowerCase() === 'green' ? 'bg-green-500' :
                    'bg-gray-300'
                  }`} />
                  <span className="font-medium">{vehicle.risk_light}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Additional Information */}
      {(vehicle.syndication_status || vehicle.key_information || vehicle.water_damage || vehicle.last_reprice_date || vehicle.leads_since_last_reprice !== null) && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t('stock.vehicleDetails.additionalInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicle.syndication_status && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.syndicationStatus', 'Syndication Status')}</Label>
                  <p className="font-medium">{vehicle.syndication_status}</p>
                </div>
              )}
              {vehicle.key_information && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.keyInformation', 'Key Information')}</Label>
                  <p className="font-medium text-sm">{vehicle.key_information}</p>
                </div>
              )}
              {vehicle.water_damage && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.waterDamage', 'Water Damage')}</Label>
                  <Badge variant="destructive">{t('common.yes')}</Badge>
                </div>
              )}
              {vehicle.last_reprice_date && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.lastReprice', 'Last Reprice')}</Label>
                  <p className="font-medium">{new Date(vehicle.last_reprice_date).toLocaleDateString()}</p>
                </div>
              )}
              {vehicle.leads_since_last_reprice !== null && vehicle.leads_since_last_reprice !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.leadsSinceReprice', 'Leads Since Reprice')}</Label>
                  <p className="font-medium">{vehicle.leads_since_last_reprice}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
