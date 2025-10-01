import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService } from '@/services/orderNumberService';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { usePermissions } from '@/hooks/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import type { Database } from '@/integrations/supabase/types';

// Supabase type definitions
type SupabaseOrder = Database['public']['Tables']['orders']['Row'];
type SupabaseOrderInsert = Database['public']['Tables']['orders']['Insert'];
type SupabaseOrderUpdate = Database['public']['Tables']['orders']['Update'];

// Service-specific service item type
interface ServiceItem {
  id?: string;
  name: string;
  description?: string;
  price?: number;
  quantity?: number;
  category?: string;
}

// Service order creation data
interface ServiceOrderData {
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleYear?: number | string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  vehicleVin?: string;
  po?: string;
  ro?: string;
  tag?: string;
  assignedGroupId?: string;
  services: ServiceItem[];
  totalAmount?: number;
  notes?: string;
  dueDate?: string;
  dealerId: number | string;
}

// Service order tab counts
interface ServiceTabCounts {
  all: number;
  today: number;
  tomorrow: number;
  pending: number;
  in_process: number;
  completed: number;
  cancelled: number;
}

// Service Order specific interface
export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  vehicleVin?: string;
  po?: string;
  ro?: string;
  tag?: string;
  stockNumber?: string; // Mapped from tag for table compatibility
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  services: ServiceItem[];
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  assignedTo?: string; // User name (populated from JOIN)
  assigned_group_id?: string; // User ID from database (required for modal edit)
  notes?: string;
  customOrderNumber?: string;
  dealerId?: number; // Dealer ID from Supabase (required for modal auto-population)
  // Enhanced fields from JOINs
  dealershipName?: string;
  assignedGroupName?: string;
  createdByGroupName?: string;
  dueTime?: string;
}

export interface ServiceOrderFilters {
  search: string;
  status: string;
  make: string;
  model: string;
  dateRange: { from: Date | null; to: Date | null };
}

