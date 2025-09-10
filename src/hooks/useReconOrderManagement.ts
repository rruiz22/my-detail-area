import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { useOrderActions } from '@/hooks/useOrderActions';
import { orderNumberService } from '@/services/orderNumberService';

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
  services: any[];
  totalAmount?: number;
  notes?: string;
  internalNotes?: string;
  dueDate?: string;
  slaDeadline?: string;
  dealerId: number;
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

interface ReconOrderFilters {
  search: string;
  status: string;
  make: string;
  model: string;
  reconCategory: string;
  conditionGrade: string;
  dateRange: {
    from?: Date;
    to?: Date;
  };
}

interface TabCounts {
  all: number;
  today: number;
  tomorrow: number;
  pending: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  needsApproval: number;
  readyForSale: number;
}

// Transform Supabase order to ReconOrder interface
const transformReconOrder = (supabaseOrder: any): ReconOrder => ({
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
  services: supabaseOrder.services || [],
  totalAmount: supabaseOrder.total_amount,
  notes: supabaseOrder.notes,
  internalNotes: supabaseOrder.internal_notes,
  dueDate: supabaseOrder.due_date,
  slaDeadline: supabaseOrder.sla_deadline,
  dealerId: supabaseOrder.dealer_id,
  createdAt: supabaseOrder.created_at,
  updatedAt: supabaseOrder.updated_at,
  completedAt: supabaseOrder.completed_at,
  assignedContactId: supabaseOrder.assigned_contact_id,
  statusChangedAt: supabaseOrder.status_changed_at,
  statusChangedBy: supabaseOrder.status_changed_by,
  createdByGroupId: supabaseOrder.created_by_group_id,
  assignedGroupId: supabaseOrder.assigned_group_id,
  // Extract recon-specific data from services/metadata if available
  acquisitionCost: supabaseOrder.services?.find((s: any) => s.type === 'acquisition_cost')?.value,
  reconCost: supabaseOrder.services?.find((s: any) => s.type === 'recon_cost')?.value,
  acquisitionSource: supabaseOrder.services?.find((s: any) => s.type === 'acquisition_source')?.value || 'trade-in',
  conditionGrade: supabaseOrder.services?.find((s: any) => s.type === 'condition_grade')?.value || 'good',
  reconCategory: supabaseOrder.services?.find((s: any) => s.type === 'recon_category')?.value || 'full-recon',
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

export const useReconOrderManagement = (activeTab: string = 'all') => {
  const [orders, setOrders] = useState<ReconOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ReconOrderFilters>({
    search: '',
    status: 'all',
    make: 'all',
    model: 'all',
    reconCategory: 'all',
    conditionGrade: 'all',
    dateRange: {}
  });

  const { toast } = useToast();
  const { t } = useTranslation();
  const { generateQR } = useOrderActions();

  // Calculate tab counts with recon-specific tabs
  const tabCounts = useMemo((): TabCounts => {
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

    return {
      all: orders.length,
      today: orders.filter(order => 
        order.dueDate && new Date(order.dueDate).toDateString() === today
      ).length,
      tomorrow: orders.filter(order => 
        order.dueDate && new Date(order.dueDate).toDateString() === tomorrow
      ).length,
      pending: orders.filter(order => order.status === 'pending').length,
      inProgress: orders.filter(order => order.status === 'in_progress').length,
      completed: orders.filter(order => order.status === 'completed').length,
      cancelled: orders.filter(order => order.status === 'cancelled').length,
      needsApproval: orders.filter(order => order.status === 'needs_approval').length,
      readyForSale: orders.filter(order => order.status === 'ready_for_sale').length,
    };
  }, [orders]);

  // Filter orders based on active tab and additional filters
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    // Apply tab filter
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

    switch (activeTab) {
      case 'today':
        filtered = filtered.filter(order => 
          order.dueDate && new Date(order.dueDate).toDateString() === today
        );
        break;
      case 'tomorrow':
        filtered = filtered.filter(order => 
          order.dueDate && new Date(order.dueDate).toDateString() === tomorrow
        );
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
      case 'needsApproval':
        filtered = filtered.filter(order => order.status === 'needs_approval');
        break;
      case 'readyForSale':
        filtered = filtered.filter(order => order.status === 'ready_for_sale');
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.stockNumber?.toLowerCase().includes(searchLower) ||
        order.vehicleVin?.toLowerCase().includes(searchLower) ||
        order.vehicleMake?.toLowerCase().includes(searchLower) ||
        order.vehicleModel?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    // Apply make filter
    if (filters.make !== 'all') {
      filtered = filtered.filter(order => order.vehicleMake === filters.make);
    }

    // Apply model filter
    if (filters.model !== 'all') {
      filtered = filtered.filter(order => order.vehicleModel === filters.model);
    }

    // Apply recon category filter
    if (filters.reconCategory !== 'all') {
      filtered = filtered.filter(order => order.reconCategory === filters.reconCategory);
    }

    // Apply condition grade filter
    if (filters.conditionGrade !== 'all') {
      filtered = filtered.filter(order => order.conditionGrade === filters.conditionGrade);
    }

    // Apply date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.createdAt);
        const fromDate = filters.dateRange.from;
        const toDate = filters.dateRange.to;

        if (fromDate && orderDate < fromDate) return false;
        if (toDate && orderDate > toDate) return false;
        return true;
      });
    }

    return filtered;
  }, [orders, activeTab, filters]);

  // Fetch recon orders from Supabase
  const refreshData = async () => {
    try {
      setLoading(true);
      
      // Fetch recon orders from Supabase (basic query first)
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'recon')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recon orders:', error);
        toast({
          title: t('common.error'),
          description: t('recon.error_fetching_orders'),
          variant: 'destructive',
        });
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
      const transformedOrders = (orders || []).map(order => {
        const transformedOrder = transformReconOrder(order);
        // Add joined data manually
        transformedOrder.dealershipName = dealershipMap.get(order.dealer_id) || 'Unknown Dealer';
        transformedOrder.assignedGroupName = order.assigned_group_id ? groupMap.get(order.assigned_group_id) : undefined;
        transformedOrder.createdByGroupName = order.created_by_group_id ? groupMap.get(order.created_by_group_id) : undefined;
        transformedOrder.assignedTo = transformedOrder.assignedGroupName || 'Unassigned';
        return transformedOrder;
      });

      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching recon orders:', error);
      toast({
        title: t('common.error'),
        description: t('recon.error_fetching_orders'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update filters
  const updateFilters = (newFilters: Partial<ReconOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Create new recon order
  const createOrder = async (orderData: any) => {
    try {
      console.log('Creating recon order with data:', orderData);

      // Validate dealerId before conversion
      if (!orderData.dealerId) {
        throw new Error('Dealership ID is required');
      }

      const dealerIdNumber = parseInt(orderData.dealerId.toString());
      if (isNaN(dealerIdNumber)) {
        throw new Error('Invalid dealership ID');
      }

      // Use database function to generate sequential order number  
      const { data: orderNumberData, error: numberError } = await supabase
        .rpc('generate_service_order_number'); // Reusing service order number for now

      if (numberError || !orderNumberData) {
        console.error('Error generating recon order number:', numberError);
        throw new Error('Failed to generate recon order number');
      }

      // Prepare services array with recon-specific data
      const services = [
        ...(orderData.services || []),
        { type: 'acquisition_cost', value: orderData.acquisitionCost },
        { type: 'recon_cost', value: orderData.reconCost },
        { type: 'acquisition_source', value: orderData.acquisitionSource },
        { type: 'condition_grade', value: orderData.conditionGrade },
        { type: 'recon_category', value: orderData.reconCategory },
      ].filter(service => service.value !== undefined && service.value !== null);

      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_name: orderData.stockNumber || 'Recon Vehicle',
          stock_number: orderData.stockNumber,
          vehicle_year: orderData.vehicleYear ? parseInt(orderData.vehicleYear.toString()) : null,
          vehicle_make: orderData.vehicleMake,
          vehicle_model: orderData.vehicleModel,
          vehicle_vin: orderData.vehicleVin,
          vehicle_info: orderData.vehicleInfo,
          order_type: 'recon',
          order_number: orderNumberData,
          status: orderData.status || 'pending',
          priority: orderData.priority || 'normal',
          services: services,
          total_amount: orderData.totalAmount || orderData.reconCost,
          notes: orderData.notes,
          internal_notes: orderData.internalNotes,
          dealer_id: dealerIdNumber,
          assigned_contact_id: orderData.assignedContactId && orderData.assignedContactId !== "1" && orderData.assignedContactId !== 1 ? orderData.assignedContactId : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating recon order:', error);
        toast({
          title: t('common.error'),
          description: t('recon.error_creating_order'),
          variant: 'destructive',
        });
        return null;
      }

      const newOrder = transformReconOrder(data);
      setOrders(prev => [newOrder, ...prev]);
      
      // Auto-generate QR code and shortlink
      try {
        await generateQR(data.id, data.order_number, data.dealer_id);
        console.log('QR code and shortlink generated for recon order:', data.order_number);
      } catch (qrError) {
        console.error('Failed to generate QR code:', qrError);
        // Don't fail the order creation if QR generation fails
      }
      
      toast({
        title: t('common.success'),
        description: t('recon.order_created_successfully'),
      });

      return newOrder;
    } catch (error) {
      console.error('Error creating recon order:', error);
      toast({
        title: t('common.error'),
        description: t('recon.error_creating_order'),
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update existing recon order
  const updateOrder = async (orderId: string, orderData: any) => {
    try {
      // Prepare services array with recon-specific data
      const services = [
        ...(orderData.services || []),
        { type: 'acquisition_cost', value: orderData.acquisitionCost },
        { type: 'recon_cost', value: orderData.reconCost },
        { type: 'acquisition_source', value: orderData.acquisitionSource },
        { type: 'condition_grade', value: orderData.conditionGrade },
        { type: 'recon_category', value: orderData.reconCategory },
      ].filter(service => service.value !== undefined && service.value !== null);

      const { data, error } = await supabase
        .from('orders')
        .update({
          customer_name: orderData.stockNumber || 'Recon Vehicle',
          stock_number: orderData.stockNumber,
          vehicle_year: orderData.vehicleYear,
          vehicle_make: orderData.vehicleMake,
          vehicle_model: orderData.vehicleModel,
          vehicle_vin: orderData.vehicleVin,
          vehicle_info: orderData.vehicleInfo,
          status: orderData.status,
          priority: orderData.priority,
          services: services,
          total_amount: orderData.totalAmount || orderData.reconCost,
          notes: orderData.notes,
          internal_notes: orderData.internalNotes,
          assigned_contact_id: orderData.assignedContactId
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating recon order:', error);
        toast({
          title: t('common.error'),
          description: t('recon.error_updating_order'),
          variant: 'destructive',
        });
        return null;
      }

      const updatedOrder = transformReconOrder(data);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));

      toast({
        title: t('common.success'),
        description: t('recon.order_updated_successfully'),
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating recon order:', error);
      toast({
        title: t('common.error'),
        description: t('recon.error_updating_order'),
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete recon order
  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting recon order:', error);
        toast({
          title: t('common.error'),
          description: t('recon.error_deleting_order'),
          variant: 'destructive',
        });
        return false;
      }

      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      toast({
        title: t('common.success'),
        description: t('recon.order_deleted_successfully'),
      });

      return true;
    } catch (error) {
      console.error('Error deleting recon order:', error);
      toast({
        title: t('common.error'),
        description: t('recon.error_deleting_order'),
        variant: 'destructive',
      });
      return false;
    }
  };

  // Load data on mount and tab change
  useEffect(() => {
    refreshData();
  }, []);

  // Real-time subscription for recon orders
  useEffect(() => {
    const channel = supabase
      .channel('recon_orders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: 'order_type=eq.recon'
        },
        async (payload) => {
          console.log('Recon order real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newOrder = transformReconOrder(payload.new as any);
            setOrders(prevOrders => [newOrder, ...prevOrders]);
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = transformReconOrder(payload.new as any);
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

    // Also listen for T2L metrics changes
    const t2lChannel = supabase
      .channel('recon_t2l_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recon_t2l_metrics'
        },
        () => {
          console.log('T2L metrics updated, refreshing data');
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(t2lChannel);
    };
  }, []);

  return {
    orders: filteredOrders,
    tabCounts,
    filters,
    loading,
    refreshData,
    updateFilters,
    createOrder,
    updateOrder,
    deleteOrder
  };
};