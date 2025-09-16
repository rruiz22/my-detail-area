import React, { ReactNode, useEffect, useCallback, useMemo, memo, lazy, Suspense } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  X,
  Edit2,
  Trash2,
  Clock,
  User,
  Car,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  QrCode,
  MessageSquare,
  Link,
  FileText,
  Hash
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CommunicationActions } from './CommunicationActions';
import { AttachmentUploader } from './AttachmentUploader';
import { RecentActivity } from './RecentActivity';
import { OrderStatusBadges } from './OrderStatusBadges';
import { TimeRemaining } from './TimeRemaining';
import { safeFormatDate } from '@/utils/dateUtils';
import { getStatusColor } from '@/utils/statusUtils';
import { SkeletonLoader } from './SkeletonLoader';
import { ChatAndSMSActions } from './ChatAndSMSActions';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { ErrorBoundaryModal } from './ErrorBoundaryModal';
import { OrderTasksSection } from './OrderTasksSection';

// Type-specific field components - Direct imports for debugging
import { SalesOrderFields } from './SalesOrderFields';
import { ServiceOrderFields } from './ServiceOrderFields';
import { ReconOrderFields } from './ReconOrderFields';
import { CarWashOrderFields } from './CarWashOrderFields';

// Enhanced TypeScript interfaces for better type safety
// Support both snake_case (direct from DB) and camelCase (from useOrderManagement transform)
interface OrderData {
  id: string;
  // Order identifiers (support both formats)
  order_number?: string;
  custom_order_number?: string;
  customOrderNumber?: string;

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
  qr_slug?: string;
  short_url?: string;
  qr_code_url?: string;
  short_link?: string;
  qr_generation_status?: 'pending' | 'generating' | 'completed' | 'failed';
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

const ScheduleViewBlockMemo = lazy(() =>
  import('./ScheduleViewBlock').then(module => ({ default: memo(module.ScheduleViewBlock) }))
);
const SimpleNotesDisplayMemo = lazy(() =>
  import('./SimpleNotesDisplay').then(module => ({ default: memo(module.SimpleNotesDisplay) }))
);
const PublicCommentsBlockMemo = lazy(() =>
  import('./PublicCommentsBlock').then(module => ({ default: memo(module.PublicCommentsBlock) }))
);
const InternalNotesBlockMemo = lazy(() =>
  import('./InternalNotesBlock').then(module => ({ default: memo(module.InternalNotesBlock) }))
);
const EnhancedQRCodeBlockMemo = lazy(() =>
  import('./EnhancedQRCodeBlock').then(module => ({ default: memo(module.EnhancedQRCodeBlock) }))
);
const FollowersBlockMemo = lazy(() =>
  import('./FollowersBlock').then(module => ({ default: memo(module.FollowersBlock) }))
);
const RecentActivityBlockMemo = lazy(() =>
  import('./RecentActivityBlock').then(module => ({ default: memo(module.RecentActivityBlock) }))
);

// Header Components
interface UnifiedOrderHeaderProps {
  order: OrderData;
  orderType: OrderType;
  vehicleDisplayName: string;
  onStatusChange: (newStatus: string) => void;
}

const UnifiedOrderHeader = memo(function UnifiedOrderHeader({
  order,
  orderType,
  vehicleDisplayName,
  onStatusChange
}: UnifiedOrderHeaderProps) {
  const { t } = useTranslation();

  const headerData = useMemo(() => {
    const orderNumber = order.customOrderNumber || order.order_number || order.custom_order_number || 'New Order';
    const dealershipName = order.dealership_name || 'Premium Auto';

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

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="relative text-center">
        {/* Status Dropdown - Top Right */}
        <div className="absolute top-0 right-0">
          <StatusBadgeInteractive
            status={order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'}
            orderId={order.id}
            dealerId={String(order.dealer_id)}
            canUpdateStatus={true}
            onStatusChange={onStatusChange}
          />
        </div>

        {/* Centered Header Content */}
        <div className="space-y-1">
          {/* Line 1: Order Number */}
          <h1 className="text-3xl font-bold text-gray-900">
            {headerData.orderNumber}
          </h1>

          {/* Line 2: Dealership - User/Service Performer */}
          <div className="text-lg text-gray-700">
            {headerData.line2}
          </div>

          {/* Line 3: Vehicle - VIN - Date */}
          <div className="text-lg text-gray-700">
            {headerData.line3}
          </div>
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
  const { startMeasure, endMeasure, recordMetric } = usePerformanceMonitor();

  // Track modal rendering performance
  useEffect(() => {
    if (open) {
      startMeasure('unified-modal-render');
      recordMetric('unified-modal-open', Date.now());
      return () => {
        endMeasure('unified-modal-render');
        recordMetric('unified-modal-close', Date.now());
      };
    }
  }, [open, startMeasure, endMeasure, recordMetric]);

  // Reset scroll position when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        const modalTop = document.getElementById('unified-modal-top');
        if (modalTop) {
          modalTop.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 50);

      return () => clearTimeout(timer);
    }
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
      await onStatusChange(order.id, newStatus);
    }
  }, [onStatusChange, order.id]);

  // Memoize vehicle display name (for legacy compatibility, though we'll use vehicle_info)
  const vehicleDisplayName = useMemo(() => {
    const year = order.vehicleYear || order.vehicle_year || '';
    const make = order.vehicleMake || order.vehicle_make || '';
    const model = order.vehicleModel || order.vehicle_model || '';
    return `${year} ${make} ${model}`.trim() || 'Unknown Vehicle';
  }, [order.vehicleYear, order.vehicle_year, order.vehicleMake, order.vehicle_make, order.vehicleModel, order.vehicle_model]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none max-h-none w-screen h-screen p-0 gap-0 m-0 rounded-none border-0"
        data-testid="unified-order-detail-modal"
      >
        <div className="h-screen flex flex-col">
          <DialogTitle className="sr-only">
            {t('orders.order_details')} - {order.customOrderNumber || order.custom_order_number || order.order_number}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('orders.order_details_description', {
              customer: order.customerName || order.customer_name,
              vehicle: vehicleDisplayName,
              type: orderType
            })}
          </DialogDescription>

          {/* Unified Content Container - Single Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
            <div className="p-6" id="unified-modal-top">
              {/* Unified Header - Conditional based on order type */}
              <UnifiedOrderHeader
                order={order}
                orderType={orderType}
                vehicleDisplayName={vehicleDisplayName}
                onStatusChange={handleStatusChange}
              />

              <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
                {/* Main Content Area */}
                <div className="space-y-6">
                  {/* Row 1: Type-specific fields + Schedule View (Two blocks side by side) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <OrderTypeFields orderType={orderType} order={order} />
                    <Suspense fallback={<SkeletonLoader variant="schedule" />}>
                      <ScheduleViewBlockMemo order={order} />
                    </Suspense>
                  </div>

                  {/* Row 2: Simple Notes Display (Full width) */}
                  <Suspense fallback={<SkeletonLoader variant="notes" />}>
                    <SimpleNotesDisplayMemo order={order} />
                  </Suspense>

                  {/* Row 3: Team Communication (Full width like order notes) */}
                  <div className="space-y-4">
                    <Suspense fallback={<SkeletonLoader variant="comments" />}>
                      <PublicCommentsBlockMemo orderId={order.id} />
                    </Suspense>
                    <Suspense fallback={<SkeletonLoader variant="notes" />}>
                      <InternalNotesBlockMemo orderId={order.id} />
                    </Suspense>
                  </div>
                </div>

                {/* Right Sidebar - Clean Design */}
                <div className="space-y-4">
                  {/* Enhanced QR Code & Short Link Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="qr-code" />
                  ) : (
                    <Suspense fallback={<SkeletonLoader variant="qr-code" />}>
                      <EnhancedQRCodeBlockMemo
                        orderId={order.id}
                        orderNumber={order.customOrderNumber || order.order_number || order.custom_order_number}
                        dealerId={String(order.dealer_id)}
                        qrCodeUrl={order.qr_code_url}
                        shortLink={order.short_link}
                        qrGenerationStatus={order.qr_generation_status}
                      />
                    </Suspense>
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
                        orderNumber={order.customOrderNumber || order.order_number || order.custom_order_number}
                        customerPhone={order.customerPhone || order.customer_phone || ''}
                        dealerId={Number(order.dealer_id)}
                        variant="compact"
                      />
                    </CardContent>
                  </Card>

                  {/* Enhanced Followers Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="notes" />
                  ) : (
                    <Suspense fallback={<SkeletonLoader variant="notes" />}>
                      <FollowersBlockMemo
                        orderId={order.id}
                        dealerId={String(order.dealer_id)}
                      />
                    </Suspense>
                  )}

                  {/* Tasks & Reminders Section */}
                  <Suspense fallback={<SkeletonLoader variant="notes" />}>
                    <OrderTasksSection
                      orderId={order.id}
                      orderNumber={order.customOrderNumber || order.order_number || order.custom_order_number || order.id}
                      customerName={order.customerName || order.customer_name}
                    />
                  </Suspense>

                  {/* Enhanced Recent Activity Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="activity" />
                  ) : (
                    <Suspense fallback={<SkeletonLoader variant="activity" />}>
                      <RecentActivityBlockMemo
                        orderId={order.id}
                      />
                    </Suspense>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Danger Close Button */}
          <footer className="flex-none border-t bg-background p-4">
            <div className="flex justify-end">
              <Button
                variant="destructive"
                onClick={onClose}
                size="lg"
                className="min-w-[120px]"
              >
                Close
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
});