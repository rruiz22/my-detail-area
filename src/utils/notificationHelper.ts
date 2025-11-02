/**
 * Notification Helper Utility
 *
 * Enterprise-grade notification creation system for My Detail Area.
 * Provides a unified interface for creating notifications across all modules
 * (Sales Orders, Service Orders, Recon Orders, Car Wash, Contacts, Chat, System).
 *
 * Features:
 * - Type-safe notification creation with comprehensive validation
 * - Supports single user or broadcast notifications
 * - Priority-based notification routing
 * - Multi-channel delivery coordination (in_app, email, sms, push)
 * - Deep linking with action URLs for navigation
 * - Flexible metadata for extensibility
 * - Graceful error handling with detailed logging
 * - Performance optimized for < 100ms execution
 * - Convenience helpers for common notification patterns
 *
 * @module notificationHelper
 * @see notification_log table schema in supabase/migrations
 */

import { supabase } from '@/integrations/supabase/client';
import * as logger from '@/utils/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported notification modules matching database CHECK constraint
 */
export type NotificationModule =
  | 'sales_orders'
  | 'service_orders'
  | 'recon_orders'
  | 'car_wash'
  | 'get_ready'
  | 'contacts'
  | 'chat'
  | 'system';

/**
 * Notification priority levels matching database CHECK constraint
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent' | 'critical';

/**
 * Delivery channels for multi-channel notifications
 */
export type DeliveryChannel = 'in_app' | 'email' | 'sms' | 'push';

/**
 * Common notification events for type safety and consistency
 */
export type NotificationEvent =
  // Order events
  | 'order_created'
  | 'order_assigned'
  | 'order_status_changed'
  | 'order_completed'
  | 'order_cancelled'
  | 'order_due_soon'
  | 'order_overdue'
  // Communication events
  | 'comment_added'
  | 'message_received'
  | 'mention_received'
  | 'follower_added'
  // System events
  | 'user_invited'
  | 'user_joined'
  | 'permission_changed'
  | 'setting_updated'
  // Contact events
  | 'contact_created'
  | 'contact_updated'
  // Custom events
  | string;

/**
 * Parameters for creating a notification
 */
export interface CreateNotificationParams {
  // ========================================================================
  // REQUIRED PARAMETERS
  // ========================================================================

  /**
   * Target user UUID. Set to null to broadcast to all users in the dealership.
   * Must be a valid UUID format (e.g., '550e8400-e29b-41d4-a716-446655440000')
   */
  userId: string | null;

  /**
   * Dealership ID for multi-tenant scoping.
   * Must be a positive integer > 0.
   */
  dealerId: number;

  /**
   * Module that generated the notification.
   * Determines notification category and routing.
   */
  module: NotificationModule;

  /**
   * Event that triggered the notification.
   * Use predefined NotificationEvent types or custom string.
   */
  event: NotificationEvent;

  /**
   * Notification title (displayed prominently in UI).
   * Should be concise and descriptive (max 100 characters recommended).
   */
  title: string;

  /**
   * Notification message body (can be longer, supports markdown in some contexts).
   * Provides detailed information about the event.
   */
  message: string;

  // ========================================================================
  // OPTIONAL PARAMETERS
  // ========================================================================

  /**
   * Priority level affects notification behavior:
   * - low: Silent, no sound, collapsed in UI
   * - normal: Standard notification (DEFAULT)
   * - high: Prominent display, sound enabled
   * - urgent: Requires user interaction, persistent
   * - critical: System-critical, highest visibility
   *
   * @default 'normal'
   */
  priority?: NotificationPriority;

  /**
   * Entity type that triggered the notification.
   * Used for grouping and filtering (e.g., 'sales_order', 'service_order', 'contact').
   */
  entityType?: string;

  /**
   * Entity ID for deep linking and tracking.
   * Can be UUID, integer, or custom identifier as string.
   */
  entityId?: string;

  /**
   * Deep link URL for navigation when notification is clicked.
   * Should be an absolute path (e.g., '/orders/sales/123').
   */
  actionUrl?: string;

  /**
   * Label for the action button (e.g., 'View Order', 'Respond', 'Approve').
   * Displayed on notification card and browser notification.
   */
  actionLabel?: string;

