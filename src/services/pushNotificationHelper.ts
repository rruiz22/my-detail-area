import { supabase } from '@/integrations/supabase/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Payload for sending push notification via Edge Function
 */
export interface SendNotificationPayload {
  userId: string;
  dealerId: number;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Response from send-notification Edge Function
 */
export interface NotificationResponse {
  success: boolean;
  sent: number;
  failed: number;
  tokens: string[];
  errors?: string[];
}

/**
 * Order follower data structure
 */
interface OrderFollower {
  user_id: string;
  notification_level: 'all' | 'important' | 'none';
}

/**
 * Dealer member data structure
 */
interface DealerMember {
  user_id: string;
}

// ============================================================================
// PUSH NOTIFICATION HELPER SERVICE
// ============================================================================

/**
 * Enterprise-grade Push Notification Helper Service
 *
 * Provides a clean API to send push notifications using the Supabase Edge Function
 * /functions/v1/send-notification with proper error handling and logging.
 *
 * @example
 * ```typescript
 * // Send to specific user
 * await pushNotificationHelper.sendNotification({
 *   userId: 'user-id',
 *   dealerId: 5,
 *   title: 'Order Updated',
 *   body: 'Your order #12345 has been updated',
 *   url: '/orders/12345'
 * });
 *
 * // Notify order followers
 * await pushNotificationHelper.notifyOrderFollowers(
 *   '123',
 *   'New Comment',
 *   'John added a comment to this order'
 * );
 * ```
 */
class PushNotificationHelper {
  private readonly EDGE_FUNCTION_NAME = 'send-notification';

