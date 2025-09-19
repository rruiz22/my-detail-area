import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { safeFormatDate } from '@/utils/dateUtils';
import {
  MessageSquare,
  Edit2,
  Printer,
  Download
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useOrderDetailsPolling } from '@/hooks/useSmartPolling';
import { usePrintOrder } from '@/hooks/usePrintOrder';
import { ChatAndSMSActions } from './ChatAndSMSActions';
import { OrderTasksSection } from './OrderTasksSection';
import { SkeletonLoader } from './SkeletonLoader';

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
import { SimpleNotesDisplay } from './SimpleNotesDisplay';
import { TeamCommunicationBlock } from './TeamCommunicationBlock';
import { ServicesDisplay } from './ServicesDisplay';

// Enhanced TypeScript interfaces for better type safety
// Support both snake_case (direct from DB) and camelCase (from useOrderManagement transform)
interface OrderData {
  // Index signature for compatibility with field components
  [key: string]: unknown;
  id: string;
  // Order identifiers (support both formats)
  order_number?: string;
  orderNumber?: string;

  // Customer information (support both formats)
  customer_name?: string;
  customer_phone?: string;
  customerName?: string;
  customerPhone?: string;

  // Vehicle information (support both formats)
  vehicle_year?: string | number;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_vin?: string;
  vehicle_info?: string; // New unified VIN display field
  stock_number?: string;
  vehicleYear?: string | number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  stockNumber?: string;

  // Service-specific fields
  po?: string; // Purchase Order
  ro?: string; // Repair Order
  tag?: string; // TAG field

  // Assignment fields (support both formats)
  assigned_to?: string;
  assignedTo?: string;

  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  dealer_id: string | number;
  dealership_name?: string;
  advisor?: string;
  salesperson?: string;
  service_performer?: string; // For Recon and Car Wash
  notes?: string;
  internal_notes?: string;
  priority?: string;
  created_at?: string;
  updated_at?: string;
  estimated_completion?: string;
  due_date?: string; // For Sales/Service
  date_service_complete?: string; // For Recon/Car Wash
  // QR and Links (support both formats)
  qr_slug?: string;
  short_url?: string;
  qr_code_url?: string;
  qrCodeUrl?: string;
  short_link?: string;
  shortLink?: string;
  qr_generation_status?: 'pending' | 'generating' | 'completed' | 'failed';
  qrGenerationStatus?: 'pending' | 'generating' | 'completed' | 'failed';
}

interface ModalData {
  attachments: any[];
  activities: any[];
  comments: any[];
  followers: any[];
  analytics: any;
  userType: 'detail' | 'regular' | null;
}

type OrderType = 'sales' | 'service' | 'recon' | 'carwash';

// Constants for default values
const DEFAULT_DEALER_ID = '1';
const FALLBACK_DEALER_ID = 5;
const DEFAULT_DEALERSHIP_NAME = 'Premium Auto';

interface UnifiedOrderDetailModalProps {
  orderType: OrderType;
  order: OrderData;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: OrderData) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onNotesUpdate?: (orderId: string, notes: string, type: 'general' | 'internal') => void;
  modalData?: ModalData;
  isLoadingData?: boolean;
  dataError?: string | null;
}

// Custom hook for QR props normalization
const useQRProps = (orderData: OrderData) => {
  return useMemo(() => ({
    qrCodeUrl: orderData.qr_code_url || orderData.qrCodeUrl,
    shortLink: orderData.short_link || orderData.shortLink,
    qrGenerationStatus: orderData.qr_generation_status || orderData.qrGenerationStatus
  }), [orderData.qr_code_url, orderData.qrCodeUrl, orderData.short_link, orderData.shortLink, orderData.qr_generation_status, orderData.qrGenerationStatus]);
};

// Error boundary wrapper for individual sections
const SafeComponentWrapper = ({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Component rendering error:', error);
    return <>{fallback}</>;
  }
};

// Header Components
interface UnifiedOrderHeaderProps {
  order: OrderData;
  orderType: OrderType;
  vehicleDisplayName: string;
  onStatusChange: (newStatus: string) => void;
  canEditOrder?: boolean;
  onEdit?: () => void;
}

