/**
 * Notification Helper - Example Usage
 *
 * Comprehensive examples demonstrating all notification creation patterns
 * for the My Detail Area enterprise notification system.
 *
 * This file shows real-world usage patterns across all modules.
 */

import {
  createNotification,
  createOrderNotification,
  createStatusChangeNotification,
  createAssignmentNotification,
  createCommentNotification,
  createBroadcastNotification,
  createBatchNotifications,
} from '@/utils/notificationHelper';

// ============================================================================
// EXAMPLE 1: BASIC NOTIFICATION CREATION
// ============================================================================

async function example1_BasicNotification() {
  // Create a simple notification when a new sales order is created
  const result = await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'New Sales Order',
    message: 'Sales Order #SO-001 has been created',
    priority: 'normal',
  });

  if (result.success) {
    console.log('Notification created:', result.notificationId);
  } else {
    console.error('Failed:', result.error);
  }
}

// ============================================================================
// EXAMPLE 2: NOTIFICATION WITH DEEP LINKING
// ============================================================================

async function example2_NotificationWithDeepLink() {
  // Notification with action URL for navigation
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'New Sales Order',
    message: 'Sales Order #SO-001 has been created',
    priority: 'high',
    entityType: 'sales_order',
    entityId: '123',
    actionUrl: '/orders/sales/123',
    actionLabel: 'View Order',
  });
}

// ============================================================================
// EXAMPLE 3: MULTI-CHANNEL NOTIFICATION
// ============================================================================

async function example3_MultiChannelNotification() {
  // Send notification through multiple channels
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_due_soon',
    title: 'Order Due Soon',
    message: 'Sales Order #SO-001 is due in 2 hours',
    priority: 'urgent',
    entityType: 'sales_order',
    entityId: '123',
    actionUrl: '/orders/sales/123',
    actionLabel: 'View Order',
    targetChannels: ['in_app', 'email', 'sms', 'push'], // All channels
  });
}

// ============================================================================
// EXAMPLE 4: NOTIFICATION WITH METADATA
// ============================================================================

async function example4_NotificationWithMetadata() {
  // Include flexible metadata for additional context
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'New Sales Order',
    message: 'Sales Order #SO-001 for 2024 Toyota Camry',
    priority: 'normal',
    entityType: 'sales_order',
    entityId: '123',
    actionUrl: '/orders/sales/123',
    actionLabel: 'View Order',
    metadata: {
      orderNumber: 'SO-001',
      vehicleVin: '1HGBH41JXMN109186',
      vehicleYear: 2024,
      vehicleMake: 'Toyota',
      vehicleModel: 'Camry',
      customerName: 'John Doe',
      estimatedCompletionDate: '2025-11-05',
      totalAmount: 45000,
    },
  });
}

// ============================================================================
// EXAMPLE 5: ORDER NOTIFICATION HELPER
// ============================================================================

async function example5_OrderNotification() {
  // Simplified order notification creation

  // Sales Order Created
  await createOrderNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    orderId: '123',
    orderNumber: 'SO-001',
    priority: 'normal',
    metadata: {
      vehicleVin: '1HGBH41JXMN109186',
      customerName: 'John Doe',
    },
  });

  // Service Order Assigned
  await createOrderNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'service_orders',
    event: 'order_assigned',
    orderId: '456',
    orderNumber: 'SRV-001',
    priority: 'high',
    actionLabel: 'Start Service',
    targetChannels: ['in_app', 'email'],
  });

  // Recon Order Completed
  await createOrderNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'recon_orders',
    event: 'order_completed',
    orderId: '789',
    orderNumber: 'RECON-001',
    priority: 'normal',
    metadata: {
      completedBy: 'Jane Technician',
      hoursSpent: 12,
    },
  });

  // Car Wash Ready
  await createOrderNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'car_wash',
    event: 'order_completed',
    orderId: '101',
    orderNumber: 'WASH-001',
    priority: 'normal',
  });
}

// ============================================================================
// EXAMPLE 6: STATUS CHANGE NOTIFICATION
// ============================================================================

