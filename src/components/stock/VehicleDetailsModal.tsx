import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Car, DollarSign, TrendingUp, Users, MapPin, Database, Image, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleInventory } from '@/hooks/useStockManagement';

interface VehicleDetailsModalProps {
  vehicle: VehicleInventory | null;
  isOpen: boolean;
  onClose: () => void;
}

export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  isOpen,
  onClose
}) => {
  const { t } = useTranslation();

  if (!vehicle) return null;

  const formatCurrency = (amount?: number) => {
    if (!amount) return '--';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num && num !== 0) return '--';
    return num.toLocaleString();
  };

  const formatPercentage = (num?: number) => {
    if (!num && num !== 0) return '--';
    return `${num}%`;
  };

  const getRiskLightColor = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'green':
        return 'bg-success text-success-foreground';
      case 'yellow':
        return 'bg-warning text-warning-foreground';
      case 'red':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Parse raw data for additional fields
  const rawData = vehicle.raw_data || {};
  const getValue = (key: string) => rawData[key] || '--';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold flex items-center space-x-3">
              <Car className="w-6 h-6 text-primary" />
              <span>{vehicle.year} {vehicle.make} {vehicle.model}</span>
              {vehicle.trim && (
                <Badge variant="secondary" className="text-sm">
                  {vehicle.trim}
                </Badge>
              )}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span className="font-mono">{t('stock.table.stock_number')}: {vehicle.stock_number}</span>
            <Separator orientation="vertical" className="h-4" />
            <span className="font-mono">{t('stock.details.full_vin')}: {vehicle.vin}</span>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(95vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Vehicle Image */}
            {vehicle.key_photo_url && (
              <Card>
                <CardContent className="p-4">
                  <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                    <img
                      src={vehicle.key_photo_url}
                      alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-background/80 backdrop-blur">
                        <Image className="w-3 h-3 mr-1" />
                        {vehicle.photo_count || 0} {t('stock.table.photos')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* Vehicle Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="w-4 h-4" />
                    <span>{t('stock.details.overview')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">{t('stock.table.year')}:</div>
                    <div className="font-medium">{vehicle.year || '--'}</div>
                    
                    <div className="text-muted-foreground">{t('stock.table.make')}:</div>
                    <div className="font-medium">{vehicle.make || '--'}</div>
                    
                    <div className="text-muted-foreground">{t('stock.table.model')}:</div>
                    <div className="font-medium">{vehicle.model || '--'}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.drivetrain')}:</div>
                    <div>{vehicle.drivetrain || '--'}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.color')}:</div>
                    <div>{vehicle.color || '--'}</div>
                    
                    <div className="text-muted-foreground">{t('stock.table.mileage')}:</div>
                    <div>{formatNumber(vehicle.mileage)} mi</div>

                    <div className="text-muted-foreground">{t('stock.details.segment')}:</div>
                    <div>{vehicle.segment || '--'}</div>

                    <div className="text-muted-foreground">{t('stock.details.certified')}:</div>
                    <div>
                      {vehicle.is_certified ? (
                        <Badge className="bg-success/10 text-success hover:bg-success/20">
                          {vehicle.certified_program || 'Yes'}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">No</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pricing & Valuation */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>{t('stock.details.pricing')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">{t('stock.table.price')}:</div>
                    <div className="font-bold text-lg">{formatCurrency(vehicle.price)}</div>
                    
                    <div className="text-muted-foreground">MSRP:</div>
                    <div className="font-medium">{formatCurrency(vehicle.msrp)}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.unit_cost')}:</div>
                    <div>{formatCurrency(vehicle.unit_cost)}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.estimated_profit')}:</div>
                    <div className="font-medium text-success">{formatCurrency(vehicle.estimated_profit)}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.acv_wholesale')}:</div>
                    <div>{formatCurrency(vehicle.acv_wholesale)}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.acv_max_retail')}:</div>
                    <div>{formatCurrency(vehicle.acv_max_retail)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Market Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>{t('stock.details.market_analysis')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">{t('stock.details.percent_to_market')}:</div>
                    <div className="font-medium">{formatPercentage(vehicle.percent_to_market)}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.cost_to_market')}:</div>
                    <div>{formatCurrency(vehicle.cost_to_market)}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.market_rank')}:</div>
                    <div>
                      <div>Overall: {vehicle.market_rank_overall || '--'}</div>
                      <div>Matching: {vehicle.market_rank_matching || '--'}</div>
                    </div>
                    
                    <div className="text-muted-foreground">{t('stock.details.market_listings')}:</div>
                    <div>
                      <div>Overall: {vehicle.market_listings_overall || '--'}</div>
                      <div>Matching: {vehicle.market_listings_matching || '--'}</div>
                    </div>
                    
                    <div className="text-muted-foreground">{t('stock.details.mds_score')}:</div>
                    <div>
                      <div>Overall: {vehicle.mds_overall || '--'}</div>
                      <div>Matching: {vehicle.mds_matching || '--'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Lead Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-4 h-4" />
                    <span>{t('stock.details.leads_performance')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">{t('stock.details.leads_7_days')}:</div>
                    <div className="font-bold text-lg">{vehicle.leads_last_7_days || 0}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.leads_total')}:</div>
                    <div className="font-medium">{vehicle.leads_total || 0}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.leads_daily_avg')}:</div>
                    <div>{vehicle.leads_daily_avg_last_7_days || 0}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.cargurus_ctr')}:</div>
                    <div>{formatPercentage(vehicle.cargurus_ctr)}</div>
                    
                    <div className="text-muted-foreground">SRP Views:</div>
                    <div>{formatNumber(vehicle.cargurus_srp_views)}</div>
                    
                    <div className="text-muted-foreground">VDP Views:</div>
                    <div>{formatNumber(vehicle.cargurus_vdp_views)}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Location & Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4" />
                    <span>{t('stock.details.location_status')}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">{t('stock.details.lot_location')}:</div>
                    <div>{vehicle.lot_location || '--'}</div>
                    
                    <div className="text-muted-foreground">{t('stock.details.dms_status')}:</div>
                    <div>
                      <Badge variant="outline">
                        {vehicle.dms_status || t('stock.status.unknown')}
                      </Badge>
                    </div>
                    
                    <div className="text-muted-foreground">{t('stock.details.risk_light')}:</div>
                    <div>
                      {vehicle.risk_light ? (
                        <Badge className={getRiskLightColor(vehicle.risk_light)}>
                          {vehicle.risk_light}
                        </Badge>
                      ) : (
                        '--'
                      )}
                    </div>
                    
                    <div className="text-muted-foreground">{t('stock.table.age_days')}:</div>
                    <div>
                      <Badge variant="outline">
                        {vehicle.age_days || 0} {t('common.days')}
                      </Badge>
                    </div>
                    
                    <div className="text-muted-foreground">{t('stock.details.water_damage')}:</div>
                    <div>
                      {vehicle.water_damage ? (
                        <Badge variant="destructive">Yes</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Raw Data Explorer */}
              {Object.keys(rawData).length > 0 && (
                <Card className="xl:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Database className="w-4 h-4" />
                      <span>{t('stock.details.raw_data')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(rawData).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <div className="text-muted-foreground font-medium truncate">{key}:</div>
                          <div className="truncate" title={String(value)}>{String(value) || '--'}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* External Link */}
            {vehicle.key_photo_url && (
              <div className="flex justify-center">
                <Button variant="outline" asChild>
                  <a 
                    href={vehicle.key_photo_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>View Full Size Image</span>
                  </a>
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};