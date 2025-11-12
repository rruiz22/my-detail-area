import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { usePrintOrder } from '@/hooks/usePrintOrder';
import { useOrderDetailsPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import {
    Copy,
    Edit2,
    Printer,
    Trash2
} from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
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
import { SimpleNotesDisplay } from './SimpleNotesDisplay';
import { TeamCommunicationBlock } from './TeamCommunicationBlock';
import { UnifiedOrderHeaderV2 } from './UnifiedOrderHeaderV2';

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

interface UnifiedOrderDetailModalProps {
  orderType: OrderType;
  order: OrderData;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: OrderData) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onUpdate?: (orderId: string, updates: Partial<OrderData>) => Promise<void>;
  isLoadingData?: boolean;
}

// Data normalization function - converts snake_case DB fields to camelCase
function normalizeOrderData(data: Record<string, unknown>): Partial<OrderData> {
  if (!data) return {};

  // Validate critical fields
  if (!data.id || typeof data.id !== 'string') {
    logger.error('Invalid order data: missing or invalid id', null, { data });
    throw new Error('Invalid order data: missing or invalid id');
  }

  // Validate status
  const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled', 'on_hold'];
  const status = typeof data.status === 'string' && validStatuses.includes(data.status)
    ? data.status as OrderData['status']
    : 'pending' as OrderData['status'];

  return {
    ...data,
    id: data.id,
    status,
    dealer_id: data.dealer_id ? String(data.dealer_id) : undefined,
  } as Partial<OrderData>;
}

