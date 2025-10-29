import { VehicleAutoPopulationField } from '@/components/orders/VehicleAutoPopulationField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CompletionDatePicker } from '@/components/ui/completion-date-picker';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useDealerServices, useDealerships } from '@/hooks/useDealerships';
import { usePermissions } from '@/hooks/usePermissions';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { safeParseDate } from '@/utils/dateUtils';
import { canViewPricing } from '@/utils/permissions';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface OrderFormData {
  // Order identification
  orderNumber: string;
  orderType: string;
  status: string;

  // Vehicle information
  vehicleVin: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleInfo: string;
  stockNumber: string;

  // Assignment information (employee responsible)
  assignedGroupId?: string;
  assignedContactId?: string;

  // Order details
  notes: string;
  internalNotes?: string;
  priority?: string;
  completedAt?: Date; // Completion date for recon orders
  dueDate?: Date;
  slaDeadline?: Date;
  scheduledDate?: Date;
  scheduledTime?: string;
}

interface DealershipInfo {
  id: number;
  name: string;
  subdomain?: string;
}

interface DealerService {
  id: string;
  name: string;
  description?: string;
  price?: number;
}

interface OrderData {
  id?: string;
  orderNumber?: string;
  order_number?: string;
  orderType?: string;
  order_type?: string;
  status?: string;
  priority?: string;
  vehicleVin?: string;
  vehicle_vin?: string;
  vehicleYear?: string | number;
  vehicle_year?: string | number;
  vehicleMake?: string;
  vehicle_make?: string;
  vehicleModel?: string;
  vehicle_model?: string;
  vehicleInfo?: string;
  vehicle_info?: string;
  stockNumber?: string;
  stock_number?: string;
  assignedGroupId?: string;
  assigned_group_id?: string;
  assignedContactId?: string;
  assigned_contact_id?: string;
  notes?: string;
  internalNotes?: string;
  internal_notes?: string;
  completedAt?: Date | string;
  completed_at?: Date | string;
  dueDate?: string | Date;
  due_date?: string | Date;
  slaDeadline?: string | Date;
  sla_deadline?: string | Date;
  scheduledDate?: string | Date;
  scheduled_date?: string | Date;
  scheduledTime?: string;
  scheduled_time?: string;
  dealerId?: number;
  dealer_id?: number;
  services?: string[];
}

interface ReconOrderModalProps {
  order?: OrderData;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: OrderData) => void;
  mode?: 'create' | 'edit';
}

