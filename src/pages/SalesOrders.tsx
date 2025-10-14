import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderModal } from '@/components/orders/OrderModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useSearchPersistence, useTabPersistence, useViewModePersistence } from '@/hooks/useTabPersistence';
import { useQueryClient } from '@tanstack/react-query';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

// New improved components
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { SmartDashboard } from '@/components/sales/SmartDashboard';

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

  useEffect(() => {
    console.log('[RouteMount] SalesOrders mounted');
    if (orderIdFromUrl) {
      console.log('🎯 Order ID detected from URL:', orderIdFromUrl);
    }
    return () => console.log('[RouteUnmount] SalesOrders unmounted');
  }, [orderIdFromUrl]);

  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('sales_orders');
  const [viewMode, setViewMode] = useViewModePersistence('sales_orders');
  const [searchTerm, setSearchTerm] = useSearchPersistence('sales_orders');

  // Non-persistent UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);
  const [hasProcessedUrlOrder, setHasProcessedUrlOrder] = useState(false);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
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
      console.log('🎯 Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in the loaded orders
      const targetOrder = orders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        console.log('✅ Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);
        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        console.warn('⚠️ Order not found in current orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, orders, hasProcessedUrlOrder, t]);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowModal(true);
  };

  const handleCreateOrderWithDate = (selectedDate?: Date) => {
    setSelectedOrder(null);

    // Pre-populate the due_date with the selected calendar date
    if (selectedDate) {
      console.log('📅 Calendar date selected for new order:', selectedDate);
      // Set to 9 AM on the selected date (business hours)
      const prePopulatedDate = new Date(selectedDate);
      prePopulatedDate.setHours(9, 0, 0, 0);
      setPreSelectedDate(prePopulatedDate);
    } else {
      setPreSelectedDate(null);
    }

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
    try {
      if (selectedOrder) {
        await updateOrder(selectedOrder.id, orderData);
        toast({
          description: t('orders.updated_successfully'),
          variant: 'default'
        });
      } else {
        await createOrder(orderData);
        toast({
          description: t('orders.created_successfully'),
          variant: 'default'
        });
      }

      // Close modal immediately for better UX
      setShowModal(false);

      // Refresh data in background (real-time subscription handles most updates)
      setTimeout(() => refreshData(), 100); // Slight delay to let real-time update first

    } catch (error) {
      console.error('Error saving order:', error);
      toast({
        description: t('orders.save_failed'),
        variant: 'destructive'
      });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Status change should ONLY update status, nothing else
      const updateData: any = { status: newStatus };

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
      console.error('Status change failed:', error);
      toast({
        description: t('orders.status_change_failed'),
        variant: 'destructive'
      });

      // Re-throw error so kanban can handle rollback if needed
      throw error;
    }
  };

  const handleUpdate = async (orderId: string, updates: any) => {
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
      console.error('Order update failed:', error);
      throw error;
    }
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      // Force refetch of polling query
      const result = await queryClient.refetchQueries({
        queryKey: ['orders', 'all']
      });
      console.log('🔄 Manual refresh completed:', result);
      toast({
        description: t('common.data_refreshed') || 'Data refreshed successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Manual refresh failed:', error);
      toast({
        description: t('common.refresh_failed') || 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setIsManualRefreshing(false);
    }
  };

  const handleCardClick = (filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'dashboard') {
      setViewMode('kanban');
    }
  };

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
  const effectiveViewMode = isMobile ? 'table' : viewMode;

  // Filter orders based on search term
  const filteredOrders = orders.filter((order: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.vehicleVin?.toLowerCase().includes(searchLower) ||
      order.stockNumber?.toLowerCase().includes(searchLower) ||
      order.notes?.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower) ||
      `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.sales_orders')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <LiveTimer
              lastRefresh={managementLastRefresh}
              isRefreshing={isManualRefreshing}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isManualRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isManualRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={handleCreateOrder}>
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

        {/* Main Content Area */}
        <div className="space-y-6">
          {activeFilter === 'dashboard' ? (
            <SmartDashboard
              allOrders={allOrders}
              tabCounts={tabCounts}
              onCardClick={handleCardClick}
            />
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
                <OrderKanbanBoard
                  orders={filteredOrders}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                />
              ) : effectiveViewMode === 'calendar' ? (
                <OrderCalendarView
                  orders={filteredOrders}
                  loading={false}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                  onCreateOrder={handleCreateOrderWithDate}
                />
              ) : (
                <OrderDataTable
                  orders={filteredOrders}
                  loading={false}
                  onEdit={handleEditOrder}
                  onDelete={handleDeleteOrder}
                  onView={handleViewOrder}
                  onStatusChange={handleStatusChange}
                  tabType="sales"
                />
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
