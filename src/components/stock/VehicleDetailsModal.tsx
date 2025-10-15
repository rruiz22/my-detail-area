import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatTimeDuration } from '@/utils/timeFormatUtils';
import { Award, BarChart3, Camera, Car, Database, DollarSign, Eye, Info, MapPin, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

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
                  {vehicle.year} {vehicle.make} {vehicle.model}
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
                          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
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
                        {vehicle.objective && (
                          <div className={`px-2 py-1 rounded text-sm font-medium ${
                            vehicle.objective.toLowerCase() === 'retail'
                              ? 'bg-green-500/90 text-white'
                              : 'bg-blue-500/90 text-white'
                          }`}>
                            {vehicle.objective}
                          </div>
                        )}
                        {vehicle.age_days && (
                          <div className="bg-orange-500/90 text-white px-2 py-1 rounded text-sm">
                            {vehicle.age_days}d
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

              {/* Third Row - Valuation & Market */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Valuation */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Valuation & Costs
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vehicle.unit_cost && (
                        <div>
                          <Label className="text-muted-foreground">Unit Cost</Label>
                          <p className="font-medium">${vehicle.unit_cost.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.estimated_profit && (
                        <div>
                          <Label className="text-muted-foreground">Est. Profit</Label>
                          <p className={`font-medium ${vehicle.estimated_profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${vehicle.estimated_profit.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {vehicle.mmr_value && (
                        <div>
                          <Label className="text-muted-foreground">MMR Value</Label>
                          <p className="font-medium">${vehicle.mmr_value.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.galves_value && (
                        <div>
                          <Label className="text-muted-foreground">Galves Value</Label>
                          <p className="font-medium">${vehicle.galves_value.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.acv_wholesale && (
                        <div>
                          <Label className="text-muted-foreground">ACV Wholesale</Label>
                          <p className="font-medium">${vehicle.acv_wholesale.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.acv_max_retail && (
                        <div>
                          <Label className="text-muted-foreground">ACV Max Retail</Label>
                          <p className="font-medium">${vehicle.acv_max_retail.toLocaleString()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Market Performance */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Market Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vehicle.market_rank_matching !== null && vehicle.market_rank_matching !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">Market Rank (Matching)</Label>
                          <p className="font-medium">#{vehicle.market_rank_matching} of {vehicle.market_listings_matching || 'N/A'}</p>
                        </div>
                      )}
                      {vehicle.market_rank_overall !== null && vehicle.market_rank_overall !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">Market Rank (Overall)</Label>
                          <p className="font-medium">#{vehicle.market_rank_overall} of {vehicle.market_listings_overall || 'N/A'}</p>
                        </div>
                      )}
                      {vehicle.percent_to_market !== null && vehicle.percent_to_market !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">Percent to Market</Label>
                          <p className={`font-medium ${vehicle.percent_to_market > 100 ? 'text-red-600' : 'text-green-600'}`}>
                            {vehicle.percent_to_market}%
                          </p>
                        </div>
                      )}
                      {vehicle.cost_to_market !== null && vehicle.cost_to_market !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">Cost to Market</Label>
                          <p className="font-medium">${vehicle.cost_to_market.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.mds_overall && (
                        <div>
                          <Label className="text-muted-foreground">MDS Overall</Label>
                          <p className="font-medium">{vehicle.mds_overall}</p>
                        </div>
                      )}
                      {vehicle.mds_matching && (
                        <div>
                          <Label className="text-muted-foreground">MDS Matching</Label>
                          <p className="font-medium">{vehicle.mds_matching}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Lead & CarGurus Performance */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Lead & Digital Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Leads Last 7 Days</Label>
                        <p className="font-medium text-lg">{vehicle.leads_last_7_days || 0}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Total Leads</Label>
                        <p className="font-medium">{vehicle.leads_total || 0}</p>
                      </div>
                      {vehicle.leads_daily_avg_last_7_days !== null && vehicle.leads_daily_avg_last_7_days !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">Daily Avg (7D)</Label>
                          <p className="font-medium">{vehicle.leads_daily_avg_last_7_days.toFixed(1)}</p>
                        </div>
                      )}
                      <hr className="my-2" />
                      {vehicle.cargurus_srp_views !== null && vehicle.cargurus_srp_views !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">CarGurus SRP Views</Label>
                          <p className="font-medium">{vehicle.cargurus_srp_views.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.cargurus_vdp_views !== null && vehicle.cargurus_vdp_views !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">CarGurus VDP Views</Label>
                          <p className="font-medium">{vehicle.cargurus_vdp_views.toLocaleString()}</p>
                        </div>
                      )}
                      {vehicle.cargurus_ctr !== null && vehicle.cargurus_ctr !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">CarGurus CTR</Label>
                          <p className="font-medium">{(vehicle.cargurus_ctr * 100).toFixed(2)}%</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fourth Row - Proof Points */}
              {(vehicle.proof_point_msrp || vehicle.proof_point_jd_power || vehicle.proof_point_kbb || vehicle.proof_point_market) && (
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Proof Points
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

              {/* Fifth Row - Additional Info & Raw Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Additional Information */}
                <Card className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Additional Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {vehicle.syndication_status && (
                        <div>
                          <Label className="text-muted-foreground">Syndication Status</Label>
                          <p className="font-medium">{vehicle.syndication_status}</p>
                        </div>
                      )}
                      {vehicle.key_information && (
                        <div>
                          <Label className="text-muted-foreground">Key Information</Label>
                          <p className="font-medium text-sm">{vehicle.key_information}</p>
                        </div>
                      )}
                      {vehicle.water_damage && (
                        <div>
                          <Label className="text-muted-foreground">Water Damage</Label>
                          <Badge variant="destructive">Yes</Badge>
                        </div>
                      )}
                      {vehicle.last_reprice_date && (
                        <div>
                          <Label className="text-muted-foreground">Last Reprice</Label>
                          <p className="font-medium">{new Date(vehicle.last_reprice_date).toLocaleDateString()}</p>
                        </div>
                      )}
                      {vehicle.leads_since_last_reprice !== null && vehicle.leads_since_last_reprice !== undefined && (
                        <div>
                          <Label className="text-muted-foreground">Leads Since Reprice</Label>
                          <p className="font-medium">{vehicle.leads_since_last_reprice}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Raw Data */}
                {vehicle.raw_data && Object.keys(vehicle.raw_data).length > 0 && (
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
                )}
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
