/**
 * Notification Analytics Type Definitions
 * Enterprise-grade types for notification delivery analytics system
 */

export type NotificationChannel = 'push' | 'email' | 'in_app' | 'sms';
export type NotificationStatus = 'sent' | 'delivered' | 'failed' | 'opened' | 'clicked';
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
export type TimeRange = '24h' | '7d' | '30d' | '90d' | 'custom';

// Delivery Metrics (from get_delivery_metrics RPC)
export interface DeliveryMetrics {
  channel: NotificationChannel;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  failure_rate: number;
  avg_delivery_time: number;
}

// Engagement Metrics (from get_engagement_metrics RPC)
export interface EngagementMetrics {
  channel: NotificationChannel;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  open_rate: number;
  click_rate: number;
  avg_time_to_open: number;
  avg_time_to_click: number;
}

// Provider Performance (from get_provider_performance RPC)
export interface ProviderPerformance {
  provider: string;
  channel: NotificationChannel;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  delivery_rate: number;
  avg_delivery_time: number;
  avg_cost: number;
}

// Failed Delivery (from get_failed_deliveries RPC)
export interface FailedDelivery {
  id: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  channel: NotificationChannel;
  provider: string;
  error_code?: string;
  error_message: string;
  retry_count: number;
  created_at: string;
  last_retry_at?: string;
}

// Delivery Timeline (from get_delivery_timeline RPC)
export interface DeliveryTimelinePoint {
  time_bucket: string;
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_opened: number;
  total_clicked: number;
  delivery_rate: number;
}

// User Delivery Summary (from get_user_delivery_summary RPC)
export interface UserDeliverySummary {
  user_id: string;
  user_email?: string;
  user_name?: string;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_failed: number;
  delivery_rate: number;
  engagement_rate: number;
  preferred_channel?: NotificationChannel;
}

// Analytics Overview (aggregated)
export interface AnalyticsOverview {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  avgTimeToRead: number;
  activeUsers: number;
  trend: TrendData;
}

// Trend Data
export interface TrendData {
  value: number;
  change: number;
  percentage: number;
  direction: 'up' | 'down' | 'stable';
}

// Chart Data Types
export interface TimeSeriesData {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
}

export interface ChannelDistribution {
  channel: NotificationChannel;
  value: number;
  percentage: number;
  color: string;
}

export interface FunnelStageData {
  stage: 'sent' | 'delivered' | 'opened' | 'clicked';
  value: number;
  percentage: number;
  dropOff: number;
}

// Heatmap Data
export interface HeatmapCell {
  hour: number;
  day: number;
  value: number;
  count: number;
}

export interface TimeToReadHeatmap {
  dayOfWeek: string;
  hours: Array<{
    hour: number;
    avgTimeToRead: number;
    count: number;
  }>;
}

// Filter Options
export interface AnalyticsFilters {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  channels?: NotificationChannel[];
  statuses?: NotificationStatus[];
  priorities?: NotificationPriority[];
  providers?: string[];
  userSearch?: string;
}

// Export Configuration
export interface ExportConfig {
  format: 'csv' | 'excel' | 'pdf';
  includeCharts: boolean;
  dateRange: {
    start: string;
    end: string;
  };
  sections: Array<
    | 'overview'
    | 'delivery'
    | 'engagement'
    | 'providers'
    | 'failures'
    | 'timeline'
    | 'users'
  >;
}

// API Response Types
export interface AnalyticsAPIResponse<T> {
  data: T;
  error?: string;
  timestamp: string;
}

// Hook Return Types
export interface UseNotificationMetricsReturn {
  deliveryMetrics: DeliveryMetrics[];
  engagementMetrics: EngagementMetrics[];
  overview: AnalyticsOverview;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseDeliveryTimelineReturn {
  timeline: DeliveryTimelinePoint[];
  timeSeriesData: TimeSeriesData[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseProviderPerformanceReturn {
  providers: ProviderPerformance[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseFailedDeliveriesReturn {
  failures: FailedDelivery[];
  totalCount: number;
  loading: boolean;
  error: Error | null;
  retry: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

// Real-time Update Types
export interface NotificationAnalyticsUpdate {
  type: 'delivery' | 'engagement' | 'failure';
  channel: NotificationChannel;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
