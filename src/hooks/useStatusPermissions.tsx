import { AppModule, usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';
import { pushNotificationHelper } from '@/services/pushNotificationHelper';
import { orderSMSNotificationService, OrderModule } from '@/services/orderSMSNotificationService';
import { dev, error as logError } from '@/utils/logger';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

interface UseStatusPermissionsReturn {
  canUpdateStatus: (dealerId: string, currentStatus: string, newStatus: string, orderType?: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, newStatus: string, dealerId: string) => Promise<boolean>;
  loading: boolean;
}

export function useStatusPermissions(): UseStatusPermissionsReturn {
  const { enhancedUser, hasModulePermission, loading } = usePermissions();
  const { toast } = useToast();
  const { t } = useTranslation();

  const canUpdateStatus = useCallback(async (
    dealerId: string,
    currentStatus: string,
    newStatus: string,
    orderType?: string
  ): Promise<boolean> => {
    try {
      // System admins can always update status
      if (enhancedUser?.is_system_admin) {
        console.log('✅ System admin - status change allowed');
        return true;
      }

      // Must have enhanced user loaded
      if (!enhancedUser) {
        console.warn('⚠️ No enhanced user loaded - denying status change');
        return false;
      }

      // Can only update orders from own dealership
      if (parseInt(dealerId) !== enhancedUser.dealership_id) {
        console.warn('⚠️ User cannot update orders from different dealership', {
          userDealership: enhancedUser.dealership_id,
          orderDealership: dealerId
        });
        return false;
      }

      // NOTE: Removed validation that prevented changing status on completed/cancelled orders
      // Users with proper permissions should be able to reopen completed/cancelled orders

      // Determine which module to check based on order type
      let module: AppModule = 'sales_orders'; // default

      if (orderType) {
        const moduleMap: Record<string, AppModule> = {
          'sales': 'sales_orders',
          'service': 'service_orders',
          'recon': 'recon_orders',
          'carwash': 'car_wash'
        };
        module = moduleMap[orderType] || 'sales_orders';
      }

      // Check if user has change_status permission for this module
      const hasChangeStatus = hasModulePermission(module, 'change_status');

      console.log('🔍 Status Change Validation:', {
        user: enhancedUser.email,
        dealership: enhancedUser.dealership_id,
        module: module,
        hasChangeStatus: hasChangeStatus,
        currentStatus,
        newStatus,
        orderType,
        roles: enhancedUser.custom_roles.map(r => r.role_name)
      });

      if (!hasChangeStatus) {
        console.warn(`⚠️ User does not have change_status permission for ${module}`);
        return false;
      }

      console.log(`✅ User has permission to change status for ${module}`);
      return true;

    } catch (error) {
      console.error('Error in canUpdateStatus:', error);
      return false;
    }
  }, [enhancedUser, hasModulePermission]);

  const updateOrderStatus = useCallback(async (
    orderId: string,
    newStatus: string,
    dealerId: string
  ): Promise<boolean> => {
    try {
      // Get current order before updating (to get order_number, old_status, type, and vehicle info)
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('order_number, status, customer_name, order_type, vehicle_year, vehicle_make, vehicle_model, short_link')
        .eq('id', orderId)
        .single();

      const oldStatus = currentOrder?.status;

      // Update order status
      const { error } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return false;
      }

      // Send notifications after successful update
      if (currentOrder?.order_number && enhancedUser) {
        const userName = enhancedUser.first_name
          ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
          : enhancedUser.email || 'Someone';

        // Send push notifications to followers (non-blocking)
        pushNotificationHelper
          .notifyOrderStatusChange(
            orderId,
            currentOrder.order_number,
            newStatus,
            userName
          )
          .catch((notifError) => {
            logError('❌ Push notification failed (non-critical):', notifError);
          });

        // Determine module based on order type
        const moduleMap: Record<string, OrderModule> = {
          'sales': 'sales_orders',
          'service': 'service_orders',
          'recon': 'recon_orders',
          'carwash': 'car_wash'
        };
        const module = moduleMap[currentOrder.order_type || 'sales'] || 'sales_orders';

        // Build vehicle info string
        const vehicleInfo = currentOrder.vehicle_year && currentOrder.vehicle_make && currentOrder.vehicle_model
          ? `${currentOrder.vehicle_year} ${currentOrder.vehicle_make} ${currentOrder.vehicle_model}`
          : undefined;

        // Use mda.to short link if available, otherwise fallback
        const shortLink = currentOrder.short_link || `https://app.mydetailarea.com/sales/${orderId}`;

        // Send SMS notifications ONLY when status changes to 'completed' (enterprise requirement)
        if (newStatus === 'completed') {
          console.log('📱 [SMS] Status changed to completed - sending SMS notification');

          try {
            const smsResult = await orderSMSNotificationService.notifyStatusChange(
              orderId,
              parseInt(dealerId),
              module,
              currentOrder.order_number,
              newStatus,
              oldStatus || '',
              vehicleInfo,
              shortLink,
              enhancedUser.id
            );
            console.log('✅ [SMS] SMS notification result:', smsResult);

            // Show toast based on results (with recipient names)
            if (smsResult.sent > 0 && smsResult.failed === 0) {
              const recipients = smsResult.recipientNames && smsResult.recipientNames.length > 0
                ? ` to ${smsResult.recipientNames.join(', ')}`
                : '';
              toast({
                title: '📱 SMS Notification Sent',
                description: `SMS sent to ${smsResult.sent} user(s)${recipients}`,
              });
            } else if (smsResult.sent > 0 && smsResult.failed > 0) {
              toast({
                title: '⚠️ SMS Partially Sent',
                description: `${smsResult.sent} sent, ${smsResult.failed} failed`,
                variant: 'default'
              });
            } else if (smsResult.failed > 0) {
              toast({
                title: '❌ SMS Failed',
                description: `Failed to send ${smsResult.failed} SMS notification(s)`,
                variant: 'destructive'
              });
            }
          } catch (smsError: any) {
            console.error('❌ [SMS] Error sending notification:', smsError);
            logError('⚠️ SMS notification error (non-critical):', smsError);
            toast({
              title: t('common.error'),
              description: t('notifications.sms_error'),
              variant: 'destructive'
            });
          }
        } else {
          console.log(`ℹ️ [SMS] Status changed to '${newStatus}' - SMS only sent for 'completed' status`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return false;
    }
  }, [enhancedUser, toast, t]);

  return {
    canUpdateStatus,
    updateOrderStatus,
    loading
  };
}
