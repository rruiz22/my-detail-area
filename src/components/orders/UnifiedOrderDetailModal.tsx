import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { usePrintOrder } from '@/hooks/usePrintOrder';
import { useOrderDetailsPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import {
  Download,
  Edit2,
  Printer
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { OrderTasksSection } from './OrderTasksSection';
import { SkeletonLoader } from './SkeletonLoader';

// Phase 2: Import unified types
import type { OrderData as SystemOrderData } from '@/types/order';
import {
  UnifiedOrderData
} from '@/types/unifiedOrder';

// Type-specific field components
import { CarWashOrderFields } from './CarWashOrderFields';
import { ReconOrderFields } from './ReconOrderFields';
import { SalesOrderFields } from './SalesOrderFields';
import { ServiceOrderFields } from './ServiceOrderFields';

// Direct imports for better performance
import { EnhancedQRCodeBlock } from './EnhancedQRCodeBlock';
import { FollowersBlock } from './FollowersBlock';
import { RecentActivityBlock } from './RecentActivityBlock';
import { ScheduleViewBlock } from './ScheduleViewBlock';
import { ServicesDisplay } from './ServicesDisplay';
import { SimpleNotesDisplay } from './SimpleNotesDisplay';
import { TeamCommunicationBlock } from './TeamCommunicationBlock';

// Alias for backward compatibility and internal use
// Now OrderData refers to the unified type definition
type OrderData = UnifiedOrderData;

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  user_id: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
}

interface Follower {
  id: string;
  user_id: string;
  created_at: string;
}

interface Analytics {
  views?: number;
  scans?: number;
  last_accessed?: string;
}

interface ModalData {
  attachments: Attachment[];
  activities: Activity[];
  comments: Comment[];
  followers: Follower[];
  analytics: Analytics | null;
  userType: 'detail' | 'regular' | null;
}

type OrderType = 'sales' | 'service' | 'recon' | 'carwash';

// Constants for default values
const DEFAULT_DEALER_ID = '1';
const DEFAULT_DEALERSHIP_NAME = 'Premium Auto';

interface UnifiedOrderDetailModalProps {
  orderType: OrderType;
  order: OrderData;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: OrderData) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  isLoadingData?: boolean;
}

// Data normalization function - converts snake_case DB fields to camelCase
function normalizeOrderData(data: Record<string, unknown>): Partial<OrderData> {
  if (!data) return {};

  return {
    ...data,
    // Just spread all data and let TypeScript handle the rest
    id: data.id as string,
    status: data.status as OrderData['status'],
    dealer_id: data.dealer_id as string | number,
  } as Partial<OrderData>;
}

// Custom hook for QR props normalization
const useQRProps = (orderData: OrderData) => {
  return useMemo(() => ({
    qrCodeUrl: orderData.qr_code_url || orderData.qrCodeUrl,
    shortLink: orderData.short_link || orderData.shortLink,
    qrGenerationStatus: orderData.qr_generation_status || orderData.qrGenerationStatus
  }), [orderData.qr_code_url, orderData.qrCodeUrl, orderData.short_link, orderData.shortLink, orderData.qr_generation_status, orderData.qrGenerationStatus]);
};


// Header Components
interface UnifiedOrderHeaderProps {
  order: OrderData;
  orderType: OrderType;
  vehicleDisplayName: string;
  effectiveDealerId: string; // Required for StatusBadgeInteractive
  onStatusChange?: (orderId: string, newStatus: string) => void; // Optional to match parent interface
  canEditOrder?: boolean;
  onEdit?: () => void;
}

