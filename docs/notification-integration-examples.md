# Notification Helper - Module Integration Examples

**Quick reference guide for integrating notifications into each module**

---

## Sales Orders Module

### When Order is Created

```typescript
// src/components/orders/CreateSalesOrderModal.tsx

import { createOrderNotification } from '@/utils/notificationHelper';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';

export function CreateSalesOrderModal() {
  const { user } = useAuth();
  const { selectedDealerId } = useDealerFilter();

  async function handleSubmit(formData: any) {
    try {
      // 1. Create the order
      const { data: order, error } = await supabase
        .from('sales_orders')
        .insert({
          dealer_id: selectedDealerId,
          assigned_user_id: formData.assignedUserId,
          order_number: formData.orderNumber,
          vehicle_vin: formData.vehicleVin,
          vehicle_year: formData.vehicleYear,
          vehicle_make: formData.vehicleMake,
          vehicle_model: formData.vehicleModel,
          status: 'pending',
          customer_name: formData.customerName,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Notify assigned user
      if (formData.assignedUserId && formData.assignedUserId !== user?.id) {
        await createOrderNotification({
          userId: formData.assignedUserId,
          dealerId: selectedDealerId,
          module: 'sales_orders',
          event: 'order_assigned',
          orderId: order.id,
          orderNumber: order.order_number,
          priority: 'high',
          targetChannels: ['in_app', 'email'],
          metadata: {
            vehicleVin: order.vehicle_vin,
            vehicleInfo: `${order.vehicle_year} ${order.vehicle_make} ${order.vehicle_model}`,
            customerName: order.customer_name,
            createdBy: user?.email,
          }
        });
      }

      toast.success(t('orders.created_successfully'));
      onSuccess();
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error(t('orders.creation_failed'));
    }
  }
}
```

### When Order Status Changes

```typescript
// src/hooks/useOrderManagement.tsx

import { createStatusChangeNotification } from '@/utils/notificationHelper';

export function useOrderManagement() {
  const updateOrderStatus = async (
    orderId: string,
    newStatus: string,
    orderData: any
  ) => {
    const oldStatus = orderData.status;

    // 1. Update status in database
    const { error } = await supabase
      .from('sales_orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) throw error;

    // 2. Notify assigned user if status changed
    if (orderData.assigned_user_id && oldStatus !== newStatus) {
      await createStatusChangeNotification({
        userId: orderData.assigned_user_id,
        dealerId: orderData.dealer_id,
        module: 'sales_orders',
        entityType: 'sales_order',
        entityId: orderId,
        entityName: orderData.order_number,
        oldStatus: oldStatus,
        newStatus: newStatus,
        priority: newStatus === 'completed' ? 'high' : 'normal',
        targetChannels: newStatus === 'completed' ? ['in_app', 'email'] : ['in_app'],
      });
    }
  };

  return { updateOrderStatus };
}
```

### When Order is Assigned/Reassigned

```typescript
// src/components/orders/AssignUserDialog.tsx

import { createAssignmentNotification } from '@/utils/notificationHelper';
import { useAuth } from '@/contexts/AuthContext';

export function AssignUserDialog({ order, onClose }: Props) {
  const { user } = useAuth();

  async function handleAssign(newUserId: string) {
    // 1. Update assignment
    const { error } = await supabase
      .from('sales_orders')
      .update({ assigned_user_id: newUserId })
      .eq('id', order.id);

    if (error) throw error;

    // 2. Notify new assignee
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user?.id)
      .single();

    const assignedByName = `${currentUserProfile?.first_name || ''} ${currentUserProfile?.last_name || ''}`.trim() || user?.email || 'System';

    await createAssignmentNotification({
      userId: newUserId,
      dealerId: order.dealer_id,
      module: 'sales_orders',
      entityType: 'sales_order',
      entityId: order.id,
      entityName: order.order_number,
      assignedBy: assignedByName,
      priority: 'high',
      targetChannels: ['in_app', 'email'],
    });

    toast.success('User assigned and notified');
    onClose();
  }
}
```

### When Comment is Added

