import { OrderCalendarView } from '@/components/orders/OrderCalendarView';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { ReconOrderModal } from '@/components/orders/ReconOrderModal';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LiveTimer } from '@/components/ui/LiveTimer';
import type { ReconOrder } from "@/hooks/useReconOrderManagement";
import { useReconOrderManagement } from '@/hooks/useReconOrderManagement';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useViewModePersistence } from '@/hooks/useTabPersistence';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, Kanban, List, Plus, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

export default function ReconOrders() {
  const { t } = useTranslation();
  const { confirmDelete } = useSweetAlert();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Persistent state
  const [viewMode, setViewMode] = useViewModePersistence('recon_orders');

  // Non-persistent UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReconOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<ReconOrder | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const {
    orders,
    loading,
    lastRefresh,
    refreshData,
    createOrder,
    updateOrder,
    deleteOrder,
  } = useReconOrderManagement();

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

  const handleEditOrder = (order: ReconOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  };

  const handleViewOrder = (order: ReconOrder) => {
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
    console.log('🎯 handleSaveOrder called with:', {
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
        console.log('📝 Calling updateOrder with:', {
          orderId: selectedOrder.id,
          orderData: orderData
        });
        await updateOrder(selectedOrder.id, orderData);
        console.log('✅ updateOrder completed successfully');
      } else {
        console.log('➕ Calling createOrder with:', {
          orderData: orderData
        });
        await createOrder(orderData);
        console.log('✅ createOrder completed successfully');
      }
      setShowModal(false);
      refreshData();
    } catch (error) {
      console.error('❌ Error in handleSaveOrder:', error);
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

  const handleUpdate = async (orderId: string, updates: any) => {
    try {
      await updateOrder(orderId, updates);

      // Invalidate query cache to trigger silent refetch
      // This is faster than polling and doesn't cause visible reload
      queryClient.invalidateQueries({ queryKey: ['orders', 'recon'] });

      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('orderUpdated', {
        detail: { orderId, updates, timestamp: Date.now() }
      }));
    } catch (error) {
      console.error('Order update failed:', error);
      throw error;
    }
  };

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refreshData();
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

  // Force table view on mobile (disable kanban and calendar)
  const effectiveViewMode = isMobile ? 'table' : viewMode;

  // Transform ReconOrder to Order format for compatibility with OrderKanbanBoard/OrderDataTable
  const transformedOrders = orders.map(order => {
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
  });

  // Filter orders based on search term
  const filteredOrders = transformedOrders.filter((order: any) => {
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
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.recon_orders')}</h1>
          </div>

          <div className="flex items-center gap-4">
            <LiveTimer
              lastRefresh={lastRefresh}
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
              {t('recon.new_recon_order')}
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
                {/* Table - Always available */}
                <Button
                  size="sm"
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  onClick={() => setViewMode('table')}
                  className="h-8 px-2 sm:px-3"
                >
                  <List className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Table</span>
                </Button>

                {/* Kanban - Only on desktop */}
                {!isMobile && (
                  <Button
                    size="sm"
                    variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('kanban')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <Kanban className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Kanban</span>
                  </Button>
                )}

                {/* Calendar - Only on desktop */}
                {!isMobile && (
                  <Button
                    size="sm"
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                    onClick={() => setViewMode('calendar')}
                    className="h-8 px-2 sm:px-3"
                  >
                    <CalendarIcon className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">{t('common.calendar')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content - Mobile forces table */}
        <div className="space-y-6">
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
              onStatusChange={handleStatusChange}
              tabType="recon"
            />
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <ReconOrderModal
            open={showModal}
            onClose={() => setShowModal(false)}
            onSave={handleSaveOrder}
            order={selectedOrder}
            mode={selectedOrder ? 'edit' : 'create'}
          />
        )}

        {/* Detail Modal - Enhanced Full Screen */}
        {previewOrder && (
          <UnifiedOrderDetailModal
            orderType="recon"
            order={previewOrder}
            open={true}
            onClose={() => setPreviewOrder(null)}
            onEdit={handleEditOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
            onUpdate={handleUpdate}
          />
        )}
    </div>
  );
}
