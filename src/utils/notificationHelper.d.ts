/**
 * Type definitions for notificationHelper
 *
 * This file provides TypeScript type definitions for better IDE autocomplete
 * and type checking when using the notification helper utility.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type NotificationModule =
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'get_ready'
  | 'contacts'
  | 'chat'
  | 'system';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

export type DeliveryChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationEvent =
  | 'order_created'
  | 'order_assigned'
  | 'order_status_changed'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_due_soon'
  | 'order_overdue'
  | 'comment_added'
  | 'message_received'
  | 'mention_received'
  | 'follower_added'
  | 'user_invited'
  | 'user_joined'
  | 'permission_changed'
  | 'setting_updated'
  | 'contact_created'
  | 'contact_updated'
  | string;

// ============================================================================
// PARAMETER INTERFACES
// ============================================================================

export interface CreateNotificationParams {
  userId: string | null;
  dealerId: number;
  module: NotificationModule;
  event: NotificationEvent;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  targetChannels?: DeliveryChannel[];
  metadata?: Record<string, unknown>;
  threadId?: string;
  parentId?: string;
  scheduledFor?: Date;
}

export interface NotificationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
  details?: unknown;
}

export interface OrderNotificationParams {
  userId: string | null;
  dealerId: number;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' | 'get_ready';
  event: NotificationEvent;
  orderId: string;
  orderNumber: string;
  title?: string;
  message?: string;
  priority?: NotificationPriority;
  actionLabel?: string;
  targetChannels?: DeliveryChannel[];
  metadata?: Record<string, unknown>;
}

export interface StatusChangeParams {
  userId: string | null;
  dealerId: number;
  module: NotificationModule;
  entityType: string;
  entityId: string;
  entityName: string;
  oldStatus: string;
  newStatus: string;
  priority?: NotificationPriority;
  targetChannels?: DeliveryChannel[];
}

export interface AssignmentParams {
  userId: string;
  dealerId: number;
  module: NotificationModule;
  entityType: string;
  entityId: string;
  entityName: string;
  assignedBy: string;
  priority?: NotificationPriority;
  targetChannels?: DeliveryChannel[];
}

export interface CommentParams {
  userId: string;
  dealerId: number;
  module: NotificationModule;
  entityType: string;
  entityId: string;
  entityName: string;
  commenterName: string;
  commentPreview: string;
  actionUrl: string;
  priority?: NotificationPriority;
  targetChannels?: DeliveryChannel[];
}

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================

/**
 * Create a notification in the notification_log table
 */
export function createNotification(
  params: CreateNotificationParams
): Promise<NotificationResult>;

/**
 * Create an order-related notification with simplified parameters
 */
export function createOrderNotification(
  params: OrderNotificationParams
): Promise<NotificationResult>;

/**
 * Create a status change notification
 */
export function createStatusChangeNotification(
  params: StatusChangeParams
): Promise<NotificationResult>;

/**
 * Create an assignment notification
 */
export function createAssignmentNotification(
  params: AssignmentParams
): Promise<NotificationResult>;

/**
 * Create a comment/message notification
 */
export function createCommentNotification(
  params: CommentParams
): Promise<NotificationResult>;

/**
 * Create a broadcast notification to all users in a dealership
 */
export function createBroadcastNotification(
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<NotificationResult>;

/**
 * Create multiple notifications in a batch operation
 */
export function createBatchNotifications(
  notifications: CreateNotificationParams[]
): Promise<NotificationResult[]>;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

declare const notificationHelper: {
  createNotification: typeof createNotification;
  createOrderNotification: typeof createOrderNotification;
  createStatusChangeNotification: typeof createStatusChangeNotification;
  createAssignmentNotification: typeof createAssignmentNotification;
  createCommentNotification: typeof createCommentNotification;
  createBroadcastNotification: typeof createBroadcastNotification;
  createBatchNotifications: typeof createBatchNotifications;
};

export default notificationHelper;
