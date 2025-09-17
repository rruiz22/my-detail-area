import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService, OrderType } from '@/services/orderNumberService';
import type { Database } from '@/integrations/supabase/types';

// Enhanced database types
type SupabaseOrderRow = Database['public']['Tables']['orders']['Row'];
type SupabaseOrderInsert = Database['public']['Tables']['orders']['Insert'];
type SupabaseOrderUpdate = Database['public']['Tables']['orders']['Update'];

// Service item interface
interface OrderService {
  id: string;
  name: string;
  price: number;
  description?: string;
  category?: string;
  duration?: number;
}

// Order form data for creation/updates
interface OrderFormData {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  vehicle_year?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_info?: string;
  vehicle_vin?: string;
  stock_number?: string;
  order_type?: string;
  priority?: string;
  due_date?: string;
  sla_deadline?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_group_id?: string;
  assigned_contact_id?: string;
  dealer_id?: number;
  notes?: string;
  internal_notes?: string;
  salesperson?: string;
  total_amount?: number;
  services?: OrderService[];
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
}

// Filter types
interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface OrderFilters {
  search: string;
  status: string;
  make: string;
  model: string;
  dateRange: DateRange;
}

// Database error handling
interface DatabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

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
  vehicleVin?: string;
  stockNumber?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  totalAmount?: number;
  services?: OrderService[];
  orderType?: string;
  assignedTo?: string;
  notes?: string;
  customOrderNumber?: string;
  // Enhanced fields from JOINs
  dealershipName?: string;
  assignedGroupName?: string;
  createdByGroupName?: string;
  dueTime?: string;
}

// Transform Supabase order to component order
const transformOrder = (supabaseOrder: SupabaseOrderRow): Order => {
  // Helper function to safely get field values
  const getFieldValue = <T>(value: T | null | undefined, defaultValue?: T): T | undefined => {
    if (value === null || value === undefined) return defaultValue;
    return value;
  };

  // Primary date source is due_date, fallback to sla_deadline for compatibility
  const primaryDate = getFieldValue(supabaseOrder.due_date) || getFieldValue(supabaseOrder.sla_deadline);

  return {
    // Core identifiers
    id: supabaseOrder.id,
    customOrderNumber: getFieldValue(supabaseOrder.order_number) || getFieldValue(supabaseOrder.custom_order_number) || supabaseOrder.id,
    
    // Customer information
    customerName: getFieldValue(supabaseOrder.customer_name, ''),
    customerEmail: getFieldValue(supabaseOrder.customer_email),
    customerPhone: getFieldValue(supabaseOrder.customer_phone),
    
    // Vehicle information - prioritize consolidated field but keep individual fields for compatibility
    vehicleInfo: getFieldValue(supabaseOrder.vehicle_info),
    vehicleYear: getFieldValue(supabaseOrder.vehicle_year),
    vehicleMake: getFieldValue(supabaseOrder.vehicle_make),
    vehicleModel: getFieldValue(supabaseOrder.vehicle_model),
    vehicleVin: getFieldValue(supabaseOrder.vehicle_vin),
    stockNumber: getFieldValue(supabaseOrder.stock_number),
    
    // Order management
    status: (supabaseOrder.status as 'pending' | 'in_progress' | 'completed' | 'cancelled') || 'pending',
    priority: getFieldValue(supabaseOrder.priority, 'normal'),
    orderType: getFieldValue(supabaseOrder.order_type, 'sales'),
    
    // Date handling - due_date is primary
    dueDate: primaryDate,
    
    // System fields
    createdAt: supabaseOrder.created_at,
    updatedAt: supabaseOrder.updated_at,
    
    // Financial and services
    totalAmount: getFieldValue(supabaseOrder.total_amount),
    services: Array.isArray(supabaseOrder.services) ? supabaseOrder.services as OrderService[] : [],
    
    // Assignment - will be populated by refreshData with proper names
    assignedTo: 'Unassigned', // Will be overwritten in refreshData
    
    // Notes
    notes: getFieldValue(supabaseOrder.notes),
    
    // Enhanced fields from manual JOINs (will be set in refreshData)
    dealershipName: 'Unknown Dealer',
    assignedGroupName: undefined,
    createdByGroupName: undefined,
    dueTime: primaryDate ? new Date(primaryDate).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }) : undefined,
  };
};

