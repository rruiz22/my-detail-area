import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CommunicationHub } from './communication/CommunicationHub';
import { EnhancedOrderDetailLayout } from './EnhancedOrderDetailLayout';

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

export function EnhancedOrderDetailModal({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}: EnhancedOrderDetailModalProps) {
  const { t } = useTranslation();
  const [isDetailUser, setIsDetailUser] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingInternalNotes, setEditingInternalNotes] = useState(false);
  const [notes, setNotes] = useState(order?.notes || '');
  const [internalNotes, setInternalNotes] = useState(order?.internal_notes || '');
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);

  useEffect(() => {
    if (order) {
      setNotes(order.notes || '');
      setInternalNotes(order.internal_notes || '');
      fetchAttachments();
    }
    checkUserType();
  }, [order]);

  const checkUserType = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (user.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.user.id)
          .single();
        
        setIsDetailUser(profile?.user_type === 'detail');
      }
    } catch (error) {
      console.error('Error checking user type:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(order.id, newStatus);
    }
  };

  const handleNotesUpdate = async (field: 'notes' | 'internal_notes', value: string) => {
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
  };

  const fetchAttachments = async () => {
    if (!order?.id) return;
    
    setLoadingAttachments(true);
    try {
      const { data, error } = await supabase
        .from('order_attachments')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error(t('attachments.loadError'));
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleAttachmentUploaded = (newAttachment: OrderAttachment) => {
    setAttachments((prev) => [newAttachment, ...prev]);
  };

  const handleAttachmentDeleted = (attachmentId: string) => {
    setAttachments((prev) => prev.filter(att => att.id !== attachmentId));
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  if (!order) return null;

  return (
    <EnhancedOrderDetailLayout
      order={order}
      open={open}
      onClose={onClose}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChange={onStatusChange}
    >
      <CommunicationHub 
        orderId={order.id}
        isDetailUser={isDetailUser}
      />
    </EnhancedOrderDetailLayout>
  );
}