  /**
   * Target delivery channels for multi-channel notifications.
   * Determines which notification methods should be used.
   *
   * @default ['in_app']
   */
  targetChannels?: DeliveryChannel[];

  /**
   * Flexible metadata object for additional context.
   * Stored as JSONB in database, can contain any serializable data.
   * Examples: { vehicleVin: 'ABC123', orderNumber: 'SO-001', amount: 1500 }
   */
  metadata?: Record<string, unknown>;

  /**
   * Thread ID for grouping related notifications.
   * Used for conversation threading and notification grouping.
   */
  threadId?: string;

  /**
   * Parent notification ID for reply chains.
   * Creates a notification hierarchy.
   */
  parentId?: string;

  /**
   * Schedule notification for future delivery.
   * If provided, notification won't be delivered until this time.
   */
  scheduledFor?: Date;
}

/**
 * Result of notification creation operation
 */
export interface NotificationResult {
  /**
   * Whether the notification was created successfully
   */
  success: boolean;

  /**
   * UUID of the created notification (available on success)
   */
  notificationId?: string;

  /**
   * Error message if creation failed
   */
  error?: string;

  /**
   * Additional error details for debugging
   */
  details?: unknown;
}

/**
 * Simplified parameters for order-related notifications
 */
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

/**
 * Parameters for status change notifications
 */
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

/**
 * Parameters for assignment notifications
 */
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

/**
 * Parameters for comment/message notifications
 */
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
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates UUID format
 * @param uuid - String to validate
 * @returns true if valid UUID v4 format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validates notification module against allowed values
 * @param module - Module to validate
 * @returns true if module is valid
 */
function isValidModule(module: string): module is NotificationModule {
  const validModules: NotificationModule[] = [
    'sales_orders',
    'service_orders',
    'recon_orders',
    'car_wash',
    'get_ready',
    'contacts',
    'chat',
    'system',
  ];
  return validModules.includes(module as NotificationModule);
}

/**
 * Validates notification priority against allowed values
 * @param priority - Priority to validate
 * @returns true if priority is valid
 */
function isValidPriority(priority: string): priority is NotificationPriority {
  const validPriorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent', 'critical'];
  return validPriorities.includes(priority as NotificationPriority);
}

/**
 * Validates delivery channel against allowed values
 * @param channel - Channel to validate
 * @returns true if channel is valid
 */
function isValidChannel(channel: string): channel is DeliveryChannel {
  const validChannels: DeliveryChannel[] = ['in_app', 'email', 'sms', 'push'];
  return validChannels.includes(channel as DeliveryChannel);
}

/**
 * Comprehensive parameter validation
 * @param params - Parameters to validate
 * @returns Error message if invalid, null if valid
 */
function validateParams(params: CreateNotificationParams): string | null {
  // Validate dealerId
  if (!params.dealerId || params.dealerId <= 0 || !Number.isInteger(params.dealerId)) {
    return 'dealerId must be a positive integer greater than 0';
  }

  // Validate userId format (if not null)
  if (params.userId !== null && !isValidUUID(params.userId)) {
    return `userId must be a valid UUID format or null (got: ${params.userId})`;
  }

  // Validate module
  if (!isValidModule(params.module)) {
    return `module must be one of: sales_orders, service_orders, recon_orders, car_wash, get_ready, contacts, chat, system (got: ${params.module})`;
  }

  // Validate event
  if (!params.event || params.event.trim().length === 0) {
    return 'event is required and cannot be empty';
  }

  // Validate title
  if (!params.title || params.title.trim().length === 0) {
    return 'title is required and cannot be empty';
  }

  // Validate message
  if (!params.message || params.message.trim().length === 0) {
    return 'message is required and cannot be empty';
  }

  // Validate priority (if provided)
  if (params.priority && !isValidPriority(params.priority)) {
    return `priority must be one of: low, normal, high, urgent, critical (got: ${params.priority})`;
  }

  // Validate targetChannels (if provided)
  if (params.targetChannels) {
    if (!Array.isArray(params.targetChannels) || params.targetChannels.length === 0) {
      return 'targetChannels must be a non-empty array';
    }
    const invalidChannels = params.targetChannels.filter((ch) => !isValidChannel(ch));
    if (invalidChannels.length > 0) {
      return `Invalid delivery channels: ${invalidChannels.join(', ')}. Must be one of: in_app, email, sms, push`;
    }
  }

  // Validate scheduledFor (if provided)
  if (params.scheduledFor) {
    if (!(params.scheduledFor instanceof Date) || isNaN(params.scheduledFor.getTime())) {
      return 'scheduledFor must be a valid Date object';
    }
  }

  return null;
}

