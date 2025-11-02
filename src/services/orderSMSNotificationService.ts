/**
 * Order SMS Notification Service (Enterprise)
 *
 * Sistema enterprise de notificaciones SMS con:
 * - Permisos basados en Custom Roles
 * - Preferencias granulares por evento
 * - Rate limiting inteligente
 * - Quiet hours configurables
 * - Auto-exclusión del trigger user
 */

import { supabase } from '@/integrations/supabase/client';

export type OrderSMSEventType =
  | 'order_created'
  | 'order_assigned'
  | 'status_changed'
  | 'field_updated'
  | 'comment_added'
  | 'attachment_added'
  | 'follower_added'
  | 'due_date_approaching'
  | 'overdue'
  | 'priority_changed';

export type OrderModule = 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash';

export interface SMSNotificationOptions {
  orderId: string;
  dealerId: number;
  module: OrderModule;
  eventType: OrderSMSEventType;
  eventData: {
    orderNumber: string;
    customerName?: string;
    vehicleInfo?: string;
    shortLink?: string;
    newStatus?: string;
    oldStatus?: string;
    fieldName?: string;
    oldValue?: string;
    newValue?: string;
    assignedToUserId?: string;
    assignedToName?: string;
    commentText?: string;
    commenterName?: string;
    minutesUntilDue?: number;
    dueDateTime?: string;
    newPriority?: string;
    oldPriority?: string;
  };
  triggeredBy?: string;
}

export interface SMSNotificationResult {
  success: boolean;
  sent: number;
  failed: number;
  recipients: number;
  recipientNames?: string[];
  error?: string;
  message?: string;
}

class OrderSMSNotificationService {

  /**
   * Envía notificaciones SMS usando el sistema enterprise
   */
  async sendNotification(options: SMSNotificationOptions): Promise<SMSNotificationResult> {
    try {
      console.log('📱 Sending enterprise SMS notification:', {
        orderId: options.orderId,
        eventType: options.eventType,
        module: options.module
      });

      console.log('🚀 [SMS Service] About to invoke Edge Function with body:', options);

      const { data, error } = await supabase.functions.invoke('send-order-sms-notification', {
        body: options
      });

      console.log('📥 [SMS Service] Edge Function response:', { data, error });

      if (error) {
        console.error('❌ Error invoking SMS notification function:', error);
        return {
          success: false,
          sent: 0,
          failed: 0,
          recipients: 0,
          error: error.message
        };
      }

      if (!data) {
        console.error('❌ No data returned from SMS notification function');
        return {
          success: false,
          sent: 0,
          failed: 0,
          recipients: 0,
          error: 'No response from notification service'
        };
      }

      console.log('✅ SMS notification result:', data);

      // Note: Toasts are now handled in useStatusPermissions hook for proper i18n support

      return {
        success: data.success,
        sent: data.sent,
        failed: data.failed,
        recipients: data.recipients,
        recipientNames: data.recipientNames,
        error: data.error,
        message: data.message
      };

    } catch (error: any) {
      console.error('❌ Exception in sendNotification:', error);
      return {
        success: false,
        sent: 0,
        failed: 0,
        recipients: 0,
        error: error.message
      };
    }
  }

  /**
   * Envía notificación de cambio de estado
   */
  async notifyStatusChange(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    newStatus: string,
    oldStatus: string,
    vehicleInfo?: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    console.log('🔔 [SMS Service] notifyStatusChange called with:', {
      orderId, dealerId, module, orderNumber, newStatus, oldStatus, vehicleInfo, shortLink, triggeredBy
    });

    const payload = {
      orderId,
      dealerId,
      module,
      eventType: 'status_changed' as OrderSMSEventType,
      eventData: {
        orderNumber,
        newStatus,
        oldStatus,
        vehicleInfo,
        shortLink
      },
      triggeredBy
    };

    console.log('📦 [SMS Service] Payload constructed:', payload);
    console.log('🎯 [SMS Service] About to call sendNotification()');

    const result = await this.sendNotification(payload);

    console.log('📤 [SMS Service] sendNotification returned:', result);

    return result;
  }

  /**
   * Envía notificación de asignación
   */
  async notifyAssignment(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    assignedToUserId: string,
    assignedToName: string,
    customerName?: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'order_assigned',
      eventData: {
        orderNumber,
        assignedToUserId,
        assignedToName,
        customerName,
        shortLink
      },
      triggeredBy
    });
  }

  /**
   * Envía notificación de nuevo comentario
   */
  async notifyComment(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    commenterName: string,
    commentText: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'comment_added',
      eventData: {
        orderNumber,
        commenterName,
        commentText,
        shortLink
      },
      triggeredBy
    });
  }

  /**
   * Envía notificación de nuevo adjunto
   */
  async notifyAttachment(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'attachment_added',
      eventData: {
        orderNumber,
        shortLink
      },
      triggeredBy
    });
  }

  /**
   * Envía notificación de orden creada
   */
  async notifyOrderCreated(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    customerName?: string,
    vehicleInfo?: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'order_created',
      eventData: {
        orderNumber,
        customerName,
        vehicleInfo,
        shortLink
      },
      triggeredBy
    });
  }

  /**
   * Envía notificación de fecha límite próxima
   */
  async notifyDueDateApproaching(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    minutesUntilDue: number,
    dueDateTime: string,
    vehicleInfo?: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'due_date_approaching',
      eventData: {
        orderNumber,
        minutesUntilDue,
        dueDateTime,
        vehicleInfo,
        shortLink
      },
      triggeredBy
    });
  }

  /**
   * Envía notificación de orden vencida
   */
  async notifyOverdue(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'overdue',
      eventData: {
        orderNumber,
        shortLink
      },
      triggeredBy
    });
  }

  /**
   * Envía notificación de cambio de prioridad
   */
  async notifyPriorityChange(
    orderId: string,
    dealerId: number,
    module: OrderModule,
    orderNumber: string,
    newPriority: string,
    oldPriority: string,
    shortLink?: string,
    triggeredBy?: string
  ): Promise<SMSNotificationResult> {
    return this.sendNotification({
      orderId,
      dealerId,
      module,
      eventType: 'priority_changed',
      eventData: {
        orderNumber,
        newPriority,
        oldPriority,
        shortLink
      },
      triggeredBy
    });
  }
}

// Export singleton instance
export const orderSMSNotificationService = new OrderSMSNotificationService();
