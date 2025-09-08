import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Edit, 
  Calendar, 
  Clock, 
  User, 
  Car, 
  DollarSign,
  FileText,
  Phone,
  Mail,
  MapPin,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { Order } from '@/hooks/useOrderManagement';
import { safeFormatDate, calculateDaysFromNow } from '@/utils/dateUtils';

interface OrderPreviewPanelProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onEdit: (order: Order) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
}

export function OrderPreviewPanel({ 
  order, 
  open, 
  onClose, 
  onEdit,
  onStatusChange 
}: OrderPreviewPanelProps) {
  const { t } = useTranslation();

  if (!order) return null;

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const diffDays = calculateDaysFromNow(dueDate);
    if (diffDays === null) return null;
    
    if (diffDays < 0) {
      return { 
        text: `${Math.abs(diffDays)} days overdue`, 
        variant: 'destructive' as const,
        icon: AlertCircle,
        urgent: true
      };
    } else if (diffDays === 0) {
      return { 
        text: 'Due today', 
        variant: 'warning' as const,
        icon: Clock,
        urgent: true
      };
    } else if (diffDays === 1) {
      return { 
        text: 'Due tomorrow', 
        variant: 'secondary' as const,
        icon: Calendar,
        urgent: false
      };
    } else {
      return { 
        text: `Due in ${diffDays} days`, 
        variant: 'outline' as const,
        icon: Calendar,
        urgent: false
      };
    }
  };

  const dueInfo = formatDueDate(order.dueDate);
  const vehicleDisplay = order.vehicleInfo || 
    (order.vehicleYear && order.vehicleMake && order.vehicleModel 
      ? `${order.vehicleYear} ${order.vehicleMake} ${order.vehicleModel}`
      : 'Vehicle details not available');

  return (
    <Sheet open={open} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl font-semibold">
              Order #{order.id}
            </SheetTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(order)}
              className="flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Order
            </Button>
          </div>
          
          {/* Status & Due Date */}
          <div className="flex items-center gap-3">
            <StatusBadgeInteractive
              status={order.status as "Pending" | "In Progress" | "Complete" | "Cancelled"}
              orderId={order.id}
              dealerId="1"
              canUpdateStatus={true}
              onStatusChange={onStatusChange || (() => {})}
            />
            {dueInfo && (
              <Badge 
                variant={dueInfo.variant === 'warning' ? 'secondary' : dueInfo.variant} 
                className={`flex items-center gap-1 ${dueInfo.urgent ? 'animate-pulse' : ''} ${
                  dueInfo.variant === 'warning' ? 'bg-warning/20 text-warning border-warning' : ''
                }`}
              >
                <dueInfo.icon className="w-3 h-3" />
                {dueInfo.text}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Customer Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.customerName && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{order.customerName}</span>
                </div>
              )}
              {order.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{order.customerEmail}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{order.customerPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="w-4 h-4" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">{vehicleDisplay}</span>
              </div>
              {order.vin && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">VIN:</span> {order.vin}
                </div>
              )}
              {order.stockNumber && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Stock #:</span> {order.stockNumber}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.orderType && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{order.orderType}</Badge>
                </div>
              )}
              
              {order.priority && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge 
                    variant={order.priority === 'urgent' ? 'destructive' : 'secondary'}
                    className={order.priority === 'high' ? 'bg-warning/20 text-warning border-warning' : ''}
                  >
                    {order.priority}
                  </Badge>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span className="text-sm">{safeFormatDate(order.createdAt)}</span>
              </div>

              {order.updatedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="text-sm">{safeFormatDate(order.updatedAt)}</span>
                </div>
              )}

              {order.assignedTo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span className="text-sm font-medium">{order.assignedTo}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Services & Pricing */}
          {(order.services || order.totalAmount) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Services & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.services && order.services.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Services:</span>
                    <div className="mt-2 space-y-1">
                      {order.services.map((service, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{typeof service === 'string' ? service : service.name}</span>
                          {typeof service === 'object' && service.price && (
                            <span className="font-medium">${service.price}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {order.totalAmount && (
                  <>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>Total Amount:</span>
                      <span className="text-lg text-success">${order.totalAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {order.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => onEdit(order)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Order
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}