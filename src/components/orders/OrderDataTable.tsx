import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { 
  getDuplicateCount, 
  getDuplicateOrders, 
  getDuplicateCellBackground 
} from '@/utils/duplicateUtils';
import { DuplicateBadge } from '@/components/ui/duplicate-badge';
import { DuplicateTooltip } from '@/components/ui/duplicate-tooltip';
import { DueDateIndicator, useDueDateAttention } from '@/components/ui/due-date-indicator';
import { 
  isSameDayOrder, 
  isTimeBasedOrder, 
  getAttentionRowClasses,
  calculateTimeStatus
} from '@/utils/dueDateUtils';
import { formatOrderNumber } from '@/utils/orderUtils';
import { cn } from '@/lib/utils';

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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isMobile = useIsMobile();
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

  // Enhanced memoized duplicate detection with caching
  const duplicateData = useMemo(() => {
    const startTime = performance.now();
    // Debug only on first calculation or significant data changes
    if (import.meta.env.DEV && orders.length > 100) {
      console.log('🔄 Calculating duplicates for', orders.length, 'orders...');
    }
    
    const stockDuplicates = new Map<string, number>();
    const vinDuplicates = new Map<string, number>();
    const stockDuplicateOrders = new Map<string, Order[]>();
    const vinDuplicateOrders = new Map<string, Order[]>();
    
    // More efficient duplicate detection using grouping
    const stockGroups = new Map<string, Order[]>();
    const vinGroups = new Map<string, Order[]>();
    
    // Group orders by normalized values
    orders.forEach(order => {
      // Group by stock number
      if (order.stockNumber && order.stockNumber.trim()) {
        const normalizedStock = order.stockNumber.trim().toLowerCase();
        const key = `${normalizedStock}-${order.dealer_id || 'no-dealer'}`;
        if (!stockGroups.has(key)) {
          stockGroups.set(key, []);
        }
        stockGroups.get(key)!.push(order);
      }
      
      // Group by VIN
      if (order.vehicleVin && order.vehicleVin.trim()) {
        const normalizedVin = order.vehicleVin.trim().toLowerCase().replace(/[-\s]/g, '');
        const key = `${normalizedVin}-${order.dealer_id || 'no-dealer'}`;
        if (!vinGroups.has(key)) {
          vinGroups.set(key, []);
        }
        vinGroups.get(key)!.push(order);
      }
    });
    
    // Process stock duplicates
    stockGroups.forEach((groupOrders, key) => {
      if (groupOrders.length > 1) {
        groupOrders.forEach(order => {
          stockDuplicates.set(order.id, groupOrders.length);
          stockDuplicateOrders.set(order.id, groupOrders);
        });
      }
    });
    
    // Process VIN duplicates
    vinGroups.forEach((groupOrders, key) => {
      if (groupOrders.length > 1) {
        groupOrders.forEach(order => {
          vinDuplicates.set(order.id, groupOrders.length);
          vinDuplicateOrders.set(order.id, groupOrders);
        });
      }
    });
    
    const endTime = performance.now();
    const duplicateStats = {
      stockDuplicateGroups: stockGroups.size,
      vinDuplicateGroups: vinGroups.size,
      stockDuplicateOrders: stockDuplicates.size,
      vinDuplicateOrders: vinDuplicates.size,
      calculationTime: `${(endTime - startTime).toFixed(2)}ms`
    };
    
    // Only log performance stats for larger datasets
    if (import.meta.env.DEV && orders.length > 100) {
      console.log('✅ Duplicate calculation complete:', duplicateStats);
    }
    
    return { 
      stockDuplicates, 
      vinDuplicates, 
      stockDuplicateOrders, 
      vinDuplicateOrders,
      stats: duplicateStats
    };
  }, [orders]);

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
        {paginatedOrders.map((order) => {
          // Calculate attention level for row styling
          const showDueDateIndicator = isTimeBasedOrder(tabType) && 
                                      isSameDayOrder(order.createdAt, order.dueDate) &&
                                      order.status !== 'completed' && 
                                      order.status !== 'cancelled';
          const attentionClasses = showDueDateIndicator && order.dueDate 
            ? getAttentionRowClasses(calculateTimeStatus(order.dueDate).attentionLevel)
            : '';

          return (
            <Card key={order.id} className={cn("border-border shadow-sm", attentionClasses)}>
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
                        <span>{order.dealershipName || 'Unknown Dealer'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadgeInteractive
                        status={order.status}
                        orderId={order.id}
                        dealerId={order.dealer_id?.toString() || ''}
                        canUpdateStatus={true}
                        onStatusChange={handleStatusChange}
                      />
                      {/* Due Date Indicator for time-based orders */}
                      {isTimeBasedOrder(tabType) && 
                       isSameDayOrder(order.createdAt, order.dueDate) && (
                        <DueDateIndicator 
                          dueDate={order.dueDate}
                          orderType={tabType}
                          compact={false}
                        />
                      )}
                    </div>
                  </div>

                  {/* Vehicle and Stock Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={cn("p-2 rounded", getDuplicateCellBackground(0))}>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</label>
                      <div className="text-sm font-semibold text-foreground">
                        {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                      </div>
                      <div className="relative inline-block mt-1">
                        <DuplicateTooltip
                          orders={duplicateData.vinDuplicateOrders.get(order.id) || []}
                          field="vehicleVin"
                          value={order.vehicleVin || ''}
                          onOrderClick={onView}
                          debug={import.meta.env.DEV}
                        >
                          <div 
                            className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-orange-600 transition-colors"
                            onClick={() => order.vehicleVin && copyVinToClipboard(order.vehicleVin)}
                            title="Tap to copy VIN"
                          >
                            {order.vehicleVin || 'No VIN'}
                          </div>
                        </DuplicateTooltip>
                        <DuplicateBadge count={(duplicateData.vinDuplicateOrders.get(order.id) || []).length} />
                      </div>
                    </div>
                    <div className={cn("p-2 rounded", getDuplicateCellBackground(0))}>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stock</label>
                      <div className="relative inline-block">
                        <DuplicateTooltip
                          orders={duplicateData.stockDuplicateOrders.get(order.id) || []}
                          field="stockNumber"
                          value={order.stockNumber || ''}
                          onOrderClick={onView}
                          debug={import.meta.env.DEV}
                        >
                          <div className="text-sm font-semibold text-foreground cursor-pointer hover:text-blue-600 transition-colors">
                            {order.stockNumber || 'No Stock'}
                          </div>
                        </DuplicateTooltip>
                        <DuplicateBadge count={(duplicateData.stockDuplicateOrders.get(order.id) || []).length} />
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground mt-1">
                        <User className="w-3 h-3 mr-1 text-green-600" />
                        {order.assignedTo || 'Unassigned'}
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
                      variant="ghost" 
                      size="sm"
                      onClick={() => onView(order)}
                      className="flex items-center gap-2 text-blue-600 hover:bg-blue-50 transition-all hover:scale-105"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onEdit(order)}
                      className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 transition-all hover:scale-105"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onDelete(order.id)}
                      className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-all hover:scale-105"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
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
                <TableHead className="w-16 font-medium text-foreground text-center">#</TableHead>
                <TableHead className="font-medium text-foreground text-center">Order ID</TableHead>
                <TableHead className="font-medium text-foreground text-center">Stock</TableHead>
                <TableHead className="font-medium text-foreground text-center">Vehicle</TableHead>
                <TableHead className="font-medium text-foreground text-center">Due</TableHead>
                <TableHead className="font-medium text-foreground text-center">Status</TableHead>
                <TableHead className="font-medium text-foreground text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order, index) => {
                // Calculate attention level for row styling
                const showDueDateIndicator = isTimeBasedOrder(tabType) && 
                                            isSameDayOrder(order.createdAt, order.dueDate) &&
                                            order.status !== 'completed' && 
                                            order.status !== 'cancelled';
                const attentionClasses = showDueDateIndicator && order.dueDate 
                  ? getAttentionRowClasses(calculateTimeStatus(order.dueDate).attentionLevel)
                  : '';

                return (
                  <TableRow 
                    key={order.id} 
                    className={cn(
                      "border-border transition-colors cursor-pointer hover:bg-muted/50",
                      getStatusRowColor(order.status),
                      attentionClasses
                    )}
                    onDoubleClick={() => onView(order)}
                  >
                    {/* Row Number */}
                    <TableCell className="py-4 text-center text-sm font-medium text-muted-foreground">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>
                    
                    {/* Column 1: Order ID & Dealer */}
                    <TableCell className="py-4 text-center">
                      <div className="space-y-1">
                        <div className="text-base font-bold text-foreground">
                          {formatOrderNumber(order)}
                        </div>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Building2 className="w-3 h-3 mr-1 text-blue-600" />
                          <span>{order.dealershipName || 'Unknown Dealer'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 2: Stock & Assigned User */}
                    <TableCell className={cn("py-4 text-center", getDuplicateCellBackground((duplicateData.stockDuplicateOrders.get(order.id) || []).length))}>
                      <div className="space-y-1">
                        <div className="relative inline-block">
                          <DuplicateTooltip
                            orders={duplicateData.stockDuplicateOrders.get(order.id) || []}
                            field="stockNumber"
                            value={order.stockNumber || ''}
                            onOrderClick={onView}
                            debug={import.meta.env.DEV}
                          >
                            <div className="text-base font-bold text-foreground cursor-pointer hover:text-blue-600 transition-colors">
                              {order.stockNumber || t('data_table.no_stock')}
                            </div>
                          </DuplicateTooltip>
                          <DuplicateBadge count={(duplicateData.stockDuplicateOrders.get(order.id) || []).length} />
                        </div>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <User className="w-3 h-3 mr-1 text-green-600" />
                          <span>{order.assignedTo || 'Unassigned'}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 3: Vehicle & VIN */}
                    <TableCell className={cn("py-4 text-center", getDuplicateCellBackground((duplicateData.vinDuplicateOrders.get(order.id) || []).length))}>
                      <div className="space-y-1">
                        <div className="text-base font-bold text-foreground">
                          {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                          {order.vehicleTrim && ` (${order.vehicleTrim})`}
                        </div>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Hash className="w-3 h-3 mr-1 text-orange-600" />
                          <div className="relative inline-block">
                            <DuplicateTooltip
                              orders={duplicateData.vinDuplicateOrders.get(order.id) || []}
                              field="vehicleVin"
                              value={order.vehicleVin || ''}
                              onOrderClick={onView}
                              debug={import.meta.env.DEV}
                            >
                              <span 
                                className="font-mono text-xs cursor-pointer hover:bg-orange-50 hover:text-orange-700 px-2 py-1 rounded transition-colors"
                                onClick={() => order.vehicleVin && copyVinToClipboard(order.vehicleVin)}
                                title="Click to copy VIN"
                              >
                                {order.vehicleVin || t('data_table.vin_not_provided')}
                              </span>
                            </DuplicateTooltip>
                            <DuplicateBadge count={(duplicateData.vinDuplicateOrders.get(order.id) || []).length} />
                          </div>
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
                      <div className="flex flex-col items-center gap-2">
                        <StatusBadgeInteractive
                          status={order.status}
                          orderId={order.id}
                          dealerId={order.dealer_id?.toString() || ''}
                          canUpdateStatus={true}
                          onStatusChange={handleStatusChange}
                        />
                        {/* Due Date Indicator for time-based orders */}
                        {showDueDateIndicator && (
                          <DueDateIndicator 
                            dueDate={order.dueDate}
                            orderType={tabType}
                            compact={true}
                          />
                        )}
                      </div>
                    </TableCell>

                    {/* Column 6: Colorful Action Buttons */}
                    <TableCell className="py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onView(order)}
                          className="h-8 w-8 p-0 transition-all hover:scale-105"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onEdit(order)}
                          className="h-8 w-8 p-0 transition-all hover:scale-105"
                          title="Edit Order"
                        >
                          <Edit className="h-4 w-4 text-emerald-600" />
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => onDelete(order.id)}
                          className="h-8 w-8 p-0 transition-all hover:scale-105"
                          title="Delete Order"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              
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