import { VehicleAutoPopulationField } from '@/components/orders/VehicleAutoPopulationField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DueDateTimePicker } from '@/components/ui/due-date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { ServiceOrder, ServiceOrderData } from '@/hooks/useServiceOrderManagement';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { supabase } from '@/integrations/supabase/client';
import { safeParseDate } from '@/utils/dateUtils';
import { dev, warn, error as logError } from '@/utils/logger';
import { canViewPricing } from '@/utils/permissions';
import { AlertCircle, Loader2, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface OrderFormData {
  // Order identification
  orderNumber: string;
  orderType: string;
  status: string;

  // Customer information (vehicle owner)
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;

  // Vehicle information
  vehicleVin: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleInfo: string;

  // Service order specific fields
  po: string;
  ro: string;
  tag: string;

  // Assignment information (employee responsible)
  assignedGroupId?: string;
  salesperson?: string;

  // Order details
  notes: string;
  internalNotes?: string;
  priority?: string;
  dueDate?: Date;
  slaDeadline?: Date;
  scheduledDate?: Date;
  scheduledTime?: string;
}

interface ServiceOrderModalProps {
  order?: ServiceOrder;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: ServiceOrderData) => void;
}

const ServiceOrderModal: React.FC<ServiceOrderModalProps> = React.memo(({ order, open, onClose, onSave }) => {
  const { t } = useTranslation();
  const { roles } = usePermissionContext();
  const { enhancedUser } = usePermissions();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();

  // Form state
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: '',
    orderType: 'service',
    status: 'pending',
    customerName: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    po: '',
    ro: '',
    tag: '',
    assignedGroupId: '',
    salesperson: '',
    notes: '',
    internalNotes: '',
    priority: 'normal',
    dueDate: undefined,
    slaDeadline: undefined,
    scheduledDate: undefined,
    scheduledTime: ''
  });

  const [selectedDealership, setSelectedDealership] = useState('');
  const [selectedAssignedTo, setSelectedAssignedTo] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [dealerships, setDealerships] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [needsAutopopulate, setNeedsAutopopulate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);

  const isEditing = Boolean(order);

  // Check global dealer filter
  const globalDealerFilter = localStorage.getItem('selectedDealerFilter');
  const isGlobalFilterActive = globalDealerFilter && globalDealerFilter !== 'all';
  const isDealerFieldReadOnly = isGlobalFilterActive;

  useEffect(() => {
    if (open) {
      fetchDealerships();

      if (order) {
        // EDIT MODE: Set flag to trigger auto-population after dealerships load
        setNeedsAutopopulate(true);
        setSelectedDealership('');
        setSelectedAssignedTo('');

        // Debug logging - investigate dealer fields (similar to Sales modal)
        dev('🔍 Service Order Edit Mode - Investigating dealer fields:');
        dev('🔍 All order fields:', Object.keys(order));
        dev('🔍 Dealership fields:', {
          dealer_id: order.dealer_id,
          dealerId: order.dealerId,
          dealership_id: order.dealership_id,
          dealer: order.dealer,
          dealershipId: order.dealershipId
        });
        dev('🔍 Assignment fields:', {
          assigned_to: order.assigned_to,
          assignedTo: order.assignedTo,
          assigned_group_id: order.assigned_group_id,
          assignedGroupId: order.assignedGroupId
        });

        setFormData({
          orderNumber: order.orderNumber || order.order_number || '',
          orderType: order.orderType || order.order_type || 'service',
          status: order.status || 'pending',
          customerName: order.customerName || order.customer_name || '',
          vehicleVin: order.vehicleVin || order.vehicle_vin || '',
          vehicleYear: order.vehicleYear?.toString() || order.vehicle_year?.toString() || '',
          vehicleMake: order.vehicleMake || order.vehicle_make || '',
          vehicleModel: order.vehicleModel || order.vehicle_model || '',
          vehicleInfo: order.vehicleInfo || order.vehicle_info || '',
          po: order.po || '',
          ro: order.ro || '',
          tag: order.tag || '',
          assignedGroupId: order.assignedGroupId || order.assigned_group_id || '',
          salesperson: order.salesperson || '',
          notes: order.notes || '',
          internalNotes: order.internalNotes || order.internal_notes || '',
          priority: order.priority || 'normal',
          dueDate: order.dueDate || order.due_date ? safeParseDate(order.dueDate || order.due_date) || undefined : undefined,
          slaDeadline: order.slaDeadline || order.sla_deadline ? safeParseDate(order.slaDeadline || order.sla_deadline) || undefined : undefined,
          scheduledDate: order.scheduledDate || order.scheduled_date ? safeParseDate(order.scheduledDate || order.scheduled_date) || undefined : undefined,
          scheduledTime: order.scheduledTime || order.scheduled_time || ''
        });
        setSelectedServices(order.services || []);
        // Do NOT set dealership here - let the useEffect handle it after dealerships load (prevents race condition)
        // setSelectedDealership(order.dealerId?.toString() || '');
      } else {
        // CREATE MODE: Clear flag
        setNeedsAutopopulate(false);

        // Reset form for new order
        setFormData({
          orderNumber: '',
          orderType: 'service',
          status: 'pending',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          po: '',
          ro: '',
          tag: '',
          assignedGroupId: '',
          salesperson: '',
          notes: '',
          internalNotes: '',
          priority: 'normal',
          dueDate: undefined,
          slaDeadline: undefined,
          scheduledDate: undefined,
          scheduledTime: ''
        });
        setSelectedServices([]);
        setSelectedDealership('');
        setSelectedAssignedTo('');
        setSelectedVehicle(null);
        setVinDecoded(false);
      }
    }
  }, [order, open]);

  // Set selectedAssignedTo when assignedUsers are loaded and order exists (similar to Sales modal)
  useEffect(() => {
    if (assignedUsers.length > 0 && order && selectedAssignedTo === '') {
      // Find the user that matches the order's assignment
      let matchingUser = null;

      // Try to find by ID first (most reliable)
      const assignedId = order.assigned_group_id || order.assignedGroupId;
      if (assignedId) {
        matchingUser = assignedUsers.find(user => user.id === assignedId);
        dev('🔧 Searching by ID:', assignedId, 'found:', matchingUser?.name);
      }

      // Fallback to name search
      if (!matchingUser && order.assignedTo && order.assignedTo !== 'Unassigned') {
        matchingUser = assignedUsers.find(user => user.name === order.assignedTo);
        dev('🔧 Searching by name:', order.assignedTo, 'found:', matchingUser?.name);
      }

      if (matchingUser) {
        dev('🔧 Setting assigned user AFTER users loaded:', matchingUser.id);
        setSelectedAssignedTo(matchingUser.id);
      } else {
        warn('⚠️ Could not find assigned user:', {
          assignedTo: order.assignedTo,
          assigned_group_id: order.assigned_group_id,
          assignedGroupId: order.assignedGroupId
        });
      }
    }
  }, [assignedUsers.length, order, selectedAssignedTo]);

  // Set dealership from global filter for new orders
  useEffect(() => {
    if (!order && isGlobalFilterActive && dealerships.length > 0 && !selectedDealership) {
      dev('🎯 Service Orders: Setting dealership from global filter:', globalDealerFilter);
      handleDealershipChange(globalDealerFilter);
    }
  }, [order, isGlobalFilterActive, globalDealerFilter, dealerships.length, selectedDealership]);

  // Auto-populate dealership when flag is set AND dealerships are loaded (FLAG PATTERN)
  useEffect(() => {
    if (needsAutopopulate && dealerships.length > 0 && order) {
      const dealerIdStr = order.dealerId?.toString() || order.dealer_id?.toString();

      if (dealerIdStr) {
        // Verify dealer exists in list
        const dealerExists = dealerships.some((d: any) => d.id.toString() === dealerIdStr);

        if (dealerExists) {
          dev('🔧 [FLAG PATTERN] Service Order Edit: Auto-setting dealership:', dealerIdStr);
          setSelectedDealership(dealerIdStr);

          // Immediately fetch dealer data (users and services)
          dev('🔧 [FLAG PATTERN] Service Order Edit: Auto-loading dealer data');
          fetchDealerData(dealerIdStr);

          // Reset flag to prevent re-execution
          setNeedsAutopopulate(false);
          dev('✅ [FLAG PATTERN] Auto-population completed, flag reset');
        } else {
          warn('⚠️ Dealer not found in accessible dealerships:', dealerIdStr);
          setNeedsAutopopulate(false);
        }
      } else {
        warn('⚠️ No dealerId found in order');
        setNeedsAutopopulate(false);
      }
    }
  }, [needsAutopopulate, dealerships.length, order]);

  const fetchDealerships = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.user.id
      });

      if (error) throw error;
      setDealerships(data || []);
    } catch (error) {
      logError('Error fetching dealerships:', error);
    }
  };

  const fetchDealerData = async (dealershipId: string) => {
    if (!dealershipId) return;

    // Validate dealership ID before using
    const dealerId = Number(dealershipId);
    if (!Number.isInteger(dealerId) || dealerId <= 0) {
      logError('Invalid dealer ID:', dealershipId);
      toast({
        title: t('common.error'),
        description: t('errors.invalid_dealer') || 'Invalid dealership selected',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const [usersResult, servicesResult] = await Promise.all([
        supabase
          .from('dealer_memberships')
          .select(`
            profiles!inner (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('dealer_id', dealerId)
          .eq('is_active', true),
        supabase
          .rpc('get_dealer_services_by_department', {
            p_dealer_id: dealerId,
            p_department_name: 'Service Dept'
          })
      ]);

      if (usersResult.error) {
        logError('Error fetching users:', usersResult.error);
      }

      if (servicesResult.error) {
        logError('Error fetching services:', servicesResult.error);
        toast({
          title: t('common.error'),
          description: t('orders.services_fetch_error') || 'Error loading services',
          variant: 'destructive'
        });
      }

      if (usersResult.data) {
        const mappedUsers = usersResult.data.map((membership: any) => ({
          id: membership.profiles.id,
          name: `${membership.profiles.first_name} ${membership.profiles.last_name}`.trim(),
          email: membership.profiles.email
        }));

        setAssignedUsers(mappedUsers);
      } else {
        setAssignedUsers([]);
      }

      if (servicesResult.data) {
        setServices(servicesResult.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      logError('Error fetching dealer data:', error);
      toast({
        title: t('common.error'),
        description: t('common.unexpected_error') || 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealership(dealershipId);
    setSelectedAssignedTo('');
    setAssignedUsers([]);
    setServices([]);
    setSelectedServices([]);

    if (dealershipId) {
      fetchDealerData(dealershipId);
    }
  };

  const handleAssignedToChange = (userId: string) => {
    setSelectedAssignedTo(userId);
    // Update assignment in form data using assigned_group_id (same as Sales)
    setFormData(prev => ({
      ...prev,
      assignedGroupId: userId
    }));
  };

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    setSelectedVehicle(result);

    setFormData(prev => ({
      ...prev,
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
          vehicleInfo: vehicleData.vehicleInfo
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null); // Reset any previous errors

    // Send camelCase data directly - hook will handle transformation
    const orderData = {
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone,
      vehicleVin: formData.vehicleVin || undefined,
      vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : undefined,
      vehicleMake: formData.vehicleMake || undefined,
      vehicleModel: formData.vehicleModel || undefined,
      vehicleInfo: formData.vehicleInfo || undefined,
      po: formData.po || undefined,
      ro: formData.ro || undefined,
      tag: formData.tag || undefined,
      assignedGroupId: selectedAssignedTo || undefined,
      services: selectedServices,
      totalAmount: selectedServices.reduce((total, serviceId) => {
        const service = services.find(s => s.id === serviceId);
        return total + (service?.price || 0);
      }, 0),
      notes: formData.notes || undefined,
      dueDate: formData.dueDate || undefined,
      dealerId: selectedDealership && Number.isInteger(Number(selectedDealership)) ? parseInt(selectedDealership) : undefined
    };

    try {
      await onSave(orderData);
      // Only close modal on successful save
      onClose();
    } catch (error: any) {
      // Keep modal open and show error
      logError('Error saving service order:', error);
      const errorMessage = error?.message || t('orders.save_error') || 'Failed to save order';
      setSubmitError(errorMessage);
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: any) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none border-0 sm:max-w-7xl sm:h-auto sm:max-h-[98vh] sm:w-[90vw] md:w-[85vw] lg:w-[90vw] sm:rounded-lg sm:border sm:mx-4" aria-describedby="service-order-modal-description">
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 border-b border-border">
          <DialogTitle className="text-base sm:text-lg font-semibold">
            {order ? t('orders.edit_service_order') : t('orders.create_service_order')}
          </DialogTitle>
          <DialogDescription className="sr-only" id="service-order-modal-description">
            {order ? t('orders.edit_service_order') : t('orders.create_service_order')}
          </DialogDescription>
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">

              {/* Dealership & Customer Information */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('sales_orders.dealership')} & {t('orders.clientInfo')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="dealership">
                        {t('sales_orders.dealership')} <span className="text-red-500">*</span>
                      </Label>
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
                        <SelectValue placeholder={loading ? t('common.loading') : t('orders.selectClient')} />
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

                   <div>
                     <Label htmlFor="assignedTo">
                       {t('sales_orders.assigned_to')} <span className="text-red-500">*</span>
                     </Label>
                      <Select
                        value={selectedAssignedTo || ""}
                        onValueChange={handleAssignedToChange}
                        disabled={loading || !selectedDealership}
                      >
                        <SelectTrigger className="border-input bg-background">
                          <SelectValue placeholder={
                            !selectedDealership
                              ? t('sales_orders.select_dealership_first')
                              : loading
                                ? t('common.loading')
                                : t('sales_orders.select_assignee')
                          } />
                        </SelectTrigger>
                       <SelectContent className="bg-popover border border-border max-h-[200px]">
                         {assignedUsers.map((user: any) => (
                           <SelectItem key={user.id} value={user.id}>
                             {user.name} - {user.email}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                  <Separator />

                   <div>
                     <Label htmlFor="customerName">
                       {t('orders.customerName')} <span className="text-red-500">*</span>
                     </Label>
                     <Input
                       id="customerName"
                       value={formData.customerName}
                       onChange={(e) => handleInputChange('customerName', e.target.value)}
                       className="border-input bg-background"
                       required
                     />
                   </div>

                   <div>
                     <Label htmlFor="customerPhone">
                       {t('forms.labels.phone')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                     </Label>
                     <Input
                       id="customerPhone"
                       type="tel"
                       value={formData.customerPhone || ''}
                       onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                       className="border-input bg-background"
                       placeholder="(555) 123-4567"
                     />
                   </div>

                   <div>
                     <Label htmlFor="customerEmail">
                       {t('forms.labels.email')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                     </Label>
                     <Input
                       id="customerEmail"
                       type="email"
                       value={formData.customerEmail || ''}
                       onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                       className="border-input bg-background"
                       placeholder="customer@example.com"
                     />
                   </div>

                   {/* Service Order Specific Fields */}
                   <Separator />

                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <div>
                       <Label htmlFor="po">
                         {t('service_orders.po_number')} <span className="text-red-500">*</span>
                       </Label>
                       <Input
                         id="po"
                         value={formData.po}
                         onChange={(e) => handleInputChange('po', e.target.value)}
                         className="border-input bg-background"
                         inputMode="numeric"
                         pattern="[0-9]*"
                         placeholder="001"
                         required
                       />
                     </div>

                     <div>
                       <Label htmlFor="ro">
                         {t('service_orders.ro_number')} <span className="text-red-500">*</span>
                       </Label>
                       <Input
                         id="ro"
                         value={formData.ro}
                         onChange={(e) => handleInputChange('ro', e.target.value)}
                         className="border-input bg-background"
                         inputMode="numeric"
                         pattern="[0-9]*"
                         placeholder="001"
                         required
                       />
                     </div>

                     <div>
                       <Label htmlFor="tag">
                         {t('service_orders.tag_number')} <span className="text-red-500">*</span>
                       </Label>
                       <Input
                         id="tag"
                         value={formData.tag}
                         onChange={(e) => handleInputChange('tag', e.target.value)}
                         className="border-input bg-background"
                         inputMode="numeric"
                         pattern="[0-9]*"
                         placeholder="001"
                         required
                       />
                     </div>
                   </div>
                </CardContent>
              </Card>

              {/* Vehicle Information with VIN Decoding */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {t('orders.vehicleInfo')}
                    {vinDecoded && <Badge variant="secondary" className="bg-success text-success-foreground">
                      <Zap className="w-3 h-3 mr-1" />
                      {t('sales_orders.vin_decoded_successfully')}
                    </Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Vehicle Search & Auto-Population */}
                  {!order && (
                    <>
                      <VehicleAutoPopulationField
                        dealerId={selectedDealership ? parseInt(selectedDealership) : undefined}
                        onVehicleSelect={handleVehicleSelect}
                        selectedVehicle={selectedVehicle}
                        label={t('stock.autopop.searchVehicle')}
                        placeholder={t('stock.filters.search_placeholder', 'Search by stock, VIN, make or model')}
                      />

                      {selectedVehicle && <Separator className="my-3" />}
                    </>
                  )}

                  <div>
                    <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                      {t('orders.vin')} <span className="text-red-500">*</span>
                      {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </Label>
                    <VinInputWithScanner
                      id="vehicleVin"
                      name="vehicleVin"
                      value={formData.vehicleVin}
                      onChange={(e) => handleVinChange(e.target.value)}
                      onVinScanned={handleVinChange}
                      className={selectedVehicle ? "border-input bg-muted/30 font-mono" : "border-input bg-background font-mono"}
                      disabled={!!selectedVehicle}
                    />
                    {vinError && (
                      <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                        <AlertCircle className="w-3 h-3" />
                        {vinError}
                      </div>
                    )}
                    {selectedVehicle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                      </p>
                    )}
                  </div>

                  {/* Consolidated Vehicle Info */}
                  <div>
                    <Label htmlFor="vehicleInfo">{t('sales_orders.vehicle')}</Label>
                    <Input
                      id="vehicleInfo"
                      value={formData.vehicleInfo}
                      onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                      className={selectedVehicle ? "border-input bg-muted/30" : "border-input bg-background"}
                      placeholder="2025 Honda Accord EX-L"
                      readOnly={!!selectedVehicle}
                    />
                    {selectedVehicle && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                      </p>
                    )}
                  </div>

                  <Separator />

                   {/* Due Date & Time Section */}
                   <div className="space-y-4">
                     <Label className="text-base font-medium">
                       {t('due_date.title')} <span className="text-red-500">*</span>
                     </Label>
                     <div>
                       <DueDateTimePicker
                         value={formData.dueDate}
                         onChange={(date) => handleInputChange('dueDate', date)}
                         placeholder={t('due_date.date_placeholder')}
                         enforceBusinessRules={!isEditing}
                       />
                     </div>
                     <div className="text-xs text-muted-foreground">
                       {t('due_date.validation.business_hours_only')}
                     </div>
                   </div>
                </CardContent>
              </Card>

              {/* Services & Notes */}
              <Card className="border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{t('orders.servicesAndNotes')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        {t('orders.services')} <span className="text-red-500">*</span>
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
                      <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
                        {t('orders.selectDealershipFirst')}
                      </div>
                    ) : services.length === 0 ? (
                      <div className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded-md">
                        {loading ? t('common.loading') : t('orders.noServicesAvailable')}
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px] mt-2 p-3 border border-border rounded-md">
                        <div className="space-y-2">
                          {services.map((service: any) => {
                            const isSelected = selectedServices.includes(service.id);
                            const isDisabled = !isSelected && selectedServices.length >= 2;

                            return (
                              <div key={service.id} className={`flex items-center space-x-3 p-2 rounded-md transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/10'}`}>
                                <Checkbox
                                  id={service.id}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                                  disabled={isDisabled}
                                />
                                <div className="flex-1 min-w-0">
                                  <Label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                                    {service.name}
                                  </Label>
                                  {service.description && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {service.description}
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {service.category_name}
                                    </Badge>
                                    {canViewPrices && service.price && (
                                      <span className="text-xs font-medium text-emerald-600">
                                        ${service.price}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>

                  {canViewPrices && selectedServices.length > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-emerald-900">{t('orders.totalPrice')}</span>
                        <span className="text-lg font-bold text-emerald-600">${totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        {selectedServices.length} {t('orders.servicesSelected')}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">{t('orders.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="border-input bg-background"
                      rows={4}
                      placeholder={t('orders.notesPlaceholder')}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hidden fields with default values for later editing in order details */}
            <div className="hidden">
              <input type="hidden" name="salesperson" value={formData.salesperson || ''} />
              <input type="hidden" name="internal_notes" value={formData.internalNotes || ''} />
              <input type="hidden" name="sla_deadline" value={formData.slaDeadline ? formData.slaDeadline.toISOString() : ''} />
              <input type="hidden" name="scheduled_date" value={formData.scheduledDate ? formData.scheduledDate.toISOString() : ''} />
              <input type="hidden" name="scheduled_time" value={formData.scheduledTime || ''} />
            </div>

            {/* Footer Actions - Sticky on mobile for better accessibility */}
            <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border py-2 sm:py-2.5 -mx-4 px-4 sm:-mx-6 sm:px-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="order-2 sm:order-1 w-full sm:w-auto min-h-[44px]"
              >
                {t('common.action_buttons.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={
                  loading ||
                  !formData.customerName ||
                  !selectedDealership ||
                  !selectedAssignedTo ||
                  !formData.vehicleVin ||
                  !formData.po ||
                  !formData.ro ||
                  !formData.tag ||
                  !formData.dueDate ||
                  selectedServices.length === 0
                }
                className="order-1 sm:order-2 w-full sm:w-auto min-h-[44px]"
              >
                {loading ? (
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
});

ServiceOrderModal.displayName = 'ServiceOrderModal';

export default ServiceOrderModal;
