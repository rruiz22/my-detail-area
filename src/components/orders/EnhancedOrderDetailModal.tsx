import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CommunicationHub } from './communication/CommunicationHub';
import { EnhancedOrderDetailLayout } from './EnhancedOrderDetailLayout';
import { useOrderModalData } from '@/hooks/useOrderModalData';
import { SkeletonLoader } from './SkeletonLoader';

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
  order: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: any) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

// Modal component for order details
export function EnhancedOrderDetailModal({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}: EnhancedOrderDetailModalProps) {
  // Early return MUST be before any hooks to avoid Rules of Hooks violation
  if (!order) {
    return null;
  }
  
  const { t } = useTranslation();
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [notes, setNotes] = useState(order.notes || '');
  const [internalNotes, setInternalNotes] = useState(order.internal_notes || '');

  // Use parallel data fetching hook for optimal performance
  const { 
    data: modalData, 
    loading: dataLoading, 
    error: dataError,
    addAttachment: handleAttachmentUploaded,
    removeAttachment: handleAttachmentDeleted,
    refetch: refetchModalData
  } = useOrderModalData({
    orderId: order.id,
    qrCodeUrl: order.qr_code_url,
    enabled: open // Only fetch when modal is open
  });

  useEffect(() => {
    if (order) {
      setNotes(order.notes || '');
      setInternalNotes(order.internal_notes || '');
    }
  }, [order]);

  // Memoize status change handler
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(order.id, newStatus);
    }
  }, [onStatusChange, order.id]);

  // Memoize notes update handler
  const handleNotesUpdate = useCallback(async (field: 'notes' | 'internal_notes', value: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [field]: value })
        .eq('id', order.id);

      if (error) throw error;

      toast.success(t('messages.notes_updated_successfully'));
      
      if (field === 'notes') {
        setEditingNotes(false);
      } else {
        setEditingInternalNotes(false);
      }
    } catch (error) {
      console.error('Error updating notes:', error);
      toast.error(t('messages.error_updating_notes'));
    }
  }, [order.id, t]);

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
}