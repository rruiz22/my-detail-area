import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
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

// Recon-specific service item type
interface ReconServiceItem {
  type: 'acquisition_cost' | 'recon_cost' | 'acquisition_source' | 'condition_grade' | 'recon_category' | string;
  value: string | number | null;
  description?: string;
}

// Recon order creation data
export interface ReconOrderData {
  stockNumber?: string;
  vehicleYear?: number | string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleInfo?: string;
  status?: string;
  priority?: string;
  services?: string[]; // Array of service UUIDs
  totalAmount?: number;
  notes?: string;
  internalNotes?: string;
  completedAt?: Date; // Completion date for recon
  dealerId: number | string;
  assignedContactId?: string | number;
  acquisitionCost?: number;
  reconCost?: number;
  acquisitionSource?: string;
  conditionGrade?: string;
  reconCategory?: string;
}

// Recon Order interface - specific for reconditioning workflow
export interface ReconOrder {
  id: string;
  orderNumber: string;
  stockNumber?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleInfo?: string;
  orderType: string;
  status: string;
  priority?: string;
  services: string[]; // Array of service UUIDs
  totalAmount?: number;
  notes?: string;
  internalNotes?: string;
  dueDate?: string;
  slaDeadline?: string;
  dealerId: number;
  dealer_id?: number; // CRITICAL: snake_case for multi-tenant security (StatusBadgeInteractive)
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignedContactId?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  createdByGroupId?: string;
  assignedGroupId?: string;
  // Recon-specific fields
  acquisitionCost?: number;
  reconCost?: number;
  acquisitionSource?: string; // trade-in, auction, dealer-swap, etc.
  conditionGrade?: string; // excellent, good, fair, poor
  reconCategory?: string; // mechanical, cosmetic, full-recon, detail-only
  // Enhanced fields from JOINs
  dealershipName?: string;
  assignedGroupName?: string;
  createdByGroupName?: string;
  assignedTo?: string;
  dueTime?: string;
}

// Transform Supabase order to ReconOrder interface
const transformReconOrder = (supabaseOrder: SupabaseOrder): ReconOrder => ({
  id: supabaseOrder.id,
  orderNumber: supabaseOrder.order_number || supabaseOrder.custom_order_number,
  stockNumber: supabaseOrder.stock_number,
  vehicleYear: supabaseOrder.vehicle_year,
  vehicleMake: supabaseOrder.vehicle_make,
  vehicleModel: supabaseOrder.vehicle_model,
  vehicleVin: supabaseOrder.vehicle_vin,
  vehicleInfo: supabaseOrder.vehicle_info,
  orderType: supabaseOrder.order_type || 'recon',
  status: supabaseOrder.status,
  priority: supabaseOrder.priority,
  services: Array.isArray(supabaseOrder.services) ? supabaseOrder.services as string[] : [],
  totalAmount: supabaseOrder.total_amount,
  notes: supabaseOrder.notes,
  internalNotes: supabaseOrder.internal_notes,
  dueDate: supabaseOrder.due_date,
  slaDeadline: supabaseOrder.sla_deadline,
  dealerId: supabaseOrder.dealer_id, // camelCase for modal auto-population
  dealer_id: supabaseOrder.dealer_id, // CRITICAL: snake_case for multi-tenant security
  createdAt: supabaseOrder.created_at,
  updatedAt: supabaseOrder.updated_at,
  completedAt: supabaseOrder.completed_at,
  assignedContactId: supabaseOrder.assigned_contact_id,
  statusChangedAt: supabaseOrder.status_changed_at,
  statusChangedBy: supabaseOrder.status_changed_by,
  createdByGroupId: supabaseOrder.created_by_group_id,
  assignedGroupId: supabaseOrder.assigned_group_id,
  // Recon-specific fields from services metadata (if stored as ReconServiceItem)
  acquisitionCost: undefined,
  reconCost: undefined,
  acquisitionSource: undefined,
  conditionGrade: undefined,
  reconCategory: undefined,
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
});