  /**
   * Send push notification to a specific user
   *
   * @param payload - Notification payload with user ID, dealer ID, title, body, optional URL and data
   * @returns Promise with notification response indicating success/failure
   *
   * @example
   * ```typescript
   * const response = await sendNotification({
   *   userId: 'abc123',
   *   dealerId: 5,
   *   title: 'Vehicle Ready',
   *   body: 'Your vehicle is ready for pickup',
   *   url: '/orders/456',
   *   data: { orderId: '456', type: 'completion' }
   * });
   *
   * if (response.success) {
   *   console.log(`Sent to ${response.sent} device(s)`);
   * }
   * ```
   */
  async sendNotification(payload: SendNotificationPayload): Promise<NotificationResponse> {
    try {
      console.log('[PushNotificationHelper] Sending notification:', {
        userId: payload.userId,
        dealerId: payload.dealerId,
        title: payload.title,
        hasUrl: !!payload.url,
        hasData: !!payload.data,
      });

      // Invoke Supabase Edge Function
      const { data, error } = await supabase.functions.invoke<NotificationResponse>(
        this.EDGE_FUNCTION_NAME,
        {
          body: payload,
        }
      );

      if (error) {
        const errorMsg = error.message || String(error);

        // Check if it's a 404 - could be no tokens or function not deployed
        if (errorMsg.includes('404') || errorMsg.toLowerCase().includes('not found')) {
          // Check if it's specifically "no tokens" message
          if (errorMsg.toLowerCase().includes('no active fcm tokens') ||
              errorMsg.toLowerCase().includes('tokens found')) {
            console.info('ℹ️ [PushNotificationHelper] No active push tokens for user (this is normal if notifications are not enabled)');
            return {
              success: true, // Not an error - user just hasn't enabled push
              sent: 0,
              failed: 0,
              total: 0,
              message: 'No active push notification tokens',
              errors: []
            };
          }

          // Otherwise, function might not be deployed
          console.info('ℹ️ [PushNotificationHelper] Edge Function not available (non-critical)');
          return {
            success: false,
            sent: 0,
            failed: 0,
            total: 0,
            message: 'Push notification service not available (non-critical)',
            errors: []
          };
        }

        // Only log as error if it's NOT a "no tokens" issue
        if (!errorMsg.toLowerCase().includes('no active') && !errorMsg.toLowerCase().includes('404')) {
          console.error('[PushNotificationHelper] Edge Function error:', error);
        }
        return this.createErrorResponse(error.message);
      }

      if (!data) {
        console.error('[PushNotificationHelper] No data returned from Edge Function');
        return this.createErrorResponse('No data returned from notification service');
      }

      console.log('[PushNotificationHelper] Notification sent successfully:', {
        sent: data.sent,
        failed: data.failed,
        tokens: data.tokens.length,
      });

      return data;
    } catch (error) {
      console.error('[PushNotificationHelper] Unexpected error:', error);
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Send push notifications to all active followers of an order
   *
   * This function queries the entity_followers table for active followers
   * and sends notifications to each follower respecting their notification level.
   *
   * **NEW**: Supports 4-level validation when module and eventType are provided.
   *
   * @param orderId - Order ID to fetch followers for
   * @param title - Notification title
   * @param body - Notification body text
   * @param options - Optional configuration (url, data, notificationLevel filter, module, eventType)
   * @returns Promise with aggregated notification response
   *
   * @example
   * ```typescript
   * // Notify all followers (legacy - no validation)
   * await notifyOrderFollowers(
   *   '123',
   *   'Order Status Changed',
   *   'Order #ABC123 status changed to In Progress'
   * );
   *
   * // Notify with validation (NEW)
   * await notifyOrderFollowers(
   *   '123',
   *   'New Comment',
   *   'John Doe added a comment',
   *   {
   *     url: '/orders/123?tab=comments',
   *     notificationLevel: 'all',
   *     module: 'sales_orders',
   *     eventType: 'comment_added'
   *   }
   * );
   * ```
   */
  async notifyOrderFollowers(
    orderId: string,
    title: string,
    body: string,
    options?: {
      url?: string;
      data?: Record<string, any>;
      notificationLevel?: 'all' | 'important';
      triggeredBy?: string;
      module?: string;
      eventType?: string;
    }
  ): Promise<NotificationResponse> {
    try {
      console.log('[PushNotificationHelper] Notifying order followers:', {
        orderId,
        title,
        notificationLevel: options?.notificationLevel,
        triggeredBy: options?.triggeredBy,
      });

      // Query active followers for this order
      let query = supabase
        .from('entity_followers')
        .select('user_id, notification_level, dealer_id')
        .eq('entity_type', 'order')
        .eq('entity_id', orderId)
        .eq('is_active', true)
        .neq('notification_level', 'none');

      // Filter by notification level if specified
      if (options?.notificationLevel) {
        query = query.eq('notification_level', options.notificationLevel);
      }

      // Filter out the user who triggered the change (self-exclusion)
      if (options?.triggeredBy) {
        query = query.neq('user_id', options.triggeredBy);
        console.log('``[PushNotificationHelper]`` Excluding trigger user: ' + options.triggeredBy);
      }

      const { data: followers, error: followersError } = await query;

      if (followersError) {
        console.error('[PushNotificationHelper] Error fetching followers:', followersError);
        return this.createErrorResponse(`Failed to fetch followers: ${followersError.message}`);
      }

      if (!followers || followers.length === 0) {
        console.log('[PushNotificationHelper] No followers found for order:', orderId);
        return {
          success: true,
          sent: 0,
          failed: 0,
          tokens: [],
        };
      }

      console.log(`[PushNotificationHelper] Found ${followers.length} follower(s) to notify`);

      // If module and eventType are provided, validate each follower
      let validatedFollowers = followers;
      if (options?.module && options?.eventType) {
        console.log('[PushNotificationHelper] Validating followers with 4-level check...');

        // Validate all followers in parallel
        const validationResults = await Promise.allSettled(
          followers.map(async (follower) => {
            const isEnabled = await this.isEnabledForUser(
              follower.user_id,
              follower.dealer_id,
              options.module!,
              options.eventType!
            );
            return { follower, isEnabled };
          })
        );

        // Filter to only enabled followers
        validatedFollowers = validationResults
          .filter((result): result is PromiseFulfilledResult<{ follower: any; isEnabled: boolean }> =>
            result.status === 'fulfilled' && result.value.isEnabled
          )
          .map(result => result.value.follower);

        console.log(`[PushNotificationHelper] After validation: ${validatedFollowers.length}/${followers.length} follower(s) eligible`);
      } else {
        console.log('[PushNotificationHelper] No module/eventType provided - skipping validation (legacy mode)');
      }

      // Send notifications to validated followers in parallel
      const results = await Promise.allSettled(
        validatedFollowers.map((follower) =>
          this.sendNotification({
            userId: follower.user_id,
            dealerId: follower.dealer_id,
            title,
            body,
            url: options?.url,
            data: {
              ...options?.data,
              orderId,
              entityType: 'order',
            },
          })
        )
      );

      // Aggregate results
      return this.aggregateResults(results);
    } catch (error) {
      console.error('[PushNotificationHelper] Error notifying followers:', error);
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Send push notifications to all active members of a dealership
   *
   * @param dealerId - Dealership ID
   * @param title - Notification title
   * @param body - Notification body text
   * @param options - Optional configuration (url, data)
   * @returns Promise with aggregated notification response
   *
   * @example
   * ```typescript
   * await notifyDealerMembers(
   *   5,
   *   'System Maintenance',
   *   'System will be down for maintenance at 2 AM',
   *   { url: '/announcements' }
   * );
   * ```
   */
  async notifyDealerMembers(
    dealerId: number,
    title: string,
    body: string,
    options?: {
      url?: string;
      data?: Record<string, any>;
    }
  ): Promise<NotificationResponse> {
    try {
      console.log('[PushNotificationHelper] Notifying dealer members:', {
        dealerId,
        title,
      });

      // Query active members for this dealership
      const { data: members, error: membersError } = await supabase
        .from('dealer_memberships')
        .select('user_id')
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      if (membersError) {
        console.error('[PushNotificationHelper] Error fetching members:', membersError);
        return this.createErrorResponse(`Failed to fetch members: ${membersError.message}`);
      }

      if (!members || members.length === 0) {
        console.log('[PushNotificationHelper] No members found for dealer:', dealerId);
        return {
          success: true,
          sent: 0,
          failed: 0,
          tokens: [],
        };
      }

      console.log(`[PushNotificationHelper] Found ${members.length} member(s) to notify`);

      // Send notifications to all members in parallel
      const results = await Promise.allSettled(
        members.map((member) =>
          this.sendNotification({
            userId: member.user_id,
            dealerId,
            title,
            body,
            url: options?.url,
            data: {
              ...options?.data,
              dealerId,
              entityType: 'dealer',
            },
          })
        )
      );

      // Aggregate results
      return this.aggregateResults(results);
    } catch (error) {
      console.error('[PushNotificationHelper] Error notifying members:', error);
      return this.createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred'
      );
    }
  }

  /**
   * Notify followers when an order status changes
   *
   * Convenience method that formats the notification message and sends to all followers
   * with 'all' notification level.
   *
   * **NEW**: Supports 4-level validation when module and eventType are provided.
   *
   * @param orderId - Order ID
   * @param orderNumber - Human-readable order number (e.g., "ABC123")
   * @param newStatus - New order status
   * @param changedBy - Name of user who changed the status
   * @param triggeredBy - User ID who triggered the change (excluded from notifications)
   * @param module - Optional module name for validation (e.g., 'sales_orders')
   * @param eventType - Optional event type for validation (default: 'order_status_changed')
   * @returns Promise with notification response
   *
   * @example
   * ```typescript
   * // Legacy mode (no validation)
   * await notifyOrderStatusChange(
   *   '123',
   *   'ABC123',
   *   'In Progress',
   *   'John Doe'
   * );
   *
   * // NEW: With validation
   * await notifyOrderStatusChange(
   *   '123',
   *   'ABC123',
   *   'In Progress',
   *   'John Doe',
   *   'user-id-123',
   *   'sales_orders',
   *   'order_status_changed'
   * );
   * ```
   */
  async notifyOrderStatusChange(
    orderId: string,
    orderNumber: string,
    newStatus: string,
    changedBy: string,
    triggeredBy?: string,
    module?: string,
    eventType: string = 'order_status_changed'
  ): Promise<void> {
    try {
      console.log('[PushNotificationHelper] Notifying order status change:', {
        orderId,
        orderNumber,
        newStatus,
        changedBy,
      });

      // Format status for display (e.g., "in_progress" → "In Progress")
      const { getStatusLabel } = await import('@/constants/orderStatus');
      const formattedStatus = getStatusLabel(newStatus as any) || newStatus;

      await this.notifyOrderFollowers(
        orderId,
        `Order ${orderNumber} Status Updated`,
        `${changedBy} changed status to ${formattedStatus}`,
        {
          url: `/orders/${orderId}`,
          data: {
            orderNumber,
            newStatus,
            changedBy,
            notificationType: 'status_change',
          },
          notificationLevel: 'all', // Status changes go to all followers
          triggeredBy, // Exclude user who made the change
          module, // NEW: Pass module for validation
          eventType, // NEW: Pass eventType for validation
        }
      );

      console.log('[PushNotificationHelper] Status change notification sent');
    } catch (error) {
      console.error('[PushNotificationHelper] Error notifying status change:', error);
      // Don't throw - notification failures should not break the main flow
    }
  }

  /**
   * Notify followers when a new comment is added to an order
   *
   * Convenience method that formats the notification message and sends to all followers
   * with 'all' notification level.
   *
   * @param orderId - Order ID
   * @param orderNumber - Human-readable order number (e.g., "ABC123")
   * @param commenterName - Name of user who commented
   * @param commentText - Comment text (will be truncated to 100 chars for notification)
   * @returns Promise with notification response
   *
   * @example
   * ```typescript
   * await notifyNewComment(
   *   '123',
   *   'ABC123',
   *   'Jane Smith',
   *   'The vehicle is ready for final inspection'
   * );
   * ```
   */
  async notifyNewComment(
    orderId: string,
    orderNumber: string,
    commenterName: string,
    commentText: string,
    module?: string,              // NEW: Optional module for validation
    eventType: string = 'comment_added'  // NEW: Event type with default
  ): Promise<NotificationResponse> {
    try {
      // Validate commentText
      if (!commentText || typeof commentText !== 'string') {
        console.warn('[PushNotificationHelper] Invalid comment text, skipping notification');
        return {
          success: false,
          sent: 0,
          failed: 0,
          total: 0,
          message: 'Invalid comment text',
          errors: []
        };
      }

      console.log('[PushNotificationHelper] Notifying new comment:', {
        orderId,
        orderNumber,
        commenterName,
        commentLength: commentText.length,
        module,        // NEW: Log module
        eventType,     // NEW: Log eventType
      });

      // Truncate comment for notification (keep it short)
      const truncatedComment =
        commentText.length > 100 ? `${commentText.substring(0, 100)}...` : commentText;

      const result = await this.notifyOrderFollowers(
        orderId,
        `New Comment on Order ${orderNumber}`,
        `${commenterName}: ${truncatedComment}`,
        {
          url: `/orders/${orderId}?tab=comments`,
          data: {
            orderNumber,
            commenterName,
            commentPreview: truncatedComment,
            notificationType: 'new_comment',
          },
          notificationLevel: 'all', // Comments go to all followers
          module,      // NEW: Pass module for validation
          eventType,   // NEW: Pass eventType for validation
        }
      );

      if (result.sent > 0) {
        console.log(`✅ [PushNotificationHelper] New comment notification sent to ${result.sent} user(s)`);
      } else {
        console.info(`ℹ️ [PushNotificationHelper] New comment notification attempted (no active push tokens found)`);
      }
      return result;
    } catch (error) {
      console.error('[PushNotificationHelper] Error notifying new comment:', error);
      // Don't throw - notification failures should not break the main flow
      return {
        success: false,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'Notification failed (non-critical)',
        errors: [String(error)]
      };
    }
  }

  /**
   * Notify followers when an attachment is added to an order
   *
   * @param orderId - Order ID
   * @param orderNumber - Human-readable order number
   * @param uploaderName - Name of user who uploaded the attachment
   * @param fileName - Name of the uploaded file
   * @returns Promise with notification response
   *
   * @example
   * ```typescript
   * await notifyNewAttachment(
   *   '123',
   *   'ABC123',
   *   'Mike Johnson',
   *   'inspection_report.pdf'
   * );
   * ```
   */
  async notifyNewAttachment(
    orderId: string,
    orderNumber: string,
    uploaderName: string,
    fileName: string,
    module?: string,              // NEW: Optional module for validation
    eventType: string = 'file_uploaded'  // NEW: Event type with default
  ): Promise<void> {
    try {
      console.log('[PushNotificationHelper] Notifying new attachment:', {
        orderId,
        orderNumber,
        uploaderName,
        fileName,
        module,        // NEW: Log module
        eventType,     // NEW: Log eventType
      });

      await this.notifyOrderFollowers(
        orderId,
        `New Attachment on Order ${orderNumber}`,
        `${uploaderName} uploaded ${fileName}`,
        {
          url: `/orders/${orderId}?tab=attachments`,
          data: {
            orderNumber,
            uploaderName,
            fileName,
            notificationType: 'new_attachment',
          },
          notificationLevel: 'all', // Attachments go to all followers
          module,      // NEW: Pass module for validation
          eventType,   // NEW: Pass eventType for validation
        }
      );

      console.log('[PushNotificationHelper] New attachment notification sent');
    } catch (error) {
      console.error('[PushNotificationHelper] Error notifying new attachment:', error);
      // Don't throw - notification failures should not break the main flow
    }
  }

  /**
   * Notify a user when they are assigned to an order
   *
   * @param userId - User ID being assigned
   * @param dealerId - Dealer ID
   * @param orderId - Order ID
   * @param orderNumber - Human-readable order number
   * @param assignedBy - Name of user who made the assignment
   * @returns Promise with notification response
   *
   * @example
   * ```typescript
   * await notifyOrderAssignment(
   *   'user-123',
   *   5,
   *   'order-456',
   *   'ABC123',
   *   'Manager Smith'
   * );
   * ```
   */
  async notifyOrderAssignment(
    userId: string,
    dealerId: number,
    orderId: string,
    orderNumber: string,
    assignedBy: string,
    module?: string,              // NEW: Optional module for validation
    eventType: string = 'order_assigned'  // NEW: Event type with default
  ): Promise<void> {
    try {
      console.log('[PushNotificationHelper] Notifying order assignment:', {
        userId,
        dealerId,
        orderId,
        orderNumber,
        assignedBy,
        module,        // NEW: Log module
        eventType,     // NEW: Log eventType
      });

      // NEW: Validate if push enabled for user (if module provided)
      if (module && eventType) {
        const isEnabled = await this.isEnabledForUser(userId, dealerId, module, eventType);
        if (!isEnabled) {
          console.log(`[PushNotificationHelper] Push disabled for user ${userId} - skipping assignment notification`);
          return;
        }
      }

      await this.sendNotification({
        userId,
        dealerId,
        title: `Assigned to Order ${orderNumber}`,
        body: `${assignedBy} assigned you to this order`,
        url: `/orders/${orderId}`,
        data: {
          orderId,
          orderNumber,
          assignedBy,
          notificationType: 'order_assignment',
        },
      });

      console.log('[PushNotificationHelper] Order assignment notification sent');
    } catch (error) {
      console.error('[PushNotificationHelper] Error notifying assignment:', error);
      // Don't throw - notification failures should not break the main flow
    }
  }

  /**
   * Check if push notifications are enabled for a specific user and event
   *
   * Implements 4-level validation cascade:
   * 1. Dealer enabled event for module (dealer_push_notification_preferences)
   * 2. User enabled push notifications (user_push_notification_preferences.push_enabled)
   * 3. User has active FCM token (fcm_tokens.is_active)
   * 4. Not within user's quiet hours (if enabled)
   *
   * @param userId - User ID to check
   * @param dealerId - Dealer ID to check
   * @param module - Module name (e.g., 'sales_orders', 'service_orders')
   * @param eventType - Event type (e.g., 'order_created', 'comment_added')
   * @returns Promise<boolean> - true if all validation levels pass, false otherwise
   *
   * @example
   * ```typescript
   * const canSend = await pushNotificationHelper.isEnabledForUser(
   *   'user-123',
   *   5,
   *   'sales_orders',
   *   'order_status_changed'
   * );
   *
   * if (canSend) {
   *   await pushNotificationHelper.sendNotification({...});
   * }
   * ```
   */
  async isEnabledForUser(
    userId: string,
    dealerId: number,
    module: string,
    eventType: string
  ): Promise<boolean> {
    try {
      console.log('[PushNotificationHelper] Checking if push enabled:', {
        userId,
        dealerId,
        module,
        eventType,
      });

      // Call Supabase RPC function for validation
      const { data, error } = await supabase.rpc('is_push_enabled_for_event', {
        p_user_id: userId,
        p_dealer_id: dealerId,
        p_module: module,
        p_event_type: eventType,
      });

      if (error) {
        console.error('[PushNotificationHelper] Error checking push enabled:', error);
        // Default to false on error (fail-safe)
        return false;
      }

      console.log('[PushNotificationHelper] Push enabled check result:', data);
      return data === true;
    } catch (error) {
      console.error('[PushNotificationHelper] Unexpected error in isEnabledForUser:', error);
      // Default to false on error (fail-safe)
      return false;
    }
  }

  /**
   * Get list of registered push notification devices for a user
   *
   * Returns active FCM tokens with device metadata (name, browser, OS, last used)
   *
   * @param userId - User ID to fetch devices for
   * @param dealerId - Dealer ID for scope validation
   * @returns Promise with array of device information
   *
   * @example
   * ```typescript
   * const devices = await pushNotificationHelper.getUserDevices('user-123', 5);
   * console.log(`User has ${devices.length} registered device(s)`);
   * devices.forEach(device => {
   *   console.log(`- ${device.device_name}: ${device.browser} on ${device.os}`);
   * });
   * ```
   */
  async getUserDevices(
    userId: string,
    dealerId: number
  ): Promise<
    Array<{
      id: string;
      device_name: string | null;
      browser: string | null;
      os: string | null;
      fcm_token: string;
      last_used_at: string | null;
      created_at: string;
    }>
  > {
    try {
      console.log('[PushNotificationHelper] Fetching user devices:', {
        userId,
        dealerId,
      });

      const { data: devices, error } = await supabase
        .from('fcm_tokens')
        .select('id, device_name, browser, os, fcm_token, last_used_at, created_at')
        .eq('user_id', userId)
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('[PushNotificationHelper] Error fetching devices:', error);
        return [];
      }

      console.log(`[PushNotificationHelper] Found ${devices?.length || 0} active device(s)`);
      return devices || [];
    } catch (error) {
      console.error('[PushNotificationHelper] Unexpected error in getUserDevices:', error);
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Create a standardized error response
   */
  private createErrorResponse(errorMessage: string): NotificationResponse {
    return {
      success: false,
      sent: 0,
      failed: 0,
      tokens: [],
      errors: [errorMessage],
    };
  }

  /**
   * Aggregate results from multiple Promise.allSettled calls
   */
  private aggregateResults(
    results: PromiseSettledResult<NotificationResponse>[]
  ): NotificationResponse {
    const aggregated: NotificationResponse = {
      success: false,
      sent: 0,
      failed: 0,
      tokens: [],
      errors: [],
    };

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const response = result.value;
        aggregated.sent += response.sent;
        aggregated.failed += response.failed;
        aggregated.tokens.push(...response.tokens);
        if (response.errors) {
          aggregated.errors?.push(...response.errors);
        }
      } else {
        // Promise was rejected
        aggregated.failed += 1;
        aggregated.errors?.push(result.reason?.message || 'Promise rejected');
      }
    }

    // Overall success if at least one notification was sent
    aggregated.success = aggregated.sent > 0;

    // Remove errors array if empty
    if (aggregated.errors?.length === 0) {
      delete aggregated.errors;
    }

    return aggregated;
  }
}

// ============================================================================
// EXPORT SINGLETON INSTANCE
// ============================================================================

/**
 * Singleton instance of PushNotificationHelper
 *
 * Use this instance throughout the application for consistency.
 */
export const pushNotificationHelper = new PushNotificationHelper();

// Also export the class for testing purposes
export { PushNotificationHelper };
