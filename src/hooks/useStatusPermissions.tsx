import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissionContext } from '@/contexts/PermissionContext';

interface UseStatusPermissionsReturn {
  canUpdateStatus: (dealerId: string, currentStatus: string, newStatus: string) => Promise<boolean>;
  updateOrderStatus: (orderId: string, newStatus: string, dealerId: string) => Promise<boolean>;
}

export function useStatusPermissions(): UseStatusPermissionsReturn {
  const { hasPermission } = usePermissionContext();

  const canUpdateStatus = useCallback(async (
    dealerId: string, 
    currentStatus: string, 
    newStatus: string
  ): Promise<boolean> => {
    try {
      // Check if user has global order update permissions
      if (hasPermission('orders' as any, 'write' as any)) {
        return true;
      }

      // Check specific status update permissions via database function
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return false;

      const { data, error } = await supabase.rpc('user_can_update_order_status', {
        user_uuid: user.user.id,
        target_dealer_id: parseInt(dealerId),
        current_status: currentStatus,
        new_status: newStatus
      });

      if (error) {
        console.error('Error checking status permissions:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error in canUpdateStatus:', error);
      return false;
    }
  }, [hasPermission]);

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
    updateOrderStatus
  };
}