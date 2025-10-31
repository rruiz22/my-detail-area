/**
 * Custom Hooks - Public API
 * Enterprise-grade React hooks for MyDetailArea
 */

// Notification Hooks
export { useSmartNotifications } from './useSmartNotifications';
export { useDeliveryTracking } from './useDeliveryTracking';
export { useNotificationRetry } from './useNotificationRetry';
export { useNotifications } from './useNotifications';
export { useNotificationMetrics } from './useNotificationMetrics';

// Re-export types
export type { UseSmartNotificationsReturn } from './useSmartNotifications';
export type { SmartNotification, NotificationGroup } from './useSmartNotifications';
