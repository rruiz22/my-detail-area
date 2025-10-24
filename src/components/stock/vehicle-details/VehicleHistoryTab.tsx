import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { Clock, DollarSign } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleHistoryTabProps {
  vehicle: VehicleInventory;
}

export const VehicleHistoryTab: React.FC<VehicleHistoryTabProps> = ({ vehicle }) => {
  const { t } = useTranslation();

  // Future: Fetch actual price history from database
  // For now, show last reprice if available
  const hasHistory = vehicle.last_reprice_date;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {t('stock.vehicleDetails.priceHistory', 'Price History')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('stock.vehicleDetails.priceHistoryDescription', 'View pricing changes and adjustments')}
        </p>
      </div>

      {hasHistory ? (
        <div className="space-y-4">
          {/* Timeline */}
          <div className="relative">
            {/* Current Price */}
            <Card>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">
                        {t('stock.vehicleDetails.currentPrice', 'Current Price')}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      {t('stock.vehicleDetails.active', 'Active')}
                    </Badge>
                  </div>
                  <p className="text-2xl font-bold text-primary mt-2">
                    {vehicle.price ? `$${vehicle.price.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Last Reprice */}
            {vehicle.last_reprice_date && (
              <Card className="mt-4">
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">
                          {t('stock.vehicleDetails.lastReprice', 'Last Reprice')}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(vehicle.last_reprice_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {vehicle.leads_since_last_reprice !== null && vehicle.leads_since_last_reprice !== undefined && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {vehicle.leads_since_last_reprice} {t('stock.vehicleDetails.leadsSince', 'leads since reprice')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Note about future enhancements */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground text-center">
                {t('stock.vehicleDetails.moreHistoryComingSoon', 'Full price history tracking coming soon')}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {t('stock.vehicleDetails.noHistory', 'No Price History')}
            </h3>
            <p className="text-muted-foreground">
              {t('stock.vehicleDetails.noHistoryDescription', 'Price changes will appear here')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