async function example6_StatusChangeNotification() {
  // Notify when order status changes

  // Sales Order: Pending → In Progress
  await createStatusChangeNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    entityType: 'sales_order',
    entityId: '123',
    entityName: 'SO-001',
    oldStatus: 'pending',
    newStatus: 'in_progress',
    priority: 'high',
  });

  // Service Order: In Progress → Completed
  await createStatusChangeNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'service_orders',
    entityType: 'service_order',
    entityId: '456',
    entityName: 'SRV-001',
    oldStatus: 'in_progress',
    newStatus: 'completed',
    priority: 'normal',
    targetChannels: ['in_app', 'email'],
  });
}

// ============================================================================
// EXAMPLE 7: ASSIGNMENT NOTIFICATION
// ============================================================================

async function example7_AssignmentNotification() {
  // Notify user when assigned to an order

  await createAssignmentNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    entityType: 'sales_order',
    entityId: '123',
    entityName: 'SO-001',
    assignedBy: 'John Manager',
    priority: 'high',
    targetChannels: ['in_app', 'email'],
  });
}

// ============================================================================
// EXAMPLE 8: COMMENT NOTIFICATION
// ============================================================================

async function example8_CommentNotification() {
  // Notify when someone comments on an order

  await createCommentNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    entityType: 'sales_order',
    entityId: '123',
    entityName: 'SO-001',
    commenterName: 'Jane Technician',
    commentPreview: 'The vehicle inspection is complete. Found minor paint scratches that need touch-up.',
    actionUrl: '/orders/sales/123#comments',
    priority: 'normal',
  });
}

// ============================================================================
// EXAMPLE 9: BROADCAST NOTIFICATION
// ============================================================================

async function example9_BroadcastNotification() {
  // Send notification to all users in the dealership (userId = null)

  // System Maintenance Announcement
  await createBroadcastNotification({
    dealerId: 5,
    module: 'system',
    event: 'maintenance_scheduled',
    title: 'Scheduled Maintenance',
    message: 'The system will be down for maintenance on Saturday at 2:00 AM EST. Estimated downtime: 2 hours.',
    priority: 'high',
    targetChannels: ['in_app', 'email'],
    metadata: {
      maintenanceStart: '2025-11-02T02:00:00Z',
      maintenanceEnd: '2025-11-02T04:00:00Z',
      affectedServices: ['orders', 'reports'],
    },
  });

  // New Feature Announcement
  await createBroadcastNotification({
    dealerId: 5,
    module: 'system',
    event: 'feature_released',
    title: 'New Feature: Advanced Reporting',
    message: 'Check out our new advanced reporting dashboard with custom metrics and export options!',
    priority: 'low',
    actionUrl: '/reports',
    actionLabel: 'Explore Reports',
    targetChannels: ['in_app'],
  });
}

// ============================================================================
// EXAMPLE 10: BATCH NOTIFICATIONS
// ============================================================================

async function example10_BatchNotifications() {
  // Create multiple notifications efficiently

  // Notify all team members about a new order
  const teamMemberIds = [
    '550e8400-e29b-41d4-a716-446655440000',
    '660e8400-e29b-41d4-a716-446655440001',
    '770e8400-e29b-41d4-a716-446655440002',
  ];

  const results = await createBatchNotifications(
    teamMemberIds.map((userId) => ({
      userId,
      dealerId: 5,
      module: 'sales_orders',
      event: 'order_created',
      title: 'New Team Order',
      message: 'New sales order SO-001 has been assigned to your team',
      priority: 'normal',
      entityType: 'sales_order',
      entityId: '123',
      actionUrl: '/orders/sales/123',
      actionLabel: 'View Order',
    }))
  );

  const successCount = results.filter((r) => r.success).length;
  console.log(`Sent ${successCount}/${results.length} notifications`);
}

// ============================================================================
// EXAMPLE 11: PRIORITY LEVELS
// ============================================================================

