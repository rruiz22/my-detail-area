import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { useServices } from '@/contexts/ServicesContext';
import {
  Calendar,
  User,
  Mail,
  Phone,
  Edit2,
  Hash,
  Building2,
  Wrench,
  Settings,
  Droplets,
  Car
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Order {
  id: string;
  orderNumber?: string;
  order_number?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleTrim?: string;
  stockNumber?: string;
  stock_number?: string;
  vehicleVin?: string;
  vehicle_vin?: string;
  assignedTo?: string;
  assigned_to?: string;
  customerName?: string;
  customer_name?: string;
  customerEmail?: string;
  customer_email?: string;
  customerPhone?: string;
  customer_phone?: string;
  dueDate?: string;
  due_date?: string;
  completedAt?: string | Date;
  completed_at?: string | Date;
  dealershipName?: string;
  services?: any[];
}

interface UnifiedOrderHeaderV2Props {
  order: Order;
  orderType: 'sales' | 'service' | 'recon' | 'carwash';
  effectiveDealerId: string;
  onStatusChange?: (orderId: string, newStatus: string) => void;
  canEditOrder?: boolean;
  onEdit?: () => void;
}

export function UnifiedOrderHeaderV2({
  order,
  orderType,
  effectiveDealerId,
  onStatusChange,
  canEditOrder,
  onEdit
}: UnifiedOrderHeaderV2Props) {
  const { t } = useTranslation();
  const { getServices } = useServices();

  const orderNumber = useMemo(() =>
    order.orderNumber || order.order_number || t('orders.new_order'),
    [order.orderNumber, order.order_number, t]
  );

  const vehicleDisplay = useMemo(() => {
    const parts = [order.vehicleYear, order.vehicleMake, order.vehicleModel, order.vehicleTrim]
      .filter(Boolean);
    return parts.join(' ') || 'Vehicle Info';
  }, [order.vehicleYear, order.vehicleMake, order.vehicleModel, order.vehicleTrim]);

  const stockNumber = order.stockNumber || order.stock_number || 'N/A';
  const assignedTo = order.assignedTo || order.assigned_to || 'Unassigned';
  const customerName = order.customerName || order.customer_name || '';
  const customerEmail = order.customerEmail || order.customer_email;
  const customerPhone = order.customerPhone || order.customer_phone;

  // For recon and carwash orders, use completed_at instead of due_date
  const usesCompleteDate = orderType === 'recon' || orderType === 'carwash';
  const displayDate = usesCompleteDate
    ? (order.completedAt || order.completed_at)
    : (order.dueDate || order.due_date);
  const dateLabel = usesCompleteDate ? 'Complete Date' : 'Due Date';

  // Get enriched services from global cache
  const enrichedServices = useMemo(() => {
    if (!order.services || !Array.isArray(order.services)) return [];

    // Check if already enriched objects
    if (order.services.length > 0 && typeof order.services[0] === 'object' && 'name' in order.services[0]) {
      return order.services;
    }

    // Services are IDs, lookup from cache
    return getServices(order.services as string[]);
  }, [order.services, getServices]);

  const servicesCount = enrichedServices.length;

  // Helper to get service icon
  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('oil') || name.includes('change')) {
      return <Droplets className="h-3.5 w-3.5 text-blue-600" />;
    }
    if (name.includes('brake') || name.includes('pad')) {
      return <Settings className="h-3.5 w-3.5 text-red-600" />;
    }
    if (name.includes('inspection') || name.includes('check')) {
      return <Settings className="h-3.5 w-3.5 text-green-600" />;
    }
    if (name.includes('wash') || name.includes('clean') || name.includes('detail')) {
      return <Car className="h-3.5 w-3.5 text-blue-500" />;
    }
    return <Wrench className="h-3.5 w-3.5 text-gray-600" />;
  };

  return (
    <div className="bg-background pb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Cell 1: Order Number */}
        <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center justify-center min-h-[120px]">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 tracking-wide">Order</div>
            <div className="font-bold text-2xl text-foreground mb-2">#{orderNumber}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="w-3.5 h-3.5" />
              <span className="truncate">{order.dealershipName || 'Unknown'}</span>
            </div>
          </CardContent>
        </Card>

        {/* Cell 2: Vehicle Information */}
        <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center justify-center min-h-[120px]">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 tracking-wide">Vehicle</div>
            <div className="font-bold text-base text-foreground mb-1">{vehicleDisplay}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Hash className="w-4 h-4" />
              <span className="font-mono font-semibold">{stockNumber}</span>
            </div>
            {order.vehicleVin && (
              <div className="text-sm text-muted-foreground font-mono font-semibold mt-1">
                VIN: {order.vehicleVin.slice(-8)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cell 3: Services */}
        <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6 flex flex-col items-center justify-start min-h-[120px]">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-3 tracking-wide">
              Services ({servicesCount})
            </div>
            {servicesCount === 0 ? (
              <div className="text-xs text-muted-foreground font-medium">No services</div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                {enrichedServices.map((service) => (
                  <Badge key={service.id} variant="outline" className="text-sm px-3 py-1.5 justify-center font-semibold flex items-center gap-2">
                    {getServiceIcon(service.name)}
                    {service.name}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cell 4: Assigned To + Quick Actions */}
        <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center justify-center min-h-[120px]">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 tracking-wide">Assigned</div>
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-base text-foreground truncate">{assignedTo}</span>
            </div>
            {customerName && (
              <>
                <div className="text-sm text-muted-foreground mb-2 truncate max-w-full font-medium">{customerName}</div>
                <div className="flex items-center gap-2 justify-center">
                  {customerEmail && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      title={customerEmail}
                      onClick={() => window.location.href = `mailto:${customerEmail}`}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {customerPhone && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2"
                      title={customerPhone}
                      onClick={() => window.location.href = `tel:${customerPhone}`}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Cell 5: Date (Due Date or Complete Date for Recon) */}
        <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6 flex flex-col items-center text-center justify-center min-h-[120px]">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-2 tracking-wide">{dateLabel}</div>
            {displayDate ? (
              <>
                <div className="font-bold text-base text-foreground">
                  {new Date(displayDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">
                    {new Date(displayDate).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground font-medium">Not set</div>
            )}
          </CardContent>
        </Card>

        {/* Cell 6: Status */}
        <Card className="border-border shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-3 tracking-wide">Status</div>
            {onStatusChange ? (
              <div className="scale-110">
                <StatusBadgeInteractive
                  status={order.status}
                  orderId={order.id}
                  dealerId={effectiveDealerId}
                  canUpdateStatus={true}
                  onStatusChange={onStatusChange}
                />
              </div>
            ) : (
              <Badge className="px-4 py-1.5 rounded-sm text-base font-semibold">
                {t(`common.status.${order.status}`)}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
