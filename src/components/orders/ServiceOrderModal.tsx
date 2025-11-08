import { Alert, AlertDescription } from '@/components/ui/alert';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DueDateTimePicker } from '@/components/ui/due-date-time-picker';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import type { ServiceOrder, ServiceOrderData } from '@/hooks/useServiceOrderManagement';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { supabase } from '@/integrations/supabase/client';
import { safeParseDate } from '@/utils/dateUtils';
import { dev, error as logError, warn } from '@/utils/logger';
import { canViewPricing } from '@/utils/permissions';
import { AlertCircle, Building2, CalendarClock, Car, Check, ChevronsUpDown, ClipboardList, FileText, Info, Loader2, Scan, User, Wrench, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

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

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  role_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string | null;
  isSystemAdmin?: boolean;
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

interface ServiceOrderModalProps {
  order?: ServiceOrder;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: ServiceOrderData) => void;
}

const ServiceOrderModal: React.FC<ServiceOrderModalProps> = React.memo(({ order, open, onClose, onSave }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const { hasPermission } = usePermissionContext();
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
  const [assignedToPopoverOpen, setAssignedToPopoverOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [dealerships, setDealerships] = useState([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [pendingServiceIds, setPendingServiceIds] = useState<string[]>([]); // Store service IDs until services are loaded
  const [loading, setLoading] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [needsAutopopulate, setNeedsAutopopulate] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canViewPrices = canViewPricing([], enhancedUser?.is_system_admin ?? false);

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
          dealerId: order.dealerId
        });
        dev('🔍 Assignment fields:', {
          assignedTo: order.assignedTo,
          assigned_group_id: order.assigned_group_id
        });

        setFormData({
          orderNumber: order.orderNumber || '',
          orderType: order.order_type || 'service',
          status: order.status || 'pending',
          customerName: order.customerName || '',
          vehicleVin: order.vehicleVin || '',
          vehicleYear: order.vehicleYear?.toString() || '',
          vehicleMake: order.vehicleMake || '',
          vehicleModel: order.vehicleModel || '',
          vehicleInfo: order.vehicleInfo || '',
          po: order.po || '',
          ro: order.ro || '',
          tag: order.tag || '',
          assignedGroupId: order.assigned_group_id || '',
          salesperson: '',
          notes: order.notes || '',
          internalNotes: '',
          priority: 'normal',
          dueDate: order.dueDate ? safeParseDate(order.dueDate) || undefined : undefined,
          slaDeadline: undefined,
          scheduledDate: undefined,
          scheduledTime: ''
        });
        // Store service IDs in pending state - will be applied once services are loaded
        // CRITICAL: order.services can be array of strings OR array of objects {id, name, price}
        const servicesData = Array.isArray(order.services) ? order.services : [];
        const serviceIds = servicesData.map(service =>
          typeof service === 'string' ? service : service.id
        );
        setPendingServiceIds(serviceIds);
        setSelectedServices([]); // Clear selected services until they can be validated
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
      const assignedId = order.assigned_group_id;
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
          assigned_group_id: order.assigned_group_id
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedUsers.length, order, selectedAssignedTo]);

  // Auto-select current authenticated user for new orders
  useEffect(() => {
    if (!order && assignedUsers.length > 0 && !selectedAssignedTo && authUser) {
      const currentUser = assignedUsers.find(u => u.id === authUser.id);
      if (currentUser) {
        dev('🎯 Auto-selecting current user for Assigned To:', currentUser.name);
        setSelectedAssignedTo(currentUser.id);
        setFormData(prev => ({
          ...prev,
          assignedGroupId: currentUser.id
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedUsers.length, order, selectedAssignedTo, authUser?.id]);

  // Set dealership from global filter for new orders
  useEffect(() => {
    if (!order && isGlobalFilterActive && dealerships.length > 0 && !selectedDealership) {
      dev('🎯 Service Orders: Setting dealership from global filter:', globalDealerFilter);
      handleDealershipChange(globalDealerFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, isGlobalFilterActive, globalDealerFilter, dealerships.length, selectedDealership]);

  // Auto-populate dealership when flag is set AND dealerships are loaded (FLAG PATTERN)
  useEffect(() => {
    if (needsAutopopulate && dealerships.length > 0 && order) {
      const dealerIdStr = order.dealerId?.toString() || order.dealer_id?.toString();

      if (dealerIdStr) {
        // Verify dealer exists in list
        const dealerExists = dealerships.some((d: DealershipInfo) => d.id.toString() === dealerIdStr);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsAutopopulate, dealerships.length, order]);

  // Apply pending service IDs once services are loaded (CRITICAL for edit mode)
  useEffect(() => {
    if (pendingServiceIds.length > 0 && services.length > 0 && !loading) {
      // Validate that pending service IDs exist in loaded services
      const validServiceIds = pendingServiceIds.filter(serviceId =>
        services.some((service: DealerService) => service.id === serviceId)
      );

      if (validServiceIds.length > 0) {
        dev('✅ Service Modal: Applying pending service IDs:', validServiceIds);
        setSelectedServices(validServiceIds);
        setPendingServiceIds([]); // Clear pending state
      } else {
        warn('⚠️ Service Modal: No valid service IDs found in loaded services');
        setPendingServiceIds([]); // Clear pending state even if no matches
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingServiceIds.length, services.length, loading]);

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
      // ✅ FIX: Use RPC function to bypass RLS and get ALL users with service_orders permissions
      const [usersResult, servicesResult] = await Promise.all([
        supabase.rpc('get_users_with_module_access', {
          p_dealer_id: dealerId,
          p_module: 'service_orders'
        }),
        supabase.rpc('get_dealer_services_by_department', {
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
        // ✅ FIX: RPC function already filtered by module permissions
        // No need for manual filtering - just map to UI format with role_name for grouping
        interface UserResult {
          user_id: string;
          first_name?: string;
          last_name?: string;
          email: string;
          role_name?: string;
          avatar_url?: string | null;
          is_system_admin?: boolean;
        }

        const mappedUsers = usersResult.data.map((user: UserResult) => ({
          id: user.user_id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          email: user.email,
          role_name: user.role_name || 'No Role',
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          isSystemAdmin: user.is_system_admin
        }));

        dev(`✅ Loaded ${mappedUsers.length} users with service_orders access for dealership ${dealerId}`);
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

      toast({
        description: `${t('stock.autopop.localInventory')}${details.length > 0 ? ': ' + details.join(' • ') : ''}`
      });
    } else if (result.source === 'vin_api') {
      toast({ description: t('stock.autopop.vinDecoded') });
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

  const handleInputChange = (field: string, value: string | Date | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceToggle = (serviceId: string, checked: boolean) => {
    if (checked) {
      // ✅ LIMIT: Maximum 2 services per order
      if (selectedServices.length >= 2) {
        toast({ description: t('orders.max_services_reached', 'Maximum 2 services per order') });
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

    // Check if we have multiple services - create separate orders for each
    if (!order && selectedServices.length > 1) {
      // Create an array of order data, one per service
      const ordersData = selectedServices.map(serviceId => {
        const service = services.find(s => s.id === serviceId);
        return {
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
          services: [{
            id: serviceId,
            name: service?.name || 'Unknown Service',
            price: service?.price,
            description: service?.description
          }],
          totalAmount: service?.price || 0,
          notes: formData.notes || undefined,
          dueDate: formData.dueDate || undefined,
          dealerId: selectedDealership && Number.isInteger(Number(selectedDealership)) ? parseInt(selectedDealership) : undefined
        };
      });

      try {
        // Show immediate feedback
        toast({ description: t('orders.creating_multiple_orders', { count: selectedServices.length }) || `Creating ${selectedServices.length} orders...` });

        // Pass array of orders to onSave
        await onSave(ordersData as unknown as ServiceOrderData);
        // Only close modal on successful save
        onClose();
      } catch (error: unknown) {
        // Keep modal open and show error
        logError('Error saving service orders:', error);
        const errorMessage = error instanceof Error ? error.message : (t('orders.save_error') || 'Failed to save orders');
        setSubmitError(errorMessage);
        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive'
        });
      }
    } else {
      // Single service or editing - proceed as normal
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
        services: selectedServices.map(serviceId => {
          const service = services.find(s => s.id === serviceId);
          return {
            id: serviceId,
            name: service?.name || 'Unknown Service',
            price: service?.price,
            description: service?.description
          };
        }),
        totalAmount: selectedServices.reduce((total, serviceId) => {
          const service = services.find(s => s.id === serviceId);
          return total + (service?.price || 0);
        }, 0),
        notes: formData.notes || undefined,
        dueDate: formData.dueDate ? formData.dueDate.toISOString() : undefined,
        dealerId: selectedDealership && Number.isInteger(Number(selectedDealership)) ? parseInt(selectedDealership) : undefined
      };

      try {
        await onSave(orderData);
        // Only close modal on successful save
        onClose();
      } catch (error: unknown) {
        // Keep modal open and show error
        logError('Error saving service order:', error);
        const errorMessage = error instanceof Error ? error.message : (t('orders.save_error') || 'Failed to save order');
        setSubmitError(errorMessage);
        toast({
          title: t('common.error'),
          description: errorMessage,
          variant: 'destructive'
        });
      }
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
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none border-0 sm:max-w-7xl sm:h-auto sm:max-h-[98vh] sm:w-[90vw] md:w-[85vw] lg:w-[90vw] sm:rounded-lg sm:border sm:mx-4" aria-describedby="service-order-modal-description">
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
                <CardHeader className="pb-3 bg-muted/30">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4 text-primary" />
                    {t('sales_orders.dealership')} & {t('orders.clientInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Box 1: Dealership & Assignment */}
                  <div className="relative p-4 bg-gradient-to-br from-indigo-50 to-indigo-50/30 rounded-lg border-2 border-indigo-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-indigo-300 text-indigo-700 font-semibold flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {t('service_orders.dealership_assignment')}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
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
                            {dealerships.map((dealer: DealershipInfo) => (
                              <SelectItem key={dealer.id} value={dealer.id.toString()}>
                                {dealer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="assignedTo">
                          {t('sales_orders.assigned_to')} <span className="text-red-500">*</span>
                        </Label>
                     <Popover open={assignedToPopoverOpen} onOpenChange={setAssignedToPopoverOpen}>
                       <PopoverTrigger asChild>
                         <Button
                           variant="outline"
                           role="combobox"
                           aria-expanded={assignedToPopoverOpen}
                           disabled={loading || !selectedDealership}
                           className="w-full justify-between border-input bg-background h-10 px-3 font-normal"
                         >
                           {selectedAssignedTo ? (
                             <div className="flex items-center gap-2 flex-1 min-w-0">
                               {(() => {
                                 const selectedUser = assignedUsers.find(u => u.id === selectedAssignedTo);
                                 if (!selectedUser) return <span className="text-muted-foreground">{t('sales_orders.select_assignee')}</span>;

                                 // Format role name for display
                                 const formatRoleName = (roleName: string | undefined): string => {
                                   if (!roleName || roleName === 'No Role') return 'No Role';
                                   return roleName
                                     .split('_')
                                     .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                     .join(' ');
                                 };

                                 return (
                                   <>
                                     <AvatarSystem
                                       name={selectedUser.email}
                                       firstName={selectedUser.first_name}
                                       lastName={selectedUser.last_name}
                                       email={selectedUser.email}
                                       avatarUrl={selectedUser.avatar_url}
                                       size={24}
                                     />
                                     <span className="truncate">{selectedUser.name}</span>
                                     {selectedUser.role_name && (
                                       <Badge variant="secondary" className="text-xs shrink-0">
                                         {formatRoleName(selectedUser.role_name)}
                                       </Badge>
                                     )}
                                   </>
                                 );
                               })()}
                             </div>
                           ) : (
                             <span className="text-muted-foreground">
                               {!selectedDealership
                                 ? t('sales_orders.select_dealership_first')
                                 : loading
                                   ? t('common.loading')
                                   : t('sales_orders.select_assignee')}
                             </span>
                           )}
                           <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                         </Button>
                       </PopoverTrigger>

                       <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                         <Command>
                           <CommandInput
                             placeholder={t('common.search_users', 'Search users...')}
                             className="h-9"
                           />
                           <CommandList className="max-h-[300px]">
                             <CommandEmpty>{t('common.no_users_found', 'No users found')}</CommandEmpty>

                             {/* Group users by role_name */}
                             {(() => {
                               // Helper function to format role names
                               const formatRoleName = (roleName: string | undefined): string => {
                                 if (!roleName || roleName === 'No Role') return 'No Role';
                                 // Convert snake_case to Title Case (detail_manager → Detail Manager)
                                 return roleName
                                   .split('_')
                                   .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                   .join(' ');
                               };

                               // Group users by role
                               const usersByRole = assignedUsers.reduce((acc, user) => {
                                 const role = formatRoleName(user.role_name);
                                 if (!acc[role]) acc[role] = [];
                                 acc[role].push(user);
                                 return acc;
                               }, {} as Record<string, AssignedUser[]>);

                               // Sort roles: admin first, then alphabetically
                               const sortedRoles = Object.keys(usersByRole).sort((a, b) => {
                                 if (a.toLowerCase().includes('admin')) return -1;
                                 if (b.toLowerCase().includes('admin')) return 1;
                                 return a.localeCompare(b);
                               });

                               // Render groups
                               return sortedRoles.map((roleName) => (
                                 <CommandGroup key={roleName} heading={roleName}>
                                   {usersByRole[roleName].map((user) => (
                                     <CommandItem
                                       key={user.id}
                                       value={`${user.name} ${user.email}`}
                                       onSelect={() => {
                                         handleAssignedToChange(user.id);
                                         setAssignedToPopoverOpen(false);
                                       }}
                                       className="flex items-center gap-2 cursor-pointer hover:bg-emerald-50 hover:text-foreground data-[selected=true]:bg-emerald-50 data-[selected=true]:text-foreground"
                                     >
                                       <AvatarSystem
                                         name={user.email}
                                         firstName={user.first_name}
                                         lastName={user.last_name}
                                         email={user.email}
                                         avatarUrl={user.avatar_url}
                                         size={32}
                                       />

                                       <div className="flex-1 min-w-0">
                                         <div className="font-medium text-sm truncate">
                                           {user.name}
                                         </div>
                                         <div className="text-xs text-muted-foreground truncate">
                                           {user.email}
                                         </div>
                                       </div>

                                       {selectedAssignedTo === user.id && (
                                         <Check className="h-4 w-4 text-primary shrink-0" />
                                       )}
                                     </CommandItem>
                                   ))}
                                 </CommandGroup>
                               ));
                             })()}
                           </CommandList>
                         </Command>
                       </PopoverContent>
                     </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Box 2: Customer Details */}
                  <div className="relative p-4 bg-gradient-to-br from-rose-50 to-rose-50/30 rounded-lg border-2 border-rose-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-rose-300 text-rose-700 font-semibold flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {t('service_orders.customer_details')}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
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
                    </div>
                  </div>

                </CardContent>
              </Card>

              {/* Vehicle Information with VIN Decoding */}
              <Card className="border-border shadow-md">
                <CardHeader className="pb-3 bg-emerald-50/30">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold">
                    <Car className="h-4 w-4 text-emerald-600" />
                    {t('orders.vehicleInfo')}
                    {vinDecoded && <Badge variant="secondary" className="bg-success text-success-foreground">
                      <Zap className="w-3 h-3 mr-1" />
                      {t('sales_orders.vin_decoded_successfully')}
                    </Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Box 1: Order Identifiers (PO/RO/TAG) */}
                  <div className="relative p-4 bg-gradient-to-br from-blue-50 to-blue-50/30 rounded-lg border-2 border-blue-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-blue-300 text-blue-700 font-semibold">
                        {t('service_orders.order_identifiers')}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                      <div>
                        <Label htmlFor="po">
                          {t('service_orders.po_number')} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="po"
                          value={formData.po}
                          onChange={(e) => handleInputChange('po', e.target.value.toUpperCase())}
                          className="border-input bg-background uppercase"
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
                          onChange={(e) => handleInputChange('ro', e.target.value.toUpperCase())}
                          className="border-input bg-background uppercase"
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
                          onChange={(e) => handleInputChange('tag', e.target.value.toUpperCase())}
                          className="border-input bg-background uppercase"
                          placeholder="001"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Box 2: Vehicle Identification (VIN + Vehicle Info) */}
                  <div className="relative p-4 bg-gradient-to-br from-purple-50 to-purple-50/30 rounded-lg border-2 border-purple-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-purple-300 text-purple-700 font-semibold flex items-center gap-1">
                        <Scan className="h-3 w-3" />
                        {t('service_orders.vehicle_identification')}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
                      <div>
                        <Label htmlFor="vehicleVin" className="flex items-center gap-2">
                          {t('orders.vin')} <span className="text-red-500">*</span>
                          {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        </Label>
                        <VinInputWithScanner
                          id="vehicleVin"
                          name="vehicleVin"
                          value={formData.vehicleVin}
                          onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
                          onVinScanned={(vin) => handleVinChange(vin.toUpperCase())}
                          className={selectedVehicle ? "border-input bg-muted/30 font-mono uppercase" : "border-input bg-background font-mono uppercase"}
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
                          placeholder=""
                          readOnly={!!selectedVehicle}
                        />
                        {selectedVehicle && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Box 3: Schedule (Due Date & Time) */}
                  <div className="relative p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 rounded-lg border-2 border-amber-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-amber-300 text-amber-700 font-semibold flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {t('due_date.title')}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
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
                  </div>
                </CardContent>
              </Card>

              {/* Services & Notes */}
              <Card className="border-border">
                <CardHeader className="pb-3 bg-muted/20">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    {t('orders.servicesAndNotes')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Box 3: Service Selection */}
                  <div className="relative p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-lg border-2 border-emerald-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-emerald-300 text-emerald-700 font-semibold flex items-center gap-1">
                        <Wrench className="h-3 w-3" />
                        {t('service_orders.service_selection')}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center justify-between">
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
                        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                          {t('orders.max_services_info', 'Maximum 2 services reached. Uncheck a service to select another.')}
                        </div>
                      )}

                      {!selectedDealership ? (
                        <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                          {t('orders.selectDealershipFirst')}
                        </div>
                      ) : services.length === 0 ? (
                        <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                          {loading ? t('common.loading') : t('orders.noServicesAvailable')}
                        </div>
                      ) : (
                        <ScrollArea className="h-[300px] p-3 border border-border rounded-md">
                          <div className="space-y-2">
                            {services.map((service: DealerService) => {
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
                                    <div className="flex items-center gap-1.5">
                                      <Label htmlFor={service.id} className="text-sm font-medium cursor-pointer">
                                        {service.name}
                                      </Label>

                                      {(service.description || (canViewPrices && service.price)) && (
                                        <HoverCard openDelay={200} closeDelay={100}>
                                          <HoverCardTrigger asChild>
                                            <Info className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                                          </HoverCardTrigger>
                                          <HoverCardContent side="right" className="w-72 p-3">
                                            {service.description && (
                                              <p className="text-xs text-muted-foreground mb-2">
                                                {service.description}
                                              </p>
                                            )}
                                            {canViewPrices && service.price && (
                                              <div className="flex items-center gap-1.5 text-xs">
                                                <span className="font-medium">{t('services.price')}:</span>
                                                <span className="font-semibold text-emerald-600">${service.price}</span>
                                              </div>
                                            )}
                                          </HoverCardContent>
                                        </HoverCard>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      )}

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
                    </div>
                  </div>

                  {/* Box 4: Additional Notes */}
                  <div className="relative p-4 bg-gradient-to-br from-slate-50 to-slate-50/30 rounded-lg border-2 border-slate-200">
                    <div className="absolute -top-3 left-3 px-2 bg-background">
                      <Badge variant="outline" className="border-slate-300 text-slate-700 font-semibold flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {t('service_orders.additional_notes')}
                      </Badge>
                    </div>
                    <div className="space-y-3 mt-2">
                      <div>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) => handleInputChange('notes', e.target.value)}
                          className="border-input bg-background resize-none"
                          rows={4}
                          placeholder={t('orders.notes_placeholder', 'Add any additional notes or special instructions for this service order...')}
                        />
                      </div>
                    </div>
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
