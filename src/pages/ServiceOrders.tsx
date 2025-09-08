import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useServiceOrderManagement } from "@/hooks/useServiceOrderManagement";
import { OrderDataTable } from "@/components/orders/OrderDataTable";
import ServiceOrderModal from "@/components/orders/ServiceOrderModal";
import { EnhancedOrderDetailModal } from "@/components/orders/EnhancedOrderDetailModal";
import { SmartDashboard } from "@/components/sales/SmartDashboard";
import { OrderKanbanBoard } from "@/components/sales/OrderKanbanBoard";
import { QuickFilterBar } from "@/components/sales/QuickFilterBar";
import { OrderPreviewPanel } from "@/components/sales/OrderPreviewPanel";
import { OrderFilters } from "@/components/orders/OrderFilters";

export default function ServiceOrders() {
  const { t } = useTranslation();
  
  // State management
  const [activeFilter, setActiveFilter] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [showFilters, setShowFilters] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [lastStatusChange, setLastStatusChange] = useState(0);

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

  // Auto-refresh mechanism
  useEffect(() => {
    const shouldPause = Date.now() - lastStatusChange < 5000; // Pause for 5s after status changes
    if (shouldPause) return;

    const interval = setInterval(() => {
      refreshData();
      setLastRefresh(Date.now());
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [refreshData, lastStatusChange]);

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

  const handlePreviewOrder = (order: any) => {
    setPreviewOrder(order);
    setIsPreviewOpen(true);
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
      setLastRefresh(Date.now());
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await updateOrder(orderId, { ...order, status: newStatus });
      setLastRefresh(Date.now());
      setLastStatusChange(Date.now()); // Track status changes for auto-refresh pause
    }
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    setPreviewOrder(null);
    setIsPreviewOpen(false);
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

  // Transform ServiceOrder to regular Order for components
  const transformedOrders = useMemo(() => {
    return filteredOrders.map(order => ({
      ...order,
      status: order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
      stockNumber: order.po || order.ro || order.tag || '',
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

        {/* Filter Bar */}
        <QuickFilterBar
          activeFilter={activeFilter}
          tabCounts={tabCounts as unknown as Record<string, number>}
          onFilterChange={handleFilterChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
        />

        {/* Advanced Filters */}
        {showFilters && (
          <OrderFilters 
            filters={filters}
            onFiltersChange={updateFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Main Content Area */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className={`${isPreviewOpen ? 'xl:col-span-2' : 'xl:col-span-3'}`}>
            {/* Smart Dashboard */}
            {activeFilter === 'dashboard' && (
              <SmartDashboard
                tabCounts={tabCounts as unknown as Record<string, number>}
                onCardClick={handleFilterChange}
              />
            )}

            {/* Kanban Board */}
            {activeFilter !== 'dashboard' && viewMode === 'kanban' && (
              <OrderKanbanBoard
                orders={transformedOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onDelete={handleDeleteOrder}
                onStatusChange={handleStatusChange}
              />
            )}

            {/* Table View */}
            {activeFilter !== 'dashboard' && viewMode === 'table' && (
              <OrderDataTable
                orders={transformedOrders}
                onEdit={handleEditOrder}
                onView={handleViewOrder}
                onDelete={handleDeleteOrder}
                loading={loading}
                tabType="service"
              />
            )}
          </div>

          {/* Preview Panel */}
          {isPreviewOpen && (
            <div className="xl:col-span-1">
              <OrderPreviewPanel
                order={previewOrder}
                open={isPreviewOpen}
                onClose={() => {
                  setIsPreviewOpen(false);
                  setPreviewOrder(null);
                }}
                onEdit={(order) => {
                  setIsPreviewOpen(false);
                  handleEditOrder(order);
                }}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>

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