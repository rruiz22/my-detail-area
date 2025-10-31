/**
 * NotificationAnalyticsDashboard Component
 * Enterprise-grade analytics dashboard for notification system
 * Integrates all analytics components with real-time data from Supabase RPC functions
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Download, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

// Custom hooks
import { useNotificationMetrics } from '@/hooks/useNotificationMetrics';
import { useDeliveryTimeline } from '@/hooks/useDeliveryTimeline';
import { useProviderPerformance } from '@/hooks/useProviderPerformance';
import { useFailedDeliveries } from '@/hooks/useFailedDeliveries';

// Analytics components
import { MetricsOverview } from './MetricsOverview';
import { DeliveryTimelineChart } from './DeliveryTimelineChart';
import { EngagementFunnel } from './EngagementFunnel';
import { ChannelPerformanceChart } from './ChannelPerformanceChart';
import { ProviderComparisonChart } from './ProviderComparisonChart';
import { FailedDeliveriesTable } from './FailedDeliveriesTable';
import { FiltersPanel } from './FiltersPanel';

import type { AnalyticsFilters } from '@/types/notification-analytics';

interface NotificationAnalyticsDashboardProps {
  dealerId?: number;
  defaultFilters?: Partial<AnalyticsFilters>;
}

export const NotificationAnalyticsDashboard: React.FC<NotificationAnalyticsDashboardProps> = ({
  dealerId,
  defaultFilters,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  // Filters state
  const [filters, setFilters] = useState<AnalyticsFilters>({
    timeRange: defaultFilters?.timeRange || '7d',
    channels: defaultFilters?.channels,
    statuses: defaultFilters?.statuses,
    priorities: defaultFilters?.priorities,
    userSearch: defaultFilters?.userSearch,
  });

  // Fetch data using custom hooks
  const {
    deliveryMetrics,
    engagementMetrics,
    overview,
    loading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useNotificationMetrics(dealerId, filters);

  const {
    timeSeriesData,
    loading: timelineLoading,
    error: timelineError,
    refetch: refetchTimeline,
  } = useDeliveryTimeline(dealerId, filters);

  const {
    providers,
    loading: providersLoading,
    error: providersError,
    refetch: refetchProviders,
  } = useProviderPerformance(dealerId, filters);

  const {
    failures,
    loading: failuresLoading,
    error: failuresError,
    retry: retryDelivery,
    refetch: refetchFailures,
  } = useFailedDeliveries(dealerId, filters);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Handle refresh all data
  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchMetrics(),
        refetchTimeline(),
        refetchProviders(),
        refetchFailures(),
      ]);

      toast({
        title: t('notifications.analytics.refresh_success'),
        description: t('notifications.analytics.data_updated'),
        variant: 'default',
      });
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      toast({
        title: t('notifications.analytics.refresh_error'),
        description: t('notifications.analytics.refresh_error_message'),
        variant: 'destructive',
      });
    }
  }, [refetchMetrics, refetchTimeline, refetchProviders, refetchFailures, toast, t]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: AnalyticsFilters) => {
    setFilters(newFilters);
  }, []);

  // Handle filter reset
  const handleFiltersReset = useCallback(() => {
    setFilters({
      timeRange: '7d',
    });
  }, []);

  // Handle retry failed delivery
  const handleRetryDelivery = useCallback(
    async (id: string) => {
      try {
        await retryDelivery(id);
        toast({
          title: t('notifications.analytics.retry_success'),
          description: t('notifications.analytics.retry_success_message'),
          variant: 'default',
        });
      } catch (error) {
        console.error('Failed to retry delivery:', error);
        toast({
          title: t('notifications.analytics.retry_error'),
          description: t('notifications.analytics.retry_error_message'),
          variant: 'destructive',
        });
      }
    },
    [retryDelivery, toast, t]
  );

  // Show error states
  if (metricsError || timelineError || providersError || failuresError) {
    const error = metricsError || timelineError || providersError || failuresError;
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="text-red-500 text-lg font-medium mb-4">
            {t('notifications.analytics.error')}
          </div>
          <div className="text-gray-600 mb-6">{error?.message}</div>
          <Button onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('common.action_buttons.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t('notifications.analytics.title')}
          </h1>
          <p className="text-gray-600 mt-1">{t('notifications.analytics.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('notifications.analytics.filters.title')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={metricsLoading || timelineLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                metricsLoading || timelineLoading ? 'animate-spin' : ''
              }`}
            />
            {t('common.action_buttons.refresh')}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            {t('common.action_buttons.export')}
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6">
          <FiltersPanel
            filters={filters}
            onChange={handleFiltersChange}
            onReset={handleFiltersReset}
          />
        </div>
      )}

      {/* Metrics Overview */}
      <div className="mb-8">
        <MetricsOverview overview={overview} loading={metricsLoading} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="overview">{t('notifications.analytics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="performance">
            {t('notifications.analytics.tabs.performance')}
          </TabsTrigger>
          <TabsTrigger value="engagement">
            {t('notifications.analytics.tabs.engagement')}
          </TabsTrigger>
          <TabsTrigger value="failures">{t('notifications.analytics.tabs.failures')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <DeliveryTimelineChart data={timeSeriesData} loading={timelineLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChannelPerformanceChart data={deliveryMetrics} loading={metricsLoading} />
            <EngagementFunnel overview={overview} loading={metricsLoading} />
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6 mt-6">
          <ProviderComparisonChart data={providers} loading={providersLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DeliveryTimelineChart data={timeSeriesData} loading={timelineLoading} />
            <ChannelPerformanceChart data={deliveryMetrics} loading={metricsLoading} />
          </div>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6 mt-6">
          <EngagementFunnel overview={overview} loading={metricsLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DeliveryTimelineChart data={timeSeriesData} loading={timelineLoading} />
            <ChannelPerformanceChart data={deliveryMetrics} loading={metricsLoading} />
          </div>
        </TabsContent>

        {/* Failures Tab */}
        <TabsContent value="failures" className="space-y-6 mt-6">
          <FailedDeliveriesTable
            data={failures}
            loading={failuresLoading}
            onRetry={handleRetryDelivery}
          />
        </TabsContent>
      </Tabs>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span>{t('notifications.analytics.auto_refresh_enabled')}</span>
        </div>
      )}
    </div>
  );
};

export default NotificationAnalyticsDashboard;
