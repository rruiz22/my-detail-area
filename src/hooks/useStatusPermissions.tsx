import { AppModule, usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

interface UseStatusPermissionsReturn {
  canUpdateStatus: (dealerId: string, currentStatus: string, newStatus: string, orderType?: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, newStatus: string, dealerId: string) => Promise<boolean>;
  loading: boolean;
}

export function useStatusPermissions(): UseStatusPermissionsReturn {
  const { enhancedUser, hasModulePermission, loading } = usePermissions();

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

      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return false;
    }
  }, []);

  return {
    canUpdateStatus,
    updateOrderStatus,
    loading
  };
}
