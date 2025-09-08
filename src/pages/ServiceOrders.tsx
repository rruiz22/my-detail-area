import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { useServiceOrderManagement } from "@/hooks/useServiceOrderManagement";
import { OrderDataTable } from "@/components/orders/OrderDataTable";
import ServiceOrderModal from "@/components/orders/ServiceOrderModal";
import { EnhancedOrderDetailModal } from "@/components/orders/EnhancedOrderDetailModal";

export default function ServiceOrders() {
  const { t } = useTranslation();
  
  // State management
  const [activeFilter, setActiveFilter] = useState('all');
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
      setLastRefresh(Date.now());
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      await updateOrder(orderId, { ...order, status: newStatus });
      setLastRefresh(Date.now());
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

        {/* Service Orders Table */}
        <OrderDataTable
          orders={transformedOrders}
          onEdit={handleEditOrder}
          onView={handleViewOrder}
          onDelete={handleDeleteOrder}
          loading={loading}
          tabType="service"
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