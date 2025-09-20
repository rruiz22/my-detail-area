import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService, OrderType } from '@/services/orderNumberService';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { shouldUseRealtime } from '@/config/realtimeFeatures';
import { useSubscriptionManager } from '@/hooks/useSubscriptionManager';
import { getSystemTimezone } from '@/utils/dateUtils';
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

  // QR Code and Short Link fields
  shortLink?: string;
  qrCodeUrl?: string;
  qrGenerationStatus?: 'pending' | 'generating' | 'completed' | 'failed';
  orderNumber?: string;
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
    orderNumber: getFieldValue(supabaseOrder.order_number) || supabaseOrder.id,
    
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

    // QR Code and Short Link
    shortLink: getFieldValue(supabaseOrder.short_link),
    qrCodeUrl: getFieldValue(supabaseOrder.qr_code_url),
    qrGenerationStatus: getFieldValue(supabaseOrder.qr_generation_status),
    
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
  const { createSubscription, removeSubscription } = useSubscriptionManager();
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
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { user } = useAuth();
  const { generateQR } = useOrderActions();
  
  // Debug and call counting refs
  const refreshCallCountRef = useRef(0);
  const lastRefreshTimeRef = useRef(0);
  const realtimeUpdateCountRef = useRef(0);

  // Helper function to get dates in system timezone (Eastern Time) for consistent filtering
  const getSystemTimezoneDates = useCallback(() => {
    const timezone = getSystemTimezone();
    const now = new Date();

    // Get current date in system timezone and normalize to start of day
    const todayInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    todayInTimezone.setHours(0, 0, 0, 0);

    // Tomorrow in system timezone
    const tomorrowInTimezone = new Date(todayInTimezone);
    tomorrowInTimezone.setDate(tomorrowInTimezone.getDate() + 1);

    // Next week in system timezone (7 days from today)
    const nextWeekInTimezone = new Date(todayInTimezone);
    nextWeekInTimezone.setDate(nextWeekInTimezone.getDate() + 7);
    nextWeekInTimezone.setHours(23, 59, 59, 999);

    return {
      today: todayInTimezone,
      tomorrow: tomorrowInTimezone,
      nextWeek: nextWeekInTimezone,
      timezone
    };
  }, []);

  const calculateTabCounts = useMemo(() => (allOrders: Order[]) => {
    const { today, tomorrow, nextWeek } = getSystemTimezoneDates();

    return {
      today: allOrders.filter(order => {
        if (!order.dueDate && !order.createdAt) return false;
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length,
      tomorrow: allOrders.filter(order => {
        if (!order.dueDate && !order.createdAt) return false;
        const orderDate = new Date(order.dueDate || order.createdAt);
        return orderDate.toDateString() === tomorrow.toDateString();
      }).length,
      pending: allOrders.filter(order => order.status === 'pending').length,
      in_process: allOrders.filter(order => order.status === 'in_progress').length,
      complete: allOrders.filter(order => order.status === 'completed').length,
      cancelled: allOrders.filter(order => order.status === 'cancelled').length,
      week: allOrders.filter(order => {
        if (!order.dueDate && !order.createdAt) return false;
        const orderDate = new Date(order.dueDate || order.createdAt);
        // Normalize order date to start of day for comparison
        const orderDateNormalized = new Date(orderDate);
        orderDateNormalized.setHours(0, 0, 0, 0);
        return orderDateNormalized >= today && orderDateNormalized <= nextWeek;
      }).length,
      services: allOrders.filter(order => order.orderType === 'service').length,
    };
  }, [getSystemTimezoneDates]);

  const filterOrders = useMemo(() => (allOrders: Order[], tab: string, currentFilters: OrderFilters) => {
    let filtered = [...allOrders];

    // Apply tab-specific filtering
    if (tab !== 'dashboard' && tab !== 'all') {
      const { today, tomorrow, nextWeek } = getSystemTimezoneDates();

      switch (tab) {
        case 'today':
          filtered = filtered.filter(order => {
            if (!order.dueDate && !order.createdAt) return false;
            const orderDate = new Date(order.dueDate || order.createdAt);
            return orderDate.toDateString() === today.toDateString();
          });
          break;
        case 'tomorrow':
          filtered = filtered.filter(order => {
            if (!order.dueDate && !order.createdAt) return false;
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
            if (!order.dueDate && !order.createdAt) return false;
            const orderDate = new Date(order.dueDate || order.createdAt);
            // Normalize order date to start of day for comparison
            const orderDateNormalized = new Date(orderDate);
            orderDateNormalized.setHours(0, 0, 0, 0);
            return orderDateNormalized >= today && orderDateNormalized <= nextWeek;
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
  }, [getSystemTimezoneDates]);

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
    if (user && refreshCallCountRef.current === 0) {
      const timer = setTimeout(() => {
        refreshData();
      }, 100); // Small delay to batch multiple rapid effect calls

      return () => clearTimeout(timer);
    }
  }, [user, refreshData]); // Include refreshData in deps but guard with call count

  // Handle filtering when tab or filters change (without full refresh)
  useEffect(() => {
    if (allOrders.length > 0) {
      // Apply filtering to full dataset
      const filtered = filterOrders(allOrders, activeTab, filters);
      setOrders(filtered);
    }
  }, [activeTab, filters, allOrders, filterOrders]);

  // Smart polling for order data (replaces real-time subscription)
  const ordersPollingQuery = useOrderPolling(
    ['orders', 'all'],
    async () => {
      if (!user) return [];

      console.log('🔄 Smart polling: Fetching orders...');
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich orders with related data
      const enrichedOrders = await Promise.all(
        orders.map(order => enrichOrderData(order))
      );

      return enrichedOrders;
    },
    !!user
  );

  // Update allOrders when polling data changes
  useEffect(() => {
    if (ordersPollingQuery.data) {
      setAllOrders(ordersPollingQuery.data);
      setLoading(false);
    }
  }, [ordersPollingQuery.data]);

  // Always update lastRefresh when polling executes (every 60s), regardless of data changes
  useEffect(() => {
    if (ordersPollingQuery.isFetching) {
      console.log('🔄 Orders polling started - updating lastRefresh timestamp');
    }

    // Update timestamp when fetch completes (success or error)
    if (!ordersPollingQuery.isFetching && (ordersPollingQuery.data || ordersPollingQuery.error)) {
      setLastRefresh(new Date());
      console.log('⏰ LastRefresh updated:', new Date().toLocaleTimeString());
    }
  }, [ordersPollingQuery.isFetching, ordersPollingQuery.data, ordersPollingQuery.error]);

  // Listen for status updates to trigger immediate refresh
  useEffect(() => {
    const handleStatusUpdate = () => {
      console.log('🔄 Status update detected, triggering immediate polling refresh');
      ordersPollingQuery.refetch();
    };

    window.addEventListener('orderStatusUpdated', handleStatusUpdate);
    return () => window.removeEventListener('orderStatusUpdated', handleStatusUpdate);
  }, [ordersPollingQuery.refetch]);

  // Critical order status subscription (only for important state changes)
  useEffect(() => {
    if (!user || !shouldUseRealtime('orderStatus')) return;

    const channel = createSubscription(
      'critical-order-status',
      () => supabase
        .channel('critical-order-status')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
          // No filter - capture ALL status changes including cancelled → pending
        }, async (payload) => {
          // Only process if status actually changed
          const oldStatus = (payload.old as SupabaseOrderRow)?.status;
          const newStatus = (payload.new as SupabaseOrderRow)?.status;

          if (oldStatus !== newStatus) {
            console.log(`🎯 Status change: ${oldStatus} → ${newStatus} for order ${newStatus?.id}`);

            try {
              if (payload.eventType === 'UPDATE') {
                const order = payload.new as SupabaseOrderRow;
                const updatedOrder = await enrichOrderData(order);

                setAllOrders(prevAllOrders =>
                  prevAllOrders.map(existingOrder =>
                    existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
                  )
                );
              }
            } catch (error) {
              console.error('Error handling status update:', error);
            }
          }
        }),
      'high'
    );

    return () => {
      if (channel) {
        removeSubscription('critical-order-status');
      }
    };
  }, [user, createSubscription, removeSubscription]);

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
    lastRefresh,
    updateFilters,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  };
};