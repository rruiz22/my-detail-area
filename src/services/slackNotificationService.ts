// =====================================================
// SLACK NOTIFICATION SERVICE
// Created: 2025-11-10
// Description: Frontend service for sending Slack notifications via Edge Function
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface SlackNotificationOptions {
  dealerId: number;
  orderId: string;
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash';
  eventType: 'order_created' | 'status_changed' | 'comment_added';
  eventData: {
    orderNumber?: string;
    stockNumber?: string;
    tag?: string;
    vehicleInfo?: string;
    services?: string;
    dueDateTime?: string;
    shortLink: string;
    status?: string;
    oldStatus?: string;
    assignedTo?: string;
    commenterName?: string;
    commentPreview?: string;
  };
}

export interface SlackNotificationResponse {
  success: boolean;
  message?: string;
  error?: any;
  messagePreview?: string;
}

/**
 * Slack Notification Service
 * Handles sending order notifications to Slack via webhook
 * Similar to orderSMSNotificationService but for Slack
 */
export const slackNotificationService = {
  /**
   * Send a Slack notification via Edge Function
   * @param options Notification options
   * @returns Promise with success status
   */
  async sendNotification(
    options: SlackNotificationOptions
  ): Promise<SlackNotificationResponse> {
    try {
      logger.dev('📤 [Slack] Sending notification', {
        dealerId: options.dealerId,
        module: options.module,
        eventType: options.eventType,
        orderNumber: options.eventData.orderNumber
      });

      // Map module to order type
      const orderTypeMap: Record<string, 'sales' | 'service' | 'recon' | 'carwash'> = {
        sales_orders: 'sales',
        service_orders: 'service',
        recon_orders: 'recon',
        car_wash: 'carwash'
      };

      const orderType = orderTypeMap[options.module] || 'sales';

      // Invoke Edge Function
      const { data, error } = await supabase.functions.invoke('slack-send-message', {
        body: {
          dealerId: options.dealerId,
          orderType,
          eventType: options.eventType,
          eventData: options.eventData
        }
      });

      if (error) {
        logger.error('❌ [Slack] Failed to send notification', error, {
          dealerId: options.dealerId,
          orderNumber: options.eventData.orderNumber
        });
        return { success: false, error };
      }

      logger.dev('✅ [Slack] Notification sent successfully', {
        dealerId: options.dealerId,
        orderNumber: options.eventData.orderNumber,
        messagePreview: data?.messagePreview
      });

      return {
        success: true,
        message: data?.message,
        messagePreview: data?.messagePreview
      };
    } catch (error) {
      logger.error('❌ [Slack] Error in notification service', error, {
        dealerId: options.dealerId,
        module: options.module
      });
      return { success: false, error };
    }
  },

  /**
   * Send order created notification to Slack
   * @param options Notification options (without eventType)
   * @returns Promise with success status
   */
  async notifyOrderCreated(
    options: Omit<SlackNotificationOptions, 'eventType'>
  ): Promise<SlackNotificationResponse> {
    return this.sendNotification({
      ...options,
      eventType: 'order_created'
    });
  },

  /**
   * Send status changed notification to Slack
   * @param options Notification options (without eventType)
   * @returns Promise with success status
   */
  async notifyStatusChange(
    options: Omit<SlackNotificationOptions, 'eventType'>
  ): Promise<SlackNotificationResponse> {
    return this.sendNotification({
      ...options,
      eventType: 'status_changed'
    });
  },

  /**
   * Check if Slack notifications are enabled for a dealer/module/event
   * @param dealerId Dealership ID
   * @param module Module name
   * @param eventType Event type
   * @returns Promise<boolean> True if enabled
   */
  async isEnabled(
    dealerId: number,
    module: string,
    eventType: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('is_slack_enabled_for_event', {
        p_dealer_id: dealerId,
        p_module: module,
        p_event_type: eventType
      });

      if (error) {
        logger.error('❌ [Slack] Error checking if enabled', error);
        return false;
      }

      return data === true;
    } catch (error) {
      logger.error('❌ [Slack] Error in isEnabled check', error);
      return false;
    }
  }
};

/**
 * Helper function to get notification module from order type
 * @param orderType Order type string
 * @returns Module name for notifications
 */
export function getNotificationModule(
  orderType: string
): 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' {
  const normalized = orderType.toLowerCase().replace(/[_\s-]/g, '');

  if (normalized === 'sales' || normalized === 'sale') return 'sales_orders';
  if (normalized === 'service') return 'service_orders';
  if (normalized === 'recon' || normalized === 'reconditioning') return 'recon_orders';
  if (normalized === 'carwash' || normalized === 'wash') return 'car_wash';

  // Default fallback
  return 'sales_orders';
}
