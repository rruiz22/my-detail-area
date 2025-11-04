// =====================================================
// UNIFIED NOTIFICATION SYSTEM TYPES
// =====================================================

/**
 * Unified notification interface that works with BOTH:
 * - notification_log (enterprise notification system)
 * - get_ready_notifications (Get Ready module notifications)
 *
 * This allows the bell icon to show notifications from both tables
 * until we fully migrate Get Ready to the unified system.
 */

// Priority levels (union of both systems)
export type UnifiedNotificationPriority =
  | 'low'
  | 'normal'
  | 'medium'
  | 'high'
  | 'urgent'
  | 'critical';

// Notification source (track which table it came from)
export type NotificationSource = 'notification_log' | 'get_ready_notifications';

// Module identifiers
export type NotificationModule =
  | 'get_ready'
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'contacts'
  | 'users'
  | 'reports'
  | 'chat'
  | 'system';

// Unified notification interface
export interface UnifiedNotification {
  // Identity
  id: string;
  user_id: string | null;
  dealer_id: number;

  // Content
  title: string;
  message: string;
  priority: UnifiedNotificationPriority;

  // Status
  is_read: boolean;
  is_dismissed: boolean;

  // Timestamps
  created_at: string;
  read_at?: string | null;

  // Actions (optional)
  action_url?: string | null;
  action_label?: string | null;

  // Metadata
  source: NotificationSource;
  module?: NotificationModule;

  // Additional metadata (flexible for both systems)
  metadata?: Record<string, unknown>;
}

// =====================================================
// NOTIFICATION_LOG SPECIFIC TYPES
// =====================================================

export interface NotificationData {
  entity_type?: string;
  entity_id?: string;
  action?: string;
  url?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SmartNotification {
  id: string;
  user_id: string;
  dealer_id: number;
  entity_type?: string;
  entity_id?: string;
  notification_type: string;
  channel: string;
  title: string;
  message: string;
  data: NotificationData | null;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read?: boolean;  // ✅ Campo que existe en notification_log
  created_at: string;
  read_at?: string;
}

// =====================================================
// GET_READY_NOTIFICATIONS SPECIFIC TYPES
// =====================================================

export type GetReadyNotificationType =
  | 'sla_warning'
  | 'sla_critical'
  | 'approval_pending'
  | 'approval_approved'
  | 'approval_rejected'
  | 'bottleneck_detected'
  | 'bottleneck_resolved'
  | 'vehicle_status_change'
  | 'work_item_completed'
  | 'work_item_created'
  | 'step_completed'
  | 'system_alert';

export interface GetReadyNotification {
  id: string;
  dealer_id: number;
  user_id: string | null;
  notification_type: GetReadyNotificationType;
  priority: 'low' | 'medium' | 'high' | 'critical';

  title: string;
  message: string;
  action_label?: string | null;
  action_url?: string | null;

  related_vehicle_id?: string | null;
  related_step_id?: string | null;
  related_work_item_id?: string | null;

  metadata?: Record<string, unknown>;

  is_read: boolean;
  read_at?: string | null;
  dismissed_at?: string | null;

  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

// =====================================================
// TRANSFORMATION UTILITIES
// =====================================================

/**
 * Transform notification_log entry to unified format
 */
export function transformSmartNotificationToUnified(
  notification: SmartNotification
): UnifiedNotification {
  return {
    id: notification.id,
    user_id: notification.user_id,
    dealer_id: notification.dealer_id,
    title: notification.title,
    message: notification.message,
    priority: notification.priority as UnifiedNotificationPriority,
    is_read: notification.is_read ?? false,  // ✅ FIX: Usar is_read directamente, no derivar de status
    is_dismissed: false, // notification_log doesn't have dismissed state
    created_at: notification.created_at,
    read_at: notification.read_at || null,
    action_url: notification.data?.url || null,
    action_label: notification.data?.action || null,
    source: 'notification_log',
    module: (notification.entity_type as NotificationModule) || 'system',
    metadata: notification.data || {},
  };
}

/**
 * Transform get_ready_notifications entry to unified format
 */
export function transformGetReadyToUnified(
  notification: GetReadyNotification
): UnifiedNotification {
  // Priority mapping: get_ready uses 'medium', notification_log uses 'normal'
  const mappedPriority = notification.priority === 'medium'
    ? 'normal'
    : notification.priority;

  return {
    id: notification.id,
    user_id: notification.user_id,
    dealer_id: notification.dealer_id,
    title: notification.title,
    message: notification.message,
    priority: mappedPriority as UnifiedNotificationPriority,
    is_read: notification.is_read,
    is_dismissed: notification.dismissed_at !== null,
    created_at: notification.created_at,
    read_at: notification.read_at,
    action_url: notification.action_url,
    action_label: notification.action_label,
    source: 'get_ready_notifications',
    module: 'get_ready',
    metadata: {
      notification_type: notification.notification_type,
      related_vehicle_id: notification.related_vehicle_id,
      related_step_id: notification.related_step_id,
      related_work_item_id: notification.related_work_item_id,
      ...notification.metadata,
    },
  };
}