async function example11_PriorityLevels() {
  const userId = '550e8400-e29b-41d4-a716-446655440000';
  const dealerId = 5;

  // LOW: Informational, no urgency
  await createNotification({
    userId,
    dealerId,
    module: 'system',
    event: 'user_joined',
    title: 'New Team Member',
    message: 'Jane Doe joined your dealership',
    priority: 'low',
  });

  // NORMAL: Standard notifications
  await createNotification({
    userId,
    dealerId,
    module: 'sales_orders',
    event: 'order_created',
    title: 'New Order',
    message: 'Order SO-001 has been created',
    priority: 'normal',
  });

  // HIGH: Important, requires attention
  await createNotification({
    userId,
    dealerId,
    module: 'sales_orders',
    event: 'order_assigned',
    title: 'Order Assigned',
    message: 'You have been assigned to order SO-001',
    priority: 'high',
    targetChannels: ['in_app', 'email'],
  });

  // URGENT: Time-sensitive, immediate action needed
  await createNotification({
    userId,
    dealerId,
    module: 'sales_orders',
    event: 'order_overdue',
    title: 'Order Overdue',
    message: 'Order SO-001 is overdue by 2 hours',
    priority: 'urgent',
    targetChannels: ['in_app', 'email', 'sms'],
  });

  // CRITICAL: System-critical, highest priority
  await createNotification({
    userId,
    dealerId,
    module: 'system',
    event: 'security_alert',
    title: 'Security Alert',
    message: 'Suspicious activity detected on your account',
    priority: 'critical',
    targetChannels: ['in_app', 'email', 'sms', 'push'],
  });
}

// ============================================================================
// EXAMPLE 12: SCHEDULED NOTIFICATIONS
// ============================================================================

async function example12_ScheduledNotifications() {
  // Schedule a notification for future delivery

  // Reminder for appointment tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_due_soon',
    title: 'Order Due Tomorrow',
    message: 'Sales Order SO-001 is scheduled for delivery tomorrow at 10:00 AM',
    priority: 'high',
    entityType: 'sales_order',
    entityId: '123',
    actionUrl: '/orders/sales/123',
    actionLabel: 'View Order',
    scheduledFor: tomorrow,
    targetChannels: ['in_app', 'email'],
  });
}

// ============================================================================
// EXAMPLE 13: THREADED NOTIFICATIONS
// ============================================================================

async function example13_ThreadedNotifications() {
  // Create a conversation thread of notifications

  // Parent notification (order created)
  const parentResult = await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'New Sales Order',
    message: 'Sales Order SO-001 has been created',
    priority: 'normal',
    entityType: 'sales_order',
    entityId: '123',
    threadId: 'order-123-thread',
  });

  // Reply notification (order assigned)
  if (parentResult.success) {
    await createNotification({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      dealerId: 5,
      module: 'sales_orders',
      event: 'order_assigned',
      title: 'Order Assigned',
      message: 'You have been assigned to SO-001',
      priority: 'high',
      entityType: 'sales_order',
      entityId: '123',
      threadId: 'order-123-thread',
      parentId: parentResult.notificationId,
    });
  }
}

// ============================================================================
// EXAMPLE 14: CONTACT MODULE NOTIFICATIONS
// ============================================================================

async function example14_ContactNotifications() {
  // Contact created
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'contacts',
    event: 'contact_created',
    title: 'New Contact Added',
    message: 'Contact "John Smith" has been added to your dealership',
    priority: 'low',
    entityType: 'contact',
    entityId: '456',
    actionUrl: '/contacts/456',
    actionLabel: 'View Contact',
  });

  // Contact updated
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'contacts',
    event: 'contact_updated',
    title: 'Contact Updated',
    message: 'Contact "John Smith" information has been updated',
    priority: 'low',
    entityType: 'contact',
    entityId: '456',
    actionUrl: '/contacts/456',
    actionLabel: 'View Changes',
  });
}

// ============================================================================
// EXAMPLE 15: CHAT MODULE NOTIFICATIONS
// ============================================================================

async function example15_ChatNotifications() {
  // Direct message received
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'chat',
    event: 'message_received',
    title: 'New Message',
    message: 'Jane Doe: Hey, can you review the sales order?',
    priority: 'normal',
    entityType: 'chat_message',
    entityId: 'msg-789',
    actionUrl: '/chat/conversation/123',
    actionLabel: 'Reply',
    targetChannels: ['in_app', 'push'],
  });

  // Mention in chat
  await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'chat',
    event: 'mention_received',
    title: 'You were mentioned',
    message: '@John mentioned you in Sales Team chat',
    priority: 'high',
    entityType: 'chat_message',
    entityId: 'msg-790',
    actionUrl: '/chat/conversation/124#msg-790',
    actionLabel: 'View Message',
    targetChannels: ['in_app', 'push'],
  });
}

