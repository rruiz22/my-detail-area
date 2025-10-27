import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { usePermissions } from '@/hooks/usePermissions';
import type { ReconOrder, ReconOrderData } from "@/hooks/useReconOrderManagement";
import { useReconOrderManagement } from '@/hooks/useReconOrderManagement';
import { useTabPersistence, useViewModePersistence } from '@/hooks/useTabPersistence';
import { getSystemTimezone } from '@/utils/dateUtils';
import { orderEvents } from '@/utils/eventBus';
import logger from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

// Always-loaded components (small, critical)
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { OrderViewLoadingFallback } from '@/components/orders/OrderViewLoadingFallback';
import { OrderViewErrorBoundary } from '@/components/orders/OrderViewErrorBoundary';

// Code-split heavy view components (40-60KB initial bundle reduction)
const OrderDataTable = lazy(() => import('@/components/orders/OrderDataTable').then(module => ({ default: module.OrderDataTable })));
const OrderKanbanBoard = lazy(() => import('@/components/sales/OrderKanbanBoard').then(module => ({ default: module.OrderKanbanBoard })));
const OrderCalendarView = lazy(() => import('@/components/orders/OrderCalendarView').then(module => ({ default: module.OrderCalendarView })));
const ReconOrderModal = lazy(() => import('@/components/orders/ReconOrderModal').then(module => ({ default: module.ReconOrderModal })));

