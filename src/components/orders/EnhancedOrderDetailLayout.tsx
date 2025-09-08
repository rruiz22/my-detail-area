import { ReactNode } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { QRCodeDisplay } from './QRCodeDisplay';
import { CommunicationActions } from './CommunicationActions';
import { AttachmentUploader } from './AttachmentUploader';
import { RecentActivity } from './RecentActivity';
import { safeFormatDate } from '@/utils/dateUtils';
import { getStatusColor } from '@/utils/statusUtils';

interface EnhancedOrderDetailLayoutProps {
  order: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: any) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  children: ReactNode; // Main content area (Communication Hub)
}

export function EnhancedOrderDetailLayout({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  children
}: EnhancedOrderDetailLayoutProps) {
  const { t } = useTranslation();

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

  const handleStatusChange = async (newStatus: string) => {
    if (onStatusChange) {
      await onStatusChange(order.id, newStatus);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] max-h-[100vh] w-full h-full p-0 gap-0 sm:max-w-[95vw] sm:max-h-[95vh]">
        <DialogTitle className="sr-only">
          {t('orders.order_details')} - {order.custom_order_number || order.order_number}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('orders.order_details_description', { 
            customer: order.customer_name, 
            vehicle: `${order.vehicle_year} ${order.vehicle_make} ${order.vehicle_model}` 
          })}
        </DialogDescription>
        <div className="h-full flex flex-col">
            {/* Top Bar */}
            <div className="flex-none border-b bg-card">
              <div className="flex items-center justify-between p-2 sm:p-4">
                {/* Left Section - Order Info */}
                <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                  <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-bold truncate">
                      {order.custom_order_number || order.order_number}
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {order.customer_name}
                    </p>
                  </div>
                  <StatusBadgeInteractive
                    status={order.status}
                    orderId={order.id}
                    dealerId={order.dealer_id}
                    canUpdateStatus={true}
                    onStatusChange={handleStatusChange}
                  />
                  <Badge variant={getPriorityColor(order.priority)} className="hidden sm:inline-flex">
                    {order.priority || 'normal'}
                  </Badge>
                </div>

                {/* Right Section - Actions */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {safeFormatDate(order.created_at)}
                  </div>
                  <Separator orientation="vertical" className="h-6 hidden md:block" />
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(order)} className="hidden sm:flex">
                      <Edit2 className="w-4 h-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                  )}
                  {onEdit && (
                    <Button variant="outline" size="sm" onClick={() => onEdit(order)} className="sm:hidden">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => onDelete(order.id)}
                      className="hidden sm:flex"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => onDelete(order.id)}
                      className="sm:hidden"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Info Bar */}
              <div className="px-2 pb-2 sm:px-4 sm:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">
                      {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}
                    </span>
                  </div>
                  {order.stock_number && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Stock:</span>
                      <span className="font-mono">{order.stock_number}</span>
                    </div>
                  )}
                  {order.total_amount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
                    </div>
                  )}
                  {order.due_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="truncate">Due: {safeFormatDate(order.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

          {/* Main Layout */}
          <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
            {/* Main Content Area - Communication Hub */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              {children}
            </div>

            {/* Right Sidebar - Hidden on mobile, collapsible on tablet */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-muted/30 flex flex-col order-1 lg:order-2 max-h-40 lg:max-h-none overflow-y-auto lg:overflow-visible">
              {/* QR Code Section */}
              <div className="p-2 lg:p-4 border-b">
                <div className="space-y-2 lg:space-y-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    <h3 className="font-semibold text-sm">{t('orders.qr_code')}</h3>
                  </div>
                  <div className="lg:block hidden">
                    <QRCodeDisplay 
                      orderId={order.id}
                      orderNumber={order.order_number}
                      dealerId={order.dealer_id}
                    />
                  </div>
                  <div className="lg:hidden text-xs text-muted-foreground">
                    {t('orders.qr_code_desktop_only')}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-2 lg:p-4 border-b">
                <div className="space-y-2 lg:space-y-3">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Link className="w-4 h-4" />
                    {t('orders.quick_actions')}
                  </h3>
                  <div className="space-y-2">
                    <CommunicationActions
                      order={order}
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="p-2 lg:p-4 border-b flex-1 lg:flex-none overflow-y-auto">
                <div className="space-y-2 lg:space-y-3">
                  <h3 className="font-semibold text-sm">{t('orders.summary')}</h3>
                  <div className="space-y-2 text-xs lg:text-sm">
                    <div className="flex justify-between items-center text-xs lg:text-sm">
                      <span className="text-muted-foreground">{t('orders.status')}</span>
                      <div className={`inline-flex items-center gap-1 ${getStatusColor(order.status)}`}>
                        {order.status === 'completed' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertCircle className="w-3 h-3" />
                        )}
                        {order.status}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs lg:text-sm">
                      <span className="text-muted-foreground">{t('orders.type')}</span>
                      <span className="capitalize">{order.order_type}</span>
                    </div>

                    {order.salesperson && (
                      <div className="flex justify-between items-center text-xs lg:text-sm">
                        <span className="text-muted-foreground">{t('orders.salesperson')}</span>
                        <span className="truncate">{order.salesperson}</span>
                      </div>
                    )}

                    {order.services && order.services.length > 0 && (
                      <div>
                        <div className="text-xs lg:text-sm font-medium mb-2">{t('orders.services')}</div>
                        <div className="space-y-1">
                          {order.services.slice(0, 2).map((service: any, index: number) => (
                            <div key={index} className="text-xs bg-muted p-1 lg:p-2 rounded">
                              <div className="flex justify-between gap-2">
                                <span className="truncate">{service.name}</span>
                                {service.price && (
                                  <span className="font-medium flex-shrink-0">
                                    {formatCurrency(service.price)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {order.services.length > 2 && (
                            <div className="text-xs text-muted-foreground text-center py-1">
                              +{order.services.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {order.total_amount && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between items-center font-semibold text-xs lg:text-sm">
                          <span>{t('orders.total')}</span>
                          <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="flex-1 p-2 lg:p-4 hidden lg:block">
                <RecentActivity orderId={order.id} />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}