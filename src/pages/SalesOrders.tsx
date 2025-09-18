import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw, Search, Clock } from 'lucide-react';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderModal } from '@/components/orders/OrderModal';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useTranslation } from 'react-i18next';
import { useTabPersistence, useViewModePersistence, useSearchPersistence } from '@/hooks/useTabPersistence';
import { toast } from 'sonner';
import { getSystemTimezone } from '@/utils/dateUtils';

// New improved components
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { OrderPreviewPanel } from '@/components/sales/OrderPreviewPanel';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';

// Removed TABS - now using QuickFilterBar instead

// Removed mock chart data - now handled by SmartDashboard

export default function SalesOrders() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get('order');

  useEffect(() => {
    console.log('[RouteMount] SalesOrders mounted');
    console.log('🔍 Debug - URL params on mount:', {
      orderIdFromUrl,
      hasOrderParam: !!orderIdFromUrl,
      fullURL: window.location.href
    });
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
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [preSelectedDate, setPreSelectedDate] = useState<Date | null>(null);

  const {
    orders,
    tabCounts,
    filters,
    loading,
    updateFilters,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  } = useOrderManagement(activeFilter);

  // Real-time updates handle most data changes automatically
  // Only manual refresh needed for initial load and special cases

  // Auto-open order modal when URL contains ?order=ID parameter
  useEffect(() => {
    console.log('🔍 Auto-modal effect triggered:', {
      orderIdFromUrl,
      ordersCount: orders.length,
      hasPreviewOrder: !!previewOrder,
      shouldExecute: !!(orderIdFromUrl && orders.length > 0 && !previewOrder)
    });

    if (orderIdFromUrl && orders.length > 0 && !previewOrder) {
      console.log('🎯 Searching for order from URL:', orderIdFromUrl);
      console.log('📋 Available orders:', orders.map(o => ({ id: o.id, orderNumber: o.orderNumber })));

      // Find the order in the loaded orders
      const targetOrder = orders.find(order => order.id === orderIdFromUrl);

      if (targetOrder) {
        console.log('✅ Found order, auto-opening modal:', targetOrder.orderNumber || targetOrder.id);
        setPreviewOrder(targetOrder);

        // Clean URL parameter after opening modal (optional)
        const url = new URL(window.location);
        url.searchParams.delete('order');
        window.history.replaceState({}, '', url.pathname + url.search);
      } else {
        console.warn('⚠️ Order not found in current orders list:', orderIdFromUrl);
        console.warn('🔍 Order IDs in list:', orders.map(o => o.id));
        toast.error(t('orders.order_not_found'));
      }
    }
  }, [orderIdFromUrl, orders, previewOrder, t]);

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
        toast.success(t('orders.updated_successfully'));
      } else {
        await createOrder(orderData);
        toast.success(t('orders.created_successfully'));
      }

      // Close modal immediately for better UX
      setShowModal(false);

      // Refresh data in background (real-time subscription handles most updates)
      setTimeout(() => refreshData(), 100); // Slight delay to let real-time update first

    } catch (error) {
      console.error('Error saving order:', error);
      toast.error(t('orders.save_failed'));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Find the order being updated
      const order = orders.find(o => o.id === orderId);

      let updateData: any = { status: newStatus };

      // If order has a due_date that might be causing validation issues, fix it
      if (order?.dueDate) {
        const dueDate = new Date(order.dueDate);
        const now = new Date();

        // Check if due_date is in the past or outside business hours
        const hour = dueDate.getHours();
        const isPast = dueDate < now;
        const outsideBusinessHours = hour < 8 || hour >= 18;

        if (isPast || outsideBusinessHours) {
          console.log('🕐 Due date issue detected, auto-fixing for status change');

          // Get system timezone for accurate calculations
          const systemTimezone = getSystemTimezone();
          console.log('🌍 System timezone detected:', systemTimezone);

          // Create date in system timezone
          const now = new Date();
          const currentLocalTime = new Date(now.toLocaleString('en-US', { timeZone: systemTimezone }));

          console.log('🕐 Current times:', {
            utc: now.toISOString(),
            local: currentLocalTime.toLocaleString(),
            timezone: systemTimezone
          });

          // Set to tomorrow 9 AM in local timezone
          const targetLocal = new Date(currentLocalTime);
          targetLocal.setDate(targetLocal.getDate() + 1);
          targetLocal.setHours(9, 0, 0, 0);

          // Skip Sunday
          if (targetLocal.getDay() === 0) {
            targetLocal.setDate(targetLocal.getDate() + 1);
          }

          // Convert back to UTC for database storage
          const targetUTC = new Date(targetLocal.toLocaleString('en-US', { timeZone: 'UTC' }));

          updateData.due_date = targetUTC.toISOString();

          console.log('🔧 TIMEZONE-AWARE Auto-corrected due_date:', {
            original: order.dueDate,
            targetLocal: targetLocal.toLocaleString(),
            targetUTC: targetUTC.toISOString(),
            systemTimezone: systemTimezone,
            localHour: targetLocal.getHours(),
            utcHour: targetUTC.getUTCHours()
          });

          toast.info(t('orders.due_date_auto_corrected', 'Due date automatically adjusted to next business day'));
        }
      }

      await updateOrder(orderId, updateData);

      // Update last refresh timestamp for UI
      setLastRefresh(new Date());

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderStatusChanged'));
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, newStatus, timestamp: Date.now() }
      }));

      toast.success(t('orders.status_updated_successfully'));
    } catch (error) {
      console.error('Status change failed:', error);

      // Handle specific business validation errors
      if (error?.message?.includes('Invalid due date')) {
        toast.error(t('orders.status_change_failed_due_date', {
          message: 'Due date must be during business hours (8 AM - 6 PM) with 1+ hour advance notice'
        }));
      } else if (error?.message?.includes('business hours')) {
        toast.error(t('orders.status_change_failed_business_hours'));
      } else {
        toast.error(t('orders.status_change_failed'));
      }

      // Trigger refresh to revert any optimistic UI updates
      setTimeout(() => refreshData(), 100);

      // Re-throw error so kanban can handle rollback if needed
      throw error;
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
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshData()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                
                {/* Last Update Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                      <span className="text-success">• Real-time</span>
                    </div>
                  </div>
                  
                  {/* Mobile-friendly info */}
                  <div className="text-xs text-muted-foreground sm:hidden">
                    {searchTerm && `Searching: "${searchTerm}"`}
                  </div>
                </div>
                
                {/* Search Context - Desktop */}
                {searchTerm && (
                  <div className="text-center hidden sm:block">
                    <p className="text-sm text-muted-foreground">
                      Showing results matching "{searchTerm}"
                    </p>
                  </div>
                )}
              </div>

              {/* Table/Kanban/Calendar Content */}
              {viewMode === 'kanban' ? (
                <OrderKanbanBoard
                  orders={filteredOrders}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                />
              ) : viewMode === 'calendar' ? (
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
                  onStatusChange={handleStatusChange}
                  tabType={activeFilter}
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
            onClose={() => setPreviewOrder(null)}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
          />
        )}
    </div>
  );
}