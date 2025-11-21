import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CommentsTooltip } from '@/components/ui/comments-tooltip';
import { NotesTooltip } from '@/components/ui/notes-tooltip';
import { DueDateIndicator } from '@/components/ui/due-date-indicator';
import { DuplicateBadge } from '@/components/ui/duplicate-badge';
import { DuplicateTooltip } from '@/components/ui/duplicate-tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDuplicateDetection } from '@/hooks/useDuplicateDetection';
import { Order } from '@/hooks/useOrderManagement';
import { usePermissions } from '@/hooks/usePermissions';
import { usePrintOrder } from '@/hooks/usePrintOrder';
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { cn } from '@/lib/utils';
import '@/styles/order-animations.css';
import { safeParseDate } from '@/utils/dateUtils';
import {
    calculateTimeStatus,
    getAttentionRowClasses,
    isSameDayOrder,
    isTimeBasedOrder
} from '@/utils/dueDateUtils';
import { orderEvents } from '@/utils/eventBus';
import { dev, error as logError } from '@/utils/logger';
import { getOrderAnimationClass } from '@/utils/orderAnimationUtils';
import { formatOrderNumber } from '@/utils/orderUtils';
import { getStatusRowColor } from '@/utils/statusUtils';
import {
    Building2,
    Calendar,
    Car,
    Clock,
    Edit,
    Eye,
    MessageSquare,
    Printer,
    Trash2,
    StickyNote
} from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { ServicesDisplay } from './ServicesDisplay';
import { SkeletonLoader } from './SkeletonLoader';

// Constants for magic numbers
const DEFAULT_PAGE_SIZE = 25;

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

interface MobileActionsProps {
  order: Order;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

interface OrderDataTableProps {
  orders: Order[];
  loading: boolean;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
  onView: (order: Order) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  tabType: 'sales' | 'service' | 'recon' | 'carwash';
}

export const OrderDataTable = memo(function OrderDataTable({ orders, loading, onEdit, onDelete, onView, onStatusChange, tabType }: OrderDataTableProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { printOrder, previewPrint } = usePrintOrder();
  const { canEditOrder, canDeleteOrder } = usePermissions();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const isMobile = useIsMobile();
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

  // Auto-reset pagination when orders data changes to prevent empty pages
  useEffect(() => {
    const totalPages = Math.ceil(orders.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      dev(`📄 Auto-resetting pagination: page ${currentPage} > ${totalPages} total pages`);
      setCurrentPage(1);
    }
  }, [orders.length, currentPage, itemsPerPage]);

  // Optimized duplicate detection using custom hook
  // Benefits: Debounced recalculation, dealer-scoped caching, non-blocking UI
  const duplicateData = useDuplicateDetection(orders, {
    debounceMs: 300, // Wait 300ms after last change before recalculating
    cacheByDealer: true // Enable dealer-scoped caching for better multi-tenant performance
  });

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      // Check permission before attempting to change status
      const allowed = await canUpdateStatus(
        order.dealer_id?.toString() || '',
        order.status || '',
        newStatus,
        order.order_type // Pass orderType for correct permission validation
      );

      if (!allowed) {
        toast({
          variant: 'destructive',
          description: t('errors.no_permission_status_change', 'You do not have permission to change order status')
        });
        return;
      }

      // FIX: Delegate DB update to parent to avoid duplicate SMS
      // Parent (SalesOrders/ServiceOrders/etc) handles:
      // - updateOrderStatus() → DB update + SMS notification
      // - Success toast
      // - Query invalidation
      // Child only validates permissions and dispatches UI events
      dev(`Delegating status update for order ${orderId} to parent handler`);

      if (onStatusChange) {
        await onStatusChange(orderId, newStatus);
      }

      // Dispatch custom event for real-time updates (for Sales Orders)
      window.dispatchEvent(new CustomEvent('orderStatusUpdated', {
        detail: { orderId, newStatus, timestamp: Date.now() }
      }));

      // Emit to eventBus for Service/Recon/CarWash orders
      orderEvents.emit('orderStatusUpdated', {
        orderId,
        newStatus,
        timestamp: Date.now()
      });

    } catch (error) {
      logError('Failed to update status:', error);
      toast({
        variant: 'destructive',
        description: t('errors.status_update_failed', 'Failed to update order status')
      });
    }
  };

