/**
 * Notification Analytics Components
 * Barrel exports for all analytics dashboard components
 */

export { NotificationAnalyticsDashboard } from './NotificationAnalyticsDashboard';
export { MetricsOverview } from './MetricsOverview';
export { DeliveryTimelineChart } from './DeliveryTimelineChart';
export { EngagementFunnel } from './EngagementFunnel';
export { ChannelPerformanceChart } from './ChannelPerformanceChart';
export { ProviderComparisonChart } from './ProviderComparisonChart';
export { FailedDeliveriesTable } from './FailedDeliveriesTable';
export { FiltersPanel } from './FiltersPanel';

// Re-export types
export type {
  DeliveryMetrics,
  EngagementMetrics,
  ProviderPerformance,
  FailedDelivery,
  DeliveryTimelinePoint,
  TimeSeriesData,
  AnalyticsOverview,
  AnalyticsFilters,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  TimeRange,
} from '@/types/notification-analytics';