```typescript
// src/components/orders/OrderComments.tsx

import { createCommentNotification } from '@/utils/notificationHelper';
import { useAuth } from '@/contexts/AuthContext';

export function OrderComments({ order }: Props) {
  const { user } = useAuth();

  async function handleAddComment(commentText: string) {
    // 1. Add comment to database
    const { data: comment, error } = await supabase
      .from('order_comments')
      .insert({
        order_id: order.id,
        user_id: user?.id,
        comment: commentText,
        created_at: new Date().toISOString(),
      })
      .select('*, profiles(first_name, last_name, email)')
      .single();

    if (error) throw error;

    // 2. Get current user name
    const commenterName = comment.profiles
      ? `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim()
      : comment.profiles?.email || 'Unknown User';

    // 3. Notify assigned user (if not the commenter)
    if (order.assigned_user_id && order.assigned_user_id !== user?.id) {
      await createCommentNotification({
        userId: order.assigned_user_id,
        dealerId: order.dealer_id,
        module: 'sales_orders',
        entityType: 'sales_order',
        entityId: order.id,
        entityName: order.order_number,
        commenterName: commenterName,
        commentPreview: commentText,
        actionUrl: `/orders/sales/${order.id}#comments`,
        priority: 'normal',
      });
    }

    // 4. Notify followers (if implemented)
    const { data: followers } = await supabase
      .from('order_followers')
      .select('user_id')
      .eq('order_id', order.id)
      .neq('user_id', user?.id); // Don't notify the commenter

    if (followers && followers.length > 0) {
      await createBatchNotifications(
        followers.map(follower => ({
          userId: follower.user_id,
          dealerId: order.dealer_id,
          module: 'sales_orders',
          event: 'comment_added',
          title: `New comment on ${order.order_number}`,
          message: `${commenterName}: ${commentText.substring(0, 100)}`,
          priority: 'normal',
          entityType: 'sales_order',
          entityId: order.id,
          actionUrl: `/orders/sales/${order.id}#comments`,
          actionLabel: 'View Comment',
        }))
      );
    }
  }
}
```

---

## Service Orders Module

### When Service Order is Created

```typescript
// src/components/orders/CreateServiceOrderModal.tsx

import { createOrderNotification } from '@/utils/notificationHelper';

async function handleCreateServiceOrder(formData: any) {
  // Create order
  const { data: order } = await supabase
    .from('service_orders')
    .insert({
      dealer_id: selectedDealerId,
      assigned_user_id: formData.assignedUserId,
      order_number: formData.orderNumber,
      service_type: formData.serviceType,
      status: 'pending',
    })
    .select()
    .single();

  // Notify assigned technician
  await createOrderNotification({
    userId: formData.assignedUserId,
    dealerId: selectedDealerId,
    module: 'service_orders',
    event: 'order_assigned',
    orderId: order.id,
    orderNumber: order.order_number,
    priority: 'high',
    metadata: {
      serviceType: formData.serviceType,
      scheduledDate: formData.scheduledDate,
    }
  });
}
```

### When Service is Completed

```typescript
// src/hooks/useServiceOrders.tsx

import { createStatusChangeNotification } from '@/utils/notificationHelper';

