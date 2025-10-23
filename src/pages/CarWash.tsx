import CarWashOrderModal from '@/components/orders/CarWashOrderModal';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { Button } from '@/components/ui/button';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useToast } from '@/hooks/use-toast';
import { useCarWashOrderManagement } from '@/hooks/useCarWashOrderManagement';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { usePermissions } from '@/hooks/usePermissions';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { getSystemTimezone } from '@/utils/dateUtils';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function CarWash() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  const { hasModulePermission, enhancedUser } = usePermissions();

  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('car_wash');

  // Non-persistent UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasProcessedUrlOrder, setHasProcessedUrlOrder] = useState(false);

  const {
    orders: allOrders,
    loading,
    lastRefresh,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  } = useCarWashOrderManagement();

  // Use custom hook for manual refresh with consistent behavior
  const { handleRefresh, isRefreshing } = useManualRefresh(refreshData);

  // Check if user can create car wash orders
  const canCreate = hasModulePermission('car_wash', 'create');

  // Real-time updates are handled by useCarWashOrderManagement hook

  // Reset week offset when changing to a different filter
  useEffect(() => {
    if (activeFilter !== 'week') {
      setWeekOffset(0);
    }
  }, [activeFilter]);

  // Auto-open order modal when URL contains ?order=ID parameter
  useEffect(() => {
    if (orderIdFromUrl && allOrders.length > 0 && !hasProcessedUrlOrder) {
      console.log('🎯 [CarWash] Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in the loaded orders
      const targetOrder = allOrders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        console.log('✅ [CarWash] Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);
        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        console.warn('⚠️ [CarWash] Order not found in current orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, allOrders, hasProcessedUrlOrder, t]);

  // Helper function to get dates in system timezone for filtering
  const getSystemTimezoneDates = useMemo(() => (offset: number = 0) => {
    const timezone = getSystemTimezone();
    const now = new Date();

    // Get current date in system timezone and normalize to start of day
    const todayInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    todayInTimezone.setHours(0, 0, 0, 0);

    // Tomorrow in system timezone
    const tomorrowInTimezone = new Date(todayInTimezone);
    tomorrowInTimezone.setDate(tomorrowInTimezone.getDate() + 1);

    // Calculate week range based on offset
    const weekStart = new Date(todayInTimezone);
    const dayOfWeek = weekStart.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(weekStart.getDate() + daysToMonday + (offset * 7));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      today: todayInTimezone,
      tomorrow: tomorrowInTimezone,
      weekStart,
      weekEnd,
      timezone
    };
  }, []);

  // Calculate tab counts from all orders (excluding tomorrow for Car Wash)
  const tabCounts = useMemo(() => {
    const { today, weekStart, weekEnd } = getSystemTimezoneDates(weekOffset);

    return {
      today: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.completedAt || order.createdAt);
        return orderDate.toDateString() === today.toDateString();
      }).length,
      pending: allOrders.filter(order => order.status === 'pending').length,
      in_process: allOrders.filter(order => order.status === 'in_progress').length,
      week: allOrders.filter(order => {
        const orderDate = new Date(order.dueDate || order.completedAt || order.createdAt);
        const orderDateNormalized = new Date(orderDate);
        orderDateNormalized.setHours(0, 0, 0, 0);
        return orderDateNormalized >= weekStart && orderDateNormalized <= weekEnd;
      }).length,
    };
  }, [allOrders, weekOffset, getSystemTimezoneDates]);

  // Filter orders based on active filter and week offset (excluding tomorrow for Car Wash)
  const filteredOrdersByTab = useMemo(() => {
    if (activeFilter === 'dashboard' || activeFilter === 'all') {
      return allOrders;
    }

    const { today, weekStart, weekEnd } = getSystemTimezoneDates(weekOffset);

    switch (activeFilter) {
      case 'today':
        return allOrders.filter(order => {
          const orderDate = new Date(order.dueDate || order.completedAt || order.createdAt);
          return orderDate.toDateString() === today.toDateString();
        });
      case 'pending':
        return allOrders.filter(order => order.status === 'pending');
      case 'in_process':
        return allOrders.filter(order => order.status === 'in_progress');
      case 'week':
        return allOrders.filter(order => {
          const orderDate = new Date(order.dueDate || order.completedAt || order.createdAt);
          const orderDateNormalized = new Date(orderDate);
          orderDateNormalized.setHours(0, 0, 0, 0);
          return orderDateNormalized >= weekStart && orderDateNormalized <= weekEnd;
        });
      default:
        return allOrders;
    }
  }, [allOrders, activeFilter, weekOffset, getSystemTimezoneDates]);

  const handleCreateOrder = () => {
    if (!canCreate) {
      console.warn('⚠️ User does not have permission to create car wash orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ User has permission to create car wash orders');
    setSelectedOrder(null);
    setShowModal(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  };

  const handleViewOrder = (order: any) => {
    setPreviewOrder(order);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm(t('messages.confirm_delete_order'))) {
      await deleteOrder(orderId);
    }
  };

  const handleSaveOrder = async (orderData: any) => {
    console.log('🎯 [CarWash] handleSaveOrder called with:', {
      hasSelectedOrder: !!selectedOrder,
      selectedOrderId: selectedOrder?.id,
      orderData: orderData,
      completedAt: orderData.completedAt,
      tag: orderData.tag,
      isWaiter: orderData.isWaiter,
      services: orderData.services
    });

    try {
      if (selectedOrder) {
        console.log('📝 [CarWash] Calling updateOrder...');
        await updateOrder(selectedOrder.id, orderData);
        console.log('✅ [CarWash] updateOrder completed');
      } else {
        console.log('➕ [CarWash] Calling createOrder...');
        await createOrder(orderData);
        console.log('✅ [CarWash] createOrder completed');
      }
      setShowModal(false);
      refreshData();
    } catch (error) {
      console.error('❌ [CarWash] Error in handleSaveOrder:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // NOTE: OrderDataTable already handles the DB update via updateOrderStatus
    // This callback is just for showing toast and dispatching events
    console.log('✅ [CarWash] Status change callback:', { orderId, newStatus });

    // Show success toast
    toast({
      description: t('orders.status_updated_successfully'),
      variant: 'default'
    });

    // Dispatch event to notify other components (already done by OrderDataTable but doesn't hurt)
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
      detail: { orderId, newStatus, timestamp: Date.now() }
    }));
  };

  const handleUpdate = async (orderId: string, updates: any) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate query cache to trigger silent refetch
      // This is faster than polling and doesn't cause visible reload
      queryClient.invalidateQueries({ queryKey: ['orders', 'car_wash'] });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: { orderId, updates, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Order update failed:', error);
      throw error;
    }
  };


  // Filter orders based on search term (after tab filtering)
  const filteredOrders = filteredOrdersByTab.filter((order: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.vehicleVin?.toLowerCase().includes(searchLower) ||
      order.stockNumber?.toLowerCase().includes(searchLower) ||
      order.tag?.toLowerCase().includes(searchLower) ||
      `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.car_wash')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <LiveTimer
              lastRefresh={lastRefresh}
              isRefreshing={isRefreshing}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateOrder}
              disabled={!canCreate}
              title={!canCreate ? t('errors.no_permission_create_order', 'No permission to create orders') : ''}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('car_wash_orders.quick_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar - Table view only for Car Wash */}
        <QuickFilterBar
          activeFilter={activeFilter}
          tabCounts={tabCounts}
          onFilterChange={setActiveFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
        />

        {/* Main Content - Table View Only */}
        <div className="space-y-6">
          <OrderDataTable
            orders={filteredOrders}
            loading={loading}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onView={handleViewOrder}
            onStatusChange={handleStatusChange}
            tabType="carwash"
          />
        </div>

        {/* Modals */}
        {showModal && (
          <CarWashOrderModal
            order={selectedOrder}
            open={showModal}
            onClose={() => setShowModal(false)}
            onSave={handleSaveOrder}
          />
        )}

        {/* Detail Modal - Enhanced Full Screen */}
        {previewOrder && (
          <UnifiedOrderDetailModal
            orderType="carwash"
            order={previewOrder}
            open={true}
            onClose={() => {
              setPreviewOrder(null);
              // If we came from URL parameter, redirect to clean /carwash to avoid loop
              if (orderIdFromUrl) {
                navigate('/carwash', { replace: true });
              }
            }}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
          />
        )}
      </div>
    </>
  );
}
