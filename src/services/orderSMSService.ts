/**
 * Order SMS Service
 *
 * Servicio para enviar notificaciones SMS a followers de órdenes
 * basado en el nivel de notificación y tipo de evento
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderSMSOptions {
  orderId: string;
  message: string;
  orderNumber: string;
  eventType: 'status_change' | 'assignment' | 'completion' | 'comment' | 'critical' | 'reminder';
  notificationLevel?: 'all' | 'important'; // A quién enviar
}

export interface Follower {
  user_id: string;
  notification_level: string;
  dealer_id: number;
  profiles?: {
    first_name: string;
    last_name: string;
    phone: string | null;
  };
}

class OrderSMSService {

  /**
   * Determina si un evento es "importante" o "all"
   */
  private getEventImportance(eventType: string): 'all' | 'important' {
    const importantEvents = ['completion', 'critical', 'assignment'];
    return importantEvents.includes(eventType) ? 'important' : 'all';
  }

  /**
   * Obtiene los followers de una orden que deben recibir notificación SMS
   */
  private async getEligibleFollowers(
    orderId: string,
    notificationLevel: 'all' | 'important'
  ): Promise<Follower[]> {
    try {
      // Query para obtener followers activos con sus teléfonos
      let query = supabase
        .from('entity_followers')
        .select(`
          user_id,
          notification_level,
          dealer_id,
          profiles!inner (
            first_name,
            last_name,
            phone
          )
        `)
        .eq('entity_type', 'order')
        .eq('entity_id', orderId)
        .eq('is_active', true)
        .neq('notification_level', 'none')
        .not('profiles.phone', 'is', null); // Solo usuarios con teléfono

      // Filtrar por nivel de notificación
      if (notificationLevel === 'important') {
        // Solo enviar a quienes tienen nivel "important" o "all"
        query = query.in('notification_level', ['important', 'all']);
      } else {
        // Solo enviar a quienes tienen nivel "all"
        query = query.eq('notification_level', 'all');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching followers:', error);
        return [];
      }

      console.log(`📱 Found ${data?.length || 0} eligible followers for SMS notification`);
      return data as Follower[] || [];

    } catch (error) {
      console.error('Error in getEligibleFollowers:', error);
      return [];
    }
  }

  /**
   * Envía SMS a un follower individual
   */
  private async sendSMSToFollower(
    follower: Follower,
    message: string,
    orderNumber: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!follower.profiles?.phone) {
        return { success: false, error: 'No phone number' };
      }

      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          to: follower.profiles.phone,
          message: message,
          orderNumber: orderNumber
        }
      });

      if (error) {
        console.error(`❌ Error sending SMS to ${follower.profiles.first_name}:`, error);
        return { success: false, error: error.message };
      }

      if (!data?.success) {
        return { success: false, error: data?.error || 'Unknown error' };
      }

      console.log(`✅ SMS sent to ${follower.profiles.first_name} ${follower.profiles.last_name}`);
      return { success: true };

    } catch (error: any) {
      console.error(`❌ Exception sending SMS:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía SMS a todos los followers elegibles de una orden
   */
  async notifyOrderFollowers(options: OrderSMSOptions): Promise<{
    sent: number;
    failed: number;
    total: number;
    errors: string[];
  }> {
    const { orderId, message, orderNumber, eventType, notificationLevel } = options;

    console.log(`📤 Sending SMS notifications for order ${orderNumber}`, {
      eventType,
      notificationLevel: notificationLevel || this.getEventImportance(eventType)
    });

    // Determinar nivel de importancia si no se especificó
    const level = notificationLevel || this.getEventImportance(eventType);

    // Obtener followers elegibles
    const followers = await this.getEligibleFollowers(orderId, level);

    if (followers.length === 0) {
      console.log('ℹ️ No eligible followers found for SMS notification');
      return { sent: 0, failed: 0, total: 0, errors: [] };
    }

    // Show toast that SMS is being sent
    toast.loading(`📱 Sending SMS to ${followers.length} follower${followers.length > 1 ? 's' : ''}...`, {
      id: `sms-${orderId}`
    });

    // Enviar SMS a cada follower en paralelo
    const results = await Promise.allSettled(
      followers.map(follower =>
        this.sendSMSToFollower(follower, message, orderNumber)
      )
    );

    // Contar resultados
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        const followerName = followers[index]?.profiles?.first_name || 'Unknown';
        const errorMsg = result.status === 'fulfilled'
          ? result.value.error
          : (result as PromiseRejectedResult).reason;
        errors.push(`${followerName}: ${errorMsg}`);
      }
    });

    console.log(`📊 SMS Results: ${sent} sent, ${failed} failed out of ${followers.length} total`);

    // Show result toast
    if (sent > 0 && failed === 0) {
      toast.success(`✅ SMS sent to ${sent} follower${sent > 1 ? 's' : ''}`, {
        id: `sms-${orderId}`
      });
    } else if (sent > 0 && failed > 0) {
      toast.warning(`⚠️ SMS: ${sent} sent, ${failed} failed`, {
        id: `sms-${orderId}`
      });
    } else {
      toast.error(`❌ All SMS failed (${failed} errors)`, {
        id: `sms-${orderId}`
      });
    }

    return {
      sent,
      failed,
      total: followers.length,
      errors
    };
  }

  /**
   * Métodos de conveniencia para eventos comunes
   */

  // Notificar cuando una orden cambia de estado
  async notifyStatusChange(orderId: string, orderNumber: string, newStatus: string) {
    return this.notifyOrderFollowers({
      orderId,
      orderNumber,
      message: `Order ${orderNumber} status changed to: ${newStatus}`,
      eventType: 'status_change',
      notificationLevel: 'all' // Todos los que siguen con nivel "all"
    });
  }

  // Notificar cuando una orden está completada
  async notifyOrderCompleted(orderId: string, orderNumber: string, vehicleInfo?: string) {
    const vehicleText = vehicleInfo ? ` (${vehicleInfo})` : '';
    return this.notifyOrderFollowers({
      orderId,
      orderNumber,
      message: `🎉 Order ${orderNumber}${vehicleText} has been completed and is ready!`,
      eventType: 'completion',
      notificationLevel: 'important' // Importante: llega a "all" e "important"
    });
  }

  // Notificar asignación
  async notifyAssignment(orderId: string, orderNumber: string, assignedToName: string) {
    return this.notifyOrderFollowers({
      orderId,
      orderNumber,
      message: `Order ${orderNumber} has been assigned to ${assignedToName}`,
      eventType: 'assignment',
      notificationLevel: 'important'
    });
  }

  // Notificar evento crítico (problema, retraso, etc)
  async notifyCriticalEvent(orderId: string, orderNumber: string, reason: string) {
    return this.notifyOrderFollowers({
      orderId,
      orderNumber,
      message: `⚠️ URGENT: Order ${orderNumber} - ${reason}`,
      eventType: 'critical',
      notificationLevel: 'important'
    });
  }

  // Notificar nuevo comentario
  async notifyNewComment(orderId: string, orderNumber: string, commenterName: string, preview: string) {
    return this.notifyOrderFollowers({
      orderId,
      orderNumber,
      message: `💬 ${commenterName} commented on order ${orderNumber}: "${preview}"`,
      eventType: 'comment',
      notificationLevel: 'all' // Solo quien sigue con nivel "all"
    });
  }
}

// Export singleton instance
export const orderSMSService = new OrderSMSService();