export const ReconOrderModal: React.FC<ReconOrderModalProps> = ({ order, open, onClose, onSave, mode = 'create' }) => {
  const { t } = useTranslation();
  const { roles } = usePermissionContext();
  const { enhancedUser } = usePermissions();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();

  // Form state
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    stockNumber: '',
    orderType: 'recon',
    status: 'pending',
    assignedGroupId: '',
    assignedContactId: '',
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
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);

  const globalDealerFilter = localStorage.getItem('selectedDealerFilter');
  const isGlobalFilterActive = globalDealerFilter && globalDealerFilter !== 'all';
  const isDealerFieldReadOnly = Boolean(isGlobalFilterActive);

  // Refs to prevent double-setting in Strict Mode
  const editModeInitialized = useRef(false);
  const currentOrderId = useRef<string | null>(null);

  // Use React Query hooks for dealerships and services (with caching)
  const { data: dealerships = [], isLoading: dealershipsLoading } = useDealerships();
  const { data: services = [], isLoading: servicesLoading } = useDealerServices(
    selectedDealership ? parseInt(selectedDealership) : null,
    'Recon Dept'
  );

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Combine loading states
  const loading = dealershipsLoading || servicesLoading;

  const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);

  const isEditing = Boolean(order);

  const setSelectedDealershipWithLog = (value: string) => {
    setSelectedDealership(value);
  };

  useEffect(() => {
    if (open) {
      // Dealerships are now loaded via React Query hook - no need to fetch manually

      if (order) {
        // Prevent double initialization in React Strict Mode
        if (currentOrderId.current === order.id && editModeInitialized.current) {
          return;
        }

        currentOrderId.current = order.id;
        editModeInitialized.current = true;

        // Helper function to safely extract field values with fallbacks
        const getFieldValue = (camelCase: unknown, snakeCase: unknown, defaultValue = '') => {
          return camelCase ?? snakeCase ?? defaultValue;
        };

        // Helper function to safely parse dates
        const parseDateField = (camelCaseDate: unknown, snakeCaseDate: unknown) => {
          const dateValue = camelCaseDate || snakeCaseDate;
          if (!dateValue) return undefined;
          const parsed = safeParseDate(dateValue);
          return parsed || undefined;
        };

        // Helper function to safely convert to string
        const toStringValue = (value: unknown) => {
          if (value === null || value === undefined) return '';
          return String(value);
        };

        setFormData({
          // Basic order info
          orderNumber: getFieldValue(order.orderNumber, order.order_number),
          orderType: 'recon',
          status: getFieldValue(order.status, order.status, 'pending'),
          priority: getFieldValue(order.priority, order.priority, 'normal'),

          // Vehicle information - handle both individual and consolidated fields
          vehicleVin: getFieldValue(order.vehicleVin, order.vehicle_vin),
          vehicleYear: toStringValue(getFieldValue(order.vehicleYear, order.vehicle_year)),
          vehicleMake: getFieldValue(order.vehicleMake, order.vehicle_make),
          vehicleModel: getFieldValue(order.vehicleModel, order.vehicle_model),
          vehicleInfo: getFieldValue(order.vehicleInfo, order.vehicle_info),
          stockNumber: getFieldValue(order.stockNumber, order.stock_number),

          // Assignment information
          assignedGroupId: getFieldValue(order.assignedGroupId, order.assigned_group_id),
          assignedContactId: getFieldValue(order.assignedContactId, order.assigned_contact_id),

          // Notes
          notes: getFieldValue(order.notes, order.notes),
          internalNotes: getFieldValue(order.internalNotes, order.internal_notes),

          // Date fields - handle proper parsing
          completedAt: parseDateField(order.completedAt, order.completed_at),
          dueDate: parseDateField(order.dueDate, order.due_date),
          slaDeadline: parseDateField(order.slaDeadline, order.sla_deadline),
          scheduledDate: parseDateField(order.scheduledDate, order.scheduled_date),
          scheduledTime: getFieldValue(order.scheduledTime, order.scheduled_time)
        });

        // Set related data with proper fallbacks
        const servicesData = Array.isArray(order.services) ? order.services : [];
        setSelectedServices(servicesData);
      } else if (!order && !editModeInitialized.current) {
        // Only reset form for new order when order is explicitly null/undefined AND not in edit mode
        editModeInitialized.current = false;
        currentOrderId.current = null;
        setFormData({
          orderNumber: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          stockNumber: '',
          orderType: 'recon',
          status: 'pending',
          assignedGroupId: '',
          assignedContactId: '',
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
        setSelectedDealershipWithLog('');
        setSelectedVehicle(null);
        setVinDecoded(false);
      }
    }
  }, [order?.id, open]); // Only re-run if order ID changes or modal opens

  useEffect(() => {
    if (!order && isGlobalFilterActive && globalDealerFilter && dealerships.length > 0 && !selectedDealership) {
      handleDealershipChange(globalDealerFilter);
    }
  }, [order, isGlobalFilterActive, globalDealerFilter, dealerships.length, selectedDealership]);

  // CRITICAL: Set dealership ONLY after dealerships options are loaded
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

  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealershipWithLog(dealershipId);
    setSelectedServices([]);
    // Services are now loaded automatically via React Query hook when selectedDealership changes
  };

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    setSelectedVehicle(result);

    setFormData(prev => ({
      ...prev,
      stockNumber: result.data.stockNumber || '',
      vehicleVin: result.data.vin || '',
      vehicleYear: String(result.data.year || ''),
      vehicleMake: result.data.make || '',
      vehicleModel: result.data.model || '',
      vehicleInfo: result.data.vehicleInfo || `${result.data.year || ''} ${result.data.make || ''} ${result.data.model || ''}`.trim()
    }));

    setVinDecoded(true);

    if (result.source === 'inventory') {
      const details = [];
      if (result.data.price) details.push(`$${result.data.price.toLocaleString()}`);
      if (result.data.age_days) details.push(`${result.data.age_days} ${t('stock.days')}`);
      if (result.data.leads_total !== undefined) details.push(`${result.data.leads_total} leads`);

      toast.success(
        `${t('stock.autopop.localInventory')}${details.length > 0 ? ': ' + details.join(' • ') : ''}`,
        { duration: 4000 }
      );
    } else if (result.source === 'vin_api') {
      toast.success(t('stock.autopop.vinDecoded'), { duration: 3000 });
    }
  };

  const handleVehicleClear = () => {
    setSelectedVehicle(null);
    setVinDecoded(false);

    // Clear all vehicle-related fields
    setFormData(prev => ({
      ...prev,
      stockNumber: '',
      vehicleVin: '',
      vehicleYear: '',
      vehicleMake: '',
      vehicleModel: '',
      vehicleInfo: ''
    }));

    toast.info(t('stock.autopop.cleared', 'Vehicle cleared - you can now enter manually'));
  };

  const handleVinChange = async (vin: string) => {
    handleInputChange('vehicleVin', vin);

    if (vin.length === 17 && !vinDecoded) {
      const vehicleData = await decodeVin(vin);
      if (vehicleData) {
        // Update both individual fields (for filtering) and consolidated vehicle_info (primary field)
        setFormData(prev => ({
          ...prev,
          vehicleYear: vehicleData.year,
          vehicleMake: vehicleData.make,
          vehicleModel: vehicleData.model,
          vehicleInfo: vehicleData.vehicleInfo // Consolidated field from VIN service
        }));
        setVinDecoded(true);
      }
    } else if (vin.length !== 17) {
      setVinDecoded(false);
      // Clear VIN-derived data when VIN becomes invalid
      if (vin.length === 0) {
        setFormData(prev => ({
          ...prev,
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: ''
        }));
      }
    }
  };

  const handleInputChange = (field: keyof OrderFormData, value: string | Date | undefined) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // If individual vehicle fields are manually changed, update consolidated vehicle_info
      if (['vehicleYear', 'vehicleMake', 'vehicleModel'].includes(field)) {
        const year = field === 'vehicleYear' ? value : prev.vehicleYear;
        const make = field === 'vehicleMake' ? value : prev.vehicleMake;
        const model = field === 'vehicleModel' ? value : prev.vehicleModel;

        // Build consolidated vehicle_info only if we have year, make, and model
        if (year && make && model) {
          newData.vehicleInfo = `${year} ${make} ${model}`;
        } else if (!year && !make && !model) {
          newData.vehicleInfo = '';
        }
      }

      return newData;
    });
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      // ✅ LIMIT: Maximum 2 services per order
      if (selectedServices.length >= 2) {
        toast.warning(t('orders.max_services_reached', 'Maximum 2 services per order'));
        return;
      }
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const transformToDbFormat = (formData: OrderFormData) => {
    // Ensure vehicle_info is properly set as the primary field
    let vehicleInfo = formData.vehicleInfo;

    // Fallback: if vehicle_info is empty but individual fields exist, construct it
    if (!vehicleInfo && formData.vehicleYear && formData.vehicleMake && formData.vehicleModel) {
      vehicleInfo = `${formData.vehicleYear} ${formData.vehicleMake} ${formData.vehicleModel}`;
    }

    return {
      // Use camelCase to match ReconOrderData interface
      stockNumber: formData.stockNumber || undefined,
      vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
      vehicleMake: formData.vehicleMake || undefined,
      vehicleModel: formData.vehicleModel || undefined,
      vehicleVin: formData.vehicleVin || undefined,
      vehicleInfo: vehicleInfo || undefined,
      status: formData.status || 'pending',
      notes: formData.notes || undefined,
      internalNotes: formData.internalNotes || undefined,
      completedAt: formData.completedAt,
      dealerId: selectedDealership && Number.isInteger(Number(selectedDealership)) ? parseInt(selectedDealership) : undefined,
      services: selectedServices || [],
      totalAmount: canViewPrices ? selectedServices.reduce((total, serviceId) => {
        const service = services.find((s: DealerService) => s.id === serviceId);
        return total + (service?.price || 0);
      }, 0) : 0
    };
  };

  const validateForm = async (): Promise<boolean> => {
    // Validate VIN (always required)
    if (!formData.vehicleVin.trim()) {
      toast.error(t('validation.vinRequired'));
      return false;
    }
    if (formData.vehicleVin.length !== 17) {
      toast.error(t('validation.vinInvalidLength'));
      return false;
    }

    // Validate dealership selection
    if (!selectedDealership) {
      toast.error(t('validation.dealershipRequired'));
      return false;
    }

    // Validate stock number (always required)
    if (!formData.stockNumber.trim()) {
      toast.error(t('validation.stockNumberRequired'));
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null); // Reset any previous errors

    setSubmitting(true);

    try {
      // Validate form first
      const isValid = await validateForm();
      if (!isValid) {
        setSubmitting(false);
        return;
      }

      // Proceed directly to order creation without confirmation
      const dbData = transformToDbFormat(formData);

      console.log('📤 Modal sending data to hook:', {
        dealerId: dbData.dealerId,
        stockNumber: dbData.stockNumber,
        vehicleInfo: dbData.vehicleInfo,
        services: dbData.services,
        servicesLength: dbData.services?.length,
        servicesContent: JSON.stringify(dbData.services),
        selectedServicesState: selectedServices,
        selectedServicesContent: JSON.stringify(selectedServices),
        selectedServicesLength: selectedServices.length,
        completedAt: dbData.completedAt,
        completedAtType: typeof dbData.completedAt,
        completedAtISO: dbData.completedAt instanceof Date ? dbData.completedAt.toISOString() : dbData.completedAt,
        totalAmount: dbData.totalAmount,
        notes: dbData.notes
      });

      // Show immediate success feedback
      toast.success(t('orders.creating_order'));

      await onSave(dbData);

      // Only close modal on successful save
      onClose();

    } catch (error: any) {
      // Keep modal open and show error
      console.error('Submit error:', error);
      const errorMessage = error?.message || t('orders.creation_failed') || 'Failed to save order';
      setSubmitError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: DealerService) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        preventOutsideClick={true}
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none border-0 sm:max-w-7xl sm:h-auto sm:max-h-[98vh] sm:w-[90vw] md:w-[85vw] lg:w-[90vw] sm:rounded-lg sm:border sm:mx-4"
        aria-describedby="recon-order-modal-description"
      >
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 border-b border-border">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {order ? t('recon.edit_recon_order') : t('recon.create_recon_order')}
          </DialogTitle>
          <div id="recon-order-modal-description" className="text-xs sm:text-sm text-muted-foreground">
            {order ? 'Update reconditioning order details and services' : 'Create a new reconditioning order for dealer inventory'}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 max-h-[calc(100vh-140px)] sm:max-h-[calc(98vh-120px)]">
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">

                  {/* Column 1: Dealership & Vehicle Info */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="dealership">{t('sales_orders.dealership')}</Label>
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
                          <SelectValue placeholder={loading ? t('common.loading') : t('sales_orders.select_dealership')} />
                        </SelectTrigger>
                        <SelectContent className="z-50 bg-popover border-border max-h-[200px]">
                          {dealerships.map((dealer: any) => (
                            <SelectItem key={dealer.id} value={dealer.id.toString()}>
                              {dealer.name} - {dealer.city}, {dealer.state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Vehicle Search & Auto-Population */}
                    {!order && (
                      <>
                        <VehicleAutoPopulationField
                          dealerId={selectedDealership ? parseInt(selectedDealership) : undefined}
                          onVehicleSelect={handleVehicleSelect}
                          onVehicleClear={handleVehicleClear}
                          selectedVehicle={selectedVehicle}
                          label={t('stock.autopop.searchVehicle')}
                          placeholder={t('stock.filters.search_placeholder', 'Search by stock, VIN, make or model')}
                        />

                        {selectedVehicle && <Separator className="my-3" />}
                      </>
                    )}

                    <div>
                      <Label htmlFor="stockNumber">{t('sales_orders.stock_number')}</Label>
                      <Input
                        id="stockNumber"
                        value={formData.stockNumber}
                        onChange={(e) => handleInputChange('stockNumber', e.target.value)}
                        className={selectedVehicle ? "border-input bg-muted/30" : "border-input bg-background"}
                        placeholder="ST-001"
                        readOnly={!!selectedVehicle}
                      />
                      {selectedVehicle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                        {t('orders.vin')}
                        {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {vinDecoded && (
                          <Badge variant="secondary" className="bg-success text-success-foreground">
                            <Zap className="w-3 h-3 mr-1" />
                            {t('sales_orders.vin_decoded_successfully')}
                          </Badge>
                        )}
                      </Label>
                      <VinInputWithScanner
                        id="vehicleVin"
                        name="vehicleVin"
                        value={formData.vehicleVin}
                        onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
                        onVinScanned={(vin) => handleVinChange(vin.toUpperCase())}
                        className={selectedVehicle ? "border-input bg-muted/30 font-mono uppercase" : "border-input bg-background font-mono uppercase"}
                        stickerMode={true}
                        disabled={!!selectedVehicle}
                      />
                      {vinError && (
                        <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                          <AlertCircle className="w-3 h-3" />
                          {vinError}
                        </div>
                      )}
                      {formData.vehicleVin.length > 0 && formData.vehicleVin.length < 17 && !selectedVehicle && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {17 - formData.vehicleVin.length} characters remaining
                        </div>
                      )}
                      {selectedVehicle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="vehicleInfo">{t('sales_orders.vehicle')}</Label>
                      <Input
                        id="vehicleInfo"
                        value={formData.vehicleInfo}
                        onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                        className={selectedVehicle ? "border-input bg-muted/30" : "border-input bg-background"}
                        placeholder="2025 BMW X6 (xDrive40i)"
                        readOnly={!!selectedVehicle}
                      />
                      {!formData.vehicleInfo && !selectedVehicle && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {t('sales_orders.manual_vehicle_entry')}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Column 2: Completion Date, Services & Notes */}
                  <div className="space-y-4">
                    {/* Completion Date */}
                    <div>
                      <Label htmlFor="completionDate">{t('recon.completion_date')}</Label>
                      <CompletionDatePicker
                        value={formData.completedAt}
                        onChange={(date) => handleInputChange('completedAt', date)}
                        placeholder={t('recon.select_completion_date')}
                        allowPastDates={true}
                        className="w-full"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        {t('recon.completion_date_help')}
                      </div>
                    </div>

                    {/* Services Section */}
                    <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        {t('orders.services')}
                        {selectedDealership && services.length > 0 && (
                          <span className="text-muted-foreground ml-1">
                            ({services.length} {t('orders.available')})
                          </span>
                        )}
                      </Label>
                      <Badge variant={selectedServices.length >= 2 ? "default" : "secondary"} className="text-xs">
                        {selectedServices.length}/2 {t('orders.selected')}
                      </Badge>
                    </div>

                    {/* Service limit info message */}
                    {selectedServices.length >= 2 && (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-2">
                        {t('orders.max_services_info', 'Maximum 2 services reached. Uncheck a service to select another.')}
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
                      <ScrollArea className="h-48 sm:h-64 border border-border rounded-lg p-3 bg-background">
                        <div className="space-y-3">
                          {services.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              {t('orders.noServicesAvailable')}
                            </div>
                          ) : (
                            services.map((service: DealerService) => {
                              const isSelected = selectedServices.includes(service.id);
                              const isDisabled = !isSelected && selectedServices.length >= 2;

                              return (
                                <div key={service.id} className={`flex items-start justify-between p-3 border border-border rounded-lg transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/10'}`}>
                                  <div className="flex items-start space-x-3 flex-1">
                                    <Checkbox
                                      id={service.id}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                                      className="mt-1"
                                      disabled={isDisabled}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <Label
                                        htmlFor={service.id}
                                        className="font-medium text-sm cursor-pointer"
                                      >
                                        {service.name}
                                      </Label>
                                      {service.duration && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                          <span>{service.duration} {t('services.minutes')}</span>
                                        </div>
                                      )}
                                      {service.description && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          {service.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {canViewPrices && service.price && (
                                    <div className="text-right shrink-0 ml-3">
                                      <span className="font-semibold text-sm">
                                        ${service.price.toFixed(2)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                            );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {canViewPrices && selectedServices.length > 0 && (
                    <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-emerald-900">{t('orders.total')}</span>
                        <span className="font-bold text-lg text-emerald-600">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        {selectedServices.length} {t('orders.servicesSelected')}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Notes Section */}
                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">{t('orders.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="border-input bg-muted/50 resize-none cursor-not-allowed"
                      placeholder={t('orders.notes_instruction', 'To add notes or instructions, use the Comments section in the order details view')}
                      readOnly
                      disabled
                    />
                  </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Separator className="my-6" />

            {/* Hidden fields with default values for later editing in order details */}
            <div className="hidden">
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

            {/* Action Buttons - Sticky on mobile for better accessibility */}
            <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-2 sm:py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="order-2 sm:order-1 border-border hover:bg-accent hover:text-accent-foreground w-full sm:w-auto min-h-[44px]"
              >
                {t('common.action_buttons.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  !selectedDealership ||
                  !formData.vehicleVin ||
                  !formData.stockNumber ||
                  selectedServices.length === 0
                }
                className="order-1 sm:order-2 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {order ? t('orders.updating') : t('orders.creating')}
                  </>
                ) : (
                  order ? t('common.action_buttons.update') : t('common.action_buttons.create')
                )}
              </Button>
            </div>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