export const useReconOrderManagement = () => {
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const { t } = useTranslation();
  const { user } = useAuth();
  const { enhancedUser } = usePermissions();
  const { generateQR } = useOrderActions();
  const queryClient = useQueryClient();

  // Check if polling should be enabled
  const isPollingEnabled = !!(user && enhancedUser);

  // Smart polling for recon order data (replaces real-time subscription and initial refresh)
  const reconOrdersPollingQuery = useOrderPolling(
    ['orders', 'recon'],
    async () => {
      if (!user || !enhancedUser) {
        console.log('⚠️ Polling skipped - no user or enhancedUser');
        return [];
      }


      // Apply same dealer filtering logic as other modules
      let ordersQuery = supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'recon')
        .order('created_at', { ascending: false });

      // Check global dealer filter
      const savedDealerFilter = localStorage.getItem('selectedDealerFilter');
      const parsedFilter = savedDealerFilter && savedDealerFilter !== 'null' && savedDealerFilter !== 'undefined'
        ? (savedDealerFilter === 'all' ? 'all' : parseInt(savedDealerFilter))
        : 'all';
      const dealerFilter = typeof parsedFilter === 'number' && !isNaN(parsedFilter) ? parsedFilter : 'all';
      console.log(`🔍 Recon Polling - Dealer filter resolved: "${savedDealerFilter}" → ${dealerFilter}`);

      // Handle dealer filtering based on user type and global filter
      // ✅ FIX: System admins should ALWAYS respect global filter, even if they have dealership_id assigned
      const isSystemAdminPolling = enhancedUser && 'is_system_admin' in enhancedUser
        ? enhancedUser.is_system_admin
        : enhancedUser && 'role' in enhancedUser && enhancedUser.role === 'system_admin';

      const shouldUseGlobalFilterPolling = enhancedUser.dealership_id === null || isSystemAdminPolling;

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
            console.error('❌ Recon Polling - Failed to fetch dealer memberships:', dealershipError);
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          } else if (!userDealerships || userDealerships.length === 0) {
            // 🔒 SECURITY: No memberships = no data access (fail-secure)
            console.warn('⚠️ Recon Polling - Multi-dealer user has NO dealer memberships - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1);
          } else {
            const dealerIds = userDealerships.map(d => d.dealer_id);
            console.log(`🏢 Recon Polling - ${isSystemAdminPolling ? 'System admin' : 'Multi-dealer user'} - showing all dealers: [${dealerIds.join(', ')}]`);
            ordersQuery = ordersQuery.in('dealer_id', dealerIds);
          }
        } else {
          // Filter by specific dealer selected in dropdown - validate it's a number
          if (typeof dealerFilter === 'number' && !isNaN(dealerFilter)) {
            console.log(`🎯 Recon Polling - ${isSystemAdminPolling ? 'System admin' : 'Multi-dealer user'} - filtering by selected dealer: ${dealerFilter}`);
            ordersQuery = ordersQuery.eq('dealer_id', dealerFilter);
          } else {
            // 🔒 SECURITY: Invalid dealer filter - return empty results (fail-secure)
            console.error(`❌ Recon Polling - Invalid dealerFilter value: ${dealerFilter} (type: ${typeof dealerFilter})`);
            console.warn('⚠️ Recon Polling - Invalid dealer filter - returning empty dataset');
            ordersQuery = ordersQuery.eq('dealer_id', -1); // No dealer has ID -1, returns empty
          }
        }
      } else {
        // Single-dealer regular users - use their assigned dealership (ignore global filter)
        console.log(`🏢 Recon Polling - Single-dealer user - using assigned dealership: ${enhancedUser.dealership_id}`);
        ordersQuery = ordersQuery.eq('dealer_id', enhancedUser.dealership_id);
      }

      const { data: orders, error } = await ordersQuery;
      if (error) throw error;

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
      const transformedOrders = (orders || []).map(order => {
        const transformedOrder = transformReconOrder(order);
        // Add joined data manually
        transformedOrder.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;
        transformedOrder.assignedTo = transformedOrder.assignedGroupName || 'Unassigned';
        return transformedOrder;
      });

      return transformedOrders;
    },
    isPollingEnabled  // Use reactive variable
  );

  // Derive orders directly from polling query using useMemo for silent updates
  const allOrders = useMemo(() =>
    reconOrdersPollingQuery.data || [],
    [reconOrdersPollingQuery.data]
  );

  // Simplified refreshData - uses polling query for consistency
  // Toast is shown in the component's handleManualRefresh to avoid duplication
  const refreshData = useCallback(async () => {
    await reconOrdersPollingQuery.refetch();
  }, [reconOrdersPollingQuery]);


  // Create new recon order
  const createOrder = useCallback(async (orderData: ReconOrderData) => {
    try {
      console.log('📥 Hook received orderData:', {
        dealerId: orderData.dealerId,
        stockNumber: orderData.stockNumber,
        services: orderData.services,
        servicesLength: orderData.services?.length,
        servicesType: typeof orderData.services,
        isArray: Array.isArray(orderData.services),
        completedAt: orderData.completedAt,
        completedAtType: typeof orderData.completedAt,
        completedAtValue: orderData.completedAt ? orderData.completedAt.toString() : 'undefined',
        fullData: orderData
      });

      // Validate dealerId before conversion
      if (!orderData.dealerId) {
        throw new Error('Dealership ID is required');
      }

      const dealerIdNumber = parseInt(orderData.dealerId.toString());
      if (isNaN(dealerIdNumber)) {
        throw new Error('Invalid dealership ID');
      }

      // Use database function to generate recon order number
      const { data: orderNumberData, error: numberError } = await supabase
        .rpc('generate_recon_order_number');

      if (numberError || !orderNumberData) {
        console.error('Error generating recon order number:', numberError);
        throw new Error('Failed to generate recon order number');
      }

      const insertData: SupabaseOrderInsert = {
        stock_number: orderData.stockNumber,
        vehicle_year: orderData.vehicleYear ? parseInt(orderData.vehicleYear.toString()) : null,
        vehicle_make: orderData.vehicleMake,
        vehicle_model: orderData.vehicleModel,
        vehicle_vin: orderData.vehicleVin,
        vehicle_info: orderData.vehicleInfo,
        order_type: 'recon',
        order_number: orderNumberData,
        status: orderData.status || 'pending',
        priority: 'normal',
        services: orderData.services || [],
        total_amount: orderData.totalAmount,
        notes: orderData.notes,
        internal_notes: orderData.internalNotes,
        completed_at: orderData.completedAt ? orderData.completedAt.toISOString() : null,
        dealer_id: dealerIdNumber,
        assigned_contact_id: null,
        created_by: user.id,
      };

      console.log('💾 Sending to Supabase:', {
        stock_number: insertData.stock_number,
        services: insertData.services,
        servicesLength: insertData.services?.length,
        servicesType: typeof insertData.services,
        isArray: Array.isArray(insertData.services),
        servicesContent: JSON.stringify(insertData.services),
        completed_at: insertData.completed_at,
        completed_at_type: typeof insertData.completed_at,
        completed_at_value: insertData.completed_at ? insertData.completed_at.toString() : 'null',
        total_amount: insertData.total_amount,
        vehicle_info: insertData.vehicle_info,
        fullInsertData: insertData
      });

      const { data, error } = await supabase
        .from('orders')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating recon order:', error);
        toast({
          description: t('recon.error_creating_order'),
          variant: 'destructive'
        });
        return null;
      }

      const newOrder = transformReconOrder(data);

      // Auto-generate QR code and shortlink in background (fire-and-forget, non-blocking)
      generateQR(data.id, data.order_number, data.dealer_id)
        .then(() => {
          console.log('✅ QR code and shortlink generated for recon order:', data.order_number);
        })
        .catch((qrError) => {
          console.error('❌ Failed to generate QR code:', qrError);
          // QR generation failure doesn't affect order creation
        });

      // Show success immediately (don't wait for QR)
      toast({
        description: t('recon.order_created_successfully'),
        variant: 'default'
      });

      // Invalidate queries to trigger immediate table refresh
      await queryClient.invalidateQueries({ queryKey: ['orders', 'recon'] });
      console.log('✅ Recon order cache invalidated - table will refresh immediately');

      return newOrder;
    } catch (error) {
      console.error('Error creating recon order:', error);
      toast({
        description: t('recon.error_creating_order'),
        variant: 'destructive'
      });
      return null;
    }
  }, [user, generateQR, queryClient, t]);

  // Update existing recon order
  const updateOrder = useCallback(async (orderId: string, orderData: Partial<ReconOrderData>) => {
    try {
      console.log('📥 updateOrder received:', {
        orderId: orderId,
        orderData: orderData,
        completedAt: orderData.completedAt,
        completedAtType: typeof orderData.completedAt,
        stockNumber: orderData.stockNumber,
        services: orderData.services,
        status: orderData.status
      });

      // Build updateData dynamically - only include fields explicitly provided
      // This prevents accidental data loss when doing partial updates (e.g., status change)
      const updateData: SupabaseOrderUpdate = {};

      // Vehicle and stock information
      if (orderData.stockNumber !== undefined) {
        updateData.stock_number = orderData.stockNumber;
      }
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
      if (orderData.totalAmount !== undefined) {
        updateData.total_amount = orderData.totalAmount;
      }

      // Notes
      if (orderData.notes !== undefined) {
        updateData.notes = orderData.notes;
      }
      if (orderData.internalNotes !== undefined) {
        updateData.internal_notes = orderData.internalNotes;
      }

      // Dates
      if (orderData.completedAt !== undefined) {
        updateData.completed_at = orderData.completedAt
          ? (orderData.completedAt instanceof Date ? orderData.completedAt.toISOString() : orderData.completedAt)
          : null;
      }

      // Assignment
      if (orderData.assignedContactId !== undefined) {
        updateData.assigned_contact_id = orderData.assignedContactId ? orderData.assignedContactId.toString() : null;
      }

      console.log('💾 Sending UPDATE to Supabase:', {
        orderId: orderId,
        updateData: updateData,
        completed_at: updateData.completed_at,
        completed_at_type: typeof updateData.completed_at,
        stock_number: updateData.stock_number,
        services: updateData.services,
        status: updateData.status,
        fieldsToUpdate: Object.keys(updateData)
      });

      const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating recon order:', error);
        toast({
          description: t('recon.error_updating_order'),
          variant: 'destructive'
        });
        return null;
      }

      console.log('✅ Supabase UPDATE successful, received data:', {
        id: data.id,
        completed_at: data.completed_at,
        stock_number: data.stock_number,
        services: data.services,
        status: data.status,
        fullData: data
      });

      const updatedOrder = transformReconOrder(data);

      toast({
        description: t('recon.order_updated_successfully'),
        variant: 'default'
      });

      // Invalidate React Query cache to force fresh data from polling
      await queryClient.refetchQueries({ queryKey: ['orders', 'recon'] });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating recon order:', error);
      toast({
        description: t('recon.error_updating_order'),
        variant: 'destructive'
      });
      return null;
    }
  }, [queryClient, t]);

  // Delete recon order
  const deleteOrder = useCallback(async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting recon order:', error);
        toast({
          description: t('recon.error_deleting_order'),
          variant: 'destructive'
        });
        return false;
      }

      toast({
        description: t('recon.order_deleted_successfully'),
        variant: 'default'
      });

      // Invalidate React Query cache to refresh order list
      await queryClient.refetchQueries({ queryKey: ['orders', 'recon'] });

      return true;
    } catch (error) {
      console.error('Error deleting recon order:', error);
      toast({
        description: t('recon.error_deleting_order'),
        variant: 'destructive'
      });
      return false;
    }
  }, [queryClient, t]);


  // Trigger initial fetch when enhancedUser becomes available
  useEffect(() => {
    if (user && enhancedUser && !reconOrdersPollingQuery.data) {
      reconOrdersPollingQuery.refetch();
    }
  }, [user, enhancedUser, reconOrdersPollingQuery]);

  // Update lastRefresh when polling completes
  useEffect(() => {
    if (!reconOrdersPollingQuery.isFetching && reconOrdersPollingQuery.dataUpdatedAt) {
      setLastRefresh(new Date(reconOrdersPollingQuery.dataUpdatedAt));
    }
  }, [reconOrdersPollingQuery.isFetching, reconOrdersPollingQuery.dataUpdatedAt]);

  // Listen for status updates to trigger immediate refresh using EventBus
  useEffect(() => {
    const handleStatusUpdate = () => {
      console.log('🔄 [Recon] Status update detected, triggering immediate polling refresh');
      reconOrdersPollingQuery.refetch();
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
  }, [reconOrdersPollingQuery]);

  return {
    orders: allOrders,
    loading,
    lastRefresh,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder
  };
};
