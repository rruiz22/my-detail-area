// =====================================================
// INVOICES REPORT - Complete Invoice Management
// Created: 2024-10-16
// Description: Full invoice management interface within Reports
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateInvoiceDialog } from '../invoices/CreateInvoiceDialog';
import { InvoiceDetailsDialog } from '../invoices/InvoiceDetailsDialog';
import { RecordPaymentDialog } from '../invoices/RecordPaymentDialog';
import { VehicleInvoiceSearch } from '../invoices/VehicleInvoiceSearch';
import { SendInvoiceEmailDialog } from '../invoices/email/SendInvoiceEmailDialog';
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices, useInvoiceSummary, useDeleteInvoice } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import type { ReportsFilters } from '@/hooks/useReportsData';
import type { Invoice, InvoiceFilters, InvoiceStatus } from '@/types/invoices';
import type { UnifiedOrderData } from '@/types/unifiedOrder';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Mail,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  X
} from 'lucide-react';
import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useDateCalculations } from '@/hooks/useDateCalculations';
import { useQueryClient } from '@tanstack/react-query';

interface InvoicesReportProps {
  filters: ReportsFilters;
}

interface VehicleForInvoice {
  id: string;
  order_number: string;
  custom_order_number: string | null;
  order_type: string;
  customer_name: string;
  assigned_group_id: string | null;
  stock_number: string | null;
  po: string | null;
  ro: string | null;
  tag: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_vin: string | null;
  total_amount: number;
  services: any[] | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  due_date: string | null;
}

