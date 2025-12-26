// =====================================================
// INVOICES REPORT - Complete Invoice Management
// Created: 2024-10-16
// Description: Full invoice management interface within Reports
// =====================================================

import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { InvoiceCommentsTooltip } from '@/components/ui/invoice-comments-tooltip';
import { Label } from '@/components/ui/label';
import { NotesTooltip } from '@/components/ui/notes-tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { QUERY_LIMITS } from '@/constants/queryLimits';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useDateCalculations } from '@/hooks/useDateCalculations';
import { useDeleteInvoice, useInvoices, useInvoiceSummary } from '@/hooks/useInvoices';
import type { ReportsFilters } from '@/hooks/useReportsData';
import { supabase } from '@/integrations/supabase/client';
import type { Invoice, InvoiceFilters, InvoiceStatus } from '@/types/invoices';
import type { OrderServiceItem } from '@/types/reports';
import type { UnifiedOrderData } from '@/types/unifiedOrder';
import { DepartmentMultiSelect } from '@/components/reports/invoices/DepartmentMultiSelect';
import { invalidateInvoiceQueries } from '@/utils/queryInvalidation';
import { toEndOfDay } from '@/utils/reportDateUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Filter,
  Mail,
  MessageSquare,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  StickyNote,
  Trash2,
  X
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreateInvoiceDialog } from '../invoices/CreateInvoiceDialog';
import { InvoiceDetailsDialog } from '../invoices/InvoiceDetailsDialog';
import { RecordPaymentDialog } from '../invoices/RecordPaymentDialog';
import { VehicleInvoiceSearch } from '../invoices/VehicleInvoiceSearch';
import { InvoiceGroupAccordion } from '../invoices/InvoiceGroupAccordion';
import { useInvoiceGrouping, useAccordionDefaultValue } from '@/hooks/useInvoiceGrouping';
import { GroupByOption, InvoiceGroup } from '@/utils/invoiceGrouping';
import { TagsFilterSelect } from '../invoices/TagsFilterSelect';
import { BulkEmailInvoicesDialog } from '../invoices/email/BulkEmailInvoicesDialog';

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
  services: OrderServiceItem[] | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  due_date: string | null;
}

// =====================================================
// DUPLICATE DETECTION HELPERS
// =====================================================

/**
 * Normalizes services to a comparable string for duplicate detection
 * Only orders with SAME VIN/Stock/Tag AND SAME services are considered duplicates
 */
const normalizeServices = (services: OrderServiceItem[] | null): string => {
  if (!services || !Array.isArray(services) || services.length === 0) return 'NO_SERVICES';

  return services
    .map(s => {
      // Extract service identifier in priority order
      if (s && typeof s === 'object' && s.name) return s.name;
      if (s && typeof s === 'object' && s.id) return s.id;
      if (s && typeof s === 'object' && s.type) return s.type;
      if (typeof s === 'string') return s;
      return 'UNKNOWN';
    })
    .sort() // Sort to ensure ["Photos", "Wash"] === ["Wash", "Photos"]
    .join('|')
    .toUpperCase();
};

const detectDuplicates = (orders: VehicleForInvoice[]) => {
  const vinMap = new Map<string, VehicleForInvoice[]>();
  const stockMap = new Map<string, VehicleForInvoice[]>();
  const tagMap = new Map<string, VehicleForInvoice[]>();

  orders.forEach(order => {
    const serviceKey = normalizeServices(order.services);

    // Track VIN + Services duplicates (compound key)
    if (order.vehicle_vin && order.vehicle_vin.trim() !== '') {
      const key = `${order.vehicle_vin.toUpperCase().trim()}_${serviceKey}`;
      const existing = vinMap.get(key) || [];
      vinMap.set(key, [...existing, order]);
    }

    // Track Stock Number + Services duplicates (compound key)
    if (order.stock_number && order.stock_number.trim() !== '') {
      const key = `${order.stock_number.toUpperCase().trim()}_${serviceKey}`;
      const existing = stockMap.get(key) || [];
      stockMap.set(key, [...existing, order]);
    }

    // Track Tag# + Services duplicates (compound key - Car Wash specific)
    if (order.tag && order.tag.trim() !== '') {
      const key = `${order.tag.toUpperCase().trim()}_${serviceKey}`;
      const existing = tagMap.get(key) || [];
      tagMap.set(key, [...existing, order]);
    }
  });

  return { vinMap, stockMap, tagMap };
};

