import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService } from '@/services/orderNumberService';
import type { Database } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';

// Supabase type definitions
type SupabaseOrder = Database['public']['Tables']['orders']['Row'];
type SupabaseOrderInsert = Database['public']['Tables']['orders']['Insert'];
type SupabaseOrderUpdate = Database['public']['Tables']['orders']['Update'];

// CarWash-specific service item type
interface CarWashServiceItem {
  type: string;
  name?: string;
  price?: number;
  description?: string;
}

// CarWash order creation data
interface CarWashOrderData {
  vehicleYear?: number | string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  vehicleVin?: string;
  stockNumber?: string;
  tag?: string;
  isWaiter?: boolean;
  services?: CarWashServiceItem[];
  totalAmount?: number;
  notes?: string;
  completedAt?: Date; // Service completion date
  dealerId: number | string;
}

// Unified CarWash Order type for components
export interface CarWashOrder {
  id: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  vehicleVin?: string;
  stockNumber?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: string;
  isWaiter?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string; // Service completion date
  totalAmount?: number;
  services?: CarWashServiceItem[];
  notes?: string;
  customOrderNumber?: string;
  dealerId: number;
  tag?: string;
  // Enhanced fields from JOINs
  dealershipName?: string;
  assignedGroupName?: string;
  createdByGroupName?: string;
  assignedTo?: string;
  dueTime?: string;
  dueDate?: string;
}

// Transform Supabase order to component order
const transformCarWashOrder = (supabaseOrder: SupabaseOrder): CarWashOrder => ({
  id: supabaseOrder.id,
  vehicleYear: supabaseOrder.vehicle_year || undefined,
  vehicleMake: supabaseOrder.vehicle_make || undefined,
  vehicleModel: supabaseOrder.vehicle_model || undefined,
  vehicleInfo: supabaseOrder.vehicle_info || undefined,
  vehicleVin: supabaseOrder.vehicle_vin || undefined,
  stockNumber: supabaseOrder.stock_number || undefined,
  status: supabaseOrder.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
  priority: supabaseOrder.priority || undefined,
  isWaiter: supabaseOrder.priority === 'urgent',
  createdAt: supabaseOrder.created_at,
  updatedAt: supabaseOrder.updated_at,
  completedAt: supabaseOrder.completed_at || undefined,
  totalAmount: supabaseOrder.total_amount || undefined,
  services: (supabaseOrder.services as CarWashServiceItem[]) || [],
  notes: supabaseOrder.notes || undefined,
  customOrderNumber: supabaseOrder.custom_order_number || undefined,
  dealerId: supabaseOrder.dealer_id,
  tag: supabaseOrder.tag || undefined,
  // Enhanced fields from manual JOINs (will be set in refreshData)
  dealershipName: 'Unknown Dealer',
  assignedGroupName: undefined,
  createdByGroupName: undefined,
  assignedTo: 'Unassigned',
  dueTime: supabaseOrder.sla_deadline ? new Date(supabaseOrder.sla_deadline).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : undefined,
  dueDate: supabaseOrder.sla_deadline || supabaseOrder.due_date || undefined,
});