// Custom hook for QR props normalization
const useQRProps = (orderData: OrderData) => {
  return useMemo(() => ({
    qrCodeUrl: orderData.qr_code_url || orderData.qrCodeUrl,
    shortLink: orderData.short_link || orderData.shortLink,
    qrGenerationStatus: orderData.qr_generation_status || orderData.qrGenerationStatus
  }), [orderData]);
};


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
  onUpdate,
  isLoadingData = false
}: UnifiedOrderDetailModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const { hasPermission } = usePermissionContext();
  const { previewPrint } = usePrintOrder();
  const [orderData, setOrderData] = useState(order);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setOrderData(order);
  }, [order]);

  // Custom hook for normalized QR props
  const qrProps = useQRProps(orderData);

  // Compute effective dealer ID - prefer orderData, fallback to user's dealership
  const effectiveDealerId = useMemo(() => {
    if (orderData.dealer_id) return String(orderData.dealer_id);
    if (user?.dealershipId) return String(user.dealershipId);
    logger.warn('No dealer ID available for order', { orderId: orderData.id });
    return ''; // Empty string instead of hardcoded default
  }, [orderData.dealer_id, user?.dealershipId, orderData.id]);

  // Check if user can edit orders
  const canEditOrder = useMemo(() => {
    if (!onEdit) {
      return false;
    }

    // Prevent editing if order is completed or cancelled
    if (orderData.status === 'completed' || orderData.status === 'cancelled') {
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
  }, [onEdit, hasPermission, orderType, orderData.status]);

  // Check if user can delete orders
  const canDeleteOrder = useMemo(() => {
    if (!onDelete) {
      return false;
    }

    const permissionModuleMap = {
      sales: 'sales_orders',
      service: 'service_orders',
      recon: 'recon_orders',
      carwash: 'car_wash'
    } as const;

    const targetModule = permissionModuleMap[orderType];
    return hasPermission(targetModule, 'delete');
  }, [onDelete, hasPermission, orderType]);

  // Handle edit button click
  const handleEdit = useCallback(() => {
    if (canEditOrder && onEdit) {
      onEdit(orderData);
    }
  }, [canEditOrder, onEdit, orderData]);

  // Handle share button click - copy link to clipboard
  const handleShare = useCallback(async () => {
    try {
      const shortLink = qrProps.shortLink;
      if (!shortLink) {
        toast({ variant: 'destructive', description: t('orders.no_link_available', 'No link available to share') });
        return;
      }

      await navigator.clipboard.writeText(shortLink);
      toast({ description: t('order_detail.copy_link', 'Link copied to clipboard') });
    } catch (error) {
      logger.error('Failed to copy link to clipboard', error);
      toast({ variant: 'destructive', description: t('order_detail.copy_failed', 'Failed to copy link') });
    }
  }, [qrProps.shortLink, t, toast]);

  // Handle delete button click
  const handleDelete = useCallback(() => {
    if (canDeleteOrder && onDelete) {
      setDeleteDialogOpen(true);
    }
  }, [canDeleteOrder, onDelete]);

  // Confirm delete action
  const confirmDelete = useCallback(async () => {
    if (onDelete) {
      onDelete(orderData.id);
      onClose(); // Close modal after delete
    }
  }, [onDelete, orderData.id, onClose]);

  // Safe mapper for print functions
  const mapToPrintOrderData = useCallback((data: OrderData) => {
    return {
      ...data,
      dealer_id: Number(data.dealer_id) || Number(effectiveDealerId)
    };
  }, [effectiveDealerId]);

  // Smart polling for order details when modal is open
  const orderDetailsQuery = useOrderDetailsPolling(
    ['order', order?.id || ''],
    async () => {
      if (!order?.id) {
        throw new Error('Order ID is required for polling');
      }

      logger.dev(`🔄 Polling order details for ${order.id}`);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .single();

      if (error) {
        logger.error('Failed to fetch order details', error, { orderId: order.id });
        throw error;
      }

      if (!data) {
        throw new Error(`Order ${order.id} not found`);
      }

      return data;
    },
    open && !!order?.id
  );

  // Update orderData when polling returns new data
  useEffect(() => {
    let isMounted = true;

    if (orderDetailsQuery.data && orderDetailsQuery.data.id === order?.id) {
      // Normalize polling data to prevent snake_case overwriting camelCase
      const normalized = normalizeOrderData(orderDetailsQuery.data);

      if (isMounted) {
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
    }

    return () => {
      isMounted = false;
    };
  }, [orderDetailsQuery.data, order?.id]);

  // Error handling for polling failures
  useEffect(() => {
    if (orderDetailsQuery.error) {
      logger.error('Order polling error', orderDetailsQuery.error, { orderId: order?.id });
      toast({ variant: 'destructive', description: t('orders.polling_error', 'Failed to load order details') });
    }
  }, [orderDetailsQuery.error, t, order?.id, toast]);

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
        logger.warn('Failed to scroll to modal top', { error });
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
          logger.error('Invalid status value', null, { newStatus, orderId: orderData.id });
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
        logger.error('Failed to update order status', error, { orderId: orderData.id, newStatus });
        // Optionally show toast notification here
      }
    },
    [onStatusChange]
  );

  // Handle completed date change (for recon/carwash)
  const handleCompletedDateChange = useCallback(
    async (orderId: string, newDate: Date | null) => {
      try {
        // Prepare the update data
        const isoDate = newDate?.toISOString() || null;
        const updates: Partial<OrderData> = {
          completed_at: isoDate,
          completedAt: isoDate
        };

        // Call parent update function if available
        if (onUpdate) {
          await onUpdate(orderId, updates);
        } else {
          logger.warn('onUpdate callback not provided, skipping DB update', { orderId });
        }

        // Optimistic update
        setOrderData(prev => (
          prev.id === orderId
            ? { ...prev, ...updates }
            : prev
        ));

        toast({ description: t('orders.date_updated', 'Date updated successfully') });
      } catch (error) {
        logger.error('Failed to update completed date', error, { orderId, newDate });
        toast({ variant: 'destructive', description: t('orders.date_update_failed', 'Failed to update date') });
      }
    },
    [onUpdate, t, toast]
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
        className="max-w-7xl max-h-[90vh] p-0 flex flex-col rounded-lg overflow-hidden"
        hideCloseButton
      >
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

        {/* Unified Content Container - Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 max-w-full" id="unified-modal-top">
              {/* Unified Header - Card Grid Design */}
              <UnifiedOrderHeaderV2
                order={orderData}
                orderType={orderType}
                effectiveDealerId={effectiveDealerId}
                onStatusChange={handleStatusChange}
                onCompletedDateChange={handleCompletedDateChange}
                canEditOrder={canEditOrder}
                onEdit={handleEdit}
              />

              <div className="grid grid-cols-1 xl:grid-cols-[2fr,1fr] gap-3 sm:gap-4 lg:gap-6">
                {/* Main Content Area */}
                <div className="space-y-3 sm:space-y-4 lg:space-y-6 min-w-0 overflow-hidden">
                  {/* Row 1: Type-specific fields (Left column) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                    {/* Left: Order fields and notes */}
                    <div className="space-y-2">
                      <OrderTypeFields orderType={orderType} order={orderData} />
                      <SimpleNotesDisplay order={orderData} />
                    </div>

                    {/* Right: Schedule */}
                    <ScheduleViewBlock order={orderData as SystemOrderData} orderType={orderType} />
                  </div>

                  {/* Row 2: Team Communication - Unified with tabs (Full width) */}
                  <TeamCommunicationBlock orderId={orderData.id} />
                </div>

                {/* Right Sidebar - Clean Design */}
                <div className="space-y-3 sm:space-y-4 lg:space-y-6 min-w-0 overflow-hidden">
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

        {/* Footer with Actions - Sticky at bottom of modal */}
        <footer className="flex-none border-t bg-gradient-to-br from-background to-muted/20 p-3 sm:p-4 z-10">
            <div className="flex flex-row items-center gap-2">
              {/* Left: Icon buttons - 70% */}
              <div className="flex gap-2 flex-1">
                {/* Delete Button */}
                {canDeleteOrder && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDelete}
                    className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 sm:gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 hover:border-red-300 transition-all"
                  >
                    <Trash2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline text-sm font-medium">{t('orders.delete_order')}</span>
                  </Button>
                )}

                {/* Edit Button */}
                {canEditOrder && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleEdit}
                    className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 sm:gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all"
                  >
                    <Edit2 className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                    <span className="hidden sm:inline text-sm font-medium">{t('orders.edit')}</span>
                  </Button>
                )}

                {/* Share Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  disabled={!qrProps.shortLink}
                  className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 sm:gap-2 hover:bg-green-50 hover:text-green-700 hover:border-green-300 transition-all disabled:opacity-50"
                >
                  <Copy className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline text-sm font-medium">{t('orders.share_order')}</span>
                </Button>

                {/* Print Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => previewPrint(mapToPrintOrderData(orderData))}
                  className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 sm:gap-2 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300 transition-all"
                >
                  <Printer className="h-5 w-5 sm:h-3.5 sm:w-3.5" />
                  <span className="hidden sm:inline text-sm font-medium">{t('orders.print')}</span>
                </Button>
              </div>

              {/* Right: Close Button - 30% */}
              <Button
                onClick={onClose}
                className="w-[30%] sm:w-auto h-11 sm:h-9 px-4 sm:px-6 gap-2 sm:min-w-[120px] bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-sm hover:shadow-md transition-all font-semibold"
              >
                <span className="text-sm">{t('common.action_buttons.close')}</span>
              </Button>
            </div>
          </footer>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('orders.delete_title', { defaultValue: 'Delete Order?' })}
        description={t('messages.confirm_delete_order', { defaultValue: 'Are you sure you want to delete this order? This action cannot be undone.' })}
        confirmText={t('common.action_buttons.delete')}
        cancelText={t('common.action_buttons.cancel')}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </Dialog>
  );
});
