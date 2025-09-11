import React from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { VehicleSearchInput } from '@/components/ui/vehicle-search-input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Zap, DollarSign } from 'lucide-react';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';

interface VehicleAutoPopulationFieldProps {
  dealerId?: number;
  onVehicleSelect?: (result: VehicleSearchResult) => void;
  selectedVehicle?: VehicleSearchResult | null;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const VehicleAutoPopulationField: React.FC<VehicleAutoPopulationFieldProps> = ({
  dealerId,
  onVehicleSelect,
  selectedVehicle,
  label,
  placeholder,
  className = ''
}) => {
  const { t } = useTranslation();

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    if (onVehicleSelect) {
      onVehicleSelect(result);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'inventory': return <Car className="h-4 w-4 text-green-600" />;
      case 'vin_api': return <Zap className="h-4 w-4 text-blue-600" />;
      default: return null;
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'inventory': return t('stock.autopop.localInventory');
      case 'vin_api': return t('stock.autopop.vinDecoded');
      default: return '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label || t('stock.autopop.searchVehicle')}</Label>
      
      <VehicleSearchInput
        dealerId={dealerId}
        onVehicleSelect={handleVehicleSelect}
        placeholder={placeholder}
        className="w-full"
      />

      {selectedVehicle && (
        <Card className="border-border bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {getSourceIcon(selectedVehicle.source)}
                  <span className="font-medium">
                    {selectedVehicle.preview?.title}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {getSourceLabel(selectedVehicle.source)}
                  </Badge>
                </div>
                
                {selectedVehicle.preview?.subtitle && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {selectedVehicle.preview.subtitle}
                  </p>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedVehicle.data.vin && (
                    <div>
                      <span className="font-medium">VIN:</span> {selectedVehicle.data.vin}
                    </div>
                  )}
                  {selectedVehicle.data.year && (
                    <div>
                      <span className="font-medium">{t('orders.year')}:</span> {selectedVehicle.data.year}
                    </div>
                  )}
                  {selectedVehicle.data.make && (
                    <div>
                      <span className="font-medium">{t('orders.make')}:</span> {selectedVehicle.data.make}
                    </div>
                  )}
                  {selectedVehicle.data.model && (
                    <div>
                      <span className="font-medium">{t('orders.model')}:</span> {selectedVehicle.data.model}
                    </div>
                  )}
                </div>

                {/* Inventory-specific enriched data */}
                {selectedVehicle.source === 'inventory' && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedVehicle.data.price && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          <span className="font-medium">
                            ${selectedVehicle.data.price.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {selectedVehicle.data.age_days && (
                        <div>
                          <span className="text-muted-foreground">Age:</span> {selectedVehicle.data.age_days} days
                        </div>
                      )}
                      {selectedVehicle.data.leads_total !== undefined && (
                        <div>
                          <span className="text-muted-foreground">Leads:</span> {selectedVehicle.data.leads_total}
                        </div>
                      )}
                      {selectedVehicle.data.estimated_profit && (
                        <div>
                          <span className="text-muted-foreground">Est. Profit:</span> ${selectedVehicle.data.estimated_profit.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Badge 
                  variant={selectedVehicle.confidence === 'high' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {t(`stock.autopop.confidence.${selectedVehicle.confidence}`)}
                </Badge>
                
                {selectedVehicle.preview?.badge && (
                  <Badge 
                    variant={selectedVehicle.preview.badgeVariant || 'secondary'}
                    className="text-xs"
                  >
                    {selectedVehicle.preview.badge}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};