const getStatusBadge = (status: InvoiceStatus) => {
  const styles = {
    draft: { variant: 'secondary' as const, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Draft' },
    pending: { variant: 'outline' as const, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Pending' },
    paid: { variant: 'default' as const, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Paid' },
    partially_paid: { variant: 'secondary' as const, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Partial' },
    overdue: { variant: 'destructive' as const, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' },
    cancelled: { variant: 'outline' as const, color: 'text-gray-500', bg: 'bg-gray-50', label: 'Cancelled' }
  };

  const style = styles[status] || styles.draft;
  return (
    <Badge
      variant={style.variant}
      className={`${style.bg} ${style.color} border-none font-normal`}
    >
      {style.label}
    </Badge>
  );
};

export const InvoicesReport: React.FC<InvoicesReportProps> = ({ filters }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { calculateDateRange } = useDateCalculations();
  const queryClient = useQueryClient();

  const dealerId = filters.dealerId;

  const today = new Date();
  const defaultDueDate = new Date(today);
  defaultDueDate.setDate(today.getDate() + 30);

  const [activeTab, setActiveTab] = useState<'invoices' | 'create'>('invoices');

  // Invoice list filters - Don't filter by date initially to show all invoices
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({
    status: 'all',
    orderType: filters.orderType,
    startDate: undefined, // Don't filter by date - show all invoices
    endDate: undefined,   // Don't filter by date - show all invoices
    dealerId: dealerId || 'all',
    searchTerm: ''
  });

  // Update invoice filters when global dealer filter changes
  useEffect(() => {
    setInvoiceFilters(prev => ({
      ...prev,
      dealerId: dealerId || 'all'
    }));
  }, [dealerId]);

  // Get this week's date range using platform timezone
  const { startDate: startOfThisWeek, endDate: endOfThisWeek } = calculateDateRange('this_week');

  // Create invoice filters
  const [orderType, setOrderType] = useState<string>('all');
  const [orderStatus, setOrderStatus] = useState<string>('completed');
  const [dateRange, setDateRange] = useState<'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom'>('this_week');
  const [startDate, setStartDate] = useState<string>(startOfThisWeek);
  const [endDate, setEndDate] = useState<string>(endOfThisWeek);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [excludedServices, setExcludedServices] = useState<Set<string>>(new Set());

  // Sorting state
  const [sortField, setSortField] = useState<'date' | null>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Handle date range preset changes - now uses platform timezone
  const handleDateRangeChange = (value: 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom') => {
    setDateRange(value);

    if (value !== 'custom') {
      const { startDate: start, endDate: end } = calculateDateRange(value);
      setStartDate(start);
      setEndDate(end);
    }
  };

  // Selected vehicles for new invoice
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  // Invoice details
  const [issueDate, setIssueDate] = useState<Date>(today);
  const [dueDate, setDueDate] = useState<Date>(defaultDueDate);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  // Dialogs
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showQuickCreateDialog, setShowQuickCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [invoiceHtml, setInvoiceHtml] = useState('');

  // Order detail modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<'sales' | 'service' | 'recon' | 'carwash'>('sales');
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch order details when selected
  const { data: selectedOrderData, isLoading: loadingOrderData } = useQuery({
    queryKey: ['order-details', selectedOrderId],
    queryFn: async (): Promise<UnifiedOrderData | null> => {
      if (!selectedOrderId) return null;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', selectedOrderId)
        .single();

      if (error) throw error;
      return data as UnifiedOrderData;
    },
    enabled: !!selectedOrderId && showOrderModal,
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: loadingInvoices } = useInvoices(invoiceFilters);
  const { data: summary } = useInvoiceSummary(invoiceFilters);
  const deleteInvoiceMutation = useDeleteInvoice();

  // Fetch available services for filters
  const { data: availableServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ['dealer-services', dealerId],
    queryFn: async () => {
      if (!dealerId) return [];

      const { data, error } = await supabase
        .from('dealer_services')
        .select('id, name, description, price')
        .eq('dealer_id', dealerId)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('❌ Error fetching services:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!dealerId,
  });

  // Fetch TOTAL orders in period (including invoiced ones) - for displaying total count
  const { data: totalOrdersInPeriodData } = useQuery({
    queryKey: ['total-orders-in-period', dealerId, orderType, startDate, endDate, orderStatus],
    queryFn: async (): Promise<{ total: number; excluded: number; available: number; invoiced: number }> => {
      if (!dealerId) return { total: 0, excluded: 0, available: 0, invoiced: 0 };

      // Query all orders in the period with services
      let query = supabase
        .from('orders')
        .select('id, order_type, created_at, completed_at, due_date, status, services')
        .eq('dealer_id', dealerId)
        .limit(2000);

      // Apply order type filter
      if (orderType !== 'all') {
        query = query.eq('order_type', orderType);
      }

      // Apply status filter
      if (orderStatus !== 'all') {
        query = query.eq('status', orderStatus);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      if (!orders) return { total: 0, excluded: 0, available: 0, invoiced: 0 };

      // Filter by appropriate date field based on order_type (client-side)
      const startDateTime = parseISO(startDate);
      const endDateTime = parseISO(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const filteredByDate = orders.filter(order => {
        let reportDate: Date;

        if (order.order_type === 'sales' || order.order_type === 'service') {
          reportDate = order.due_date ? new Date(order.due_date) : new Date(order.created_at);
        } else if (order.order_type === 'recon' || order.order_type === 'carwash') {
          reportDate = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
        } else {
          reportDate = new Date(order.created_at);
        }

        return reportDate >= startDateTime && reportDate <= endDateTime;
      });

      // Get existing invoice items
      const { data: existingInvoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('service_reference')
        .not('service_reference', 'is', null);

      if (itemsError) throw itemsError;

      const invoicedOrderIds = new Set(
        existingInvoiceItems
          ?.map(item => item.service_reference)
          .filter(Boolean) || []
      );

      const availableCount = filteredByDate.filter(order => !invoicedOrderIds.has(order.id)).length;
      const invoicedCount = filteredByDate.filter(order => invoicedOrderIds.has(order.id)).length;

      return {
        total: filteredByDate.length,
        excluded: 0, // Will be calculated separately with excluded services
        available: availableCount,
        invoiced: invoicedCount
      };
    },
    enabled: !!dealerId && activeTab === 'create',
    staleTime: 30 * 1000,
  });

  // Fetch ALL vehicles for counts (direct query, no RPC)
  const { data: allVehiclesForCounts = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['all-vehicles-for-counts', dealerId, orderType, startDate, endDate],
    queryFn: async (): Promise<VehicleForInvoice[]> => {
      if (!dealerId) return [];

      // Direct query instead of missing RPC function
      let query = supabase
        .from('orders')
        .select('id, order_number, custom_order_number, order_type, customer_name, stock_number, po, ro, tag, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, total_amount, services, status, created_at, completed_at, due_date, assigned_group_id')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(1000); // Increased limit since we filter client-side

      // Apply order type filter
      if (orderType !== 'all') {
        query = query.eq('order_type', orderType);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      if (!orders) return [];

      // Filter by appropriate date field based on order_type (client-side)
      // Sales/Service: use due_date, Recon/CarWash: use completed_at
      const startDateTime = parseISO(startDate);
      const endDateTime = parseISO(endDate);
      endDateTime.setHours(23, 59, 59, 999);

      const filteredByDate = orders.filter(order => {
        let reportDate: Date;

        if (order.order_type === 'sales' || order.order_type === 'service') {
          // Sales and Service orders: use due_date (fallback to created_at)
          reportDate = order.due_date ? new Date(order.due_date) : new Date(order.created_at);
        } else if (order.order_type === 'recon' || order.order_type === 'carwash') {
          // Recon and CarWash orders: use completed_at (fallback to created_at)
          reportDate = order.completed_at ? new Date(order.completed_at) : new Date(order.created_at);
        } else {
          // Other types: fallback to created_at
          reportDate = new Date(order.created_at);
        }

        return reportDate >= startDateTime && reportDate <= endDateTime;
      });

      // Get existing invoice items to filter out already invoiced orders
      const { data: existingInvoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('service_reference')
        .not('service_reference', 'is', null);

      if (itemsError) throw itemsError;

      const invoicedOrderIds = new Set(
        existingInvoiceItems
          ?.map(item => item.service_reference)
          .filter(Boolean) || []
      );

      return filteredByDate.filter(order => !invoicedOrderIds.has(order.id)) as VehicleForInvoice[];
    },
    enabled: !!dealerId && activeTab === 'create',
    staleTime: 30 * 1000,
  });

  // Fetch vehicles WITH status filter applied (for display)
  const availableVehicles = useMemo(() => {
    if (orderStatus === 'all') {
      return allVehiclesForCounts;
    }
    return allVehiclesForCounts.filter(v => v.status === orderStatus);
  }, [allVehiclesForCounts, orderStatus]);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    let filtered = availableVehicles;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(vehicle =>
        vehicle.customer_name?.toLowerCase().includes(term) ||
        vehicle.stock_number?.toLowerCase().includes(term) ||
        vehicle.po?.toLowerCase().includes(term) ||
        vehicle.ro?.toLowerCase().includes(term) ||
        vehicle.tag?.toLowerCase().includes(term) ||
        vehicle.vehicle_vin?.toLowerCase().includes(term) ||
        vehicle.vehicle_make?.toLowerCase().includes(term) ||
        vehicle.vehicle_model?.toLowerCase().includes(term) ||
        vehicle.order_number?.toLowerCase().includes(term)
      );
    }

    if (selectedService !== 'all') {
      filtered = filtered.filter(vehicle => {
        if (!vehicle.services || !Array.isArray(vehicle.services)) return false;
        return vehicle.services.some((service: any) => {
          const serviceId = service.id || service.type || service;
          return serviceId === selectedService;
        });
      });
    }

    if (excludedServices.size > 0) {
      filtered = filtered.filter(vehicle => {
        if (!vehicle.services || !Array.isArray(vehicle.services)) return true;
        const hasExcludedService = vehicle.services.some((service: any) => {
          const serviceId = service.id || service.type || service;
          return excludedServices.has(serviceId);
        });
        return !hasExcludedService;
      });
    }

    // Apply sorting
    if (sortField === 'date') {
      filtered.sort((a, b) => {
        // Get the appropriate date field based on order type
        const getDate = (vehicle: VehicleForInvoice) => {
          if (vehicle.order_type === 'sales' || vehicle.order_type === 'service') {
            return vehicle.due_date || vehicle.created_at;
          } else if (vehicle.order_type === 'recon' || vehicle.order_type === 'carwash') {
            return vehicle.completed_at || vehicle.created_at;
          }
          return vehicle.created_at;
        };

        const dateA = new Date(getDate(a)).getTime();
        const dateB = new Date(getDate(b)).getTime();

        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;
  }, [availableVehicles, searchTerm, selectedService, excludedServices, sortField, sortDirection]);

  const selectedVehicles = useMemo(() => {
    return filteredVehicles.filter(v => selectedVehicleIds.has(v.id));
  }, [filteredVehicles, selectedVehicleIds]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allVehiclesForCounts.length,
      completed: 0,
      in_progress: 0,
      pending: 0,
      cancelled: 0,
    };

    allVehiclesForCounts.forEach(vehicle => {
      const status = vehicle.status || 'unknown';
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }, [allVehiclesForCounts]);

  // Calculate service counts from ALL vehicles (before filtering by excluded services)
  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    // Use allVehiclesForCounts to get counts BEFORE excluding services
    allVehiclesForCounts.forEach(vehicle => {
      if (!vehicle.services || !Array.isArray(vehicle.services)) return;

      vehicle.services.forEach((service: any) => {
        const serviceId = service.id || service.type || service;
        counts[serviceId] = (counts[serviceId] || 0) + 1;
      });
    });

    return counts;
  }, [allVehiclesForCounts]);

  // Calculate how many orders have excluded services
  const excludedOrdersCount = useMemo(() => {
    if (excludedServices.size === 0) return 0;

    return allVehiclesForCounts.filter(vehicle => {
      if (!vehicle.services || !Array.isArray(vehicle.services)) return false;
      return vehicle.services.some((service: any) => {
        const serviceId = service.id || service.type || service;
        return excludedServices.has(serviceId);
      });
    }).length;
  }, [allVehiclesForCounts, excludedServices]);

  // Calculate total orders in period (respecting excluded services filter)
  const totalOrdersInPeriod = useMemo(() => {
    if (!totalOrdersInPeriodData) return 0;
    // Total orders minus the ones with excluded services
    return totalOrdersInPeriodData.total - excludedOrdersCount;
  }, [totalOrdersInPeriodData, excludedOrdersCount]);

  const subtotal = useMemo(() => {
    return selectedVehicles.reduce((sum, v) => sum + (v.total_amount || 0), 0);
  }, [selectedVehicles]);

  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = subtotal + taxAmount - discountAmount;

  // Handlers
  const handleToggleVehicle = (vehicleId: string) => {
    const newSelected = new Set(selectedVehicleIds);
    if (newSelected.has(vehicleId)) {
      newSelected.delete(vehicleId);
    } else {
      newSelected.add(vehicleId);
    }
    setSelectedVehicleIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedVehicleIds.size === filteredVehicles.length) {
      setSelectedVehicleIds(new Set());
    } else {
      setSelectedVehicleIds(new Set(filteredVehicles.map(v => v.id)));
    }
  };

  const toggleExcludeService = (serviceId: string) => {
    const newExcluded = new Set(excludedServices);
    if (newExcluded.has(serviceId)) {
      newExcluded.delete(serviceId);
    } else {
      newExcluded.add(serviceId);
    }
    setExcludedServices(newExcluded);
  };

  const handleSortByDate = () => {
    if (sortField === 'date') {
      // Toggle direction if already sorting by date
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Start sorting by date in descending order
      setSortField('date');
      setSortDirection('desc');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dealerId) {
      toast({ variant: 'destructive', description: 'Please select a dealership' });
      return;
    }

    if (selectedVehicleIds.size === 0) {
      toast({ variant: 'destructive', description: 'Please select at least one vehicle' });
      return;
    }

    if (dueDate < issueDate) {
      toast({ variant: 'destructive', description: 'Due date must be after issue date' });
      return;
    }

    try {
      if (!user) throw new Error('User not authenticated');

      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { p_dealer_id: dealerId });

      if (numberError) throw numberError;

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: selectedVehicles[0].id,
          dealer_id: dealerId,
          created_by: user.id,
          issue_date: issueDate.toISOString(),
          due_date: dueDate.toISOString(),
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          amount_due: totalAmount,
          status: 'pending',
          metadata: {
            filter_date_range: {
              start: startDate,
              end: endDate,
              preset: dateRange
            },
            vehicle_count: selectedVehicles.length,
            department: orderType === 'all' ? 'all' : orderType,
            departments: [...new Set(selectedVehicles.map(v => v.order_type))]
          }
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const items = selectedVehicles.map((vehicle, index) => {
        // Extract service names from vehicle.services
        const serviceNames = vehicle.services && Array.isArray(vehicle.services)
          ? vehicle.services.map((service: any) => {
              const serviceId = service.id || service.type || service;
              const serviceName = availableServices.find(s => s.id === serviceId)?.name || serviceId;
              return serviceName;
            }).join(', ')
          : 'N/A';

        return {
          invoice_id: invoice.id,
          item_type: 'service' as const,
          description: `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''} - ${vehicle.stock_number || 'N/A'}`.trim(),
          quantity: 1,
          unit_price: vehicle.total_amount || 0,
          discount_amount: 0,
          tax_rate: 0,
          total_amount: vehicle.total_amount || 0,
          service_reference: vehicle.id,
          sort_order: index,
          metadata: {
            order_number: vehicle.custom_order_number || vehicle.order_number,
            order_type: vehicle.order_type,
            customer_name: vehicle.customer_name,
            vehicle_vin: vehicle.vehicle_vin,
            stock_number: vehicle.stock_number,
            po: vehicle.po,
            ro: vehicle.ro,
            tag: vehicle.tag,
            completed_at: vehicle.completed_at,
            services: vehicle.services,
            service_names: serviceNames,
          },
        };
      });

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast({ description: `Invoice ${invoiceNumber} created with ${selectedVehicles.length} vehicles` });

      // Invalidate queries to refresh the invoice list automatically
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-for-counts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-without-invoice'] });

      // Reset and switch to invoices tab
      setSelectedVehicleIds(new Set());
      setSearchTerm('');
      setActiveTab('invoices');
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      toast({ variant: 'destructive', description: `Failed to create invoice: ${error.message}` });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(parseISO(dateString), 'MMM dd, yyyy');
  };

  const getServiceNames = (services: any[] | null): string => {
    if (!services || !Array.isArray(services) || services.length === 0) return 'N/A';

    return services.map((s: any) => {
      // Handle different service data structures
      if (typeof s === 'string') {
        // If service is just a string ID, try to find it in availableServices
        const serviceData = availableServices?.find(ds => ds.id === s);
        return serviceData?.name || s;
      }

      // If service is an object, try different fields
      // Priority 1: Direct name field (carwash new format)
      if (s.name) return s.name;

      // Priority 2: Lookup by type field (carwash with type ID)
      if (s.type) {
        const serviceData = availableServices?.find(ds => ds.id === s.type);
        return serviceData?.name || s.type;
      }

      // Priority 3: Lookup by id field (Sales/Service/Recon)
      if (s.id) {
        const serviceData = availableServices?.find(ds => ds.id === s.id);
        return serviceData?.name || s.id;
      }

      // Priority 4: Other name fields
      if (s.service_name) return s.service_name;

      return 'Unknown';
    }).join(', ');
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      // Fetch full invoice with items and payments
      const { data: fullInvoice, error } = await supabase
        .from('invoices')
        .select(`
          *,
          dealer:dealers(name, logo_url, thumbnail_logo_url, address, email, phone),
          items:invoice_items(*),
          payments(*)
        `)
        .eq('id', invoice.id)
        .single();

      if (error) throw error;
      if (!fullInvoice) throw new Error('Invoice not found');

      const dealerName = fullInvoice.dealer?.name || 'Dealership';
      const dealerLogo = fullInvoice.dealer?.thumbnail_logo_url || fullInvoice.dealer?.logo_url || '';
      const dealerAddress = fullInvoice.dealer?.address || '';
      const dealerEmail = fullInvoice.dealer?.email || '';
      const dealerPhone = fullInvoice.dealer?.phone || '';

      // Parse dates
      const issueDate = new Date(fullInvoice.issue_date);
      const dueDate = new Date(fullInvoice.due_date);

      // Get order type from first item
      const firstItem = fullInvoice.items?.[0];
      const orderType = firstItem?.metadata?.order_type || 'sales';
      const isServiceOrder = orderType === 'service';
      const isCarWashOrder = orderType === 'carwash';

      // Generate HTML for printing/PDF with modern clean design
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${fullInvoice.invoice_number}</title>
          <style>
            @page {
              margin: 0.5in;
              @bottom-right {
                content: "Page " counter(page) " of " counter(pages);
                font-size: 10px;
                color: #6b7280;
              }
            }
            @media print {
              body { margin: 0; }
              .page-break {
                page-break-after: always;
              }
              .no-break {
                page-break-inside: avoid;
              }
              .logo-header {
                page-break-after: avoid;
              }
              .invoice-header {
                page-break-after: avoid;
              }
              table {
                page-break-inside: auto;
              }
              tr {
                page-break-inside: avoid;
                page-break-after: auto;
              }
              thead {
                display: table-header-group;
              }
              tfoot {
                display: table-footer-group;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 40px;
              color: #1a1a1a;
              line-height: 1.6;
            }
            .logo-header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #e5e7eb;
            }
            .logo-header img {
              max-height: 80px;
              max-width: 250px;
              object-fit: contain;
              margin-bottom: 12px;
            }
            .logo-header .dealer-name {
              font-size: 24px;
              font-weight: 600;
              color: #1a1a1a;
            }
            .invoice-header {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              padding-bottom: 20px;
              border-bottom: 1px solid #e5e7eb;
            }
            .bill-to {
              flex: 1;
            }
            .bill-to h3 {
              font-size: 16px;
              font-weight: 600;
              margin: 0 0 12px 0;
            }
            .bill-to p {
              margin: 4px 0;
              color: #6b7280;
              font-size: 14px;
            }
            .bill-to .company-name {
              font-size: 16px;
              font-weight: 500;
              color: #1a1a1a;
            }
            .invoice-details {
              text-align: right;
              flex: 1;
            }
            .invoice-details > div {
              margin-bottom: 8px;
            }
            .invoice-details label {
              color: #6b7280;
              font-size: 14px;
              display: block;
            }
            .invoice-details .value {
              font-weight: 500;
              color: #1a1a1a;
              font-size: 14px;
              margin-top: 2px;
            }
            .vehicles-section {
              margin: 30px 0;
            }
            .vehicles-section h3 {
              font-size: 15px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
            }
            th {
              background-color: #f9fafb;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              color: #374151;
              border-bottom: 2px solid #e5e7eb;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #f3f4f6;
              font-size: 13px;
            }
            tr:last-child td {
              border-bottom: none;
            }
            .text-right { text-align: right; }
            .font-mono { font-family: 'Courier New', monospace; font-size: 12px; }
            .font-medium { font-weight: 500; }
            .totals-section {
              margin-top: 30px;
              display: flex;
              justify-content: flex-end;
            }
            .totals-box {
              width: 350px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
            }
            .total-row.border-top {
              border-top: 2px solid #e5e7eb;
              padding-top: 12px;
              margin-top: 8px;
            }
            .total-row.main-total {
              font-size: 18px;
              font-weight: 600;
            }
            .total-row.amount-due {
              font-size: 16px;
              font-weight: 600;
              color: #f59e0b;
            }
            .text-muted { color: #6b7280; }
            .text-success { color: #10b981; }
            .payment-history {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
            .payment-history h4 {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 12px;
            }
            .payment-item {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 12px 16px;
              background-color: #f0fdf4;
              border-radius: 8px;
              margin-bottom: 8px;
            }
            .payment-item .left p {
              margin: 2px 0;
            }
            .payment-item .method {
              font-weight: 500;
              font-size: 14px;
            }
            .payment-item .date {
              font-size: 12px;
              color: #6b7280;
            }
            .payment-item .amount {
              font-weight: 600;
              color: #10b981;
              font-size: 16px;
            }
            .page-footer {
              position: fixed;
              bottom: 0;
              right: 0;
              font-size: 10px;
              color: #6b7280;
              padding: 10px 20px;
            }
            @media print {
              .page-footer {
                position: fixed;
                bottom: 0;
                right: 0;
              }
            }
          </style>
        </head>
        <body>
          <!-- Logo Header -->
          <div class="logo-header">
            ${dealerLogo ? `<img src="${dealerLogo}" alt="${dealerName}" />` : ''}
            <div class="dealer-name">${dealerName}</div>
          </div>

          <!-- Invoice Header -->
          <div class="invoice-header">
            <div class="bill-to">
              <h3>Bill To:</h3>
              <p class="company-name">${dealerName}</p>
              ${dealerAddress ? `<p>${dealerAddress}</p>` : ''}
              ${dealerEmail ? `<p>${dealerEmail}</p>` : ''}
              ${dealerPhone ? `<p>${dealerPhone}</p>` : ''}
            </div>
            <div class="invoice-details">
              <div>
                <label>Invoice Date:</label>
                <div class="value">${format(issueDate, 'MMM dd, yyyy')}</div>
              </div>
              <div>
                <label>Due Date:</label>
                <div class="value">${format(dueDate, 'MMM dd, yyyy')}</div>
              </div>
              <div>
                <label>Invoice Number:</label>
                <div class="value font-mono">${fullInvoice.invoice_number}</div>
              </div>
              ${fullInvoice.metadata?.filter_date_range ? `
              <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <label>Service Period:</label>
                <div class="value">${format(parseISO(fullInvoice.metadata.filter_date_range.start), 'MMM dd, yyyy')} - ${format(parseISO(fullInvoice.metadata.filter_date_range.end), 'MMM dd, yyyy')}</div>
              </div>
              ` : ''}
            </div>
          </div>

          <!-- Vehicles Section -->
          <div class="vehicles-section">
            <h3>Vehicles (${fullInvoice.items?.length || 0})</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>${isServiceOrder ? 'RO/PO/Tag' : isCarWashOrder ? 'Stock/Tag' : 'Stock'}</th>
                  <th>Vehicle</th>
                  <th>VIN</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${fullInvoice.items?.map(item => {
                  const metadata = item.metadata || {};
                  const itemDate = metadata.completed_at || fullInvoice.issue_date;
                  const vehicle = item.description || 'N/A';
                  const vin = metadata.vehicle_vin || 'N/A';

                  let stockDisplay = 'N/A';
                  if (isServiceOrder) {
                    const parts = [];
                    if (metadata.ro) parts.push(`RO: ${metadata.ro}`);
                    if (metadata.po) parts.push(`PO: ${metadata.po}`);
                    if (metadata.tag) parts.push(`Tag: ${metadata.tag}`);
                    stockDisplay = parts.length > 0 ? parts.join(', ') : 'N/A';
                  } else if (isCarWashOrder) {
                    const parts = [];
                    if (metadata.stock_number) parts.push(metadata.stock_number);
                    if (metadata.tag) parts.push(metadata.tag);
                    stockDisplay = parts.length > 0 ? parts.join(' / ') : 'N/A';
                  } else {
                    stockDisplay = metadata.stock_number || 'N/A';
                  }

                  return `
                    <tr>
                      <td>${format(parseISO(itemDate), 'MM/dd/yyyy')}</td>
                      <td class="font-medium">${stockDisplay}</td>
                      <td>${vehicle}</td>
                      <td class="font-mono">${vin}</td>
                      <td class="text-right font-medium">${formatCurrency(item.total_amount)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Totals Section -->
          <div class="totals-section no-break">
            <div class="totals-box">
              <div class="total-row">
                <span class="text-muted">Subtotal:</span>
                <span class="font-medium">${formatCurrency(fullInvoice.subtotal)}</span>
              </div>
              ${fullInvoice.tax_rate > 0 ? `
                <div class="total-row">
                  <span class="text-muted">Tax (${fullInvoice.tax_rate}%):</span>
                  <span class="font-medium">${formatCurrency(fullInvoice.tax_amount)}</span>
                </div>
              ` : ''}
              ${fullInvoice.discount_amount > 0 ? `
                <div class="total-row">
                  <span class="text-muted">Discount:</span>
                  <span class="font-medium">-${formatCurrency(fullInvoice.discount_amount)}</span>
                </div>
              ` : ''}
              <div class="total-row border-top main-total">
                <span>Total:</span>
                <span>${formatCurrency(fullInvoice.total_amount)}</span>
              </div>
              ${fullInvoice.amount_paid > 0 ? `
                <div class="total-row">
                  <span class="text-success">Amount Paid:</span>
                  <span class="text-success font-medium">${formatCurrency(fullInvoice.amount_paid)}</span>
                </div>
                <div class="total-row border-top amount-due">
                  <span>Amount Due:</span>
                  <span>${formatCurrency(fullInvoice.amount_due)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Payment History -->
          ${fullInvoice.payments && fullInvoice.payments.length > 0 ? `
            <div class="payment-history no-break">
              <h4>Payment History:</h4>
              ${fullInvoice.payments.map(payment => `
                <div class="payment-item">
                  <div class="left">
                    <p class="method">Payment ${payment.payment_number} - ${payment.payment_method}</p>
                    <p class="date">${format(parseISO(payment.payment_date), 'MMM dd, yyyy')}</p>
                  </div>
                  <div class="amount">${formatCurrency(payment.amount)}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Page Counter for Print -->
          <script>
            // Auto-number pages when printing
            if (window.matchMedia) {
              const mediaQueryList = window.matchMedia('print');
              mediaQueryList.addListener((mql) => {
                if (mql.matches) {
                  // Printing
                } else {
                  // Not printing
                }
              });
            }
          </script>
        </body>
        </html>
      `;

      // Show invoice in modal
      setInvoiceHtml(htmlContent);
      setShowInvoicePreview(true);

    } catch (error) {
      console.error('Error generating invoice:', error);
      toast({ variant: 'destructive', description: 'Failed to generate invoice' });
    }
  };

  const handlePrintInvoice = () => {
    // Create a new window with only the invoice content
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(invoiceHtml);
      printWindow.document.close();

      // Wait for images to load before printing
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      };
    }
  };

  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;

    try {
      await deleteInvoiceMutation.mutateAsync(invoiceToDelete.id);
      setInvoiceToDelete(null);
    } catch (error) {
      // Error is handled in the mutation
      console.error('Error deleting invoice:', error);
    }
  };

  if (!dealerId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Please select a dealership to manage invoices</p>
        </div>
      </div>
    );
  }

  // Summary cards
  const summaryCards = [
    {
      title: 'Total Billed',
      value: formatCurrency(summary?.totalAmount || 0),
      icon: DollarSign,
      trend: `${summary?.totalInvoices || 0} invoices`,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50'
    },
    {
      title: 'Collected',
      value: formatCurrency(summary?.totalPaid || 0),
      icon: CheckCircle2,
      trend: `${summary?.paidCount || 0} paid`,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Outstanding',
      value: formatCurrency(summary?.totalDue || 0),
      icon: Clock,
      trend: `${summary?.pendingCount || 0} pending`,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Overdue',
      value: `${summary?.overdueCount || 0}`,
      icon: AlertCircle,
      trend: 'Requires attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="h-6 w-6" />
            Invoice Management
          </h2>
          <p className="text-muted-foreground text-sm">Manage invoices and billing for your dealership</p>
        </div>
        <Button onClick={() => setShowQuickCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Quick Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="border-none shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-semibold tracking-tight">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.trend}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices List
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            Check Vehicle
          </TabsTrigger>
        </TabsList>

        {/* INVOICES LIST TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle>Invoices</CardTitle>
              <CardDescription>View and manage all invoices</CardDescription>

              {/* Filters */}
              <div className="flex gap-3 mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search invoices..."
                    value={invoiceFilters.searchTerm}
                    onChange={(e) => setInvoiceFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={invoiceFilters.status || 'all'}
                  onValueChange={(value) => setInvoiceFilters(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="partially_paid">Partial</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={invoiceFilters.orderType || 'all'}
                  onValueChange={(value) => setInvoiceFilters(prev => ({ ...prev, orderType: value as any }))}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="recon">Recon</SelectItem>
                    <SelectItem value="carwash">Car Wash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingInvoices ? (
                <div className="py-12 text-center text-muted-foreground">
                  Loading invoices...
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No invoices found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center font-bold">Invoice</TableHead>
                      <TableHead className="text-center font-bold">Date Range</TableHead>
                      <TableHead className="text-center font-bold">Issue Date</TableHead>
                      <TableHead className="text-center font-bold">Due Date</TableHead>
                      <TableHead className="text-center font-bold">Amount</TableHead>
                      <TableHead className="text-center font-bold">Paid</TableHead>
                      <TableHead className="text-center font-bold">Due</TableHead>
                      <TableHead className="text-center font-bold">Status</TableHead>
                      <TableHead className="text-center font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      // Get date range from invoice metadata (saved during invoice creation)
                      let dateRangeText = 'N/A';
                      let vehicleCount = 1; // Default to 1 vehicle per invoice

                      const formatShort = (date: Date) => format(date, 'MMM dd');

                      // First, try to use date range from metadata (most accurate)
                      if (invoice.metadata?.filter_date_range) {
                        const { start, end } = invoice.metadata.filter_date_range;
                        if (start && end) {
                          const startDate = parseISO(start);
                          const endDate = parseISO(end);
                          if (startDate.getTime() === endDate.getTime()) {
                            dateRangeText = formatShort(startDate);
                          } else {
                            dateRangeText = `${formatShort(startDate)} - ${formatShort(endDate)}`;
                          }
                        }
                      } else if (invoice.issueDate) {
                        // Fallback: use invoice issue date
                        dateRangeText = formatShort(parseISO(invoice.issueDate));
                      }

                      // Get vehicle count from metadata if available
                      if (invoice.metadata?.vehicle_count) {
                        vehicleCount = invoice.metadata.vehicle_count;
                      }

                      return (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-gray-50/50"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <TableCell className="font-mono text-sm font-medium text-center">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">{dateRangeText}</span>
                              <span className="text-xs text-muted-foreground">
                                {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-center">{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell className="text-sm text-center">{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="text-center font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-center text-emerald-600">
                            {formatCurrency(invoice.amountPaid)}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {formatCurrency(invoice.amountDue)}
                          </TableCell>
                          <TableCell className="text-center">{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                  setShowPaymentDialog(true);
                                }}
                                disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                                title="Add Payment"
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                  setShowDetailsDialog(true);
                                }}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteInvoice(invoice);
                                }}
                                disabled={invoice.status === 'paid'}
                                title="Delete Invoice"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CREATE INVOICE TAB */}
        <TabsContent value="create" className="space-y-4">
          {/* Filters Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Filter Vehicles
              </CardTitle>
              <CardDescription>Use filters to find the vehicles you want to invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* First Row: Department, Status, Date Range, Search */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="dept-filter-inline" className="text-xs font-medium">Department</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger id="dept-filter-inline" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="recon">Recon</SelectItem>
                      <SelectItem value="carwash">Car Wash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status-filter-inline" className="text-xs font-medium">Status</Label>
                  <Select value={orderStatus} onValueChange={setOrderStatus}>
                    <SelectTrigger id="status-filter-inline" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Status ({statusCounts.all})
                      </SelectItem>
                      <SelectItem value="completed">
                        Completed ({statusCounts.completed || 0})
                      </SelectItem>
                      <SelectItem value="in_progress">
                        In Progress ({statusCounts.in_progress || 0})
                      </SelectItem>
                      <SelectItem value="pending">
                        Pending ({statusCounts.pending || 0})
                      </SelectItem>
                      <SelectItem value="cancelled">
                        Cancelled ({statusCounts.cancelled || 0})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="daterange-filter-inline" className="text-xs font-medium">Date Range</Label>
                  <Select value={dateRange} onValueChange={handleDateRangeChange}>
                    <SelectTrigger id="daterange-filter-inline" className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="this_week">This Week</SelectItem>
                      <SelectItem value="last_week">Last Week</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="search-filter-inline" className="text-xs font-medium">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-filter-inline"
                      placeholder="VIN, stock, customer..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-10 pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Second Row: Custom Date Range (only shown when custom is selected) */}
              {dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-1.5">
                    <Label htmlFor="start-date-filter-inline" className="text-xs font-medium">From Date</Label>
                    <Input
                      id="start-date-filter-inline"
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setDateRange('custom');
                      }}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end-date-filter-inline" className="text-xs font-medium">To Date</Label>
                    <Input
                      id="end-date-filter-inline"
                      type="date"
                      value={endDate}
                      onChange={(e) => {
                        setEndDate(e.target.value);
                        setDateRange('custom');
                      }}
                      className="h-10"
                    />
                  </div>
                </div>
              )}

              {/* Date Range Display */}
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    Showing orders from <span className="font-medium text-foreground">{format(parseISO(startDate), 'MMM dd, yyyy')}</span> to <span className="font-medium text-foreground">{format(parseISO(endDate), 'MMM dd, yyyy')}</span>
                  </span>
                </div>
              </div>

              {/* Service Filters */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Include Only Service</Label>
                  <Select value={selectedService} onValueChange={setSelectedService} disabled={loadingServices}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingServices ? "Loading services..." : "All services"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        All Services ({filteredVehicles.length})
                      </SelectItem>
                      {availableServices.length === 0 && !loadingServices && (
                        <SelectItem value="none" disabled>
                          No services found for this dealer
                        </SelectItem>
                      )}
                      {availableServices.map((service) => {
                        const count = serviceCounts[service.id] || 0;
                        return (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} ({count})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Exclude Services</Label>
                  <div className="flex flex-wrap gap-2 min-h-[40px] border rounded-md p-2">
                    {excludedServices.size > 0 ? (
                      Array.from(excludedServices).map((serviceId) => {
                        const service = availableServices.find(s => s.id === serviceId);
                        const count = serviceCounts[serviceId] || 0;
                        return (
                          <Badge key={serviceId} variant="secondary" className="flex items-center gap-1">
                            {service?.name || serviceId} ({count})
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => toggleExcludeService(serviceId)}
                            />
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-sm text-muted-foreground">No services excluded</span>
                    )}
                  </div>
                  <Select value="" onValueChange={toggleExcludeService} disabled={loadingServices || availableServices.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={
                        loadingServices ? "Loading..." :
                        availableServices.length === 0 ? "No services available" :
                        "Add service to exclude..."
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {availableServices
                        .filter(s => !excludedServices.has(s.id))
                        .map((service) => {
                          const count = serviceCounts[service.id] || 0;
                          return (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} ({count})
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicles Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Orders</CardTitle>
                  <CardDescription>
                    {selectedVehicleIds.size} of {filteredVehicles.length} selected • {totalOrdersInPeriod} total orders in period
                    {excludedOrdersCount > 0 && (
                      <span className="text-amber-600"> ({excludedOrdersCount} orders with excluded services)</span>
                    )}
                  </CardDescription>
                </div>
                {filteredVehicles.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedVehicleIds.size === filteredVehicles.length ? 'Deselect All' : 'Select All'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingVehicles ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">Loading orders...</div>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Car className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No orders found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={selectedVehicleIds.size === filteredVehicles.length && filteredVehicles.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="text-center font-bold">Order Number</TableHead>
                        <TableHead className="text-center font-bold">
                          <button
                            onClick={handleSortByDate}
                            className="flex items-center justify-center gap-1 w-full hover:text-primary transition-colors"
                          >
                            Date
                            {sortField === 'date' && (
                              sortDirection === 'asc' ? (
                                <ArrowUp className="h-4 w-4" />
                              ) : (
                                <ArrowDown className="h-4 w-4" />
                              )
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="text-center font-bold">
                          {orderType === 'service' ? 'PO / RO / Tag' : orderType === 'carwash' ? 'Stock / Tag' : 'Stock'}
                        </TableHead>
                        <TableHead className="text-center font-bold">Vehicle</TableHead>
                        <TableHead className="text-center font-bold">VIN</TableHead>
                        <TableHead className="text-center font-bold">Services</TableHead>
                        <TableHead className="text-center font-bold">Dept</TableHead>
                        <TableHead className="text-center font-bold">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVehicles.map((vehicle) => {
                        // Use order_number (internal system code like SA-1234, CW-1331)
                        const orderNumber = vehicle.order_number || 'N/A';
                        const orderPath = `/${vehicle.order_type}`;

                        return (
                          <TableRow
                            key={vehicle.id}
                            className={selectedVehicleIds.has(vehicle.id) ? 'bg-indigo-50' : ''}
                          >
                            <TableCell className="text-center">
                              <Checkbox
                                checked={selectedVehicleIds.has(vehicle.id)}
                                onCheckedChange={() => handleToggleVehicle(vehicle.id)}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderId(vehicle.id);
                                  setSelectedOrderType(vehicle.order_type as any);
                                  setShowOrderModal(true);
                                }}
                                className="font-medium text-gray-600 hover:text-gray-700 hover:underline flex flex-col items-center mx-auto"
                              >
                                <span className="text-sm">{orderNumber}</span>
                                <span className="text-xs text-muted-foreground">
                                  {vehicle.assigned_group_id ? 'Assigned' : 'Unassigned'}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              {formatDate(vehicle.completed_at || vehicle.created_at)}
                            </TableCell>
                            <TableCell className="font-medium text-sm text-center">
                              {orderType === 'service' ? (
                                <div className="flex flex-col gap-0.5">
                                  {vehicle.po && <span className="text-xs text-muted-foreground">PO: {vehicle.po}</span>}
                                  {vehicle.ro && <span className="text-xs text-muted-foreground">RO: {vehicle.ro}</span>}
                                  {vehicle.tag && <span className="text-xs font-medium">Tag: {vehicle.tag}</span>}
                                  {!vehicle.po && !vehicle.ro && !vehicle.tag && 'N/A'}
                                </div>
                              ) : orderType === 'carwash' ? (
                                <div className="text-xs font-medium">
                                  {vehicle.stock_number || vehicle.tag || 'N/A'}
                                </div>
                              ) : (
                                vehicle.stock_number || 'N/A'
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-center">
                              {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                            </TableCell>
                            <TableCell className="font-mono text-sm font-semibold text-center">
                              {vehicle.vehicle_vin || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate text-center">
                              {getServiceNames(vehicle.services)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs capitalize">
                                {vehicle.order_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {formatCurrency(vehicle.total_amount || 0)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          {selectedVehicleIds.size > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="issueDate" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Issue Date *
                      </Label>
                      <Input
                        id="issueDate"
                        type="date"
                        value={format(issueDate, 'yyyy-MM-dd')}
                        onChange={(e) => setIssueDate(parseISO(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate" className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due Date *
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={format(dueDate, 'yyyy-MM-dd')}
                        onChange={(e) => setDueDate(parseISO(e.target.value))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="taxRate" className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Tax Rate (%)
                      </Label>
                      <Input
                        id="taxRate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={taxRate}
                        onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-indigo-50 p-6 rounded-lg">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Selected Vehicles</div>
                        <div className="text-3xl font-bold">{selectedVehicleIds.size}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Invoice Total</div>
                        <div className="text-3xl font-bold text-gray-600">
                          {formatCurrency(totalAmount)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-indigo-200 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax ({taxRate}%):</span>
                        <span className="font-medium">{formatCurrency(taxAmount)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-amber-600">
                          <span>Discount:</span>
                          <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setSelectedVehicleIds(new Set());
                        setActiveTab('invoices');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" size="lg">
                      <Receipt className="h-4 w-4 mr-2" />
                      Create Invoice ({selectedVehicleIds.size} vehicles)
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* VEHICLE SEARCH TAB */}
        <TabsContent value="search" className="space-y-4">
          <VehicleInvoiceSearch dealerId={dealerId} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showQuickCreateDialog && (
        <CreateInvoiceDialog
          open={showQuickCreateDialog}
          onOpenChange={setShowQuickCreateDialog}
          dealerId={dealerId}
        />
      )}

      {selectedInvoice && showDetailsDialog && (
        <InvoiceDetailsDialog
          open={showDetailsDialog}
          onOpenChange={setShowDetailsDialog}
          invoiceId={selectedInvoice.id}
        />
      )}

      {selectedInvoice && showPaymentDialog && (
        <RecordPaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          invoice={selectedInvoice}
        />
      )}

      {selectedInvoice && showEmailDialog && (
        <SendInvoiceEmailDialog
          open={showEmailDialog}
          onOpenChange={setShowEmailDialog}
          invoiceId={selectedInvoice.id}
          dealershipId={selectedInvoice.dealerId}
        />
      )}

      {/* Order Detail Modal */}
      {showOrderModal && selectedOrderData && (
        <UnifiedOrderDetailModal
          orderType={selectedOrderType}
          order={selectedOrderData}
          open={showOrderModal}
          onClose={() => {
            setShowOrderModal(false);
            setSelectedOrderId(null);
          }}
          isLoadingData={loadingOrderData}
        />
      )}

      {/* Invoice Preview Modal */}
      <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Invoice Preview</DialogTitle>
              <Button
                onClick={handlePrintInvoice}
                variant="default"
                size="sm"
                className="ml-auto"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save as PDF
              </Button>
            </div>
          </DialogHeader>
          <div className="overflow-auto max-h-[calc(95vh-80px)]">
            <div
              dangerouslySetInnerHTML={{ __html: invoiceHtml }}
              className="bg-white"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('invoices.delete_title')}
        description={t('invoices.delete_description', { invoiceNumber: invoiceToDelete?.invoiceNumber })}
        confirmText={t('common.action_buttons.delete')}
        cancelText={t('common.action_buttons.cancel')}
        onConfirm={confirmDeleteInvoice}
        variant="destructive"
      />
    </div>
  );
};