async function markServiceComplete(orderId: string, orderData: any) {
  // Update status
  await supabase
    .from('service_orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId);

  // Notify service manager
  if (orderData.service_manager_id) {
    await createStatusChangeNotification({
      userId: orderData.service_manager_id,
      dealerId: orderData.dealer_id,
      module: 'service_orders',
      entityType: 'service_order',
      entityId: orderId,
      entityName: orderData.order_number,
      oldStatus: 'in_progress',
      newStatus: 'completed',
      priority: 'high',
      targetChannels: ['in_app', 'email'],
    });
  }
}
```

---

## Recon Orders Module

### When Recon Order is Created

```typescript
// src/components/orders/CreateReconOrderModal.tsx

import { createOrderNotification } from '@/utils/notificationHelper';

async function handleCreateReconOrder(formData: any) {
  const { data: order } = await supabase
    .from('recon_orders')
    .insert({
      dealer_id: selectedDealerId,
      assigned_user_id: formData.assignedUserId,
      order_number: formData.orderNumber,
      vehicle_vin: formData.vehicleVin,
      recon_type: formData.reconType,
      status: 'pending',
    })
    .select()
    .single();

  await createOrderNotification({
    userId: formData.assignedUserId,
    dealerId: selectedDealerId,
    module: 'recon_orders',
    event: 'order_assigned',
    orderId: order.id,
    orderNumber: order.order_number,
    priority: 'high',
    metadata: {
      reconType: formData.reconType,
      vehicleVin: formData.vehicleVin,
    }
  });
}
```

---

## Car Wash Module

### When Car Wash Order is Created

```typescript
// src/components/orders/CarWashQueue.tsx

import { createOrderNotification } from '@/utils/notificationHelper';

async function handleCreateCarWashOrder(formData: any) {
  const { data: order } = await supabase
    .from('car_wash_orders')
    .insert({
      dealer_id: selectedDealerId,
      assigned_user_id: formData.assignedUserId,
      order_number: formData.orderNumber,
      wash_type: formData.washType,
      status: 'pending',
    })
    .select()
    .single();

  // Notify car wash attendant
  if (formData.assignedUserId) {
    await createOrderNotification({
      userId: formData.assignedUserId,
      dealerId: selectedDealerId,
      module: 'car_wash',
      event: 'order_assigned',
      orderId: order.id,
      orderNumber: order.order_number,
      priority: 'normal',
      metadata: {
        washType: formData.washType,
      }
    });
  }
}
```

---

## Contacts Module

### When Contact is Created

```typescript
// src/components/contacts/CreateContactModal.tsx

import { createNotification } from '@/utils/notificationHelper';

async function handleCreateContact(formData: any) {
  const { data: contact } = await supabase
    .from('dealership_contacts')
    .insert({
      dealer_id: selectedDealerId,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      created_by: user?.id,
    })
    .select()
    .single();

  // Notify sales manager about new contact
  const { data: salesManager } = await supabase
    .from('dealer_memberships')
    .select('user_id')
    .eq('dealer_id', selectedDealerId)
    .eq('role', 'sales_manager')
    .single();

  if (salesManager) {
    await createNotification({
      userId: salesManager.user_id,
      dealerId: selectedDealerId,
      module: 'contacts',
      event: 'contact_created',
      title: 'New Contact Added',
      message: `${formData.firstName} ${formData.lastName} was added to contacts`,
      priority: 'low',
      entityType: 'contact',
      entityId: contact.id,
      actionUrl: `/contacts/${contact.id}`,
      actionLabel: 'View Contact',
      metadata: {
        contactName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        createdBy: user?.email,
      }
    });
  }
}
```

---

## Chat Module

### When Message is Received

```typescript
// src/components/chat/ChatInput.tsx

import { createNotification } from '@/utils/notificationHelper';

async function sendMessage(messageText: string) {
  const { data: message } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText,
      created_at: new Date().toISOString(),
    })
    .select('*, sender:profiles(first_name, last_name)')
    .single();

  // Get conversation participants
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId)
    .neq('user_id', currentUserId); // Don't notify sender

  // Notify all participants
  if (participants) {
    const senderName = `${message.sender?.first_name || ''} ${message.sender?.last_name || ''}`.trim() || 'Someone';

    await createBatchNotifications(
      participants.map(participant => ({
        userId: participant.user_id,
        dealerId: selectedDealerId,
        module: 'chat',
        event: 'message_received',
        title: 'New Message',
        message: `${senderName}: ${messageText.substring(0, 100)}`,
        priority: 'normal',
        entityType: 'chat_message',
        entityId: message.id,
        actionUrl: `/chat/conversation/${conversationId}`,
        actionLabel: 'Reply',
        targetChannels: ['in_app', 'push'],
      }))
    );
  }
}
```

### When User is Mentioned

```typescript
// src/components/chat/ChatInput.tsx

import { createNotification } from '@/utils/notificationHelper';

async function handleMention(messageText: string, mentionedUserIds: string[]) {
  // Send message with mentions
  const { data: message } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      message: messageText,
    })
    .select()
    .single();

  // Notify mentioned users
  for (const mentionedUserId of mentionedUserIds) {
    await createNotification({
      userId: mentionedUserId,
      dealerId: selectedDealerId,
      module: 'chat',
      event: 'mention_received',
      title: 'You were mentioned',
      message: `${currentUserName} mentioned you in ${conversationName}`,
      priority: 'high',
      entityType: 'chat_message',
      entityId: message.id,
      actionUrl: `/chat/conversation/${conversationId}#message-${message.id}`,
      actionLabel: 'View Message',
      targetChannels: ['in_app', 'push'],
    });
  }
}
```

---

## System Module

### When User is Invited

```typescript
// src/components/users/InviteUserModal.tsx

import { createNotification } from '@/utils/notificationHelper';

