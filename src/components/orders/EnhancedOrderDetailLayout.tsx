import { ReactNode } from 'react';
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
  FileText
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
import { safeFormatDate } from '@/utils/dateUtils';
import { getStatusColor } from '@/utils/statusUtils';

interface EnhancedOrderDetailLayoutProps {
  order: any;
  open: boolean;
  onClose: () => void;
  onEdit?: (order: any) => void;
  onDelete?: (orderId: string) => void;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  onNotesUpdate?: (orderId: string, notes: string, type: 'general' | 'internal') => void;
  children: ReactNode; // Main content area (Communication Hub)
}

export function EnhancedOrderDetailLayout({
  order,
  open,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  onNotesUpdate,
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
      <DialogContent className="max-w-none max-h-none w-screen h-screen p-0 gap-0 m-0 rounded-none border-0">
        <DialogTitle className="sr-only">
          {t('orders.order_details')} - {order.custom_order_number || order.order_number}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('orders.order_details_description', { 
            customer: order.customer_name, 
            vehicle: `${order.vehicle_year} ${order.vehicle_make} ${order.vehicle_model}` 
          })}
        </DialogDescription>
        <div className="h-screen flex flex-col">
            {/* Header - Clean Layout */}
            <header className="flex-none border-b bg-background">
              <div className="flex items-center justify-between p-4">
                {/* Left - Order Info */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold truncate">
                      {order.custom_order_number || order.order_number}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground truncate">
                        {order.customer_name}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        {order.vehicle_year} {order.vehicle_make} {order.vehicle_model}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{order.advisor || 'Unassigned'}</span>
                    </div>
                    
                    <StatusBadgeInteractive
                      status={order.status}
                      orderId={order.id}
                      dealerId={order.dealer_id}
                      canUpdateStatus={true}
                      onStatusChange={handleStatusChange}
                    />
                  </div>
                </div>

                {/* Right - Single Close Button */}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>

          {/* Unified Content Container - Single Scroll */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="p-6">
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

                  {/* Row 3: Communication Hub (Full width) */}
                  <div className="min-h-[400px]">
                    {children}
                  </div>
                </div>

                {/* Right Sidebar - Clean Design */}
                <div className="space-y-4">
                  {/* Enhanced QR Code & Short Link Block */}
                  <EnhancedQRCodeBlock 
                    orderId={order.id}
                    orderNumber={order.order_number}
                    dealerId={order.dealer_id}
                    qrSlug={order.qr_slug}
                    shortUrl={order.short_url}
                  />

                  {/* Followers Block */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Followers</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                        <span>{order.advisor || 'Unassigned'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Assigned advisor for this order
                      </p>
                    </div>
                  </div>

                  {/* Quick Actions Block */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Quick Actions</h3>
                    </div>
                    <CommunicationActions order={order} />
                  </div>

                  {/* Recent Activities Block */}
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm">Recent Activities</h3>
                    </div>
                    <RecentActivity orderId={order.id} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Close Button */}
          <footer className="flex-none border-t bg-background p-4">
            <div className="flex justify-end">
              <Button onClick={onClose} size="lg" className="min-w-[120px]">
                Close
              </Button>
            </div>
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}