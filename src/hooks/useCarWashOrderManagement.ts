import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService } from '@/services/orderNumberService';
import type { Database } from '@/integrations/supabase/types';

// Use Supabase types but create a unified interface for components
type SupabaseOrder = Database['public']['Tables']['orders']['Row'];

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
  totalAmount?: number;
  services?: any[];
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
const transformCarWashOrder = (supabaseOrder: any): CarWashOrder => ({
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
  totalAmount: supabaseOrder.total_amount || undefined,
  services: supabaseOrder.services as any[] || [],
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

export const useCarWashOrderManagement = (activeTab: string) => {
  const [orders, setOrders] = useState<CarWashOrder[]>([]);
  const [tabCounts, setTabCounts] = useState({
    today: 0,
    week: 0,
    all: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    waiter: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dealership: '',
    dateRange: { from: null, to: null },
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { generateQR } = useOrderActions();

  const calculateTabCounts = useMemo(() => (allOrders: CarWashOrder[]) => {
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return {
      today: allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length,
      week: allOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= today && orderDate <= weekFromNow;
      }).length,
      all: allOrders.length,
      pending: allOrders.filter(order => order.status === 'pending').length,
      in_progress: allOrders.filter(order => order.status === 'in_progress').length,
      completed: allOrders.filter(order => order.status === 'completed').length,
      cancelled: allOrders.filter(order => order.status === 'cancelled').length,
      waiter: allOrders.filter(order => order.isWaiter).length,
    };
  }, []);

  const filterOrders = useMemo(() => (allOrders: CarWashOrder[], tab: string, currentFilters: any) => {
    let filtered = [...allOrders];

    // Apply tab-specific filtering
    if (tab !== 'dashboard' && tab !== 'all') {
      const today = new Date();
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);

      switch (tab) {
        case 'today':
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate.toDateString() === today.toDateString();
          });
          break;
        case 'week':
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= today && orderDate <= weekFromNow;
          });
          break;
        case 'pending':
          filtered = filtered.filter(order => order.status === 'pending');
          break;
        case 'in_progress':
          filtered = filtered.filter(order => order.status === 'in_progress');
          break;
        case 'completed':
          filtered = filtered.filter(order => order.status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(order => order.status === 'cancelled');
          break;
        case 'waiter':
          filtered = filtered.filter(order => order.isWaiter);
          break;
      }
    }

    // Apply global filters
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.id?.toLowerCase().includes(searchLower) ||
        order.vehicleVin?.toLowerCase().includes(searchLower) ||
        order.stockNumber?.toLowerCase().includes(searchLower) ||
        order.tag?.toLowerCase().includes(searchLower) ||
        `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
      );
    }

    if (currentFilters.status) {
      filtered = filtered.filter(order => order.status === currentFilters.status);
    }

    if (currentFilters.dealership) {
      filtered = filtered.filter(order => order.dealerId.toString() === currentFilters.dealership);
    }

    if (currentFilters.dateRange?.from) {
      const fromDate = new Date(currentFilters.dateRange.from);
      filtered = filtered.filter(order => new Date(order.createdAt) >= fromDate);
    }

    if (currentFilters.dateRange?.to) {
      const toDate = new Date(currentFilters.dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => new Date(order.createdAt) <= toDate);
    }

    return filtered;
  }, []);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Fetch car wash orders from Supabase (basic query first)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'car_wash')
        .order('created_at', { ascending: false });

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

      const filtered = filterOrders(allOrders, activeTab, filters);
      
      setOrders(filtered);
      setTabCounts(calculateTabCounts(allOrders));
    } catch (error) {
      console.error('Error in refreshData:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab, filters, filterOrders, calculateTabCounts, user]);

  const updateFilters = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const createOrder = useCallback(async (orderData: any) => {
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

      const newOrder = {
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
        dealer_id: orderData.dealerId ? parseInt(orderData.dealerId.toString()) : 5,
      };

      console.log('Inserting car wash order to DB:', newOrder);

      const { data, error } = await supabase
        .from('orders')
        .insert(newOrder)
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
      
      await refreshData();
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, refreshData]);

  const updateOrder = useCallback(async (orderId: string, orderData: any) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Map waiter checkbox to priority
      const updateData = {
        ...orderData,
        priority: orderData.isWaiter ? 'urgent' : (orderData.priority || 'normal')
      };
      
      // Remove isWaiter from update data as it's not a DB field
      delete updateData.isWaiter;

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

      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, ...updateData, updatedAt: new Date().toISOString(), isWaiter: updateData.priority === 'urgent' }
            : order
        )
      );
      
      console.log('Car wash order updated successfully:', data);
    } catch (error) {
      console.error('Error in updateOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

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
      await refreshData();
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, refreshData]);

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
            const newOrder = transformCarWashOrder(payload.new as any);
            setOrders(prevOrders => [newOrder, ...prevOrders]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = transformCarWashOrder(payload.new as any);
            setOrders(prevOrders => 
              prevOrders.map(order => 
                order.id === updatedOrder.id ? updatedOrder : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prevOrders => 
              prevOrders.filter(order => order.id !== payload.old.id)
            );
          }
          
          // Recalculate tab counts
          const allOrders = [...orders];
          setTabCounts(calculateTabCounts(allOrders));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, orders, calculateTabCounts]);

  return {
    orders,
    tabCounts,
    filters,
    loading,
    updateFilters,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};