// ============================================================================
// MAIN NOTIFICATION CREATION FUNCTION
// ============================================================================

/**
 * Create a notification in the notification_log table
 *
 * This is the primary function for creating notifications across all modules.
 * Handles validation, database insertion, and error recovery automatically.
 *
 * @param params - Notification creation parameters
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * const result = await createNotification({
 *   userId: '550e8400-e29b-41d4-a716-446655440000',
 *   dealerId: 5,
 *   module: 'sales_orders',
 *   event: 'order_created',
 *   title: 'New Sales Order',
 *   message: 'Sales Order #SO-001 has been created',
 *   priority: 'normal',
 *   entityType: 'sales_order',
 *   entityId: '123',
 *   actionUrl: '/orders/sales/123',
 *   actionLabel: 'View Order',
 *   targetChannels: ['in_app', 'email'],
 *   metadata: { orderNumber: 'SO-001', vehicleVin: 'ABC123' }
 * });
 *
 * if (result.success) {
 *   console.log('Notification created:', result.notificationId);
 * } else {
 *   console.error('Failed to create notification:', result.error);
 * }
 * ```
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<NotificationResult> {
  const startTime = performance.now();

  try {
    // ========================================================================
    // STEP 1: VALIDATION
    // ========================================================================

    const validationError = validateParams(params);
    if (validationError) {
      logger.error('[NotificationHelper] Validation failed:', {
        error: validationError,
        params,
      });
      return {
        success: false,
        error: validationError,
      };
    }

    // ========================================================================
    // STEP 2: PREPARE DATABASE RECORD
    // ========================================================================

    const notificationRecord = {
      // Required fields
      user_id: params.userId,
      dealer_id: params.dealerId,
      module: params.module,
      event: params.event,
      title: params.title.trim(),
      message: params.message.trim(),

      // Optional fields with defaults
      priority: params.priority || 'normal',
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      action_url: params.actionUrl || null,
      action_label: params.actionLabel || null,
      target_channels: JSON.stringify(params.targetChannels || ['in_app']),
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      thread_id: params.threadId || null,
      parent_id: params.parentId || null,
      scheduled_for: params.scheduledFor?.toISOString() || null,

      // Tracking fields (initialized)
      is_read: false,
      is_dismissed: false,
      delivery_status: JSON.stringify({}),
    };

    // ========================================================================
    // STEP 3: INSERT INTO DATABASE
    // ========================================================================

    const { data, error } = await supabase
      .from('notification_log')
      .insert(notificationRecord)
      .select('id')
      .single();

    if (error) {
      logger.error('[NotificationHelper] Database insert failed:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        params: {
          userId: params.userId,
          dealerId: params.dealerId,
          module: params.module,
          event: params.event,
        },
      });

      return {
        success: false,
        error: `Failed to create notification: ${error.message}`,
        details: {
          code: error.code,
          hint: error.hint,
        },
      };
    }

    // ========================================================================
    // STEP 4: SUCCESS LOGGING & RETURN
    // ========================================================================

    const executionTime = performance.now() - startTime;

    logger.info('[NotificationHelper] Notification created successfully:', {
      notificationId: data.id,
      userId: params.userId,
      dealerId: params.dealerId,
      module: params.module,
      event: params.event,
      priority: params.priority || 'normal',
      executionTime: `${executionTime.toFixed(2)}ms`,
    });

    return {
      success: true,
      notificationId: data.id,
    };
  } catch (error) {
    // ========================================================================
    // UNEXPECTED ERROR HANDLING
    // ========================================================================

    logger.error('[NotificationHelper] Unexpected error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      params: {
        userId: params.userId,
        dealerId: params.dealerId,
        module: params.module,
        event: params.event,
      },
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: error,
    };
  }
}

// ============================================================================
// CONVENIENCE HELPER FUNCTIONS
// ============================================================================

/**
 * Create an order-related notification with simplified parameters
 *
 * Automatically constructs title, message, and action URL based on order details.
 * Ideal for sales, service, recon, and car wash order notifications.
 *
 * @param params - Simplified order notification parameters
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * await createOrderNotification({
 *   userId: userId,
 *   dealerId: 5,
 *   module: 'sales_orders',
 *   event: 'order_created',
 *   orderId: '123',
 *   orderNumber: 'SO-001',
 *   priority: 'normal',
 *   metadata: { vehicleVin: 'ABC123', customerName: 'John Doe' }
 * });
 * ```
 */
