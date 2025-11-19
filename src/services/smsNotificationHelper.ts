/**
 * SMS Notification Helper
 *
 * Centralizes SMS notification logic for all order events
 * Calls the Supabase Edge Function 'send-order-sms-notification'
 */

import { supabase } from '@/integrations/supabase/client';
import { NotificationModule } from '@/utils/notificationHelper';

export type SMSEventType =
  | 'order_created'
  | 'order_assigned'
  | 'status_changed'
  | 'due_date_approaching'
  | 'overdue'
  | 'field_updated';

interface BaseSMSParams {
  orderId: string;
  dealerId: number;
  module: NotificationModule;
  triggeredBy: string;
}

interface OrderCreatedData {
  orderNumber: string;
  customerName?: string;
  vehicleInfo?: string;
  shortLink?: string;
}

interface OrderAssignedData {
  orderNumber: string;
  assignedToUserId: string;
  assignedToName?: string;
  vehicleInfo?: string;
}

interface StatusChangedData {
  orderNumber: string;
  newStatus: string;
  oldStatus?: string;
  vehicleInfo?: string;
}

interface DueDateData {
  orderNumber: string;
  dueDate: string;
  vehicleInfo?: string;
  hoursRemaining?: number;
}

interface FieldUpdatedData {
  orderNumber: string;
  fieldName: string;
  newValue?: string;
  oldValue?: string;
}

type SMSEventData =
  | OrderCreatedData
  | OrderAssignedData
  | StatusChangedData
  | DueDateData
  | FieldUpdatedData;

/**
 * Send SMS notification for order created event
 */
export async function sendOrderCreatedSMS(
  params: BaseSMSParams & { eventData: OrderCreatedData }
): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: 'order_created',
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });
  } catch (error) {
    console.error('[SMS] Failed to send order_created SMS:', error);
  }
}

/**
 * Send SMS notification for order assigned event
 */
export async function sendOrderAssignedSMS(
  params: BaseSMSParams & { eventData: OrderAssignedData }
): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: 'order_assigned',
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });
  } catch (error) {
    console.error('[SMS] Failed to send order_assigned SMS:', error);
  }
}

/**
 * Send SMS notification for status changed event
 * Returns result for toast notification
 */
export async function sendStatusChangedSMS(
  params: BaseSMSParams & { eventData: StatusChangedData }
): Promise<{ success: boolean; sent: number; recipients: number; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: 'status_changed',
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });

    if (error) {
      console.error('[SMS] Failed to send status_changed SMS:', error);
      return { success: false, sent: 0, recipients: 0, error: error.message };
    }

    return data || { success: true, sent: 0, recipients: 0 };
  } catch (error: any) {
    console.error('[SMS] Failed to send status_changed SMS:', error);
    return { success: false, sent: 0, recipients: 0, error: error.message };
  }
}

/**
 * Send SMS notification for due date approaching event
 */
export async function sendDueDateApproachingSMS(
  params: BaseSMSParams & { eventData: DueDateData }
): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: 'due_date_approaching',
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });
  } catch (error) {
    console.error('[SMS] Failed to send due_date_approaching SMS:', error);
  }
}

/**
 * Send SMS notification for overdue event
 */
export async function sendOverdueSMS(
  params: BaseSMSParams & { eventData: DueDateData }
): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: 'overdue',
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });
  } catch (error) {
    console.error('[SMS] Failed to send overdue SMS:', error);
  }
}

/**
 * Send SMS notification for field updated event
 */
export async function sendFieldUpdatedSMS(
  params: BaseSMSParams & { eventData: FieldUpdatedData }
): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: 'field_updated',
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });
  } catch (error) {
    console.error('[SMS] Failed to send field_updated SMS:', error);
  }
}

/**
 * Generic SMS sender for any event type
 */
export async function sendOrderSMS(
  params: BaseSMSParams & {
    eventType: SMSEventType;
    eventData: SMSEventData;
  }
): Promise<void> {
  try {
    await supabase.functions.invoke('send-order-sms-notification', {
      body: {
        orderId: params.orderId,
        dealerId: params.dealerId,
        module: params.module,
        eventType: params.eventType,
        eventData: params.eventData,
        triggeredBy: params.triggeredBy
      }
    });
  } catch (error) {
    console.error(`[SMS] Failed to send ${params.eventType} SMS:`, error);
  }
}

export default {
  sendOrderCreatedSMS,
  sendOrderAssignedSMS,
  sendStatusChangedSMS,
  sendDueDateApproachingSMS,
  sendOverdueSMS,
  sendFieldUpdatedSMS,
  sendOrderSMS
};
