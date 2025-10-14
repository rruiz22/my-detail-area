import { shouldUseRealtime } from '@/config/realtimeFeatures';
import { useAuth } from '@/contexts/AuthContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { useSubscriptionManager } from '@/hooks/useSubscriptionManager';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { orderNumberService, OrderType } from '@/services/orderNumberService';
import { getSystemTimezone } from '@/utils/dateUtils';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

    // Comments count from aggregation
    comments: Array.isArray((supabaseOrder as any).order_comments) && (supabaseOrder as any).order_comments[0]?.count
      ? (supabaseOrder as any).order_comments[0].count
      : 0,
  };
};

export const useOrderManagement = (activeTab: string, weekOffset: number = 0) => {
  const { createSubscription, removeSubscription } = useSubscriptionManager();
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
  const { enhancedUser, getAllowedOrderTypes } = usePermissions();
  const { generateQR } = useOrderActions();
  const queryClient = useQueryClient();

  // Debug and call counting refs
  const refreshCallCountRef = useRef(0);
  const lastRefreshTimeRef = useRef(0);
  const realtimeUpdateCountRef = useRef(0);

  // Helper function to get dates in system timezone (Eastern Time) for consistent filtering
  const getSystemTimezoneDates = useCallback((offset: number = 0) => {
    const timezone = getSystemTimezone();
    const now = new Date();

    // Get current date in system timezone and normalize to start of day
    const todayInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    todayInTimezone.setHours(0, 0, 0, 0);

    // Tomorrow in system timezone
    const tomorrowInTimezone = new Date(todayInTimezone);
    tomorrowInTimezone.setDate(tomorrowInTimezone.getDate() + 1);

    // Calculate week range based on offset
    // Week start (Monday) with offset applied
    const weekStart = new Date(todayInTimezone);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday (0), go back 6 days, else go to Monday
    weekStart.setDate(weekStart.getDate() + daysToMonday + (offset * 7));
    weekStart.setHours(0, 0, 0, 0);

    // Week end (Sunday) with offset applied
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      today: todayInTimezone,
      tomorrow: tomorrowInTimezone,
      weekStart: weekStart,
      weekEnd: weekEnd,
      timezone
    };
  }, []);

  const calculateTabCounts = useMemo(() => (allOrders: Order[]) => {
    const { today, tomorrow, weekStart, weekEnd } = getSystemTimezoneDates(weekOffset);

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
        return orderDateNormalized >= weekStart && orderDateNormalized <= weekEnd;
      }).length,
      services: allOrders.filter(order => order.orderType === 'service').length,
    };
  }, [getSystemTimezoneDates, weekOffset]);

  const filterOrders = useMemo(() => (allOrders: Order[], tab: string, currentFilters: OrderFilters) => {
    let filtered = [...allOrders];

    // Apply tab-specific filtering
    if (tab !== 'dashboard' && tab !== 'all') {
      const { today, tomorrow, weekStart, weekEnd } = getSystemTimezoneDates(weekOffset);

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
            return orderDateNormalized >= weekStart && orderDateNormalized <= weekEnd;
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
  }, [getSystemTimezoneDates, weekOffset]);

  const refreshData = useCallback(async (skipFiltering = false) => {
    if (!user || !enhancedUser) return;

    // Debug logging and call counting
    refreshCallCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

    console.log(`🔄 refreshData called (${refreshCallCountRef.current}) - dealer: ${enhancedUser.dealership_id}, skipFiltering: ${skipFiltering}, timeSince: ${timeSinceLastRefresh}ms`);

    // Prevent excessive calls (less than 1 second apart) - more aggressive throttling
    if (timeSinceLastRefresh < 1000 && refreshCallCountRef.current > 1) {
      console.warn('⚠️ refreshData called too frequently, skipping to prevent loop');
      return;
    }

    lastRefreshTimeRef.current = now;
    setLoading(true);

    try {
      // CRITICAL: Filter orders by user's assigned dealer(s) for multi-dealer support
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_comments(count)')
        .eq('order_type', 'sales')
        .order('created_at', { ascending: false });

      // Check global dealer filter from localStorage with robust validation
      const savedDealerFilter = localStorage.getItem('selectedDealerFilter');
      const parsedFilter = savedDealerFilter && savedDealerFilter !== 'null' && savedDealerFilter !== 'undefined'
        ? (savedDealerFilter === 'all' ? 'all' : parseInt(savedDealerFilter))
        : 'all';
      const dealerFilter = typeof parsedFilter === 'number' && !isNaN(parsedFilter) ? parsedFilter : 'all';
      console.log(`🔍 Dealer filter resolved: "${savedDealerFilter}" → ${dealerFilter}`);

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

          if (dealershipError || !userDealerships || userDealerships.length === 0) {
            console.warn('⚠️ No dealer memberships found - showing all dealerships');
            const { data: allDealerships } = await supabase.from('dealerships').select('id');
            const allDealerIds = allDealerships?.map(d => d.id) || [];
            ordersQuery = ordersQuery.in('dealer_id', allDealerIds);
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            console.log(`🏢 Multi-dealer user - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            console.log(`🎯 Multi-dealer user - filtering by selected dealer: ${dealerFilter}`);
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            console.warn(`⚠️ Invalid dealerFilter: ${dealerFilter}, falling back to all dealers`);
            const { data: allDealerships } = await supabase.from('dealerships').select('id');
            const allDealerIds = allDealerships?.map(d => d.id) || [];
            ordersQuery = ordersQuery.in('dealer_id', allDealerIds);
          }
        }
      } else {
        // User has single assigned dealership - ignore global filter
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      // CRITICAL: Filter by allowed order types based on user role and groups
      const allowedOrderTypes = getAllowedOrderTypes();
      if (allowedOrderTypes.length > 0) {
        ordersQuery = ordersQuery.in('order_type', allowedOrderTypes);
        console.log(`🔒 Filtering orders by allowed types: [${allowedOrderTypes.join(', ')}] for dealer ${enhancedUser.dealership_id}`);
      }

      const { data: orders, error } = await ordersQuery;

      if (error) {
        console.error('Error fetching orders:', error);
        return;
      }

      console.log(`📊 Fetched ${orders?.length || 0} orders for dealer ${enhancedUser.dealership_id}`);

      // Fetch related data in PARALLEL for better performance
      const [
        { data: dealerships, error: dealershipsError },
        { data: userProfiles, error: profilesError },
        { data: dealerGroups, error: groupsError }
      ] = await Promise.all([
        supabase.from('dealerships').select('id, name'),
        supabase.from('profiles').select('id, first_name, last_name, email'),
        supabase.from('dealer_groups').select('id, name')
      ]);

      if (dealershipsError) {
        console.error('Error fetching dealerships:', dealershipsError);
      }
      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
      }
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

      // Calculate tab counts from fetched data
      setTabCounts(calculateTabCounts(allOrders));

      // Apply filtering unless skipped
      if (!skipFiltering) {
        const filtered = filterOrders(allOrders, activeTab, filters);
        setOrders(filtered);
      }

      // Update React Query cache for silent updates
      queryClient.setQueryData(['orders', 'all'], allOrders);

      // Force polling query to update
      await queryClient.refetchQueries({ queryKey: ['orders', 'sales'] });
    } catch (error) {
      console.error('Error in refreshData:', error);
    } finally {
      setLoading(false);
    }
  }, [filterOrders, calculateTabCounts, user, enhancedUser, getAllowedOrderTypes, activeTab, filters, queryClient]);

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

      // Determine created_by_group_id from user's groups/roles
      let createdByGroupId: string | null = null;

      if (enhancedUser) {
        console.log('📌 [createOrder] enhancedUser DEBUG:', {
          has_is_system_admin: 'is_system_admin' in enhancedUser,
          has_custom_roles: 'custom_roles' in enhancedUser,
          has_groups: 'groups' in enhancedUser,
          has_role: 'role' in enhancedUser,
          is_system_admin: ('is_system_admin' in enhancedUser) ? (enhancedUser as any).is_system_admin : undefined,
          custom_roles_count: ('custom_roles' in enhancedUser) ? (enhancedUser as any).custom_roles?.length : 0,
          groups_count: ('groups' in enhancedUser) ? (enhancedUser as any).groups?.length : 0,
          // Show first role/group details if exists
          first_custom_role: ('custom_roles' in enhancedUser && (enhancedUser as any).custom_roles?.length > 0)
            ? (enhancedUser as any).custom_roles[0]
            : null,
          first_group: ('groups' in enhancedUser && (enhancedUser as any).groups?.length > 0)
            ? (enhancedUser as any).groups[0]
            : null,
        });
        console.log('📌 [createOrder] Full enhancedUser object:', JSON.stringify(enhancedUser, null, 2));

        // Custom Roles System (EnhancedUserV2)
        if ('is_system_admin' in enhancedUser && 'custom_roles' in enhancedUser) {
          // System admins don't need a group assignment
          if ((enhancedUser as any).is_system_admin) {
            console.log('✅ System admin - created_by_group_id will be null (admin access)');
            // createdByGroupId remains null for system admins
          }
          // Use first active custom role if available
          else if (enhancedUser.custom_roles && enhancedUser.custom_roles.length > 0) {
            createdByGroupId = enhancedUser.custom_roles[0].id;
            console.log('📌 Using Custom Role system - created_by_group_id:', createdByGroupId);
          } else {
            console.log('⚠️ Custom Roles system active but user has no roles assigned');
          }
        }
        // Legacy System (EnhancedUser)
        else if ('groups' in enhancedUser && 'role' in enhancedUser) {
          // System admins don't need a group assignment
          if ((enhancedUser as any).role === 'system_admin') {
            console.log('✅ System admin (legacy) - created_by_group_id will be null (admin access)');
            // createdByGroupId remains null for system admins
          }
          // Use first active group if available
          else if (enhancedUser.groups && enhancedUser.groups.length > 0) {
            createdByGroupId = enhancedUser.groups[0].id;
            console.log('📌 Using Legacy system - created_by_group_id:', createdByGroupId);
          } else {
            console.log('⚠️ Legacy system active but user has no groups assigned');
          }
        }
      } else {
        console.log('⚠️ No enhancedUser available for created_by_group_id assignment');
      }

      // orderData is already in snake_case format from transformToDbFormat in the modal
      const newOrder = {
        ...orderData,
        order_number: orderNumber, // Override with generated number
        order_type: orderType, // Use determined order type
        status: 'pending', // Default status
        dealer_id: orderData.dealer_id || 5, // Ensure dealer_id is set
        created_by: user.id, // ✅ Track which USER created the order (for followers)
        created_by_group_id: createdByGroupId, // Track which GROUP the user belonged to when creating
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

      // Enrich the new order with dealer info
      const enrichedNewOrder = await enrichOrderData(data);

      // Optimistic update: Add new order to cache immediately
      queryClient.setQueryData(['orders', 'all'], (oldData: Order[] | undefined) =>
        oldData ? [enrichedNewOrder, ...oldData] : [enrichedNewOrder]
      );

      // Auto-generate QR code and shortlink in background (non-blocking)
      generateQR(data.id, data.order_number, data.dealer_id)
        .then(() => {
          console.log('QR code and shortlink generated for order:', data.order_number);
        })
        .catch((qrError) => {
          console.error('Failed to generate QR code:', qrError);
          // QR generation failure doesn't affect order creation
        });

      // Invalidate to ensure data consistency in background
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });
    } catch (error) {
      console.error('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, generateQR, queryClient]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<OrderFormData>) => {
    if (!user) return;

    setLoading(true);

    try {
      // Build updateData dynamically - only include fields explicitly provided
      // This prevents accidental data loss when doing partial updates (e.g., status change)
      const updateData: SupabaseOrderUpdate = {};

      // Customer information
      if (orderData.customer_name !== undefined) {
        updateData.customer_name = orderData.customer_name;
      }
      if (orderData.customer_email !== undefined) {
        updateData.customer_email = orderData.customer_email;
      }
      if (orderData.customer_phone !== undefined) {
        updateData.customer_phone = orderData.customer_phone;
      }

      // Vehicle information
      if (orderData.vehicle_year !== undefined) {
        updateData.vehicle_year = orderData.vehicle_year;
      }
      if (orderData.vehicle_make !== undefined) {
        updateData.vehicle_make = orderData.vehicle_make;
      }
      if (orderData.vehicle_model !== undefined) {
        updateData.vehicle_model = orderData.vehicle_model;
      }
      if (orderData.vehicle_vin !== undefined) {
        updateData.vehicle_vin = orderData.vehicle_vin;
      }
      if (orderData.vehicle_info !== undefined) {
        updateData.vehicle_info = orderData.vehicle_info;
      }
      if (orderData.stock_number !== undefined) {
        updateData.stock_number = orderData.stock_number;
      }

      // Assignment
      if (orderData.assigned_group_id !== undefined) {
        updateData.assigned_group_id = orderData.assigned_group_id;
      }
      if (orderData.assigned_contact_id !== undefined) {
        updateData.assigned_contact_id = orderData.assigned_contact_id;
      }
      if (orderData.salesperson !== undefined) {
        updateData.salesperson = orderData.salesperson;
      }

      // Order status and priority
      if (orderData.status !== undefined) {
        updateData.status = orderData.status;
      }
      if (orderData.priority !== undefined) {
        updateData.priority = orderData.priority;
      }

      // CRITICAL: Only update services if explicitly provided
      // This prevents clearing services array during status-only updates
      if (orderData.services !== undefined) {
        updateData.services = orderData.services;
      }

      // Pricing
      if (orderData.total_amount !== undefined) {
        updateData.total_amount = orderData.total_amount;
      }

      // Dates
      if (orderData.due_date !== undefined) {
        updateData.due_date = orderData.due_date;
      }
      if (orderData.sla_deadline !== undefined) {
        updateData.sla_deadline = orderData.sla_deadline;
      }
      if (orderData.scheduled_date !== undefined) {
        updateData.scheduled_date = orderData.scheduled_date;
      }
      if (orderData.scheduled_time !== undefined) {
        updateData.scheduled_time = orderData.scheduled_time;
      }

      // Notes
      if (orderData.notes !== undefined) {
        updateData.notes = orderData.notes;
      }
      if (orderData.internal_notes !== undefined) {
        updateData.internal_notes = orderData.internal_notes;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating order:', error);
        throw error;
      }

      console.log('Order updated successfully:', data);

      // Enrich updated order
      const enrichedUpdatedOrder = await enrichOrderData(data);

      // Optimistic update: Update the order in cache immediately
      queryClient.setQueryData(['orders', 'all'], (oldData: Order[] | undefined) =>
        oldData
          ? oldData.map(order => order.id === orderId ? enrichedUpdatedOrder : order)
          : [enrichedUpdatedOrder]
      );

      // Invalidate to ensure data consistency in background
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });
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
        console.error('Error deleting order:', error);
        throw error;
      }

      console.log('Order deleted successfully');

      // Optimistic update: Remove order from cache immediately
      queryClient.setQueryData(['orders', 'all'], (oldData: Order[] | undefined) =>
        oldData ? oldData.filter(order => order.id !== orderId) : []
      );

      // Invalidate to ensure data consistency in background
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient]);

  // DISABLED: Initialize data on mount - now using ONLY polling system to prevent double refresh
  // useEffect(() => {
  //   if (user && enhancedUser && refreshCallCountRef.current === 0) {
  //     const timer = setTimeout(() => {
  //       refreshData();
  //     }, 100); // Small delay to batch multiple rapid effect calls

  //     return () => clearTimeout(timer);
  //   }
  // }, [user, enhancedUser, refreshData]); // Wait for both user and enhancedUser

  // Smart polling for order data (replaces real-time subscription)
  const ordersPollingQuery = useOrderPolling(
    ['orders', 'all'],
    async () => {
      if (!user || !enhancedUser) return [];

      console.log('🔄 Smart polling: Fetching orders...');

      // Apply same dealer filtering logic as refreshData
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_comments(count)')
        .eq('order_type', 'sales')
        .order('created_at', { ascending: false });

      // Check global dealer filter with robust validation
      const savedDealerFilter = localStorage.getItem('selectedDealerFilter');
      const parsedFilter = savedDealerFilter && savedDealerFilter !== 'null' && savedDealerFilter !== 'undefined'
        ? (savedDealerFilter === 'all' ? 'all' : parseInt(savedDealerFilter))
        : 'all';
      const dealerFilter = typeof parsedFilter === 'number' && !isNaN(parsedFilter) ? parsedFilter : 'all';
      console.log(`🔍 Polling - Dealer filter resolved: "${savedDealerFilter}" → ${dealerFilter}`);

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

          if (dealershipError || !userDealerships || userDealerships.length === 0) {
            console.warn('⚠️ Polling - No dealer memberships found - showing all dealerships');
            const { data: allDealerships } = await supabase.from('dealerships').select('id');
            const allDealerIds = allDealerships?.map(d => d.id) || [];
            ordersQuery = ordersQuery.in('dealer_id', allDealerIds);
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            console.log(`🏢 Polling - Multi-dealer user - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            console.log(`🎯 Polling - Multi-dealer user - filtering by selected dealer: ${dealerFilter}`);
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            console.warn(`⚠️ Polling - Invalid dealerFilter: ${dealerFilter}, falling back to all dealers`);
            const { data: allDealerships } = await supabase.from('dealerships').select('id');
            const allDealerIds = allDealerships?.map(d => d.id) || [];
            ordersQuery = ordersQuery.in('dealer_id', allDealerIds);
          }
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

      // Batch fetch related data for ALL orders (3 queries instead of N×3)
      const [dealershipsRes, profilesRes, groupsRes] = await Promise.all([
        supabase.from('dealerships').select('id, name'),
        supabase.from('profiles').select('id, first_name, last_name, email'),
        supabase.from('dealer_groups').select('id, name')
      ]);

      // Create lookup maps for O(1) enrichment
      const dealershipMap = new Map(dealershipsRes.data?.map(d => [d.id, d.name]) || []);
      const userMap = new Map(profilesRes.data?.map(u => [
        u.id,
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email
      ]) || []);
      const groupMap = new Map(groupsRes.data?.map(g => [g.id, g.name]) || []);

      // Enrich all orders using maps (instant, no queries)
      const enrichedOrders = orders.map(order => {
        const transformedOrder = transformOrder(order);
        transformedOrder.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;
        transformedOrder.assignedTo = order.assigned_group_id
          ? userMap.get(order.assigned_group_id) || 'Unknown User'
          : 'Unassigned';
        return transformedOrder;
      });

      return enrichedOrders;
    },
    !!(user && enhancedUser)
  );

  // Derive allOrders from polling data using useMemo for silent updates
  const allOrders = useMemo(() =>
    ordersPollingQuery.data || [],
    [ordersPollingQuery.data]
  );

  // Listen for dealer filter changes
  useEffect(() => {
    const handleDealerFilterChange = () => {
      console.log('🎯 Dealer filter changed - refreshing data');
      refreshData();
    };

    window.addEventListener('dealerFilterChanged', handleDealerFilterChange);
    return () => window.removeEventListener('dealerFilterChanged', handleDealerFilterChange);
  }, [refreshData]);

  // Handle filtering when tab or filters change (without full refresh)
  useEffect(() => {
    if (allOrders.length > 0) {
      // Apply filtering to full dataset
      const filtered = filterOrders(allOrders, activeTab, filters);
      setOrders(filtered);
    }
  }, [activeTab, filters, allOrders, filterOrders]);

  // Always update lastRefresh when polling executes (every 60s), regardless of data changes
  useEffect(() => {
    if (ordersPollingQuery.isFetching) {
      console.log('🔄 Orders polling started - updating lastRefresh timestamp');
    }

    // Update timestamp when fetch completes (success or error)
    if (!ordersPollingQuery.isFetching && ordersPollingQuery.dataUpdatedAt) {
      setLastRefresh(new Date(ordersPollingQuery.dataUpdatedAt));
      console.log('⏰ LastRefresh updated:', new Date(ordersPollingQuery.dataUpdatedAt).toLocaleTimeString());
    }
  }, [ordersPollingQuery.isFetching, ordersPollingQuery.dataUpdatedAt]);

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

                // Update React Query cache for realtime updates
                queryClient.setQueryData(['orders', 'all'], (oldData: Order[] | undefined) =>
                  oldData
                    ? oldData.map(existingOrder =>
                        existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
                      )
                    : [updatedOrder]
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
    allOrders,
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
