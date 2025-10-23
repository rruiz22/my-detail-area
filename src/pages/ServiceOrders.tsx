import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { Button } from '@/components/ui/button';
import { LiveTimer } from '@/components/ui/LiveTimer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useManualRefresh } from '@/hooks/useManualRefresh';
import { usePermissions } from '@/hooks/usePermissions';
import { useServiceOrderManagement } from '@/hooks/useServiceOrderManagement';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useSearchPersistence, useTabPersistence, useViewModePersistence } from '@/hooks/useTabPersistence';
import { Plus, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';

// New improved components
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';
import ServiceOrderModal from '@/components/orders/ServiceOrderModal';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { useQueryClient } from '@tanstack/react-query';

export default function ServiceOrders() {
  console.log('🔵 ServiceOrders component is RENDERING');
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { confirmDelete } = useSweetAlert();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');
  const { hasModulePermission, enhancedUser } = usePermissions();

  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('service_orders');
  const [viewMode, setViewMode] = useViewModePersistence('service_orders');
  const [searchTerm, setSearchTerm] = useSearchPersistence('service_orders');

  // Non-persistent UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [hasProcessedUrlOrder, setHasProcessedUrlOrder] = useState(false);

  const {
    orders,
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
  const canCreate = hasModulePermission('service_orders', 'create');

  // Auto-open order modal when URL contains ?order=ID parameter
  useEffect(() => {
    if (orderIdFromUrl && orders.length > 0 && !hasProcessedUrlOrder) {
      console.log('🎯 [Service] Processing order from URL (one-time):', orderIdFromUrl);

      // Find the order in the loaded orders
      const targetOrder = orders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        console.log('✅ [Service] Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);
        setPreviewOrder(targetOrder);
        setHasProcessedUrlOrder(true); // Prevent loop
      } else {
        console.warn('⚠️ [Service] Order not found in current orders list:', orderIdFromUrl);
        toast({
          description: t('orders.order_not_found'),
          variant: 'destructive'
        });
        setHasProcessedUrlOrder(true); // Prevent retrying
      }
    }
  }, [orderIdFromUrl, orders, hasProcessedUrlOrder, t]);

  const handleCreateOrder = () => {
    if (!canCreate) {
      console.warn('⚠️ User does not have permission to create service orders');
      toast({
        title: t('errors.no_permission', 'No Permission'),
        description: t('errors.no_permission_create_order', 'You do not have permission to create orders'),
        variant: 'destructive'
      });
      return;
    }

    console.log('✅ User has permission to create service orders');
    setSelectedOrder(null);
    setShowModal(true);
  };

  const handleCreateOrderWithDate = (selectedDate?: Date) => {
    if (!canCreate) {
      console.warn('⚠️ User does not have permission to create service orders');
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
    const confirmed = await confirmDelete();

    if (confirmed) {
      try {
        await deleteOrder(orderId);
      } catch (error) {
        console.error('❌ Delete failed:', error);
      }
    }
  };

  const handleSaveOrder = async (orderData: any) => {
    try {
      if (selectedOrder) {
        await updateOrder(selectedOrder.id, orderData);
      } else {
        await createOrder(orderData);
      }
      setShowModal(false);
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrder(orderId, { status: newStatus });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderStatusChanged'));
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, newStatus, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Status change failed:', error);
      throw error;
    }
  };

  const handleUpdate = async (orderId: string, updates: any) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate query cache to trigger silent refetch
      // This is faster than polling and doesn't cause visible reload
      queryClient.invalidateQueries({ queryKey: ['orders', 'service'] });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: { orderId, updates, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Order update failed:', error);
      throw error;
    }
  };


  const handleCardClick = (filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'dashboard') {
      setViewMode('kanban');
    }
  };

  // Force table view on mobile (disable kanban and calendar)
  const effectiveViewMode = isMobile ? 'table' : viewMode;

  // Filter orders based on search term
  const filteredOrders = orders.filter((order: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower) ||
      order.po?.toLowerCase().includes(searchLower) ||
      order.ro?.toLowerCase().includes(searchLower) ||
      `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
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

        {/* Main Content Area */}
        <div className="space-y-6">
          {activeFilter === 'dashboard' ? (
            <SmartDashboard
              allOrders={orders}
              tabCounts={tabCounts}
              onCardClick={handleCardClick}
            />
          ) : (
            <>
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
                  loading={loading}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                  onCreateOrder={handleCreateOrderWithDate}
                />
              ) : (
                <OrderDataTable
                  orders={filteredOrders}
                  loading={loading}
                  onEdit={handleEditOrder}
                  onDelete={handleDeleteOrder}
                  onView={handleViewOrder}
                  tabType="service"
                />
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <ServiceOrderModal
            order={selectedOrder}
            open={showModal}
            onClose={() => setShowModal(false)}
            onSave={handleSaveOrder}
          />
        )}

        {/* Detail Modal - Unified Full Screen */}
        {previewOrder && (
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
        )}
    </div>
  );
}
