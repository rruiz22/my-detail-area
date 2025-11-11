import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useOrderActions } from '@/hooks/useOrderActions';
import { usePermissions } from '@/hooks/usePermissions';
import { useOrderPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { isDateInWeek } from '@/utils/weekUtils';
import { dev, warn, error as logError } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { enrichOrdersArray, createUserDisplayName, type EnrichmentLookups } from '@/services/orderEnrichment';
import { createOrderNotification } from '@/utils/notificationHelper';
import { sendOrderCreatedSMS } from '@/services/smsNotificationHelper';
import { slackNotificationService } from '@/services/slackNotificationService';

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
export interface ServiceOrderData {
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
  week: number;
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
  short_link?: string; // QR code short link (mda.to/XXXXX)
  qr_code_url?: string; // Full QR code image URL
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
  dealer_id?: number; // snake_case from database
  comments?: number; // Comments count from aggregation
  order_type?: string; // Order type from database
  completed_at?: string; // Completion timestamp
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
  short_link: supabaseOrder.short_link || undefined,
  qr_code_url: supabaseOrder.qr_code_url || undefined,
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
  dealerId: supabaseOrder.dealer_id, // Map dealer_id for modal auto-population (camelCase)
  dealer_id: supabaseOrder.dealer_id, // CRITICAL: Also include snake_case for multi-tenant security
  // Enhanced fields from manual JOINs (will be set in refreshData)
  dealershipName: 'Unknown Dealer',
  assignedGroupName: undefined,
  createdByGroupName: undefined,
  dueTime: supabaseOrder.due_date ? new Date(supabaseOrder.due_date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) : undefined,
  // Comments count from aggregation (enriched by orderEnrichment service)
  comments: 0, // Will be populated by enrichOrdersArray
});

