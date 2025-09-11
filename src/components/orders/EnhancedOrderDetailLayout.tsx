import React, { ReactNode, useEffect, useCallback, useMemo } from 'react';
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
import { VehicleInfoBlock } from './VehicleInfoBlock';
import { ScheduleViewBlock } from './ScheduleViewBlock';
import { SimpleNotesDisplay } from './SimpleNotesDisplay';
import { EnhancedQRCodeBlock } from './EnhancedQRCodeBlock';
import { PublicCommentsBlock } from './PublicCommentsBlock';
import { InternalNotesBlock } from './InternalNotesBlock';
import { OrderStatusBadges } from './OrderStatusBadges';
import { FollowersBlock } from './FollowersBlock';
import { RecentActivityBlock } from './RecentActivityBlock';
import { TimeRemaining } from './TimeRemaining';
import { safeFormatDate } from '@/utils/dateUtils';
import { getStatusColor } from '@/utils/statusUtils';
import { SkeletonLoader } from './SkeletonLoader';

interface EnhancedOrderDetailLayoutProps {
  order: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: any) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onNotesUpdate?: (orderId: string, notes: string, type: 'general' | 'internal') => void;
  modalData?: any;
  isLoadingData?: boolean;
  dataError?: string | null;
}

// Memoized component to prevent unnecessary re-renders
export const EnhancedOrderDetailLayout = React.memo(function EnhancedOrderDetailLayout({
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

  // Memoize vehicle display name
  const vehicleDisplayName = useMemo(() => {
    return `${order.vehicle_year || ''} ${order.vehicle_make || ''} ${order.vehicle_model || ''}`.trim() || 'Unknown Vehicle';
  }, [order.vehicle_year, order.vehicle_make, order.vehicle_model]);

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none max-h-none w-screen h-screen p-0 gap-0 m-0 rounded-none border-0"
        data-testid="order-detail-modal"
      >
        <div className="h-screen flex flex-col">
          <DialogTitle className="sr-only">
            {t('orders.order_details')} - {order.custom_order_number || order.order_number}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('orders.order_details_description', { 
              customer: order.customer_name, 
              vehicle: `${order.vehicle_year} ${order.vehicle_make} ${order.vehicle_model}` 
            })}
          </DialogDescription>

          {/* Unified Content Container - Single Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
            <div className="p-6" id="modal-top">
              {/* Professional Topbar - Like Reference Image */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
                <div className="flex items-center justify-center text-center">
                  <div className="space-y-2">
                    {/* Order Number - Prominent */}
                    <h1 className="text-3xl font-bold text-gray-900">
                      {order.order_number || order.custom_order_number || 'New Order'}
                    </h1>
                    
                    {/* Business Context - Centered */}
                    <div className="text-lg text-gray-700">
                      <span className="font-semibold">{order.dealership_name || 'Premium Auto'}</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span>{order.advisor || 'Unassigned'} (Advisor)</span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span>{order.customer_name || 'Customer'}</span>
                    </div>
                    
                    {/* Vehicle + Status Row - Centered */}
                    <div className="flex items-center justify-center gap-6 pt-2">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-gray-800">
                          {vehicleDisplayName}
                        </span>
                      </div>
                      
                      <div className="font-mono text-sm bg-gray-200 px-3 py-1 rounded-md">
                        VIN: {order.vehicle_vin || 'Not provided'}
                      </div>
                      
                      <TimeRemaining order={order} size="lg" />
                      
                      <StatusBadgeInteractive
                        status={order.status}
                        orderId={order.id}
                        dealerId={order.dealer_id}
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
                    <VehicleInfoBlock order={order} />
                    <ScheduleViewBlock order={order} />
                  </div>

                  {/* Row 2: Simple Notes Display (Full width) */}
                  <SimpleNotesDisplay order={order} />

                  {/* Row 3: Team Communication (Full width like order notes) */}
                  <div className="space-y-4">
                    <PublicCommentsBlock orderId={order.id} />
                    <InternalNotesBlock orderId={order.id} />
                  </div>
                </div>

                {/* Right Sidebar - Clean Design */}
                <div className="space-y-4">
                  {/* Enhanced QR Code & Short Link Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="qr-code" />
                  ) : (
                    <EnhancedQRCodeBlock 
                      orderId={order.id}
                      orderNumber={order.order_number}
                      dealerId={order.dealer_id}
                      qrSlug={order.qr_slug}
                      shortUrl={order.short_url}
                    />
                  )}

                  {/* Enhanced Followers Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="notes" />
                  ) : (
                    <FollowersBlock 
                      orderId={order.id}
                      dealerId={order.dealer_id}
                    />
                  )}

                  {/* Enhanced Recent Activity Block */}
                  {isLoadingData ? (
                    <SkeletonLoader variant="activity" />
                  ) : (
                    <RecentActivityBlock 
                      orderId={order.id}
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
});