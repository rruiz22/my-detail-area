import { shouldUseRealtime } from '@/config/realtimeFeatures';
import type { OrderStatus } from '@/constants/orderStatus';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { useOrderActions } from '@/hooks/useOrderActions';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { useSubscriptionManager } from '@/hooks/useSubscriptionManager';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { followersService } from '@/services/followersService';
import { orderNumberService, OrderType } from '@/services/orderNumberService';
import { pushNotificationHelper } from '@/services/pushNotificationHelper';
import { slackNotificationService } from '@/services/slackNotificationService';
import { sendOrderCreatedSMS } from '@/services/smsNotificationHelper';
import { getSystemTimezone } from '@/utils/dateUtils';
import { dev, error as logError, warn } from '@/utils/logger';
import {
    createAssignmentNotification,
    createOrderNotification,
    createStatusChangeNotification
} from '@/utils/notificationHelper';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Constants for magic numbers
const REFRESH_THROTTLE_MS = 1000;

/**
 * Map order_type to NotificationModule
 * Ensures notifications work for ALL order types (sales, service, recon, carwash)
 */
function getNotificationModule(orderType: string): 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' {
  const mapping: Record<string, 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash'> = {
    'sales': 'sales_orders',
    'service': 'service_orders',
    'recon': 'recon_orders',
    'carwash': 'car_wash'
  };
  return mapping[orderType] || 'sales_orders';
}

/**
 * Comprehensive cache invalidation after order mutations
 * Ensures ALL related queries are refreshed silently in background
 *
 * @param queryClient - TanStack Query client instance
 * @param dealerId - Current dealer context ID
 * @param orderType - Type of order (sales, service, recon, carwash)
 * @param options - Invalidation scope options
 */
async function invalidateOrderRelatedQueries(
  queryClient: any,
  dealerId: number,
  orderType?: string,
  options?: {
    invalidateAnalytics?: boolean;
    invalidateDashboard?: boolean;
    invalidateUsers?: boolean;
    invalidateFollowers?: boolean;
    invalidateApprovals?: boolean;
  }
) {
  const {
    invalidateAnalytics = true,
    invalidateDashboard = true,
    invalidateUsers = false,
    invalidateFollowers = false,
    invalidateApprovals = false,
  } = options || {};

  // Batch all invalidations together for performance
  const invalidations: Promise<void>[] = [];

  // 1. CORE: Main orders query (already done via optimistic update, but invalidate for consistency)
  invalidations.push(
    queryClient.invalidateQueries({ queryKey: ['orders', 'all', dealerId] })
  );

  // 2. ANALYTICS: Business intelligence queries
  if (invalidateAnalytics) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['orders-analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['revenue-analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['department-revenue'] }),
      queryClient.invalidateQueries({ queryKey: ['performance-trends'] })
    );
  }

  // 3. DASHBOARD: Metrics and counters
  if (invalidateDashboard) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    );
  }

  // 4. USERS: Workload and assignment tracking (only when assignment changes)
  if (invalidateUsers) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['dealer-users', dealerId] })
    );
  }

  // 5. FOLLOWERS: Calendar and followed orders (when order is followed/unfollowed)
  if (invalidateFollowers) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['followed-orders', dealerId] })
    );
  }

  // 6. APPROVALS: Get Ready approval counts and activity
  if (invalidateApprovals) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['get-ready-approvals-count', dealerId] }),
      queryClient.invalidateQueries({ queryKey: ['get-ready-activity', dealerId] }),
      queryClient.invalidateQueries({ queryKey: ['get-ready-activity-stats', dealerId] })
    );
  }

  // Execute all invalidations in parallel for maximum performance
  await Promise.all(invalidations);

  dev('✅ Batch cache invalidation completed', {
    dealerId,
    orderType,
    invalidationCount: invalidations.length
  });
}

// Enhanced database types
type SupabaseOrderRow = Database['public']['Tables']['orders']['Row'];
type SupabaseOrderInsert = Database['public']['Tables']['orders']['Insert'];
type SupabaseOrderUpdate = Database['public']['Tables']['orders']['Update'];

// Supabase order with aggregated joins
interface SupabaseOrderWithComments extends SupabaseOrderRow {
  order_comments?: Array<{ count: number }>;
}

// Enhanced User types
interface EnhancedUserBase {
  dealership_id: number | null;
  [key: string]: unknown;
}

interface EnhancedUserV1 extends EnhancedUserBase {
  role: string;
  groups?: Array<{ id: string; name: string }>;
}

interface EnhancedUserV2 extends EnhancedUserBase {
  is_system_admin: boolean;
  custom_roles?: Array<{ id: string; name: string }>;
}

type EnhancedUserType = EnhancedUserV1 | EnhancedUserV2;

// Type guards
function isEnhancedUserV2(user: EnhancedUserBase): user is EnhancedUserV2 {
  return 'is_system_admin' in user && 'custom_roles' in user;
}

function isEnhancedUserV1(user: EnhancedUserBase): user is EnhancedUserV1 {
  return 'role' in user && 'groups' in user;
}

