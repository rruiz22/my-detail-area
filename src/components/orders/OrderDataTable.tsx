import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash, 
  QrCode, 
  MessageSquare, 
  CheckCircle, 
  Loader2,
  User,
  Car,
  Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { safeParseDate } from '@/utils/dateUtils';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { useStatusPermissions } from '@/hooks/useStatusPermissions';
import { useIsMobile } from '@/hooks/use-mobile';
import { getStatusRowColor } from '@/utils/statusUtils';

interface Order {
  id: string;
  createdAt: string;
  orderNumber?: string;
  customOrderNumber?: string;
  stockNumber?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVin?: string;
  vehicleInfo?: string;
  customerName?: string;
  status: string;
  dealer_id?: number;
  dueDate?: string;
  totalAmount?: number;
  shortLink?: string;
  comments?: number;
  followers?: number;
}

interface StatusInfo {
  text: string;
  variant: "default" | "destructive" | "outline" | "secondary" | "success" | "warning";
  className: string;
}

interface OrderCardProps {
  order: Order;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

interface StatusBadgeProps {
  status: string;
}

interface StatusBadgeInteractiveProps {
  status: string;
  orderId: string;
  dealerId: string;
  canUpdateStatus: boolean;
  onStatusChange: (orderId: string, newStatus: string) => void;
}

interface MobileActionsProps {
  order: Order;
  onView: (order: Order) => void;
  onEdit: (order: Order) => void;
  onDelete: (orderId: string) => void;
}

interface OrderDataTableProps {
  orders: any[];
  loading: boolean;
  onEdit: (order: any) => void;
  onDelete: (orderId: string) => void;
  onView: (order: any) => void;
  tabType: string;
}

export function OrderDataTable({ orders, loading, onEdit, onDelete, onView, tabType }: OrderDataTableProps) {
  const { t } = useTranslation();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const isMobile = useIsMobile();
  const { canUpdateStatus, updateOrderStatus } = useStatusPermissions();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(orders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId]);
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    try {
      const success = await updateOrderStatus(orderId, newStatus, order.dealer_id?.toString() || '');
      if (success) {
        console.log(`Status updated for order ${orderId} to ${newStatus}`);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk ${action} for orders:`, selectedOrders);
  };

  const formatDueDate = (date: string) => {
    const orderDate = safeParseDate(date);
    if (!orderDate) {
      return { text: 'N/A', variant: 'secondary' as const };
    }
    
    const today = new Date();
    const diffTime = orderDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)} días vencido`, variant: 'destructive' as const, className: 'bg-destructive text-destructive-foreground' };
    } else if (diffDays === 0) {
      return { text: 'Vence hoy', variant: 'secondary' as const, className: 'bg-orange-100 text-orange-800' };
    } else if (diffDays === 1) {
      return { text: 'Vence mañana', variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800' };
    } else {
      return { text: `Vence en ${diffDays} días`, variant: 'outline' as const, className: 'border-border text-foreground' };
    }
  };

  const paginatedOrders = orders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(orders.length / itemsPerPage);

  if (loading) {
    return (
      <Card className="border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>{t('common.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">
          {orders.length} {t('orders.orders')} 
        </CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedOrders.length === paginatedOrders.length && paginatedOrders.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="font-medium text-foreground">Orden & Cliente</TableHead>
              <TableHead className="font-medium text-foreground">Stock & Fecha</TableHead>
              <TableHead className="font-medium text-foreground">Vehículo</TableHead>
              <TableHead className="font-medium text-foreground">Estado & Vencimiento</TableHead>
              <TableHead className="font-medium text-foreground">Total & Enlaces</TableHead>
              <TableHead className="w-12 font-medium text-foreground">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedOrders.map((order) => (
              <TableRow 
                key={order.id} 
                className={`border-border transition-colors ${getStatusRowColor(order.status)}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) => handleSelectOrder(order.id, !!checked)}
                  />
                </TableCell>
                
                {/* Order Number & Customer */}
                <TableCell className="py-4">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-foreground">
                      {order.orderNumber || order.customOrderNumber || order.id.slice(0, 8)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <User className="w-3 h-3 mr-1" />
                      {order.customerName || 'Cliente no asignado'}
                    </div>
                  </div>
                </TableCell>

                {/* Stock & Creation Date */}
                <TableCell className="py-4">
                  <div className="space-y-1">
                    <div className="font-medium text-foreground">
                      {order.stockNumber || 'Sin stock'}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </TableCell>

                {/* Vehicle Info */}
                <TableCell className="py-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1">
                      <Car className="w-3 h-3 text-muted-foreground" />
                      <div className="font-medium text-foreground">
                        {order.vehicleYear} {order.vehicleMake} {order.vehicleModel}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-muted-foreground bg-muted/30 rounded px-2 py-1 inline-block">
                      VIN: {order.vehicleVin || 'No proporcionado'}
                    </div>
                    {order.vehicleInfo && (
                      <div className="text-xs text-muted-foreground">
                        {order.vehicleInfo}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Status & Due Date */}
                <TableCell className="py-4">
                  <div className="space-y-2">
                    <StatusBadgeInteractive
                      status={order.status}
                      orderId={order.id}
                      dealerId={order.dealer_id?.toString() || ''}
                      canUpdateStatus={true}
                      onStatusChange={handleStatusChange}
                    />
                    {order.dueDate && (
                      <Badge 
                        variant={formatDueDate(order.dueDate).variant}
                        className={`text-xs ${formatDueDate(order.dueDate).className}`}
                      >
                        {formatDueDate(order.dueDate).text}
                      </Badge>
                    )}
                  </div>
                </TableCell>

                {/* Amount & Quick Links */}
                <TableCell className="py-4">
                  <div className="space-y-1">
                    <div className="font-semibold text-success">
                      {order.totalAmount ? `$${order.totalAmount.toLocaleString()}` : 'N/A'}
                    </div>
                    {order.shortLink && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded px-2 py-1 font-mono">
                        {order.shortLink.slice(-8)}
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Actions */}
                <TableCell className="py-4">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(order)}
                      className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(order)}
                      className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-popover border border-border">
                        <DropdownMenuLabel className="text-foreground">Acciones</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => console.log('Generate QR', order.id)}>
                          <QrCode className="w-4 h-4 mr-2" />
                          Generar QR
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => console.log('Comments', order.id)}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Comentarios
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onDelete(order.id)} 
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            
            {paginatedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center space-y-2">
                    <Car className="w-12 h-12 text-muted-foreground/50" />
                    <p className="text-lg font-medium">No se encontraron órdenes</p>
                    <p className="text-sm">Intenta ajustar los filtros o crear una nueva orden</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