// Transform Supabase order to ServiceOrder
const transformServiceOrder = (supabaseOrder: SupabaseOrder): ServiceOrder => ({
  id: supabaseOrder.id,
  orderNumber: supabaseOrder.order_number,
  customerName: supabaseOrder.customer_name,
  customerEmail: supabaseOrder.customer_email || undefined,
  customerPhone: supabaseOrder.customer_phone || undefined,
  vehicleYear: supabaseOrder.vehicle_year || undefined,
  vehicleMake: supabaseOrder.vehicle_make || undefined,
  vehicleModel: supabaseOrder.vehicle_model || undefined,
  vehicleInfo: supabaseOrder.vehicle_info || undefined,
  vehicleVin: supabaseOrder.vehicle_vin || undefined,
  po: supabaseOrder.po || undefined,
  ro: supabaseOrder.ro || undefined,
  tag: supabaseOrder.tag || undefined,
  stockNumber: supabaseOrder.tag || undefined, // Map tag to stockNumber for table compatibility
  status: supabaseOrder.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
  services: (supabaseOrder.services as ServiceItem[]) || [],
  totalAmount: supabaseOrder.total_amount || undefined,
  createdAt: supabaseOrder.created_at,
  updatedAt: supabaseOrder.updated_at,
  dueDate: supabaseOrder.due_date || undefined,
  assignedTo: 'Unassigned', // Will be overwritten in refreshData
  assigned_group_id: supabaseOrder.assigned_group_id || undefined, // User ID for modal edit
  notes: supabaseOrder.notes || undefined,
  customOrderNumber: supabaseOrder.custom_order_number || undefined,
  dealerId: supabaseOrder.dealer_id, // Map dealer_id for modal auto-population
  // Enhanced fields from manual JOINs (will be set in refreshData)
  dealershipName: 'Unknown Dealer',
  assignedGroupName: undefined,
  createdByGroupName: undefined,
  dueTime: supabaseOrder.due_date ? new Date(supabaseOrder.due_date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : undefined,
});

export const useServiceOrderManagement = (activeTab: string) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [allOrders, setAllOrders] = useState<ServiceOrder[]>([]); // Keep full dataset
  const [filters, setFilters] = useState<ServiceOrderFilters>({
    search: '',
    status: '',
    make: '',
    model: '',
    dateRange: { from: null, to: null },
  });
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { user } = useAuth();
  const { enhancedUser, getAllowedOrderTypes } = usePermissions();
  const { generateQR } = useOrderActions();
  const queryClient = useQueryClient();

  const tabCounts = useMemo((): ServiceTabCounts => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      all: allOrders.length,
      today: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length,
      tomorrow: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === tomorrow.toDateString();
      }).length,
      pending: allOrders.filter(order => order.status === 'pending').length,
      in_process: allOrders.filter(order => order.status === 'in_progress').length,
      completed: allOrders.filter(order => order.status === 'completed').length,
      cancelled: allOrders.filter(order => order.status === 'cancelled').length,
    };
  }, [allOrders]);

  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Apply tab-specific filtering
    if (activeTab !== 'dashboard' && activeTab !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      switch (activeTab) {
        case 'today':
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.dueDate || order.createdAt);
            return orderDate.toDateString() === today.toDateString();
          });
          break;
        case 'tomorrow':
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.dueDate || order.createdAt);
            return orderDate.toDateString() === tomorrow.toDateString();
          });
          break;
        case 'pending':
          filtered = filtered.filter(order => order.status === 'pending');
          break;
        case 'in_process':
          filtered = filtered.filter(order => order.status === 'in_progress');
          break;
        case 'completed':
          filtered = filtered.filter(order => order.status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(order => order.status === 'cancelled');
          break;
      }
    }

    // Apply global filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.id?.toLowerCase().includes(searchLower) ||
        order.customerName?.toLowerCase().includes(searchLower) ||
        order.po?.toLowerCase().includes(searchLower) ||
        order.ro?.toLowerCase().includes(searchLower) ||
        `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
      );
    }

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.make) {
      filtered = filtered.filter(order => order.vehicleMake === filters.make);
    }

    if (filters.model) {
      filtered = filtered.filter(order => order.vehicleModel === filters.model);
    }

    if (filters.dateRange?.from) {
      const fromDate = new Date(filters.dateRange.from);
      filtered = filtered.filter(order => new Date(order.createdAt) >= fromDate);
    }

    if (filters.dateRange?.to) {
      const toDate = new Date(filters.dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= toDate);
    }

    return filtered;
  }, [allOrders, activeTab, filters]);

  // Smart polling for service order data (replaces real-time subscription and initial refresh)
  const serviceOrdersPollingQuery = useOrderPolling(
    ['orders', 'service'],
    async () => {
      if (!user || !enhancedUser) return [];

      console.log('🔄 Smart polling: Fetching service orders...');

      // Apply same dealer filtering logic as Sales Orders
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'service')
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
            console.log(`🏢 Service Polling - Multi-dealer user - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown
          console.log(`🎯 Service Polling - Multi-dealer user - filtering by selected dealer: ${dealerFilter}`);
          ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
        }
      } else {
        // User has single assigned dealership - ignore global filter
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      // Filter by allowed order types
      const allowedOrderTypes = getAllowedOrderTypes();
      if (allowedOrderTypes.length > 0) {
        ordersQuery = ordersQuery.in('order_type', allowedOrderTypes);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;

      // Fetch related data in parallel (same as refreshData)
      const [dealershipsResult, profilesResult, groupsResult] = await Promise.all([
        supabase.from('dealerships').select('id, name'),
        supabase.from('profiles').select('id, first_name, last_name, email'),
        supabase.from('dealer_groups').select('id, name')
      ]);

      // Create lookup maps for better performance
      const dealershipMap = new Map(dealershipsResult.data?.map(d => [d.id, d.name]) || []);
      const userMap = new Map(profilesResult.data?.map(u => [
        u.id,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      ]) || []);
      const groupMap = new Map(groupsResult.data?.map(g => [g.id, g.name]) || []);

      // Transform orders with joined data
      const serviceOrders = (orders || []).map(order => {
        const transformed = transformServiceOrder(order);

        // DEBUG: Log polling assignment data
        console.log('🔄 Polling Assignment Debug:', {
          orderId: order.id,
          orderNumber: order.order_number,
          assigned_group_id: order.assigned_group_id,
          due_date: order.due_date
        });

        // Add joined data manually
        transformed.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformed.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformed.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;

        // Fix assignment mapping - assigned_group_id contains user IDs
        transformed.assignedTo = order.assigned_group_id ?
          userMap.get(order.assigned_group_id) || 'Unknown User' : 'Unassigned';

        console.log('✅ Polling mapped:', transformed.assignedTo, 'dueDate:', transformed.dueDate);

        return transformed;
      });

      return serviceOrders;
    },
    !!(user && enhancedUser)
  );

  // Simplified refreshData - uses polling query for consistency
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered - using polling query');
    await serviceOrdersPollingQuery.refetch();
  }, [serviceOrdersPollingQuery]);

  const updateFilters = useCallback((newFilters: Partial<ServiceOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const createOrder = useCallback(async (orderData: ServiceOrderData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('Creating service order with data:', orderData);
      
      // Use database function to generate sequential order number
      const { data: orderNumberData, error: numberError } = await supabase
        .rpc('generate_service_order_number');

      if (numberError || !orderNumberData) {
        console.error('Error generating order number:', numberError);
        throw new Error('Failed to generate service order number');
      }

      const insertData: SupabaseOrderInsert = {
        order_number: orderNumberData, // Use sequential SV-1001, SV-1002, etc.
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail,
        customer_phone: orderData.customerPhone,
        vehicle_year: orderData.vehicleYear ? parseInt(orderData.vehicleYear.toString()) : null,
        vehicle_make: orderData.vehicleMake,
        vehicle_model: orderData.vehicleModel,
        vehicle_vin: orderData.vehicleVin,
        vehicle_info: orderData.vehicleInfo,
        po: orderData.po,
        ro: orderData.ro,
        tag: orderData.tag,
        assigned_group_id: orderData.assignedGroupId || null,
        order_type: 'service',
        status: 'pending',
        services: orderData.services || [],
        total_amount: orderData.totalAmount || 0,
        due_date: orderData.dueDate || null, // Use due_date, NOT sla_deadline
        dealer_id: orderData.dealerId ? parseInt(orderData.dealerId.toString()) : 5,
        notes: orderData.notes,
      };

      console.log('Inserting service order to DB:', insertData);

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating service order:', error);
        throw error;
      }

      console.log('Service order created successfully:', data);
      
      // Auto-generate QR code and shortlink
      try {
        await generateQR(data.id, data.order_number, data.dealer_id);
        console.log('QR code and shortlink generated for service order:', data.order_number);
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Don't fail the order creation if QR generation fails
      }

      // Force immediate refetch to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'service'] });
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, generateQR, queryClient]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<ServiceOrderData> & { status?: string }) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      const updateData: SupabaseOrderUpdate = {
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail,
        customer_phone: orderData.customerPhone,
        vehicle_year: orderData.vehicleYear ? parseInt(orderData.vehicleYear.toString()) : undefined,
        vehicle_make: orderData.vehicleMake,
        vehicle_model: orderData.vehicleModel,
        vehicle_vin: orderData.vehicleVin,
        vehicle_info: orderData.vehicleInfo,
        po: orderData.po,
        ro: orderData.ro,
        tag: orderData.tag,
        status: orderData.status,
        services: orderData.services,
        total_amount: orderData.totalAmount,
        sla_deadline: orderData.dueDate,
        notes: orderData.notes,
      };

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating service order:', error);
        throw error;
      }

      console.log('Service order updated successfully:', data);

      // Force immediate refetch to get fresh data
      await queryClient.refetchQueries({ queryKey: ['orders', 'service'] });
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
        console.error('Error deleting service order:', error);
        throw error;
      }

      console.log('Service order deleted successfully');

      // Force immediate refetch to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'service'] });
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient]);

  // DISABLED: Initialize data on mount - now using ONLY polling system to prevent double refresh
  // useEffect(() => {
  //   refreshData();
  // }, [refreshData]);

  // DISABLED: Real-time subscription - now using ONLY polling system to prevent multiple refresh
  // useEffect(() => {
  //   if (!user) return;

  //   const channel = supabase
  //     .channel('service_orders_realtime')
  //     .on(
  //       'postgres_changes',
  //       {
  //         event: '*',
  //         schema: 'public',
  //         table: 'orders',
  //         filter: 'order_type=eq.service'
  //       },
  //       async (payload) => {
  //         console.log('Service order real-time update:', payload);

  //         if (payload.eventType === 'INSERT') {
  //           const newOrder = transformServiceOrder(payload.new as SupabaseOrder);
  //           setOrders(prevOrders => [newOrder, ...prevOrders]);
  //         } else if (payload.eventType === 'UPDATE') {
  //           const updatedOrder = transformServiceOrder(payload.new as SupabaseOrder);
  //           setOrders(prevOrders =>
  //             prevOrders.map(order =>
  //               order.id === updatedOrder.id ? updatedOrder : order
  //             )
  //           );
  //         } else if (payload.eventType === 'DELETE') {
  //           setOrders(prevOrders =>
  //             prevOrders.filter(order => order.id !== (payload.old as { id: string }).id)
  //           );
  //         }
  //       }
  //     )
  //     .subscribe();

  //   return () => {
  //     supabase.removeChannel(channel);
  //   };
  // }, [user]);

  // Update allOrders when polling data changes
  useEffect(() => {
    if (serviceOrdersPollingQuery.data) {
      setAllOrders(serviceOrdersPollingQuery.data);
      setLoading(false);
    }
  }, [serviceOrdersPollingQuery.data]);

  // Update lastRefresh when polling completes
  useEffect(() => {
    if (!serviceOrdersPollingQuery.isFetching && (serviceOrdersPollingQuery.data || serviceOrdersPollingQuery.error)) {
      setLastRefresh(new Date());
      console.log('⏰ Service Orders LastRefresh updated:', new Date().toLocaleTimeString());
    }
  }, [serviceOrdersPollingQuery.isFetching, serviceOrdersPollingQuery.data, serviceOrdersPollingQuery.error]);

  return {
    orders: filteredOrders,
    tabCounts,
    filters,
    loading,
    lastRefresh,
    updateFilters,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};