const UnifiedOrderHeader = memo(function UnifiedOrderHeader({
  order,
  orderType,
  vehicleDisplayName,
  effectiveDealerId,
  onStatusChange,
  canEditOrder,
  onEdit
}: UnifiedOrderHeaderProps) {
  const { t } = useTranslation();

  const orderNumber = useMemo(() =>
    order.orderNumber || order.order_number || 'New Order',
    [order.orderNumber, order.order_number]
  );

  // Get status background class (memoized)
  const getStatusBackgroundClass = useMemo(() => {
    switch (order.status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'in_progress':
        return 'bg-indigo-50 border-l-4 border-indigo-500';
      case 'completed':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'cancelled':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'on_hold':
        return 'bg-orange-50 border-l-4 border-orange-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  }, [order.status]);

  return (
    <div className={`${getStatusBackgroundClass} rounded-lg p-4 mb-6 shadow-sm`}>
      <div className="grid grid-cols-3 items-center gap-4">
        {/* Left: Order Number with Edit Button */}
        <div className="text-left flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            #{orderNumber}
          </h2>
          {/* Edit Button */}
          {canEditOrder && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm"
            >
              <Edit2 className="h-4 w-4" />
              {t('orders.edit')}
            </Button>
          )}
        </div>

        {/* Center: Main Information */}
        <div className="text-center space-y-1">
          {/* Stock + VIN - First Row (Prominent Title Style) */}
          <h1 className="text-xl font-bold text-gray-900 font-mono">
            {order.stockNumber || order.stock_number} - {(() => {
              const vin = order.vehicleVin || order.vehicle_vin;
              return vin && vin.length >= 8 ? vin.slice(-8) : (vin || 'N/A');
            })()}
          </h1>

          {/* Vehicle Info - Second Row (Subtitle Style) */}
          <div className="text-lg font-semibold text-gray-700">
            {vehicleDisplayName}
          </div>

          {/* Assigned To - Third Row */}
          <div className="text-sm font-medium text-gray-700">
            {order.assigned_to || order.assignedTo || order.salesperson || order.service_performer || t('common.unassigned')}
          </div>

          {/* Services - Fourth Row */}
          <div className="flex justify-center">
            <ServicesDisplay
              services={Array.isArray(order.services) ? order.services : []}
              totalAmount={order.total_amount || order.totalAmount}
              dealerId={Number(order.dealer_id)}
              variant="kanban"
              className="mt-1"
            />
          </div>
        </div>

        {/* Right: Status Dropdown */}
        <div className="text-right">
          {onStatusChange && (
            <StatusBadgeInteractive
              status={order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'}
              orderId={order.id}
              dealerId={effectiveDealerId}
              canUpdateStatus={true}
              onStatusChange={onStatusChange}
            />
          )}
        </div>
      </div>
    </div>
  );
});

// Order Type Fields Component Wrapper
interface OrderTypeFieldsProps {
  orderType: OrderType;
  order: OrderData;
}

const OrderTypeFields = memo(function OrderTypeFields({ orderType, order }: OrderTypeFieldsProps) {
  const renderTypeSpecificFields = () => {
    switch (orderType) {
      case 'sales':
        return <SalesOrderFields order={order} />;
      case 'service':
        return <ServiceOrderFields order={order} />;
      case 'recon':
        return <ReconOrderFields order={order} />;
      case 'carwash':
        return <CarWashOrderFields order={order} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {renderTypeSpecificFields()}
    </div>
  );
});

// Memoized main component with performance monitoring
export const UnifiedOrderDetailModal = memo(function UnifiedOrderDetailModal({
  orderType,
  order,
  open,
  onClose,
  onEdit,
  onStatusChange,
  isLoadingData = false
}: UnifiedOrderDetailModalProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissionContext();
  const { printOrder, previewPrint } = usePrintOrder();
  const [orderData, setOrderData] = useState(order);

  useEffect(() => {
    setOrderData(order);
  }, [order]);

  // Custom hook for normalized QR props
  const qrProps = useQRProps(orderData);

  // Compute effective dealer ID - prefer orderData, fallback to DEFAULT
  const effectiveDealerId = useMemo(() =>
    orderData.dealer_id ? String(orderData.dealer_id) : DEFAULT_DEALER_ID,
    [orderData.dealer_id]
  );

  // Check if user can edit orders
  const canEditOrder = useMemo(() => {
    if (!onEdit) {
      return false;
    }

    const permissionModuleMap = {
      sales: 'sales_orders',
      service: 'service_orders',
      recon: 'recon_orders',
      carwash: 'car_wash'
    } as const;

    const targetModule = permissionModuleMap[orderType];
    return hasPermission(targetModule, 'edit');
  }, [onEdit, hasPermission, orderType]);

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (canEditOrder && onEdit) {
      onEdit(orderData);
    }
  }, [canEditOrder, onEdit, orderData]);

  // Smart polling for order details when modal is open
  const orderDetailsQuery = useOrderDetailsPolling(
    ['order', order?.id || ''],
    async () => {
      if (!order?.id) return order;

      console.log(`🔄 Polling order details for ${order.id}`);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (error) throw error;
      return data;
    },
    open && !!order?.id
  );

  // Update orderData when polling returns new data
  useEffect(() => {
    if (orderDetailsQuery.data && orderDetailsQuery.data.id === order?.id) {
      // Normalize polling data to prevent snake_case overwriting camelCase
      const normalized = normalizeOrderData(orderDetailsQuery.data);

      setOrderData(prev => ({
        ...prev,
        ...normalized,
        // Preserve critical transformed fields that might be lost
        services: normalized.services !== undefined ? normalized.services : prev.services,
        vehicle_info: normalized.vehicle_info || prev.vehicle_info,
        // Preserve assignedTo if polling data doesn't have it (user name is transformed from JOIN, not in raw DB)
        assignedTo: normalized.assignedTo || prev.assignedTo,
        assigned_to: normalized.assigned_to || prev.assigned_to,
      }));
    }
  }, [orderDetailsQuery.data, order?.id]);

  // Error handling for polling failures
  useEffect(() => {
    if (orderDetailsQuery.error) {
      console.error('Order polling error:', orderDetailsQuery.error);
      toast.error(t('orders.polling_error') || 'Failed to refresh order data');
    }
  }, [orderDetailsQuery.error, t]);

  // Enhanced scroll behavior with better error handling
  useEffect(() => {
    if (!open) return;

    const scrollToTop = () => {
      try {
        const modalTop = document.getElementById('unified-modal-top');
        if (modalTop && typeof modalTop.scrollIntoView === 'function') {
          modalTop.scrollIntoView({
            behavior: 'instant',
            block: 'start',
            inline: 'nearest'
          });
        } else {
          // Fallback: scroll container to top
          const scrollContainer = document.querySelector('[data-testid="unified-order-detail-modal"] .overflow-y-auto');
          if (scrollContainer) {
            scrollContainer.scrollTop = 0;
          }
        }
      } catch (error) {
        console.warn('Failed to scroll to modal top:', error);
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(scrollToTop, 50);
    return () => clearTimeout(timer);
  }, [open]);

  // Memoize status change handler
  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: string) => {
      try {
        // Validate status type
        const validStatuses: Array<'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'> =
          ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];

        if (!validStatuses.includes(newStatus as typeof validStatuses[number])) {
          console.error('Invalid status:', newStatus);
          return;
        }

        if (onStatusChange) {
          await onStatusChange(orderId, newStatus);
        }

        setOrderData(prev => (
          prev.id === orderId
            ? { ...prev, status: newStatus as OrderData['status'] }
            : prev
        ));
      } catch (error) {
        console.error('Failed to update order status:', error);
        // Optionally show toast notification here
      }
    },
    [onStatusChange]
  );

  // Memoize vehicle display name - prioritize vehicle_info from VIN decoder
  const vehicleDisplayName = useMemo(() => {
    // Priority 1: Use vehicle_info if available (contains complete decoded VIN info)
    if (orderData.vehicle_info) {
      return orderData.vehicle_info;
    }

    // Fallback: Construct from individual fields
    const year = orderData.vehicleYear || orderData.vehicle_year || '';
    const make = orderData.vehicleMake || orderData.vehicle_make || '';
    const model = orderData.vehicleModel || orderData.vehicle_model || '';
    const trim = orderData.vehicleTrim || orderData.vehicle_trim || '';

    const baseVehicle = `${year} ${make} ${model}`.trim();
    const trimInfo = trim ? ` (${trim})` : '';

    return baseVehicle ? `${baseVehicle}${trimInfo}` : t('orders.unknown_vehicle');
  }, [orderData, t]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none max-h-none w-screen h-screen p-0 gap-0 m-0 rounded-none border-0"
        data-testid="unified-order-detail-modal"
      >
        <div className="h-screen flex flex-col">
          <DialogTitle className="sr-only">
            {t('orders.order_details_modal_title', {
              defaultValue: `Order Details - ${order.orderNumber || order.order_number || 'New'}`,
              orderNumber: order.orderNumber || order.order_number || 'New',
              orderType: orderType,
              customer: order.customerName || order.customer_name || 'Unknown Customer'
            })}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('orders.order_details_description', {
              defaultValue: `Viewing ${orderType} order for ${order.customerName || order.customer_name || 'customer'} with vehicle ${vehicleDisplayName}`,
              customer: order.customerName || order.customer_name || 'customer',
              vehicle: vehicleDisplayName,
              type: orderType
            })}
          </DialogDescription>

          {/* Unified Content Container - Single Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
            <div className="p-6" id="unified-modal-top">
              {/* Unified Header - Conditional based on order type */}
              <UnifiedOrderHeader
                order={orderData}
                orderType={orderType}
                vehicleDisplayName={vehicleDisplayName}
                effectiveDealerId={effectiveDealerId}
                onStatusChange={handleStatusChange}
                canEditOrder={canEditOrder}
                onEdit={handleEdit}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
                {/* Main Content Area */}
                <div className="space-y-6">
                  {/* Row 1: Type-specific fields + Schedule View (Two blocks side by side) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OrderTypeFields orderType={orderType} order={orderData} />
                    <ScheduleViewBlock order={orderData as SystemOrderData} />
                  </div>

                  {/* Row 2: Simple Notes Display (Full width) */}
                  <SimpleNotesDisplay order={orderData} />

                  {/* Row 3: Team Communication - Unified with tabs (Full width) */}
                  <TeamCommunicationBlock orderId={orderData.id} />
                </div>

                {/* Right Sidebar - Clean Design */}
                <div className="space-y-4">
                  {/* Enhanced QR Code & Short Link Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="qr-code" />
                  ) : (
                    <EnhancedQRCodeBlock
                      orderId={orderData.id}
                      orderNumber={orderData.orderNumber || orderData.order_number}
                      dealerId={effectiveDealerId}
                      {...qrProps}
                    />
                  )}

                  {/* Enhanced Followers Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="notes" />
                  ) : (
                    <FollowersBlock
                      orderId={orderData.id}
                      dealerId={effectiveDealerId}
                    />
                  )}

                  {/* Tasks & Reminders Section */}
                  <OrderTasksSection
                    orderId={orderData.id}
                    orderNumber={orderData.orderNumber || orderData.order_number || orderData.id}
                    customerName={orderData.customerName || orderData.customer_name}
                  />

                  {/* Enhanced Recent Activity Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="activity" />
                  ) : (
                    <RecentActivityBlock
                      orderId={orderData.id}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Print Actions and Close Button */}
          <footer className="flex-none border-t bg-background p-4">
            <div className="flex justify-between">
              {/* Print Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => previewPrint({...orderData, dealer_id: Number(orderData.dealer_id)} as unknown as SystemOrderData)}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  {t('orders.print')}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => printOrder({...orderData, dealer_id: Number(orderData.dealer_id)} as unknown as SystemOrderData)}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {t('orders.download')}
                </Button>
              </div>

              {/* Close Button */}
              <Button
                variant="destructive"
                onClick={onClose}
                size="lg"
                className="min-w-[120px]"
              >
                {t('common.close')}
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
});
