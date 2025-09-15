import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
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

// New improved components
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { OrderPreviewPanel } from '@/components/sales/OrderPreviewPanel';
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';

// Removed TABS - now using QuickFilterBar instead

// Removed mock chart data - now handled by SmartDashboard

export default function SalesOrders() {
  const { t } = useTranslation();
  
  useEffect(() => {
    console.log('[RouteMount] SalesOrders mounted');
    return () => console.log('[RouteUnmount] SalesOrders unmounted');
  }, []);
  
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
  const [nextRefresh, setNextRefresh] = useState<number>(60);
  const lastChangeTimeRef = useRef<number>(0);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const countdownIntervalRef = useRef<NodeJS.Timeout>();

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

  // Auto-refresh with countdown timer - optimized to prevent conflicts
  useEffect(() => {
    // Clear any existing intervals
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    // Countdown timer (updates every second)
    countdownIntervalRef.current = setInterval(() => {
      setNextRefresh(prev => {
        if (prev <= 1) {
          return 60; // Reset to 60 seconds
        }
        return prev - 1;
      });
    }, 1000);

    // Refresh timer (every 60 seconds) - with conflict prevention
    refreshIntervalRef.current = setInterval(() => {
      const now = Date.now();
      // Only refresh if no recent user activity and not currently loading
      if (now - lastChangeTimeRef.current > 10000 && !loading) {
        console.log('Auto-refresh triggered');
        refreshData();
        setLastRefresh(new Date());
        setNextRefresh(60); // Reset countdown
      }
    }, 60000);

    // Track when status changes occur
    const handleStatusChangeEvent = () => {
      lastChangeTimeRef.current = Date.now();
      setNextRefresh(60); // Reset countdown when user makes changes
    };

    // Listen for status changes (both old and new events)
    window.addEventListener('orderStatusChanged', handleStatusChangeEvent);
    window.addEventListener('orderStatusUpdated', handleStatusChangeEvent);

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      window.removeEventListener('orderStatusChanged', handleStatusChangeEvent);
      window.removeEventListener('orderStatusUpdated', handleStatusChangeEvent);
    };
  }, [refreshData, loading]);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowModal(true);
  };

  const handleCreateOrderWithDate = (selectedDate?: Date) => {
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
    if (confirm(t('messages.confirm_delete_order'))) {
      await deleteOrder(orderId);
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
      refreshData();
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    lastChangeTimeRef.current = Date.now(); // Update ref to prevent auto-refresh
    
    await updateOrder(orderId, { status: newStatus });
    
    // Note: No need to manually refresh since real-time subscription handles it
    setLastRefresh(new Date());
    setNextRefresh(60); // Reset timer
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('orderStatusChanged'));
    window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
      detail: { orderId, newStatus, timestamp: Date.now() }
    }));
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
      order.vin?.toLowerCase().includes(searchLower) ||
      order.stock?.toLowerCase().includes(searchLower) ||
      order.description?.toLowerCase().includes(searchLower) ||
      `${order.year} ${order.make} ${order.model}`.toLowerCase().includes(searchLower)
    );
  });

  return (
    <DashboardLayout>
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
                
                {/* Timer and Last Update - Mobile Responsive */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>Next update: {nextRefresh}s</span>
                    </div>
                    <div className="text-xs">
                      Last updated: {lastRefresh.toLocaleTimeString()}
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
            onClose={() => setShowModal(false)}
            onSave={handleSaveOrder}
          />
        )}

        {/* Detail Modal - Enhanced Full Screen */}
        {previewOrder && (
          <EnhancedOrderDetailModal
            order={previewOrder}
            open={true}
            onClose={() => setPreviewOrder(null)}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </DashboardLayout>
  );
}