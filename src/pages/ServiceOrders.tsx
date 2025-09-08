import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useServiceOrderManagement, ServiceOrder } from "@/hooks/useServiceOrderManagement";
import { QuickFilterBar } from "@/components/sales/QuickFilterBar";
import { OrderDataTable } from "@/components/orders/OrderDataTable";
import ServiceOrderModal from "@/components/orders/ServiceOrderModal";
import { EnhancedOrderDetailModal } from "@/components/orders/EnhancedOrderDetailModal";

export default function ServiceOrders() {
  const { t } = useTranslation();
  
  // State management
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Service order management hook
  const {
    orders,
    tabCounts,
    filters,
    loading,
    refreshData,
    updateFilters,
    createOrder,
    updateOrder,
    deleteOrder
  } = useServiceOrderManagement(activeFilter);

  // Auto-refresh mechanism with pause after status changes
  const shouldPauseRefresh = useMemo(() => {
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    return timeSinceLastRefresh < 60000; // Pause for 60 seconds after last refresh
  }, [lastRefresh]);

  // Event handlers
  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setIsModalOpen(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm(t('service.confirm_delete_order'))) {
      await deleteOrder(orderId);
    }
  };

  const handleSaveOrder = async (orderData: any) => {
    let success;
    
    if (selectedOrder) {
      success = await updateOrder(selectedOrder.id, orderData);
    } else {
      success = await createOrder(orderData);
    }

    if (success) {
      setIsModalOpen(false);
      setSelectedOrder(null);
      setLastRefresh(Date.now()); // Update last refresh time to pause auto-refresh
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await updateOrder(orderId, { ...order, status: newStatus });
      setLastRefresh(Date.now()); // Update last refresh time to pause auto-refresh
    }
  };

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    
    const searchLower = searchTerm.toLowerCase();
    return orders.filter(order =>
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.customerName.toLowerCase().includes(searchLower) ||
      order.vehicleVin?.toLowerCase().includes(searchLower) ||
      order.vehicleMake?.toLowerCase().includes(searchLower) ||
      order.vehicleModel?.toLowerCase().includes(searchLower) ||
      order.po?.toLowerCase().includes(searchLower) ||
      order.ro?.toLowerCase().includes(searchLower) ||
      order.tag?.toLowerCase().includes(searchLower)
    );
  }, [orders, searchTerm]);

  // Convert TabCounts to Record<string, number> for QuickFilterBar
  const tabCountsRecord = useMemo(() => ({
    all: tabCounts.all,
    today: tabCounts.today,
    tomorrow: tabCounts.tomorrow,
    pending: tabCounts.pending,
    inProgress: tabCounts.inProgress,
    completed: tabCounts.completed,
    cancelled: tabCounts.cancelled
  }), [tabCounts]);

  // Transform ServiceOrder to regular Order for components
  const transformedOrders = useMemo(() => {
    return filteredOrders.map(order => ({
      ...order,
      status: order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
      stockNumber: order.po || order.ro || order.tag || '', // Use service fields as stock number equivalent
    }));
  }, [filteredOrders]);

  return (
    <DashboardLayout title={t('pages.service_orders')}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.service_orders')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshData();
                setLastRefresh(Date.now());
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              {t('service.new_service_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <QuickFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          tabCounts={tabCountsRecord}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={updateFilters}
          orders={transformedOrders}
        />

        {/* Service Orders Table */}
        <OrderDataTable
          orders={transformedOrders}
          onEdit={handleEditOrder}
          onView={handleViewOrder}
          onDelete={handleDeleteOrder}
          loading={loading}
        />

        {/* Service Order Modal */}
        <ServiceOrderModal
          order={selectedOrder}
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          onSave={handleSaveOrder}
        />

        {/* Enhanced Order Detail Modal */}
        <EnhancedOrderDetailModal
          order={selectedOrder}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          onEdit={(order) => {
            setIsDetailModalOpen(false);
            handleEditOrder(order);
          }}
          onDelete={handleDeleteOrder}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  );
}

export default function ServiceOrders() {
  const { t } = useTranslation();
  
  // State management
  const [activeFilter, setActiveFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'dashboard' | 'kanban' | 'table'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  // Service order management hook
  const {
    orders,
    tabCounts,
    filters,
    loading,
    refreshData,
    updateFilters,
    createOrder,
    updateOrder,
    deleteOrder
  } = useServiceOrderManagement(activeFilter);

  // Auto-refresh mechanism with pause after status changes
  const shouldPauseRefresh = useMemo(() => {
    const timeSinceLastRefresh = Date.now() - lastRefresh;
    return timeSinceLastRefresh < 60000; // Pause for 60 seconds after last refresh
  }, [lastRefresh]);

  // Event handlers
  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setIsModalOpen(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm(t('service.confirm_delete_order'))) {
      await deleteOrder(orderId);
    }
  };

  const handleSaveOrder = async (orderData: any) => {
    let success;
    
    if (selectedOrder) {
      success = await updateOrder(selectedOrder.id, orderData);
    } else {
      success = await createOrder(orderData);
    }

    if (success) {
      setIsModalOpen(false);
      setSelectedOrder(null);
      setLastRefresh(Date.now()); // Update last refresh time to pause auto-refresh
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await updateOrder(orderId, { ...order, status: newStatus });
      setLastRefresh(Date.now()); // Update last refresh time to pause auto-refresh
    }
  };

  // Filter orders based on search term
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    
    const searchLower = searchTerm.toLowerCase();
    return orders.filter(order =>
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.customerName.toLowerCase().includes(searchLower) ||
      order.vehicleVin?.toLowerCase().includes(searchLower) ||
      order.vehicleMake?.toLowerCase().includes(searchLower) ||
      order.vehicleModel?.toLowerCase().includes(searchLower) ||
      order.po?.toLowerCase().includes(searchLower) ||
      order.ro?.toLowerCase().includes(searchLower) ||
      order.tag?.toLowerCase().includes(searchLower)
    );
  }, [orders, searchTerm]);

  return (
    <DashboardLayout title={t('pages.service_orders')}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">{t('pages.service_orders')}</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshData();
                setLastRefresh(Date.now());
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            <Button size="sm" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              {t('service.new_service_order')}
            </Button>
          </div>
        </div>

        {/* Quick Filter Bar */}
        <QuickFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          tabCounts={tabCounts}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          filters={filters}
          onFiltersChange={updateFilters}
          orders={filteredOrders}
        />

        {/* Content based on view mode and active filter */}
        {activeFilter === 'dashboard' ? (
          <SmartDashboard 
            orders={filteredOrders}
            onEditOrder={handleEditOrder}
            onViewOrder={handleViewOrder}
            onDeleteOrder={handleDeleteOrder}
            onStatusChange={handleStatusChange}
          />
        ) : viewMode === 'kanban' ? (
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
            onEdit={handleEditOrder}
            onView={handleViewOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
            loading={loading}
          />
        )}

        {/* Service Order Modal */}
        <ServiceOrderModal
          order={selectedOrder}
          open={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          onSave={handleSaveOrder}
        />

        {/* Enhanced Order Detail Modal */}
        <EnhancedOrderDetailModal
          order={selectedOrder}
          open={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedOrder(null);
          }}
          onEdit={(order) => {
            setIsDetailModalOpen(false);
            handleEditOrder(order);
          }}
          onDelete={handleDeleteOrder}
          onStatusChange={handleStatusChange}
        />
      </div>
    </DashboardLayout>
  );
}