// ============================================================================
// EXAMPLE 16: ERROR HANDLING
// ============================================================================

async function example16_ErrorHandling() {
  // Example 1: Invalid dealerId (should fail validation)
  const result1 = await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: -1, // Invalid
    module: 'sales_orders',
    event: 'order_created',
    title: 'Test',
    message: 'Test message',
  });

  if (!result1.success) {
    console.error('Validation error:', result1.error);
    // Output: "dealerId must be a positive integer greater than 0"
  }

  // Example 2: Invalid UUID format
  const result2 = await createNotification({
    userId: 'invalid-uuid-format', // Invalid
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'Test',
    message: 'Test message',
  });

  if (!result2.success) {
    console.error('Validation error:', result2.error);
    // Output: "userId must be a valid UUID format or null"
  }

  // Example 3: Invalid module
  const result3 = await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'invalid_module' as any, // Invalid
    event: 'order_created',
    title: 'Test',
    message: 'Test message',
  });

  if (!result3.success) {
    console.error('Validation error:', result3.error);
    // Output: "module must be one of: sales_orders, service_orders..."
  }

  // Example 4: Graceful handling
  const result4 = await createNotification({
    userId: '550e8400-e29b-41d4-a716-446655440000',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'Valid Notification',
    message: 'This will succeed',
  });

  if (result4.success) {
    console.log('✓ Notification created:', result4.notificationId);
  } else {
    console.error('✗ Failed to create notification:', result4.error);
    // Handle error gracefully - app continues to work
  }
}

// ============================================================================
// EXAMPLE 17: REAL-WORLD INTEGRATION IN ORDER CREATION
// ============================================================================

async function example17_RealWorldIntegration() {
  // This shows how you would integrate notification creation into your
  // existing order creation flow

  async function createSalesOrder(orderData: any, currentUserId: string, dealerId: number) {
    try {
      // 1. Create the order in database
      const { data: order, error } = await supabase
        .from('sales_orders')
        .insert({
          dealer_id: dealerId,
          assigned_user_id: orderData.assignedUserId,
          order_number: orderData.orderNumber,
          vehicle_vin: orderData.vehicleVin,
          status: 'pending',
          // ... other fields
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Create notification for assigned user
      const notificationResult = await createOrderNotification({
        userId: orderData.assignedUserId,
        dealerId: dealerId,
        module: 'sales_orders',
        event: 'order_assigned',
        orderId: order.id,
        orderNumber: order.order_number,
        priority: 'high',
        targetChannels: ['in_app', 'email'],
        metadata: {
          vehicleVin: order.vehicle_vin,
          createdBy: currentUserId,
        },
      });

      // 3. Log notification result but don't fail order creation
      if (notificationResult.success) {
        console.log('Order created and user notified successfully');
      } else {
        console.warn('Order created but notification failed:', notificationResult.error);
        // Order still succeeds even if notification fails
      }

      return { success: true, order };
    } catch (error) {
      console.error('Failed to create order:', error);
      return { success: false, error };
    }
  }
}

// Note: Import supabase for example 17
declare const supabase: any;

// ============================================================================
// EXPORTS FOR TESTING
// ============================================================================

export {
  example1_BasicNotification,
  example2_NotificationWithDeepLink,
  example3_MultiChannelNotification,
  example4_NotificationWithMetadata,
  example5_OrderNotification,
  example6_StatusChangeNotification,
  example7_AssignmentNotification,
  example8_CommentNotification,
  example9_BroadcastNotification,
  example10_BatchNotifications,
  example11_PriorityLevels,
  example12_ScheduledNotifications,
  example13_ThreadedNotifications,
  example14_ContactNotifications,
  example15_ChatNotifications,
  example16_ErrorHandling,
  example17_RealWorldIntegration,
};
