import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CompletionDatePicker } from '@/components/ui/completion-date-picker';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { useDealerServices, useDealerships } from '@/hooks/useDealerships';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { safeParseDate } from '@/utils/dateUtils';
import { formatVehicleDisplay } from '@/utils/vehicleUtils';
import { logger } from '@/utils/logger';
import { AlertCircle, Building2, Car, Clock, FileText, Loader2, Wrench, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

interface OrderFormData {
  // Order identification
  orderNumber: string;
  orderType: string;
  status: string;

  // Customer information (vehicle owner)
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;

  // Vehicle information
  vehicleVin: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleInfo: string;
  stockNumber: string;
  tag: string;

  // Car wash specific
  service: string;
  isWaiter: boolean;

  // Assignment information (employee responsible)
  assignedGroupId?: string;
  assignedContactId?: string;
  salesperson?: string;

  // Order details
  notes: string;
  internalNotes?: string;
  priority?: string;
  completedAt?: Date; // Completion date for car wash
  dueDate?: Date;
  slaDeadline?: Date;
  scheduledDate?: Date;
  scheduledTime?: string;
}

interface CarWashOrderModalProps {
  order?: any;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: any) => void;
}

const normalizeServiceId = (service: any): string => {
  if (!service) return '';
  if (typeof service === 'string' || typeof service === 'number') {
    return service.toString();
  }
  if (typeof service === 'object') {
    if (service.id) return service.id.toString();
    if (service.service_id) return service.service_id.toString();
    if (service.type) return service.type.toString();
    if (service.name) return service.name.toString();
  }
  return '';
};