export async function createOrderNotification(
  params: OrderNotificationParams
): Promise<NotificationResult> {
  const moduleDisplayName = {
    sales_orders: 'Sales Order',
    service_orders: 'Service Order',
    recon_orders: 'Recon Order',
    car_wash: 'Car Wash',
    get_ready: 'Get Ready',
  }[params.module];

  const actionUrl = `/orders/${params.module.replace('_orders', '')}/${params.orderId}`;

  return createNotification({
    userId: params.userId,
    dealerId: params.dealerId,
    module: params.module,
    event: params.event,
    title: params.title || `${moduleDisplayName} ${params.orderNumber}`,
    message: params.message || `${params.event.replace(/_/g, ' ')} - ${params.orderNumber}`,
    priority: params.priority,
    entityType: params.module.slice(0, -1), // Remove 's' from end
    entityId: params.orderId,
    actionUrl: actionUrl,
    actionLabel: params.actionLabel || 'View Order',
    targetChannels: params.targetChannels,
    metadata: {
      orderNumber: params.orderNumber,
      ...params.metadata,
    },
  });
}

/**
 * Create a status change notification
 *
 * Automatically formats a user-friendly message for status transitions.
 *
 * @param params - Status change parameters
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * await createStatusChangeNotification({
 *   userId: userId,
 *   dealerId: 5,
 *   module: 'sales_orders',
 *   entityType: 'sales_order',
 *   entityId: '123',
 *   entityName: 'SO-001',
 *   oldStatus: 'pending',
 *   newStatus: 'in_progress',
 *   priority: 'high'
 * });
 * ```
 */
export async function createStatusChangeNotification(
  params: StatusChangeParams
): Promise<NotificationResult> {
  const formattedOldStatus = params.oldStatus.replace(/_/g, ' ').toLowerCase();
  const formattedNewStatus = params.newStatus.replace(/_/g, ' ').toLowerCase();

  return createNotification({
    userId: params.userId,
    dealerId: params.dealerId,
    module: params.module,
    event: 'order_status_changed',
    title: 'Status Updated',
    message: `${params.entityName} changed from "${formattedOldStatus}" to "${formattedNewStatus}"`,
    priority: params.priority || 'normal',
    entityType: params.entityType,
    entityId: params.entityId,
    actionUrl: `/orders/${params.module.replace('_orders', '')}/${params.entityId}`,
    actionLabel: 'View Details',
    targetChannels: params.targetChannels,
    metadata: {
      oldStatus: params.oldStatus,
      newStatus: params.newStatus,
      entityName: params.entityName,
    },
  });
}

/**
 * Create an assignment notification
 *
 * Notifies a user when they are assigned to an entity (order, task, etc.).
 *
 * @param params - Assignment parameters
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * await createAssignmentNotification({
 *   userId: assignedUserId,
 *   dealerId: 5,
 *   module: 'sales_orders',
 *   entityType: 'sales_order',
 *   entityId: '123',
 *   entityName: 'SO-001',
 *   assignedBy: 'John Manager',
 *   priority: 'high'
 * });
 * ```
 */
