import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { Award, DollarSign } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehiclePricingTabProps {
  vehicle: VehicleInventory;
}

export const VehiclePricingTab: React.FC<VehiclePricingTabProps> = ({ vehicle }) => {
  const { t } = useTranslation();

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const hasValuationData = vehicle.unit_cost || vehicle.estimated_profit || vehicle.mmr_value || vehicle.galves_value || vehicle.acv_wholesale || vehicle.acv_max_retail;
  const hasProofPoints = vehicle.proof_point_msrp || vehicle.proof_point_jd_power || vehicle.proof_point_kbb || vehicle.proof_point_market;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Current Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t('stock.vehicleDetails.currentPricing', 'Current Pricing')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Label className="text-muted-foreground">{t('stock.vehicleDetails.price')}</Label>
              <p className="font-medium text-2xl text-primary">
                {formatCurrency(vehicle.price)}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">{t('stock.vehicleDetails.msrp')}</Label>
              <p className="font-medium text-lg">
                {formatCurrency(vehicle.msrp)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation & Costs */}
      {hasValuationData && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              {t('stock.vehicleDetails.valuationAndCosts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {vehicle.unit_cost && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.unitCost', 'Unit Cost')}</Label>
                  <p className="font-medium text-lg">{formatCurrency(vehicle.unit_cost)}</p>
                </div>
              )}
              {vehicle.estimated_profit !== null && vehicle.estimated_profit !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.estimatedProfit', 'Est. Profit')}</Label>
                  <p className={`font-medium text-lg ${vehicle.estimated_profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(vehicle.estimated_profit)}
                  </p>
                </div>
              )}
              {vehicle.mmr_value && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.mmrValue', 'MMR Value')}</Label>
                  <p className="font-medium text-lg">{formatCurrency(vehicle.mmr_value)}</p>
                </div>
              )}
              {vehicle.galves_value && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.galvesValue', 'Galves Value')}</Label>
                  <p className="font-medium text-lg">{formatCurrency(vehicle.galves_value)}</p>
                </div>
              )}
              {vehicle.acv_wholesale && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.acvWholesale', 'ACV Wholesale')}</Label>
                  <p className="font-medium text-lg">{formatCurrency(vehicle.acv_wholesale)}</p>
                </div>
              )}
              {vehicle.acv_max_retail && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.acvMaxRetail', 'ACV Max Retail')}</Label>
                  <p className="font-medium text-lg">{formatCurrency(vehicle.acv_max_retail)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proof Points */}
      {hasProofPoints && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              {t('stock.vehicleDetails.proofPoints', 'Proof Points')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {vehicle.proof_point_msrp && (
                <Badge variant="outline" className="text-sm">
                  MSRP: {vehicle.proof_point_msrp}
                </Badge>
              )}
              {vehicle.proof_point_jd_power && (
                <Badge variant="outline" className="text-sm">
                  JD Power: {vehicle.proof_point_jd_power}
                </Badge>
              )}
              {vehicle.proof_point_kbb && (
                <Badge variant="outline" className="text-sm">
                  KBB: {vehicle.proof_point_kbb}
                </Badge>
              )}
              {vehicle.proof_point_market && (
                <Badge variant="outline" className="text-sm">
                  Market: {vehicle.proof_point_market}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No pricing data message */}
      {!hasValuationData && !hasProofPoints && (
        <Card className="md:col-span-2">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {t('stock.vehicleDetails.noPricingData', 'No additional pricing data available')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
