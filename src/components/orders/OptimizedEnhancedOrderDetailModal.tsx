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
 * - Better performance optimization
 * - Consistent behavior across all order types
 * - Active maintenance and updates
 * - Comprehensive test coverage
 * - Built-in error boundaries
 *
 * This component will be removed in Phase 3 (November 2025)
 * Migration guide: /docs/MODAL_MIGRATION_GUIDE.md
 */

import { useOrderModalData } from '@/hooks/useOrderModalData';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { supabase } from '@/integrations/supabase/client';
import { OrderData } from '@/types/order';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { EnhancedOrderDetailLayout } from './EnhancedOrderDetailLayout';
import { ErrorBoundaryModal } from './ErrorBoundaryModal';

// Development warning for deprecated component
if (process.env.NODE_ENV === 'development') {
  console.warn(
    '⚠️ OptimizedEnhancedOrderDetailModal is deprecated!\n' +
    'Please migrate to UnifiedOrderDetailModal.\n' +
    'See /docs/MODAL_MIGRATION_GUIDE.md for details.\n' +
    'This component will be removed in Phase 3 (November 2025).'
  );
}

interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  upload_context: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface EnhancedOrderDetailModalProps {
  order: OrderData | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: OrderData) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

// Memoized modal component for optimal performance
export const EnhancedOrderDetailModal = memo(function EnhancedOrderDetailModal({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}: EnhancedOrderDetailModalProps) {
  const { t } = useTranslation();
  const { startMeasure, endMeasure, recordMetric } = usePerformanceMonitor();

  const [editingNotes, setEditingNotes] = useState(false);
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [notes, setNotes] = useState(order?.notes || '');
  const [internalNotes, setInternalNotes] = useState(order?.internal_notes || '');

  // Track modal performance
  useEffect(() => {
    if (open) {
      const measureId = startMeasure('modal-lifecycle');
      recordMetric('modal-opened', 1);
      return () => {
        endMeasure(measureId);
        recordMetric('modal-closed', 1);
      };
    }
  }, [open, startMeasure, endMeasure, recordMetric]);

  // Enhanced data fetching with performance monitoring and error handling
  const {
    data: modalData,
    loading: dataLoading,
    error: dataError,
    addAttachment: handleAttachmentUploaded,
    removeAttachment: handleAttachmentDeleted,
    refetch: refetchModalData,
    forceRefresh,
    clearCache,
    getCacheSize
  } = useOrderModalData({
    orderId: order?.id || '',
    qrSlug: order?.qrSlug || '',
    enabled: open && !!order // Only fetch when modal is open and order exists
  });

  // Memoize modal data for performance
  const memoizedModalData = useMemo(() => modalData, [modalData]);

  // Performance monitoring for data loading
  useEffect(() => {
    if (dataLoading) {
      recordMetric('data-loading-start', 1);
    } else {
      recordMetric('data-loading-end', 1);
    }
  }, [dataLoading, recordMetric]);

  // Optimized effect with proper dependency tracking
  useEffect(() => {
    if (order?.id) {
      setNotes(order.notes || '');
      setInternalNotes(order.internal_notes || '');
    }
  }, [order?.id, order?.notes, order?.internal_notes]); // More specific dependencies

  // Enhanced memoized handlers with performance tracking
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!onStatusChange || !order?.id) return;

    const measureId = startMeasure('status-change-operation');
    try {
      await onStatusChange(order.id, newStatus);
      recordMetric('status-change-success', 1);
    } catch (error) {
      recordMetric('status-change-error', 1);
      throw error;
    } finally {
      endMeasure(measureId);
    }
  }, [onStatusChange, order?.id, startMeasure, endMeasure, recordMetric]);

  // Enhanced notes update handler with performance tracking and optimistic updates
  const handleNotesUpdate = useCallback(async (field: 'notes' | 'internal_notes', value: string) => {
    if (!order?.id) return;

    const measureId = startMeasure('notes-update-operation');

    // Optimistic update
    if (field === 'notes') {
      setNotes(value);
    } else {
      setInternalNotes(value);
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ [field]: value })
        .eq('id', order.id);

      if (error) throw error;

      toast({ description: t('messages.notes_updated_successfully') });
      recordMetric('notes-update-success', 1);

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
      // Revert optimistic update on error
      if (field === 'notes') {
        setNotes(order.notes || '');
      } else {
        setInternalNotes(order.internal_notes || '');
      }

      console.error('Error updating notes:', error);
      toast({ variant: 'destructive', description: t('messages.error_updating_notes') });
      recordMetric('notes-update-error', 1);
    } finally {
      endMeasure(measureId);
    }
  }, [order?.id, order?.notes, order?.internal_notes, t, startMeasure, endMeasure, recordMetric]);

  // Enhanced attachment handlers with performance tracking
  const handleAttachmentUploadedOptimistic = useCallback((newAttachment: OrderAttachment) => {
    const measureId = startMeasure('attachment-upload');
    try {
      handleAttachmentUploaded(newAttachment);
      toast({ description: t('attachments.uploadSuccess') });
      recordMetric('attachment-upload-success', 1);
    } catch (error) {
      recordMetric('attachment-upload-error', 1);
      throw error;
    } finally {
      endMeasure(measureId);
    }
  }, [handleAttachmentUploaded, t, startMeasure, endMeasure, recordMetric]);

  const handleAttachmentDeletedOptimistic = useCallback((attachmentId: string) => {
    const measureId = startMeasure('attachment-delete');
    try {
      handleAttachmentDeleted(attachmentId);
      toast({ description: t('attachments.deleteSuccess') });
      recordMetric('attachment-delete-success', 1);
    } catch (error) {
      recordMetric('attachment-delete-error', 1);
      throw error;
    } finally {
      endMeasure(measureId);
    }
  }, [handleAttachmentDeleted, t, startMeasure, endMeasure, recordMetric]);

  // Enhanced memoized utility functions with error handling and performance
  const formatCurrency = useMemo(() => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    return (amount: number | null | undefined) => {
      if (!amount || isNaN(amount)) return 'N/A';
      try {
        return formatter.format(amount);
      } catch (error) {
        console.warn('Currency formatting error:', error);
        return `$${amount.toFixed(2)}`;
      }
    };
  }, []);

  const getPriorityColor = useMemo(() => (priority: string) => {
    const normalizedPriority = priority?.toLowerCase();
    switch (normalizedPriority) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  }, []);

  // Enhanced loading and error state handling
  const shouldShowLoadingState = useMemo(() => {
    return dataLoading && !memoizedModalData.attachments.length && !memoizedModalData.comments.length;
  }, [dataLoading, memoizedModalData.attachments.length, memoizedModalData.comments.length]);

  // Memoize close handler to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    recordMetric('modal-close-initiated', 1);
    // Clear any pending measurements
    if (getCacheSize() > 10) {
      clearCache();
    }
    onClose();
  }, [onClose, recordMetric, clearCache, getCacheSize]);

  // Early return after all hooks - prevents Rules of Hooks violation
  if (!order) return null;

  // Show loading state for critical data
  if (shouldShowLoadingState) {
    return (
      <ErrorBoundaryModal>
        <EnhancedOrderDetailLayout
          order={order}
          open={open}
          onClose={handleClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onStatusChange={handleStatusChange}
          onNotesUpdate={handleNotesUpdate}
          modalData={memoizedModalData}
          isLoadingData={true}
          dataError={dataError}
        />
      </ErrorBoundaryModal>
    );
  }

  return (
    <ErrorBoundaryModal>
      <EnhancedOrderDetailLayout
        order={order}
        open={open}
        onClose={handleClose}
        onEdit={onEdit}
        onDelete={onDelete}
        onStatusChange={handleStatusChange}
        onNotesUpdate={handleNotesUpdate}
        modalData={memoizedModalData}
        isLoadingData={dataLoading}
        dataError={dataError}
      />
    </ErrorBoundaryModal>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for optimal re-render prevention
  if (!prevProps.order && !nextProps.order) return true;
  if (!prevProps.order || !nextProps.order) return false;

  return (
    prevProps.order.id === nextProps.order.id &&
    prevProps.order.status === nextProps.order.status &&
    prevProps.order.notes === nextProps.order.notes &&
    prevProps.order.internal_notes === nextProps.order.internal_notes &&
    prevProps.open === nextProps.open
  );
});
