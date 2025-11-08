import { OrderFilters } from '@/components/orders/OrderFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { usePermissions } from '@/hooks/usePermissions';
import type { ServiceOrder, ServiceOrderData } from '@/hooks/useServiceOrderManagement';
import { useServiceOrderManagement } from '@/hooks/useServiceOrderManagement';
import { useSearchPersistence, useTabPersistence, useViewModePersistence } from '@/hooks/useTabPersistence';
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { orderEvents } from '@/utils/eventBus';
import { dev, warn } from '@/utils/logger';
import { determineTabForOrder } from '@/utils/orderUtils';
import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

// Direct imports - no lazy loading for maximum speed
import ServiceOrderModal from '@/components/orders/ServiceOrderModal';
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
import { OrderViewErrorBoundary } from '@/components/orders/OrderViewErrorBoundary';
import { OrderViewLoadingFallback } from '@/components/orders/OrderViewLoadingFallback';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';

export default function ServiceOrders() {
  dev('🔵 ServiceOrders component is RENDERING');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  const { hasModulePermission, enhancedUser } = usePermissions();
  const { selectedDealerId } = useDealerFilter();

  // Accessibility: Live region for screen reader announcements
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>('');

  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('service_orders');
  const [viewMode, setViewMode] = useViewModePersistence('service_orders');
  const [searchTerm, setSearchTerm] = useSearchPersistence('service_orders');

  // Non-persistent UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<ServiceOrder | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasProcessedUrlOrder, setHasProcessedUrlOrder] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  const {
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
  } = useServiceOrderManagement(activeFilter, weekOffset);

  // Use custom hook for manual refresh with consistent behavior
  const { handleRefresh, isRefreshing } = useManualRefresh(refreshData);

  // Check if user can create service orders
  const canCreate = hasModulePermission('service_orders', 'create_orders');

  // Hook for status permissions and updates
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

  // Sync searchTerm with useServiceOrderManagement filters
  useEffect(() => {
    updateFilters({ search: searchTerm });
  }, [searchTerm, updateFilters]);

  // Auto-open order modal when URL contains ?order=ID parameter
  useEffect(() => {
    if (orderIdFromUrl && allOrders.length > 0 && !hasProcessedUrlOrder) {
      dev('🎯 [Service] Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in ALL orders (not just filtered by active tab)
      const targetOrder = allOrders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        dev('✅ [Service] Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);

        // Determine the correct tab for this order
        const correctTab = determineTabForOrder(targetOrder);

        // Auto-navigate to the correct tab if not already there
        if (correctTab !== activeFilter) {
          dev('📍 [Service] Auto-navigating to correct tab:', correctTab);
          setActiveFilter(correctTab);
        }

        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        warn('⚠️ [Service] Order not found in orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found', 'Order not found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, allOrders, hasProcessedUrlOrder, activeFilter, setActiveFilter, t, toast]);

  const handleCreateOrder = useCallback(() => {
    if (!canCreate) {
      warn('⚠️ User does not have permission to create service orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    dev('✅ User has permission to create service orders');
    setSelectedOrder(null);
    setShowModal(true);
  }, [canCreate, t, toast]);

  const handleCreateOrderWithDate = useCallback((selectedDate?: Date) => {
    if (!canCreate) {
      warn('⚠️ User does not have permission to create service orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    setSelectedOrder(null);
    // If date is provided from calendar, we could pre-populate the due_date
    // For now, just open the modal
    setShowModal(true);
  }, [canCreate, t, toast]);

  const handleEditOrder = useCallback((order: ServiceOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  }, []);

  const handleViewOrder = useCallback((order: ServiceOrder) => {
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
      toast({
        title: t('orders.deleted_success', 'Order deleted successfully')
      });
    } catch (error) {
      console.error('❌ Delete failed:', error);
      toast({
        variant: 'destructive',
        title: t('orders.delete_error', 'Failed to delete order')
      });
    }
  }, [orderToDelete, deleteOrder, t, toast]);

  const handleSaveOrder = useCallback(async (orderData: ServiceOrderData | ServiceOrderData[]) => {
    try {
      // Check if we received an array of orders (multiple services)
      if (Array.isArray(orderData)) {
        const createdOrders: ServiceOrder[] = [];

        // Create each order sequentially
        for (const singleOrderData of orderData) {
          const newOrder = await createOrder(singleOrderData);
          if (newOrder) {
            createdOrders.push(newOrder);
          }
        }

        // Show success message with order numbers
        const orderNumbers = createdOrders
          .map(o => o.order_number || o.orderNumber)
          .filter(Boolean)
          .join(', ');

        const message = t('orders.multiple_created_successfully', {
          count: createdOrders.length,
          orders: orderNumbers
        }) || `${createdOrders.length} orders created successfully: ${orderNumbers}`;

        toast({
          description: message,
          variant: 'default'
        });
        setLiveRegionMessage(message);
      } else if (selectedOrder) {
        await updateOrder(selectedOrder.id, orderData);
        const message = t('orders.updated_successfully', 'Order updated successfully');
        toast({
          description: message,
          variant: 'default'
        });
        setLiveRegionMessage(message);
      } else {
        await createOrder(orderData);
        const message = t('orders.created_successfully', 'Order created successfully');
        toast({
          description: message,
          variant: 'default'
        });
        setLiveRegionMessage(message);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving order:', error);
      const message = t('orders.save_failed', 'Failed to save order');
      toast({
        description: message,
        variant: 'destructive'
      });
      setLiveRegionMessage(message);
      // Re-throw to let modal handle it
      throw error;
    }
  }, [selectedOrder, updateOrder, createOrder, t, toast]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    // Find the order
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
      console.error('Order not found for status change:', orderId);
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
        orderEvents.emit('orderStatusChanged', { orderId, newStatus, orderType: 'service' });
        orderEvents.emit('orderStatusUpdated', { orderId, newStatus, timestamp: Date.now() });

        // ✅ 4. Show success toast
        const statusLabel = t(`common.status.${newStatus}`, newStatus);
        toast({
          description: t('orders.status_updated_successfully', {
            defaultValue: `Status updated to ${statusLabel}`,
            status: statusLabel
          })
        });

        // ✅ 5. Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['service-orders', 'all', selectedDealerId] });
      } else {
        throw new Error('Status update failed');
      }
    } catch (error) {
      console.error('Status change failed:', error);
      toast({
        variant: 'destructive',
        description: t('orders.status_update_failed', 'Failed to update status')
      });
      throw error;
    }
  }, [allOrders, canUpdateStatus, updateOrderStatus, t, toast, queryClient, selectedDealerId]);

  const handleUpdate = useCallback(async (orderId: string, updates: Partial<ServiceOrder>) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate query cache to trigger silent refetch
      // This is faster than polling and doesn't cause visible reload
      queryClient.invalidateQueries({ queryKey: ['orders', 'service'] });

      // Emit typed event using EventBus
      orderEvents.emit('orderUpdated', { orderId, updates, timestamp: Date.now() });

      // Show success toast
      toast({
        description: t('orders.field_updated_successfully', 'Order updated successfully')
      });
    } catch (error) {
      console.error('Order update failed:', error);
      toast({
        variant: 'destructive',
        description: t('orders.update_failed', 'Failed to update order')
      });
      throw error;
    }
  }, [updateOrder, queryClient, t, toast]);


  const handleCardClick = useCallback((filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'dashboard') {
      setViewMode('kanban');
    }
  }, [setViewMode]);

  // Force table view on mobile (disable kanban and calendar)
  const effectiveViewMode = isMobile ? 'table' : viewMode;

  // NOTE: Filtering is already done in useServiceOrderManagement hook
  // No need to filter again here - hook returns filteredOrders based on search

  return (
    <div className="space-y-6">
        {/* Accessibility: Live region for screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {liveRegionMessage}
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.service_orders')}</h1>
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
              aria-label={t('accessibility.service_orders.refresh_button', 'Refresh service orders')}
              aria-busy={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button
              size="sm"
              onClick={handleCreateOrder}
              disabled={!canCreate}
              title={!canCreate ? t('errors.no_permission_create_order', 'No permission to create orders') : ''}
              aria-label={t('accessibility.service_orders.create_button', 'Create new service order')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('common.new_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <OrderViewErrorBoundary>
          <QuickFilterBar
            activeFilter={activeFilter}
            tabCounts={tabCounts}
            onFilterChange={setActiveFilter}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
            weekOffset={weekOffset}
            onWeekChange={setWeekOffset}
          />
        </OrderViewErrorBoundary>

        {/* Filters */}
        {showFilters && (
          <OrderFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Main Content Area - Direct rendering for maximum speed */}
        <main className="space-y-6" aria-label={t('accessibility.service_orders.main_content', 'Service orders main content')}>
          <OrderViewErrorBoundary>
            {activeFilter === 'dashboard' ? (
              <SmartDashboard
                allOrders={orders}
                tabCounts={tabCounts}
                onCardClick={handleCardClick}
              />
            ) : (
              <div className="space-y-4">
                {/* Responsive Table Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
                  <h2 className="text-2xl sm:text-4xl font-bold text-center sm:text-left tracking-tight">
                    {activeFilter === 'week' ? 'Week' : activeFilter === 'today' ? t('sales_orders.tabs.today') : activeFilter === 'tomorrow' ? t('sales_orders.tabs.tomorrow') : activeFilter === 'pending' ? t('sales_orders.tabs.pending') : activeFilter === 'in_process' ? t('sales_orders.in_process_orders') : activeFilter === 'all' ? t('sales_orders.tabs.all') : activeFilter}
                  </h2>
                  <Badge variant="secondary" className="text-base sm:text-lg font-bold self-center sm:self-auto px-2 sm:px-3 py-1">
                    {orders.length}
                  </Badge>
                </div>

                {/* Search Context */}
                {filters.search && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing results matching "{filters.search}"
                    </p>
                  </div>
                )}

                {/* Table/Kanban/Calendar Content - Mobile forces table */}
                {effectiveViewMode === 'kanban' ? (
                  <OrderKanbanBoard
                    orders={orders}
                    onEdit={handleEditOrder}
                    onView={handleViewOrder}
                    onDelete={handleDeleteOrder}
                    onStatusChange={handleStatusChange}
                  />
                ) : effectiveViewMode === 'calendar' ? (
                  <OrderCalendarView
                    orders={orders}
                    loading={loading}
                    onEdit={handleEditOrder}
                    onView={handleViewOrder}
                    onDelete={handleDeleteOrder}
                    onStatusChange={handleStatusChange}
                    onCreateOrder={handleCreateOrderWithDate}
                  />
                ) : (
                  <OrderDataTable
                    orders={orders}
                    loading={loading}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                    onView={handleViewOrder}
                    tabType="service"
                  />
                )}
              </div>
            )}
          </OrderViewErrorBoundary>
        </main>

        {/* Modals - Direct import for instant open (no lazy loading delay) */}
        {showModal && (
          <OrderViewErrorBoundary>
            <ServiceOrderModal
              order={selectedOrder}
              open={showModal}
              onClose={() => setShowModal(false)}
              onSave={handleSaveOrder}
            />
          </OrderViewErrorBoundary>
        )}

        {/* Detail Modal - Unified Full Screen (instant open) */}
        {previewOrder && (
          <OrderViewErrorBoundary>
            <UnifiedOrderDetailModal
              orderType="service"
              order={previewOrder}
              open={true}
              onClose={() => {
                setPreviewOrder(null);
                // If we came from URL parameter, redirect to clean /service to avoid loop
                if (orderIdFromUrl) {
                  navigate('/service', { replace: true });
                }
              }}
              onEdit={handleEditOrder}
              onDelete={handleDeleteOrder}
              onStatusChange={handleStatusChange}
              onUpdate={handleUpdate}
            />
          </OrderViewErrorBoundary>
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
  );
}
