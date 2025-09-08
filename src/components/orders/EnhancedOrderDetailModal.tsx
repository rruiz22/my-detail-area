import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  X, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  Package, 
  DollarSign,
  FileText,
  MapPin,
  Phone,
  Mail,
  Paperclip
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { safeFormatDate } from '@/utils/dateUtils';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { OrderComments } from './OrderComments';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CommunicationActions } from './CommunicationActions';
import { AttachmentUploader } from './AttachmentUploader';

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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-2xl">
                {order.custom_order_number || order.order_number}
              </DialogTitle>
              <StatusBadgeInteractive
                status={order.status}
                orderId={order.id}
                dealerId={order.dealer_id}
                canUpdateStatus={true}
                onStatusChange={handleStatusChange}
              />
              <Badge variant={getPriorityColor(order.priority)}>
                {order.priority || 'normal'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="outline" size="sm" onClick={() => onEdit(order)}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  {t('common.edit')}
                </Button>
              )}
              {onDelete && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onDelete(order.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t('common.delete')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full grid grid-cols-12 gap-6 p-6">
            {/* Left Column - Order Details */}
            <div className="col-span-5 space-y-4 overflow-y-auto">
              {/* Customer Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="w-5 h-5" />
                    {t('orders.customer_information')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">{t('orders.name')}</Label>
                    <p className="text-sm">{order.customer_name}</p>
                  </div>
                  {order.customer_email && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.email')}</Label>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{order.customer_email}</p>
                      </div>
                    </div>
                  )}
                  {order.customer_phone && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.phone')}</Label>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <p className="text-sm">{order.customer_phone}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Car className="w-5 h-5" />
                    {t('orders.vehicle_information')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('orders.year')}</Label>
                      <p className="text-sm">{order.vehicle_year || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('orders.make')}</Label>
                      <p className="text-sm">{order.vehicle_make || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('orders.model')}</Label>
                      <p className="text-sm">{order.vehicle_model || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('orders.stock')}</Label>
                      <p className="text-sm">{order.stock_number || 'N/A'}</p>
                    </div>
                  </div>
                  {order.vehicle_vin && (
                    <div>
                      <Label className="text-sm font-medium">VIN</Label>
                      <p className="text-sm font-mono">{order.vehicle_vin}</p>
                    </div>
                  )}
                  {order.vehicle_info && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.additional_info')}</Label>
                      <p className="text-sm">{order.vehicle_info}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Services */}
              {order.services && order.services.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="w-5 h-5" />
                      {t('orders.services')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {order.services.map((service: any, index: number) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                          <span className="text-sm">{service.name}</span>
                          {service.price && (
                            <span className="text-sm font-medium">
                              {formatCurrency(service.price)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5" />
                    {t('orders.notes')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">{t('orders.general_notes')}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingNotes(!editingNotes)}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                    {editingNotes ? (
                      <div className="space-y-2">
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleNotesUpdate('notes', notes)}
                          >
                            {t('common.save')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setNotes(order.notes || '');
                              setEditingNotes(false);
                            }}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {notes || t('orders.no_notes')}
                      </p>
                    )}
                  </div>

                  {isDetailUser && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium text-orange-600">
                          {t('orders.internal_notes')}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingInternalNotes(!editingInternalNotes)}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {editingInternalNotes ? (
                        <div className="space-y-2">
                          <Textarea
                            value={internalNotes}
                            onChange={(e) => setInternalNotes(e.target.value)}
                            className="min-h-[80px] border-orange-200"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleNotesUpdate('internal_notes', internalNotes)}
                            >
                              {t('common.save')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setInternalNotes(order.internal_notes || '');
                                setEditingInternalNotes(false);
                              }}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                          {internalNotes || t('orders.no_internal_notes')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Schedule & Timeline */}
            <div className="col-span-4 space-y-4 overflow-y-auto">
              {/* Schedule Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Calendar className="w-5 h-5" />
                    {t('orders.schedule')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">{t('orders.created')}</Label>
                      <p className="text-sm">{safeFormatDate(order.created_at)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('orders.updated')}</Label>
                      <p className="text-sm">{safeFormatDate(order.updated_at)}</p>
                    </div>
                  </div>
                  {order.due_date && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.due_date')}</Label>
                      <p className="text-sm">{safeFormatDate(order.due_date)}</p>
                    </div>
                  )}
                  {order.scheduled_date && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.scheduled_date')}</Label>
                      <p className="text-sm">{safeFormatDate(order.scheduled_date)}</p>
                    </div>
                  )}
                  {order.salesperson && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.salesperson')}</Label>
                      <p className="text-sm">{order.salesperson}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <DollarSign className="w-5 h-5" />
                    {t('orders.order_summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{t('orders.order_type')}</span>
                    <Badge variant="outline">{order.order_type}</Badge>
                  </div>
                  {order.total_amount && (
                    <div className="flex justify-between items-center text-lg font-semibold">
                      <span>{t('orders.total_amount')}</span>
                      <span>{formatCurrency(order.total_amount)}</span>
                    </div>
                  )}
                  {order.completed_at && (
                    <div>
                      <Label className="text-sm font-medium">{t('orders.completed_at')}</Label>
                      <p className="text-sm">{safeFormatDate(order.completed_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments Section */}
              <OrderComments orderId={order.id} isDetailUser={isDetailUser} />
            </div>

            {/* Right Column - QR Code & Actions */}
            <div className="col-span-3 space-y-4 overflow-y-auto">
              {/* QR Code */}
              <QRCodeDisplay
                orderId={order.id}
                orderNumber={order.custom_order_number || order.order_number}
                dealerId={order.dealer_id}
                qrCodeUrl={order.qr_code_url}
                shortLink={order.short_link}
                onUpdate={(qrCodeUrl, shortLink) => {
                  // Update the local order object
                  order.qr_code_url = qrCodeUrl;
                  order.short_link = shortLink;
                }}
              />

              {/* Attachments Section */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Paperclip className="w-5 h-5" />
                    {t('attachments.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <AttachmentUploader
                    orderId={order.id}
                    attachments={attachments}
                    onAttachmentUploaded={handleAttachmentUploaded}
                    onAttachmentDeleted={handleAttachmentDeleted}
                    canUpload={true}
                    canDelete={true}
                  />
                </CardContent>
              </Card>

              {/* Communication Actions */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  {t('orders.communication')}
                </h3>
                <CommunicationActions order={order} />
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}