import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Download, Eye, Package, DollarSign, Calendar, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { ReconOrderModal } from "@/components/orders/ReconOrderModal";
import { EnhancedOrderDetailModal } from "@/components/orders/EnhancedOrderDetailModal";
import { useTranslation } from 'react-i18next';
import { useReconOrderManagement } from "@/hooks/useReconOrderManagement";
import { useToast } from "@/hooks/use-toast";
import type { ReconOrder } from "@/hooks/useReconOrderManagement";

export default function ReconOrders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ReconOrder | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('create');

  const {
    orders,
    tabCounts,
    filters,
    loading,
    updateFilters,
    createOrder,
    updateOrder,
    deleteOrder,
    refreshData
  } = useReconOrderManagement(activeTab);

  const handleCreateOrder = () => {
    setSelectedOrder(null);
    setEditMode('create');
    setShowCreateModal(true);
  };

  const handleEditOrder = (order: ReconOrder) => {
    setSelectedOrder(order);
    setEditMode('edit');
    setShowCreateModal(true);
  };

  const handleViewOrder = (order: ReconOrder) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleExportOrders = () => {
    toast({
      title: t('common.info'),
      description: t('common.feature_coming_soon'),
    });
  };

  const handleSubmitOrder = async (orderData: any) => {
    try {
      if (editMode === 'create') {
        await createOrder(orderData);
      } else if (selectedOrder) {
        await updateOrder(selectedOrder.id, orderData);
      }
    } catch (error) {
      console.error('Error submitting recon order:', error);
      toast({
        title: t('common.error'),
        description: t('recon.error_submitting_order'),
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout title={t('pages.recon_orders')}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder={t('orders.search_orders')}
              value={filters.search}
              onChange={(e) => updateFilters({ search: e.target.value })}
              className="w-64"
            />
            <Select 
              value={filters.status} 
              onValueChange={(value) => updateFilters({ status: value })}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('orders.filter_by_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('orders.all_status')}</SelectItem>
                <SelectItem value="pending">{t('orders.pending')}</SelectItem>
                <SelectItem value="in_progress">{t('orders.in_progress')}</SelectItem>
                <SelectItem value="needs_approval">{t('recon.needs_approval')}</SelectItem>
                <SelectItem value="completed">{t('orders.completed')}</SelectItem>
                <SelectItem value="ready_for_sale">{t('recon.ready_for_sale')}</SelectItem>
                <SelectItem value="cancelled">{t('orders.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportOrders}>
              <Download className="h-4 w-4 mr-2" />
              {t('orders.export')}
            </Button>
            <Button size="sm" onClick={handleCreateOrder}>
              <Plus className="h-4 w-4 mr-2" />
              {t('recon.new_recon_order')}
            </Button>
          </div>
        </div>

        {/* Tabs for different order views */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {t('orders.all')} ({tabCounts.all})
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {t('orders.pending')} ({tabCounts.pending})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {t('orders.in_progress')} ({tabCounts.inProgress})
            </TabsTrigger>
            <TabsTrigger value="needsApproval" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-orange-500" />
              {t('recon.needs_approval')} ({tabCounts.needsApproval})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {t('orders.completed')} ({tabCounts.completed})
            </TabsTrigger>
            <TabsTrigger value="readyForSale" className="flex items-center gap-1">
              <Package className="h-3 w-3 text-blue-500" />
              {t('recon.ready_for_sale')} ({tabCounts.readyForSale})
            </TabsTrigger>
            <TabsTrigger value="today" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t('orders.today')} ({tabCounts.today})
            </TabsTrigger>
            <TabsTrigger value="tomorrow" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {t('orders.tomorrow')} ({tabCounts.tomorrow})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            {/* Recon Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  {t('pages.recon_orders')} ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">{t('common.loading')}</p>
                    </div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-semibold text-muted-foreground">
                      {t('recon.no_orders_found')}
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t('recon.create_first_order')}
                    </p>
                    <Button onClick={handleCreateOrder}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t('recon.new_recon_order')}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('orders.order_number')}</TableHead>
                        <TableHead>{t('recon.stock_number')}</TableHead>
                        <TableHead>{t('orders.vehicle')}</TableHead>
                        <TableHead>{t('orders.vin')}</TableHead>
                        <TableHead>{t('recon.condition')}</TableHead>
                        <TableHead>{t('recon.recon_cost')}</TableHead>
                        <TableHead>{t('orders.status')}</TableHead>
                        <TableHead className="text-right">{t('orders.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.stockNumber || t('common.no_stock')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                              </p>
                              {order.reconCategory && (
                                <p className="text-xs text-muted-foreground capitalize">
                                  {order.reconCategory.replace('-', ' ')}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {order.vehicleVin}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                order.conditionGrade === 'excellent' ? 'default' :
                                order.conditionGrade === 'good' ? 'secondary' :
                                order.conditionGrade === 'fair' ? 'outline' : 
                                'destructive'
                              }
                              className="capitalize"
                            >
                              {order.conditionGrade}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.reconCost ? (
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {order.reconCost.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={order.status as any} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Modal */}
      <ReconOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleSubmitOrder}
        order={selectedOrder}
        mode={editMode}
      />

      {/* Detail View Modal */}
      {selectedOrder && (
        <EnhancedOrderDetailModal
          open={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          order={selectedOrder}
          onEdit={handleEditOrder}
          onDelete={deleteOrder}
          onStatusChange={(orderId, newStatus) => updateOrder(orderId, { status: newStatus })}
        />
      )}
    </DashboardLayout>
  );
}