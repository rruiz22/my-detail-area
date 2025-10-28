/**
 * Push Notification Helper - Real-World Integration Examples
 *
 * This file contains practical examples of how to integrate the pushNotificationHelper
 * service into various components of the MyDetailArea application.
 *
 * DO NOT import this file in production code - these are reference examples only.
 */

import { pushNotificationHelper } from './pushNotificationHelper';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// EXAMPLE 1: Order Status Change Component
// ============================================================================

/**
 * Order Status Change Button - Notifies followers when status changes
 */
export function OrderStatusChangeExample() {
  const { user, dealershipId } = useAuth();

  const handleStatusChange = async (
    orderId: string,
    orderNumber: string,
    newStatus: string
  ) => {
    try {
      // 1. Update order status in database
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);

      if (error) throw error;

      // 2. Show success message to user
      toast({
        title: 'Status Updated',
        description: `Order ${orderNumber} status changed to ${newStatus}`,
      });

      // 3. Notify all followers (non-blocking)
      pushNotificationHelper.notifyOrderStatusChange(
        orderId,
        orderNumber,
        newStatus,
        `${user?.firstName} ${user?.lastName}`
      );

      // Note: We don't await the notification - it runs in background
      // This ensures the UI remains responsive
    } catch (error) {
      console.error('Status change failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  return null; // Component implementation...
}

// ============================================================================
// EXAMPLE 2: Comment Form Component
// ============================================================================

/**
 * Comment Form - Notifies followers when new comment is added
 */
export function CommentFormExample() {
  const { user } = useAuth();

  const handleSubmitComment = async (
    orderId: string,
    orderNumber: string,
    commentText: string
  ) => {
    try {
      // 1. Insert comment into database
      const { data: comment, error } = await supabase
        .from('order_comments')
        .insert({
          order_id: orderId,
          user_id: user?.id,
          content: commentText,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Show success message
      toast({
        title: 'Comment Added',
        description: 'Your comment has been posted',
      });

      // 3. Notify followers (non-blocking)
      pushNotificationHelper.notifyNewComment(
        orderId,
        orderNumber,
        `${user?.firstName} ${user?.lastName}`,
        commentText
      );

      // 4. Clear form
      // setCommentText('');
    } catch (error) {
      console.error('Comment submission failed:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    }
  };

  return null; // Component implementation...
}

// ============================================================================
// EXAMPLE 3: File Upload Component
// ============================================================================

/**
 * Attachment Upload - Notifies followers when file is uploaded
 */
export function AttachmentUploadExample() {
  const { user } = useAuth();

  const handleFileUpload = async (
    file: File,
    orderId: string,
    orderNumber: string
  ) => {
    try {
      // 1. Upload file to Supabase Storage
      const filePath = `${orderId}/${Date.now()}-${file.name}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Save attachment record to database
      const { error: dbError } = await supabase
        .from('order_attachments')
        .insert({
          order_id: orderId,
          file_name: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user?.id,
        });

      if (dbError) throw dbError;

      // 3. Show success message
      toast({
        title: 'File Uploaded',
        description: `${file.name} has been uploaded successfully`,
      });

      // 4. Notify followers (non-blocking)
      pushNotificationHelper.notifyNewAttachment(
        orderId,
        orderNumber,
        `${user?.firstName} ${user?.lastName}`,
        file.name
      );
    } catch (error) {
      console.error('File upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    }
  };

  return null; // Component implementation...
}

// ============================================================================
// EXAMPLE 4: Order Assignment Component
// ============================================================================

/**
 * Order Assignment - Notifies user when assigned to order
 */
export function OrderAssignmentExample() {
  const { user, dealershipId } = useAuth();

  const handleAssignUser = async (
    orderId: string,
    orderNumber: string,
    assigneeUserId: string
  ) => {
    try {
      // 1. Create assignment record
      const { error: assignError } = await supabase
        .from('order_assignments')
        .insert({
          order_id: orderId,
          user_id: assigneeUserId,
          assigned_by: user?.id,
          assigned_at: new Date().toISOString(),
        });

      if (assignError) throw assignError;

      // 2. Auto-follow (using followersService)
      const { error: followError } = await supabase
        .from('entity_followers')
        .insert({
          entity_type: 'order',
          entity_id: orderId,
          user_id: assigneeUserId,
          dealer_id: dealershipId,
          follow_type: 'assigned',
          notification_level: 'all',
          followed_by: user?.id,
          is_active: true,
        });

      if (followError) throw followError;

      // 3. Show success message
      toast({
        title: 'User Assigned',
        description: 'User has been assigned to this order',
      });

      // 4. Notify assigned user (non-blocking)
      pushNotificationHelper.notifyOrderAssignment(
        assigneeUserId,
        dealershipId!,
        orderId,
        orderNumber,
        `${user?.firstName} ${user?.lastName}`
      );
    } catch (error) {
      console.error('Assignment failed:', error);
      toast({
        title: 'Assignment Failed',
        description: 'Failed to assign user to order',
        variant: 'destructive',
      });
    }
  };

  return null; // Component implementation...
}

// ============================================================================
// EXAMPLE 5: Custom Hook for Order Notifications
// ============================================================================

/**
 * Custom hook for order-related notifications
 *
 * Encapsulates all notification logic for orders in a reusable hook
 */
export function useOrderNotifications(orderId: string, orderNumber: string) {
  const { user } = useAuth();

  const notifyStatusChange = async (newStatus: string) => {
    await pushNotificationHelper.notifyOrderStatusChange(
      orderId,
      orderNumber,
      newStatus,
      `${user?.firstName} ${user?.lastName}`
    );
  };

  const notifyComment = async (commentText: string) => {
    await pushNotificationHelper.notifyNewComment(
      orderId,
      orderNumber,
      `${user?.firstName} ${user?.lastName}`,
      commentText
    );
  };

  const notifyAttachment = async (fileName: string) => {
    await pushNotificationHelper.notifyNewAttachment(
      orderId,
      orderNumber,
      `${user?.firstName} ${user?.lastName}`,
      fileName
    );
  };

  const notifyAssignment = async (assigneeUserId: string, dealerId: number) => {
    await pushNotificationHelper.notifyOrderAssignment(
      assigneeUserId,
      dealerId,
      orderId,
      orderNumber,
      `${user?.firstName} ${user?.lastName}`
    );
  };

  return {
    notifyStatusChange,
    notifyComment,
    notifyAttachment,
    notifyAssignment,
  };
}

// Usage example:
// const { notifyStatusChange, notifyComment } = useOrderNotifications(orderId, orderNumber);
// await notifyStatusChange('In Progress');

// ============================================================================
// EXAMPLE 6: Batch Notifications for Multiple Orders
// ============================================================================

/**
 * Batch notification example - Send to multiple users
 */
export async function batchNotifyExample() {
  const dealerId = 5;

  // Scenario: System maintenance notification to all dealers
  const response = await pushNotificationHelper.notifyDealerMembers(
    dealerId,
    'Scheduled Maintenance',
    'System will be down for maintenance tonight from 2-4 AM EST',
    {
      url: '/announcements',
      data: {
        maintenanceWindow: '2-4 AM EST',
        priority: 'high',
        type: 'system_maintenance',
      },
    }
  );

  console.log(`Maintenance notification sent to ${response.sent} users`);

  if (response.failed > 0) {
    console.warn(`Failed to send to ${response.failed} users:`, response.errors);
  }
}

// ============================================================================
// EXAMPLE 7: Conditional Notifications Based on Business Logic
// ============================================================================

/**
 * Send notifications based on business rules
 */
export async function conditionalNotificationExample(
  orderId: string,
  orderNumber: string,
  orderValue: number
) {
  // High-value orders notify managers
  if (orderValue > 50000) {
    const { data: managers } = await supabase
      .from('profiles')
      .select('id, dealership_id')
      .eq('user_type', 'manager')
      .eq('is_active', true);

    if (managers) {
      await Promise.allSettled(
        managers.map((manager) =>
          pushNotificationHelper.sendNotification({
            userId: manager.id,
            dealerId: manager.dealership_id,
            title: 'High-Value Order Alert',
            body: `Order ${orderNumber} ($${orderValue.toLocaleString()}) requires approval`,
            url: `/orders/${orderId}`,
            data: {
              orderId,
              orderNumber,
              orderValue,
              priority: 'high',
              notificationType: 'high_value_order',
            },
          })
        )
      );
    }
  }

  // Overdue orders notify followers
  const orderAge = Date.now() - new Date(orderId).getTime();
  const daysSinceCreation = orderAge / (1000 * 60 * 60 * 24);

  if (daysSinceCreation > 7) {
    await pushNotificationHelper.notifyOrderFollowers(
      orderId,
      'Overdue Order Alert',
      `Order ${orderNumber} has been pending for ${Math.floor(daysSinceCreation)} days`,
      {
        url: `/orders/${orderId}`,
        data: {
          daysPending: Math.floor(daysSinceCreation),
          priority: 'urgent',
          notificationType: 'overdue_order',
        },
        notificationLevel: 'important', // Only important notifications
      }
    );
  }
}

// ============================================================================
// EXAMPLE 8: Error Handling & Retry Logic
// ============================================================================

/**
 * Advanced error handling with retry logic
 */
export async function notificationWithRetryExample(
  orderId: string,
  orderNumber: string,
  newStatus: string
) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await pushNotificationHelper.notifyOrderStatusChange(
        orderId,
        orderNumber,
        newStatus,
        'System'
      );

      // Check if notification was successful
      if (response && typeof response === 'object' && 'success' in response) {
        // If we can access the response, log success
        console.log(`Notification sent successfully on attempt ${attempt + 1}`);
        return;
      }

      // If the convenience method doesn't return a response, assume success
      console.log(`Notification sent on attempt ${attempt + 1}`);
      return;
    } catch (error) {
      attempt++;
      console.error(`Notification attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error('All notification attempts failed');
        // Log to error tracking service (e.g., Sentry)
      }
    }
  }
}

// ============================================================================
// EXAMPLE 9: Real-time Notification Test Component
// ============================================================================

/**
 * Test component for sending notifications (development only)
 */
export function NotificationTesterExample() {
  const { user, dealershipId } = useAuth();

  const testNotification = async () => {
    if (!user || !dealershipId) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    // Send test notification to self
    const response = await pushNotificationHelper.sendNotification({
      userId: user.id,
      dealerId: dealershipId,
      title: 'Test Notification',
      body: 'This is a test notification from Push Notification Helper',
      url: '/',
      data: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    });

    if (response.success) {
      toast({
        title: 'Notification Sent',
        description: `Successfully sent to ${response.sent} device(s)`,
      });
    } else {
      toast({
        title: 'Notification Failed',
        description: response.errors?.join(', ') || 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold">Push Notification Tester</h2>
      <button
        onClick={testNotification}
        className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
      >
        Send Test Notification
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 10: Analytics Integration
// ============================================================================

/**
 * Track notification events for analytics
 */
export async function notificationWithAnalyticsExample(
  orderId: string,
  orderNumber: string,
  eventType: string
) {
  const startTime = Date.now();

  try {
    // Send notification
    const response = await pushNotificationHelper.notifyOrderFollowers(
      orderId,
      'Order Update',
      'Your order has been updated'
    );

    // Track success event
    await supabase.from('notification_analytics').insert({
      event_type: eventType,
      entity_type: 'order',
      entity_id: orderId,
      success: response.success,
      sent_count: response.sent,
      failed_count: response.failed,
      duration_ms: Date.now() - startTime,
      metadata: {
        orderNumber,
        tokens: response.tokens.length,
      },
    });

    return response;
  } catch (error) {
    // Track failure event
    await supabase.from('notification_analytics').insert({
      event_type: eventType,
      entity_type: 'order',
      entity_id: orderId,
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    });

    throw error;
  }
}

/**
 * NOTE: These are reference examples only.
 * Copy and adapt patterns to your actual components.
 * Do not import this file directly in production code.
 */
