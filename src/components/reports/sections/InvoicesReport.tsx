// =====================================================
// INVOICES REPORT - Complete Invoice Management
// Created: 2024-10-16
// Description: Full invoice management interface within Reports
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { UnifiedOrderDetailModal } from '@/components/orders/UnifiedOrderDetailModal';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoices, useInvoiceSummary } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import type { ReportsFilters } from '@/hooks/useReportsData';
import type { Invoice, InvoiceFilters, InvoiceStatus } from '@/types/invoices';
import type { UnifiedOrderData } from '@/types/unifiedOrder';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileText,
  Filter,
  Mail,
  Plus,
  Receipt,
  Search,
  X
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

interface InvoicesReportProps {
  filters: ReportsFilters;
}

interface VehicleForInvoice {
  id: string;
  order_number: string;
  custom_order_number: string | null;
  order_type: string;
  customer_name: string;
  assigned_to: string | null;
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

  const dealerId = filters.dealerId;

  const today = new Date();
  const defaultDueDate = new Date(today);
  defaultDueDate.setDate(today.getDate() + 30);

  const [activeTab, setActiveTab] = useState<'invoices' | 'create'>('invoices');

  // Invoice list filters
  const [invoiceFilters, setInvoiceFilters] = useState<InvoiceFilters>({
    status: 'all',
    orderType: filters.orderType,
    startDate: filters.startDate,
    endDate: filters.endDate,
    dealerId: dealerId || 'all',
    searchTerm: ''
  });

