import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

// Order interface compatible with Service Orders
export interface ServiceOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleInfo?: string;
  po?: string;          // Purchase Order - Service specific
  ro?: string;          // Repair Order - Service specific  
  tag?: string;         // Service Tag - Service specific
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
  salesperson?: string;
  assignedContactId?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  createdByGroupId?: string;
  assignedGroupId?: string;
}

interface ServiceOrderFilters {
  search: string;
  status: string;
  make: string;
  model: string;
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
}

// Transform Supabase order to ServiceOrder interface
const transformServiceOrder = (supabaseOrder: any): ServiceOrder => ({
  id: supabaseOrder.id,
  orderNumber: supabaseOrder.order_number || supabaseOrder.custom_order_number,
  customerName: supabaseOrder.customer_name,
  customerEmail: supabaseOrder.customer_email,
  customerPhone: supabaseOrder.customer_phone,
  vehicleYear: supabaseOrder.vehicle_year,
  vehicleMake: supabaseOrder.vehicle_make,
  vehicleModel: supabaseOrder.vehicle_model,
  vehicleVin: supabaseOrder.vehicle_vin,
  vehicleInfo: supabaseOrder.vehicle_info,
  po: supabaseOrder.po,
  ro: supabaseOrder.ro,
  tag: supabaseOrder.tag,
  orderType: supabaseOrder.order_type || 'service',
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
  salesperson: supabaseOrder.salesperson,
  assignedContactId: supabaseOrder.assigned_contact_id,
  statusChangedAt: supabaseOrder.status_changed_at,
  statusChangedBy: supabaseOrder.status_changed_by,
  createdByGroupId: supabaseOrder.created_by_group_id,
  assignedGroupId: supabaseOrder.assigned_group_id,
});

export const useServiceOrderManagement = (activeTab: string = 'all') => {
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ServiceOrderFilters>({
    search: '',
    status: 'all',
    make: 'all',
    model: 'all',
    dateRange: {}
  });

  const { toast } = useToast();
  const { t } = useTranslation();

  // Calculate tab counts
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
      default:
        // 'all' - no additional filtering
        break;
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.customerName.toLowerCase().includes(searchLower) ||
        order.vehicleVin?.toLowerCase().includes(searchLower) ||
        order.vehicleMake?.toLowerCase().includes(searchLower) ||
        order.vehicleModel?.toLowerCase().includes(searchLower) ||
        order.po?.toLowerCase().includes(searchLower) ||
        order.ro?.toLowerCase().includes(searchLower) ||
        order.tag?.toLowerCase().includes(searchLower)
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

  // Fetch service orders from Supabase
  const refreshData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_type', 'service')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching service orders:', error);
        toast({
          title: t('common.error'),
          description: t('service.error_fetching_orders'),
          variant: 'destructive',
        });
        return;
      }

      const transformedOrders = data.map(transformServiceOrder);
      setOrders(transformedOrders);
    } catch (error) {
      console.error('Error fetching service orders:', error);
      toast({
        title: t('common.error'),
        description: t('service.error_fetching_orders'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Update filters
  const updateFilters = (newFilters: Partial<ServiceOrderFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Create new service order
  const createOrder = async (orderData: any) => {
    try {
      console.log('Creating service order with data:', orderData);

      // Validate dealerId before conversion
      if (!orderData.dealerId) {
        throw new Error('Dealership ID is required');
      }

      const dealerIdNumber = parseInt(orderData.dealerId.toString());
      if (isNaN(dealerIdNumber)) {
        throw new Error('Invalid dealership ID');
      }

      const { data, error } = await supabase
        .from('orders')
        .insert({
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
          order_number: `SV-${Math.floor(Math.random() * 90000) + 10000}`, // Generate 5-digit number like SV-12345
          status: orderData.status,
          priority: orderData.priority || 'normal',
          services: orderData.services || [],
          total_amount: orderData.totalAmount,
          notes: orderData.notes,
          internal_notes: orderData.internalNotes,
          due_date: orderData.dueDate,
          dealer_id: dealerIdNumber,
          assigned_contact_id: orderData.assignedContactId && orderData.assignedContactId !== "1" && orderData.assignedContactId !== 1 ? orderData.assignedContactId : null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating service order:', error);
        toast({
          title: t('common.error'),
          description: t('service.error_creating_order'),
          variant: 'destructive',
        });
        return null;
      }

      const newOrder = transformServiceOrder(data);
      setOrders(prev => [newOrder, ...prev]);
      
      toast({
        title: t('common.success'),
        description: t('service.order_created_successfully'),
      });

      return newOrder;
    } catch (error) {
      console.error('Error creating service order:', error);
      toast({
        title: t('common.error'),
        description: t('service.error_creating_order'),
        variant: 'destructive',
      });
      return null;
    }
  };

  // Update existing service order
  const updateOrder = async (orderId: string, orderData: any) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({
          customer_name: orderData.customerName,
          customer_email: orderData.customerEmail,
          customer_phone: orderData.customerPhone,
          vehicle_year: orderData.vehicleYear,
          vehicle_make: orderData.vehicleMake,
          vehicle_model: orderData.vehicleModel,
          vehicle_vin: orderData.vehicleVin,
          vehicle_info: orderData.vehicleInfo,
          po: orderData.po,
          ro: orderData.ro,
          tag: orderData.tag,
          status: orderData.status,
          priority: orderData.priority,
          services: orderData.services || [],
          total_amount: orderData.totalAmount,
          notes: orderData.notes,
          internal_notes: orderData.internalNotes,
          due_date: orderData.dueDate,
          assigned_contact_id: orderData.assignedContactId
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) {
        console.error('Error updating service order:', error);
        toast({
          title: t('common.error'),
          description: t('service.error_updating_order'),
          variant: 'destructive',
        });
        return null;
      }

      const updatedOrder = transformServiceOrder(data);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? updatedOrder : order
      ));

      toast({
        title: t('common.success'),
        description: t('service.order_updated_successfully'),
      });

      return updatedOrder;
    } catch (error) {
      console.error('Error updating service order:', error);
      toast({
        title: t('common.error'),
        description: t('service.error_updating_order'),
        variant: 'destructive',
      });
      return null;
    }
  };

  // Delete service order
  const deleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) {
        console.error('Error deleting service order:', error);
        toast({
          title: t('common.error'),
          description: t('service.error_deleting_order'),
          variant: 'destructive',
        });
        return false;
      }

      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      toast({
        title: t('common.success'),
        description: t('service.order_deleted_successfully'),
      });

      return true;
    } catch (error) {
      console.error('Error deleting service order:', error);
      toast({
        title: t('common.error'),
        description: t('service.error_deleting_order'),
        variant: 'destructive',
      });
      return false;
    }
  };

  // Load data on mount and tab change
  useEffect(() => {
    refreshData();
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