import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { useOrderActions } from '@/hooks/useOrderActions';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
export interface CarWashOrderData {
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
  status?: string;
  completedAt?: Date; // Service completion date
  dealerId: number | string;
}

// Unified CarWash Order type for components
export interface CarWashOrder {
  id: string;
  orderNumber: string;
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
  dealer_id?: number; // CRITICAL: snake_case for multi-tenant security (StatusBadgeInteractive)
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
  orderNumber: supabaseOrder.order_number,
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
  dealerId: supabaseOrder.dealer_id, // camelCase for modal auto-population
  dealer_id: supabaseOrder.dealer_id, // CRITICAL: snake_case for multi-tenant security
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
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { enhancedUser } = usePermissions();
  const { generateQR } = useOrderActions();
  const queryClient = useQueryClient();
  const { selectedDealerId } = useDealerFilter();  // ✅ FIX: Use dealer filter from context

  // Check if polling should be enabled
  const isPollingEnabled = !!(user && enhancedUser);

  // Smart polling for car wash order data (replaces real-time subscription and initial refresh)
  // ✅ FIX: Include selectedDealerId in queryKey so cache invalidates when dealer changes
  const carWashOrdersPollingQuery = useOrderPolling(
    ['orders', 'car_wash', selectedDealerId],  // ✅ FIX: Added selectedDealerId to queryKey
    async () => {
      if (!user || !enhancedUser) {
        return [];
      }

      // Apply same dealer filtering logic as other modules
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'carwash')
        .order('created_at', { ascending: false });

      // ✅ FIX: Use selectedDealerId from context instead of reading localStorage
      const dealerFilter = selectedDealerId;

      // Handle dealer filtering based on user type and global filter
      // ✅ FIX: System admins and supermanagers should ALWAYS respect global filter
      const isSystemAdminPolling = enhancedUser && 'is_system_admin' in enhancedUser
        ? enhancedUser.is_system_admin
        : enhancedUser && 'role' in enhancedUser && enhancedUser.role === 'system_admin';

      const isSupermanagerPolling = enhancedUser && 'is_supermanager' in enhancedUser
        ? enhancedUser.is_supermanager
        : enhancedUser && 'role' in enhancedUser && enhancedUser.role === 'supermanager';

      const shouldUseGlobalFilterPolling = enhancedUser.dealership_id === null || isSystemAdminPolling || isSupermanagerPolling;

      if (shouldUseGlobalFilterPolling) {
        // Multi-dealer users and system admins - respect global filter
        if (dealerFilter === 'all') {
          // Show all dealers user has access to
          const { data: userDealerships, error: dealershipError } = await supabase
            .from('dealer_memberships')
            .select('dealer_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (dealershipError) {
            // 🔒 SECURITY: Database error - return empty results (fail-secure)
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else if (!userDealerships || userDealerships.length === 0) {
            // 🔒 SECURITY: No memberships = no data access (fail-secure)
            ordersQuery = ordersQuery.eq('dealer_id', -1);
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            // 🔒 SECURITY: Invalid dealer filter - return empty results (fail-secure)
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          }
        }
      } else {
        // Single-dealer regular users - use their assigned dealership (ignore global filter)
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;

      // Fetch related data in parallel for better performance
      // 🔧 FIX: Use RPC function for profiles to bypass RLS caching issues
      const [
        { data: dealerships, error: dealershipsError },
        { data: dealerGroups, error: groupsError },
        { data: userProfiles, error: profilesError }
      ] = await Promise.all([
        supabase.from('dealerships').select('id, name'),
        supabase.from('dealer_groups').select('id, name'),
        supabase.rpc('get_dealer_user_profiles')
      ]);

      // Create lookup maps for better performance
      const dealershipMap = new Map(dealerships?.map(d => [d.id, d.name]) || []);
      const groupMap = new Map(dealerGroups?.map(g => [g.id, g.name]) || []);
      const userMap = new Map(userProfiles?.map(u => [
        u.id,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      ]) || []);

      // Transform orders with joined data
      const transformedOrders = (orders || []).map(order => {
        const transformedOrder = transformCarWashOrder(order);
        // Add joined data manually
        transformedOrder.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;

        // Set assignedTo - if not assigned, show creator
        if (order.assigned_group_id) {
          transformedOrder.assignedTo = groupMap.get(order.assigned_group_id) || userMap.get(order.assigned_group_id) || 'Unknown';
        } else if (order.created_by) {
          transformedOrder.assignedTo = userMap.get(order.created_by) || 'Unknown';
        } else {
          transformedOrder.assignedTo = 'Unassigned';
        }

        return transformedOrder;
      });

      return transformedOrders;
    },
    isPollingEnabled
  );

  // Derive orders directly from polling query using useMemo for silent updates
  const allOrders = useMemo(() =>
    carWashOrdersPollingQuery.data || [],
    [carWashOrdersPollingQuery.data]
  );

  // Simplified refreshData - uses polling query for consistency
  const refreshData = useCallback(async () => {
    await carWashOrdersPollingQuery.refetch();
    // Toast is shown in the component's handleManualRefresh to avoid duplication
  }, [carWashOrdersPollingQuery]);

  const createOrder = useCallback(async (orderData: CarWashOrderData) => {
    if (!user) return;

    setLoading(true);

    try {
      // Use database function to generate sequential car wash order number
      const { data: orderNumberData, error: numberError } = await supabase
        .rpc('generate_car_wash_order_number');

      if (numberError || !orderNumberData) {
        throw new Error('Failed to generate car wash order number');
      }

      const insertData: SupabaseOrderInsert = {
        order_number: orderNumberData, // Use sequential CW-1001, CW-1002, etc.
        vehicle_year: orderData.vehicleYear ? parseInt(orderData.vehicleYear.toString()) : null,
        vehicle_make: orderData.vehicleMake,
        vehicle_model: orderData.vehicleModel,
        vehicle_vin: orderData.vehicleVin,
        vehicle_info: orderData.vehicleInfo,
        stock_number: orderData.stockNumber,
        tag: orderData.tag,
        order_type: 'carwash',
        status: orderData.status || 'pending',
        priority: orderData.isWaiter ? 'urgent' : 'normal',
        services: orderData.services || [],
        total_amount: orderData.totalAmount || 0,
        notes: orderData.notes,
        completed_at: orderData.completedAt ? orderData.completedAt.toISOString() : null,
        dealer_id: orderData.dealerId && Number.isInteger(Number(orderData.dealerId))
          ? parseInt(orderData.dealerId.toString())
          : null,
        created_by: user.id, // ✅ Track which USER created the order
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const newOrder = transformCarWashOrder(data);

      // Optimistic update: Add order immediately to UI using query cache
      queryClient.setQueryData(['orders', 'car_wash'], (oldData: CarWashOrder[] | undefined) =>
        oldData ? [newOrder, ...oldData] : [newOrder]
      );

      // Auto-generate QR code and shortlink in background (fire-and-forget, non-blocking)
      generateQR(data.id, data.order_number, data.dealer_id).catch(() => {
        // QR generation failure doesn't affect order creation
      });

      // Show success immediately (don't wait for QR)
      toast({
        description: t('car_wash.order_created_successfully') || 'Car wash order created successfully',
        variant: 'default'
      });

      // Invalidate queries to trigger immediate table refresh
      await queryClient.invalidateQueries({ queryKey: ['orders', 'car_wash'] });

      return newOrder;
    } catch (error) {
      toast({
        description: t('car_wash.error_creating_order') || 'Error creating car wash order',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, generateQR, queryClient, t]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<CarWashOrderData> & { status?: string }) => {
    if (!user) return;

    setLoading(true);

    try {
      // Build updateData dynamically - only include fields explicitly provided
      // This prevents accidental data loss when doing partial updates (e.g., status change)
      const updateData: SupabaseOrderUpdate = {};

      // Vehicle information
      if (orderData.vehicleYear !== undefined) {
        updateData.vehicle_year = parseInt(orderData.vehicleYear.toString());
      }
      if (orderData.vehicleMake !== undefined) {
        updateData.vehicle_make = orderData.vehicleMake;
      }
      if (orderData.vehicleModel !== undefined) {
        updateData.vehicle_model = orderData.vehicleModel;
      }
      if (orderData.vehicleVin !== undefined) {
        updateData.vehicle_vin = orderData.vehicleVin;
      }
      if (orderData.vehicleInfo !== undefined) {
        updateData.vehicle_info = orderData.vehicleInfo;
      }

      // Stock and tag information
      if (orderData.stockNumber !== undefined) {
        updateData.stock_number = orderData.stockNumber;
      }
      if (orderData.tag !== undefined) {
        updateData.tag = orderData.tag;
      }

      // Order status and priority
      if (orderData.status !== undefined) {
        updateData.status = orderData.status;
      }
      if (orderData.isWaiter !== undefined) {
        // Map waiter checkbox to priority
        updateData.priority = orderData.isWaiter ? 'urgent' : 'normal';
      }

      // CRITICAL: Only update services if explicitly provided
      // This prevents clearing services array during status-only updates
      if (orderData.services !== undefined) {
        updateData.services = orderData.services;
      }

      // Pricing
      if (orderData.totalAmount !== undefined) {
        updateData.total_amount = orderData.totalAmount;
      }

      // Notes
      if (orderData.notes !== undefined) {
        updateData.notes = orderData.notes;
      }

      // Dates
      if (orderData.completedAt !== undefined) {
        updateData.completed_at = orderData.completedAt
          ? (orderData.completedAt instanceof Date ? orderData.completedAt.toISOString() : orderData.completedAt)
          : null;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedOrder = transformCarWashOrder(data);

      // Optimistic update: Update order immediately in UI using query cache
      queryClient.setQueryData(['orders', 'car_wash'], (oldData: CarWashOrder[] | undefined) =>
        oldData ? oldData.map(order => order.id === orderId ? updatedOrder : order) : []
      );

      // Toast is shown in the component's handleStatusChange/handleUpdate
      // Not here to avoid duplication

      // Invalidate React Query cache to force fresh data from polling
      await queryClient.refetchQueries({ queryKey: ['orders', 'car_wash'] });

      return updatedOrder;
    } catch (error) {
      toast({
        description: t('car_wash.error_updating_order') || 'Error updating car wash order',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient, t]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        toast({
          description: t('car_wash.error_deleting_order') || 'Error deleting car wash order',
          variant: 'destructive'
        });
        throw error;
      }

      // Optimistic update: Remove order immediately from UI using query cache
      queryClient.setQueryData(['orders', 'car_wash'], (oldData: CarWashOrder[] | undefined) =>
        oldData ? oldData.filter(order => order.id !== orderId) : []
      );

      toast({
        description: t('car_wash.order_deleted_successfully') || 'Car wash order deleted successfully',
        variant: 'default'
      });

      // Invalidate React Query cache to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'car_wash'] });

      return true;
    } catch (error) {
      toast({
        description: t('car_wash.error_deleting_order') || 'Error deleting car wash order',
        variant: 'destructive'
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient, t]);


  // Trigger initial fetch when enhancedUser becomes available
  useEffect(() => {
    if (user && enhancedUser && !carWashOrdersPollingQuery.data) {
      carWashOrdersPollingQuery.refetch();
    }
  }, [user, enhancedUser, carWashOrdersPollingQuery]);

  // Update lastRefresh when polling completes
  useEffect(() => {
    if (!carWashOrdersPollingQuery.isFetching && carWashOrdersPollingQuery.dataUpdatedAt) {
      setLastRefresh(new Date(carWashOrdersPollingQuery.dataUpdatedAt));
    }
  }, [carWashOrdersPollingQuery.isFetching, carWashOrdersPollingQuery.dataUpdatedAt]);

  // Listen for status updates to trigger immediate refresh using EventBus
  useEffect(() => {
    const handleStatusUpdate = () => {
      carWashOrdersPollingQuery.refetch();
    };

    // Import dynamically to avoid circular dependencies
    import('@/utils/eventBus').then(({ orderEvents }) => {
      orderEvents.on('orderStatusUpdated', handleStatusUpdate);
    });

    return () => {
      import('@/utils/eventBus').then(({ orderEvents }) => {
        orderEvents.off('orderStatusUpdated', handleStatusUpdate);
      });
    };
  }, [carWashOrdersPollingQuery]);

  return {
    orders: allOrders,
    loading,
    lastRefresh,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};
