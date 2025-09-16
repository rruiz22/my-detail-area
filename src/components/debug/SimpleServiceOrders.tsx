import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTabPersistence, useViewModePersistence, useSearchPersistence } from '@/hooks/useTabPersistence';
import { useServiceOrderManagement } from '@/hooks/useServiceOrderManagement';
import { QuickFilterBar } from '@/components/sales/QuickFilterBar';
import { SmartDashboard } from '@/components/sales/SmartDashboard';
import { OrderKanbanBoard } from '@/components/sales/OrderKanbanBoard';

export default function SimpleServiceOrders() {
  const location = useLocation();
  const { t } = useTranslation();

  // Add persistence hooks
  const [activeFilter, setActiveFilter] = useTabPersistence('service_orders');
  const [viewMode, setViewMode] = useViewModePersistence('service_orders');
  const [searchTerm, setSearchTerm] = useSearchPersistence('service_orders');

  // Add the problematic hook
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
  } = useServiceOrderManagement(activeFilter);

  console.log('🔵 SimpleServiceOrders is RENDERING at', location.pathname);
  console.log('🔵 Persistence hooks:', { activeFilter, viewMode, searchTerm });
  console.log('🔵 Service management hook:', { orders: orders?.length, loading, tabCounts });

  // Dummy handlers for QuickFilterBar
  const handleToggleFilters = () => console.log('Toggle filters');
  const showFilters = false;

  // Handler for SmartDashboard card clicks
  const handleCardClick = (filter: string) => {
    console.log('Card clicked:', filter);
    setActiveFilter(filter);
    if (filter !== 'dashboard') {
      setViewMode('kanban');
    }
  };

  // Handlers for OrderKanbanBoard
  const handleEditOrder = (order: any) => {
    console.log('Edit order:', order);
  };

  const handleViewOrder = (order: any) => {
    console.log('View order:', order);
  };

  const handleDeleteOrder = async (orderId: string) => {
    console.log('Delete order:', orderId);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    console.log('Status change:', orderId, newStatus);
  };

  return (
    <div style={{
      padding: '20px',
      border: '2px solid blue',
      backgroundColor: '#e8f0ff',
      margin: '20px'
    }}>
      <h1 style={{ color: 'blue', fontSize: '24px' }}>
        🔵 {t('pages.service_orders')} (Simple)
      </h1>
      <p><strong>Current Path:</strong> {location.pathname}</p>
      <p><strong>Timestamp:</strong> {new Date().toLocaleTimeString()}</p>
      <p>This is a minimal Service Orders component.</p>

      {/* Test QuickFilterBar */}
      <div style={{ margin: '20px 0', padding: '10px', border: '1px dashed orange' }}>
        <h3>Testing QuickFilterBar:</h3>
        <QuickFilterBar
          activeFilter={activeFilter}
          tabCounts={tabCounts}
          onFilterChange={setActiveFilter}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showFilters={showFilters}
          onToggleFilters={handleToggleFilters}
        />
      </div>

      {/* Test SmartDashboard */}
      {activeFilter === 'dashboard' && (
        <div style={{ margin: '20px 0', padding: '10px', border: '1px dashed green' }}>
          <h3>Testing SmartDashboard:</h3>
          <SmartDashboard
            tabCounts={tabCounts}
            onCardClick={handleCardClick}
          />
        </div>
      )}

      {/* Test OrderKanbanBoard */}
      {activeFilter !== 'dashboard' && viewMode === 'kanban' && (
        <div style={{ margin: '20px 0', padding: '10px', border: '1px dashed red' }}>
          <h3>Testing OrderKanbanBoard:</h3>
          <OrderKanbanBoard
            orders={orders || []}
            onEdit={handleEditOrder}
            onView={handleViewOrder}
            onDelete={handleDeleteOrder}
            onStatusChange={handleStatusChange}
          />
        </div>
      )}

      {/* Gradually add complexity */}
      <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Hooks Status:</h2>
        <p>✅ useTranslation: Working</p>
        <p>✅ Persistence hooks: Working</p>
        <p>🔵 useServiceOrderManagement: {loading ? 'Loading...' : 'Loaded'}</p>
        <ul>
          <li>activeFilter: {activeFilter}</li>
          <li>viewMode: {viewMode}</li>
          <li>searchTerm: {searchTerm}</li>
          <li>orders count: {orders?.length || 0}</li>
          <li>loading: {loading ? 'true' : 'false'}</li>
        </ul>
        {tabCounts && (
          <div>
            <strong>Tab counts:</strong> {JSON.stringify(tabCounts)}
          </div>
        )}
      </div>
    </div>
  );
}