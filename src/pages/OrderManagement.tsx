import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderModal } from '@/components/orders/OrderModal';
import { useOrderManagement } from '@/hooks/useOrderManagement';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', count: 0 },
  { id: 'today', label: 'Today', count: 0 },
  { id: 'tomorrow', label: 'Tomorrow', count: 0 },
  { id: 'pending', label: 'Pending', count: 0 },
  { id: 'week', label: 'Week', count: 0 },
  { id: 'all', label: 'All', count: 0 },
  { id: 'services', label: 'Services', count: 0 },
  { id: 'deleted', label: 'Deleted', count: 0 },
];

export default function OrderManagement() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
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
  } = useOrderManagement(activeTab);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
      setLastRefresh(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [refreshData]);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setShowModal(true);
  };

  const handleEditOrder = (order: any) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta orden?')) {
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

  const tabsWithCounts = TABS.map(tab => ({
    ...tab,
    count: tabCounts[tab.id] || 0
  }));

  return (
    <DashboardLayout title="Order Management">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button onClick={handleCreateOrder} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Orden
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-accent text-accent-foreground' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" onClick={refreshData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Última actualización: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <OrderFilters
            filters={filters}
            onFiltersChange={updateFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto gap-1 bg-muted p-1">
            {tabsWithCounts.map((tab) => (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                className="flex flex-col sm:flex-row items-center gap-1 py-2 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
              >
                <span className="text-xs sm:text-sm">{tab.label}</span>
                <Badge 
                  variant="secondary" 
                  className="text-xs px-1.5 py-0 min-w-[18px] h-4 bg-accent text-accent-foreground"
                >
                  {tab.count}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabsWithCounts.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              <OrderDataTable
                orders={orders}
                loading={loading}
                onEdit={handleEditOrder}
                onDelete={handleDeleteOrder}
                onView={(order) => window.open(`/orders/${order.id}`, '_blank')}
                tabType={tab.id}
              />
            </TabsContent>
          ))}
        </Tabs>

        {/* Modal */}
        {showModal && (
          <OrderModal
            order={selectedOrder}
            open={showModal}
            onClose={() => setShowModal(false)}
            onSave={handleSaveOrder}
          />
        )}
      </div>
    </DashboardLayout>
  );
}