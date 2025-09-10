import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService } from '@/services/orderNumberService';
import type { Database } from '@/integrations/supabase/types';

// Use Supabase types but create a unified interface for components
type SupabaseOrder = Database['public']['Tables']['orders']['Row'];

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
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  services: any[];
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  assignedTo?: string;
  notes?: string;
  customOrderNumber?: string;
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
  dateRange: { from: any; to: any };
}

// Transform Supabase order to ServiceOrder (with JOIN data)
const transformServiceOrder = (supabaseOrder: any): ServiceOrder => ({
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
  status: supabaseOrder.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
  services: supabaseOrder.services as any[] || [],
  totalAmount: supabaseOrder.total_amount || undefined,
  createdAt: supabaseOrder.created_at,
  updatedAt: supabaseOrder.updated_at,
  dueDate: supabaseOrder.sla_deadline || undefined,
  assignedTo: supabaseOrder.assigned_group?.name || 'Unassigned',
  notes: supabaseOrder.notes || undefined,
  customOrderNumber: supabaseOrder.custom_order_number || undefined,
  // Enhanced fields from JOINs
  dealershipName: supabaseOrder.dealerships?.name || 'Unknown Dealer',
  assignedGroupName: supabaseOrder.assigned_group?.name || undefined,
  createdByGroupName: supabaseOrder.created_by_group?.name || undefined,
  dueTime: supabaseOrder.sla_deadline ? new Date(supabaseOrder.sla_deadline).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  }) : undefined,
});

export const useServiceOrderManagement = (activeTab: string) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [filters, setFilters] = useState<ServiceOrderFilters>({
    search: '',
    status: '',
    make: '',
    model: '',
    dateRange: { from: null, to: null },
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { generateQR } = useOrderActions();

  const tabCounts = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return {
      all: orders.length,
      today: orders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length,
      tomorrow: orders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === tomorrow.toDateString();
      }).length,
      pending: orders.filter(order => order.status === 'pending').length,
      inProgress: orders.filter(order => order.status === 'in_progress').length,
      completed: orders.filter(order => order.status === 'completed').length,
      cancelled: orders.filter(order => order.status === 'cancelled').length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

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
        case 'inProgress':
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
  }, [orders, activeTab, filters]);

  const refreshData = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Fetch service orders from Supabase with JOINs for dealer and group names
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          dealerships!inner(name),
          assigned_group:dealer_groups!assigned_group_id(name),
          created_by_group:dealer_groups!created_by_group_id(name)
        `)
        .eq('order_type', 'service')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching service orders:', error);
        return;
      }

      const serviceOrders = (orders || []).map(transformServiceOrder);
      setOrders(serviceOrders);
    } catch (error) {
      console.error('Error in refreshData:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateFilters = useCallback((newFilters: Partial<ServiceOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const createOrder = useCallback(async (orderData: any) => {
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

      const newOrder = {
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
        order_type: 'service',
        status: 'pending',
        services: orderData.services || [],
        total_amount: orderData.totalAmount || 0,
        sla_deadline: orderData.dueDate,
        dealer_id: orderData.dealerId ? parseInt(orderData.dealerId.toString()) : 5,
        notes: orderData.notes,
      };

      console.log('Inserting service order to DB:', newOrder);

      const { data, error } = await supabase
        .from('orders')
        .insert(newOrder)
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
      
      await refreshData();
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, refreshData, generateQR]);

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
        console.error('Error updating service order:', error);
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
      
      console.log('Service order updated successfully:', data);
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
        console.error('Error deleting service order:', error);
        throw error;
      }

      console.log('Service order deleted successfully');
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

  // Real-time subscription for service orders
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('service_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'order_type=eq.service'
        },
        async (payload) => {
          console.log('Service order real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = transformServiceOrder(payload.new as any);
            setOrders(prevOrders => [newOrder, ...prevOrders]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = transformServiceOrder(payload.new as any);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    orders: filteredOrders,
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