import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useToast } from '@/hooks/use-toast';
import { useCarWashOrderManagement, type CarWashOrder, type CarWashOrderData } from '@/hooks/useCarWashOrderManagement';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { usePermissions } from '@/hooks/usePermissions';
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { useTabPersistence } from '@/hooks/useTabPersistence';
import { getSystemTimezone } from '@/utils/dateUtils';
import { orderEvents } from '@/utils/eventBus';
import { generateOrderListPDF } from '@/utils/generateOrderListPDF';
import { determineTabForOrder } from '@/utils/orderUtils';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Always-loaded components (small, critical)
import { OrderViewErrorBoundary } from '@/components/orders/OrderViewErrorBoundary';
import { OrderViewLoadingFallback } from '@/components/orders/OrderViewLoadingFallback';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Code-split heavy view components (40-60KB initial bundle reduction)
const OrderDataTable = lazy(() => import('@/components/orders/OrderDataTable').then(module => ({ default: module.OrderDataTable })));
// ⚡ PERF: Modal imported directly (not lazy) for instant open - enterprise UX over bundle size
import CarWashOrderModal from '@/components/orders/CarWashOrderModal';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Accessibility: Live region for screen reader announcements
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>('');

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
  const canCreate = hasModulePermission('car_wash', 'create_orders');
  // System admins and supermanagers can always export
  const canExport = enhancedUser?.is_system_admin || enhancedUser?.is_supermanager || hasModulePermission('car_wash', 'export_data');

  // Hook for status permissions and updates
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

  // ⚡ PERF: Modal is now imported directly (not lazy) - no preload needed

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
      // Find the order in ALL orders (not just filtered by active tab)
      const targetOrder = allOrders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        // Determine the correct tab for this order
        const correctTab = determineTabForOrder(targetOrder);

        // Auto-navigate to the correct tab if not already there
        if (correctTab !== activeFilter) {
          setActiveFilter(correctTab);
        }

        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, allOrders, hasProcessedUrlOrder, activeFilter, setActiveFilter, t, toast]);

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

  const handleCreateOrder = useCallback(() => {
    if (!canCreate) {
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    setSelectedOrder(null);
    setShowModal(true);
  }, [canCreate, t, toast]);

  const handleEditOrder = useCallback((order: CarWashOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  }, []);

  const handleViewOrder = useCallback((order: CarWashOrder) => {
    setPreviewOrder(order);
  }, []);

  const handleDeleteOrder = useCallback((orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDeleteOrder = useCallback(async () => {
    if (!orderToDelete) return;

    try {
      await deleteOrder(orderToDelete);
      setOrderToDelete(null);
      // Accessibility: Announce deletion to screen readers
      setLiveRegionMessage(t('accessibility.car_wash_orders.order_deleted'));
      toast({
        title: t('orders.deleted_success', 'Order deleted successfully')
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('orders.delete_error', 'Failed to delete order')
      });
    }
  }, [orderToDelete, deleteOrder, t, toast, setLiveRegionMessage]);

  const handleSaveOrder = useCallback(async (orderData: CarWashOrderData) => {
    try {
      if (selectedOrder) {
        await updateOrder(selectedOrder.id, orderData);
        // Accessibility: Announce update to screen readers
        setLiveRegionMessage(t('accessibility.car_wash_orders.order_updated'));
      } else {
        await createOrder(orderData);
        // Accessibility: Announce creation to screen readers
        setLiveRegionMessage(t('accessibility.car_wash_orders.order_created'));
      }
      setShowModal(false);
      refreshData();
    } catch (error) {
      // Re-throw to let modal handle it
      throw error;
    }
  }, [selectedOrder, updateOrder, createOrder, refreshData, t]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    // Find the order
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
      toast({
        description: t('orders.order_not_found'),
        variant: 'destructive'
      });
      return;
    }

    try {
      // ✅ 1. Validate permissions before updating
      const allowed = await canUpdateStatus(
        order.dealer_id?.toString() || '',
        order.status || '',
        newStatus,
        order.order_type
      );

      if (!allowed) {
        toast({
          description: t('errors.no_permission_status_change', 'You do not have permission to change this status'),
          variant: 'destructive'
        });
        return;
      }

      // ✅ 2. Update database (handles SMS, push notifications, etc.)
      const success = await updateOrderStatus(
        orderId,
        newStatus,
        order.dealer_id?.toString() || ''
      );

      if (success) {
        // ✅ 3. Emit events for real-time updates
        orderEvents.emit('orderStatusUpdated', { orderId, newStatus, timestamp: Date.now() });

        // ✅ 4. Show success toast
        toast({
          description: t('orders.status_updated_successfully'),
          variant: 'default'
        });

        // ✅ 5. Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['orders', 'car_wash'] });
      } else {
        throw new Error('Status update failed');
      }
    } catch (error) {
      toast({
        description: t('orders.status_change_failed'),
        variant: 'destructive'
      });
      throw error;
    }
  }, [allOrders, canUpdateStatus, updateOrderStatus, t, toast, queryClient]);

  const handleUpdate = useCallback(async (orderId: string, updates: Partial<CarWashOrderData>) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate query cache to trigger silent refetch
      // This is faster than polling and doesn't cause visible reload
      queryClient.invalidateQueries({ queryKey: ['orders', 'car_wash'] });

      // Emit typed event using EventBus
      orderEvents.emit('orderUpdated', { orderId, updates, timestamp: Date.now() });
    } catch (error) {
      throw error;
    }
  }, [updateOrder, queryClient]);

  // Get dynamic title based on active filter
  const getFilterTitle = (filter: string): string => {
    const titleMap: Record<string, string> = {
      dashboard: t('sales_orders.tabs.dashboard'),
      today: t('sales_orders.tabs.today'),
      tomorrow: t('sales_orders.tabs.tomorrow'),
      pending: t('sales_orders.tabs.pending'),
      in_process: t('sales_orders.in_process_orders'),
      week: t('sales_orders.tabs.week'),
      all: t('sales_orders.tabs.all'),
      deleted: t('sales_orders.tabs.deleted')
    };
    return titleMap[filter] || filter;
  };

  // Filter orders based on search term (after tab filtering)
  const filteredOrders = useMemo(() => {
    return filteredOrdersByTab.filter((order: CarWashOrder) => {
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
  }, [filteredOrdersByTab, searchTerm]);

  // Handle print list
  const handlePrintList = useCallback(async () => {
    if (filteredOrders.length === 0) {
      toast({
        variant: 'destructive',
        description: t('common.action_buttons.print_failed') + ': No orders to print'
      });
      return;
    }

    try {
      setIsPrinting(true);

      await generateOrderListPDF({
        orders: filteredOrders,
        orderType: 'carwash',
        filterLabel: getFilterTitle(activeFilter),
        dealershipName: filteredOrders[0]?.dealershipName || 'Dealership',
        searchTerm: searchTerm || undefined
      });

      toast({
        description: t('common.action_buttons.print_success')
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: t('common.action_buttons.print_failed')
      });
    } finally {
      setIsPrinting(false);
    }
  }, [filteredOrders, activeFilter, searchTerm, t, toast]);

  return (
    <>
      <div className="space-y-6">
        {/* Accessibility: Live region for screen reader announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveRegionMessage}
        </div>

        {/* Header Actions */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('pages.car_wash')}</h1>
            <div className="flex items-center gap-2 sm:gap-3">
              <LiveTimer
                lastRefresh={lastRefresh}
                isRefreshing={isRefreshing}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                aria-label={t('accessibility.car_wash_orders.refresh_button')}
                aria-busy={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} sm:mr-2`} />
                <span className="hidden sm:inline">{t('common.refresh')}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleCreateOrder}
                disabled={!canCreate}
                title={!canCreate ? t('errors.no_permission_create_order', 'No permission to create orders') : ''}
                aria-label={t('accessibility.car_wash_orders.create_button')}
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('car_wash_orders.quick_order')}</span>
              </Button>
            </div>
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
          onPrintList={canExport ? handlePrintList : undefined}
          isPrinting={isPrinting}
        />

        {/* Main Content - Code Split with Suspense and Error Boundaries */}
        <main aria-label={t('accessibility.car_wash_orders.main_content')} className="space-y-6">
          <div className="space-y-4">
            {/* Responsive Table Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
              <h2 className="text-2xl sm:text-4xl font-bold text-center sm:text-left tracking-tight">
                {activeFilter === 'week' ? 'Week' : activeFilter === 'today' ? t('sales_orders.tabs.today') : activeFilter === 'pending' ? t('sales_orders.tabs.pending') : activeFilter === 'in_process' ? t('sales_orders.in_process_orders') : activeFilter === 'all' ? t('sales_orders.tabs.all') : activeFilter}
              </h2>
              <Badge variant="secondary" className="text-base sm:text-lg font-bold self-center sm:self-auto px-2 sm:px-3 py-1">
                {filteredOrders.length}
              </Badge>
            </div>

            {/* Search Context */}
            {searchTerm && (
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {t('car_wash_orders.search.showing_results', { searchTerm })}
                </p>
              </div>
            )}

          <OrderViewErrorBoundary viewType="table">
            <Suspense fallback={<OrderViewLoadingFallback viewType="table" />}>
              <OrderDataTable
                orders={filteredOrders}
                loading={loading}
                onEdit={handleEditOrder}
                onDelete={handleDeleteOrder}
                onView={handleViewOrder}
                onStatusChange={handleStatusChange}
                tabType="carwash"
              />
            </Suspense>
          </OrderViewErrorBoundary>
          </div>
        </main>

        {/* Modals - Direct Import for Instant Open */}
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

        {/* Delete Confirmation Dialog - Team Chat Style */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('orders.confirm_delete_title', 'Delete Order?')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('orders.confirm_delete', 'Are you sure you want to delete this order? This action cannot be undone.')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteOrder}
                className="bg-destructive hover:bg-destructive/90"
              >
                {t('common.delete', 'Delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
