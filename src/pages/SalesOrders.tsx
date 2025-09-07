import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Filter, RefreshCw, Calendar, Clock, AlertCircle, BarChart3 } from 'lucide-react';
import { OrderFilters } from '@/components/orders/OrderFilters';
import { OrderDataTable } from '@/components/orders/OrderDataTable';
import { OrderModal } from '@/components/orders/OrderModal';
import { useOrderManagement } from '@/hooks/useOrderManagement';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', count: 0 },
  { id: 'today', label: "Today's Orders", count: 0 },
  { id: 'tomorrow', label: "Tomorrow's Orders", count: 0 },
  { id: 'pending', label: 'Pending Orders', count: 0 },
  { id: 'week', label: 'Week View', count: 0 },
  { id: 'all', label: 'All Orders', count: 0 },
  { id: 'services', label: 'Services', count: 0 },
  { id: 'deleted', label: 'Deleted Orders', count: 0 },
];

// Mock data for charts
const trendData = [
  { name: 'Mon', orders: 0 },
  { name: 'Tue', orders: 0 },
  { name: 'Wed', orders: 0 },
  { name: 'Thu', orders: 0 },
  { name: 'Fri', orders: 0 },
  { name: 'Sat', orders: 0 },
  { name: 'Sun', orders: 0 },
];

const statusData = [
  { name: 'Pending', value: 0, color: 'hsl(var(--pending))' },
  { name: 'Processing', value: 0, color: 'hsl(var(--warning))' },
  { name: 'Completed', value: 0, color: 'hsl(var(--success))' },
];

export default function SalesOrders() {
  const { t } = useTranslation();
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

  const tabsWithCounts = TABS.map(tab => ({
    ...tab,
    count: tabCounts[tab.id] || 0
  }));

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
            <Button 
              variant="outline" 
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? 'bg-accent text-accent-foreground' : ''}
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('common.filters')}
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

          {/* Dashboard Tab Content */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="space-y-6">
              {/* Order Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('orders.today_orders')}</CardTitle>
                    <Calendar className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{tabCounts.today || 0}</div>
                    <p className="text-xs text-muted-foreground">Sep 6, 2025</p>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('orders.tomorrow_orders')}</CardTitle>
                    <Clock className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{tabCounts.tomorrow || 0}</div>
                    <p className="text-xs text-muted-foreground">Sep 7, 2025</p>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('orders.pending_orders')}</CardTitle>
                    <AlertCircle className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{tabCounts.pending || 0}</div>
                    <p className="text-xs text-warning">{t('orders.require_attention')}</p>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{t('orders.week_orders')}</CardTitle>
                    <BarChart3 className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{tabCounts.week || 0}</div>
                    <p className="text-xs text-muted-foreground">Sep 1 - Sep 7</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-foreground">{t('orders.orders_trend_analysis')}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t('orders.track_order_performance')}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis 
                            dataKey="name" 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <YAxis 
                            stroke="hsl(var(--muted-foreground))"
                            fontSize={12}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="orders"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-medium text-foreground">{t('orders.status_distribution')}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t('orders.current_order_status')}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '6px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex justify-center space-x-6 mt-4">
                        {statusData.map((item, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: item.color }}
                            ></div>
                            <span className="text-sm text-muted-foreground">{item.name}</span>
                            <span className="text-sm font-medium text-foreground">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Other Tab Contents */}
          {tabsWithCounts.filter(tab => tab.id !== 'dashboard').map((tab) => (
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