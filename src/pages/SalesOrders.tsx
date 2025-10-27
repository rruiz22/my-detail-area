import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderModal } from '@/components/orders/OrderModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { Order, useOrderManagement } from '@/hooks/useOrderManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { useSearchPersistence, useTabPersistence, useViewModePersistence } from '@/hooks/useTabPersistence';
import { dev, warn, error as logError } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo, lazy, Suspense } from 'react';
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
const SmartDashboard = lazy(() => import('@/components/sales/SmartDashboard').then(module => ({ default: module.SmartDashboard })));
const OrderCalendarView = lazy(() => import('@/components/orders/OrderCalendarView').then(module => ({ default: module.OrderCalendarView })));

// Removed TABS - now using QuickFilterBar instead

// Removed mock chart data - now handled by SmartDashboard

export default function SalesOrders() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  const { hasModulePermission, enhancedUser } = usePermissions();

  // Accessibility: Live region for screen reader announcements
  const [liveRegionMessage, setLiveRegionMessage] = useState<string>('');

  useEffect(() => {
    dev('[RouteMount] SalesOrders mounted');
    if (orderIdFromUrl) {
      dev('🎯 Order ID detected from URL:', orderIdFromUrl);
    }
    return () => dev('[RouteUnmount] SalesOrders unmounted');
  }, [orderIdFromUrl]);

  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('sales_orders');
  const [viewMode, setViewMode] = useViewModePersistence('sales_orders');
  const [searchTerm, setSearchTerm] = useSearchPersistence('sales_orders');

  // Non-persistent UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [hasProcessedUrlOrder, setHasProcessedUrlOrder] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  const {
    orders,
    allOrders,
    tabCounts,
    filters,
    loading,
    lastRefresh: managementLastRefresh,
    updateFilters,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  } = useOrderManagement(activeFilter, weekOffset);

  // Use custom hook for manual refresh with consistent behavior
  const { handleRefresh, isRefreshing } = useManualRefresh(refreshData);

  // Check if user can create sales orders
  const canCreate = hasModulePermission('sales_orders', 'create');

  // Real-time updates handle most data changes automatically
  // Only manual refresh needed for initial load and special cases

  // Reset week offset when changing to a different filter
  useEffect(() => {
    if (activeFilter !== 'week') {
      setWeekOffset(0);
    }
  }, [activeFilter]);

  // Auto-open order modal when URL contains ?order=ID parameter
  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0 && !hasProcessedUrlOrder) {
      dev('🎯 Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in the loaded orders
      const targetOrder = orders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        dev('✅ Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);
        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        warn('⚠️ Order not found in current orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, orders, hasProcessedUrlOrder, t, toast]);

  const handleCreateOrder = useCallback(() => {
    if (!canCreate) {
      warn('⚠️ User does not have permission to create sales orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    dev('✅ User has permission to create sales orders');
    setSelectedOrder(null);
    setShowModal(true);
  }, [canCreate, toast, t]);

  const handleCreateOrderWithDate = useCallback((selectedDate?: Date) => {
    if (!canCreate) {
      warn('⚠️ User does not have permission to create sales orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    setSelectedOrder(null);

    // Pre-populate the due_date with the selected calendar date
    if (selectedDate) {
      dev('📅 Calendar date selected for new order:', selectedDate);
      // Set to 9 AM on the selected date (business hours)
      const prePopulatedDate = new Date(selectedDate);
      prePopulatedDate.setHours(9, 0, 0, 0);
      setPreSelectedDate(prePopulatedDate);
    } else {
      setPreSelectedDate(null);
    }

    setShowModal(true);
  }, [canCreate, toast, t]);

  const handleEditOrder = useCallback((order: Order) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  }, []);

  const handleViewOrder = useCallback((order: Order) => {
    setPreviewOrder(order);
  }, []);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    if (confirm(t('messages.confirm_delete_order'))) {
      await deleteOrder(orderId);
    }
  }, [t, deleteOrder]);

  const handleSaveOrder = useCallback(async (orderData: Partial<Order>) => {
    try {
      if (selectedOrder) {
        await updateOrder(selectedOrder.id, orderData);
        const message = t('orders.updated_successfully');
        toast({
          description: message,
          variant: 'default'
        });
        setLiveRegionMessage(message);
      } else {
        await createOrder(orderData);
        const message = t('orders.created_successfully');
        toast({
          description: message,
          variant: 'default'
        });
        setLiveRegionMessage(message);
      }

      // Close modal immediately for better UX
      setShowModal(false);

      // Refresh data in background (real-time subscription handles most updates)
      setTimeout(() => refreshData(), 100); // Slight delay to let real-time update first

    } catch (error) {
      logError('Error saving order:', error);
      const message = t('orders.save_failed');
      toast({
        description: message,
        variant: 'destructive'
      });
      setLiveRegionMessage(message);
    }
  }, [selectedOrder, updateOrder, createOrder, toast, t, refreshData]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    try {
      // Status change should ONLY update status, nothing else
      const updateData: Partial<Order> = { status: newStatus as 'pending' | 'in_progress' | 'completed' | 'cancelled' };

      // Update DB - queryClient.refetchQueries inside updateOrder will trigger UI update
      await updateOrder(orderId, updateData);

      // Dispatch event to notify other components (polling listens to this)
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, newStatus, timestamp: Date.now() }
      }));

      toast({
        description: t('orders.status_updated_successfully'),
        variant: 'default'
      });

      // No refreshData() call - polling system handles update automatically
    } catch (error) {
      logError('Status change failed:', error);
      toast({
        description: t('orders.status_change_failed'),
        variant: 'destructive'
      });

      // Re-throw error so kanban can handle rollback if needed
      throw error;
    }
  }, [updateOrder, toast, t]);

  const handleUpdate = useCallback(async (orderId: string, updates: Partial<Order>) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate queries for silent background update
      queryClient.invalidateQueries({ queryKey: ['orders', 'all'] });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: { orderId, updates, timestamp: Date.now() }
      }));

      // No toast here - specific handlers will show appropriate messages
    } catch (error) {
      logError('Order update failed:', error);
      throw error;
    }
  }, [updateOrder, queryClient]);


  const handleCardClick = useCallback((filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'dashboard') {
      setViewMode('kanban');
    }
  }, [setActiveFilter, setViewMode]);

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
      services: t('sales_orders.tabs.services'),
      deleted: t('sales_orders.tabs.deleted')
    };
    return titleMap[filter] || filter;
  };

  // Force table view on mobile (disable kanban and calendar)
  const effectiveViewMode = useMemo(() => isMobile ? 'table' : viewMode, [isMobile, viewMode]);

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;

    const searchLower = searchTerm.toLowerCase();
    return orders.filter((order: Order) =>
      order.id.toLowerCase().includes(searchLower) ||
      order.vehicleVin?.toLowerCase().includes(searchLower) ||
      order.stockNumber?.toLowerCase().includes(searchLower) ||
      order.notes?.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower) ||
      `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
    );
  }, [orders, searchTerm]);

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
            <h1 className="text-2xl font-bold">{t('pages.sales_orders')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <LiveTimer
              lastRefresh={managementLastRefresh}
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
              {t('common.new_order')}
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

        {/* Filters */}
        {showFilters && (
          <OrderFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Main Content Area - Code Split with Suspense and Error Boundaries */}
        <div className="space-y-6">
          {activeFilter === 'dashboard' ? (
            <OrderViewErrorBoundary viewType="dashboard">
              <Suspense fallback={<OrderViewLoadingFallback viewType="dashboard" />}>
                <SmartDashboard
                  allOrders={allOrders}
                  tabCounts={tabCounts}
                  onCardClick={handleCardClick}
                />
              </Suspense>
            </OrderViewErrorBoundary>
          ) : (
            <div className="space-y-4">
              {/* Responsive Table Header */}
              <div className="space-y-4">
                {/* Title and Badge - Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
                    {getFilterTitle(activeFilter)}
                  </h2>
                  <Badge variant="secondary" className="text-sm self-center sm:self-auto">
                    {filteredOrders.length}
                  </Badge>
                </div>

                {/* Search Context */}
                {searchTerm && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Showing results matching "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>

              {/* Table/Kanban/Calendar Content - Mobile forces table */}
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
                      loading={false}
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
                      loading={false}
                      onEdit={handleEditOrder}
                      onDelete={handleDeleteOrder}
                      onView={handleViewOrder}
                      onStatusChange={handleStatusChange}
                      tabType="sales"
                    />
                  </Suspense>
                </OrderViewErrorBoundary>
              )}
            </div>
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <OrderModal
            order={selectedOrder}
            open={showModal}
            onClose={() => {
              setShowModal(false);
              setPreSelectedDate(null); // Clear pre-selected date
            }}
            onSave={handleSaveOrder}
            preSelectedDate={preSelectedDate}
          />
        )}

        {/* Detail Modal - Unified Full Screen */}
        {previewOrder && (
          <UnifiedOrderDetailModal
            orderType="sales"
            order={previewOrder}
            open={true}
            onClose={() => {
              setPreviewOrder(null);
              // If we came from URL parameter, redirect to clean /sales to avoid loop
              if (orderIdFromUrl) {
                navigate('/sales', { replace: true });
              }
            }}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
          />
        )}
    </div>
  );
}
