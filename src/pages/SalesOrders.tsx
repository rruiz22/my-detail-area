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
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { dev, warn, error as logError } from '@/utils/logger';
import { determineTabForOrder } from '@/utils/orderUtils';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { generateOrderListPDF } from '@/utils/generateOrderListPDF';

// Direct imports - no lazy loading for maximum speed
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
import { OrderViewLoadingFallback } from '@/components/orders/OrderViewLoadingFallback';
import { OrderViewErrorBoundary } from '@/components/orders/OrderViewErrorBoundary';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';

// Removed TABS - now using QuickFilterBar instead

// Removed mock chart data - now handled by SmartDashboard

export default function SalesOrders() {
  // 🚀 CODE SPLITTING: Load sales_orders + orders + common namespaces
  const { t } = useTranslation(['sales_orders', 'orders', 'common']);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  const { hasModulePermission, enhancedUser } = usePermissions();
  const { selectedDealerId } = useDealerFilter(); // ✅ FIX: Get dealer filter for cache operations

  // 🔍 DIAGNOSTIC: Log every render to track re-render behavior
  dev('🔵 SalesOrders component is RENDERING', { selectedDealerId });

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

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
  const canCreate = hasModulePermission('sales_orders', 'create_orders');

  // Hook for status permissions and updates
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

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
    if (orderIdFromUrl && allOrders.length > 0 && !hasProcessedUrlOrder) {
      dev('🎯 Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in ALL orders (not just filtered by active tab)
      const targetOrder = allOrders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        dev('✅ Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);

        // Determine the correct tab for this order
        const correctTab = determineTabForOrder(targetOrder);

        // Auto-navigate to the correct tab if not already there
        if (correctTab !== activeFilter) {
          dev('📍 Auto-navigating to correct tab:', correctTab);
          setActiveFilter(correctTab);
        }

        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        warn('⚠️ Order not found in orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, allOrders, hasProcessedUrlOrder, activeFilter, setActiveFilter, t, toast]);

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

  const handleSaveOrder = useCallback(async (orderData: Partial<Order> | Partial<Order>[]) => {
    try {
      // Check if we received an array of orders (multiple services)
      if (Array.isArray(orderData)) {
        const createdOrders: Order[] = [];

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

      // Invalidate query cache to trigger automatic refetch (like ServiceOrders)
      // ✅ FIX: Include selectedDealerId in queryKey to match polling query
      queryClient.invalidateQueries({ queryKey: ['orders', 'all', selectedDealerId] });

    } catch (error) {
      logError('Error saving order:', error);
      const message = t('orders.save_failed');
      toast({
        description: message,
        variant: 'destructive'
      });
      setLiveRegionMessage(message);
      // Re-throw to let modal handle it
      throw error;
    }
  }, [selectedOrder, updateOrder, createOrder, toast, t, queryClient, selectedDealerId]);

  const handleStatusChange = useCallback(async (orderId: string, newStatus: string) => {
    // Find the order
    const order = allOrders.find(o => o.id === orderId);
    if (!order) {
      logError('Order not found for status change:', orderId);
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
        // ✅ 3. Dispatch event for real-time updates
        window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
          detail: { orderId, newStatus, timestamp: Date.now() }
        }));

        // ✅ 4. Show success toast
        toast({
          description: t('orders.status_updated_successfully'),
          variant: 'default'
        });

        // ✅ 5. Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['orders', 'all', selectedDealerId] });
      } else {
        throw new Error('Status update failed');
      }
    } catch (error) {
      logError('Status change failed:', error);
      toast({
        description: t('orders.status_change_failed'),
        variant: 'destructive'
      });

      // Re-throw error so kanban can handle rollback if needed
      throw error;
    }
  }, [allOrders, canUpdateStatus, updateOrderStatus, toast, t, queryClient, selectedDealerId]);

  const handleUpdate = useCallback(async (orderId: string, updates: Partial<Order>) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate queries for silent background update
      // ✅ FIX: Include selectedDealerId in queryKey to match polling query
      queryClient.invalidateQueries({ queryKey: ['orders', 'all', selectedDealerId] });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: { orderId, updates, timestamp: Date.now() }
      }));

      // No toast here - specific handlers will show appropriate messages
    } catch (error) {
      logError('Order update failed:', error);
      throw error;
    }
  }, [updateOrder, queryClient, selectedDealerId]);


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

  // Handle print list (must be after filteredOrders)
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
        orderType: 'sales',
        filterLabel: getFilterTitle(activeFilter),
        dealershipName: filteredOrders[0]?.dealershipName || 'Dealership',
        searchTerm: searchTerm || undefined
      });

      toast({
        description: t('common.action_buttons.print_success')
      });
    } catch (error) {
      logError('Print list failed:', error);
      toast({
        variant: 'destructive',
        description: t('common.action_buttons.print_failed')
      });
    } finally {
      setIsPrinting(false);
    }
  }, [filteredOrders, activeFilter, searchTerm, t, toast]);

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
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{t('pages.sales_orders')}</h1>
            <div className="flex items-center gap-2 sm:gap-3">
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
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} sm:mr-2`} />
                <span className="hidden sm:inline">{t('common.refresh')}</span>
              </Button>
              <Button
                size="sm"
                onClick={handleCreateOrder}
                disabled={!canCreate}
                title={!canCreate ? t('errors.no_permission_create_order', 'No permission to create orders') : ''}
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('common.new_order')}</span>
              </Button>
            </div>
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
          onPrintList={handlePrintList}
          isPrinting={isPrinting}
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
              <SmartDashboard
                allOrders={allOrders}
                tabCounts={tabCounts}
                onCardClick={handleCardClick}
              />
            </OrderViewErrorBoundary>
          ) : (
            <div className="space-y-4">
              {/* Responsive Table Header */}
              <div className="space-y-4">
                {/* Title and Badge - Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2 sm:gap-3">
                  <h2 className="text-2xl sm:text-4xl font-bold text-center sm:text-left tracking-tight">
                    {getFilterTitle(activeFilter)}
                  </h2>
                  <Badge variant="secondary" className="text-base sm:text-lg font-bold self-center sm:self-auto px-2 sm:px-3 py-1">
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
                  <OrderKanbanBoard
                    orders={filteredOrders}
                    onEdit={handleEditOrder}
                    onView={handleViewOrder}
                    onDelete={handleDeleteOrder}
                    onStatusChange={handleStatusChange}
                  />
                </OrderViewErrorBoundary>
              ) : effectiveViewMode === 'calendar' ? (
                <OrderViewErrorBoundary viewType="calendar">
                  <OrderCalendarView
                    orders={filteredOrders}
                    loading={false}
                    onEdit={handleEditOrder}
                    onView={handleViewOrder}
                    onDelete={handleDeleteOrder}
                    onStatusChange={handleStatusChange}
                    onCreateOrder={handleCreateOrderWithDate}
                  />
                </OrderViewErrorBoundary>
              ) : (
                <OrderViewErrorBoundary viewType="table">
                  <OrderDataTable
                    orders={filteredOrders}
                    loading={false}
                    onEdit={handleEditOrder}
                    onDelete={handleDeleteOrder}
                    onView={handleViewOrder}
                    onStatusChange={handleStatusChange}
                    tabType="sales"
                  />
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
