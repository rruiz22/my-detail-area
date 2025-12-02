import { VehicleAutoPopulationField } from '@/components/orders/VehicleAutoPopulationField';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AvatarSystem } from '@/components/ui/avatar-system';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { useAppointmentCapacity } from '@/hooks/useAppointmentCapacity';
import { usePermissions } from '@/hooks/usePermissions';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';
import { useVinDecoding } from '@/hooks/useVinDecoding';
import { supabase } from '@/integrations/supabase/client';
import { safeParseDate } from '@/utils/dateUtils';
import { logger } from '@/utils/logger';
import { canViewPricing } from '@/utils/permissions';
import { sanitizeOrderForm } from '@/utils/sanitize';
import { AlertCircle, Building2, CalendarClock, Car, Check, ChevronsUpDown, ClipboardList, FileText, Info, Loader2, Scan, Search, User, Wrench, X, Zap } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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
  avatar_url?: string | null;
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
  customerPhone?: string;
  customer_phone?: string;
  customerEmail?: string;
  customer_email?: string;
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
  assignedTo?: string;
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
  dealershipName?: string;
  services?: string[] | Array<{ id?: string; service_id?: string; name?: string; price?: number; description?: string }>;
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
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const { hasPermission } = usePermissionContext();
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
  const [isDebouncing, setIsDebouncing] = useState(false);  // ✅ FIX: Prevent double-submit
  const [vinDecoded, setVinDecoded] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    lat?: number;
    lng?: number;
    address?: string;
  }>({});

  const canViewPrices = canViewPricing(
    enhancedUser?.custom_roles,
    enhancedUser?.is_system_admin ?? false
  );

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
        const getFieldValue = (camelCase: unknown, snakeCase: unknown, defaultValue = ''): string => {
          const value = camelCase ?? snakeCase ?? defaultValue;
          return String(value);
        };

        // Helper function to safely parse dates
        const parseDateField = (camelCaseDate: unknown, snakeCaseDate: unknown) => {
          const dateValue = camelCaseDate || snakeCaseDate;
          if (!dateValue) return undefined;
          const parsed = safeParseDate(String(dateValue));
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

        // ✅ FIX: Extract service IDs from service objects (selectedServices expects string[])
        const serviceIds = servicesData.map(service => {
          // Handle both service object structures
          return typeof service === 'string' ? service : service.id || service.service_id;
        }).filter(Boolean);

        logger.dev('🔍 [OrderModal] Loading order services:', {
          rawServicesData: servicesData,
          extractedServiceIds: serviceIds,
          orderDealerId: order.dealer_id || order.dealerId
        });

        setSelectedServices(serviceIds);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      logger.error('Error fetching dealerships:', error);
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
        logger.error('Error fetching users:', usersResult.error);
      }

      if (servicesResult.error) {
        logger.error('Error fetching services:', servicesResult.error);
        toast({ variant: 'destructive', description: 'Error loading services' });
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

        const users = usersResult.data.map((user: UserResult) => ({
          id: user.user_id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
          email: user.email,
          role_name: user.role_name || 'No Role',
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          isSystemAdmin: user.is_system_admin
        }));

        logger.dev(`✅ Loaded ${users.length} users with sales_orders access for dealership ${dealershipId}`);
        setAssignedUsers(users);
      } else {
        setAssignedUsers([]);
      }

      if (servicesResult.data) {
        logger.dev('🔍 [OrderModal] Loaded dealer services:', {
          dealershipId,
          servicesCount: servicesResult.data.length,
          services: servicesResult.data.map(s => ({ id: s.id, name: s.name }))
        });
        setServices(servicesResult.data);
      } else {
        setServices([]);
      }
    } catch (error) {
      logger.error('Error fetching dealer data:', error);
      toast({ variant: 'destructive', description: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!order && isGlobalFilterActive && globalDealerFilter && dealerships.length > 0 && !selectedDealership) {
      handleDealershipChange(globalDealerFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedUsers.length, order, selectedAssignedTo]);

  // Auto-select current authenticated user for new orders
  useEffect(() => {
    if (!order && assignedUsers.length > 0 && !selectedAssignedTo && authUser) {
      const currentUser = assignedUsers.find(u => u.id === authUser.id);
      if (currentUser) {
        logger.dev('🎯 Auto-selecting current user for Assigned To:', currentUser.name);
        setSelectedAssignedTo(currentUser.id);
        setFormData(prev => ({
          ...prev,
          assignedGroupId: currentUser.id
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedUsers.length, order, selectedAssignedTo, authUser?.id]);

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

      toast({
        description: `${t('stock.autopop.localInventory')}${details.length > 0 ? ': ' + details.join(' • ') : ''}`,
        duration: 4000
      });
    } else if (result.source === 'vin_api') {
      toast({ description: t('stock.autopop.vinDecoded'), duration: 3000 });
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

    toast({ description: t('stock.autopop.cleared', 'Vehicle cleared - you can now enter manually') });
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
        toast({ description: t('orders.max_services_reached', 'Maximum 2 services per order') });
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

    // ✅ Sanitize user inputs before saving to database
    const sanitized = sanitizeOrderForm(formData);

    return {
      // Map frontend camelCase to backend snake_case
      order_number: formData.orderNumber || null,
      customer_name: sanitized.customerName || null,
      customer_email: sanitized.customerEmail || null,
      customer_phone: sanitized.customerPhone || null,

      // Vehicle information fields
      vehicle_vin: sanitized.vehicleVin || null,
      vehicle_year: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
      vehicle_make: formData.vehicleMake || null,
      vehicle_model: formData.vehicleModel || null,
      vehicle_info: vehicleInfo || null, // Primary consolidated field
      stock_number: sanitized.stockNumber || null,

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
      notes: sanitized.notes || null,
      internal_notes: sanitized.internalNotes || null,

      // Related data
      dealer_id: selectedDealership ? parseInt(selectedDealership) : null,
      services: (() => {
        // Debug: Log service matching
        logger.dev('🔍 [OrderModal] Service mapping debug:', {
          selectedServiceIds: selectedServices,
          availableServices: services.map(s => ({ id: s.id, name: s.name, price: s.price })),
          selectedServicesCount: selectedServices.length,
          availableServicesCount: services.length
        });

        return selectedServices.map(serviceId => {
          // Fix: Use type coercion for better ID matching
          const service = services.find((s: { id: string; price?: number; name?: string; description?: string }) =>
            String(s.id) === String(serviceId) || s.id === serviceId
          );

          if (!service) {
            logger.warn('⚠️ [OrderModal] Service not found:', {
              searchingForId: serviceId,
              idType: typeof serviceId,
              availableServiceIds: services.map(s => ({ id: s.id, type: typeof s.id }))
            });
          }

          // ✅ VALIDATION: Warn if service has no price
          if (service && (service.price === null || service.price === undefined)) {
            logger.warn('⚠️ [OrderModal] Service has NULL price:', {
              serviceId: serviceId,
              serviceName: service.name,
              price: service.price
            });
          }

          return {
            id: serviceId,
            name: service?.name || 'Unknown Service',
            price: service?.price ?? 0,  // ✅ Default to 0 instead of undefined
            description: service?.description
          };
        });
      })(),

      // Financial data - CRITICAL for reports
      // ✅ FIXED: Calculate total ALWAYS, regardless of user permissions
      // Price must be saved to DB even if user can't view it in UI
      total_amount: selectedServices.reduce((total, serviceId) => {
        const service = services.find((s: { id: string; price?: number }) => s.id === serviceId);
        const servicePrice = service?.price ?? 0;  // ✅ Default to 0 instead of undefined

        // ✅ VALIDATION: Log if we're adding a zero price
        if (servicePrice === 0 && service) {
          logger.warn('⚠️ [OrderModal] Adding service with $0 price to total:', {
            serviceId,
            serviceName: service.name,
            price: service.price
          });
        }

        return total + servicePrice;
      }, 0),

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
    // Customer name is now optional - removed validation

    // Validate VIN (always required)
    if (!formData.vehicleVin.trim()) {
      toast({ variant: 'destructive', description: t('validation.vinRequired') });
      return false;
    }
    if (formData.vehicleVin.length !== 17) {
      toast({ variant: 'destructive', description: t('validation.vinInvalidLength') });
      return false;
    }

    // ✅ Check for VIN + service duplicate (ALERT only, not blocking)
    if (formData.vehicleVin && selectedServices.length > 0 && selectedDealership) {
      try {
        const { data: existingOrders } = await supabase
          .from('orders')
          .select('id, order_number, services, status')
          .eq('vehicle_vin', formData.vehicleVin.trim())
          .eq('dealer_id', parseInt(selectedDealership))
          .neq('status', 'cancelled');

        if (existingOrders && existingOrders.length > 0) {
          // Check if any existing order has the same service(s)
          const duplicateOrders = existingOrders.filter(existingOrder => {
            const existingServiceIds = existingOrder.services?.map((s: any) =>
              String(s.id || s.service_id)
            ) || [];

            return selectedServices.some(selectedServiceId =>
              existingServiceIds.includes(String(selectedServiceId))
            );
          });

          if (duplicateOrders.length > 0) {
            const duplicateOrderNumbers = duplicateOrders.map(o => o.order_number).join(', ');
            const serviceNames = selectedServices
              .map(serviceId => services.find(s => s.id === serviceId)?.name)
              .filter(Boolean)
              .join(', ');

            // Show warning toast (not blocking)
            toast({
              variant: 'default',
              title: '⚠️ Possible Duplicate',
              description: `VIN ${formData.vehicleVin} already has order(s) with similar service(s): ${serviceNames}. Existing orders: ${duplicateOrderNumbers}`,
              duration: 8000 // Show longer for user to read
            });

            logger.warn('VIN + Service duplicate detected:', {
              vin: formData.vehicleVin,
              selectedServices,
              duplicateOrders: duplicateOrderNumbers
            });
          }
        }
      } catch (error) {
        logger.error('Error checking VIN duplicates:', error);
        // Don't block submission if check fails
      }
    }

    // Validate dealership selection
    if (!selectedDealership) {
      toast({ variant: 'destructive', description: t('validation.dealershipRequired') });
      return false;
    }

    // Validate stock number (always required)
    if (!formData.stockNumber.trim()) {
      toast({ variant: 'destructive', description: t('validation.stockNumberRequired') });
      return false;
    }

    // Validate assigned to (always required)
    if (!selectedAssignedTo) {
      toast({ variant: 'destructive', description: t('validation.assignedToRequired') });
      return false;
    }

    // Validate due date and time - ONLY for sales/service orders on creation (not editing)
    const isCreatingOrder = !order; // No existing order means creating new
    const orderTypesRequiringDueDate = ['sales', 'service'];
    const shouldValidateDueDate = isCreatingOrder && orderTypesRequiringDueDate.includes(formData.orderType);

    if (shouldValidateDueDate) {
      if (!formData.dueDate) {
        toast({ variant: 'destructive', description: t('validation.dueDateRequired') });
        return false;
      }

      // Check if date is within 1 week limit
      const today = new Date();
      const oneWeekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      if (formData.dueDate > oneWeekFromNow) {
        toast({ variant: 'destructive', description: t('validation.dueDateTooFar') });
        return false;
      }

      // Check minimum 1 hour preparation time
      const now = new Date();
      const minimumTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      if (formData.dueDate < minimumTime) {
        toast({ variant: 'destructive', description: t('validation.dueDateTooSoon') });
        return false;
      }
    }

    // ⚠️ DISABLED: Appointment capacity check - causing issues
    // if (shouldValidateDueDate && selectedDealership && formData.dueDate) {
    //   try {
    //     const slot = await checkSlotAvailability(
    //       parseInt(selectedDealership),
    //       formData.dueDate,
    //       getHourInTimezone(formData.dueDate) // Use NY timezone hour
    //     );
    //
    //     if (slot && !slot.is_available) {
    //       toast({ variant: 'destructive', description: t('validation.slotNotAvailable') });
    //       return false;
    //     }
    //   } catch (capacityError) {
    //     // Continue with order creation even if capacity check fails
    //     toast({ description: t('validation.capacityCheckFailed') });
    //   }
    // }

    // ⚠️ DISABLED: VALIDATION FOR EDITING - slot availability check causing issues
    // if (isEditing && order?.due_date && formData.dueDate && selectedDealership) {
    //   const oldDueDateValue = typeof order.due_date === 'string' ? order.due_date : order.due_date.toISOString();
    //   const oldDueDate = safeParseDate(oldDueDateValue);
    //   const newDueDate = formData.dueDate;
    //
    //   // Check if due_date actually changed
    //   if (oldDueDate && newDueDate.getTime() !== oldDueDate.getTime()) {
    //     try {
    //       // Validate new slot availability before allowing update
    //       const newSlot = await checkSlotAvailability(
    //         parseInt(selectedDealership),
    //         newDueDate,
    //         getHourInTimezone(newDueDate) // Use NY timezone hour
    //       );
    //
    //       if (newSlot && !newSlot.is_available) {
    //         toast({
    //           variant: 'destructive',
    //           description: t('validation.newSlotNotAvailable')
    //         });
    //         return false;
    //       }
    //     } catch (capacityError) {
    //       // Log warning but allow update
    //       console.warn('Failed to validate new slot during edit:', capacityError);
    //       toast({ description: t('validation.capacityCheckFailed') });
    //     }
    //   }
    // }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ FIX: Debounce check to prevent double-submit
    if (isDebouncing) {
      logger.warn('⚠️ [OrderModal] Submit debounced - too fast, ignoring duplicate click');
      return;
    }

    setIsDebouncing(true);
    setSubmitting(true);
    setSubmitError(null);

    try {
      // Validate form first
      const isValid = await validateForm();
      if (!isValid) {
        setSubmitting(false);
        setIsDebouncing(false);
        return;
      }

      // ✅ FIX: Validate that at least one service is selected
      if (selectedServices.length === 0) {
        logger.error('❌ [OrderModal] No services selected - blocking submission');
        toast({
          variant: 'destructive',
          title: t('validation.servicesRequired') || 'Services Required',
          description: t('validation.servicesRequiredDescription') || 'Please select at least one service for this order.'
        });
        setSubmitting(false);
        setIsDebouncing(false);
        return;
      }

      // Validate that all selected services exist in available services
      if (selectedServices.length > 0) {
        const missingServices = selectedServices.filter(serviceId => {
          return !services.some(s => String(s.id) === String(serviceId) || s.id === serviceId);
        });

        if (missingServices.length > 0) {
          logger.error('❌ [OrderModal] Missing services:', {
            missingServiceIds: missingServices,
            selectedServices,
            availableServices: services.map(s => s.id)
          });
          toast({
            variant: 'destructive',
            description: t('orders.servicesNotLoaded') || 'Services are still loading. Please wait a moment and try again.'
          });
          setSubmitting(false);
          setIsDebouncing(false);
          return;
        }

        // Additional check: Ensure services array is not empty when we have selections
        if (services.length === 0) {
          logger.error('❌ [OrderModal] Services array is empty but we have selected services');
          toast({
            variant: 'destructive',
            description: t('orders.servicesNotLoaded') || 'Services data is not available. Please refresh and try again.'
          });
          setSubmitting(false);
          setIsDebouncing(false);
          return;
        }
      }

      // ⚠️ DISABLED: Appointment slot reservation (causing 400 errors)
      // Reserve appointment slot before creating order when needed
      // NOTE: Slot management during EDIT is now handled by database trigger
      // The trigger automatically releases old slot and reserves new slot
      // const shouldReserveSlot = !isEditing && requiresDueDate && formData.dueDate && selectedDealership;
      //
      // if (shouldReserveSlot) {
      //   try {
      //     const slotReserved = await reserveSlot(
      //       parseInt(selectedDealership),
      //       formData.dueDate as Date,
      //       getHourInTimezone(formData.dueDate as Date) // Use NY timezone hour
      //     );
      //
      //     if (!slotReserved) {
      //       toast({ variant: 'destructive', description: t('validation.failedToReserveSlot') });
      //       setSubmitting(false);
      //       return;
      //     }
      //   } catch (slotError) {
      //     toast({ description: t('validation.slotReservationWarning') });
      //     // Continue with order creation even if slot reservation fails
      //   }
      // }

      // Check if we have multiple services - create separate orders for each
      if (!isEditing && selectedServices.length > 1) {
        // Create an array of order data, one per service
        const ordersData = selectedServices.map(serviceId => {
          const dbData = transformToDbFormat(formData);
          // Calculate total amount for THIS service only
          const service = services.find((s: { id: string; price?: number; name?: string; description?: string }) => s.id === serviceId);
          const individualAmount = service?.price || 0;

          // ✅ FIX: Validate individual service has positive price
          if (individualAmount === 0) {
            logger.error('❌ [OrderModal] Service has $0 price:', {
              serviceId,
              serviceName: service?.name,
              price: service?.price
            });
            throw new Error(`Service "${service?.name || 'Unknown'}" has invalid price: $${individualAmount}. Please contact administrator to fix service pricing.`);
          }

          return {
            ...dbData,
            services: [{
              id: serviceId,
              name: service?.name || 'Unknown Service',
              price: service?.price,
              description: service?.description
            }],
            totalAmount: individualAmount // Use individual service price
          };
        });

        try {
          // Show immediate success feedback
          toast({ description: t('orders.creating_multiple_orders', { count: selectedServices.length }) || `Creating ${selectedServices.length} orders...` });

          // Pass array of orders to onSave - cast to OrderData type
          await onSave(ordersData as unknown as OrderData);
          onClose(); // Only close if successful
        } catch (error: unknown) {
          logger.error('Error saving orders:', error);
          const errorMessage = error instanceof Error ? error.message : t('orders.save_error') || 'Failed to save orders';
          setSubmitError(errorMessage);
          toast({
            title: t('common.error'),
            description: errorMessage,
            variant: 'destructive'
          });
        }
      } else {
        // Single service or editing - proceed as normal
        const dbData = transformToDbFormat(formData);

        // ✅ FIX: Validate total amount is positive
        if (dbData.total_amount === 0 && !isEditing) {
          logger.error('❌ [OrderModal] Zero amount order detected - blocking submission:', {
            selectedServices,
            services: services.map(s => ({ id: s.id, name: s.name, price: s.price })),
            calculatedTotal: dbData.total_amount
          });
          toast({
            variant: 'destructive',
            title: t('validation.zeroAmountOrder') || 'Invalid Order Amount',
            description: t('validation.zeroAmountOrderDescription') || 'Order total cannot be $0. Please check that selected services have valid prices.'
          });
          setSubmitting(false);
          setIsDebouncing(false);
          return;
        }

        try {
          // Show immediate success feedback
          toast({ description: t('orders.creating_order') });

          await onSave(dbData);
          onClose(); // Only close if successful
        } catch (error: unknown) {
          logger.error('Error saving order:', error);
          const errorMessage = error instanceof Error ? error.message : t('orders.save_error') || 'Failed to save order';
          setSubmitError(errorMessage);
          toast({
            title: t('common.error'),
            description: errorMessage,
            variant: 'destructive'
          });
        }
      }

    } catch (error) {
      logger.error('Submit error:', error);
      toast({ variant: 'destructive', description: t('orders.creation_failed') });
    } finally {
      setSubmitting(false);
      // ✅ FIX: Reset debounce with 1s cooldown to prevent rapid re-submission
      setTimeout(() => setIsDebouncing(false), 1000);
    }
  };

  const totalPrice = canViewPrices ? selectedServices.reduce((total, serviceId) => {
    const service = services.find((s: { id: string; price?: number }) => s.id === serviceId);
    return total + (service?.price || 0);
  }, 0) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        preventOutsideClick={true}
        className="max-w-7xl max-h-[90vh] p-0 flex flex-col rounded-lg overflow-hidden sm:max-h-[98vh] sm:w-[90vw] md:w-[85vw] lg:w-[90vw] sm:border sm:mx-4"
        aria-describedby="order-modal-description"
      >
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-3 sm:px-6 py-2 sm:py-3 border-b border-border sm:rounded-t-lg">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-lg font-semibold truncate">
                {order ? t('orders.edit') : t('orders.create')}
              </DialogTitle>
              <div id="order-modal-description" className="text-xs sm:text-sm text-muted-foreground truncate">
                {order ? t('orders.edit_order_description', 'Update order details and information') : t('orders.create_order_description', 'Create a new order with customer and vehicle information')}
              </div>
            </div>

            {/* Quick Search / Selected Vehicle - Compact in header */}
            {!order && (
              <div className="flex-shrink-0 w-[200px] sm:w-[320px]">
                {selectedVehicle ? (
                  <div className="relative flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-md px-2 py-1.5 pr-8">
                    {selectedVehicle.data.imageUrl && (
                      <img
                        src={selectedVehicle.data.imageUrl}
                        alt="Vehicle"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-blue-300"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-[10px] sm:text-xs bg-blue-100 text-blue-700 border-blue-300 w-full justify-center">
                        <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                        <span className="truncate">
                          {selectedVehicle.source === 'inventory' ? t('stock.autopop.fromInventory', 'From Inventory') : t('stock.autopop.vinDecoded', 'VIN Decoded')}
                        </span>
                      </Badge>
                    </div>
                    <button
                      type="button"
                      onClick={handleVehicleClear}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-200 rounded-full transition-colors"
                      aria-label={t('common.clear', 'Clear')}
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full space-y-1">
                    <Label className="text-[10px] text-cyan-700 font-semibold flex items-center gap-1">
                      <Search className="h-2.5 w-2.5" />
                      {t('stock.autopop.quickSearch')}
                    </Label>
                    <div className="p-1.5 bg-cyan-50 rounded-md border border-cyan-200">
                      <VehicleAutoPopulationField
                        dealerId={selectedDealership ? parseInt(selectedDealership) : undefined}
                        onVehicleSelect={handleVehicleSelect}
                        onVehicleClear={handleVehicleClear}
                        selectedVehicle={selectedVehicle}
                        label=""
                        placeholder={t('stock.filters.search_placeholder', 'Search by stock, VIN, make or model')}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {submitError && (
          <div className="px-3 sm:px-6 pt-3">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          </div>
        )}

        <ScrollArea className="flex-1 px-3 sm:px-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="py-4 sm:py-3 pb-6 space-y-2 sm:space-y-3">
            {/* Accessibility: Live region for form validation errors */}
            {submitError && (
              <div
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                className="sr-only"
              >
                {submitError}
              </div>
            )}

            {/* Single Responsive Container */}
            <Card className="border-border">
              <CardContent className="p-2 sm:p-4">
                <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">

                  {/* Column 1: Dealership & Assignment Information */}
                  <Card className="border-border">
                    <CardHeader className="pb-3 bg-muted/30">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Building2 className="h-4 w-4 text-primary" />
                        {t('sales_orders.dealership')} & {t('sales_orders.assignment')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Box 1: Dealership & Assignment */}
                      <div className="relative p-4 bg-gradient-to-br from-indigo-50 to-indigo-50/30 rounded-lg border-2 border-indigo-200">
                        <div className="absolute -top-3 left-3 px-2 bg-indigo-50 rounded-full">
                          <Badge variant="outline" className="border-indigo-300 text-indigo-700 font-semibold flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {t('service_orders.dealership_assignment')}
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-2">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <Label htmlFor="dealership" className="text-sm flex-shrink-0">
                        {t('sales_orders.dealership')} <span className="text-destructive">*</span>
                      </Label>
                      {isDealerFieldReadOnly && (
                        <Badge variant="secondary" className="text-xs flex-shrink-0">
                          {t('dealerships.auto_selected')}
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={selectedDealership}
                      onValueChange={handleDealershipChange}
                      disabled={loading || isDealerFieldReadOnly}
                    >
                      <SelectTrigger className="border-input bg-background w-full">
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

                  <div className="min-w-0">
                    <Label htmlFor="assignedTo" className="text-sm">
                      {t('sales_orders.assigned_to')} <span className="text-destructive">*</span>
                    </Label>
                    <Popover open={assignedToPopoverOpen} onOpenChange={setAssignedToPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={assignedToPopoverOpen}
                          disabled={loading || !selectedDealership}
                          className="w-full justify-between border-input bg-background h-10 px-3 font-normal min-w-0"
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
                        <div className="absolute -top-3 left-3 px-2 bg-rose-50 rounded-full">
                          <Badge variant="outline" className="border-rose-300 text-rose-700 font-semibold flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t('service_orders.customer_details')}
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-2">

                    <div className="min-w-0">
                      <Label htmlFor="customerName" className="text-sm">
                        {t('orders.customerName')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                      </Label>
                      <Input
                        id="customerName"
                        value={formData.customerName}
                        onChange={(e) => handleInputChange('customerName', e.target.value)}
                        className="border-input bg-background w-full"
                        placeholder={t('orders.customerNamePlaceholder')}
                      />
                    </div>

                    <div className="min-w-0">
                      <Label htmlFor="customerPhone" className="text-sm">
                        {t('forms.labels.phone')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                      </Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={formData.customerPhone || ''}
                        onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                        className="border-input bg-background w-full"
                        placeholder="(555) 123-4567"
                      />
                    </div>

                    <div className="min-w-0">
                      <Label htmlFor="customerEmail" className="text-sm">
                        {t('forms.labels.email')} <span className="text-muted-foreground text-xs">({t('common.optional')})</span>
                      </Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={formData.customerEmail || ''}
                        onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                        className="border-input bg-background w-full"
                        placeholder="customer@example.com"
                      />
                    </div>

                    <div className="hidden">
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
                    </CardContent>
                  </Card>

                  {/* Column 2: Vehicle Information */}
                  <Card className="border-border shadow-md">
                    <CardHeader className="pb-3 bg-emerald-50/30">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Car className="h-4 w-4 text-emerald-600" />
                        {t('orders.vehicleInfo')}
                        {vinDecoded && <Badge variant="secondary" className="bg-success text-success-foreground text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          {t('sales_orders.vin_decoded_successfully')}
                        </Badge>}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Box 1: Stock Number & VIN */}
                      <div className="relative p-4 bg-gradient-to-br from-amber-50 to-amber-50/30 rounded-lg border-2 border-amber-200">
                        <div className="absolute -top-3 left-3 px-2 bg-amber-50 rounded-full">
                          <Badge variant="outline" className="border-amber-300 text-amber-700 font-semibold flex items-center gap-1">
                            <Scan className="h-3 w-3" />
                            {t('service_orders.vehicle_identification')}
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-2">
                  <div className="min-w-0">
                    <Label htmlFor="stockNumber" className="text-sm">
                      {t('sales_orders.stock_number')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="stockNumber"
                      value={formData.stockNumber}
                      onChange={(e) => handleInputChange('stockNumber', e.target.value.toUpperCase())}
                      className={selectedVehicle ? "border-input bg-muted/30 uppercase w-full" : "border-input bg-background uppercase w-full"}
                      readOnly={!!selectedVehicle}
                    />
                    {selectedVehicle && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                      </p>
                    )}
                  </div>

                  <div className="min-w-0">
                    <Label htmlFor="vehicleVin" className="flex items-center gap-2 text-sm">
                      {t('orders.vin')} <span className="text-destructive">*</span>
                      {vinLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </Label>
                    <VinInputWithScanner
                      id="vehicleVin"
                      name="vehicleVin"
                      value={formData.vehicleVin}
                      onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
                      onVinScanned={(vin) => handleVinChange(vin.toUpperCase())}
                      className={selectedVehicle ? "border-input bg-muted/30 font-mono uppercase w-full" : "border-input bg-background font-mono uppercase w-full"}
                      stickerMode={true}
                      disabled={!!selectedVehicle}
                      hideIcon={true}
                    />
                    {vinError && (
                      <div className="flex items-center gap-1 text-sm text-destructive mt-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                        <span className="break-words">{vinError}</span>
                      </div>
                    )}
                    {formData.vehicleVin.length > 0 && formData.vehicleVin.length < 17 && !selectedVehicle && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {17 - formData.vehicleVin.length} characters remaining
                      </div>
                    )}
                    {selectedVehicle && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {t('stock.autopop.autoPopulated', 'Auto-populated from')} {selectedVehicle.source === 'inventory' ? t('stock.autopop.localInventory') : t('stock.autopop.vinDecoded')}
                      </p>
                    )}
                      </div>
                        </div>
                      </div>

                      {/* Box 2: Vehicle Information */}
                      <div className="relative p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-lg border-2 border-emerald-200">
                        <div className="absolute -top-3 left-3 px-2 bg-emerald-50 rounded-full">
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 font-semibold flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {t('sales_orders.vehicle')}
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-2">
                  <div className="min-w-0">
                    <Label htmlFor="vehicleInfo" className="text-sm">
                      {t('sales_orders.vehicle')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="vehicleInfo"
                      value={formData.vehicleInfo}
                      onChange={(e) => handleInputChange('vehicleInfo', e.target.value)}
                      className={selectedVehicle ? "border-input bg-muted/30 w-full" : "border-input bg-background w-full"}
                      placeholder=""
                      readOnly={!!selectedVehicle}
                    />
                    {!formData.vehicleInfo && !selectedVehicle && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {t('sales_orders.manual_vehicle_entry')}
                      </div>
                    )}
                  </div>
                        </div>
                      </div>

                      {/* Box 3: Schedule (Due Date & Time) */}
                      <div className="relative p-4 bg-gradient-to-br from-blue-50 to-blue-50/30 rounded-lg border-2 border-blue-200">
                        <div className="absolute -top-3 left-3 px-2 bg-blue-50 rounded-full">
                          <Badge variant="outline" className="border-blue-300 text-blue-700 font-semibold flex items-center gap-1">
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
                         dealerId={selectedDealership ? parseInt(selectedDealership) : undefined}
                         enforceBusinessRules={!isEditing}
                       />
                     </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Column 3: Services & Notes */}
                  <Card className="border-border col-span-1 lg:col-span-2 xl:col-span-1">
                    <CardHeader className="pb-3 bg-muted/20">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                        {t('orders.servicesAndNotes')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Box 1: Service Selection */}
                      <div className="relative p-4 bg-gradient-to-br from-emerald-50 to-emerald-50/30 rounded-lg border-2 border-emerald-200">
                        <div className="absolute -top-3 left-3 px-2 bg-emerald-50 rounded-full">
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 font-semibold flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            {t('service_orders.service_selection')}
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-2">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <Label className="text-sm font-medium flex-1 min-w-0">
                        <span className="truncate">{t('orders.services')}</span>
                        {selectedDealership && assignedUsers.length > 0 && (
                          <span className="text-muted-foreground ml-1 text-xs">
                            ({services.length} {t('orders.available')})
                          </span>
                        )}
                      </Label>
                      <Badge variant={selectedServices.length >= 2 ? "default" : "secondary"} className="text-xs flex-shrink-0">
                        {selectedServices.length}/2
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
                        <div className="space-y-2">
                          {services.length === 0 ? (
                            <div className="text-center text-muted-foreground py-8">
                              {t('orders.noServicesAvailable')}
                            </div>
                          ) : (
                            services.map((service: { id: string; name: string; price?: number; description?: string; category?: string; duration?: number }) => {
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

                                      {(service.description || service.duration || (canViewPrices && service.price)) && (
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
                                            <div className="flex items-center gap-3 text-xs">
                                              {service.duration && (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-medium">{t('services.duration_label')}:</span>
                                                  <span className="text-muted-foreground">{service.duration} {t('services.minutes')}</span>
                                                </div>
                                              )}
                                              {canViewPrices && service.price && (
                                                <div className="flex items-center gap-1.5">
                                                  <span className="font-medium">{t('services.price')}:</span>
                                                  <span className="font-semibold text-emerald-600">${service.price.toFixed(2)}</span>
                                                </div>
                                              )}
                                            </div>
                                          </HoverCardContent>
                                        </HoverCard>
                                      )}
                                    </div>
                                  </div>
                                </div>
                            );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    )}

                  {canViewPrices && selectedServices.length > 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-emerald-900">{t('orders.total')}</span>
                        <span className="text-lg font-bold text-emerald-600">
                          ${totalPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        {selectedServices.length} {t('orders.servicesSelected')}
                      </div>
                    </div>
                  )}
                  </div>
                        </div>
                      </div>

                      {/* Box 2: Additional Notes */}
                      <div className="relative p-4 bg-gradient-to-br from-slate-50 to-slate-50/30 rounded-lg border-2 border-slate-200">
                        <div className="absolute -top-3 left-3 px-2 bg-slate-50 rounded-full">
                          <Badge variant="outline" className="border-slate-300 text-slate-700 font-semibold flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {t('service_orders.additional_notes')}
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-2">
                  <div className="min-w-0">
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={4}
                      className="border-input bg-background resize-none w-full"
                      placeholder={t('orders.notes_placeholder', 'Add any additional notes or special instructions...')}
                    />
                  </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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

          </form>
        </ScrollArea>

        {/* Footer - Fixed at bottom of modal */}
        <div className="flex-shrink-0 bg-background border-t border-border px-3 sm:px-6 py-4 sm:py-4 flex flex-row justify-end gap-2 sm:gap-3 z-10 sm:rounded-b-lg">
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
            disabled={
              submitting ||
              loading ||  // Disable while services are loading
              !selectedDealership ||
              !formData.vehicleVin ||
              !formData.stockNumber ||
              !selectedAssignedTo ||
              (requiresDueDate && !formData.dueDate) ||
              selectedServices.length === 0 ||
              (selectedDealership && services.length === 0)  // Disable if dealership selected but no services loaded
            }
            className="w-1/2 sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 min-h-[44px]"
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
      </DialogContent>
    </Dialog>
  );
};
