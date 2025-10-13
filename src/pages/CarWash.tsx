import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Search, List, Kanban, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import CarWashOrderModal from '@/components/orders/CarWashOrderModal';
import { useCarWashOrderManagement } from '@/hooks/useCarWashOrderManagement';
import { useTranslation } from 'react-i18next';
import { useViewModePersistence } from '@/hooks/useTabPersistence';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { OrderCalendarView } from '@/components/orders/OrderCalendarView';

export default function CarWash() {
  const { t } = useTranslation();

  // Persistent state
  const [viewMode, setViewMode] = useViewModePersistence('car_wash');

  // Non-persistent UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewOrder, setPreviewOrder] = useState(null);

  const {
    orders,
    loading,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  } = useCarWashOrderManagement();

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
    try {
      await updateOrder(orderId, { status: newStatus });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderStatusChanged'));
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, newStatus, timestamp: Date.now() }
      }));

      // Refresh table data immediately after successful status change
      setTimeout(() => refreshData(), 100);
    } catch (error) {
      console.error('Status change failed:', error);
      // Trigger refresh to revert any optimistic UI updates
      setTimeout(() => refreshData(), 100);
      throw error;
    }
  };

  // Filter orders based on search term
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
  });

  return (
    <>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.car_wash')}</h1>
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

        {/* Search and View Mode Bar */}
        <Card className="border-border shadow-sm">
          <div className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={t('layout.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted/50 rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  className="h-8 px-2 sm:px-3"
                >
                  <List className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('kanban')}
                  className="h-8 px-2 sm:px-3"
                >
                  <Kanban className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Kanban</span>
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('calendar')}
                  className="h-8 px-2 sm:px-3"
                >
                  <CalendarIcon className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('common.calendar')}</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>

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
              tabType="carwash"
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
        {previewOrder && (
          <UnifiedOrderDetailModal
            orderType="carwash"
            order={previewOrder}
            open={true}
            onClose={() => setPreviewOrder(null)}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
          />
        )}
      </div>
    </>
  );
}