const CarWashOrderModal: React.FC<CarWashOrderModalProps> = ({ order, open, onClose, onSave }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();

  // Form state
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: '',
    orderType: 'car_wash',
    status: 'completed',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    stockNumber: '',
    tag: '',
    service: '',
    isWaiter: false,
    assignedGroupId: '',
    assignedContactId: '',
    salesperson: '',
    notes: '',
    internalNotes: '',
    priority: 'normal',
    completedAt: undefined,
    dueDate: undefined,
    slaDeadline: undefined,
    scheduledDate: undefined,
    scheduledTime: ''
  });

  const [selectedDealership, setSelectedDealership] = useState('');

  // Use React Query hooks for dealerships and services (with caching)
  const { data: dealerships = [], isLoading: dealershipsLoading } = useDealerships();
  const { data: services = [], isLoading: servicesLoading } = useDealerServices(
    selectedDealership ? parseInt(selectedDealership) : null,
    'CarWash Dept'
  );

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serviceRequiredError, setServiceRequiredError] = useState(false);
  const [isManuallyEditingVehicleInfo, setIsManuallyEditingVehicleInfo] = useState(false);

  // Combine loading states
  const loading = dealershipsLoading || servicesLoading;

  // Check for global dealer filter
  const globalDealerFilter = localStorage.getItem('selectedDealerFilter');
  const isGlobalFilterActive = globalDealerFilter && globalDealerFilter !== 'all';
  const isDealerFieldReadOnly = Boolean(isGlobalFilterActive);

  // Declare handleDealershipChange
  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealership(dealershipId);
    setSelectedServices([]);
    setServiceRequiredError(false);
    handleInputChange('service', '');
    // Services are now loaded automatically via React Query hook when selectedDealership changes
  };

  // Auto-generate vehicle display when VIN is decoded or fields change
  // Only auto-update if user is NOT manually editing the field
  useEffect(() => {
    if (!isManuallyEditingVehicleInfo) {
      const vehicleDisplay = formatVehicleDisplay(
        formData.vehicleYear,
        formData.vehicleMake,
        formData.vehicleModel
      );
      if (vehicleDisplay !== formData.vehicleInfo && vehicleDisplay) {
        setFormData(prev => ({ ...prev, vehicleInfo: vehicleDisplay }));
      }
    }
  }, [formData.vehicleYear, formData.vehicleMake, formData.vehicleModel, isManuallyEditingVehicleInfo]);

  useEffect(() => {
    if (open) {
      // Dealerships are now loaded via React Query hook - no need to fetch manually

      if (order) {
        // Extract all services from order (support for multiple services)
        const orderServices = Array.isArray(order.services) && order.services.length > 0
          ? order.services.map((s: any) => normalizeServiceId(s)).filter(Boolean)
          : order.service ? [normalizeServiceId(order.service)] : [];

        setFormData({
          orderNumber: order.orderNumber || order.order_number || '',
          orderType: order.orderType || order.order_type || 'car_wash',
          status: order.status || 'pending',
          customerName: order.customerName || order.customer_name || '',
          customerEmail: order.customerEmail || order.customer_email || '',
          customerPhone: order.customerPhone || order.customer_phone || '',
          vehicleVin: order.vehicleVin || order.vehicle_vin || '',
          vehicleYear: order.vehicleYear?.toString() || order.vehicle_year?.toString() || '',
          vehicleMake: order.vehicleMake || order.vehicle_make || '',
          vehicleModel: order.vehicleModel || order.vehicle_model || '',
          vehicleInfo: order.vehicleInfo || order.vehicle_info || '',
          stockNumber: order.stockNumber || order.stock_number || '',
          tag: order.tag || '',
          service: orderServices[0] || '',  // Keep for backwards compatibility
          isWaiter: order.isWaiter || false,
          assignedGroupId: order.assignedGroupId || order.assigned_group_id || '',
          assignedContactId: order.assignedContactId || order.assigned_contact_id || '',
          salesperson: order.salesperson || '',
          notes: order.notes || '',
          internalNotes: order.internalNotes || order.internal_notes || '',
          priority: order.priority || 'normal',
          completedAt: order.completedAt || order.completed_at ? safeParseDate(order.completedAt || order.completed_at) || undefined : undefined,
          dueDate: order.dueDate ? safeParseDate(order.dueDate) || undefined : undefined,
          slaDeadline: order.slaDeadline ? safeParseDate(order.slaDeadline) || undefined : undefined,
          scheduledDate: order.scheduledDate ? safeParseDate(order.scheduledDate) || undefined : undefined,
          scheduledTime: order.scheduledTime || ''
        });
        setSelectedServices(orderServices);
        setServiceRequiredError(false);
        // Dealership will be set by separate useEffect after dealerships load
      } else {
        // Reset form for new order
        setFormData({
          orderNumber: '',
          orderType: 'car_wash',
          status: 'completed',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          stockNumber: '',
          tag: '',
          service: '',
          isWaiter: false,
          assignedGroupId: '',
          assignedContactId: '',
          salesperson: '',
          notes: '',
          internalNotes: '',
          priority: 'normal',
          completedAt: new Date(), // Auto-populate with current date
          dueDate: undefined,
          slaDeadline: undefined,
          scheduledDate: undefined,
          scheduledTime: ''
        });
        setSelectedServices([]);
        setServiceRequiredError(false);
        setSelectedDealership('');
        setVinDecoded(false);
        setIsManuallyEditingVehicleInfo(false);
      }
    }
  }, [order, open]);

  // Auto-select dealership from global filter for new orders (like Recon)
  useEffect(() => {
    if (!order && isGlobalFilterActive && globalDealerFilter && dealerships.length > 0 && !selectedDealership) {
      handleDealershipChange(globalDealerFilter);
    }
  }, [order, isGlobalFilterActive, globalDealerFilter, dealerships.length, selectedDealership]);

  // CRITICAL: Set dealership ONLY after dealerships options are loaded (like Recon)
  useEffect(() => {
    if (order && dealerships.length > 0 && !selectedDealership) {
      let dealershipId = null;

      // Try dealer_id first (most reliable)
      if (order.dealer_id || order.dealerId) {
        dealershipId = (order.dealer_id || order.dealerId).toString();
      }

      if (dealershipId) {
        setSelectedDealership(dealershipId);
        // Services are now loaded automatically via React Query hook
      }
    }
  }, [dealerships.length, order, selectedDealership]);

  const handleVinChange = async (vin: string) => {
    handleInputChange('vehicleVin', vin);

    if (vin.length === 17 && !vinDecoded) {
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        setFormData(prev => ({
          ...prev,
          vehicleYear: vehicleData.year,
          vehicleMake: vehicleData.make,
          vehicleModel: vehicleData.model,
        }));
        setVinDecoded(true);
      }
    } else if (vin.length !== 17) {
      setVinDecoded(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      // ✅ LIMIT: Maximum 1 service per car wash order
      if (selectedServices.length >= 1) {
        toast({ description: t('car_wash_orders.max_one_service', 'Car wash orders can only have one service') });
        return;
      }
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
    setServiceRequiredError(false);
  };

  const transformToDbFormat = (formData: OrderFormData) => {
    // Build service payload from selected services array
    const servicePayload = selectedServices.length > 0
      ? selectedServices.map(serviceId => {
          const matchedService = (services as any[]).find((service: any) => normalizeServiceId(service) === serviceId);
          return matchedService
            ? {
                id: normalizeServiceId(matchedService),
                name: matchedService.name,
                price: matchedService.price ?? undefined,
                description: matchedService.description ?? undefined,
              }
            : {
                id: serviceId,
                name: 'Unknown Service',
                price: undefined,
                description: undefined,
              };
        })
      : [];

    return {
      // Return camelCase format - hook will transform to snake_case for DB
      status: formData.status,
      vehicleVin: formData.vehicleVin || undefined,
      vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
      vehicleMake: formData.vehicleMake || undefined,
      vehicleModel: formData.vehicleModel || undefined,
      vehicleInfo: formData.vehicleInfo || undefined,
      stockNumber: formData.stockNumber || undefined,
      tag: formData.tag || undefined,
      isWaiter: formData.isWaiter,
      services: servicePayload,
      totalAmount: selectedServices.reduce((total, serviceId) => {
        const service = (services as any[]).find((s: any) => normalizeServiceId(s) === serviceId);
        return total + (service?.price || 0);
      }, 0),
      notes: formData.notes || undefined,
      completedAt: formData.completedAt || undefined,
      dealerId: selectedDealership && Number.isInteger(Number(selectedDealership))
        ? parseInt(selectedDealership)
        : undefined,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null); // Reset any previous errors
    setServiceRequiredError(false);

    if (selectedServices.length === 0) {
      setServiceRequiredError(true);
      toast({ variant: 'destructive', description: t('validation.option_required') });
      return;
    }

    const dbData = transformToDbFormat(formData);

    try {
      await onSave(dbData);
      // Only close on success
      onClose();
    } catch (error: any) {
      // Keep modal open and show error
      logger.error('Submit error:', error);
      const errorMessage = error?.message || t('car_wash_orders.save_failed');
      setSubmitError(errorMessage);
      toast({ variant: 'destructive', description: errorMessage });
      // Modal stays open with data intact
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        preventOutsideClick={true}
        className="max-w-7xl max-h-[90vh] p-0 flex flex-col rounded-lg overflow-hidden sm:max-h-[98vh] sm:w-[90vw] md:w-[85vw] lg:w-[90vw] sm:border sm:mx-4"
        aria-describedby="carwash-order-modal-description"
      >
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 border-b border-border sm:rounded-t-lg">
          <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            {order ? t('car_wash_orders.edit_order') : t('car_wash_orders.quick_car_wash_order')}
            {formData.isWaiter && (
              <Badge variant="destructive" className="bg-destructive text-destructive-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {t('car_wash_orders.waiter_priority')}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only" id="carwash-order-modal-description">
            {order ? t('car_wash_orders.modal_description_edit') : t('car_wash_orders.modal_description_create')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="py-3 space-y-3">
            {/* Error Alert */}
            {submitError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            {/* Single Responsive Container */}
            <Card className="border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">

                  {/* Column 1 - Dealership & Vehicle Info */}
                  <div className="space-y-3 order-1">
                    {/* Box 1: Dealership */}
                    <div className="relative p-4 bg-gradient-to-br from-indigo-50 to-indigo-50/30 rounded-lg border-2 border-indigo-200">
                      <div className="absolute -top-3 left-3 px-2 bg-background">
                        <Badge variant="outline" className="border-indigo-300 text-indigo-700 font-semibold flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {t('car_wash_orders.dealership')}
                        </Badge>
                      </div>
                      <div className="space-y-3 mt-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="dealership" className="text-sm">{t('car_wash_orders.dealership')}</Label>
                    {isDealerFieldReadOnly && (
                      <Badge variant="secondary" className="text-xs">
                        {t('dealerships.auto_selected')}
                      </Badge>
                    )}
                  </div>
                  <Select
                    value={selectedDealership}
                    onValueChange={handleDealershipChange}
                    disabled={loading || isDealerFieldReadOnly}
                  >
                    <SelectTrigger className="border-input bg-background">
                      <SelectValue placeholder={loading ? t('common.loading') : t('car_wash_orders.select_dealership')} />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border max-h-[200px]">
                      {dealerships.map((dealer: any) => (
                        <SelectItem key={dealer.id} value={dealer.id.toString()}>
                          {dealer.name} - {dealer.city}, {dealer.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                      </div>
                    </div>

                    {/* Box 2: Vehicle Information */}
                    <div className="relative p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-lg border-2 border-emerald-200">
                      <div className="absolute -top-3 left-3 px-2 bg-background">
                        <Badge variant="outline" className="border-emerald-300 text-emerald-700 font-semibold flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {t('orders.vehicleInfo')}
                        </Badge>
                      </div>
                      <div className="space-y-3 mt-2">
                <div>
                  <Label htmlFor="vehicleVin" className="flex items-center gap-2 text-sm">
                    {t('orders.vin')}
                    {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {vinDecoded && (
                      <Badge variant="secondary" className="bg-success text-success-foreground">
                        <Zap className="w-3 h-3 mr-1" />
                        {t('car_wash_orders.decoded')}
                      </Badge>
                    )}
                  </Label>
                  <VinInputWithScanner
                    id="vehicleVin"
                    name="vehicleVin"
                    value={formData.vehicleVin}
                    onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
                    onVinScanned={(vin) => handleVinChange(vin.toUpperCase())}
                    className="border-input bg-background font-mono uppercase"
                  />
                  {vinError && (
                    <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                      <AlertCircle className="w-3 h-3" />
                      {vinError}
                    </div>
                  )}
                  {formData.vehicleVin.length > 0 && formData.vehicleVin.length < 17 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {t('car_wash_orders.characters_remaining', { count: 17 - formData.vehicleVin.length })}
                    </div>
                  )}
                </div>

                {/* Stock/Tag - Single Field */}
                <div>
                  <Label htmlFor="stockNumber" className="text-sm">{t('car_wash_orders.stock_number')}</Label>
                  <Input
                    id="stockNumber"
                    value={formData.stockNumber}
                    onChange={(e) => handleInputChange('stockNumber', e.target.value.toUpperCase())}
                    className="border-input bg-background uppercase"
                    placeholder="ST-001"
                  />
                </div>

                <div>
                  <Label htmlFor="vehicleInfo" className="text-sm">{t('car_wash_orders.vehicle_display')}</Label>
                  <Input
                    id="vehicleInfo"
                    value={formData.vehicleInfo}
                    onChange={(e) => {
                      setIsManuallyEditingVehicleInfo(true);
                      handleInputChange('vehicleInfo', e.target.value);
                    }}
                    onBlur={() => {
                      // Reset manual editing flag after user leaves the field
                      if (!formData.vehicleInfo) {
                        setIsManuallyEditingVehicleInfo(false);
                      }
                    }}
                    className="border-input bg-background font-medium"
                    placeholder="2025 BMW X6 (xDrive40i)"
                  />
                  {!formData.vehicleInfo && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {t('car_wash_orders.auto_populated')}
                    </div>
                  )}
                </div>

                {/* Service Date - Car Wash Specific */}
                <div>
                  <Label htmlFor="completionDate" className="text-sm">{t('car_wash.service_date')}</Label>
                  <CompletionDatePicker
                    value={formData.completedAt}
                    onChange={(date) => handleInputChange('completedAt', date)}
                    placeholder={t('car_wash.select_service_date')}
                    allowPastDates={true}
                    className="w-full"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {t('car_wash.service_date_help')}
                  </div>
                </div>
                      </div>
                    </div>
                  </div>

              {/* Column 2 - Services & Notes */}
              <div className="space-y-3 order-2">
                {/* Box 1: Status & Services */}
                <div className="relative p-4 bg-gradient-to-br from-purple-50 to-purple-50/30 rounded-lg border-2 border-purple-200">
                  <div className="absolute -top-3 left-3 px-2 bg-background">
                    <Badge variant="outline" className="border-purple-300 text-purple-700 font-semibold flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {t('orders.services')}
                    </Badge>
                  </div>
                  <div className="space-y-3 mt-2">

                {/* Status Field */}
                <div>
                  <Label htmlFor="status" className="text-sm">{t('orders.status')}</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">{t('common.status.pending')}</SelectItem>
                      <SelectItem value="in_progress">{t('common.status.in_progress')}</SelectItem>
                      <SelectItem value="completed">{t('common.status.completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('common.status.cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 p-3 border border-border rounded-lg bg-background">
                  <Checkbox
                    id="waiter"
                    checked={formData.isWaiter}
                    onCheckedChange={(checked) => handleInputChange('isWaiter', checked)}
                  />
                  <Label
                    htmlFor="waiter"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-destructive" />
                    <span className="font-medium">{t('car_wash_orders.waiter_priority')}</span>
                  </Label>
                </div>

                {/* Available Services */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium flex items-center gap-1">
                      <span>{t('orders.services')}</span>
                      <span className="text-destructive" aria-hidden="true">*</span>
                      {selectedDealership && services.length > 0 && (
                        <span className="text-muted-foreground ml-1">
                          ({services.length} {t('orders.available')})
                        </span>
                      )}
                    </Label>
                    <Badge variant={selectedServices.length >= 1 ? "default" : "secondary"} className="text-xs">
                      {selectedServices.length}/1 {t('orders.selected')}
                    </Badge>
                  </div>

                  {/* Service limit info message */}
                  {selectedServices.length >= 1 && (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-2">
                      {t('car_wash_orders.one_service_limit', 'Car wash orders can only have one service. Uncheck to select another.')}
                    </div>
                  )}

                  {!selectedDealership ? (
                    <div className="p-4 border border-dashed border-border rounded-lg text-center text-muted-foreground">
                      {t('orders.selectDealershipFirst')}
                    </div>
                  ) : loading ? (
                    <div className="p-4 border border-border rounded-lg text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
                    </div>
                  ) : (
                    <>
                      <ScrollArea className="h-48 sm:h-64 border border-border rounded-lg p-3 bg-background">
                        <div className="space-y-2">
                          {services.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              {t('orders.noServicesAvailable')}
                            </div>
                          ) : (
                            services.map((service: any) => {
                              const isSelected = selectedServices.includes(service.id);
                              const isDisabled = !isSelected && selectedServices.length >= 1;

                              return (
                                <div key={service.id} className={`flex items-start justify-between p-2 border border-border rounded-lg transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/10'}`}>
                                  <div className="flex items-start space-x-2 flex-1">
                                    <Checkbox
                                      id={service.id}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                                      className="mt-0.5 w-4 h-4"
                                      disabled={isDisabled}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <Label
                                        htmlFor={service.id}
                                        className="font-medium text-sm cursor-pointer block leading-snug"
                                      >
                                        {service.name}
                                      </Label>
                                      {service.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                          {service.description}
                                        </p>
                                      )}
                                      {(service.duration || service.price) && (
                                        <div className="flex items-center justify-between text-xs mt-0.5">
                                          {service.duration && (
                                            <span className="text-muted-foreground">{service.duration} {t('services.minutes')}</span>
                                          )}
                                          {service.price && (
                                            <span className="font-semibold">${service.price.toFixed(2)}</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                      {serviceRequiredError && services.length > 0 && (
                        <p className="text-xs text-destructive mt-2">
                          {t('validation.option_required')}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Total Price Section */}
                {selectedServices.length > 0 && (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm text-emerald-900">{t('orders.total')}</span>
                      <span className="font-bold text-lg text-emerald-600">
                        ${selectedServices.reduce((total, serviceId) => {
                          const service = (services as any[]).find((s: any) => s.id === serviceId);
                          return total + (service?.price || 0);
                        }, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-emerald-700 mt-1">
                      {selectedServices.length} {t('orders.servicesSelected')}
                    </div>
                  </div>
                )}
                  </div>
                </div>

                {/* Box 2: Notes */}
                <div className="relative p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 rounded-lg border-2 border-amber-200">
                  <div className="absolute -top-3 left-3 px-2 bg-background">
                    <Badge variant="outline" className="border-amber-300 text-amber-700 font-semibold flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {t('orders.notes')}
                    </Badge>
                  </div>
                  <div className="space-y-3 mt-2">
                <div>
                  <Label htmlFor="notes" className="text-sm font-medium">{t('orders.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="border-input bg-background resize-none"
                    placeholder={t('car_wash_orders.notes_placeholder')}
                  />
                </div>
                  </div>
                </div>
              </div>
            </div>
              </CardContent>
            </Card>

            {/* Hidden fields with default values for later editing in order details */}
            <div className="hidden">
              <input
                type="hidden"
                name="customer_name"
                value={formData.customerName || ''}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
              />
              <input
                type="hidden"
                name="customer_email"
                value={formData.customerEmail || ''}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              />
              <input
                type="hidden"
                name="customer_phone"
                value={formData.customerPhone || ''}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
              />
              <input
                type="hidden"
                name="salesperson"
                value={formData.salesperson || ''}
                onChange={(e) => handleInputChange('salesperson', e.target.value)}
              />
              <input
                type="hidden"
                name="internal_notes"
                value={formData.internalNotes || ''}
                onChange={(e) => handleInputChange('internalNotes', e.target.value)}
              />
              <input
                type="hidden"
                name="sla_deadline"
                value={formData.slaDeadline ? formData.slaDeadline.toISOString() : ''}
                onChange={(e) => handleInputChange('slaDeadline', e.target.value ? new Date(e.target.value) : undefined)}
              />
              <input
                type="hidden"
                name="scheduled_date"
                value={formData.scheduledDate ? formData.scheduledDate.toISOString() : ''}
                onChange={(e) => handleInputChange('scheduledDate', e.target.value ? new Date(e.target.value) : undefined)}
              />
              <input
                type="hidden"
                name="scheduled_time"
                value={formData.scheduledTime || ''}
                onChange={(e) => handleInputChange('scheduledTime', e.target.value)}
              />
            </div>

          </form>
        </ScrollArea>

        {/* Footer - Fixed at bottom of modal */}
        <div className="flex-shrink-0 bg-background border-t border-border px-4 sm:px-6 py-4 sm:py-4 flex flex-row justify-end gap-2 sm:gap-3 z-10 sm:rounded-b-lg">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-1/2 sm:w-auto min-h-[44px]"
          >
            {t('common.action_buttons.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !selectedDealership || !formData.vehicleVin || selectedServices.length === 0}
            className="w-1/2 sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {order ? t('common.action_buttons.update') : t('common.action_buttons.create')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CarWashOrderModal;
