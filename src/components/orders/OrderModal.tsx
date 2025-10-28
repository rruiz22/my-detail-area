import { VehicleAutoPopulationField } from '@/components/orders/VehicleAutoPopulationField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DueDateTimePicker } from '@/components/ui/due-date-time-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { VinInputWithScanner } from '@/components/ui/vin-input-with-scanner';
import { usePermissionContext } from '@/contexts/PermissionContext';
import { useAppointmentCapacity } from '@/hooks/useAppointmentCapacity';
import { usePermissions } from '@/hooks/usePermissions';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { supabase } from '@/integrations/supabase/client';
import { safeParseDate } from '@/utils/dateUtils';
import { canViewPricing } from '@/utils/permissions';
import { AlertCircle, Check, ChevronsUpDown, Loader2, Search, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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
  stockNumber: string;

  // Assignment information (employee responsible)
  assignedGroupId?: string;
  assignedContactId?: string;
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

interface DealershipInfo {
  id: number;
  name: string;
  subdomain?: string;
}

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  role_name?: string;
  first_name?: string;
  last_name?: string;
  isSystemAdmin?: boolean;
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
  customerName?: string;
  customer_name?: string;
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
  salesperson?: string;
  notes?: string;
  internalNotes?: string;
  internal_notes?: string;
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

interface DealerMembership {
  profiles: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface OrderModalProps {
  order?: OrderData;
  open: boolean;
  onClose: () => void;
  onSave: (orderData: OrderData) => void;
  preSelectedDate?: Date | null;
}

export const OrderModal: React.FC<OrderModalProps> = ({ order, open, onClose, onSave, preSelectedDate }) => {
  const { t } = useTranslation();
  const { roles } = usePermissionContext();
  const { enhancedUser } = usePermissions();
  const { decodeVin, loading: vinLoading, error: vinError } = useVinDecoding();
  const { checkSlotAvailability, reserveSlot } = useAppointmentCapacity();

  // Form state
  const [formData, setFormData] = useState<OrderFormData>({
    orderNumber: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: '',
    stockNumber: '',
    orderType: 'sales',
    status: 'pending',
    assignedGroupId: '',
    assignedContactId: '',
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

  const globalDealerFilter = localStorage.getItem('selectedDealerFilter');
  const isGlobalFilterActive = globalDealerFilter && globalDealerFilter !== 'all';
  const isDealerFieldReadOnly = Boolean(isGlobalFilterActive);

  // Refs to prevent double-setting in Strict Mode
  const editModeInitialized = useRef(false);
  const currentOrderId = useRef<string | null>(null);
  const [dealerships, setDealerships] = useState<DealershipInfo[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<AssignedUser[]>([]);
  const [services, setServices] = useState<DealerService[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [vinDecoded, setVinDecoded] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [currentLocation, setCurrentLocation] = useState<{
    lat?: number;
    lng?: number;
    address?: string;
  }>({});

  const canViewPrices = canViewPricing(roles, enhancedUser?.is_system_admin ?? false);

  const isEditing = Boolean(order);
  const requiresDueDate = !isEditing && ['sales', 'service'].includes(formData.orderType);

  const setSelectedDealershipWithLog = (value: string) => {
    setSelectedDealership(value);
  };

  const setSelectedAssignedToWithLog = (value: string) => {
    setSelectedAssignedTo(value);
  };

  useEffect(() => {
    if (open) {
      fetchDealerships();

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
          orderType: getFieldValue(order.orderType, order.order_type, 'sales'),
          status: getFieldValue(order.status, order.status, 'pending'),
          priority: getFieldValue(order.priority, order.priority, 'normal'),

          // Customer information
          customerName: getFieldValue(order.customerName, order.customer_name),
          customerPhone: getFieldValue(order.customerPhone, order.customer_phone),
          customerEmail: getFieldValue(order.customerEmail, order.customer_email),

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
          salesperson: getFieldValue(order.salesperson, order.salesperson),

          // Notes
          notes: getFieldValue(order.notes, order.notes),
          internalNotes: getFieldValue(order.internalNotes, order.internal_notes),

          // Date fields - handle proper parsing
          dueDate: parseDateField(order.dueDate, order.due_date),
          slaDeadline: parseDateField(order.slaDeadline, order.sla_deadline),
          scheduledDate: parseDateField(order.scheduledDate, order.scheduled_date),
          scheduledTime: getFieldValue(order.scheduledTime, order.scheduled_time)
        });

        // Set related data with proper fallbacks
        const servicesData = Array.isArray(order.services) ? order.services : [];

        // For dealership, we need to find ID by name since we only have dealershipName
        // This will be set after fetchDealerships() completes
        const dealershipName = order.dealershipName;

        // For assigned to, we have the name directly
        const assignedToName = order.assignedTo;

        setSelectedServices(servicesData);

        // We'll set dealership after fetchDealerships() finds the ID
        // We'll set assignedTo after fetchDealerData() loads the users and finds the ID
      } else if (!order && !editModeInitialized.current) {
        // Only reset form for new order when order is explicitly null/undefined AND not in edit mode
        editModeInitialized.current = false;
        currentOrderId.current = null;
        setFormData({
          orderNumber: '',
          customerName: '',
          customerPhone: '',
          customerEmail: '',
          vehicleVin: '',
          vehicleYear: '',
          vehicleMake: '',
          vehicleModel: '',
          vehicleInfo: '',
          stockNumber: '',
          orderType: 'sales',
          status: 'pending',
          assignedGroupId: '',
          assignedContactId: '',
          salesperson: '',
          notes: '',
          internalNotes: '',
          priority: 'normal',
          dueDate: preSelectedDate || undefined,
          slaDeadline: undefined,
          scheduledDate: undefined,
          scheduledTime: ''
        });
        setSelectedServices([]);
        setSelectedDealershipWithLog('');
        setSelectedAssignedToWithLog('');
        setSelectedVehicle(null);
        setVinDecoded(false);
      }
    }
  }, [order?.id, open]); // Only re-run if order ID changes or modal opens

  const fetchDealerships = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.user.id
      });

      if (error) throw error;
      const dealerships = data || [];
      setDealerships(dealerships);

      // If in edit mode, find dealership by ID or name
      if (order) {
        let dealershipId = null;

        // Try to find by dealer_id first (most reliable)
        if (order.dealer_id || order.dealerId) {
          dealershipId = (order.dealer_id || order.dealerId).toString();
        }
        // Fallback to finding by name
        else if (order.dealershipName) {
          const matchingDealer = dealerships.find(d => d.name === order.dealershipName);
          if (matchingDealer) {
            dealershipId = matchingDealer.id.toString();
          }
        }
      }
    } catch (error) {
      console.error('Error fetching dealerships:', error);
    }
  };


  const fetchDealerData = async (dealershipId: string) => {
    if (!dealershipId) return;

    setLoading(true);
    try {
      // ✅ FIX: Use RPC function to bypass RLS and get ALL users with sales_orders permissions
      const [usersResult, servicesResult] = await Promise.all([
        supabase.rpc('get_users_with_module_access', {
          p_dealer_id: parseInt(dealershipId),
          p_module: 'sales_orders'
        }),
        supabase.rpc('get_dealer_services_by_department', {
          p_dealer_id: parseInt(dealershipId),
          p_department_name: 'Sales Dept'
        })
      ]);

      if (usersResult.error) {
        console.error('Error fetching users:', usersResult.error);
      }

      if (servicesResult.error) {
        console.error('Error fetching services:', servicesResult.error);
        toast.error('Error loading services');
      }

      if (usersResult.data) {
        // ✅ FIX: RPC function already filtered by module permissions
        // No need for manual filtering - just map to UI format with role_name for grouping
        const users = usersResult.data.map((user: any) => ({
          id: user.user_id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          email: user.email,
          role_name: user.role_name || 'No Role',
          first_name: user.first_name,
          last_name: user.last_name,
          isSystemAdmin: user.is_system_admin
        }));

        console.log(`✅ Loaded ${users.length} users with sales_orders access for dealership ${dealershipId}`);
        setAssignedUsers(users);
      } else {
        setAssignedUsers([]);
      }

      if (servicesResult.data) {
        setServices(servicesResult.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      console.error('Error fetching dealer data:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

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
      // Fallback to name search
      else if (order.dealershipName) {
        const matchingDealer = dealerships.find(d => d.name === order.dealershipName);
        if (matchingDealer) {
          dealershipId = matchingDealer.id.toString();
        }
      }

      if (dealershipId) {
        setSelectedDealership(dealershipId);
        fetchDealerData(dealershipId);
      }
    }
  }, [dealerships.length, order, selectedDealership]);

  // CRITICAL: Set assigned user ONLY after users are loaded (same fix as dealership)
  useEffect(() => {
    if (order && assignedUsers.length > 0 && !selectedAssignedTo) {
      let matchingUser = null;

      // Try to find by ID first (most reliable)
      const assignedId = order.assigned_group_id || order.assigned_contact_id || order.assignedGroupId || order.assignedContactId;
      if (assignedId) {
        matchingUser = assignedUsers.find(user => user.id === assignedId);
      }

      // Fallback to name search
      if (!matchingUser && order.assignedTo && order.assignedTo !== 'Unassigned') {
        matchingUser = assignedUsers.find(user => user.name === order.assignedTo);
      }

      if (matchingUser) {
        setSelectedAssignedTo(matchingUser.id);
      }
    }
  }, [assignedUsers.length, order, selectedAssignedTo]);

  const handleDealershipChange = (dealershipId: string) => {
    setSelectedDealershipWithLog(dealershipId);
    setSelectedAssignedToWithLog('');
    setAssignedUsers([]);
    setServices([]);
    setSelectedServices([]);

    if (dealershipId) {
      fetchDealerData(dealershipId);
    }
  };

  const handleAssignedToChange = (groupId: string) => {
    setSelectedAssignedToWithLog(groupId);
    // Update assignment in form data - do NOT touch customerName
    setFormData(prev => ({
      ...prev,
      assignedGroupId: groupId
    }));
  };

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    setSelectedVehicle(result);

    // Auto-populate all vehicle fields from inventory or VIN API
    setFormData(prev => ({
      ...prev,
      stockNumber: result.data.stockNumber || '',
      vehicleVin: result.data.vin || '',
      vehicleYear: String(result.data.year || ''),
      vehicleMake: result.data.make || '',
      vehicleModel: result.data.model || '',
      vehicleInfo: result.data.vehicleInfo || `${result.data.year || ''} ${result.data.make || ''} ${result.data.model || ''}`.trim()
    }));

    // Mark as decoded if from inventory or VIN API
    setVinDecoded(true);

    // Show toast with enriched data if from inventory
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

    // Handle date formatting - ensure proper ISO string format
    const formatDateForDb = (date: Date | undefined) => {
      if (!date) return null;
      return date instanceof Date ? date.toISOString() : null;
    };

    return {
      // Map frontend camelCase to backend snake_case
      order_number: formData.orderNumber || null,
      customer_name: formData.customerName || null,
      customer_email: formData.customerEmail || null,
      customer_phone: formData.customerPhone || null,

      // Vehicle information fields
      vehicle_vin: formData.vehicleVin || null,
      vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
      vehicle_make: formData.vehicleMake || null,
      vehicle_model: formData.vehicleModel || null,
      vehicle_info: vehicleInfo || null, // Primary consolidated field
      stock_number: formData.stockNumber || null,

      // Order management fields
      order_type: formData.orderType || 'sales',
      status: formData.status || 'pending',
      priority: formData.priority || 'normal',

      // Assignment fields - map selectedAssignedTo to database
      assigned_group_id: selectedAssignedTo || null,          // Use selectedAssignedTo for user assignment
      assigned_contact_id: formData.assignedContactId || null, // Keep for contact assignments
      salesperson: formData.salesperson || null,

      // Date fields - due_date is primary, sla_deadline is secondary
      due_date: formatDateForDb(formData.dueDate),
      sla_deadline: formatDateForDb(formData.slaDeadline),
      scheduled_date: formatDateForDb(formData.scheduledDate),
      scheduled_time: formData.scheduledTime || null,

      // Notes and additional info
      notes: formData.notes || null,
      internal_notes: formData.internalNotes || null,

      // Related data
      dealer_id: selectedDealership ? parseInt(selectedDealership) : null,
      services: selectedServices || [],

      // Financial data - CRITICAL for reports
      total_amount: canViewPrices ? selectedServices.reduce((total, serviceId) => {
        const service = services.find((s: { id: string; price?: number }) => s.id === serviceId);
        return total + (service?.price || 0);
      }, 0) : 0,

      // Location data - for new orders only
      ...(currentLocation.lat && currentLocation.lng ? {
        created_location_lat: currentLocation.lat,
        created_location_lng: currentLocation.lng,
        created_location_address: currentLocation.address
      } : {})
    };
  };

  const validateForm = async (): Promise<boolean> => {
    // Validate required fields with immediate toast feedback
    if (!formData.customerName.trim()) {
      toast.error(t('validation.customerNameRequired'));
      return false;
    }

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

    // Validate assigned to (always required)
    if (!selectedAssignedTo) {
      toast.error(t('validation.assignedToRequired'));
      return false;
    }

    // Validate due date and time - ONLY for sales/service orders on creation (not editing)
    const isCreatingOrder = !order; // No existing order means creating new
    const orderTypesRequiringDueDate = ['sales', 'service'];
    const shouldValidateDueDate = isCreatingOrder && orderTypesRequiringDueDate.includes(formData.orderType);

    if (shouldValidateDueDate) {
      if (!formData.dueDate) {
        toast.error(t('validation.dueDateRequired'));
        return false;
      }

      // Check if date is within 1 week limit
      const today = new Date();
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (formData.dueDate > oneWeekFromNow) {
        toast.error(t('validation.dueDateTooFar'));
        return false;
      }

      // Check minimum 1 hour preparation time
      const now = new Date();
      const minimumTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      if (formData.dueDate < minimumTime) {
        toast.error(t('validation.dueDateTooSoon'));
        return false;
      }
    }

    // Check appointment capacity if dealership and time are selected - only when validating due date
    if (shouldValidateDueDate && selectedDealership && formData.dueDate) {
      try {
        const slot = await checkSlotAvailability(
          parseInt(selectedDealership),
          formData.dueDate,
          formData.dueDate.getHours()
        );

        if (slot && !slot.is_available) {
          toast.error(t('validation.slotNotAvailable', {
            time: formData.dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }));
          return false;
        }
      } catch (capacityError) {
        // Continue with order creation even if capacity check fails
        toast.warning(t('validation.capacityCheckFailed'));
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSubmitting(true);

    try {
      // Validate form first
      const isValid = await validateForm();
      if (!isValid) {
        setSubmitting(false);
        return;
      }

      // Reserve appointment slot before creating order when needed
      const shouldReserveSlot = !isEditing && requiresDueDate && formData.dueDate && selectedDealership;

      if (shouldReserveSlot) {
        try {
          const slotReserved = await reserveSlot(
            parseInt(selectedDealership),
            formData.dueDate as Date,
            (formData.dueDate as Date).getHours()
          );

          if (!slotReserved) {
            toast.error(t('validation.failedToReserveSlot'));
            setSubmitting(false);
            return;
          }
        } catch (slotError) {
          toast.warning(t('validation.slotReservationWarning'));
          // Continue with order creation even if slot reservation fails
        }
      }

      // Proceed directly to order creation without confirmation
      const dbData = transformToDbFormat(formData);

      // Show immediate success feedback
      toast.success(t('orders.creating_order'));

      onSave(dbData);

    } catch (error) {
      console.error('Submit error:', error);
      toast.error(t('orders.creation_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: { id: string; price?: number }) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-screen h-screen max-w-none max-h-none p-0 m-0 rounded-none border-0 sm:max-w-7xl sm:h-auto sm:max-h-[98vh] sm:w-[90vw] md:w-[85vw] lg:w-[90vw] sm:rounded-lg sm:border sm:mx-4"
        aria-describedby="order-modal-description"
      >
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <DialogTitle className="text-base sm:text-lg font-semibold">
                {order ? t('orders.edit') : t('orders.create')}
              </DialogTitle>
              <div id="order-modal-description" className="text-xs sm:text-sm text-muted-foreground">
                {order ? t('orders.edit_order_description', 'Edit order details and information') : t('orders.create_order_description', 'Create a new order with customer and vehicle information')}
              </div>
            </div>

            {/* Quick Search - Only for new orders */}
            {!order && (
              <div className="w-full sm:w-auto sm:min-w-[320px] lg:min-w-[400px]">
                <Alert className="bg-blue-50 border-blue-200 p-3">
                  <div className="flex items-start gap-2">
                    <Search className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <p className="text-xs font-medium text-blue-900">
                        {t('stock.autopop.quickSearch', 'Quick Search')} <span className="text-[10px] text-blue-600 font-normal">({t('common.optional', 'Optional')})</span>
                      </p>
                      <VehicleAutoPopulationField
                        dealerId={selectedDealership ? parseInt(selectedDealership) : undefined}
                        onVehicleSelect={handleVehicleSelect}
                        onVehicleClear={handleVehicleClear}
                        selectedVehicle={selectedVehicle}
                        label=""
                        placeholder={t('stock.filters.search_placeholder', 'Search by stock, VIN, make or model')}
                      />
                      {selectedVehicle && (
                        <p className="text-[10px] text-blue-700 flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                        </p>
                      )}
                    </div>
                  </div>
                </Alert>
              </div>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6 max-h-[calc(100vh-140px)] sm:max-h-[calc(98vh-120px)]">
          <form onSubmit={handleSubmit} className="py-3 space-y-3">
            {/* Single Responsive Container */}
            <Card className="border-border">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">

                  {/* Column 1: Dealership & Assignment Information */}
                  <div className="space-y-3">
                    <div className="border-b border-border pb-1.5 mb-2">
                      <h3 className="text-sm font-medium text-foreground">
                        {t('sales_orders.dealership')} & {t('sales_orders.assignment')}
                      </h3>
                    </div>
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
                         {dealerships.map((dealer: { id: number; name: string; city?: string; state?: string }) => (
                           <SelectItem key={dealer.id} value={dealer.id.toString()}>
                             {dealer.name} - {dealer.city}, {dealer.state}
                           </SelectItem>
                         ))}
                       </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="assignedTo">{t('sales_orders.assigned_to')}</Label>
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

                  <Separator className="my-3" />

                  {/* Customer Information Section */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground">{t('orders.customer_information')}</Label>

                    <div>
                      <Label htmlFor="customerName">{t('orders.customerName')}</Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        className="border-input bg-background"
                        placeholder={t('orders.customerNamePlaceholder')}
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

                    <div>
                      <Label htmlFor="priority">{t('orders.priority')}</Label>
                      <Select
                        value={formData.priority || 'normal'}
                        onValueChange={(value) => handleInputChange('priority', value)}
                      >
                        <SelectTrigger className="border-input bg-background">
                          <SelectValue />
                        </SelectTrigger>
                         <SelectContent className="z-50 bg-popover border-border">
                           <SelectItem value="normal">{t('orders.priority_normal')}</SelectItem>
                           <SelectItem value="high">{t('orders.priority_high')}</SelectItem>
                           <SelectItem value="urgent">{t('orders.priority_urgent')}</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                  </div>
                  </div>

                  {/* Column 2: Vehicle Information */}
                  <div className="space-y-3">
                    <div className="border-b border-border pb-1.5 mb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h3 className="text-sm font-medium text-foreground">{t('orders.vehicleInfo')}</h3>
                        {vinDecoded && <Badge variant="secondary" className="bg-success text-success-foreground self-start sm:self-auto">
                          <Zap className="w-3 h-3 mr-1" />
                          {t('sales_orders.vin_decoded_successfully')}
                        </Badge>}
                      </div>
                    </div>

                  <div>
                    <Label htmlFor="stockNumber">{t('sales_orders.stock_number')}</Label>
                    <Input
                      id="stockNumber"
                      value={formData.stockNumber}
                      onChange={(e) => handleInputChange('stockNumber', e.target.value.toUpperCase())}
                      className={selectedVehicle ? "border-input bg-muted/30 uppercase" : "border-input bg-background uppercase"}
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

                  {/* Consolidated Vehicle Info */}
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

                  <Separator className="my-3" />

                   {/* Due Date & Time Section */}
                   <div className="space-y-3">
                     <Label className="text-sm font-medium">{t('due_date.title')}</Label>
                     <div>
                       <DueDateTimePicker
                         value={formData.dueDate}
                         onChange={(date) => handleInputChange('dueDate', date)}
                         placeholder={t('due_date.date_placeholder')}
                         dealerId={selectedDealership ? parseInt(selectedDealership) : undefined}
                         enforceBusinessRules={!isEditing}
                       />
                     </div>
                   </div>
                  </div>

                  {/* Column 3: Services & Notes */}
                  <div className="space-y-3 col-span-1 lg:col-span-2 xl:col-span-1">
                    <div className="border-b border-border pb-1.5 mb-2">
                      <h3 className="text-sm font-medium text-foreground">{t('orders.servicesAndNotes')}</h3>
                    </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">
                        {t('orders.services')}
                        {selectedDealership && assignedUsers.length > 0 && (
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
                            services.map((service: { id: string; name: string; price?: number; description?: string; category?: string }) => {
                              const isSelected = selectedServices.includes(service.id);
                              const isDisabled = !isSelected && selectedServices.length >= 2;

                              return (
                                <div key={service.id} className={`flex items-start justify-between p-3 border border-border rounded-lg transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-accent/10'}`}>
                                  <div className="flex items-start space-x-3 flex-1 min-h-[44px]">
                                    <Checkbox
                                      id={service.id}
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleServiceToggle(service.id, !!checked)}
                                      className="mt-1 w-5 h-5"
                                      disabled={isDisabled}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <Label
                                        htmlFor={service.id}
                                        className="font-medium text-sm cursor-pointer block leading-relaxed"
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

                  <Separator className="my-3" />

                  <div>
                    <Label htmlFor="notes" className="text-sm font-medium">{t('orders.notes')}</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
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

            {/* Hidden fields with default values for later editing in order details */}
            <div className="hidden">
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
                  !formData.customerName ||
                  !formData.vehicleVin ||
                  !formData.stockNumber ||
                  !selectedAssignedTo ||
                  (requiresDueDate && !formData.dueDate) ||
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
