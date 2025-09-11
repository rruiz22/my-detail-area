import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useStockManagement } from '@/hooks/useStockManagement';
import { useStockDealerSelection } from '@/hooks/useStockDealerSelection';
import { StockInventoryTable } from './StockInventoryTable';
import { StockCSVUploader } from './StockCSVUploader';
import { StockAnalytics } from './StockAnalytics';
import { StockDMSConfig } from './StockDMSConfig';
import { StockSyncHistory } from './StockSyncHistory';

import { 
  Package, 
  Upload, 
  BarChart3, 
  Settings,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  RefreshCw,
  Building2,
  ChevronDown
} from 'lucide-react';

export const StockDashboard: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('inventory');
  const {
    stockDealerships,
    selectedDealerId,
    setSelectedDealerId,
    loading: dealerLoading
  } = useStockDealerSelection();
  
  const { 
    inventory, 
    loading: inventoryLoading, 
    refreshInventory
  } = useStockManagement(selectedDealerId || undefined);

  const selectedDealer = stockDealerships.find(d => d.id === selectedDealerId);
  const loading = dealerLoading || inventoryLoading;

  // Mock metrics for now
  const metrics = {
    totalVehicles: inventory?.length || 0,
    averagePrice: 32500,
    averageAgeDays: 42,
    totalValue: 5297500
  };

  const stats = [
    {
      title: t('stock.metrics.totalVehicles'),
      value: metrics?.totalVehicles || 0,
      icon: Package,
      trend: '+5%',
      trendUp: true
    },
    {
      title: t('stock.dashboard.avg_price'),
      value: `$${(metrics?.averagePrice || 0).toLocaleString()}`,
      icon: DollarSign,
      trend: '+2.1%',
      trendUp: true
    },
    {
      title: t('stock.dashboard.avg_age_days'),
      value: metrics?.averageAgeDays || 0,
      icon: Calendar,
      trend: '-3 days',
      trendUp: false
    },
    {
      title: t('stock.dashboard.inventory_value'),
      value: `$${(metrics?.totalValue || 0).toLocaleString()}`,
      icon: TrendingUp,
      trend: '+12.5%',
      trendUp: true
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

  // No stock-enabled dealerships
  if (!stockDealerships.length) {
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
    <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center space-x-4">
              <h1 className="text-3xl font-bold text-foreground">{t('stock.title')}</h1>
              {stockDealerships.length > 1 && (
                <Select value={selectedDealerId?.toString() || ''} onValueChange={(value) => setSelectedDealerId(parseInt(value))}>
                  <SelectTrigger className="w-[280px]">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">
                        {selectedDealer ? selectedDealer.name : 'Select Dealer'}
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockDealerships.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span>{dealer.name}</span>
                          <Badge variant="outline" className="ml-auto text-xs">
                            {dealer.city}, {dealer.state}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <p className="text-muted-foreground">{t('stock.description')}</p>
            {selectedDealer && stockDealerships.length === 1 && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span>{selectedDealer.name} - {selectedDealer.city}, {selectedDealer.state}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshInventory}
              disabled={loading || !selectedDealerId}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('stock.actions.refresh')}
            </Button>
          </div>
        </div>

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
                    <Badge 
                      variant={stat.trendUp ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {stat.trendUp ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {stat.trend}
                    </Badge>
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
          <StockInventoryTable dealerId={selectedDealerId || undefined} />
        </TabsContent>

        <TabsContent value="upload" className="space-y-4">
          <StockCSVUploader dealerId={selectedDealerId || undefined} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <StockAnalytics dealerId={selectedDealerId || undefined} />
        </TabsContent>

        <TabsContent value="dms" className="space-y-4">
          <StockDMSConfig dealerId={selectedDealerId || undefined} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <StockSyncHistory dealerId={selectedDealerId || undefined} />
        </TabsContent>
      </Tabs>
    </div>
  );
};