  // Create invoice filters
  const [orderType, setOrderType] = useState<string>('all');
  const [orderStatus, setOrderStatus] = useState<string>('completed');
  const [startDate, setStartDate] = useState<string>(
    format(new Date(today.getFullYear(), today.getMonth(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(format(today, 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [excludedServices, setExcludedServices] = useState<Set<string>>(new Set());

  // Selected vehicles for new invoice
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());

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

  // Fetch ALL vehicles for counts (without status filter)
  const { data: allVehiclesForCounts = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['all-vehicles-for-counts', dealerId, orderType, startDate, endDate],
    queryFn: async (): Promise<VehicleForInvoice[]> => {
      if (!dealerId) return [];

      let query = supabase
        .from('orders')
        .select('id, order_number, custom_order_number, order_type, customer_name, assigned_to, stock_number, po, ro, tag, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, total_amount, services, status, created_at, completed_at, updated_at')
        .eq('dealer_id', dealerId)
        .limit(500);

      if (orderType !== 'all') {
        query = query.eq('order_type', orderType);
      }

      if (startDate) {
        query = query.gte('updated_at', new Date(startDate).toISOString());
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('updated_at', endDateTime.toISOString());
      }

      query = query.order('updated_at', { ascending: false });

      const { data: orders, error: ordersError } = await query;
      if (ordersError) throw ordersError;
      if (!orders) return [];

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

      return orders.filter(order => !invoicedOrderIds.has(order.id)) as VehicleForInvoice[];
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

    return filtered;
  }, [availableVehicles, searchTerm, selectedService, excludedServices]);

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

  const serviceCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    filteredVehicles.forEach(vehicle => {
      if (!vehicle.services || !Array.isArray(vehicle.services)) return;

      vehicle.services.forEach((service: any) => {
        const serviceId = service.id || service.type || service;
        counts[serviceId] = (counts[serviceId] || 0) + 1;
      });
    });

    return counts;
  }, [filteredVehicles]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dealerId) {
      toast.error('Please select a dealership');
      return;
    }

    if (selectedVehicleIds.size === 0) {
      toast.error('Please select at least one vehicle');
      return;
    }

    if (dueDate < issueDate) {
      toast.error('Due date must be after issue date');
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
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      const items = selectedVehicles.map((vehicle, index) => ({
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
          customer_name: vehicle.customer_name,
          vehicle_vin: vehicle.vehicle_vin,
          stock_number: vehicle.stock_number,
          completed_at: vehicle.completed_at,
          services: vehicle.services,
        },
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success(`Invoice ${invoiceNumber} created with ${selectedVehicles.length} vehicles`);

      // Reset and switch to invoices tab
      setSelectedVehicleIds(new Set());
      setSearchTerm('');
      setActiveTab('invoices');
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      toast.error(`Failed to create invoice: ${error.message}`);
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
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getServiceNames = (services: any[] | null): string => {
    if (!services || !Array.isArray(services) || services.length === 0) return 'N/A';
    return services.map((s: any) => s.name || s.type || 'Unknown').join(', ');
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices List
          </TabsTrigger>
          <TabsTrigger value="create">
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
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
                      <TableHead>Invoice</TableHead>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Due</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const orderType = invoice.order?.orderType || 'sales';
                      const orderPath = `/${orderType}`;
                      // Use order_number (internal system code like SA-1234, CW-1331)
                      const orderNumber = invoice.order?.orderNumber || invoice.order?.order_number || 'N/A';

                      return (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-gray-50/50"
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetailsDialog(true);
                          }}
                        >
                          <TableCell className="font-mono text-sm font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (invoice.order?.id) {
                                  setSelectedOrderId(invoice.order.id);
                                  setSelectedOrderType(orderType as any);
                                  setShowOrderModal(true);
                                }
                              }}
                              className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex flex-col text-left"
                            >
                              <span>{orderNumber}</span>
                              <span className="text-xs text-muted-foreground">
                                {invoice.order?.assignedTo || invoice.order?.assigned_to || 'Unassigned'}
                              </span>
                            </button>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(invoice.issueDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(invoice.dueDate)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatCurrency(invoice.amountPaid)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(invoice.amountDue)}
                          </TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInvoice(invoice);
                                  setShowPaymentDialog(true);
                                }}
                                disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                              >
                                <DollarSign className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Send email
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Download PDF
                                }}
                              >
                                <Download className="h-4 w-4" />
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
              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={orderType} onValueChange={setOrderType}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={orderStatus} onValueChange={setOrderStatus}>
                    <SelectTrigger>
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
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Search</Label>
                  <Input
                    placeholder="VIN, stock, customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
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
                        All Services ({availableVehicles.length})
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
                        return (
                          <Badge key={serviceId} variant="secondary" className="flex items-center gap-1">
                            {service?.name || serviceId}
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
                  <CardTitle>Available Vehicles</CardTitle>
                  <CardDescription>
                    {selectedVehicleIds.size} of {filteredVehicles.length} selected
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
                  <div className="text-muted-foreground">Loading vehicles...</div>
                </div>
              ) : filteredVehicles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Car className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No vehicles found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto max-h-[600px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white z-10">
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedVehicleIds.size === filteredVehicles.length && filteredVehicles.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Order Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>
                          {orderType === 'service' ? 'PO / RO / Tag' : orderType === 'carwash' ? 'Stock / Tag' : 'Stock'}
                        </TableHead>
                        <TableHead>Vehicle</TableHead>
                        <TableHead>VIN</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Dept</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
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
                            <TableCell>
                              <Checkbox
                                checked={selectedVehicleIds.has(vehicle.id)}
                                onCheckedChange={() => handleToggleVehicle(vehicle.id)}
                              />
                            </TableCell>
                            <TableCell>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrderId(vehicle.id);
                                  setSelectedOrderType(vehicle.order_type as any);
                                  setShowOrderModal(true);
                                }}
                                className="font-medium text-indigo-600 hover:text-indigo-800 hover:underline flex flex-col text-left"
                              >
                                <span className="text-sm">{orderNumber}</span>
                                <span className="text-xs text-muted-foreground">
                                  {vehicle.assigned_to || 'Unassigned'}
                                </span>
                              </button>
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatDate(vehicle.completed_at || vehicle.created_at)}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {orderType === 'service' ? (
                                <div className="flex flex-col gap-0.5">
                                  {vehicle.po && <span className="text-xs text-muted-foreground">PO: {vehicle.po}</span>}
                                  {vehicle.ro && <span className="text-xs text-muted-foreground">RO: {vehicle.ro}</span>}
                                  {vehicle.tag && <span className="text-xs font-medium">Tag: {vehicle.tag}</span>}
                                  {!vehicle.po && !vehicle.ro && !vehicle.tag && 'N/A'}
                                </div>
                              ) : orderType === 'carwash' ? (
                                <div className="flex flex-col gap-0.5">
                                  {vehicle.stock_number && <span className="text-xs font-medium">Stock: {vehicle.stock_number}</span>}
                                  {vehicle.tag && <span className="text-xs font-medium">Tag: {vehicle.tag}</span>}
                                  {!vehicle.stock_number && !vehicle.tag && 'N/A'}
                                </div>
                              ) : (
                                vehicle.stock_number || 'N/A'
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {vehicle.vehicle_vin || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                              {getServiceNames(vehicle.services)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {vehicle.order_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
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
                        onChange={(e) => setIssueDate(new Date(e.target.value))}
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
                        onChange={(e) => setDueDate(new Date(e.target.value))}
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
                        <div className="text-3xl font-bold text-indigo-600">
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
    </div>
  );
};
