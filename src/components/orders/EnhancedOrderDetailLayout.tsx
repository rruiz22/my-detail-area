import React, { ReactNode, useEffect, useCallback, useMemo, memo } from 'react';
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
import { usePermissionContext } from '@/contexts/PermissionContext';
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

// Import comprehensive order types for consistency
import type {
  OrderData,
  OrderModalData as ModalData
} from '@/types/order';

interface EnhancedOrderDetailLayoutProps {
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

// Direct imports for performance - no lazy loading delays
import { VehicleInfoBlock } from './VehicleInfoBlock';
import { ScheduleViewBlock } from './ScheduleViewBlock';
import { SimpleNotesDisplay } from './SimpleNotesDisplay';
import { PublicCommentsBlock } from './PublicCommentsBlock';
import { InternalNotesBlock } from './InternalNotesBlock';
import { EnhancedQRCodeBlock } from './EnhancedQRCodeBlock';
import { FollowersBlock } from './FollowersBlock';
import { RecentActivityBlock } from './RecentActivityBlock';

// Performance-optimized memoized components with custom comparison functions
const VehicleInfoBlockMemo = memo(VehicleInfoBlock, (prevProps, nextProps) => {
  // Only re-render if vehicle-specific properties change
  const vehicleFields = ['vehicleYear', 'vehicle_year', 'vehicleMake', 'vehicle_make',
                        'vehicleModel', 'vehicle_model', 'vehicleVin', 'vehicle_vin',
                        'vehicleColor', 'vehicle_color', 'vehicleMileage', 'vehicle_mileage'];

  return vehicleFields.every(field =>
    prevProps.order[field as keyof OrderData] === nextProps.order[field as keyof OrderData]
  );
});

const ScheduleViewBlockMemo = memo(ScheduleViewBlock, (prevProps, nextProps) => {
  // Only re-render if schedule-related properties change
  const scheduleFields = ['estimated_completion', 'actual_completion', 'status', 'assigned_to'];

  return scheduleFields.every(field =>
    prevProps.order[field as keyof OrderData] === nextProps.order[field as keyof OrderData]
  );
});

const SimpleNotesDisplayMemo = memo(SimpleNotesDisplay, (prevProps, nextProps) => {
  // Only re-render if notes change
  return prevProps.order.notes === nextProps.order.notes &&
         prevProps.order.description === nextProps.order.description;
});

const PublicCommentsBlockMemo = memo(PublicCommentsBlock, (prevProps, nextProps) => {
  // Only re-render if orderId changes (comments managed internally)
  return prevProps.orderId === nextProps.orderId;
});

const InternalNotesBlockMemo = memo(InternalNotesBlock, (prevProps, nextProps) => {
  // Only re-render if orderId changes (notes managed internally)
  return prevProps.orderId === nextProps.orderId;
});

const EnhancedQRCodeBlockMemo = memo(EnhancedQRCodeBlock, (prevProps, nextProps) => {
  // Only re-render if QR-related properties change
  return prevProps.orderId === nextProps.orderId &&
         prevProps.orderNumber === nextProps.orderNumber &&
         prevProps.dealerId === nextProps.dealerId &&
         prevProps.qrCodeUrl === nextProps.qrCodeUrl &&
         prevProps.shortLink === nextProps.shortLink;
});

const FollowersBlockMemo = memo(FollowersBlock, (prevProps, nextProps) => {
  // Only re-render if identifiers change (followers managed internally)
  return prevProps.orderId === nextProps.orderId &&
         prevProps.dealerId === nextProps.dealerId;
});

const RecentActivityBlockMemo = memo(RecentActivityBlock, (prevProps, nextProps) => {
  // Only re-render if orderId changes (activities managed internally)
  return prevProps.orderId === nextProps.orderId;
});

// Memoized main component with custom comparison function
export const EnhancedOrderDetailLayout = memo(function EnhancedOrderDetailLayout({
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
}: EnhancedOrderDetailLayoutProps) {
  const { t } = useTranslation();
  const { hasPermission } = usePermissionContext();
  const { startMeasure, endMeasure, recordMetric } = usePerformanceMonitor();

  // Track modal rendering performance
  useEffect(() => {
    if (open) {
      startMeasure('modal-render');
      recordMetric('modal-open', Date.now());
      return () => {
        endMeasure('modal-render');
        recordMetric('modal-close', Date.now());
      };
    }
  }, [open, startMeasure, endMeasure, recordMetric]);

  // Reset scroll position when modal opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        const modalTop = document.getElementById('modal-top');
        if (modalTop) {
          modalTop.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 50);
      
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Optimized utility functions with stable references
  const formatCurrency = useCallback((amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  const getPriorityColor = useCallback((priority: string) => {
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

  // Optimized vehicle display name with reduced dependencies
  const vehicleDisplayName = useMemo(() => {
    const year = order.vehicleYear || order.vehicle_year || '';
    const make = order.vehicleMake || order.vehicle_make || '';
    const model = order.vehicleModel || order.vehicle_model || '';
    return `${year} ${make} ${model}`.trim() || 'Unknown Vehicle';
  }, [
    order.vehicleYear,
    order.vehicle_year,
    order.vehicleMake,
    order.vehicle_make,
    order.vehicleModel,
    order.vehicle_model
  ]);

  // Memoized order identifiers to prevent child re-renders
  const orderIdentifiers = useMemo(() => ({
    id: order.id,
    orderNumber: order.orderNumber || order.order_number || order.id.slice(-8),
    dealerId: String(order.dealer_id)
  }), [order.id, order.orderNumber, order.order_number, order.dealer_id]);

  // Memoized QR code props to prevent unnecessary re-renders
  const qrCodeProps = useMemo(() => ({
    orderId: order.id,
    orderNumber: orderIdentifiers.orderNumber,
    dealerId: orderIdentifiers.dealerId,
    qrCodeUrl: order.qr_code_url,
    shortLink: order.short_link
  }), [order.id, orderIdentifiers.orderNumber, orderIdentifiers.dealerId, order.qr_code_url, order.short_link]);

  // Memoized customer info to prevent unnecessary re-renders
  const customerInfo = useMemo(() => ({
    name: order.customerName || order.customer_name || 'Customer',
    phone: order.customerPhone || order.customer_phone || ''
  }), [order.customerName, order.customer_name, order.customerPhone, order.customer_phone]);

  // Check if user can edit orders
  const canEditOrder = useMemo(() => {
    return onEdit && hasPermission('sales_orders', 'write');
  }, [onEdit, hasPermission]);

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (canEditOrder) {
      onEdit(order);
    }
  }, [canEditOrder, onEdit, order]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none max-h-none w-screen h-screen p-0 gap-0 m-0 rounded-none border-0"
        data-testid="order-detail-modal"
      >
        <div className="h-screen flex flex-col">
          <DialogTitle className="sr-only">
            {t('orders.order_details')} - {order.orderNumber || order.order_number || order.id.slice(-8)}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('orders.order_details_description', {
              customer: order.customerName || order.customer_name,
              vehicle: vehicleDisplayName
            })}
          </DialogDescription>

          {/* Unified Content Container - Single Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
            <div className="p-6" id="modal-top">
              {/* Professional Topbar - Like Reference Image */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-center text-center">
                  <div className="space-y-2">
                    {/* Order Number Badge with Edit Button */}
                    <div className="flex justify-center items-center gap-4 mb-4">
                      <div
                        className="inline-flex items-center px-8 py-4 bg-gray-900 text-white text-2xl font-bold rounded-lg shadow-lg hover:bg-gray-800 transition-colors"
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 'bold',
                          zIndex: 10,
                          minWidth: '200px',
                          textAlign: 'center'
                        }}
                      >
                        #{order.orderNumber || order.order_number || 'New Order'}
                      </div>

                      {/* Edit Button */}
                      {canEditOrder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEdit}
                          className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 hover:text-gray-900 shadow-sm"
                        >
                          <Edit2 className="h-4 w-4" />
                          {t('orders.edit')}
                        </Button>
                      )}
                    </div>
                    
                    {/* Business Context - Centered */}
                    <div className="text-lg text-gray-700">
                      <span className="font-semibold">Premium Auto</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span>{order.salesperson || 'Unassigned'} (Salesperson)</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span>{order.customerName || order.customer_name || 'Customer'}</span>
                    </div>
                    
                    {/* Vehicle + Status Row - Centered */}
                    <div className="flex items-center justify-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-gray-700" />
                        <span className="font-semibold text-gray-800">
                          {vehicleDisplayName}
                        </span>
                      </div>
                      
                      <div className="font-mono text-sm bg-gray-200 px-3 py-1 rounded-md">
                        VIN: {order.vehicleVin || order.vehicle_vin || 'Not provided'}
                      </div>
                      
                      <TimeRemaining order={order} size="lg" />
                      
                      <StatusBadgeInteractive
                        status={order.status as 'pending' | 'in_progress' | 'completed' | 'cancelled'}
                        orderId={order.id}
                        dealerId={String(order.dealer_id)}
                        canUpdateStatus={true}
                        onStatusChange={handleStatusChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
                {/* Main Content Area */}
                <div className="space-y-6">
                  {/* Row 1: Vehicle Info + Schedule View (Two blocks side by side) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VehicleInfoBlockMemo order={order} />
                    <ScheduleViewBlockMemo
                      order={order}
                      onStatusUpdate={handleStatusChange}
                      enableInteractiveFeatures={true}
                    />
                  </div>

                  {/* Row 2: Simple Notes Display (Full width) */}
                  <SimpleNotesDisplayMemo order={order} />

                  {/* Row 3: Team Communication (Full width like order notes) */}
                  <div className="space-y-4">
                    <PublicCommentsBlockMemo orderId={orderIdentifiers.id} />
                    <InternalNotesBlockMemo orderId={orderIdentifiers.id} />
                  </div>
                </div>

                {/* Right Sidebar - Clean Design */}
                <div className="space-y-4">
                  {/* Enhanced QR Code & Short Link Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="qr-code" />
                  ) : (
                    <EnhancedQRCodeBlockMemo {...qrCodeProps} />
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
                        orderId={orderIdentifiers.id}
                        orderNumber={orderIdentifiers.orderNumber}
                        customerPhone={customerInfo.phone}
                        dealerId={Number(orderIdentifiers.dealerId)}
                        variant="compact"
                      />
                    </CardContent>
                  </Card>

                  {/* Enhanced Followers Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="notes" />
                  ) : (
                    <FollowersBlockMemo
                      orderId={orderIdentifiers.id}
                      dealerId={orderIdentifiers.dealerId}
                    />
                  )}

                  {/* Tasks & Reminders Section */}
                  <OrderTasksSection
                    orderId={orderIdentifiers.id}
                    orderNumber={orderIdentifiers.orderNumber || orderIdentifiers.id}
                    customerName={customerInfo.name}
                  />

                  {/* Enhanced Recent Activity Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="activity" />
                  ) : (
                    <RecentActivityBlockMemo
                      orderId={orderIdentifiers.id}
                    />
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
}, (prevProps, nextProps) => {
  // Custom comparison function for EnhancedOrderDetailLayout
  // Only re-render if essential props change
  return (
    prevProps.open === nextProps.open &&
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.notes === nextProps.order.notes &&
    prevProps.order.internal_notes === nextProps.order.internal_notes &&
    prevProps.isLoadingData === nextProps.isLoadingData &&
    prevProps.dataError === nextProps.dataError &&
    // Check vehicle info for changes
    prevProps.order.vehicleYear === nextProps.order.vehicleYear &&
    prevProps.order.vehicleMake === nextProps.order.vehicleMake &&
    prevProps.order.vehicleModel === nextProps.order.vehicleModel &&
    prevProps.order.vehicleVin === nextProps.order.vehicleVin &&
    // Check customer info for changes
    prevProps.order.customerName === nextProps.order.customerName &&
    prevProps.order.customerPhone === nextProps.order.customerPhone &&
    // Check critical order fields
    prevProps.order.estimated_completion === nextProps.order.estimated_completion &&
    prevProps.order.assigned_to === nextProps.order.assigned_to &&
    prevProps.order.qr_code_url === nextProps.order.qr_code_url &&
    prevProps.order.short_link === nextProps.order.short_link &&
    // Function references (should be stable with useCallback)
    prevProps.onClose === nextProps.onClose &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onStatusChange === nextProps.onStatusChange &&
    prevProps.onNotesUpdate === nextProps.onNotesUpdate
  );
});