import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { ReconOrderModal } from '@/components/orders/ReconOrderModal';
import { useReconOrderManagement } from '@/hooks/useReconOrderManagement';
import { useTranslation } from 'react-i18next';
import { useTabPersistence, useViewModePersistence, useSearchPersistence } from '@/hooks/useTabPersistence';

// New improved components
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';
import type { ReconOrder } from "@/hooks/useReconOrderManagement";

export default function ReconOrders() {
  const { t } = useTranslation();
  
  // Persistent state
  const [activeFilter, setActiveFilter] = useTabPersistence('recon_orders');
  const [viewMode, setViewMode] = useViewModePersistence('recon_orders');
  const [searchTerm, setSearchTerm] = useSearchPersistence('recon_orders');
  
  // Non-persistent UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReconOrder | null>(null);
  const [previewOrder, setPreviewOrder] = useState<ReconOrder | null>(null);
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
  } = useReconOrderManagement(activeFilter);

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

  const handleEditOrder = (order: ReconOrder) => {
    setSelectedOrder(order);
    setShowModal(true);
    setPreviewOrder(null); // Close preview if open
  };

  const handleViewOrder = (order: ReconOrder) => {
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

  // Transform ReconOrder to Order format for compatibility with OrderKanbanBoard/OrderDataTable
  const transformedOrders = orders.map(order => ({
    id: order.id,
    order_number: order.orderNumber,
    customer_name: t('recon_defaults.default_customer'),
    customerName: t('recon_defaults.default_customer'),
    vehicle_year: order.vehicleYear,
    vehicle_make: order.vehicleMake,
    vehicle_model: order.vehicleModel,
    vehicle_vin: order.vehicleVin,
    vin: order.vehicleVin || '',
    stock: order.stockNumber,
    year: order.vehicleYear || 0,
    make: order.vehicleMake || '',
    model: order.vehicleModel || '',
    status: order.status,
    services: order.services || [],
    total_amount: order.reconCost,
    created_at: order.createdAt,
    createdAt: order.createdAt,
    updated_at: order.updatedAt,
    updatedAt: order.updatedAt,
    due_date: order.dueDate,
    priority: order.priority || 'normal',
    // Recon specific fields
    condition_grade: order.conditionGrade,
    recon_category: order.reconCategory,
    // Required fields for Order interface
    service: t('recon_defaults.default_service'),
    description: `${t('recon_defaults.default_service')} - ${order.reconCategory || t('common.general')}`,
    price: order.reconCost || 0,
    advisor: t('recon_defaults.default_advisor'),
    department: t('recon_defaults.default_department') as const
  }));

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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Actions */}  
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.recon_orders')}</h1>
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
              {t('recon.new_recon_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <QuickFilterBar
          activeFilter={activeFilter}
          tabCounts={tabCounts as unknown as Record<string, number>}
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
              tabCounts={tabCounts as unknown as Record<string, number>} 
              onCardClick={handleCardClick}
            />
          ) : (
            <>
              {viewMode === 'kanban' ? (
                <OrderKanbanBoard
                  orders={filteredOrders as any[]}
                  onEdit={(order: any) => handleEditOrder(orders.find(o => o.id === order.id)!)}
                  onView={(order: any) => handleViewOrder(orders.find(o => o.id === order.id)!)}
                  onDelete={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                />
              ) : (
                <OrderDataTable
                  orders={filteredOrders as any[]}
                  loading={loading}
                  onEdit={(order: any) => handleEditOrder(orders.find(o => o.id === order.id)!)}
                  onDelete={handleDeleteOrder}
                  onView={(order: any) => handleViewOrder(orders.find(o => o.id === order.id)!)}
                  tabType={activeFilter}
                />
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {showModal && (
          <ReconOrderModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onSubmit={handleSaveOrder}
            order={selectedOrder}
            mode={selectedOrder ? 'edit' : 'create'}
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