import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Clock } from 'lucide-react';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import CarWashOrderModal from '@/components/orders/CarWashOrderModal';
import { useCarWashOrderManagement } from '@/hooks/useCarWashOrderManagement';
import { useTranslation } from 'react-i18next';
import { useTabPersistence, useViewModePersistence, useSearchPersistence } from '@/hooks/useTabPersistence';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';
import { Badge } from '@/components/ui/badge';

export default function CarWash() {
  const { t } = useTranslation();
  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('car_wash');
  const [viewMode, setViewMode] = useViewModePersistence('car_wash');
  const [searchTerm, setSearchTerm] = useSearchPersistence('car_wash');
  
  // Non-persistent UI state
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);

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
  } = useCarWashOrderManagement(activeFilter);

  // Real-time updates are handled by useCarWashOrderManagement hook

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
      console.error('Error saving car wash order:', error);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateOrder(orderId, { status: newStatus });
  };

  // Custom filter options for CarWash
  const carWashTabCounts = {
    ...tabCounts,
    dashboard: tabCounts.all,
    all: tabCounts.all,
  };

  // Filter orders based on search term and show waiter priority
  const filteredOrders = orders.filter((order: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(searchLower) ||
      order.vehicleVin?.toLowerCase().includes(searchLower) ||
      order.stockNumber?.toLowerCase().includes(searchLower) ||
      order.tag?.toLowerCase().includes(searchLower) ||
      `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`.toLowerCase().includes(searchLower)
    );
  }).map((order: any) => ({
    ...order,
    // Add waiter badge to display
    waiterBadge: order.isWaiter ? (
      <Badge variant="destructive" className="bg-destructive text-destructive-foreground">
        <Clock className="w-3 h-3 mr-1" />
        {t('car_wash_orders.waiter')}
      </Badge>
    ) : null
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.car_wash')}</h1>
            {tabCounts.waiter > 0 && (
              <Badge variant="destructive" className="bg-destructive text-destructive-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {tabCounts.waiter} {t('car_wash_orders.waiting')}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              {t('car_wash_orders.quick_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar - Car Wash specific filters */}
        <QuickFilterBar
          activeFilter={activeFilter}
          tabCounts={carWashTabCounts}
          onFilterChange={setActiveFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Main Content - Orders Table/Calendar */}
        <div className="space-y-6">
          {viewMode === 'calendar' ? (
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
              tabType={activeFilter}
            />
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <CarWashOrderModal
            order={selectedOrder}
            open={showModal}
            onClose={() => setShowModal(false)}
            onSave={handleSaveOrder}
          />
        )}

        {/* Detail Modal - Enhanced Full Screen */}
        <EnhancedOrderDetailModal
          order={previewOrder}
          open={!!previewOrder}
          onClose={() => setPreviewOrder(null)}
          onEdit={handleEditOrder}
          onDelete={handleDeleteOrder}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  );
}