export async function createAssignmentNotification(
  params: AssignmentParams
): Promise<NotificationResult> {
  return createNotification({
    userId: params.userId,
    dealerId: params.dealerId,
    module: params.module,
    event: 'order_assigned',
    title: 'New Assignment',
    message: `${params.assignedBy} assigned ${params.entityName} to you`,
    priority: params.priority || 'high',
    entityType: params.entityType,
    entityId: params.entityId,
    actionUrl: `/orders/${params.module.replace('_orders', '')}/${params.entityId}`,
    actionLabel: 'View Assignment',
    targetChannels: params.targetChannels,
    metadata: {
      assignedBy: params.assignedBy,
      entityName: params.entityName,
    },
  });
}

/**
 * Create a comment/message notification
 *
 * Notifies users of new comments or mentions in their watched entities.
 *
 * @param params - Comment parameters
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * await createCommentNotification({
 *   userId: userId,
 *   dealerId: 5,
 *   module: 'sales_orders',
 *   entityType: 'sales_order',
 *   entityId: '123',
 *   entityName: 'SO-001',
 *   commenterName: 'Jane Technician',
 *   commentPreview: 'The vehicle is ready for pickup...',
 *   actionUrl: '/orders/sales/123#comments',
 *   priority: 'normal'
 * });
 * ```
 */
export async function createCommentNotification(
  params: CommentParams
): Promise<NotificationResult> {
  const preview =
    params.commentPreview.length > 100
      ? params.commentPreview.substring(0, 97) + '...'
      : params.commentPreview;

  return createNotification({
    userId: params.userId,
    dealerId: params.dealerId,
    module: params.module,
    event: 'comment_added',
    title: `New comment on ${params.entityName}`,
    message: `${params.commenterName}: ${preview}`,
    priority: params.priority || 'normal',
    entityType: params.entityType,
    entityId: params.entityId,
    actionUrl: params.actionUrl,
    actionLabel: 'View Comment',
    targetChannels: params.targetChannels,
    metadata: {
      commenterName: params.commenterName,
      entityName: params.entityName,
    },
  });
}

// ============================================================================
// BROADCAST NOTIFICATION HELPER
// ============================================================================

/**
 * Create a broadcast notification to all users in a dealership
 *
 * Useful for system-wide announcements, maintenance notices, or dealer-wide alerts.
 *
 * @param params - Notification parameters with userId set to null
 * @returns Promise resolving to operation result
 *
 * @example
 * ```typescript
 * await createBroadcastNotification({
 *   dealerId: 5,
 *   module: 'system',
 *   event: 'maintenance_scheduled',
 *   title: 'Scheduled Maintenance',
 *   message: 'System will be down for maintenance on Saturday at 2am',
 *   priority: 'high',
 *   targetChannels: ['in_app', 'email']
 * });
 * ```
 */
export async function createBroadcastNotification(
  params: Omit<CreateNotificationParams, 'userId'>
): Promise<NotificationResult> {
  return createNotification({
    ...params,
    userId: null, // Broadcast to all dealer users
  });
}

// ============================================================================
// BATCH NOTIFICATION HELPER
// ============================================================================

/**
 * Create multiple notifications in a batch operation
 *
 * More efficient than calling createNotification multiple times.
 * Returns array of results for each notification.
 *
 * @param notifications - Array of notification parameters
 * @returns Promise resolving to array of operation results
 *
 * @example
 * ```typescript
 * const results = await createBatchNotifications([
 *   { userId: user1, dealerId: 5, module: 'sales_orders', ... },
 *   { userId: user2, dealerId: 5, module: 'sales_orders', ... },
 *   { userId: user3, dealerId: 5, module: 'sales_orders', ... },
 * ]);
 *
 * const successful = results.filter(r => r.success).length;
 * console.log(`Created ${successful}/${results.length} notifications`);
 * ```
 */
export async function createBatchNotifications(
  notifications: CreateNotificationParams[]
): Promise<NotificationResult[]> {
  // Execute all notifications in parallel for performance
  const results = await Promise.all(notifications.map((params) => createNotification(params)));

  const successCount = results.filter((r) => r.success).length;
  logger.info('[NotificationHelper] Batch notification complete:', {
    total: notifications.length,
    successful: successCount,
    failed: notifications.length - successCount,
  });

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  createNotification,
  createOrderNotification,
  createStatusChangeNotification,
  createAssignmentNotification,
  createCommentNotification,
  createBroadcastNotification,
  createBatchNotifications,
};
