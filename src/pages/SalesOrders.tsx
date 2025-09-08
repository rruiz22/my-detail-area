import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderModal } from '@/components/orders/OrderModal';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { useTranslation } from 'react-i18next';

// New improved components
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { OrderPreviewPanel } from '@/components/sales/OrderPreviewPanel';

// Removed TABS - now using QuickFilterBar instead

// Removed mock chart data - now handled by SmartDashboard

export default function SalesOrders() {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

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

  // Auto-refresh every 60 seconds, but skip if there were recent changes
  useEffect(() => {
    let lastChangeTime = 0;
    
    const interval = setInterval(() => {
      // Only refresh if there hasn't been a status change in the last 10 seconds
      const now = Date.now();
      if (now - lastChangeTime > 10000) {
        refreshData();
        setLastRefresh(new Date());
      }
    }, 60000);

    // Track when status changes occur
    const handleStatusChangeEvent = () => {
      lastChangeTime = Date.now();
    };

    // Listen for status changes
    window.addEventListener('orderStatusChanged', handleStatusChangeEvent);

    return () => {
      clearInterval(interval);
      window.removeEventListener('orderStatusChanged', handleStatusChangeEvent);
    };
  }, [refreshData]);

  const handleCreateOrder = () => {
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
    await updateOrder(orderId, { status: newStatus });
    // Dispatch event to notify auto-refresh to pause
    window.dispatchEvent(new CustomEvent('orderStatusChanged'));
  };

  const handleCardClick = (filter: string) => {
    setActiveFilter(filter);
    if (filter !== 'dashboard') {
      setViewMode('kanban');
    }
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
    <DashboardLayout title={t('pages.sales_orders')}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleCreateOrder} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              {t('common.new_order')}
            </Button>
            <Button variant="outline" onClick={refreshData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            {t('orders.last_update')}: {lastRefresh.toLocaleTimeString()}
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
            <>
              {viewMode === 'kanban' ? (
                <OrderKanbanBoard
                  orders={filteredOrders}
                  onEdit={handleEditOrder}
                  onView={handleViewOrder}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <OrderDataTable
                  orders={filteredOrders}
                  loading={loading}
                  onEdit={handleEditOrder}
                  onDelete={handleDeleteOrder}
                  onView={handleViewOrder}
                  tabType={activeFilter}
                />
              )}
            </>
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

        {/* Preview Panel */}
        <OrderPreviewPanel
          order={previewOrder}
          open={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          onEdit={handleEditOrder}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  );
}