async function handleInviteUser(email: string, role: string) {
  // Send invitation
  const { data: invitation } = await supabase
    .from('user_invitations')
    .insert({
      dealer_id: selectedDealerId,
      email: email,
      role: role,
      invited_by: user?.id,
    })
    .select()
    .single();

  // Notify dealer admin about new invitation
  const { data: admins } = await supabase
    .from('dealer_memberships')
    .select('user_id')
    .eq('dealer_id', selectedDealerId)
    .eq('role', 'dealer_admin');

  if (admins) {
    await createBatchNotifications(
      admins.map(admin => ({
        userId: admin.user_id,
        dealerId: selectedDealerId,
        module: 'system',
        event: 'user_invited',
        title: 'New User Invited',
        message: `${email} was invited as ${role}`,
        priority: 'low',
        metadata: {
          invitedEmail: email,
          role: role,
          invitedBy: user?.email,
        }
      }))
    );
  }
}
```

### When Scheduled Maintenance

```typescript
// src/services/maintenanceScheduler.ts

import { createBroadcastNotification } from '@/utils/notificationHelper';

async function scheduleMaintenanceNotification(
  dealerId: number,
  maintenanceDate: Date,
  estimatedDowntime: string
) {
  // Notify all users in dealership
  await createBroadcastNotification({
    dealerId: dealerId,
    module: 'system',
    event: 'maintenance_scheduled',
    title: 'Scheduled Maintenance',
    message: `System maintenance scheduled for ${maintenanceDate.toLocaleString()}. Estimated downtime: ${estimatedDowntime}`,
    priority: 'high',
    targetChannels: ['in_app', 'email'],
    metadata: {
      maintenanceDate: maintenanceDate.toISOString(),
      estimatedDowntime: estimatedDowntime,
      affectedServices: ['orders', 'reports'],
    }
  });
}
```

---

## Scheduled Notifications (Background Jobs)

### Order Due Soon Reminder

```typescript
// src/services/notificationScheduler.ts

import { createNotification } from '@/utils/notificationHelper';

async function sendOrderDueReminders() {
  // Find orders due in 2 hours
  const { data: orders } = await supabase
    .from('sales_orders')
    .select('*, assigned_user:profiles(first_name, last_name)')
    .eq('status', 'in_progress')
    .gte('due_date', new Date().toISOString())
    .lte('due_date', new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString());

  // Send reminders
  for (const order of orders || []) {
    if (order.assigned_user_id) {
      await createNotification({
        userId: order.assigned_user_id,
        dealerId: order.dealer_id,
        module: 'sales_orders',
        event: 'order_due_soon',
        title: 'Order Due Soon',
        message: `Order ${order.order_number} is due in 2 hours`,
        priority: 'urgent',
        entityType: 'sales_order',
        entityId: order.id,
        actionUrl: `/orders/sales/${order.id}`,
        actionLabel: 'View Order',
        targetChannels: ['in_app', 'email', 'sms'],
        metadata: {
          orderNumber: order.order_number,
          dueDate: order.due_date,
          hoursRemaining: 2,
        }
      });
    }
  }
}

// Run every 30 minutes
setInterval(sendOrderDueReminders, 30 * 60 * 1000);
```

---

## Quick Reference: Import Statements

```typescript
// Individual functions
import {
  createNotification,           // Full control
  createOrderNotification,      // Simplified for orders
  createStatusChangeNotification,
  createAssignmentNotification,
  createCommentNotification,
  createBroadcastNotification,  // Notify all users
  createBatchNotifications,     // Multiple notifications
} from '@/utils/notificationHelper';

// Context hooks
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';

// Supabase client
import { supabase } from '@/integrations/supabase/client';

// Toast notifications
import { toast } from '@/hooks/use-toast';
```

---

## Testing Notifications

### Manual Testing in Browser Console

```javascript
// Open browser console and run:
import('@/utils/notificationHelper').then(({ createNotification }) => {
  createNotification({
    userId: 'your-user-id-here',
    dealerId: 5,
    module: 'sales_orders',
    event: 'order_created',
    title: 'Test Notification',
    message: 'This is a test notification',
    priority: 'high',
    targetChannels: ['in_app']
  }).then(result => console.log('Result:', result));
});
```

### Enable Debug Logging

```javascript
// In browser console:
localStorage.setItem('debug', 'true');
// Reload page to see detailed notification logs
```

---

**Last Updated:** 2025-11-01