export default function ReconOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  const { hasModulePermission, enhancedUser } = usePermissions();

  // Persistent state
  const [viewMode, setViewMode] = useViewModePersistence('recon_orders');
  const [activeFilter, setActiveFilter] = useTabPersistence('recon_orders');

  // Non-persistent UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReconOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<ReconOrder | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasProcessedUrlOrder, setHasProcessedUrlOrder] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

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
  } = useReconOrderManagement();

  // Use custom hook for manual refresh with consistent behavior
  const { handleRefresh, isRefreshing } = useManualRefresh(refreshData);

  // Check if user can create recon orders
  const canCreate = hasModulePermission('recon_orders', 'create');

  // Reset week offset when changing to a different filter
  useEffect(() => {
    if (activeFilter !== 'week') {
      setWeekOffset(0);
    }
  }, [activeFilter]);

  // Auto-open order modal when URL contains ?order=ID parameter
  useEffect(() => {
    if (orderIdFromUrl && allOrders.length > 0 && !hasProcessedUrlOrder) {
      logger.dev('🎯 [Recon] Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in the loaded orders
      const targetOrder = allOrders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        logger.success('[Recon] Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);
        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        logger.warn('[Recon] Order not found in current orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, allOrders, hasProcessedUrlOrder, t, toast]);

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

  // Calculate tab counts from all orders (excluding tomorrow for Recon)
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

  // Filter orders based on active filter and week offset (excluding tomorrow for Recon)
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
      logger.warn('[Recon] User does not have permission to create recon orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    logger.success('[Recon] User has permission to create recon orders');
    setSelectedOrder(null);
    setShowModal(true);
  }, [canCreate, t, toast]);

  const handleCreateOrderWithDate = useCallback((selectedDate?: Date) => {
    if (!canCreate) {
      logger.warn('[Recon] User does not have permission to create recon orders');
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

  const handleEditOrder = useCallback((order: ReconOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  }, []);

  const handleViewOrder = useCallback((order: ReconOrder) => {
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
      setLiveRegionMessage(t('accessibility.recon_orders.order_deleted'));
      toast({
        title: t('orders.deleted_success', 'Order deleted successfully')
      });
    } catch (error) {
      logger.error('[Recon] Delete failed:', error);
      toast({
        variant: 'destructive',
        title: t('orders.delete_error', 'Failed to delete order')
      });
    }
  }, [orderToDelete, deleteOrder, t, toast]);

  const handleSaveOrder = useCallback(async (orderData: ReconOrderData) => {
    logger.dev('[Recon] handleSaveOrder called with:', {
      hasSelectedOrder: !!selectedOrder,
      selectedOrderId: selectedOrder?.id,
      orderData: orderData,
      completedAt: orderData.completedAt,
      completedAtType: typeof orderData.completedAt,
      stockNumber: orderData.stockNumber,
      services: orderData.services
    });

    try {
      if (selectedOrder) {
        logger.dev('[Recon] Calling updateOrder with:', {
          orderId: selectedOrder.id,
          orderData: orderData
        });
        await updateOrder(selectedOrder.id, orderData);
        logger.success('[Recon] updateOrder completed successfully');
        // Accessibility: Announce update to screen readers
        setLiveRegionMessage(t('accessibility.recon_orders.order_updated'));
      } else {
        logger.dev('[Recon] Calling createOrder with:', {
          orderData: orderData
        });
        await createOrder(orderData);
        logger.success('[Recon] createOrder completed successfully');
        // Accessibility: Announce creation to screen readers
        setLiveRegionMessage(t('accessibility.recon_orders.order_created'));
      }
      setShowModal(false);
      refreshData();
    } catch (error) {
      logger.error('[Recon] Error in handleSaveOrder:', error);
      // Re-throw to let modal handle it
      throw error;
    }
  }, [selectedOrder, updateOrder, createOrder, refreshData, t]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });

      // Emit typed events using EventBus
      orderEvents.emit('orderStatusChanged', { orderId, newStatus, orderType: 'recon' });
      orderEvents.emit('orderStatusUpdated', { orderId, newStatus, timestamp: Date.now() });

      // Event listener in hook will handle immediate refresh
    } catch (error) {
      logger.error('[Recon] Status change failed:', error);
      // Event listener will handle refresh
      throw error;
    }
  }, [updateOrder]);

  const handleUpdate = useCallback(async (orderId: string, updates: Partial<ReconOrder>) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate query cache to trigger silent refetch
      // This is faster than polling and doesn't cause visible reload
      queryClient.invalidateQueries({ queryKey: ['orders', 'recon'] });

      // Emit typed event using EventBus
      orderEvents.emit('orderUpdated', { orderId, updates, timestamp: Date.now() });
    } catch (error) {
      logger.error('[Recon] Order update failed:', error);
      throw error;
    }
  }, [updateOrder, queryClient]);


  // Force table view on mobile (disable kanban and calendar)
  const effectiveViewMode = isMobile ? 'table' : viewMode;

  // Transform ReconOrder to Order format for compatibility with OrderKanbanBoard/OrderDataTable
  // Memoized to prevent recalculation on every render
  const transformedOrders = useMemo(() => filteredOrdersByTab.map(order => {
    return {
      id: order.id,
      order_number: order.orderNumber,
      customer_name: t('recon_defaults.default_customer'),
      customerName: t('recon_defaults.default_customer'),
      dealershipName: order.dealershipName || 'Unknown Dealer',
      dealer_id: order.dealerId,
      // Vehicle fields - camelCase for OrderDataTable
      vehicleYear: order.vehicleYear,
      vehicleMake: order.vehicleMake,
      vehicleModel: order.vehicleModel,
      vehicleVin: order.vehicleVin,
      vehicleInfo: order.vehicleInfo,
      // Also snake_case for compatibility
      vehicle_year: order.vehicleYear,
      vehicle_make: order.vehicleMake,
      vehicle_model: order.vehicleModel,
      vehicle_vin: order.vehicleVin,
      vehicle_info: order.vehicleInfo,
      // Stock fields
      stock: order.stockNumber,
      stockNumber: order.stockNumber,
      stock_number: order.stockNumber,
      // Legacy aliases
      vin: order.vehicleVin || '',
      year: order.vehicleYear || 0,
      make: order.vehicleMake || '',
      model: order.vehicleModel || '',
      status: order.status,
      services: order.services || [],
      total_amount: order.totalAmount,
      totalAmount: order.totalAmount,
      created_at: order.createdAt,
      createdAt: order.createdAt,
      updated_at: order.updatedAt,
      updatedAt: order.updatedAt,
      due_date: order.dueDate,
      dueDate: order.dueDate,
      completed_at: order.completedAt,
      completedAt: order.completedAt,
      priority: order.priority || 'normal',
      assignedTo: order.assignedTo,
      // Recon specific fields
      condition_grade: order.conditionGrade,
      recon_category: order.reconCategory,
      // Required fields for Order interface
      service: t('recon_defaults.default_service'),
      description: `${t('recon_defaults.default_service')} - ${order.reconCategory || t('common.general')}`,
      price: order.reconCost || 0,
      advisor: t('recon_defaults.default_advisor'),
      department: t('recon_defaults.default_department')
    };
  }), [filteredOrdersByTab, t]);

  // Filter orders based on search term
  const filteredOrders = transformedOrders.filter((order) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.vehicle_vin?.toLowerCase().includes(searchLower) ||
      order.stock?.toLowerCase().includes(searchLower) ||
      order.order_number?.toLowerCase().includes(searchLower) ||
      `${order.vehicle_year} ${order.vehicle_make} ${order.vehicle_model}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
        {/* Accessibility: Live region for screen reader announcements */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {liveRegionMessage}
        </div>

        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.recon_orders')}</h1>
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
              aria-label={t('accessibility.recon_orders.refresh_button')}
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
              aria-label={t('accessibility.recon_orders.create_button')}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('recon.new_recon_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar */}
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

        {/* Main Content - Code Split with Suspense and Error Boundaries */}
        <main aria-label={t('accessibility.recon_orders.main_content')} className="space-y-6">
          {effectiveViewMode === 'kanban' ? (
            <OrderViewErrorBoundary viewType="kanban">
              <Suspense fallback={<OrderViewLoadingFallback viewType="kanban" />}>
                <OrderKanbanBoard
                  orders={filteredOrders}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                />
              </Suspense>
            </OrderViewErrorBoundary>
          ) : effectiveViewMode === 'calendar' ? (
            <OrderViewErrorBoundary viewType="calendar">
              <Suspense fallback={<OrderViewLoadingFallback viewType="calendar" />}>
                <OrderCalendarView
                  orders={filteredOrders}
                  loading={loading}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                  onCreateOrder={handleCreateOrderWithDate}
                />
              </Suspense>
            </OrderViewErrorBoundary>
          ) : (
            <OrderViewErrorBoundary viewType="table">
              <Suspense fallback={<OrderViewLoadingFallback viewType="table" />}>
                <OrderDataTable
                  orders={filteredOrders}
                  loading={loading}
                  onEdit={handleEditOrder}
                  onDelete={handleDeleteOrder}
                  onView={handleViewOrder}
                  onStatusChange={handleStatusChange}
                  tabType="recon"
                />
              </Suspense>
            </OrderViewErrorBoundary>
          )}
        </main>

        {/* Modals - Code Split */}
        {showModal && (
          <Suspense fallback={<OrderViewLoadingFallback viewType="modal" />}>
            <ReconOrderModal
              open={showModal}
              onClose={() => setShowModal(false)}
              onSave={handleSaveOrder}
              order={selectedOrder}
              mode={selectedOrder ? 'edit' : 'create'}
            />
          </Suspense>
        )}

        {/* Detail Modal - Enhanced Full Screen */}
        {previewOrder && (
          <UnifiedOrderDetailModal
            orderType="recon"
            order={previewOrder}
            open={true}
            onClose={() => {
              setPreviewOrder(null);
              // If we came from URL parameter, redirect to clean /recon to avoid loop
              if (orderIdFromUrl) {
                navigate('/recon', { replace: true });
              }
            }}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
          />
        )}

        {/* Delete Confirmation Dialog - Team Chat Style */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title={t('orders.confirm_delete_title', 'Delete Order?')}
          description={t('orders.confirm_delete', 'Are you sure you want to delete this order? This action cannot be undone.')}
          confirmText={t('common.delete', 'Delete')}
          cancelText={t('common.cancel', 'Cancel')}
          onConfirm={confirmDeleteOrder}
          variant="destructive"
        />
    </div>
  );
}
