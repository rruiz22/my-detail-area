/**
 * Notification Delivery Tracking Types
 * Enterprise-grade type definitions for delivery status tracking
 */

export type DeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'clicked' | 'read';
export type DeliveryChannel = 'push' | 'email' | 'in_app' | 'sms';

/**
 * Delivery metadata from notification_delivery_log table
 */
export interface DeliveryMetadata {
  channel: DeliveryChannel;
  provider?: string;
  sent_at?: string;
  delivered_at?: string;
  clicked_at?: string;
  read_at?: string;
  failed_at?: string;
  latency_ms?: number;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  cost?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Notification delivery log entry
 */
export interface NotificationDeliveryLog {
  id: string;
  notification_id: string;
  user_id: string;
  dealer_id: number;
  status: DeliveryStatus;
  channel: DeliveryChannel;
  provider?: string;
  sent_at?: string;
  delivered_at?: string;
  clicked_at?: string;
  read_at?: string;
  failed_at?: string;
  latency_ms?: number;
  error_code?: string;
  error_message?: string;
  retry_count: number;
  cost?: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Extended notification with delivery tracking
 */
export interface NotificationWithDelivery {
  id: string;
  user_id: string;
  dealer_id: number;
  entity_type?: string;
  entity_id?: string;
  notification_type: string;
  channel: DeliveryChannel;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  status: DeliveryStatus;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  read_at?: string;
  // Delivery tracking
  delivery_log?: NotificationDeliveryLog;
  delivery_status?: DeliveryStatus;
  delivery_metadata?: DeliveryMetadata;
}

/**
 * Delivery stats for analytics
 */
export interface DeliveryStats {
  total_sent: number;
  total_delivered: number;
  total_failed: number;
  total_clicked: number;
  total_read: number;
  delivery_rate: number;
  failure_rate: number;
  click_rate: number;
  read_rate: number;
  avg_latency_ms: number;
}

/**
 * Retry options for failed deliveries
 */
export interface RetryOptions {
  max_retries?: number;
  retry_delay_ms?: number;
  exponential_backoff?: boolean;
}