export const useOrderManagement = (activeTab: string) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]); // Keep full dataset
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
  const [filters, setFilters] = useState<OrderFilters>({
    search: '',
    status: '',
    make: '',
    model: '',
    dateRange: { from: null, to: null },
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { generateQR } = useOrderActions();
  
  // Debug and call counting refs
  const refreshCallCountRef = useRef(0);
  const lastRefreshTimeRef = useRef(0);
  const realtimeUpdateCountRef = useRef(0);

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
      in_process: allOrders.filter(order => order.status === 'in_progress').length,
      complete: allOrders.filter(order => order.status === 'completed').length,
      cancelled: allOrders.filter(order => order.status === 'cancelled').length,
      week: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate >= today && orderDate <= nextWeek;
      }).length,
      services: allOrders.filter(order => order.orderType === 'service').length,
    };
  }, []);

  const filterOrders = useMemo(() => (allOrders: Order[], tab: string, currentFilters: OrderFilters) => {
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
          filtered = filtered.filter(order => order.status === 'in_progress');
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
        order.vehicleVin?.toLowerCase().includes(searchLower) ||
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

  const refreshData = useCallback(async (skipFiltering = false) => {
    if (!user) return;
    
    // Debug logging and call counting
    refreshCallCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    
    console.log(`🔄 refreshData called (${refreshCallCountRef.current}) - skipFiltering: ${skipFiltering}, timeSince: ${timeSinceLastRefresh}ms`);
    
    // Prevent excessive calls (less than 1 second apart) - more aggressive throttling
    if (timeSinceLastRefresh < 1000 && refreshCallCountRef.current > 1) {
      console.warn('⚠️ refreshData called too frequently, skipping to prevent loop');
      return;
    }
    
    lastRefreshTimeRef.current = now;
    setLoading(true);
    
    try {
      // Fetch orders from Supabase (basic query first)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      // Fetch dealerships data separately
      const { data: dealerships, error: dealershipsError } = await supabase
        .from('dealerships')
        .select('id, name');

      if (dealershipsError) {
        console.error('Error fetching dealerships:', dealershipsError);
      }

      // Fetch user profiles data separately for assignments
      const { data: userProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email');

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
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
      const userMap = new Map(userProfiles?.map(u => [
        u.id, 
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      ]) || []);

      // Transform orders with joined data
      const allOrders = (orders || []).map(order => {
        const transformedOrder = transformOrder(order);
        // Add joined data manually
        transformedOrder.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;
        
        // Fix assignment mapping - assigned_group_id actually contains user IDs, not group IDs
        transformedOrder.assignedTo = order.assigned_group_id ? 
          userMap.get(order.assigned_group_id) || 'Unknown User' : 'Unassigned';
        
        return transformedOrder;
      });

      // Store full dataset and calculate tab counts
      setAllOrders(allOrders);
      setTabCounts(calculateTabCounts(allOrders));
      
      // Apply filtering unless skipped
      if (!skipFiltering) {
        const filtered = filterOrders(allOrders, activeTab, filters);
        setOrders(filtered);
      }
    } catch (error) {
      console.error('Error in refreshData:', error);
    } finally {
      setLoading(false);
    }
  }, [filterOrders, calculateTabCounts, user, activeTab, filters]);

  const updateFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const createOrder = useCallback(async (orderData: OrderFormData) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      console.log('Creating order with data:', orderData);
      
      // Determine order type from data or default to sales
      const orderType = (orderData.order_type || 'sales') as OrderType;
      
      // Generate order number using new service
      const orderNumber = await orderNumberService.generateOrderNumber(orderType, orderData.dealer_id);

      // orderData is already in snake_case format from transformToDbFormat in the modal
      const newOrder = {
        ...orderData,
        order_number: orderNumber, // Override with generated number
        order_type: orderType, // Use determined order type
        status: 'pending', // Default status
        dealer_id: orderData.dealer_id || 5, // Ensure dealer_id is set
      };

      console.log('Inserting order to DB:', newOrder);

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
      
      // Auto-generate QR code and shortlink in background (non-blocking)
      generateQR(data.id, data.order_number, data.dealer_id)
        .then(() => {
          console.log('QR code and shortlink generated for order:', data.order_number);
        })
        .catch((qrError) => {
          console.error('Failed to generate QR code:', qrError);
          // QR generation failure doesn't affect order creation
        });
      
      // Real-time subscription will handle the data update automatically
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, generateQR]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<OrderFormData>) => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // orderData may come in snake_case format, so use it directly
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

      // Transform data back to camelCase for local state update
      const transformedData = {
        customerName: orderData.customer_name || orderData.customerName,
        customerEmail: orderData.customer_email || orderData.customerEmail,
        customerPhone: orderData.customer_phone || orderData.customerPhone,
        vehicleYear: orderData.vehicle_year || orderData.vehicleYear,
        vehicleMake: orderData.vehicle_make || orderData.vehicleMake,
        vehicleModel: orderData.vehicle_model || orderData.vehicleModel,
        vehicleVin: orderData.vehicle_vin || orderData.vehicleVin,
        vehicleInfo: orderData.vehicle_info || orderData.vehicleInfo,
        stockNumber: orderData.stock_number || orderData.stockNumber,
        assignedGroupId: orderData.assigned_group_id || orderData.assignedGroupId,
        assignedContactId: orderData.assigned_contact_id || orderData.assignedContactId,
        salesperson: orderData.salesperson,
        notes: orderData.notes,
        internalNotes: orderData.internal_notes || orderData.internalNotes,
        priority: orderData.priority,
        dueDate: orderData.due_date || orderData.dueDate,
        slaDeadline: orderData.sla_deadline || orderData.slaDeadline,
        scheduledDate: orderData.scheduled_date || orderData.scheduledDate,
        scheduledTime: orderData.scheduled_time || orderData.scheduledTime,
        updatedAt: new Date().toISOString()
      };

      // Update local state immediately for better UX
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, ...transformedData }
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
      // Real-time subscription will handle the data update automatically
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initialize data on mount with debouncing to prevent multiple calls
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        refreshData();
      }, 100); // Small delay to batch multiple rapid effect calls

      return () => clearTimeout(timer);
    }
  }, [user]); // Only depend on user, not refreshData to avoid infinite loops

  // Handle filtering when tab or filters change (without full refresh)
  useEffect(() => {
    if (allOrders.length > 0) {
      // Apply filtering to full dataset
      const filtered = filterOrders(allOrders, activeTab, filters);
      setOrders(filtered);
    }
  }, [activeTab, filters, allOrders, filterOrders]);

  // Real-time subscription for all orders (not just sales)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('all_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
          // No filter - listen to all order types
        },
        async (payload) => {
          realtimeUpdateCountRef.current += 1;
          console.log(`📡 Real-time update ${realtimeUpdateCountRef.current} received:`, payload.eventType, (payload.new as SupabaseOrderRow)?.id || (payload.old as SupabaseOrderRow)?.id);
          
          try {
            if (payload.eventType === 'INSERT') {
              // Enrich the new order data just like refreshData does
              const order = payload.new as SupabaseOrderRow;
              const newOrder = await enrichOrderData(order);
              
              // Update allOrders state
              setAllOrders(prevAllOrders => {
                const exists = prevAllOrders.some(existingOrder => existingOrder.id === newOrder.id);
                if (exists) return prevAllOrders;
                return [newOrder, ...prevAllOrders];
              });
              
            } else if (payload.eventType === 'UPDATE') {
              // Enrich the updated order data
              const order = payload.new as SupabaseOrderRow;
              const updatedOrder = await enrichOrderData(order);
              
              // Update allOrders state
              setAllOrders(prevAllOrders => 
                prevAllOrders.map(existingOrder => 
                  existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
                )
              );
              
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as SupabaseOrderRow)?.id;
              if (deletedId) {
                // Update allOrders state
                setAllOrders(prevAllOrders => 
                  prevAllOrders.filter(order => order.id !== deletedId)
                );
              }
            }
          } catch (error) {
            console.error('Error handling real-time update:', error);
            // Fallback to full refresh only on error, but with debouncing
            setTimeout(() => refreshData(), 1000);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Helper function to enrich order data with related information
  const enrichOrderData = useCallback(async (order: SupabaseOrderRow): Promise<Order> => {
    try {
      // Fetch related data in parallel
      const [dealershipsResult, userProfilesResult, dealerGroupsResult] = await Promise.all([
        supabase.from('dealerships').select('id, name').eq('id', order.dealer_id).single(),
        supabase.from('profiles').select('id, first_name, last_name, email'),
        supabase.from('dealer_groups').select('id, name')
      ]);

      // Create lookup maps
      const dealershipName = dealershipsResult.data?.name || 'Unknown Dealer';
      const userMap = new Map(userProfilesResult.data?.map((u) => [
        u.id,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      ]) || []);
      const groupMap = new Map(dealerGroupsResult.data?.map((g) => [g.id, g.name]) || []);

      // Transform and enrich the order
      const transformedOrder = transformOrder(order);
      transformedOrder.dealershipName = dealershipName;
      transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
      transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;
      transformedOrder.assignedTo = order.assigned_group_id ? 
        userMap.get(order.assigned_group_id) || 'Unknown User' : 'Unassigned';
      
      return transformedOrder;
    } catch (error) {
      console.error('Error enriching order data:', error);
      // Fallback to basic transformation
      return transformOrder(order);
    }
  }, []);

  // Recalculate tab counts whenever allOrders changes
  useEffect(() => {
    if (allOrders.length > 0) {
      setTabCounts(calculateTabCounts(allOrders));
    }
  }, [allOrders, calculateTabCounts]);

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