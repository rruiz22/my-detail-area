import { CompletedDateInline } from '@/components/CompletedDateInline';
import { StatusBadgeInteractive } from '@/components/StatusBadgeInteractive';
import { StockImageLightbox } from '@/components/get-ready/StockImageLightbox';
import { VehicleImageWithLoader } from '@/components/get-ready/VehicleImageWithLoader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useServices } from '@/contexts/ServicesContext';
import { useStockPhotosForVehicle } from '@/hooks/useStockPhotosForVehicle';
import {
    Calendar,
    Car,
    Droplets,
    Edit2,
    Hash,
    Settings,
    User,
    Wrench
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
  onCompletedDateChange?: (orderId: string, newDate: Date | null) => Promise<void>;
  canEditOrder?: boolean;
  onEdit?: () => void;
}

export function UnifiedOrderHeaderV2({
  order,
  orderType,
  effectiveDealerId,
  onStatusChange,
  onCompletedDateChange,
  canEditOrder,
  onEdit
}: UnifiedOrderHeaderV2Props) {
  const { t } = useTranslation();
  const { getServices } = useServices();

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
  const vehicleVin = order.vehicleVin || order.vehicle_vin || '';
  const assignedTo = order.assignedTo || order.assigned_to || 'Unassigned';
  const customerName = order.customerName || order.customer_name || '';
  const customerEmail = order.customerEmail || order.customer_email;
  const customerPhone = order.customerPhone || order.customer_phone;

  // Get vehicle image from stock photos
  const { data: stockPhotosData } = useStockPhotosForVehicle({
    vin: vehicleVin,
    dealerId: parseInt(effectiveDealerId)
  });

  const primaryPhoto = stockPhotosData?.photos?.[0]?.photo_url || stockPhotosData?.vehicleImageUrl;

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
    <div className="bg-background pb-3">
      {/* Compact Header - Single Bar */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-4">
            {/* Order Number */}
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-primary" />
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order</div>
                <div className="font-bold text-xl text-foreground">{orderNumber}</div>
              </div>
            </div>

            <div className="h-10 w-px bg-border hidden sm:block" />

            {/* Vehicle */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="cursor-pointer group relative"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxOpen(true);
                }}
              >
                <VehicleImageWithLoader
                  src={primaryPhoto}
                  alt={vehicleDisplay}
                  className="w-12 h-12 rounded-lg flex-shrink-0 border border-border"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium">
                    View
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Vehicle</div>
                <div className="font-bold text-base text-foreground truncate">{vehicleDisplay}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Stock: <span className="font-semibold text-foreground">{stockNumber}</span>
                </div>
              </div>
            </div>

            <div className="h-10 w-px bg-border hidden lg:block" />

            {/* Services */}
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Services</div>
                {servicesCount > 0 ? (
                  <div className="font-bold text-base text-foreground max-w-[240px]">
                    {enrichedServices.map((service, index) => (
                      <span key={service.id || index}>
                        {service.name || service.service_name}
                        {index < enrichedServices.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-base text-muted-foreground">No services</div>
                )}
              </div>
            </div>

            {orderType !== 'recon' && orderType !== 'carwash' && (
              <>
                <div className="h-10 w-px bg-border hidden lg:block" />

                {/* Assigned */}
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-primary flex-shrink-0" />
                  <div>
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assigned</div>
                    <div className="font-bold text-base text-foreground truncate max-w-[140px]">{assignedTo}</div>
                  </div>
                </div>
              </>
            )}

            <div className="h-10 w-px bg-border hidden lg:block" />

            {/* Date */}
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{dateLabel}</div>
                {usesCompleteDate && onCompletedDateChange ? (
                  <CompletedDateInline
                    completedAt={displayDate}
                    orderId={order.id}
                    orderType={orderType as 'recon' | 'carwash'}
                    onDateChange={onCompletedDateChange}
                    canEdit={canEditOrder || false}
                  />
                ) : displayDate ? (
                  <div className="font-bold text-base text-foreground">
                    <div>
                      {new Date(displayDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">
                      {new Date(displayDate).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-base text-muted-foreground">Not set</div>
                )}
              </div>
            </div>

            <div className="h-10 w-px bg-border hidden xl:block" />

            {/* Status */}
            <div className="flex items-center gap-2 ml-auto">
              {onStatusChange ? (
                <StatusBadgeInteractive
                  status={order.status}
                  orderId={order.id}
                  dealerId={effectiveDealerId}
                  canUpdateStatus={true}
                  onStatusChange={onStatusChange}
                />
              ) : (
                <Badge className="px-3 py-1 text-sm font-semibold">
                  {t(`common.status.${order.status}`)}
                </Badge>
              )}

              {canEditOrder && onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                  className="h-8 px-2"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stock Image Lightbox */}
      {vehicleVin && (
        <StockImageLightbox
          vehicleVin={vehicleVin}
          vehicleInfo={`${vehicleDisplay} - ${stockNumber}`}
          dealerId={parseInt(effectiveDealerId)}
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
        />
      )}
    </div>
  );
}
