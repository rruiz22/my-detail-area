import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { VehicleInventory } from '@/hooks/useStockManagement';
import { BarChart3, Eye, TrendingUp } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface VehicleMarketTabProps {
  vehicle: VehicleInventory;
}

export const VehicleMarketTab: React.FC<VehicleMarketTabProps> = ({ vehicle }) => {
  const { t } = useTranslation();

  const hasMarketData = vehicle.market_rank_matching !== null || vehicle.market_rank_overall !== null || vehicle.percent_to_market !== null;
  const hasLeadData = vehicle.leads_last_7_days !== null || vehicle.leads_total !== null;
  const hasCarGurusData = vehicle.cargurus_srp_views !== null || vehicle.cargurus_vdp_views !== null || vehicle.cargurus_ctr !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Market Performance */}
      {hasMarketData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('stock.vehicleDetails.marketPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicle.market_rank_matching !== null && vehicle.market_rank_matching !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.marketRankMatching', 'Market Rank (Matching)')}</Label>
                  <p className="font-medium text-lg">
                    #{vehicle.market_rank_matching} of {vehicle.market_listings_matching || 'N/A'}
                  </p>
                </div>
              )}
              {vehicle.market_rank_overall !== null && vehicle.market_rank_overall !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.marketRankOverall', 'Market Rank (Overall)')}</Label>
                  <p className="font-medium text-lg">
                    #{vehicle.market_rank_overall} of {vehicle.market_listings_overall || 'N/A'}
                  </p>
                </div>
              )}
              {vehicle.percent_to_market !== null && vehicle.percent_to_market !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.percentToMarket', 'Percent to Market')}</Label>
                  <p className={`font-medium text-lg ${vehicle.percent_to_market > 100 ? 'text-red-600' : 'text-green-600'}`}>
                    {vehicle.percent_to_market}%
                  </p>
                </div>
              )}
              {vehicle.cost_to_market !== null && vehicle.cost_to_market !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.costToMarket', 'Cost to Market')}</Label>
                  <p className="font-medium text-lg">${vehicle.cost_to_market.toLocaleString()}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Supply & Demand */}
      {(vehicle.mds_overall || vehicle.mds_matching) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('stock.vehicleDetails.marketSupplyDemand', 'Market Supply & Demand')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {vehicle.mds_overall && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.mdsOverall', 'MDS Overall')}</Label>
                  <p className="font-medium text-lg">{vehicle.mds_overall}</p>
                </div>
              )}
              {vehicle.mds_matching && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.mdsMatching', 'MDS Matching')}</Label>
                  <p className="font-medium text-lg">{vehicle.mds_matching}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lead Performance */}
      {hasLeadData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {t('stock.vehicleDetails.leadPerformance', 'Lead Performance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-muted-foreground">{t('stock.vehicleDetails.leadsLast7Days', 'Leads Last 7 Days')}</Label>
                <p className="font-medium text-2xl text-primary">{vehicle.leads_last_7_days || 0}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">{t('stock.vehicleDetails.totalLeads', 'Total Leads')}</Label>
                <p className="font-medium text-lg">{vehicle.leads_total || 0}</p>
              </div>
              {vehicle.leads_daily_avg_last_7_days !== null && vehicle.leads_daily_avg_last_7_days !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.dailyAvg7D', 'Daily Avg (7D)')}</Label>
                  <p className="font-medium text-lg">{vehicle.leads_daily_avg_last_7_days.toFixed(1)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CarGurus Metrics */}
      {hasCarGurusData && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t('stock.vehicleDetails.cargurusMetrics', 'CarGurus Metrics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {vehicle.cargurus_srp_views !== null && vehicle.cargurus_srp_views !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.cargurusSrpViews', 'SRP Views')}</Label>
                  <p className="font-medium text-lg">{vehicle.cargurus_srp_views.toLocaleString()}</p>
                </div>
              )}
              {vehicle.cargurus_vdp_views !== null && vehicle.cargurus_vdp_views !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.cargurusVdpViews', 'VDP Views')}</Label>
                  <p className="font-medium text-lg">{vehicle.cargurus_vdp_views.toLocaleString()}</p>
                </div>
              )}
              {vehicle.cargurus_ctr !== null && vehicle.cargurus_ctr !== undefined && (
                <div>
                  <Label className="text-muted-foreground">{t('stock.vehicleDetails.cargurusCtr', 'Click-Through Rate')}</Label>
                  <p className="font-medium text-lg">{(vehicle.cargurus_ctr * 100).toFixed(2)}%</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No market data message */}
      {!hasMarketData && !hasLeadData && !hasCarGurusData && (
        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              {t('stock.vehicleDetails.noMarketData', 'No market data available')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
