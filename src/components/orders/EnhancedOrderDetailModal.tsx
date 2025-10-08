/**
 * @deprecated This component is deprecated as of Phase 2 (October 2025)
 *
 * ⚠️ MIGRATION REQUIRED ⚠️
 *
 * Please use UnifiedOrderDetailModal instead:
 *
 * ```typescript
 * import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
 *
 * <UnifiedOrderDetailModal
 *   orderType="sales" // or "service", "recon", "carwash"
 *   order={order}
 *   open={open}
 *   onClose={onClose}
 *   onEdit={onEdit}
 *   onDelete={onDelete}
 *   onStatusChange={onStatusChange}
 * />
 * ```
 *
 * Benefits of UnifiedOrderDetailModal:
 * - Unified type system (UnifiedOrderData)
 * - Better performance
 * - Consistent behavior across all order types
 * - Active maintenance and updates
 * - Comprehensive test coverage
 *
 * This component will be removed in Phase 3 (November 2025)
 * Migration guide: /docs/MODAL_MIGRATION_GUIDE.md
 */

import { useOrderModalData } from '@/hooks/useOrderModalData';
import { supabase } from '@/integrations/supabase/client';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { EnhancedOrderDetailLayout } from './EnhancedOrderDetailLayout';

// Import comprehensive order types for consistency
import type {
  DatabaseOrderUpdate,
  OrderAttachment,
  OrderData
} from '@/types/order';

interface EnhancedOrderDetailModalProps {
  order: OrderData;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: OrderData) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

// Development warning for deprecated component
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ EnhancedOrderDetailModal is deprecated!\n' +
    'Please migrate to UnifiedOrderDetailModal.\n' +
    'See /docs/MODAL_MIGRATION_GUIDE.md for details.\n' +
    'This component will be removed in Phase 3 (November 2025).'
  );
}

// Optimized modal component with memoization
/**
 * @deprecated Use UnifiedOrderDetailModal instead
 */
export const EnhancedOrderDetailModal = memo(function EnhancedOrderDetailModal({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}: EnhancedOrderDetailModalProps) {
  const { t } = useTranslation();
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [notes, setNotes] = useState(order?.notes || '');
  const [internalNotes, setInternalNotes] = useState(order?.internal_notes || '');

  // Memoize useOrderModalData parameters to prevent unnecessary re-fetches
  const modalDataParams = useMemo(() => ({
    orderId: order?.id || '',
    qrCodeUrl: order?.qr_code_url || '',
    enabled: open && !!order // Only fetch when modal is open and order exists
  }), [order?.id, order?.qr_code_url, open, order]);

  // Use parallel data fetching hook for optimal performance
  const {
    data: modalData,
    loading: dataLoading,
    error: dataError,
    addAttachment: handleAttachmentUploaded,
    removeAttachment: handleAttachmentDeleted,
    refetch: refetchModalData
  } = useOrderModalData(modalDataParams);

  useEffect(() => {
    if (order) {
      setNotes(order.notes || '');
      setInternalNotes(order.internal_notes || '');
    }
  }, [order]);

  // Memoize status change handler
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (onStatusChange && order?.id) {
      await onStatusChange(order.id, newStatus);
    }
  }, [onStatusChange, order?.id]);

  // Memoize notes update handler with proper typing
  const handleNotesUpdate = useCallback(async (field: 'notes' | 'internal_notes', value: string) => {
    if (!order?.id) return;

    try {
      const updateData: DatabaseOrderUpdate = { [field]: value };
      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id);

      if (error) throw error;

      toast.success(t('messages.notes_updated_successfully'));

      // 🔔 Dispatch event to trigger RecentActivityBlock refresh
      // This ensures immediate update even if Realtime has a delay
      window.dispatchEvent(new CustomEvent('orderNotesUpdated', {
        detail: { orderId: order.id, field, value }
      }));

      if (field === 'notes') {
        setEditingNotes(false);
      } else {
        setEditingInternalNotes(false);
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error(t('messages.error_updating_notes'));
    }
  }, [order?.id, t]);

  // Enhanced attachment handlers with optimistic updates
  const handleAttachmentUploadedOptimistic = useCallback((newAttachment: OrderAttachment) => {
    handleAttachmentUploaded(newAttachment);
    toast.success(t('attachments.uploadSuccess'));
  }, [handleAttachmentUploaded, t]);

  const handleAttachmentDeletedOptimistic = useCallback((attachmentId: string) => {
    handleAttachmentDeleted(attachmentId);
    toast.success(t('attachments.deleteSuccess'));
  }, [handleAttachmentDeleted, t]);

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

  // Early return after all hooks - prevents Rules of Hooks violation
  if (!order) return null;

  // Show loading state for critical data
  if (dataLoading && !modalData.attachments.length) {
    return (
      <EnhancedOrderDetailLayout
        order={order}
        open={open}
        onClose={onClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={onStatusChange}
        onNotesUpdate={handleNotesUpdate}
        modalData={modalData}
        isLoadingData={true}
      />
    );
  }

  return (
    <EnhancedOrderDetailLayout
      order={order}
      open={open}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChange={onStatusChange}
      onNotesUpdate={handleNotesUpdate}
      modalData={modalData}
      isLoadingData={dataLoading}
      dataError={dataError}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if essential props change
  return (
    prevProps.open === nextProps.open &&
    prevProps.order?.id === nextProps.order?.id &&
    prevProps.order?.status === nextProps.order?.status &&
    prevProps.order?.notes === nextProps.order?.notes &&
    prevProps.order?.internal_notes === nextProps.order?.internal_notes &&
    // Check if order object reference changed but key properties are same
    prevProps.order?.updated_at === nextProps.order?.updated_at &&
    // Function references should be stable
    prevProps.onClose === nextProps.onClose &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onStatusChange === nextProps.onStatusChange
  );
});
