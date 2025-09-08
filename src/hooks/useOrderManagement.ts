import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

// Use Supabase types but create a unified interface for components
type SupabaseOrder = Database['public']['Tables']['orders']['Row'];

// Unified Order type for components
export interface Order {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleInfo?: string;
  vin?: string;
  stockNumber?: string;
  status: string;
  priority?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  totalAmount?: number;
  services?: any[];
  orderType?: string;
  assignedTo?: string;
  notes?: string;
}

// Transform Supabase order to component order
const transformOrder = (supabaseOrder: SupabaseOrder): Order => ({
  id: supabaseOrder.id,
  customerName: supabaseOrder.customer_name,
  customerEmail: supabaseOrder.customer_email || undefined,
  customerPhone: supabaseOrder.customer_phone || undefined,
  vehicleYear: supabaseOrder.vehicle_year || undefined,
  vehicleMake: supabaseOrder.vehicle_make || undefined,
  vehicleModel: supabaseOrder.vehicle_model || undefined,
  vehicleInfo: supabaseOrder.vehicle_info || undefined,
  vin: supabaseOrder.vehicle_vin || undefined,
  stockNumber: supabaseOrder.stock_number || undefined,
  status: supabaseOrder.status,
  priority: supabaseOrder.priority || undefined,
  dueDate: supabaseOrder.sla_deadline || undefined,
  createdAt: supabaseOrder.created_at,
  updatedAt: supabaseOrder.updated_at,
  totalAmount: supabaseOrder.total_amount || undefined,
  services: supabaseOrder.services as any[] || [],
  orderType: supabaseOrder.order_type || undefined,
  assignedTo: undefined, // Not in Supabase schema yet
  notes: undefined, // Not in Supabase schema yet
});

export const useOrderManagement = (activeTab: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tabCounts, setTabCounts] = useState({
    today: 0,
    tomorrow: 0,
    pending: 0,
    in_process: 0,
    complete: 0,
    cancelled: 0,
    week: 0,
    services: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    make: '',
    model: '',
    dateRange: { from: null, to: null },
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const calculateTabCounts = useMemo(() => (allOrders: Order[]) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      today: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length,
      tomorrow: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === tomorrow.toDateString();
      }).length,
      pending: allOrders.filter(order => order.status === 'pending').length,
      in_process: allOrders.filter(order => order.status === 'in_process').length,
      complete: allOrders.filter(order => order.status === 'completed').length,
      cancelled: allOrders.filter(order => order.status === 'cancelled').length,
      week: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate >= today && orderDate <= nextWeek;
      }).length,
      services: allOrders.filter(order => order.orderType === 'service').length,
    };
  }, []);

  const filterOrders = useMemo(() => (allOrders: Order[], tab: string, currentFilters: any) => {
    let filtered = [...allOrders];

    // Apply tab-specific filtering
    if (tab !== 'dashboard' && tab !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      switch (tab) {
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
          filtered = filtered.filter(order => order.status === 'in_process');
          break;
        case 'complete':
          filtered = filtered.filter(order => order.status === 'completed');
          break;
        case 'cancelled':
          filtered = filtered.filter(order => order.status === 'cancelled');
          break;
        case 'week':
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.dueDate || order.createdAt);
            return orderDate >= today && orderDate <= nextWeek;
          });
          break;
        case 'services':
          filtered = filtered.filter(order => order.orderType === 'service');
          break;
      }
    }

    // Apply global filters
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.id?.toLowerCase().includes(searchLower) ||
        order.vin?.toLowerCase().includes(searchLower) ||
        order.stockNumber?.toLowerCase().includes(searchLower) ||
        order.customerName?.toLowerCase().includes(searchLower) ||
        `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
      );
    }

    if (currentFilters.status) {
      filtered = filtered.filter(order => order.status === currentFilters.status);
    }

    if (currentFilters.make) {
      filtered = filtered.filter(order => order.vehicleMake === currentFilters.make);
    }

    if (currentFilters.model) {
      filtered = filtered.filter(order => order.vehicleModel === currentFilters.model);
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
      // Fetch orders from Supabase for the current user's dealer
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      const allOrders = (orders || []).map(transformOrder);
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
      const newOrder = {
        order_number: `ORD-${Date.now()}`,
        customer_name: orderData.customerName,
        customer_email: orderData.customerEmail,
        customer_phone: orderData.customerPhone,
        vehicle_year: parseInt(orderData.year) || null,
        vehicle_make: orderData.make,
        vehicle_model: orderData.model,
        vehicle_vin: orderData.vin,
        stock_number: orderData.stockNumber,
        order_type: 'sales',
        status: 'pending',
        priority: orderData.priority || 'normal',
        services: orderData.services || [],
        total_amount: orderData.totalAmount || 0,
        sla_deadline: orderData.dueDate,
        dealer_id: 5, // Default dealer - will use table default
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      if (error) {
        console.error('Error creating order:', error);
        throw error;
      }

      console.log('Order created successfully:', data);
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
      const { data, error } = await supabase
        .from('orders')
        .update(orderData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order:', error);
        throw error;
      }

      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, ...orderData, updatedAt: new Date().toISOString() }
            : order
        )
      );
      
      console.log('Order updated successfully:', data);
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
        console.error('Error deleting order:', error);
        throw error;
      }

      console.log('Order deleted successfully');
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