const UnifiedOrderHeader = memo(function UnifiedOrderHeader({
  order,
  orderType,
  vehicleDisplayName,
  onStatusChange,
  canEditOrder,
  onEdit
}: UnifiedOrderHeaderProps) {
  const { t } = useTranslation();

  const headerData = useMemo(() => {
    const orderNumber = order.orderNumber || order.order_number || 'New Order';
    const dealershipName = order.dealership_name || DEFAULT_DEALERSHIP_NAME;

    if (orderType === 'sales' || orderType === 'service') {
      return {
        orderNumber,
        line2: `${dealershipName} - ${order.salesperson || 'Unassigned'}`,
        line3: `Vehicle - ${order.vehicleVin || order.vehicle_vin || 'No VIN'} - Due: ${order.due_date ? safeFormatDate(order.due_date) : 'Not set'}`
      };
    } else {
      // Recon and Car Wash
      return {
        orderNumber,
        line2: `${dealershipName} - ${order.service_performer || 'Service Performer'}`,
        line3: `Vehicle - ${order.vehicleVin || order.vehicle_vin || 'No VIN'} - Date Service Complete: ${order.date_service_complete ? safeFormatDate(order.date_service_complete) : 'Not set'}`
      };
    }
  }, [order, orderType]);

  // Get status background class
  const getStatusBackgroundClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'in_progress':
        return 'bg-indigo-50 border-l-4 border-indigo-500';
      case 'completed':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'cancelled':
        return 'bg-red-50 border-l-4 border-red-500';
      default:
        return 'bg-gray-50 border-l-4 border-gray-500';
    }
  };

  return (
    <div className={`${getStatusBackgroundClass(order.status)} rounded-lg p-4 mb-6 shadow-sm`}>
      <div className="grid grid-cols-3 items-center gap-4">
        {/* Left: Order Number with Edit Button */}
        <div className="text-left flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            #{headerData.orderNumber}
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
          <h1 className="text-xl font-bold text-gray-900">
            {order.stockNumber || order.stock_number} - {(order.vehicleVin || order.vehicle_vin)?.slice(-8)}
          </h1>

          {/* Vehicle Info - Second Row (Subtitle Style) */}
          <div className="text-lg font-semibold text-gray-700">
            {vehicleDisplayName}
          </div>

          {/* Assigned To - Third Row */}
          <div className="text-sm font-medium text-gray-700">
            {order.assigned_to || order.assignedTo || order.salesperson || order.service_performer || 'Unassigned'}
          </div>

          {/* Services - Fourth Row */}
          <div className="flex justify-center">
            <ServicesDisplay
              services={order.services}
              totalAmount={order.total_amount || order.totalAmount}
              dealerId={order.dealer_id}
              variant="kanban"
              className="mt-1"
            />
          </div>
        </div>

        {/* Right: Status Dropdown */}
        <div className="text-right">
          <StatusBadgeInteractive
            status={order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'}
            orderId={order.id}
            dealerId={order.dealer_id ? String(order.dealer_id) : DEFAULT_DEALER_ID}
            canUpdateStatus={true}
            onStatusChange={onStatusChange}
          />
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
  onDelete,
  onStatusChange,
  onNotesUpdate,
  modalData,
  isLoadingData = false,
  dataError
}: UnifiedOrderDetailModalProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissionContext();
  const { printOrder, previewPrint } = usePrintOrder();
  const [orderData, setOrderData] = useState(order);

  // Custom hook for normalized QR props
  const qrProps = useQRProps(orderData);

  // Check if user can edit orders
  const canEditOrder = useMemo(() => {
    return onEdit && hasPermission('sales_orders', 'write');
  }, [onEdit, hasPermission]);

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (canEditOrder) {
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
      setOrderData(prev => ({
        ...prev,
        ...orderDetailsQuery.data
      }));
    }
  }, [orderDetailsQuery.data, order?.id]);

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

  // Memoize utility functions
  const formatCurrency = useMemo(() => (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  const getPriorityColor = useMemo(() => (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  }, []);

  // Memoize status change handler
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(orderData.id, newStatus);
    }
  }, [onStatusChange, orderData.id]);

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

    return baseVehicle ? `${baseVehicle}${trimInfo}` : 'Unknown Vehicle';
  }, [
    orderData.vehicle_info,
    orderData.vehicleYear, orderData.vehicle_year,
    orderData.vehicleMake, orderData.vehicle_make,
    orderData.vehicleModel, orderData.vehicle_model,
    orderData.vehicleTrim, orderData.vehicle_trim
  ]);

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
                    <ScheduleViewBlock order={orderData} />
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
                      dealerId={orderData.dealer_id ? String(orderData.dealer_id) : DEFAULT_DEALER_ID}
                      {...qrProps}
                    />
                  )}

                  {/* Chat and Communication Actions */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {t('orders.communication_actions', 'Team Communication')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChatAndSMSActions
                        orderId={order.id}
                        orderNumber={order.orderNumber || order.order_number}
                        assignedUserId={order.assigned_group_id || order.assignedGroupId || ''}
                        assignedUserName={order.assigned_to || order.assignedTo || ''}
                        dealerId={order.dealer_id ? Number(order.dealer_id) : FALLBACK_DEALER_ID}
                        variant="compact"
                      />
                    </CardContent>
                  </Card>

                  {/* Enhanced Followers Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="notes" />
                  ) : (
                    <FollowersBlock
                      orderId={orderData.id}
                      dealerId={orderData.dealer_id ? String(orderData.dealer_id) : DEFAULT_DEALER_ID}
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
                  onClick={() => previewPrint(orderData)}
                  className="flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  {t('orders.print')}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => printOrder(orderData)}
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