export const useCarWashOrderManagement = () => {
  const [orders, setOrders] = useState<CarWashOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, enhancedUser } = useAuth();
  const { generateQR } = useOrderActions();
  const queryClient = useQueryClient();

  const refreshData = useCallback(async () => {
    if (!user || !enhancedUser) return;

    setLoading(true);

    try {
      console.log('🔄 CarWash refreshData: Fetching car wash orders...');

      // Apply same dealer filtering logic as other modules
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'car_wash')
        .order('created_at', { ascending: false });

      // Check global dealer filter
      const savedDealerFilter = localStorage.getItem('selectedDealerFilter');
      const dealerFilter = savedDealerFilter === 'all' ? 'all' : (savedDealerFilter ? parseInt(savedDealerFilter) : 'all');

      // Handle dealer filtering based on user type and global filter
      if (enhancedUser.dealership_id === null) {
        // User is multi-dealer - respect global filter
        if (dealerFilter === 'all') {
          // Show all dealers user has access to
          const { data: userDealerships, error: dealershipError } = await supabase
            .from('dealer_memberships')
            .select('dealer_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (dealershipError) {
            console.error('Error fetching user dealerships:', dealershipError);
            ordersQuery = ordersQuery.eq('dealer_id', 5);
          } else {
            const dealerIds = userDealerships?.map(d => d.dealer_id) || [5];
            console.log(`🏢 CarWash refreshData - Multi-dealer user - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown
          console.log(`🎯 CarWash refreshData - Multi-dealer user - filtering by selected dealer: ${dealerFilter}`);
          ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
        }
      } else {
        // User has single assigned dealership - ignore global filter
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      const { data: orders, error } = await ordersQuery;

      if (error) {
        console.error('Error fetching car wash orders:', error);
        return;
      }

      // Fetch dealerships data separately
      const { data: dealerships, error: dealershipsError } = await supabase
        .from('dealerships')
        .select('id, name');

      if (dealershipsError) {
        console.error('Error fetching dealerships:', dealershipsError);
      }

      // Fetch dealer groups data separately
      const { data: dealerGroups, error: groupsError } = await supabase
        .from('dealer_groups')
        .select('id, name');

      if (groupsError) {
        console.error('Error fetching dealer groups:', groupsError);
      }

      // Create lookup maps for better performance
      const dealershipMap = new Map(dealerships?.map(d => [d.id, d.name]) || []);
      const groupMap = new Map(dealerGroups?.map(g => [g.id, g.name]) || []);

      // Transform orders with joined data
      const allOrders = (orders || []).map(order => {
        const transformedOrder = transformCarWashOrder(order);
        // Add joined data manually
        transformedOrder.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;
        transformedOrder.assignedTo = transformedOrder.assignedGroupName || 'Unassigned';
        return transformedOrder;
      });

      setOrders(allOrders);
    } catch (error) {
      console.error('Error in refreshData:', error);
    } finally {
      setLoading(false);
    }
  }, [user, enhancedUser]);

  const createOrder = useCallback(async (orderData: CarWashOrderData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('Creating car wash order with data:', orderData);
      
      // Use database function to generate sequential order number
      const { data: orderNumberData, error: numberError } = await supabase
        .rpc('generate_custom_order_number');

      if (numberError || !orderNumberData) {
        console.error('Error generating order number:', numberError);
        throw new Error('Failed to generate order number');
      }

      const insertData: SupabaseOrderInsert = {
        order_number: orderNumberData, // Use sequential CW-1001, CW-1002, etc.
        customer_name: 'Car Wash Service', // Default for car wash orders
        vehicle_year: orderData.vehicleYear ? parseInt(orderData.vehicleYear.toString()) : null,
        vehicle_make: orderData.vehicleMake,
        vehicle_model: orderData.vehicleModel,
        vehicle_vin: orderData.vehicleVin,
        vehicle_info: orderData.vehicleInfo,
        stock_number: orderData.stockNumber,
        tag: orderData.tag,
        order_type: 'car_wash',
        status: 'pending',
        priority: orderData.isWaiter ? 'urgent' : 'normal',
        services: orderData.services || [],
        total_amount: orderData.totalAmount || 0,
        notes: orderData.notes,
        completed_at: orderData.completedAt ? orderData.completedAt.toISOString() : null,
        dealer_id: orderData.dealerId ? parseInt(orderData.dealerId.toString()) : 5,
      };

      console.log('Inserting car wash order to DB:', insertData);

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating car wash order:', error);
        throw error;
      }

      console.log('Car wash order created successfully:', data);
      
      // Auto-generate QR code and shortlink
      try {
        await generateQR(data.id, data.order_number, data.dealer_id);
        console.log('QR code and shortlink generated for order:', data.order_number);
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Don't fail the order creation if QR generation fails
      }

      // Invalidate React Query cache to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'car_wash'] });

      // Real-time subscription will handle the data update automatically
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, generateQR, queryClient]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<CarWashOrderData> & { status?: string }) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Map waiter checkbox to priority and prepare update data
      const updateDataRaw = {
        ...orderData,
        priority: orderData.isWaiter ? 'urgent' : 'normal'
      };

      // Remove isWaiter from update data as it's not a DB field
      delete updateDataRaw.isWaiter;

      const updateData: SupabaseOrderUpdate = {
        vehicle_year: updateDataRaw.vehicleYear ? parseInt(updateDataRaw.vehicleYear.toString()) : undefined,
        vehicle_make: updateDataRaw.vehicleMake,
        vehicle_model: updateDataRaw.vehicleModel,
        vehicle_vin: updateDataRaw.vehicleVin,
        vehicle_info: updateDataRaw.vehicleInfo,
        stock_number: updateDataRaw.stockNumber,
        tag: updateDataRaw.tag,
        status: updateDataRaw.status,
        priority: updateDataRaw.priority,
        services: updateDataRaw.services,
        total_amount: updateDataRaw.totalAmount,
        notes: updateDataRaw.notes,
        completed_at: updateDataRaw.completedAt ? (updateDataRaw.completedAt instanceof Date ? updateDataRaw.completedAt.toISOString() : updateDataRaw.completedAt) : undefined,
      };

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating car wash order:', error);
        throw error;
      }

      console.log('Car wash order updated successfully:', data);

      // Invalidate React Query cache to force fresh data from polling
      await queryClient.refetchQueries({ queryKey: ['orders', 'car_wash'] });
    } catch (error) {
      console.error('Error in updateOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting car wash order:', error);
        throw error;
      }

      console.log('Car wash order deleted successfully');

      // Invalidate React Query cache to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'car_wash'] });

      // Real-time subscription will handle the data update automatically
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient]);

  // Initialize data on mount and when dependencies change
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Real-time subscription for car wash orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('car_wash_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'order_type=eq.car_wash'
        },
        async (payload) => {
          console.log('Car wash order real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = transformCarWashOrder(payload.new as SupabaseOrder);
            setOrders(prevOrders => [newOrder, ...prevOrders]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = transformCarWashOrder(payload.new as SupabaseOrder);
            setOrders(prevOrders =>
              prevOrders.map(order =>
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prevOrders =>
              prevOrders.filter(order => order.id !== (payload.old as { id: string }).id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    orders,
    loading,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};