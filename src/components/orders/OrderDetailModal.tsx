import React from 'react';
import { useTranslation } from 'react-i18next';
import { safeFormatDate } from '@/utils/dateUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  X, 
  User, 
  Car, 
  Phone, 
  Mail, 
  Calendar, 
  Clock, 
  DollarSign, 
  Package,
  MapPin,
  FileText,
  Edit,
  Trash2
} from 'lucide-react';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { Order } from '@/hooks/useOrderManagement';

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

export function OrderDetailModal({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange
}: OrderDetailModalProps) {
  const { t } = useTranslation();

  if (!order) return null;

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(order.id, newStatus);
    }
  };

  const getPriorityBadgeVariant = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const formatDate = (dateString?: string) => {
    return safeFormatDate(dateString);
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] w-[95vw] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <DialogTitle className="text-2xl font-bold">
              Orden #{order.customOrderNumber}
            </DialogTitle>
            <Badge variant={order.status === 'completed' ? 'default' : order.status === 'pending' ? 'secondary' : 'outline'}>
              {order.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(order)}
              className="gap-2"
            >
              <Edit className="w-4 h-4" />
              {t('common.edit')}
            </Button>
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(order.id)}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Customer & Vehicle Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('orders.customerInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('orders.customerName')}
                      </label>
                      <p className="text-lg font-medium">{order.customerName}</p>
                    </div>
                    {order.customerEmail && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('orders.customerEmail')}
                        </label>
                        <p className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {order.customerEmail}
                        </p>
                      </div>
                    )}
                    {order.customerPhone && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('orders.customerPhone')}
                        </label>
                        <p className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {order.customerPhone}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    {t('orders.vehicleInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.vehicleYear && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('orders.year')}
                        </label>
                        <p className="font-medium">{order.vehicleYear}</p>
                      </div>
                    )}
                    {order.vehicleMake && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('orders.make')}
                        </label>
                        <p className="font-medium">{order.vehicleMake}</p>
                      </div>
                    )}
                    {order.vehicleModel && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('orders.model')}
                        </label>
                        <p className="font-medium">{order.vehicleModel}</p>
                      </div>
                    )}
                    {order.vehicleVin && (
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          VIN
                        </label>
                        <p className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {order.vehicleVin}
                        </p>
                      </div>
                    )}
                    {order.stockNumber && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          {t('orders.stockNumber')}
                        </label>
                        <p className="font-medium">{order.stockNumber}</p>
                      </div>
                    )}
                  </div>
                  {order.vehicleInfo && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('orders.additionalInfo')}
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {order.vehicleInfo}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Services */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    {t('orders.services')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {order.services && order.services.length > 0 ? (
                    <div className="space-y-2">
                      {order.services.map((service: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{service.name || `Service ${index + 1}`}</p>
                            {service.description && (
                              <p className="text-sm text-muted-foreground">{service.description}</p>
                            )}
                          </div>
                          {service.price && (
                            <p className="font-medium">{formatCurrency(service.price)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {t('orders.noServices')}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Notes */}
              {order.notes && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      {t('orders.notes')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">
                      {order.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column - Order Details & Timeline */}
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Resumen de la Orden</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Estado:</span>
                    <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                      {order.status}
                    </Badge>
                  </div>

                  {order.priority && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Prioridad:</span>
                      <Badge variant={getPriorityBadgeVariant(order.priority)}>
                        {order.priority}
                      </Badge>
                    </div>
                  )}

                  {order.totalAmount && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Total:</span>
                      <span className="text-lg font-bold flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </div>
                  )}

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Creada:</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Actualizada:</span>
                      <span>{formatDate(order.updatedAt)}</span>
                    </div>

                    {order.dueDate && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Vencimiento:</span>
                        <span>{formatDate(order.dueDate)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Info */}
              {order.assignedTo && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle>Asignación</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Asignado a:</span>
                      <span className="font-medium">{order.assignedTo}</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}