const getDuplicateInfo = (
  order: VehicleForInvoice,
  vinMap: Map<string, VehicleForInvoice[]>,
  stockMap: Map<string, VehicleForInvoice[]>,
  tagMap: Map<string, VehicleForInvoice[]>
) => {
  const serviceKey = normalizeServices(order.services);

  // Build compound keys: VIN/Stock/Tag + Services
  const vinKey = order.vehicle_vin ? `${order.vehicle_vin.toUpperCase().trim()}_${serviceKey}` : '';
  const stockKey = order.stock_number ? `${order.stock_number.toUpperCase().trim()}_${serviceKey}` : '';
  const tagKey = order.tag ? `${order.tag.toUpperCase().trim()}_${serviceKey}` : '';

  const vinDuplicates = vinKey ? vinMap.get(vinKey) || [] : [];
  const stockDuplicates = stockKey ? stockMap.get(stockKey) || [] : [];
  const tagDuplicates = tagKey ? tagMap.get(tagKey) || [] : [];

  const hasVinDuplicate = vinDuplicates.length > 1;
  const hasStockDuplicate = stockDuplicates.length > 1;
  const hasTagDuplicate = tagDuplicates.length > 1;

  const isDuplicate = hasVinDuplicate || hasStockDuplicate || hasTagDuplicate;

  return {
    isDuplicate,
    hasVinDuplicate,
    hasStockDuplicate,
    hasTagDuplicate,
    vinCount: vinDuplicates.length,
    stockCount: stockDuplicates.length,
    tagCount: tagDuplicates.length,
    duplicateOrders: [...vinDuplicates, ...stockDuplicates, ...tagDuplicates]
      .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
      .filter(v => v.id !== order.id)
  };
};

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
  defaultDueDate.setDate(today.getDate() + 15); // ✅ Changed from 30 days to 15 days (2 weeks)

  const [activeTab, setActiveTab] = useState<'invoices' | 'create'>('invoices');

  // Invoice list filters - Independent from global filters (only respects dealerId)
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({
    status: 'all',
    orderType: 'all', // Independent from global filters
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
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
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

  // Reset all filters to default values
  const handleResetFilters = () => {
    const { startDate: start, endDate: end } = calculateDateRange('this_week');
    setOrderType('all');
    setOrderStatus('completed');
    setDateRange('this_week');
    setStartDate(start);
    setEndDate(end);
    setSearchTerm('');
    setSelectedService('all');
    setExcludedServices(new Set());
  };

  // Invoice list date range state (independent from global filters)
  const [invoiceDateRange, setInvoiceDateRange] = useState<'all' | 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'>('all');
  const [invoiceStartDate, setInvoiceStartDate] = useState<string>('');
  const [invoiceEndDate, setInvoiceEndDate] = useState<string>('');

  const handleInvoiceDateRangeChange = (value: typeof invoiceDateRange) => {
    setInvoiceDateRange(value);

    if (value === 'all') {
      setInvoiceFilters(prev => ({
        ...prev,
        startDate: undefined,
        endDate: undefined
      }));
    } else if (value !== 'custom') {
      const { startDate: start, endDate: end } = calculateDateRange(value);
      const startDateObj = parseISO(start);
      const endDateObj = parseISO(end);

      setInvoiceFilters(prev => ({
        ...prev,
        startDate: startDateObj,
        endDate: endDateObj
      }));
    }
  };

  // Update filters when custom dates change
  useEffect(() => {
    if (invoiceDateRange === 'custom' && invoiceStartDate && invoiceEndDate) {
      setInvoiceFilters(prev => ({
        ...prev,
        startDate: parseISO(invoiceStartDate),
        endDate: parseISO(invoiceEndDate)
      }));
    }
  }, [invoiceStartDate, invoiceEndDate, invoiceDateRange]);

  // Reset invoice list filters to default values
  const handleResetInvoiceFilters = () => {
    setInvoiceDateRange('all');
    setInvoiceStartDate('');
    setInvoiceEndDate('');
    setInvoiceFilters({
      status: 'all',
      orderType: 'all',
      startDate: undefined,
      endDate: undefined,
      dealerId: dealerId || 'all',
      searchTerm: '',
      tags: []
    });
    setGroupBy('department');
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

  // Bulk selection state for email
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false);
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

  // Invoice grouping
  const {
    groupBy,
    setGroupBy,
    groups,
    isGroupCollapsed,
    toggleGroup,
  } = useInvoiceGrouping(invoices);

  const accordionDefaultValue = useAccordionDefaultValue(groups, new Set(
    groups.filter(g => isGroupCollapsed(g.key)).map(g => g.key)
  ));

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
    queryKey: ['total-orders-in-period', dealerId, selectedDepartments, startDate, endDate, orderStatus],
    queryFn: async (): Promise<{ total: number; excluded: number; available: number; invoiced: number }> => {
      if (!dealerId) return { total: 0, excluded: 0, available: 0, invoiced: 0 };

      // Query all orders in the period with services
      let query = supabase
        .from('orders')
        .select('id, order_type, created_at, completed_at, due_date, status, services')
        .eq('dealer_id', dealerId)
        .limit(QUERY_LIMITS.EXTENDED) // 50000 - handles large dealers
        .order('created_at', { ascending: false }); // Most recent orders first

      // Apply department filter
      if (selectedDepartments.length > 0) {
        query = query.in('order_type', selectedDepartments);
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
      let endDateTime = parseISO(endDate);
      endDateTime = toEndOfDay(endDateTime);

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

      // Get existing invoice items (only from active invoices in this dealership)
      // First, get all invoice IDs for this dealer with active status
      const { data: activeInvoices, error: invoiceError } = await supabase
        .from('invoices')
        .select('id')
        .eq('dealer_id', dealerId)
        .in('status', ['pending', 'paid', 'partially_paid', 'overdue']);

      if (invoiceError) throw invoiceError;

      const invoiceIds = activeInvoices?.map(inv => inv.id) || [];

      console.log('🔍 [TOTAL-ORDERS DEBUG 1] Active invoices:', {
        dealerId,
        count: activeInvoices?.length,
        sampleIds: invoiceIds.slice(0, 2)
      });

      // Then, get invoice items for those invoices
      // ⚠️ CRITICAL: Fetch most recent items first to handle large datasets
      const { data: existingInvoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('service_reference')
        .in('invoice_id', invoiceIds)
        .not('service_reference', 'is', null)
        .order('created_at', { ascending: false }) // ✅ FIX: Fetch newest items first
        .limit(QUERY_LIMITS.EXTENDED); // 50000 - handles large dealers

      if (itemsError) throw itemsError;

      console.log('🔍 [TOTAL-ORDERS DEBUG 2] Invoice items:', {
        count: existingInvoiceItems?.length,
        samples: existingInvoiceItems?.slice(0, 3)
      });

      const invoicedOrderIds = new Set(
        existingInvoiceItems
          ?.map(item => item.service_reference)
          .filter(Boolean) || []
      );

      console.log('🔍 [TOTAL-ORDERS DEBUG 3] Set created:', {
        setSize: invoicedOrderIds.size
      });

      // ⚠️ CRITICAL DEBUG: Compare order IDs with invoiced IDs to find mismatch
      console.log('🔍 [TOTAL-ORDERS DEBUG 3.5] ID Comparison:', {
        sampleOrderIds: filteredByDate.slice(0, 3).map(o => ({
          id: o.id,
          type: typeof o.id,
          orderNumber: o.order_number
        })),
        sampleInvoicedIds: Array.from(invoicedOrderIds).slice(0, 3),
        firstOrderInSet: invoicedOrderIds.has(filteredByDate[0]?.id),
        setHasString: invoicedOrderIds.has(filteredByDate[0]?.id?.toString())
      });

      const availableCount = filteredByDate.filter(order => !invoicedOrderIds.has(order.id)).length;
      const invoicedCount = filteredByDate.filter(order => invoicedOrderIds.has(order.id)).length;

      console.log('🔍 [TOTAL-ORDERS DEBUG 4] Counts:', {
        total: filteredByDate.length,
        available: availableCount,
        invoiced: invoicedCount
      });

      return {
        total: filteredByDate.length,
        excluded: 0, // Will be calculated separately with excluded services
        available: availableCount,
        invoiced: invoicedCount
      };
    },
    enabled: !!dealerId && activeTab === 'create',
    staleTime: 0, // ✅ Always fetch fresh data after invoice creation
    gcTime: 0, // ✅ Don't keep in cache when query becomes inactive
  });

  // Fetch ALL vehicles for counts (direct query, no RPC)
  const { data: allVehiclesForCounts = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['all-vehicles-for-counts', dealerId, selectedDepartments, startDate, endDate],
    queryFn: async (): Promise<VehicleForInvoice[]> => {
      if (!dealerId) return [];

      // Direct query instead of missing RPC function
      let query = supabase
        .from('orders')
        .select('id, order_number, custom_order_number, order_type, customer_name, stock_number, po, ro, tag, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, total_amount, services, status, created_at, completed_at, due_date, assigned_group_id')
        .eq('dealer_id', dealerId)
        .order('created_at', { ascending: false })
        .limit(QUERY_LIMITS.EXTENDED); // ✅ FIX: Increased from 5K to 50K for historical date range support

      // Apply department filter
      if (selectedDepartments.length > 0) {
        query = query.in('order_type', selectedDepartments);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      if (!orders) return [];

      // Filter by appropriate date field based on order_type (client-side)
      // Sales/Service: use due_date, Recon/CarWash: use completed_at
      const startDateTime = parseISO(startDate);
      let endDateTime = parseISO(endDate);
      endDateTime = toEndOfDay(endDateTime);

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

      // Get existing invoice items to filter out already invoiced orders (only from active invoices in this dealership)
      // First, get all invoice IDs for this dealer with active status
      const { data: activeInvoices2, error: invoiceError2 } = await supabase
        .from('invoices')
        .select('id')
        .eq('dealer_id', dealerId)
        .in('status', ['pending', 'paid', 'partially_paid', 'overdue']);

      if (invoiceError2) throw invoiceError2;

      const invoiceIds2 = activeInvoices2?.map(inv => inv.id) || [];

      console.log('🔍 [INVOICE DEBUG 1] Active invoices for dealer:', {
        dealerId,
        invoiceCount: activeInvoices2?.length,
        sampleIds: invoiceIds2.slice(0, 3)
      });

      // Then, get invoice items for those invoices
      // ⚠️ CRITICAL: Fetch most recent items first to handle large datasets
      const { data: existingInvoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('service_reference')
        .in('invoice_id', invoiceIds2)
        .not('service_reference', 'is', null)
        .order('created_at', { ascending: false }) // ✅ FIX: Fetch newest items first
        .limit(QUERY_LIMITS.EXTENDED); // 50000 - handles large dealers

      if (itemsError) throw itemsError;

      console.log('🔍 [INVOICE DEBUG 2] Invoice items fetched:', {
        itemsCount: existingInvoiceItems?.length,
        sampleItems: existingInvoiceItems?.slice(0, 5)
      });

      const invoicedOrderIds = new Set(
        existingInvoiceItems
          ?.map(item => item.service_reference)
          .filter(Boolean) || []
      );

      console.log('🔍 [INVOICE DEBUG 3] Invoiced Order IDs Set:', {
        setSize: invoicedOrderIds.size,
        sampleIds: Array.from(invoicedOrderIds).slice(0, 5),
        includes_SA267_id: invoicedOrderIds.has('c1918d08-3d31-4693-83d0-7414e601e6a8'),
        rawItemsSample: existingInvoiceItems?.slice(0, 3),
        afterMapSample: existingInvoiceItems?.slice(0, 3).map(item => ({
          raw: item,
          serviceRef: item.service_reference,
          type: typeof item.service_reference
        }))
      });

      // ⚠️ CRITICAL DEBUG: Compare order IDs with invoiced IDs to find mismatch
      console.log('🔍 [INVOICE DEBUG 3.5] ID Comparison:', {
        sampleOrderIds: filteredByDate.slice(0, 3).map(o => ({
          id: o.id,
          type: typeof o.id,
          orderNumber: o.order_number
        })),
        sampleInvoicedIds: Array.from(invoicedOrderIds).slice(0, 3),
        firstOrderInSet: invoicedOrderIds.has(filteredByDate[0]?.id),
        setHasString: invoicedOrderIds.has(filteredByDate[0]?.id?.toString())
      });

      const beforeFilterCount = filteredByDate.length;
      const result = filteredByDate.filter(order => !invoicedOrderIds.has(order.id));

      console.log('🔍 [INVOICE DEBUG 4] Filter results:', {
        beforeFilter: beforeFilterCount,
        afterFilter: result.length,
        filteredOut: beforeFilterCount - result.length,
        sampleOrderId: filteredByDate[0]?.id,
        sampleOrderIdType: typeof filteredByDate[0]?.id,
        sampleInvoicedIdType: typeof Array.from(invoicedOrderIds)[0],
        firstOrderIsInSet: invoicedOrderIds.has(filteredByDate[0]?.id)
      });

      return result as VehicleForInvoice[];
    },
    enabled: !!dealerId && activeTab === 'create',
    staleTime: 0, // ✅ Always fetch fresh data after invoice creation
    gcTime: 0, // ✅ Don't keep in cache when query becomes inactive
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
        return vehicle.services.some((service: OrderServiceItem) => {
          const serviceId = typeof service === 'string' ? service : (service.id || service.type || service);
          return serviceId === selectedService;
        });
      });
    }

    if (excludedServices.size > 0) {
      filtered = filtered.filter(vehicle => {
        if (!vehicle.services || !Array.isArray(vehicle.services)) return true;
        const hasExcludedService = vehicle.services.some((service: OrderServiceItem) => {
          const serviceId = typeof service === 'string' ? service : (service.id || service.type || service);
          return excludedServices.has(serviceId);
        });
        return !hasExcludedService;
      });
    }

    // Apply sorting - department first, then date
    if (sortField === 'date') {
      // Department priority for sorting (Sales first, then Service, Recon, Carwash)
      const DEPARTMENT_PRIORITY: Record<string, number> = {
        sales: 1,
        service: 2,
        recon: 3,
        carwash: 4,
      };

      // Get the appropriate date field based on order type
      const getDate = (vehicle: VehicleForInvoice) => {
        if (vehicle.order_type === 'sales' || vehicle.order_type === 'service') {
          return vehicle.due_date || vehicle.created_at;
        } else if (vehicle.order_type === 'recon' || vehicle.order_type === 'carwash') {
          return vehicle.completed_at || vehicle.created_at;
        }
        return vehicle.created_at;
      };

      // Sort by department priority first, then by date within each department
      filtered.sort((a, b) => {
        // First sort by department priority
        const deptA = a.order_type || 'unknown';
        const deptB = b.order_type || 'unknown';

        const priorityA = DEPARTMENT_PRIORITY[deptA] || 99;
        const priorityB = DEPARTMENT_PRIORITY[deptB] || 99;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Within same department, sort by date according to sortDirection
        const dateA = new Date(getDate(a)).getTime();
        const dateB = new Date(getDate(b)).getTime();

        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return filtered;
  }, [availableVehicles, searchTerm, selectedService, excludedServices, sortField, sortDirection]);

  // Detect duplicates across VIN, Stock Number, and Tag#
  const { vinMap, stockMap, tagMap } = useMemo(
    () => detectDuplicates(filteredVehicles),
    [filteredVehicles]
  );

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

      vehicle.services.forEach((service: OrderServiceItem) => {
        const serviceId = typeof service === 'string' ? service : (service.id || service.type || service);
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
      return vehicle.services.some((service: OrderServiceItem) => {
        const serviceId = typeof service === 'string' ? service : (service.id || service.type || service);
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
            department: selectedDepartments.length === 0 ? 'all' : selectedDepartments.length === 1 ? selectedDepartments[0] : 'multiple',
            departments: selectedDepartments.length > 0 ? selectedDepartments : [...new Set(selectedVehicles.map(v => v.order_type))]
          }
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const items = selectedVehicles.map((vehicle, index) => {
        // Extract service names from vehicle.services using standardized logic
        const serviceNames = vehicle.services && Array.isArray(vehicle.services)
          ? vehicle.services.map((service: OrderServiceItem) => getServiceNames([service])).join(', ')
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
      invalidateInvoiceQueries(queryClient);

      // Reset and switch to invoices tab
      setSelectedVehicleIds(new Set());
      setSearchTerm('');
      setActiveTab('invoices');
    } catch (error: unknown) {
      console.error('Failed to create invoice:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({ variant: 'destructive', description: `Failed to create invoice: ${errorMessage}` });
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

  const getServiceNames = (services: OrderServiceItem[] | null): string => {
    if (!services || !Array.isArray(services) || services.length === 0) return 'N/A';

    return services.map((s: OrderServiceItem) => {
      // Priority 1: Direct name from service object (NEW standard format)
      if (s && typeof s === 'object' && s.name) {
        return s.name;
      }

      // Priority 2: Legacy - lookup by id field
      if (s && typeof s === 'object' && s.id) {
        const serviceData = availableServices?.find(ds => ds.id === s.id);
        return serviceData?.name || s.id;
      }

      // Priority 3: Legacy carwash - lookup by type field
      if (s && typeof s === 'object' && s.type) {
        const serviceData = availableServices?.find(ds => ds.id === s.type);
        return serviceData?.name || s.type;
      }

      // Priority 4: Legacy string format
      if (typeof s === 'string') {
        const serviceData = availableServices?.find(ds => ds.id === s);
        return serviceData?.name || s;
      }

      return 'Unknown';
    }).filter(Boolean).join(', ');
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

  // Bulk selection handlers
  const handleSelectAllInvoices = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(invoices.map(inv => inv.id));
      setSelectedInvoiceIds(allIds);
    } else {
      setSelectedInvoiceIds(new Set());
    }
  };

  const handleSelectInvoice = (invoiceId: string, checked: boolean) => {
    const newSet = new Set(selectedInvoiceIds);
    if (checked) {
      newSet.add(invoiceId);
    } else {
      newSet.delete(invoiceId);
    }
    setSelectedInvoiceIds(newSet);
  };

  // Handle selecting all invoices in a specific group
  const handleSelectAllInGroup = (group: InvoiceGroup, checked: boolean) => {
    const updatedIds = new Set(selectedInvoiceIds);

    if (checked) {
      group.invoices.forEach(invoice => {
        updatedIds.add(invoice.id);
      });
    } else {
      group.invoices.forEach(invoice => {
        updatedIds.delete(invoice.id);
      });
    }

    setSelectedInvoiceIds(updatedIds);
  };

  // Handle toggling a single invoice
  const handleToggleInvoice = (invoiceId: string) => {
    const updatedIds = new Set(selectedInvoiceIds);

    if (updatedIds.has(invoiceId)) {
      updatedIds.delete(invoiceId);
    } else {
      updatedIds.add(invoiceId);
    }

    setSelectedInvoiceIds(updatedIds);
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
          <p className="text-muted-foreground">{t('reports.invoices.messages.select_dealership')}</p>
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
        <Button onClick={() => setShowQuickCreateDialog(true)} className="hidden">
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
            {t('reports.invoices.tabs.invoices_list')}
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            {t('reports.invoices.tabs.create_invoice')}
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-2" />
            {t('reports.invoices.tabs.check_vehicle')}
          </TabsTrigger>
        </TabsList>

        {/* INVOICES LIST TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader className="border-b bg-gray-50/50">
              <CardTitle>{t('reports.invoices.title')}</CardTitle>
              <CardDescription>{t('reports.invoices.messages.view_manage')}</CardDescription>

              {/* Group By Selector */}
              <div className="pt-4 pb-2 border-b">
                <div className="flex items-center gap-3">
                  <Label className="text-sm font-medium whitespace-nowrap">
                    {t('reports.invoices.grouping.label')}:
                  </Label>
                  <Select
                    value={groupBy}
                    onValueChange={(value) => setGroupBy(value as GroupByOption)}
                  >
                    <SelectTrigger className="w-[200px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('reports.invoices.grouping.none')}</SelectItem>
                      <SelectItem value="status">{t('reports.invoices.grouping.status')}</SelectItem>
                      <SelectItem value="department">{t('reports.invoices.grouping.department')}</SelectItem>
                      <SelectItem value="week">{t('reports.invoices.grouping.week')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Filters - Independent from global filters */}
              <div className="space-y-3 mt-4">
                {/* First Row: Date Range, Search, Order Type, Status */}
                <div className="flex gap-3">
                  <div className="space-y-1.5 w-[180px]">
                    <Label className="text-xs font-medium">{t('reports.invoices.filters.date_range')}</Label>
                    <Select
                      value={invoiceDateRange}
                      onValueChange={handleInvoiceDateRangeChange}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('reports.invoices.filters.all_time')}</SelectItem>
                        <SelectItem value="today">{t('reports.invoices.filters.today')}</SelectItem>
                        <SelectItem value="this_week">{t('reports.invoices.filters.this_week')}</SelectItem>
                        <SelectItem value="last_week">{t('reports.invoices.filters.last_week')}</SelectItem>
                        <SelectItem value="this_month">{t('reports.invoices.filters.this_month')}</SelectItem>
                        <SelectItem value="last_month">{t('reports.invoices.filters.last_month')}</SelectItem>
                        <SelectItem value="custom">{t('reports.invoices.filters.custom_range')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="relative flex-1">
                    <Label className="text-xs font-medium">{t('reports.invoices.filters.search')}</Label>
                    <div className="relative mt-1.5">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t('reports.invoices.search_placeholder')}
                        value={invoiceFilters.searchTerm}
                        onChange={(e) => setInvoiceFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('reports.invoices.filters.type')}</Label>
                    <Select
                      value={invoiceFilters.orderType || 'all'}
                      onValueChange={(value) => setInvoiceFilters(prev => ({ ...prev, orderType: value as any }))}
                    >
                      <SelectTrigger className="w-[150px] h-10">
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('common.status_label')}</Label>
                    <Select
                      value={invoiceFilters.status || 'all'}
                      onValueChange={(value) => setInvoiceFilters(prev => ({ ...prev, status: value as any }))}
                    >
                      <SelectTrigger className="w-[150px] h-10">
                        <SelectValue placeholder={t('common.status_label')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('reports.invoices.all_status')}</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="partially_paid">Partial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 w-[150px]">
                    <Label className="text-xs font-medium">{t('reports.invoices.tags.label')}</Label>
                    <TagsFilterSelect
                      dealerId={typeof invoiceFilters.dealerId === 'string' ? parseInt(invoiceFilters.dealerId) : invoiceFilters.dealerId || 0}
                      selectedTags={invoiceFilters.tags || []}
                      onSelectedTagsChange={(tags) => setInvoiceFilters(prev => ({ ...prev, tags }))}
                    />
                  </div>
                </div>

                {/* Second Row: Custom Date Inputs (shown when custom is selected) */}
                {invoiceDateRange === 'custom' && (
                  <div className="flex gap-3 pt-2 border-t">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('reports.invoices.filters.from_date')}</Label>
                      <Input
                        type="date"
                        value={invoiceStartDate}
                        onChange={(e) => setInvoiceStartDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('reports.invoices.filters.to_date')}</Label>
                      <Input
                        type="date"
                        value={invoiceEndDate}
                        onChange={(e) => setInvoiceEndDate(e.target.value)}
                        className="h-10"
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 border-t flex justify-between">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowBulkEmailDialog(true)}
                    disabled={selectedInvoiceIds.size === 0}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Send Email ({selectedInvoiceIds.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetInvoiceFilters}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingInvoices ? (
                <div className="py-12 text-center text-muted-foreground">
                  {t('reports.invoices.messages.loading')}
                </div>
              ) : invoices.length === 0 ? (
                <div className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('reports.invoices.no_invoices')}</p>
                </div>
              ) : groupBy !== 'none' ? (
                <div className="p-4">
                  <InvoiceGroupAccordion
                    groups={groups}
                    defaultValue={accordionDefaultValue}
                    onValueChange={(openGroups) => {
                      // Update collapsed state based on what's NOT in openGroups
                      groups.forEach(group => {
                        const shouldBeCollapsed = !openGroups.includes(group.key);
                        const isCurrentlyCollapsed = isGroupCollapsed(group.key);
                        if (shouldBeCollapsed !== isCurrentlyCollapsed) {
                          toggleGroup(group.key);
                        }
                      });
                    }}
                    onSelectInvoice={setSelectedInvoice}
                    onShowDetails={(invoice) => {
                      setSelectedInvoice(invoice);
                      setShowDetailsDialog(true);
                    }}
                    onShowPayment={(invoice) => {
                      setSelectedInvoice(invoice);
                      setShowPaymentDialog(true);
                    }}
                    onDeleteInvoice={handleDeleteInvoice}
                    selectedInvoiceIds={selectedInvoiceIds}
                    onToggleInvoice={handleToggleInvoice}
                    onSelectAllInGroup={handleSelectAllInGroup}
                  />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={invoices.length > 0 && selectedInvoiceIds.size === invoices.length}
                          onCheckedChange={handleSelectAllInvoices}
                          aria-label="Select all invoices"
                        />
                      </TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.table.invoice')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.table.date_range')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.issue_date')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.due_date')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.amount')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.paid')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.due')}</TableHead>
                      <TableHead className="text-center font-bold">{t('common.status_label')}</TableHead>
                      <TableHead className="text-center font-bold">{t('reports.invoices.actions')}</TableHead>
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

                      // Determine row background color based on payment status
                      const getRowBackgroundClass = (status: InvoiceStatus) => {
                        switch(status) {
                          case 'paid':
                            return 'bg-green-50 hover:bg-green-100';
                          case 'partially_paid':
                            return 'bg-yellow-50 hover:bg-yellow-100';
                          case 'overdue':
                            return 'bg-red-50 hover:bg-red-100';
                          case 'cancelled':
                            return 'bg-gray-50 hover:bg-gray-100';
                          case 'pending':
                            return 'bg-blue-50 hover:bg-blue-100';
                          case 'draft':
                          default:
                            return 'hover:bg-gray-50';
                        }
                      };

                      return (
                        <TableRow
                          key={invoice.id}
                          className={`cursor-pointer ${getRowBackgroundClass(invoice.status)}`}
                        >
                          <TableCell
                            onClick={(e) => e.stopPropagation()}
                            className="w-12"
                          >
                            <Checkbox
                              checked={selectedInvoiceIds.has(invoice.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, checked as boolean)}
                              aria-label={`Select invoice ${invoice.invoiceNumber}`}
                            />
                          </TableCell>
                          <TableCell
                            className="text-center"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <div className="flex flex-col items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-medium">{invoice.invoiceNumber}</span>

                                {/* Notes Tooltip */}
                                {invoice.invoiceNotes && invoice.invoiceNotes.trim() !== '' && (
                                  <NotesTooltip
                                    noteContent={invoice.invoiceNotes}
                                    onViewClick={() => {
                                      setSelectedInvoice(invoice);
                                      setShowDetailsDialog(true);
                                    }}
                                  >
                                    <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-amber-50 px-1.5 py-0.5 rounded transition-colors">
                                      <StickyNote className="w-3.5 h-3.5 text-amber-500" />
                                    </span>
                                  </NotesTooltip>
                                )}

                                {/* Comments Tooltip */}
                                {invoice.commentsCount > 0 && (
                                  <InvoiceCommentsTooltip
                                    invoiceId={invoice.id}
                                    count={invoice.commentsCount}
                                    onViewAllClick={() => {
                                      setSelectedInvoice(invoice);
                                      setShowDetailsDialog(true);
                                    }}
                                  >
                                    <span className="inline-flex items-center gap-0.5 cursor-pointer hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors">
                                      <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                                      <span className="text-[10px] font-semibold text-blue-600 min-w-[14px] text-center">
                                        {invoice.commentsCount}
                                      </span>
                                    </span>
                                  </InvoiceCommentsTooltip>
                                )}
                              </div>

                              {/* Department badges */}
                              {invoice.metadata?.departments && invoice.metadata.departments.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap justify-center">
                                  {invoice.metadata.departments.map((dept: string) => {
                                    // Map department values to translation keys
                                    // Handle both formats: 'car_wash' and 'carwash'
                                    const normalizedDept = dept.toLowerCase().trim();
                                    let translatedDept = '';
                                    let colorClasses = '';

                                    switch(normalizedDept) {
                                      case 'sales':
                                        translatedDept = t('services.departments.sales_dept');
                                        colorClasses = 'bg-blue-100 text-blue-700 border-blue-200';
                                        break;
                                      case 'service':
                                        translatedDept = t('services.departments.service_dept');
                                        colorClasses = 'bg-green-100 text-green-700 border-green-200';
                                        break;
                                      case 'recon':
                                        translatedDept = t('services.departments.recon_dept');
                                        colorClasses = 'bg-orange-100 text-orange-700 border-orange-200';
                                        break;
                                      case 'car_wash':
                                      case 'carwash':
                                      case 'car wash':
                                        translatedDept = t('services.departments.carwash_dept');
                                        colorClasses = 'bg-cyan-100 text-cyan-700 border-cyan-200';
                                        break;
                                      default:
                                        // If no match, show the original value capitalized
                                        translatedDept = dept.charAt(0).toUpperCase() + dept.slice(1);
                                        colorClasses = 'bg-gray-100 text-gray-700 border-gray-200';
                                    }
                                    return (
                                      <Badge key={dept} variant="outline" className={`text-xs ${colorClasses}`}>
                                        {translatedDept}
                                      </Badge>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-center"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <div className="flex flex-col items-center">
                              <span className="text-sm font-medium">{dateRangeText}</span>
                              <span className="text-xs text-muted-foreground">
                                {vehicleCount} vehicle{vehicleCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell
                            className="text-sm text-center"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell
                            className="text-sm text-center"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell
                            className="text-center font-medium"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell
                            className="text-center text-emerald-600"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >
                            {formatCurrency(invoice.amountPaid)}
                          </TableCell>
                          <TableCell
                            className="text-center font-medium"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >
                            {formatCurrency(invoice.amountDue)}
                          </TableCell>
                          <TableCell
                            className="text-center"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowDetailsDialog(true);
                            }}
                          >{getStatusBadge(invoice.status)}</TableCell>
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
                                title={t('reports.add_payment')}
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
                                title={t('reports.view_details')}
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
                                title={t('reports.delete_invoice')}
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

          {/* Floating Action Bar */}
          {selectedInvoiceIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
              <Card className="shadow-lg border-2">
                <CardContent className="py-3 px-6">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium">
                      {selectedInvoiceIds.size} invoice{selectedInvoiceIds.size !== 1 ? 's' : ''} selected
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setShowBulkEmailDialog(true)}
                      className="gap-2"
                    >
                      <Mail className="h-4 w-4" />
                      Send Email
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedInvoiceIds(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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
                  <DepartmentMultiSelect
                    value={selectedDepartments}
                    onChange={setSelectedDepartments}
                    placeholder={t('reports.invoices.select_departments')}
                    className="h-10"
                  />
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
                      <SelectItem value="this_week">{t('reports.this_week')}</SelectItem>
                      <SelectItem value="last_week">{t('reports.last_week')}</SelectItem>
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
                      <SelectValue placeholder={loadingServices ? t('reports.loading_services') : "All services"} />
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
                        availableServices.length === 0 ? t('reports.no_services_available') :
                        t('reports.add_service_to_exclude')
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

              {/* Reset Filters Button */}
              <div className="pt-4 border-t flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reset Filters
                </Button>
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
                          {selectedDepartments.length === 1 && selectedDepartments[0] === 'service' ? 'PO / RO / Tag' :
                           selectedDepartments.length === 1 && selectedDepartments[0] === 'carwash' ? 'Stock / Tag' :
                           'Stock / Tag / PO'}
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

                        // Get duplicate info for this vehicle
                        const duplicateInfo = getDuplicateInfo(vehicle, vinMap, stockMap, tagMap);
                        const isSelected = selectedVehicleIds.has(vehicle.id);

                        return (
                          <TableRow
                            key={vehicle.id}
                            className={cn(
                              "cursor-pointer hover:bg-gray-50",
                              isSelected && "bg-indigo-50 border-l-2 border-l-indigo-500",
                              duplicateInfo.isDuplicate && !isSelected && "bg-amber-50/50 border-l-2 border-l-amber-400"
                            )}
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
                              {vehicle.order_type === 'service' ? (
                                <div className="flex flex-col gap-0.5">
                                  {vehicle.po && <span className="text-xs text-muted-foreground">PO: {vehicle.po}</span>}
                                  {vehicle.ro && <span className="text-xs text-muted-foreground">RO: {vehicle.ro}</span>}
                                  {vehicle.tag && <span className="text-xs font-medium">Tag: {vehicle.tag}</span>}
                                  {!vehicle.po && !vehicle.ro && !vehicle.tag && 'N/A'}
                                </div>
                              ) : vehicle.order_type === 'carwash' ? (
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
                              <div className="flex items-center justify-center gap-1.5">
                                <span>{vehicle.vehicle_vin || 'N/A'}</span>
                                {duplicateInfo.isDuplicate && (
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger className="cursor-help">
                                        <Badge variant="warning" className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 whitespace-nowrap">
                                          <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
                                          {duplicateInfo.hasVinDuplicate && `${duplicateInfo.vinCount}x VIN`}
                                          {!duplicateInfo.hasVinDuplicate && duplicateInfo.hasStockDuplicate && `${duplicateInfo.stockCount}x Stock`}
                                          {!duplicateInfo.hasVinDuplicate && !duplicateInfo.hasStockDuplicate && duplicateInfo.hasTagDuplicate && `${duplicateInfo.tagCount}x Tag`}
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-md">
                                        <p className="font-semibold mb-2">{t('reports.invoices.duplicate_order_warning')}</p>
                                        {duplicateInfo.hasVinDuplicate && (
                                          <p className="text-xs mb-1">• {t('reports.invoices.duplicate_vin_found', { count: duplicateInfo.vinCount })}</p>
                                        )}
                                        {duplicateInfo.hasStockDuplicate && (
                                          <p className="text-xs mb-1">• {t('reports.invoices.duplicate_stock_found', { count: duplicateInfo.stockCount })}</p>
                                        )}
                                        {duplicateInfo.hasTagDuplicate && (
                                          <p className="text-xs mb-1">• {t('reports.invoices.duplicate_tag_found', { count: duplicateInfo.tagCount })}</p>
                                        )}

                                        {duplicateInfo.duplicateOrders.length > 0 && (
                                          <div className="mt-3 pt-2 border-t border-gray-200">
                                            <p className="text-xs font-semibold mb-2">{t('reports.invoices.duplicate_orders_list')}</p>
                                            <div className="space-y-1.5">
                                              {duplicateInfo.duplicateOrders.map((dupOrder) => (
                                                <div key={dupOrder.id} className="text-xs bg-gray-50 p-1.5 rounded">
                                                  <div className="font-semibold">
                                                    Order #{dupOrder.order_number}
                                                    <span className="ml-1 text-[10px] font-normal text-gray-500">({dupOrder.order_type})</span>
                                                  </div>
                                                  <div className="text-[10px] text-gray-600 mt-0.5">
                                                    {t('reports.invoices.order_completed', {
                                                      date: formatDate(dupOrder.completed_at || dupOrder.created_at)
                                                    })}
                                                  </div>
                                                  {dupOrder.stock_number && (
                                                    <div className="text-[10px] text-gray-600">Stock: {dupOrder.stock_number}</div>
                                                  )}
                                                  {dupOrder.tag && (
                                                    <div className="text-[10px] text-gray-600">Tag: {dupOrder.tag}</div>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        <p className="text-xs text-muted-foreground mt-3 pt-2 border-t border-gray-200">
                                          {t('reports.invoices.duplicate_tooltip_hint')}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </div>
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

      {/* Bulk Email Invoices Dialog */}
      {showBulkEmailDialog && (
        <BulkEmailInvoicesDialog
          open={showBulkEmailDialog}
          onOpenChange={setShowBulkEmailDialog}
          invoices={invoices.filter(inv => selectedInvoiceIds.has(inv.id))}
          dealershipId={filters.dealerId!}
          onEmailSent={() => setSelectedInvoiceIds(new Set())}
        />
      )}
    </div>
  );
};
