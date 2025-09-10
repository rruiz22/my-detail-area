import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2, 
  QrCode, 
  MessageSquare, 
  CheckCircle, 
  Loader2,
  User,
  Car,
  Calendar,
  Building2,
  Hash
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { orderNumberService } from '@/services/orderNumberService';
import { toast } from 'sonner';
import { safeParseDate } from '@/utils/dateUtils';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { getStatusRowColor } from '@/utils/statusUtils';

interface Order {
  id: string;
  createdAt: string;
  orderNumber?: string;
  customOrderNumber?: string;
  stockNumber?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleInfo?: string;
  customerName?: string;
  status: string;
  dealer_id?: number;
  dueDate?: string;
  totalAmount?: number;
  shortLink?: string;
  comments?: number;
  followers?: number;
}

interface StatusInfo {
  text: string;
  variant: "default" | "destructive" | "outline" | "secondary" | "success" | "warning";
  className: string;
}

interface OrderCardProps {
  order: Order;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

interface StatusBadgeProps {
  status: string;
}

interface StatusBadgeInteractiveProps {
  status: string;
  orderId: string;
  dealerId: string;
  canUpdateStatus: boolean;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

interface MobileActionsProps {
  order: Order;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

interface OrderDataTableProps {
  orders: any[];
  loading: boolean;
  onEdit: (order: any) => void;
  onDelete: (orderId: string) => void;
  onView: (order: any) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  tabType: string;
}

export function OrderDataTable({ orders, loading, onEdit, onDelete, onView, onStatusChange, tabType }: OrderDataTableProps) {
  const { t } = useTranslation();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isMobile = useIsMobile();
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

  // Format order number for display
  const formatOrderNumber = (order: any): string => {
    const orderNumber = order.orderNumber || order.customOrderNumber || order.order_number;
    
    // If already in new format, return as-is
    if (orderNumber && (orderNumber.includes('SA-') || orderNumber.includes('SE-') || 
                       orderNumber.includes('CW-') || orderNumber.includes('RC-'))) {
      return orderNumber;
    }
    
    // For legacy orders, add appropriate prefix based on order type
    const orderType = order.order_type || 'sales';
    const prefix = orderType === 'sales' ? 'SA' :
                  orderType === 'service' ? 'SE' :
                  orderType === 'carwash' ? 'CW' : 'RC';
    
    return orderNumber ? orderNumber : `${prefix}-${order.id.slice(0, 8)}`;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      const success = await updateOrderStatus(orderId, newStatus, order.dealer_id?.toString() || '');
      if (success) {
        console.log(`Status updated for order ${orderId} to ${newStatus}`);
        
        // Trigger immediate refresh of order data
        if (onStatusChange) {
          onStatusChange(orderId, newStatus);
        }
        
        // Dispatch custom event for real-time updates
        window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
          detail: { orderId, newStatus, timestamp: Date.now() }
        }));
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  // Copy VIN to clipboard
  const copyVinToClipboard = async (vin: string) => {
    try {
      await navigator.clipboard.writeText(vin);
      toast.success('VIN copied to clipboard');
    } catch (error) {
      console.error('Failed to copy VIN:', error);
      toast.error('Failed to copy VIN');
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for orders:`, selectedOrders);
  };

  const formatDueDate = (date: string) => {
    const orderDate = safeParseDate(date);
    if (!orderDate) {
      return { text: 'N/A', variant: 'secondary' as const };
    }
    
    const today = new Date();
    const diffTime = orderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} días vencido`, variant: 'destructive' as const, className: 'bg-destructive text-destructive-foreground' };
    } else if (diffDays === 0) {
      return { text: t('data_table.due_today'), variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' };
    } else if (diffDays === 1) {
      return { text: 'Vence mañana', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: `Vence en ${diffDays} días`, variant: 'outline' as const, className: 'border-border text-foreground' };
    }
  };

  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Mobile Card Layout */}
      <div className="block lg:hidden space-y-4">
        {paginatedOrders.map((order) => (
          <Card key={order.id} className="border-border shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-bold text-foreground">
                      {formatOrderNumber(order)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                      <span>{order.dealershipName || 'Premium Auto'}</span>
                    </div>
                  </div>
                  <StatusBadgeInteractive
                    status={order.status}
                    orderId={order.id}
                    dealerId={order.dealer_id?.toString() || ''}
                    canUpdateStatus={true}
                    onStatusChange={handleStatusChange}
                  />
                </div>

                {/* Vehicle and Stock Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</label>
                    <div className="text-sm font-semibold text-foreground">
                      {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                    </div>
                    <div 
                      className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-orange-600 mt-1"
                      onClick={() => order.vehicleVin && copyVinToClipboard(order.vehicleVin)}
                      title="Tap to copy VIN"
                    >
                      {order.vehicleVin || 'No VIN'}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stock</label>
                    <div className="text-sm font-semibold text-foreground">
                      {order.stockNumber || 'No Stock'}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <User className="w-3 h-3 mr-1 text-green-600" />
                      {order.advisor || 'Unassigned'}
                    </div>
                  </div>
                </div>

                {/* Due Date Row */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due</label>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">
                      {order.dueTime || '12:00 PM'} - {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No date'}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onView(order)}
                    className="flex items-center gap-2 text-blue-600 hover:bg-blue-50"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onEdit(order)}
                    className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onDelete(order.id)}
                    className="flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Mobile Pagination */}
        <div className="flex justify-center space-x-2 pt-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">
            Page {currentPage} of {Math.ceil(orders.length / itemsPerPage)}
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(orders.length / itemsPerPage), prev + 1))}
            disabled={currentPage >= Math.ceil(orders.length / itemsPerPage)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Desktop/Tablet Table Layout */}
      <Card className="hidden lg:block border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
            {orders.length} orders
          </CardTitle>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-medium text-foreground text-center">Order ID</TableHead>
              <TableHead className="font-medium text-foreground text-center">Stock</TableHead>
              <TableHead className="font-medium text-foreground text-center">Vehicle</TableHead>
              <TableHead className="font-medium text-foreground text-center">Due</TableHead>
              <TableHead className="font-medium text-foreground text-center">Status</TableHead>
              <TableHead className="font-medium text-foreground text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => (
              <TableRow 
                key={order.id} 
                className={`border-border transition-colors cursor-pointer hover:bg-muted/50 ${getStatusRowColor(order.status)}`}
                onDoubleClick={() => onView(order)}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                  />
                </TableCell>
                
                {/* Column 1: Order ID & Dealer */}
                <TableCell className="py-4 text-center">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-foreground">
                      {formatOrderNumber(order)}
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <Building2 className="w-3 h-3 mr-1 text-blue-600" />
                      <span>{order.dealershipName || 'Premium Auto'}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Column 2: Stock & Assigned User */}
                <TableCell className="py-4 text-center">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-foreground">
                      {order.stockNumber || t('data_table.no_stock')}
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <User className="w-3 h-3 mr-1 text-green-600" />
                      <span>{order.advisor || 'Unassigned'}</span>
                    </div>
                  </div>
                </TableCell>