export const useServiceOrderManagement = (activeTab: string, weekOffset: number = 0) => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
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
  const { selectedDealerId } = useDealerFilter();  // ✅ FIX: Use dealer filter from context

  // Smart polling for service order data (replaces real-time subscription and initial refresh)
  // ✅ FIX: Include selectedDealerId in queryKey so cache invalidates when dealer changes
  const serviceOrdersPollingQuery = useOrderPolling(
    ['orders', 'service', selectedDealerId],  // ✅ FIX: Added selectedDealerId to queryKey
    async () => {
      if (!user || !enhancedUser) return [];

      dev('🔄 Smart polling: Fetching service orders...');

      // Apply same dealer filtering logic as Sales Orders
      let ordersQuery = supabase
        .from('orders')
        .select('*, order_comments(count)')
        .eq('order_type', 'service')
        .order('created_at', { ascending: false });

      // ✅ FIX: Use selectedDealerId from context instead of reading localStorage
      const dealerFilter = selectedDealerId;
      dev(`🔍 Service Polling - Dealer filter resolved: ${dealerFilter}`);

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
            // 🔒 SECURITY: Database error - log and return empty results (fail-secure)
            logError('❌ Service Polling - Failed to fetch dealer memberships:', dealershipError);
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else if (!userDealerships || userDealerships.length === 0) {
            // 🔒 SECURITY: No memberships = no data access (fail-secure)
            warn('⚠️ Service Polling - Multi-dealer user has NO dealer memberships - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1);
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            dev(`🏢 Service Polling - ${isSystemAdminPolling ? 'System admin' : 'Multi-dealer user'} - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            dev(`🎯 Service Polling - ${isSystemAdminPolling ? 'System admin' : 'Multi-dealer user'} - filtering by selected dealer: ${dealerFilter}`);
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            // 🔒 SECURITY: Invalid dealer filter - return empty results (fail-secure)
            logError(`❌ Service Polling - Invalid dealerFilter value: ${dealerFilter} (type: ${typeof dealerFilter})`);
            warn('⚠️ Service Polling - Invalid dealer filter - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          }
        }
      } else {
        // Single-dealer regular users - use their assigned dealership (ignore global filter)
        dev(`🏢 Service Polling - Single-dealer user - using assigned dealership: ${enhancedUser.dealership_id}`);
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;

      // OPTIMIZATION: Use orderEnrichment service for DRY, type-safe, O(1) lookups
      // Benefits: Single source of truth, better maintainability, consistent across order types
      const [dealershipsResult, profilesResult, groupsResult] = await Promise.all([
        supabase.from('dealerships').select('id, name, city, state'),
        supabase.from('profiles').select('id, first_name, last_name, email'),
        supabase.from('dealer_groups').select('id, name')
      ]);

      // Build EnrichmentLookups using orderEnrichment service
      const lookups: EnrichmentLookups = {
        dealerships: new Map(
          dealershipsResult.data?.map(d => [d.id, {
            name: d.name,
            city: d.city || undefined,
            state: d.state || undefined
          }]) || []
        ),
        users: new Map(
          profilesResult.data?.map(u => [u.id, {
            name: createUserDisplayName(u),
            email: u.email
          }]) || []
        ),
        groups: new Map(
          groupsResult.data?.map(g => [g.id, { name: g.name }]) || []
        )
      };

      // OPTIMIZATION: Use enrichOrdersArray for batch enrichment (single pass, O(1) lookups)
      const enrichedOrders = enrichOrdersArray(orders || [], lookups);

      // Transform to ServiceOrder interface
      const serviceOrders = enrichedOrders.map(order => {
        const transformed = transformServiceOrder(order);

        // DEBUG: Log polling assignment data
        dev('🔄 Polling Assignment Debug:', {
          orderId: order.id,
          orderNumber: order.order_number,
          assigned_group_id: order.assigned_group_id,
          due_date: order.due_date
        });

        // Enriched fields from orderEnrichment service
        transformed.dealershipName = order.dealershipName;
        transformed.assignedTo = order.assignedTo;
        transformed.assignedGroupName = order.assignedGroupName;
        transformed.createdByGroupName = order.createdByGroupName;
        transformed.dueTime = order.dueTime;
        transformed.comments = order.comments;

        dev('✅ Polling mapped:', transformed.assignedTo, 'dueDate:', transformed.dueDate);

        return transformed;
      });

      return serviceOrders;
    },
    !!(user && enhancedUser)
  );

  // Derive orders directly from polling query using useMemo for silent updates
  const allOrders = useMemo(() =>
    serviceOrdersPollingQuery.data || [],
    [serviceOrdersPollingQuery.data]
  );

  // OPTIMIZATION: Single-pass reduce for tabCounts calculation O(n)
  // Benefits: Reduces 8 separate array iterations to 1, better performance for large datasets
  const tabCounts = useMemo((): ServiceTabCounts => {
    const today = new Date();
    const todayString = today.toDateString();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toDateString();

    // Single-pass accumulator for ALL tab counts
    const counts = allOrders.reduce((acc, order) => {
      const orderDate = new Date(order.dueDate || order.createdAt);
      const orderDateString = orderDate.toDateString();

      // Date-based counts
      if (orderDateString === todayString) acc.today++;
      if (orderDateString === tomorrowString) acc.tomorrow++;
      if (isDateInWeek(orderDate, weekOffset)) acc.week++;

      // Status-based counts
      if (order.status === 'pending') acc.pending++;
      else if (order.status === 'in_progress') acc.in_process++;
      else if (order.status === 'completed') acc.completed++;
      else if (order.status === 'cancelled') acc.cancelled++;

      return acc;
    }, {
      all: allOrders.length,
      today: 0,
      tomorrow: 0,
      pending: 0,
      in_process: 0,
      completed: 0,
      cancelled: 0,
      week: 0
    });

    return counts;
  }, [allOrders, weekOffset]);

  const filteredOrders = useMemo(() => {
    let filtered = [...allOrders];

    // Apply tab-specific filtering
    if (activeTab !== 'dashboard' && activeTab !== 'all') {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      switch (activeTab) {
        case 'week':
          filtered = filtered.filter(order => {
            const orderDate = new Date(order.dueDate || order.createdAt);
            return isDateInWeek(orderDate, weekOffset);
          });
          break;
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
        order.tag?.toLowerCase().includes(searchLower) ||
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
  }, [allOrders, activeTab, weekOffset, filters]);

  // Simplified refreshData - uses polling query for consistency
  const refreshData = useCallback(async () => {
    dev('🔄 Manual refresh triggered - using polling query');
    await serviceOrdersPollingQuery.refetch();
  }, [serviceOrdersPollingQuery]);

  const updateFilters = useCallback((newFilters: Partial<ServiceOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const createOrder = useCallback(async (orderData: ServiceOrderData) => {
    if (!user) return;

    setLoading(true);

    try {
      dev('Creating service order with data:', orderData);

      // Use database function to generate sequential order number
      const { data: orderNumberData, error: numberError } = await supabase
        .rpc('generate_service_order_number');

      if (numberError || !orderNumberData) {
        logError('Error generating order number:', numberError);
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
        created_by: user.id, // Track creator for auto-follower
      };

      dev('Inserting service order to DB:', insertData);

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        logError('Error creating service order:', error);
        throw error;
      }

      dev('Service order created successfully:', data);

      // 🔔 NOTIFICATION: Order Created
      void createOrderNotification({
        userId: data.assigned_group_id || null,
        dealerId: data.dealer_id,
        module: 'service_orders',
        event: 'order_created',
        orderId: data.id,
        orderNumber: data.order_number || data.id,
        priority: 'normal',
        metadata: {
          customerName: data.customer_name,
          vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim()
        }
      }      ).catch(err =>
        console.error('[ServiceOrderManagement] Failed to create order notification:', err)
      );

      // 🔗 GENERATE SHORT LINK: Must happen BEFORE SMS to include it in the message
      let shortLink: string | undefined = undefined;
      try {
        const qrData = await generateQR(data.id, data.order_number, data.dealer_id);
        shortLink = qrData?.shortLink;
        dev('✅ QR code and shortlink generated for service order:', data.order_number, shortLink);
      } catch (qrError) {
        logError('❌ Failed to generate QR code:', qrError);
        // Continue with SMS even if QR generation fails
      }

      // 📱 SMS NOTIFICATION: Send SMS to users with notification rules
      if (user?.id) {
        // Format services for SMS
        const servicesText = Array.isArray(data.services) && data.services.length > 0
          ? data.services.map((s: any) => s.name || s.type).filter(Boolean).join(', ')
          : '';

        // Debug logging to verify data
        console.log('🔍 Service SMS Data Debug:', {
          services: data.services,
          servicesText,
          tag: data.tag,
          dueDate: data.due_date,
          shortLink
        });

        void sendOrderCreatedSMS({
          orderId: data.id,
          dealerId: data.dealer_id,
          module: 'service_orders',
          triggeredBy: user.id,
          eventData: {
            orderNumber: data.order_number || data.id,
            tag: data.tag,
            vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim(),
            services: servicesText,
            dueDateTime: data.due_date,
            shortLink: shortLink || undefined
          }
        });

        // Send Slack notification (if enabled)
        void slackNotificationService.isEnabled(
          data.dealer_id,
          'service_orders',
          'order_created'
        ).then(async (slackEnabled) => {
          if (slackEnabled) {
            console.log('📤 Slack enabled for service order, sending notification...');
            await slackNotificationService.notifyOrderCreated({
              orderId: data.id,
              dealerId: data.dealer_id,
              module: 'service_orders',
              eventData: {
                orderNumber: data.order_number || data.id,
                tag: data.tag,
                vehicleInfo: `${data.vehicle_year || ''} ${data.vehicle_make || ''} ${data.vehicle_model || ''}`.trim(),
                services: servicesText,
                dueDateTime: data.due_date,
                shortLink: shortLink || undefined
              }
            });
          }
        }).catch((error) => {
          console.error('❌ [Slack] Failed to send service order creation notification:', error);
        });
      }

      // Invalidate queries to trigger immediate table refresh
      await queryClient.invalidateQueries({ queryKey: ['orders', 'service'] });
      dev('✅ Service order cache invalidated - table will refresh immediately');
    } catch (error) {
      logError('Error in createOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, generateQR, queryClient]);

  const updateOrder = useCallback(async (orderId: string, orderData: Partial<ServiceOrderData> & { status?: string }) => {
    if (!user) return;

    setLoading(true);

    try {
      // Build updateData dynamically - only include fields explicitly provided
      // This prevents accidental data loss when doing partial updates (e.g., status change)
      const updateData: SupabaseOrderUpdate = {};

      // Customer information
      if (orderData.customerName !== undefined) {
        updateData.customer_name = orderData.customerName;
      }
      if (orderData.customerEmail !== undefined) {
        updateData.customer_email = orderData.customerEmail;
      }
      if (orderData.customerPhone !== undefined) {
        updateData.customer_phone = orderData.customerPhone;
      }

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

      // Service specific fields
      if (orderData.po !== undefined) {
        updateData.po = orderData.po;
      }
      if (orderData.ro !== undefined) {
        updateData.ro = orderData.ro;
      }
      if (orderData.tag !== undefined) {
        updateData.tag = orderData.tag;
      }

      // Assignment
      if (orderData.assignedGroupId !== undefined) {
        updateData.assigned_group_id = orderData.assignedGroupId;
      }

      // Order status
      if (orderData.status !== undefined) {
        updateData.status = orderData.status;
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

      // Dates
      if (orderData.dueDate !== undefined) {
        updateData.due_date = orderData.dueDate;
      }

      // Notes
      if (orderData.notes !== undefined) {
        updateData.notes = orderData.notes;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        logError('Error updating service order:', error);
        throw error;
      }

      dev('Service order updated successfully:', data);

      // Force immediate refetch to get fresh data
      await queryClient.refetchQueries({ queryKey: ['orders', 'service'] });
    } catch (error) {
      logError('Error in updateOrder:', error);
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
        logError('Error deleting service order:', error);
        throw error;
      }

      dev('Service order deleted successfully');

      // Force immediate refetch to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'service'] });
    } catch (error) {
      logError('Error in deleteOrder:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user, queryClient]);


  // Update lastRefresh when polling completes
  useEffect(() => {
    if (!serviceOrdersPollingQuery.isFetching && serviceOrdersPollingQuery.dataUpdatedAt) {
      setLastRefresh(new Date(serviceOrdersPollingQuery.dataUpdatedAt));
      dev('⏰ Service Orders LastRefresh updated:', new Date(serviceOrdersPollingQuery.dataUpdatedAt).toLocaleTimeString());
    }
  }, [serviceOrdersPollingQuery.isFetching, serviceOrdersPollingQuery.dataUpdatedAt]);

  // Listen for status updates to trigger immediate refresh using EventBus
  useEffect(() => {
    const handleStatusUpdate = () => {
      dev('🔄 [Service] Status update detected, triggering immediate polling refresh');
      serviceOrdersPollingQuery.refetch();
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
  }, [serviceOrdersPollingQuery]);

  return {
    orders: filteredOrders,
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