// Service item interface
export interface OrderService {
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
  // Core identifiers
  id: string;
  orderNumber?: string; // camelCase for components
  order_number?: string; // snake_case from database
  custom_order_number?: string; // Custom numbering system

  // Customer information
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;

  // Vehicle information
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleTrim?: string; // Vehicle trim level (e.g., "LX", "EX-L")
  vehicleInfo?: string;
  vehicleVin?: string;
  stockNumber?: string;
  tag?: string; // Tag for car wash/service orders

  // Order management
  status: OrderStatus;
  priority?: string;
  orderType?: string; // camelCase
  order_type?: string; // snake_case from database

  // Dates
  dueDate?: string;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string; // camelCase
  completed_at?: string; // snake_case from database (recon/carwash orders)

  // Financial
  totalAmount?: number; // camelCase
  total_amount?: number; // snake_case from database
  services?: OrderService[];

  // Assignment and relationships
  assignedTo?: string;
  assignedGroupName?: string;
  createdByGroupName?: string;
  dealer_id?: number; // CRITICAL: Foreign key to dealerships table (multi-tenant)
  dealershipName?: string;

  // QR Code and Short Link
  shortLink?: string;
  qrCodeUrl?: string;
  qrGenerationStatus?: 'pending' | 'generating' | 'completed' | 'failed';

  // Team collaboration
  comments?: number; // Comment count from aggregation

  // Notes
  notes?: string;
}

// Transform Supabase order to component order
const transformOrder = (supabaseOrder: SupabaseOrderWithComments): Order => {
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
    vehicleTrim: getFieldValue(supabaseOrder.vehicle_trim),
    vehicleVin: getFieldValue(supabaseOrder.vehicle_vin),
    stockNumber: getFieldValue(supabaseOrder.stock_number),
    tag: getFieldValue(supabaseOrder.tag),

    // Order management
    status: (supabaseOrder.status as 'pending' | 'in_progress' | 'completed' | 'cancelled') || 'pending',
    priority: getFieldValue(supabaseOrder.priority, 'normal'),
    orderType: getFieldValue(supabaseOrder.order_type, 'sales'),

    // Date handling - due_date is primary
    dueDate: primaryDate,

    // System fields
    createdAt: supabaseOrder.created_at,
    updatedAt: supabaseOrder.updated_at,
    completedAt: getFieldValue(supabaseOrder.completed_at),
    completed_at: getFieldValue(supabaseOrder.completed_at),

    // Financial and services
    totalAmount: getFieldValue(supabaseOrder.total_amount),
    services: Array.isArray(supabaseOrder.services) ? supabaseOrder.services as OrderService[] : [],

    // QR Code and Short Link
    shortLink: getFieldValue(supabaseOrder.short_link),
    qrCodeUrl: getFieldValue(supabaseOrder.qr_code_url),
    qrGenerationStatus: getFieldValue(supabaseOrder.qr_generation_status),

    // Assignment - will be populated by refreshData with proper names
    assignedTo: 'Unassigned', // Will be overwritten in refreshData

    // Dealership (CRITICAL for multi-tenant security)
    dealer_id: getFieldValue(supabaseOrder.dealer_id),

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
    comments: supabaseOrder.order_comments?.[0]?.count ?? 0,
  };
};