                {/* Column 3: Vehicle & VIN */}
                <TableCell className="py-4 text-center">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-foreground">
                      {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                      {order.vehicleTrim && ` (${order.vehicleTrim})`}
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <Hash className="w-3 h-3 mr-1 text-orange-600" />
                      <span 
                        className="font-mono text-xs cursor-pointer hover:bg-orange-50 hover:text-orange-700 px-2 py-1 rounded transition-colors"
                        onClick={() => order.vehicleVin && copyVinToClipboard(order.vehicleVin)}
                        title="Click to copy VIN"
                      >
                        {order.vehicleVin || t('data_table.vin_not_provided')}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Column 4: Due Time & Date */}
                <TableCell className="py-4 text-center">
                  <div className="space-y-1">
                    <div className="text-base font-bold text-foreground">
                      {order.dueTime || '12:00 PM'}
                    </div>
                    <div className="flex items-center justify-center text-sm text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1 text-purple-600" />
                      <span>
                        {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No date set'}
                      </span>
                    </div>
                  </div>
                </TableCell>

                {/* Column 5: Interactive Status */}
                <TableCell className="py-4 text-center">
                  <StatusBadgeInteractive
                    status={order.status}
                    orderId={order.id}
                    dealerId={order.dealer_id?.toString() || ''}
                    canUpdateStatus={true}
                    onStatusChange={handleStatusChange}
                  />
                </TableCell>

                {/* Column 6: Colorful Action Buttons */}
                <TableCell className="py-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onView(order)}
                      className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300 transition-all hover:scale-105"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onEdit(order)}
                      className="h-8 w-8 p-0 hover:bg-emerald-50 hover:border-emerald-300 transition-all hover:scale-105"
                      title="Edit Order"
                    >
                      <Edit className="h-4 w-4 text-emerald-600" />
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onDelete(order.id)}
                      className="h-8 w-8 p-0 hover:bg-rose-50 hover:border-rose-300 transition-all hover:scale-105"
                      title="Delete Order"
                    >
                      <Trash2 className="h-4 w-4 text-rose-600" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {paginatedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center space-y-2">
                    <Car className="w-12 h-12 text-muted-foreground/50" />
                    <p className="text-lg font-medium">No se encontraron órdenes</p>
                    <p className="text-sm">Intenta ajustar los filtros o crear una nueva orden</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
    </>
  );
}
