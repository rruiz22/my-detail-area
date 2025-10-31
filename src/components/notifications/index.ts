/**
 * Notification Components - Public API
 * Enterprise-grade notification system with delivery tracking
 */

// Main Components
export { NotificationBell } from './NotificationBell';
export { SmartNotificationCenter } from './SmartNotificationCenter';
export { NotificationItem } from './NotificationItem';

// Delivery Tracking Components
export { DeliveryStatusBadge, ChannelBadge } from './DeliveryStatusBadge';
export { DeliveryDetails } from './DeliveryDetails';

// Analytics (if exists)
export { NotificationAnalyticsDashboard } from './NotificationAnalyticsDashboard';

// Settings Components
export { NotificationPreferencesModal } from './NotificationPreferencesModal';
export { PushNotificationSettings } from './PushNotificationSettings';

// Types (re-export for convenience)
export type {
  DeliveryStatus,
  DeliveryChannel,
  DeliveryMetadata,
  NotificationDeliveryLog,
  NotificationWithDelivery,
  DeliveryStats,
  RetryOptions,
} from '@/types/notification-delivery';

export type {
  SmartNotification,
  NotificationGroup,
  UseSmartNotificationsReturn,
} from '@/hooks/useSmartNotifications';