  // Copy VIN to clipboard
  const copyVinToClipboard = async (vin: string) => {
    try {
      await navigator.clipboard.writeText(vin);
      toast({
        description: t('common.vin_copied', 'VIN copied to clipboard')
      });
    } catch (error) {
      logError('Failed to copy VIN:', error);
      toast({
        variant: 'destructive',
        description: t('errors.copy_vin_failed', 'Failed to copy VIN')
      });
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
      return { text: t('data_table.days_overdue', { days: Math.abs(diffDays) }), variant: 'destructive' as const, className: 'bg-destructive text-destructive-foreground whitespace-nowrap' };
    } else if (diffDays === 0) {
      return { text: t('data_table.due_today'), variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' };
    } else if (diffDays === 1) {
      return { text: t('data_table.due_tomorrow'), variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: t('data_table.due_in_days', { days: diffDays }), variant: 'outline' as const, className: 'border-border text-foreground' };
    }
  };

  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  // Calculate range for pagination display
  const startRange = orders.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endRange = Math.min(currentPage * itemsPerPage, orders.length);

  if (loading) {
    return (
      <>
        {/* Mobile Skeleton */}
        <div className="block lg:hidden space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-32" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-16 bg-muted rounded" />
                    <div className="h-16 bg-muted rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Desktop Skeleton */}
        <div className="hidden lg:block">
          <SkeletonLoader variant="table" rows={10} />
        </div>
      </>
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
            ? getAttentionRowClasses(calculateTimeStatus(order.dueDate, order.status).attentionLevel)
            : '';

          return (
            <Card key={order.id} className={cn("border-border shadow-sm", attentionClasses)}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-foreground">
                          {formatOrderNumber(order)}
                        </span>
                        {/* Comments Indicator */}
                        {typeof order.comments === 'number' && order.comments > 0 && (
                          <CommentsTooltip
                            orderId={order.id}
                            count={order.comments}
                            onViewAllClick={() => onView(order)}
                          >
                            <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                              <span className="text-xs font-semibold text-blue-600">{order.comments}</span>
                            </span>
                          </CommentsTooltip>
                        )}
                        {/* Notes Indicator */}
                        {order.notes && order.notes.trim() !== '' && (
                          <NotesTooltip
                            noteContent={order.notes}
                            onViewClick={() => onView(order)}
                          >
                            <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors">
                              <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                            </span>
                          </NotesTooltip>
                        )}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Building2 className="w-4 h-4 mr-2 text-gray-700 flex-shrink-0" />
                        <span className="whitespace-nowrap truncate">{order.dealershipName || t('data_table.unknown_dealer')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <StatusBadgeInteractive
                        status={order.status}
                        orderId={order.id}
                        dealerId={order.dealer_id?.toString() || ''}
                        orderType={order.order_type}
                        onStatusChange={handleStatusChange}
                      />
                      {/* Due Date Indicator for time-based orders */}
                      {isTimeBasedOrder(tabType) &&
                       isSameDayOrder(order.createdAt, order.dueDate) && (
                        <DueDateIndicator
                          dueDate={order.dueDate}
                          orderStatus={order.status}
                          orderType={tabType}
                          compact={false}
                          showDateTime={true}
                        />
                      )}
                    </div>
                  </div>

                  {/* Vehicle and Stock Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-2 rounded">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</label>
                      <div className="text-sm font-semibold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                        {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                      </div>
                      <DuplicateTooltip
                        orders={duplicateData.vinDuplicateOrders.get(order.id) || []}
                        field="vehicleVin"
                        value={order.vehicleVin || ''}
                        onOrderClick={onView}
                        debug={import.meta.env.DEV}
                      >
                        <span
                          className="inline-flex items-baseline gap-2 cursor-pointer hover:text-orange-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis mt-1 leading-none"
                          onClick={() => order.vehicleVin && copyVinToClipboard(order.vehicleVin)}
                          title={order.vehicleVin ? `Last 8 VIN - Tap to copy full: ${order.vehicleVin}` : 'No VIN'}
                        >
                          {order.vehicleVin ? (
                            <>
                              <span className="text-xs text-muted-foreground/60">L8V: </span>
                              <span className="font-mono text-base font-semibold text-foreground">{order.vehicleVin.slice(-8)}</span>
                              <DuplicateBadge count={(duplicateData.vinDuplicateOrders.get(order.id) || []).length} inline={true} />
                            </>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('data_table.vin_not_provided')}</span>
                          )}
                        </span>
                      </DuplicateTooltip>
                    </div>
                    <div className="p-2 rounded">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {tabType === 'service' ? 'Tag' : 'Stock'}
                      </label>
                      {order.stockNumber || order.tag ? (
                        <DuplicateTooltip
                          orders={duplicateData.stockDuplicateOrders.get(order.id) || []}
                          field="stockNumber"
                          value={order.stockNumber || order.tag || ''}
                          onOrderClick={onView}
                          debug={import.meta.env.DEV}
                        >
                          <span className="inline-flex items-baseline gap-2 text-sm font-semibold text-foreground cursor-pointer hover:text-gray-700 transition-colors leading-none">
                            {order.stockNumber || order.tag || 'N/A'}
                            <DuplicateBadge count={(duplicateData.stockDuplicateOrders.get(order.id) || []).length} inline={true} />
                          </span>
                        </DuplicateTooltip>
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {t('data_table.no_stock')}
                        </span>
                      )}
                      {/* Assigned To / Created By (for recon) */}
                      {tabType === 'recon' && (order as any).createdByName ? (
                        <div className="text-sm font-semibold text-foreground mt-2">
                          {(order as any).createdByName}
                        </div>
                      ) : order.assignedTo && (
                        <div className="text-sm font-semibold text-foreground mt-2">
                          {order.assignedTo}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Due Date / Completed Date Row */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {(tabType === 'recon' || tabType === 'carwash') ? t('recon.completion_date') : 'Due'}
                    </label>
                    <div className="flex flex-col gap-1">
                      <div className="text-sm font-semibold">
                        {(tabType === 'recon' || tabType === 'carwash') ? (
                          order.completedAt || order.completed_at ? (
                            <>
                              {new Date(order.completedAt || order.completed_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </>
                          ) : (
                            t('data_table.no_date_set')
                          )
                        ) : (
                          <>
                            {order.dueTime || '12:00 PM'} - {order.dueDate ? new Date(order.dueDate).toLocaleDateString() : 'No date'}
                          </>
                        )}
                      </div>

                      {/* Waiter indicator for CarWash orders */}
                      {tabType === 'carwash' && order.isWaiter && (
                        <span className="inline-flex items-center gap-0.5 bg-destructive/10 px-1.5 py-0.5 rounded" title={t('car_wash_orders.waiter_priority')}>
                          <Clock className="w-3.5 h-3.5 text-destructive animate-pulse" />
                          <span className="text-xs font-semibold text-destructive">Waiter</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onView(order)}
                      className="flex items-center gap-2 text-foreground dark:text-gray-200 hover:bg-muted/50 dark:hover:bg-muted/30 transition-all hover:scale-105"
                    >
                      <Eye className="h-4 w-4" />
                      {t('data_table.view')}
                    </Button>

                    {/* Edit - Only if user can edit this specific order */}
                    {canEditOrder(order) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(order)}
                        className="flex items-center gap-2 text-emerald-600 hover:bg-emerald-50 transition-all hover:scale-105"
                      >
                        <Edit className="h-4 w-4" />
                        {t('data_table.edit')}
                      </Button>
                    )}

                    {/* Delete - Only if user can delete orders (system admin only) */}
                    {canDeleteOrder(order) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(order.id)}
                        className="flex items-center gap-2 text-rose-600 hover:bg-rose-50 transition-all hover:scale-105"
                      >
                        <Trash2 className="h-4 w-4" />
                        {t('data_table.delete')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Mobile Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="text-sm text-muted-foreground font-medium">
              {t('data_table.showing_range', { start: startRange, end: endRange, total: orders.length })}
            </div>
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="flex items-center px-3 text-sm text-muted-foreground">
                {t('data_table.page_of', { current: currentPage, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop/Tablet Table Layout */}
      <Card className="hidden lg:block border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">
{t('data_table.orders_count', { count: orders.length })}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-16 font-medium text-foreground text-center">#</TableHead>
                <TableHead className="w-[140px] font-medium text-foreground text-center">Order ID</TableHead>
                <TableHead className="font-medium text-foreground text-center">
                  {tabType === 'service' ? 'Tag' : tabType === 'carwash' ? 'Tag/Stock' : 'Stock'}
                </TableHead>
                <TableHead className="max-w-[200px] font-medium text-foreground text-center">Vehicle</TableHead>
                <TableHead className="font-medium text-foreground text-center">{t('orders.services')}</TableHead>
                <TableHead className="font-medium text-foreground text-center">{(tabType === 'recon' || tabType === 'carwash') ? t('recon.completion_date') : 'Due'}</TableHead>
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
                  ? getAttentionRowClasses(calculateTimeStatus(order.dueDate, order.status).attentionLevel)
                  : '';

                return (
                  <TableRow
                    key={order.id}
                    className={cn(
                      "border-border transition-colors cursor-pointer hover:bg-muted/50",
                      getStatusRowColor(order.status),
                      attentionClasses,
                      getOrderAnimationClass(order.status, order.dueDate)
                    )}
                    onDoubleClick={() => onView(order)}
                  >
                    {/* Row Number */}
                    <TableCell className="py-1 text-center text-sm font-medium text-muted-foreground">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </TableCell>

                    {/* Column 1: Order ID & Dealer */}
                    <TableCell className="py-1 text-center w-[140px]">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-base font-bold text-foreground">
                            {formatOrderNumber(order)}
                          </span>
                          {/* Comments Indicator */}
                          {typeof order.comments === 'number' && order.comments > 0 && (
                            <CommentsTooltip
                              orderId={order.id}
                              count={order.comments}
                              onViewAllClick={() => onView(order)}
                            >
                              <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors">
                                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-xs font-semibold text-blue-600">{order.comments}</span>
                              </span>
                            </CommentsTooltip>
                          )}
                          {/* Notes Indicator */}
                          {order.notes && order.notes.trim() !== '' && (
                            <NotesTooltip
                              noteContent={order.notes}
                              onViewClick={() => onView(order)}
                            >
                              <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors">
                                <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                              </span>
                            </NotesTooltip>
                          )}
                        </div>
                        <div className="flex items-center justify-center text-sm text-muted-foreground">
                          <Building2 className="w-3 h-3 mr-1 text-gray-700 flex-shrink-0" />
                          <span className="whitespace-nowrap truncate">{order.dealershipName || t('data_table.unknown_dealer')}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Column 2: Stock */}
                    <TableCell className="py-1 text-center">
                      <div className="space-y-0.5">
                        {order.stockNumber || order.tag ? (
                          <DuplicateTooltip
                            orders={duplicateData.stockDuplicateOrders.get(order.id) || []}
                            field="stockNumber"
                            value={order.stockNumber || order.tag || ''}
                            onOrderClick={onView}
                            debug={import.meta.env.DEV}
                          >
                            <span className="inline-flex items-baseline gap-2 text-base font-bold text-foreground cursor-pointer hover:text-gray-700 transition-colors leading-none">
                              {order.stockNumber || order.tag || 'N/A'}
                              <DuplicateBadge count={(duplicateData.stockDuplicateOrders.get(order.id) || []).length} inline={true} />
                            </span>
                          </DuplicateTooltip>
                        ) : (
                          <span className="text-base font-bold text-muted-foreground">
                            {t('data_table.no_stock')}
                          </span>
                        )}
                        {/* Assigned To / Created By (for recon) */}
                        {tabType === 'recon' && (order as any).createdByName ? (
                          <div className="text-sm text-muted-foreground font-semibold whitespace-nowrap">
                            {(order as any).createdByName}
                          </div>
                        ) : order.assignedTo && (
                          <div className="text-sm text-muted-foreground font-semibold whitespace-nowrap">
                            {order.assignedTo}
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Column 3: Vehicle */}
                    <TableCell className="py-1 text-center max-w-[200px]">
                      <div className="space-y-0">
                        <div className="text-base font-bold text-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                          {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                          {order.vehicleTrim && ` (${order.vehicleTrim})`}
                        </div>
                        <DuplicateTooltip
                          orders={duplicateData.vinDuplicateOrders.get(order.id) || []}
                          field="vehicleVin"
                          value={order.vehicleVin || ''}
                          onOrderClick={onView}
                          debug={import.meta.env.DEV}
                        >
                          <span
                            className="inline-flex items-baseline gap-2 cursor-pointer hover:bg-orange-50 px-2 py-0.5 rounded transition-colors whitespace-nowrap text-sm text-muted-foreground leading-none"
                            onClick={() => order.vehicleVin && copyVinToClipboard(order.vehicleVin)}
                            title={order.vehicleVin ? `Last 8 VIN - Click to copy full: ${order.vehicleVin}` : 'No VIN'}
                          >
                            {order.vehicleVin ? (
                              <>
                                <span className="text-xs text-muted-foreground/60">L8V: </span>
                                <span className="font-mono text-base font-semibold text-foreground">{order.vehicleVin.slice(-8)}</span>
                                <DuplicateBadge count={(duplicateData.vinDuplicateOrders.get(order.id) || []).length} inline={true} />
                              </>
                            ) : (
                              <span className="text-sm">{t('data_table.vin_not_provided')}</span>
                            )}
                          </span>
                        </DuplicateTooltip>
                      </div>
                    </TableCell>

                    {/* Column 4: Services */}
                    <TableCell className="py-1 text-left">
                      <ServicesDisplay
                        services={order.services}
                        totalAmount={order.totalAmount || order.total_amount}
                        dealerId={order.dealer_id}
                        variant="table"
                        maxServicesShown={3}
                        className="min-w-[120px]"
                      />
                    </TableCell>

                    {/* Column 6: Due Date/Time or Completed Date - Dynamic based on order type */}
                    <TableCell className="py-1 text-center">
                      <div className="flex flex-col items-center justify-center h-full gap-1">
                        {(tabType === 'recon' || tabType === 'carwash') ? (
                          // For recon and carwash orders, show completed_at instead of due date
                          <>
                            {order.completedAt || order.completed_at ? (
                              <div className="text-sm font-medium text-foreground">
                                <div className="flex items-center justify-center gap-1">
                                  <Calendar className="w-4 h-4 text-emerald-600" />
                                  <span>
                                    {new Date(order.completedAt || order.completed_at).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                {t('data_table.no_date_set')}
                              </div>
                            )}

                            {/* Waiter indicator for CarWash orders */}
                            {tabType === 'carwash' && order.isWaiter && (
                              <span className="inline-flex items-center gap-0.5 bg-destructive/10 px-1.5 py-0.5 rounded" title={t('car_wash_orders.waiter_priority')}>
                                <Clock className="w-3.5 h-3.5 text-destructive animate-pulse" />
                                <span className="text-xs font-semibold text-destructive">Waiter</span>
                              </span>
                            )}
                          </>
                        ) : (
                          // For other orders (sales, service), use DueDateIndicator
                          <>
                            <DueDateIndicator
                              dueDate={order.dueDate}
                              orderStatus={order.status}
                              orderType={tabType}
                              compact={false}
                              showDateTime={true}
                              className="due-date-indicator-table min-w-[140px] whitespace-nowrap"
                            />

                            {/* Fallback time display if no due date */}
                            {!order.dueDate && (
                              <div className="text-sm text-muted-foreground text-center due-date-details">
                                <Calendar className="w-4 h-4 mr-1 text-gray-700 inline" />
                                {order.dueTime || t('data_table.no_time_set')}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>

                    {/* Column 6: Interactive Status */}
                    <TableCell className="py-1 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <StatusBadgeInteractive
                          status={order.status}
                          orderId={order.id}
                          dealerId={order.dealer_id?.toString() || ''}
                          orderType={order.order_type}
                          onStatusChange={handleStatusChange}
                        />
                      </div>
                    </TableCell>

                    {/* Column 7: Action Buttons (Simplified) */}
                    <TableCell className="py-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onView(order)}
                          className="h-8 w-8 p-0 transition-all hover:scale-105"
                          title={t('data_table.view_details')}
                        >
                          <Eye className="h-4 w-4 text-gray-700" />
                        </Button>

                        {/* Edit - Only if user can edit this specific order */}
                        {canEditOrder(order) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(order)}
                            className="h-8 w-8 p-0 transition-all hover:scale-105"
                            title={t('data_table.edit_order')}
                          >
                            <Edit className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => previewPrint(order)}
                          className="h-8 w-8 p-0 transition-all hover:scale-105"
                          title={t('data_table.print_order')}
                        >
                          <Printer className="h-4 w-4 text-gray-700" />
                        </Button>

                        {/* Delete - Only if user can delete orders (system admin only) */}
                        {canDeleteOrder(order) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(order.id)}
                            className="h-8 w-8 p-0 transition-all hover:scale-105"
                            title={t('data_table.delete_order')}
                          >
                            <Trash2 className="h-4 w-4 text-rose-600" />
                          </Button>
                        )}
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
                      <p className="text-lg font-medium">{t('data_table.no_orders_found')}</p>
                      <p className="text-sm">{t('data_table.adjust_filters_or_create')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Desktop Pagination */}
        {orders.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-4 border-t">
            {/* Info Row with Items Per Page Selector */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground font-medium">
                {t('data_table.showing_range', { start: startRange, end: endRange, total: orders.length })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('data_table.items_per_page', 'Items per page:')}</span>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Pagination Buttons */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-3 text-sm text-muted-foreground">
                  {t('data_table.page_of', { current: currentPage, total: totalPages })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if critical props change
  return (
    prevProps.orders.length === nextProps.orders.length &&
    prevProps.loading === nextProps.loading &&
    prevProps.tabType === nextProps.tabType &&
    // Deep check: compare order IDs and statuses to detect changes
    prevProps.orders.every((order, index) =>
      order.id === nextProps.orders[index]?.id &&
      order.status === nextProps.orders[index]?.status
    )
  );
});
