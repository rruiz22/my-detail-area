import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { useStockManagement } from '@/hooks/useStockManagement';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StockAnalytics } from './StockAnalytics';
import { StockCSVUploader } from './StockCSVUploader';
import { StockDMSConfig } from './StockDMSConfig';
import { StockInventoryTable } from './StockInventoryTable';
import { StockSyncHistory } from './StockSyncHistory';

import {
    AlertCircle,
    BarChart3,
    Calendar,
    DollarSign,
    Package,
    RefreshCw,
    Settings,
    TrendingUp,
    Upload
} from 'lucide-react';

export const StockDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('inventory');
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null); // ✅ FIX BUG-03: Track refresh errors

  const {
    currentDealership,
    loading: dealerLoading
  } = useAccessibleDealerships();

  const {
    inventory,
    loading: inventoryLoading,
    refreshInventory,
    lastRefresh
  } = useStockManagement();

  const loading = dealerLoading || inventoryLoading;

  // ✅ FIX PERF-01 & BUG-03: Memoize handler and track errors
  const handleManualRefresh = useCallback(async () => {
    setIsManualRefreshing(true);
    setRefreshError(null); // Clear previous errors
    try {
      await refreshInventory();
      toast({
        title: t('common.success'),
        description: t('stock.actions.refresh_success', 'Inventory refreshed successfully')
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh inventory';
      setRefreshError(errorMessage);
      toast({
        title: t('common.error'),
        description: t('stock.actions.refresh_failed', errorMessage),
        variant: 'destructive'
      });
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refreshInventory, t]);

  // ✅ FIX PERF-02: Optimized metrics calculation - single pass through inventory
  const metrics = React.useMemo(() => {
    if (!inventory?.length) {
      return {
        totalVehicles: 0,
        averagePrice: 0,
        averageAgeDays: 0,
        totalValue: 0
      };
    }

    // Single pass through inventory to calculate all metrics
    const result = inventory.reduce((acc, vehicle) => {
      // Count total value
      if (vehicle.price && vehicle.price > 0) {
        acc.totalValue += vehicle.price;
        acc.totalPrice += vehicle.price;
        acc.priceCount++;
      }

      // Count total age
      if (vehicle.age_days !== null && vehicle.age_days !== undefined) {
        acc.totalAge += vehicle.age_days;
        acc.ageCount++;
      }

      return acc;
    }, {
      totalValue: 0,
      totalPrice: 0,
      priceCount: 0,
      totalAge: 0,
      ageCount: 0
    });

    return {
      totalVehicles: inventory.length,
      averagePrice: result.priceCount > 0 ? Math.round(result.totalPrice / result.priceCount) : 0,
      averageAgeDays: result.ageCount > 0 ? Math.round(result.totalAge / result.ageCount) : 0,
      totalValue: Math.round(result.totalValue)
    };
  }, [inventory]);

  const stats = [
    {
      title: t('stock.metrics.totalVehicles'),
      value: metrics?.totalVehicles || 0,
      icon: Package,
      suffix: ' vehicles'
    },
    {
      title: t('stock.dashboard.avg_price'),
      value: `$${(metrics?.averagePrice || 0).toLocaleString()}`,
      icon: DollarSign,
      suffix: ' avg'
    },
    {
      title: t('stock.dashboard.avg_age_days'),
      value: `${metrics?.averageAgeDays || 0} days`,
      icon: Calendar,
      suffix: ' on lot'
    },
    {
      title: t('stock.dashboard.inventory_value'),
      value: `$${(metrics?.totalValue || 0).toLocaleString()}`,
      icon: TrendingUp,
      suffix: ' total'
    }
  ];

  // Loading state
  if (dealerLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // No current dealership selected
  if (!currentDealership) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {t('stock.errors.no_access')}
          </h3>
          <p className="text-muted-foreground">
            {t('stock.errors.no_access_description')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t('stock.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('stock.description')} • {currentDealership.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isManualRefreshing || !currentDealership}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            {t('stock.actions.refresh')}
          </Button>
        </div>
      </div>

      {/* ✅ FIX BUG-03: Show persistent error with AlertCircle */}
      {refreshError && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">{t('stock.errors.refresh_failed', 'Failed to Refresh Inventory')}</p>
              <p className="text-sm text-muted-foreground mt-1">{refreshError}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRefreshError(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4 w-full">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <div className="flex items-center space-x-2">
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.suffix && (
                      <span className="text-xs text-muted-foreground">
                        {stat.suffix}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="inventory" className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>{t('stock.tabs.inventory')}</span>
          </TabsTrigger>
          <TabsTrigger value="upload" className="flex items-center space-x-2">
            <Upload className="w-4 h-4" />
            <span>{t('stock.tabs.upload')}</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>{t('stock.tabs.analytics')}</span>
          </TabsTrigger>
          <TabsTrigger value="dms" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>{t('stock.tabs.dms_config')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{t('stock.tabs.sync_history')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <StockInventoryTable dealerId={currentDealership?.id} />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <StockCSVUploader dealerId={currentDealership?.id} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <StockAnalytics dealerId={currentDealership?.id} />
        </TabsContent>

        <TabsContent value="dms" className="space-y-4">
          <StockDMSConfig dealerId={currentDealership?.id} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <StockSyncHistory dealerId={currentDealership?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