export const useOrderManagement = (activeTab: string, weekOffset: number = 0) => {
  const { createSubscription, removeSubscription } = useSubscriptionManager();
  const { toast } = useToast();
  const { t } = useTranslation();
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
  const { selectedDealerId } = useDealerFilter();  // ✅ FIX: Use dealer filter from context

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
      logError('Error enriching order data:', error);
      // Fallback to basic transformation
      return transformOrder(order);
    }
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

    // Apply sorting based on active tab
    if (tab === 'today' || tab === 'tomorrow' || tab === 'pending' || tab === 'in_process' || tab === 'week') {
      // Sort by due_date ascending (earliest first) for today, tomorrow, pending, in_process, and week tabs
      filtered = filtered.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      });
    }

    return filtered;
  }, [getSystemTimezoneDates, weekOffset]);

  const refreshData = useCallback(async (skipFiltering = false) => {
    if (!user || !enhancedUser) return;

    // Debug logging and call counting
    refreshCallCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;

    dev(`🔄 refreshData called (${refreshCallCountRef.current}) - dealer: ${enhancedUser.dealership_id}, skipFiltering: ${skipFiltering}, timeSince: ${timeSinceLastRefresh}ms`);

    // Prevent excessive calls (less than 1 second apart) - more aggressive throttling
    if (timeSinceLastRefresh < REFRESH_THROTTLE_MS && refreshCallCountRef.current > 1) {
      warn('⚠️ refreshData called too frequently, skipping to prevent loop');
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
      dev(`🔍 Dealer filter resolved: "${savedDealerFilter}" → ${dealerFilter}`);

      // Handle dealer filtering based on user type and global filter
      // ✅ FIX: System admins and supermanagers should ALWAYS respect global filter, even if they have dealership_id assigned
      const isSystemAdmin = isEnhancedUserV2(enhancedUser)
        ? enhancedUser.is_system_admin
        : isEnhancedUserV1(enhancedUser) && enhancedUser.role === 'system_admin';

      const isSupermanager = isEnhancedUserV2(enhancedUser)
        ? enhancedUser.is_supermanager
        : isEnhancedUserV1(enhancedUser) && enhancedUser.role === 'supermanager';

      const shouldUseGlobalFilter = enhancedUser.dealership_id === null || isSystemAdmin || isSupermanager;

      if (shouldUseGlobalFilter) {
        // Multi-dealer users, system admins, and supermanagers - respect global filter
        if (dealerFilter === 'all') {
          // Show all dealers user has access to
          const { data: userDealerships, error: dealershipError } = await supabase
            .from('dealer_memberships')
            .select('dealer_id')
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (dealershipError) {
            // 🔒 SECURITY: Database error - log and return empty results (fail-secure)
            logError('❌ Failed to fetch dealer memberships:', dealershipError);
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else if (!userDealerships || userDealerships.length === 0) {
            // 🔒 SECURITY: No memberships = no data access (fail-secure, not fail-open)
            warn('⚠️ Multi-dealer user has NO dealer memberships - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            dev(`🏢 ${isSystemAdmin ? 'System admin' : isSupermanager ? 'Supermanager' : 'Multi-dealer user'} - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            dev(`🎯 ${isSystemAdmin ? 'System admin' : isSupermanager ? 'Supermanager' : 'Multi-dealer user'} - filtering by selected dealer: ${dealerFilter}`);
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            // 🔒 SECURITY: Invalid dealer filter - return empty results (fail-secure)
            logError(`❌ Invalid dealerFilter value: ${dealerFilter} (type: ${typeof dealerFilter})`);
            warn('⚠️ Invalid dealer filter - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          }
        }
      } else {
        // Single-dealer regular users - use their assigned dealership (ignore global filter)
        dev(`🏢 Single-dealer user - using assigned dealership: ${enhancedUser.dealership_id}`);
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      // CRITICAL: Filter by allowed order types based on user role and groups
      const allowedOrderTypes = getAllowedOrderTypes();
      if (allowedOrderTypes.length > 0) {
        ordersQuery = ordersQuery.in('order_type', allowedOrderTypes);
        dev(`🔒 Filtering orders by allowed types: [${allowedOrderTypes.join(', ')}] for dealer ${enhancedUser.dealership_id}`);
      }

      const { data: orders, error } = await ordersQuery;

      if (error) {
        logError('Error fetching orders:', error);
        return;
      }

      dev(`📊 Fetched ${orders?.length || 0} orders for dealer ${enhancedUser.dealership_id}`);

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
        logError('Error fetching dealerships:', dealershipsError);
      }
      if (profilesError) {
        logError('Error fetching user profiles:', profilesError);
      }
      if (groupsError) {
        logError('Error fetching dealer groups:', groupsError);
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
      // ✅ FIX: Include selectedDealerId in queryKey to match polling query
      queryClient.setQueryData(['orders', 'all', selectedDealerId], allOrders);

      // Force polling query to update
      await queryClient.refetchQueries({ queryKey: ['orders', 'sales'] });
    } catch (error) {
      logError('Error in refreshData:', error);
    } finally {
      setLoading(false);
    }
  }, [filterOrders, calculateTabCounts, user, enhancedUser, getAllowedOrderTypes, activeTab, filters, queryClient]);

  const updateFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const createOrder = useCallback(async (orderData: OrderFormData) => {
    if (!user) return;

    // ✅ SECURITY: Validate dealer context consistency
    if (!selectedDealerId) {
      throw new Error('No dealer context available. Please select a dealership.');
    }
    if (orderData.dealer_id && orderData.dealer_id !== selectedDealerId) {
      warn('⚠️ Dealer context mismatch detected', {
        orderDealerId: orderData.dealer_id,
        selectedDealerId
      });
      // Override with selected dealer to prevent data leakage
      orderData.dealer_id = selectedDealerId;
    }

    setLoading(true);

    try {
      dev('Creating order with data:', orderData);

      // Determine order type from data or default to sales
      const orderType = (orderData.order_type || 'sales') as OrderType;

      // Generate order number using new service
      const orderNumber = await orderNumberService.generateOrderNumber(orderType, orderData.dealer_id);

      // Determine created_by_group_id from user's groups/roles
      let createdByGroupId: string | null = null;

      if (enhancedUser) {
        // Type-safe enhanced user debugging and group assignment
        if (isEnhancedUserV2(enhancedUser)) {
          // Custom Roles System (V2)
          dev('📌 [createOrder] Using EnhancedUserV2', {
            is_system_admin: enhancedUser.is_system_admin,
            custom_roles_count: enhancedUser.custom_roles?.length || 0,
            first_role: enhancedUser.custom_roles?.[0] || null
          });

          if (enhancedUser.is_system_admin) {
            dev('✅ System admin - created_by_group_id will be null');
            createdByGroupId = null;
          } else if (enhancedUser.custom_roles && enhancedUser.custom_roles.length > 0) {
            createdByGroupId = enhancedUser.custom_roles[0].id;
            dev('📌 Using Custom Role system - created_by_group_id:', createdByGroupId);
          } else {
            dev('⚠️ Custom Roles system active but user has no roles assigned');
          }
        } else if (isEnhancedUserV1(enhancedUser)) {
          // Legacy System (V1)
          dev('📌 [createOrder] Using EnhancedUserV1', {
            role: enhancedUser.role,
            groups_count: enhancedUser.groups?.length || 0,
            first_group: enhancedUser.groups?.[0] || null
          });

          if (enhancedUser.role === 'system_admin') {
            dev('✅ System admin (legacy) - created_by_group_id will be null');
            createdByGroupId = null;
          } else if (enhancedUser.groups && enhancedUser.groups.length > 0) {
            createdByGroupId = enhancedUser.groups[0].id;
            dev('📌 Using Legacy system - created_by_group_id:', createdByGroupId);
          } else {
            dev('⚠️ Legacy system active but user has no groups assigned');
          }
        } else {
          warn('⚠️ Unknown enhancedUser format', { enhancedUser });
        }
      } else {
        dev('⚠️ No enhancedUser available for created_by_group_id assignment');
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

      dev('Inserting order to DB:', newOrder);

      const { data, error } = await supabase
        .from('orders')
        .insert(newOrder)
        .select()
        .single();

      if (error) {
        logError('Error creating order:', error);
        throw error;
      }

      dev('Order created successfully:', data);

      // 👥 AUTO-FOLLOW: Add creator and assigned user as followers
      try {
        // Add creator as follower (type: 'creator', notification: 'important')
        await followersService.autoFollowOnCreation(data.id, user.id);
        dev('✅ Auto-follow: Creator added as follower');

        // Add assigned user as follower if exists (type: 'assigned', notification: 'all')
        if (data.assigned_group_id) {
          await followersService.autoFollowOnAssignment(
            data.id,
            data.assigned_group_id, // Contains user_id despite field name
            user.id
          );
          dev('✅ Auto-follow: Assigned user added as follower');
        }
      } catch (followError) {
        logError('❌ Failed to auto-add followers (non-blocking):', followError);
        // Don't throw - followers error shouldn't block order creation
      }

      // 🔔 NOTIFICATION: Order Created (dynamic module based on order_type)
      void createOrderNotification({
        userId: data.assigned_group_id || null,
        dealerId: data.dealer_id,
        module: getNotificationModule(data.order_type || 'sales'),
        event: 'order_created',
        orderId: data.id,
        orderNumber: data.order_number || data.custom_order_number || data.id,
        priority: 'normal',
        metadata: {
          customerName: data.customer_name,
          vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim()
        }
      }      ).catch(err =>
        console.error('[OrderManagement] Failed to create order notification:', err)
      );

      // 🔗 GENERATE SHORT LINK: Must happen BEFORE SMS to include it in the message
      let shortLink: string | undefined = undefined;
      try {
        const qrData = await generateQR(data.id, data.order_number, data.dealer_id);
        shortLink = qrData?.shortLink;
        dev('✅ QR code and shortlink generated for order:', data.order_number, shortLink);
      } catch (qrError) {
        logError('❌ Failed to generate QR code:', qrError);
        // Continue with SMS even if QR generation fails
      }

      // 📱 SMS NOTIFICATION: Send SMS to users with notification rules
      // Format services for SMS
      const servicesText = Array.isArray(data.services) && data.services.length > 0
        ? data.services.map((s: any) => s.name || s.type).filter(Boolean).join(', ')
        : '';

      // Debug logging to verify data
      console.log('🔍 SMS Data Debug:', {
        services: data.services,
        servicesText,
        stockNumber: data.stock_number,
        dueDate: data.due_date,
        shortLink
      });

      void sendOrderCreatedSMS({
        orderId: data.id,
        dealerId: data.dealer_id,
        module: getNotificationModule(data.order_type || 'sales'),
        triggeredBy: user.id,
        eventData: {
          orderNumber: data.order_number || data.custom_order_number || data.id,
          stockNumber: data.stock_number,
          vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim(),
          services: servicesText,
          dueDateTime: data.due_date,
          shortLink: shortLink || undefined
        }
      });

      // 🔍 Fetch assigned user/group name BEFORE Slack check (prevents blocking Slack)
      let assignedToName: string | undefined = undefined;
      if (data.assigned_group_id) {
        try {
          const { data: groupData } = await supabase
            .from('dealer_groups')
            .select('name')
            .eq('id', data.assigned_group_id)
            .maybeSingle();
          assignedToName = groupData?.name || undefined;
        } catch (error) {
          console.warn('⚠️ Failed to fetch group name:', error);
        }
      } else if (data.assigned_contact_id) {
        try {
          const { data: contactData } = await supabase
            .from('dealership_contacts')
            .select('first_name, last_name')
            .eq('id', data.assigned_contact_id)
            .maybeSingle();
          if (contactData) {
            assignedToName = `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim();
          }
        } catch (error) {
          console.warn('⚠️ Failed to fetch contact name:', error);
        }
      }

      // 🔍 Fetch creator name for Slack notification
      let createdByName: string | undefined = undefined;
      try {
        const { data: creatorProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('id', user.id)
          .single();

        if (creatorProfile?.first_name) {
          createdByName = `${creatorProfile.first_name} ${creatorProfile.last_name || ''}`.trim();
        } else if (creatorProfile?.email) {
          createdByName = creatorProfile.email;
        }
      } catch (error) {
        console.warn('⚠️ Failed to fetch creator profile:', error);
      }

      // Send Slack notification (if enabled)
      const moduleForNotif = getNotificationModule(data.order_type || 'sales');
      console.log('🔍 [DEBUG] Checking Slack for Sales order:', {
        dealerId: data.dealer_id,
        module: moduleForNotif,
        orderType: data.order_type,
        assignedTo: assignedToName
      });

      void slackNotificationService.isEnabled(
        data.dealer_id,
        moduleForNotif,
        'order_created'
      ).then(async (slackEnabled) => {
        console.log('🔍 [DEBUG] Slack enabled result:', slackEnabled);

        if (slackEnabled) {
          console.log('📤 Slack enabled, sending notification...');

          await slackNotificationService.notifyOrderCreated({
            orderId: data.id,
            dealerId: data.dealer_id,
            module: moduleForNotif,
            eventData: {
              orderNumber: data.order_number || data.custom_order_number || data.id,
              stockNumber: data.stock_number,
              vinNumber: data.vin_number,
              vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim(),
              services: servicesText,
              dueDateTime: data.due_date,
              shortLink: shortLink || undefined,
              assignedTo: assignedToName,
              createdBy: createdByName
            }
          });
        }
      }).catch((error) => {
        console.error('❌ [Slack] Failed to send order creation notification:', error);
      });

      // Enrich the new order with dealer info
      const enrichedNewOrder = await enrichOrderData(data);

      // Optimistic update: Add new order to cache immediately
      // ✅ FIX: Include selectedDealerId in queryKey to match polling query
      queryClient.setQueryData(['orders', 'all', selectedDealerId], (oldData: Order[] | undefined) =>
        oldData ? [enrichedNewOrder, ...oldData] : [enrichedNewOrder]
      );

      // 🚀 COMPREHENSIVE INVALIDATION: Silently refresh ALL related queries in background
      // This ensures dashboard, analytics, and all dependent data updates automatically
      await invalidateOrderRelatedQueries(queryClient, selectedDealerId, data.order_type, {
        invalidateAnalytics: true,
        invalidateDashboard: true,
        invalidateUsers: false,
        invalidateFollowers: false,
        invalidateApprovals: false,
      });
    } catch (error) {
      logError('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, enhancedUser, generateQR, queryClient, enrichOrderData, selectedDealerId]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<OrderFormData>) => {
    if (!user) return;

    // ✅ SECURITY: Validate dealer context consistency
    if (!selectedDealerId) {
      throw new Error('No dealer context available. Please select a dealership.');
    }
    if (orderData.dealer_id && orderData.dealer_id !== selectedDealerId) {
      warn('⚠️ Dealer context mismatch detected in update', {
        orderDealerId: orderData.dealer_id,
        selectedDealerId
      });
      // Override with selected dealer to prevent data leakage
      orderData.dealer_id = selectedDealerId;
    }

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
      // Support camelCase variant from UI components
      if (orderData.dueDate !== undefined) {
        updateData.due_date = orderData.dueDate;
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

      // Get current order before updating (for tracking changes)
      // ✅ CRITICAL FIX: Include selectedDealerId to match cache key used in optimistic updates
      const currentOrders = queryClient.getQueryData<Order[]>(['orders', 'all', selectedDealerId]) || [];
      const oldOrder = currentOrders.find(o => o.id === orderId);
      const oldStatus = oldOrder?.status;

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        logError('Error updating order:', error);
        throw error;
      }

      dev('Order updated successfully:', data);

      // 🔔 NOTIFICATION: Status Changed (dynamic module based on order_type)
      if (orderData.status !== undefined && oldStatus && oldStatus !== orderData.status) {
        const notifModule = getNotificationModule(data.order_type || 'sales');
        void createStatusChangeNotification({
          userId: data.assigned_group_id || null,
          dealerId: data.dealer_id,
          module: notifModule,
          entityType: notifModule.replace('_orders', '_order').replace('car_wash', 'carwash_order'),
          entityId: data.id,
          entityName: data.order_number || data.custom_order_number || data.id,
          oldStatus: oldStatus,
          newStatus: orderData.status,
          priority: 'high'
        }).catch(err =>
          console.error('[OrderManagement] Failed to create status change notification:', err)
        );

        // 📤 SLACK NOTIFICATION: Status Changed
        void slackNotificationService.isEnabled(
          data.dealer_id,
          notifModule,
          'order_status_changed'
        ).then(async (slackEnabled) => {
          if (slackEnabled) {
            console.log('📤 Slack enabled for status change, sending notification...');

            // 🔴 FIX: Get shortLink from orders table (not order_qr_codes which doesn't exist)
            let shortLink: string | undefined = undefined;
            try {
              const { data: orderShortLink } = await supabase
                .from('orders')
                .select('short_link')
                .eq('id', orderId)
                .single();
              shortLink = orderShortLink?.short_link || `${window.location.origin}/orders/${orderId}`;
            } catch (error) {
              console.warn('Failed to fetch short link:', error);
              shortLink = `${window.location.origin}/orders/${orderId}`;
            }

            // 🔍 Fetch assigned user/group name for status change notification
            let assignedToName: string | undefined = undefined;
            if (data.assigned_group_id) {
              try {
                const { data: groupData } = await supabase
                  .from('dealer_groups')
                  .select('name')
                  .eq('id', data.assigned_group_id)
                  .single();
                assignedToName = groupData?.name || undefined;
              } catch (error) {
                console.warn('⚠️ Failed to fetch group name for status change:', error);
              }
            } else if (data.assigned_contact_id) {
              try {
                const { data: contactData } = await supabase
                  .from('dealership_contacts')
                  .select('first_name, last_name')
                  .eq('id', data.assigned_contact_id)
                  .single();
                if (contactData) {
                  assignedToName = `${contactData.first_name || ''} ${contactData.last_name || ''}`.trim();
                }
              } catch (error) {
                console.warn('⚠️ Failed to fetch contact name for status change:', error);
              }
            }

            // 🔍 Get name of user who changed the status
            const changedByName = enhancedUser?.first_name
              ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
              : user.email || 'Someone';

            await slackNotificationService.notifyStatusChange({
              orderId: data.id,
              dealerId: data.dealer_id,
              module: notifModule,
              eventData: {
                orderNumber: data.order_number || data.custom_order_number || data.id,
                stockNumber: data.stock_number,
                vinNumber: data.vin_number,
                vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim(),
                status: orderData.status,
                oldStatus: oldStatus,
                shortLink: shortLink || `${window.location.origin}/orders/${orderId}`,
                assignedTo: assignedToName,
                changedBy: changedByName
              }
            });

            // 📤 SLACK NOTIFICATION: Order Completed (if status changed to completed)
            if (orderData.status === 'completed') {
              const completedByName = changedByName; // Same person who changed status

              const isCompletedEnabled = await slackNotificationService.isEnabled(
                data.dealer_id,
                notifModule,
                'order_completed'
              );

              if (isCompletedEnabled) {
                await slackNotificationService.sendNotification({
                  orderId: data.id,
                  dealerId: data.dealer_id,
                  module: notifModule,
                  eventType: 'order_completed',
                  eventData: {
                    orderNumber: data.order_number || data.custom_order_number || data.id,
                    stockNumber: data.stock_number,
                    vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim(),
                    shortLink: shortLink || `${window.location.origin}/orders/${orderId}`,
                    completedBy: completedByName
                  }
                });
              }
            }
          }
        }).catch((error) => {
          console.error('❌ [Slack] Failed to send status change notification:', error);
        });
      }

      // 🔔 NOTIFICATION: Assignment Changed (dynamic module based on order_type)
      if (orderData.assigned_group_id !== undefined &&
          oldOrder?.assigned_group_id !== orderData.assigned_group_id &&
          orderData.assigned_group_id !== null) {

        const assignedByName = enhancedUser?.first_name
          ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
          : user?.email || 'Manager';

        const notifModule = getNotificationModule(data.order_type || 'sales');
        void createAssignmentNotification({
          userId: orderData.assigned_group_id,
          dealerId: data.dealer_id,
          module: notifModule,
          entityType: notifModule.replace('_orders', '_order').replace('car_wash', 'carwash_order'),
          entityId: data.id,
          entityName: data.order_number || data.custom_order_number || data.id,
          assignedBy: assignedByName,
          priority: 'high'
        }).catch(err =>
          console.error('[OrderManagement] Failed to create assignment notification:', err)
        );

        // 📤 SLACK NOTIFICATION: Order Assigned
        void slackNotificationService.isEnabled(
          data.dealer_id,
          notifModule,
          'order_assigned'
        ).then(async (slackEnabled) => {
          if (slackEnabled) {
            // Get shortLink from order data
            let shortLink: string | undefined = undefined;
            try {
              const { data: orderShortLink } = await supabase
                .from('orders')
                .select('short_link, vehicle_year, vehicle_make, vehicle_model, stock_number')
                .eq('id', orderId)
                .single();

              shortLink = orderShortLink?.short_link || `${window.location.origin}/orders/${orderId}`;

              // Get assigned user's name
              let assignedToName: string | undefined = undefined;
              if (orderData.assigned_group_id) {
                const { data: assignedProfile } = await supabase
                  .from('profiles')
                  .select('first_name, last_name, email')
                  .eq('id', orderData.assigned_group_id)
                  .single();

                if (assignedProfile?.first_name) {
                  assignedToName = `${assignedProfile.first_name} ${assignedProfile.last_name || ''}`.trim();
                } else if (assignedProfile?.email) {
                  assignedToName = assignedProfile.email;
                }
              }

              await slackNotificationService.sendNotification({
                orderId: data.id,
                dealerId: data.dealer_id,
                module: notifModule,
                eventType: 'order_assigned',
                eventData: {
                  orderNumber: data.order_number || data.custom_order_number || data.id,
                  stockNumber: orderShortLink?.stock_number,
                  vehicleInfo: `${orderShortLink?.vehicle_year || ''} ${orderShortLink?.vehicle_make || ''} ${orderShortLink?.vehicle_model || ''}`.trim() || undefined,
                  shortLink: shortLink,
                  assignedTo: assignedToName,
                  assignedBy: assignedByName
                }
              });
            } catch (error) {
              console.warn('⚠️ Failed to send Slack assignment notification:', error);
            }
          }
        }).catch((error) => {
          console.error('❌ [Slack] Failed to check if assignment notification is enabled:', error);
        });
      }

      // Enrich updated order
      const enrichedUpdatedOrder = await enrichOrderData(data);

      // Optimistic update: Update the order in cache immediately
      // ✅ FIX: Include selectedDealerId in queryKey to match polling query
      queryClient.setQueryData(['orders', 'all', selectedDealerId], (oldData: Order[] | undefined) =>
        oldData
          ? oldData.map(order => order.id === orderId ? enrichedUpdatedOrder : order)
          : [enrichedUpdatedOrder]
      );

      // Send push notification if status changed (fire-and-forget, non-blocking)
      if (orderData.status !== undefined && data.order_number) {
        const userName = enhancedUser?.first_name
          ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
          : user.email || 'Someone';

        // Send push notifications to followers
        const notifModule = getNotificationModule(data.order_type || 'sales');
        pushNotificationHelper
          .notifyOrderStatusChange(
            orderId,
            data.order_number,
            orderData.status,
            userName,
            enhancedUser?.id,           // ✅ Exclude user who made the change
            notifModule,                 // ✅ Pass module for validation
            'order_status_changed'       // ✅ Pass event type for validation
          )
          .catch((notifError) => {
            logError('❌ Push notification failed (non-critical):', notifError);
            // Don't fail the order update if notification fails
          });
      }

      // Note: SMS notifications are handled in useStatusPermissions.tsx
      // This avoids duplicate SMS and ensures correct shortlink usage

      // 🚀 COMPREHENSIVE INVALIDATION: Silently refresh ALL related queries in background
      // Invalidate users if assignment changed, followers if followed/unfollowed
      const assignmentChanged = orderData.assigned_group_id !== undefined && oldOrder?.assigned_group_id !== orderData.assigned_group_id;
      const statusChanged = orderData.status !== undefined && oldStatus && oldStatus !== orderData.status;

      await invalidateOrderRelatedQueries(queryClient, selectedDealerId, data.order_type, {
        invalidateAnalytics: true,
        invalidateDashboard: true,
        invalidateUsers: assignmentChanged, // Only invalidate if assignment changed
        invalidateFollowers: statusChanged, // Invalidate followers on status change (affects calendar)
        invalidateApprovals: statusChanged && orderData.status === 'approved', // Invalidate approvals if approved
      });
    } catch (error) {
      logError('Error in updateOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, enhancedUser, queryClient, enrichOrderData, selectedDealerId, toast, t]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!user) return;

    setLoading(true);

    try {
      // Get order data before deleting (for notifications)
      const { data: orderData } = await supabase
        .from('orders')
        .select('order_number, custom_order_number, dealer_id, order_type, stock_number, vehicle_year, vehicle_make, vehicle_model, short_link')
        .eq('id', orderId)
        .single();

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        logError('Error deleting order:', error);
        throw error;
      }

      dev('Order deleted successfully');

      // 📤 SLACK NOTIFICATION: Order Deleted
      if (orderData) {
        const deletedByName = enhancedUser?.first_name
          ? `${enhancedUser.first_name} ${enhancedUser.last_name || ''}`.trim()
          : user.email || 'Someone';

        const notifModule = getNotificationModule(orderData.order_type || 'sales');

        void slackNotificationService.isEnabled(
          orderData.dealer_id,
          notifModule,
          'order_deleted'
        ).then(async (slackEnabled) => {
          if (slackEnabled) {
            await slackNotificationService.sendNotification({
              orderId: orderId,
              dealerId: orderData.dealer_id,
              module: notifModule,
              eventType: 'order_deleted',
              eventData: {
                orderNumber: orderData.order_number || orderData.custom_order_number || orderId,
                stockNumber: orderData.stock_number,
                vehicleInfo: `${orderData.vehicle_year || ''} ${orderData.vehicle_make || ''} ${orderData.vehicle_model || ''}`.trim() || undefined,
                shortLink: orderData.short_link || `${window.location.origin}/orders/${orderId}`,
                deletedBy: deletedByName
              }
            });
          }
        }).catch((error) => {
          console.error('❌ [Slack] Failed to send order deletion notification:', error);
        });
      }

      // Optimistic update: Remove order from cache immediately
      // ✅ FIX: Include selectedDealerId in queryKey to match polling query
      queryClient.setQueryData(['orders', 'all', selectedDealerId], (oldData: Order[] | undefined) =>
        oldData ? oldData.filter(order => order.id !== orderId) : []
      );

      // 🚀 COMPREHENSIVE INVALIDATION: Silently refresh ALL related queries in background
      // Deletion affects analytics, dashboard, user workload, and followers
      await invalidateOrderRelatedQueries(queryClient, selectedDealerId, undefined, {
        invalidateAnalytics: true,
        invalidateDashboard: true,
        invalidateUsers: true, // Deletion frees up assignee workload
        invalidateFollowers: true, // Deletion removes from followed orders
        invalidateApprovals: false,
      });
    } catch (error) {
      logError('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient, selectedDealerId, enhancedUser]);

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
  // ✅ FIX: Include selectedDealerId in queryKey so cache invalidates when dealer changes
  const ordersPollingQuery = useOrderPolling(
    ['orders', 'all', selectedDealerId],  // ✅ FIX: Added selectedDealerId to queryKey
    async () => {
      if (!user || !enhancedUser) return [];

      dev('🔄 Smart polling: Fetching orders...');

      // Apply same dealer filtering logic as refreshData
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_comments(count)')
        .eq('order_type', 'sales')
        .order('created_at', { ascending: false });

      // ✅ FIX: Use selectedDealerId from context instead of reading localStorage
      const dealerFilter = selectedDealerId;
      dev(`🔍 Polling - Dealer filter resolved: ${dealerFilter}`);

      // Handle dealer filtering based on user type and global filter
      // ✅ FIX: System admins and supermanagers should ALWAYS respect global filter
      const isSystemAdminPolling = isEnhancedUserV2(enhancedUser)
        ? enhancedUser.is_system_admin
        : isEnhancedUserV1(enhancedUser) && enhancedUser.role === 'system_admin';

      const isSupermanagerPolling = isEnhancedUserV2(enhancedUser)
        ? enhancedUser.is_supermanager
        : isEnhancedUserV1(enhancedUser) && enhancedUser.role === 'supermanager';

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
            // 🔒 SECURITY: Database error - log and return empty results (fail-secure)
            logError('❌ Polling - Failed to fetch dealer memberships:', dealershipError);
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else if (!userDealerships || userDealerships.length === 0) {
            // 🔒 SECURITY: No memberships = no data access (fail-secure, not fail-open)
            warn('⚠️ Polling - Multi-dealer user has NO dealer memberships - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            dev(`🏢 Polling - ${isSystemAdminPolling ? 'System admin' : 'Multi-dealer user'} - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            dev(`🎯 Polling - ${isSystemAdminPolling ? 'System admin' : 'Multi-dealer user'} - filtering by selected dealer: ${dealerFilter}`);
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            // 🔒 SECURITY: Invalid dealer filter - return empty results (fail-secure)
            logError(`❌ Polling - Invalid dealerFilter value: ${dealerFilter} (type: ${typeof dealerFilter})`);
            warn('⚠️ Polling - Invalid dealer filter - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          }
        }
      } else {
        // Single-dealer regular users - use their assigned dealership (ignore global filter)
        dev(`🏢 Polling - Single-dealer user - using assigned dealership: ${enhancedUser.dealership_id}`);
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

  // ✅ FIX: Removed manual dealer filter listener - TanStack Query auto-refetches when queryKey changes
  // The queryKey now includes selectedDealerId, so changing dealer automatically triggers refetch

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
      dev('🔄 Orders polling started - updating lastRefresh timestamp');
    }

    // Update timestamp when fetch completes (success or error)
    if (!ordersPollingQuery.isFetching && ordersPollingQuery.dataUpdatedAt) {
      setLastRefresh(new Date(ordersPollingQuery.dataUpdatedAt));
      dev('⏰ LastRefresh updated:', new Date(ordersPollingQuery.dataUpdatedAt).toLocaleTimeString());
    }
  }, [ordersPollingQuery.isFetching, ordersPollingQuery.dataUpdatedAt]);

  // Listen for status updates to trigger immediate refresh
  const handleStatusUpdate = useCallback(() => {
    dev('🔄 Status update detected, triggering immediate polling refresh');
    ordersPollingQuery.refetch();
  }, [ordersPollingQuery]);

  useEffect(() => {
    window.addEventListener('orderStatusUpdated', handleStatusUpdate);
    return () => window.removeEventListener('orderStatusUpdated', handleStatusUpdate);
  }, [handleStatusUpdate]);

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
            dev(`🎯 Status change: ${oldStatus} → ${newStatus} for order ${newStatus?.id}`);

            try {
              if (payload.eventType === 'UPDATE') {
                const order = payload.new as SupabaseOrderRow;
                const updatedOrder = await enrichOrderData(order);

                // Update React Query cache for realtime updates
                // ✅ FIX: Include selectedDealerId in queryKey to match polling query
                queryClient.setQueryData(['orders', 'all', selectedDealerId], (oldData: Order[] | undefined) =>
                  oldData
                    ? oldData.map(existingOrder =>
                        existingOrder.id === updatedOrder.id ? updatedOrder : existingOrder
                      )
                    : [updatedOrder]
                );
              }
            } catch (error) {
              logError('Error handling status update:', error);
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
  }, [user, createSubscription, removeSubscription, enrichOrderData, queryClient]);

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
