// =====================================================
// CREATE INVOICE DIALOG
// Created: 2024-10-31
// Description: Form to create invoices for multiple vehicles
// =====================================================

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Textarea } from '@/components/ui/textarea';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceFormData } from '@/types/invoices';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Calendar, Car, DollarSign, FileText, Filter, Receipt, Search } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealerId: number;
}

interface VehicleForInvoice {
  id: string;
  order_number: string;
  custom_order_number: string | null;
  order_type: string;
  customer_name: string;
  stock_number: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_vin: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export const CreateInvoiceDialog: React.FC<CreateInvoiceDialogProps> = ({
  open,
  onOpenChange,
  dealerId,
}) => {
  const { user } = useAuth();
  const today = new Date();
  const defaultDueDate = new Date(today);
  defaultDueDate.setDate(today.getDate() + 30);

  // Calculate start and end of this week (Monday to Sunday) - using local dates
  const getWeekDates = (date: Date) => {
    const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()); // Local date only
    const day = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Calculate days to Monday
    const daysToMonday = day === 0 ? -6 : 1 - day; // Sunday: -6, Monday: 0, Tuesday: -1, ..., Saturday: -5

    const monday = new Date(current);
    monday.setDate(current.getDate() + daysToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Add 6 days to get Sunday

    return { monday, sunday };
  };

  const { monday: startOfThisWeek, sunday: endOfThisWeek } = getWeekDates(new Date());

  // Filters
  const [orderType, setOrderType] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom'>('this_week');
  const [startDate, setStartDate] = useState<string>(format(startOfThisWeek, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfThisWeek, 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  // Handle date range preset changes
  const handleDateRangeChange = (value: 'today' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom') => {
    setDateRange(value);
    const now = new Date();

    switch (value) {
      case 'today':
        setStartDate(format(now, 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'this_week':
        // This week: Monday to Sunday (using local dates)
        const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const day = current.getDay();
        const daysToMonday = day === 0 ? -6 : 1 - day;
        const startOfWeek = new Date(current);
        startOfWeek.setDate(current.getDate() + daysToMonday);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        setStartDate(format(startOfWeek, 'yyyy-MM-dd'));
        setEndDate(format(endOfWeek, 'yyyy-MM-dd'));
        break;
      case 'last_week':
        // Last week: Monday to Sunday (using local dates)
        const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const currentDay = currentDate.getDay();
        const daysToLastMonday = currentDay === 0 ? -13 : 1 - currentDay - 7;
        const lastWeekStart = new Date(currentDate);
        lastWeekStart.setDate(currentDate.getDate() + daysToLastMonday);
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        setStartDate(format(lastWeekStart, 'yyyy-MM-dd'));
        setEndDate(format(lastWeekEnd, 'yyyy-MM-dd'));
        break;
      case 'this_month':
        setStartDate(format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(format(lastMonth, 'yyyy-MM-dd'));
        setEndDate(format(lastMonthEnd, 'yyyy-MM-dd'));
        break;
      case 'last_3_months':
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        setStartDate(format(threeMonthsAgo, 'yyyy-MM-dd'));
        setEndDate(format(now, 'yyyy-MM-dd'));
        break;
    }
  };

  // Selected vehicles
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<Set<string>>(new Set());

  // Invoice details
  const [issueDate, setIssueDate] = useState<Date>(today);
  const [dueDate, setDueDate] = useState<Date>(defaultDueDate);
  const [taxRate, setTaxRate] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [invoiceNotes, setInvoiceNotes] = useState<string>('');
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    'Payment due within 30 days. Late payments may be subject to fees.'
  );

  // Fetch vehicles without invoices
  const { data: availableVehicles = [], isLoading: loadingVehicles } = useQuery({
    queryKey: ['vehicles-without-invoice', dealerId, orderType, startDate, endDate],
    queryFn: async (): Promise<VehicleForInvoice[]> => {
      let query = supabase
        .from('orders')
        .select('id, order_number, custom_order_number, order_type, customer_name, stock_number, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, total_amount, services, status, created_at, completed_at, updated_at')
        .eq('dealer_id', dealerId)
        .eq('status', 'completed')
        .limit(500);

      // Apply order type filter
      if (orderType !== 'all') {
        query = query.eq('order_type', orderType);
      }

      // Use updated_at as fallback for date filtering (handles sales/service orders)
      if (startDate) {
        query = query.gte('updated_at', parseISO(startDate).toISOString());
      }
      if (endDate) {
        const endDateTime = parseISO(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query = query.lte('updated_at', endDateTime.toISOString());
      }

      // Order by updated_at
      query = query.order('updated_at', { ascending: false });

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      if (!orders) return [];

      // Get existing invoice items to filter out already invoiced orders
      const { data: existingInvoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('service_reference')
        .not('service_reference', 'is', null);

      if (itemsError) throw itemsError;

      // Create set of already invoiced order IDs
      const invoicedOrderIds = new Set(
        existingInvoiceItems
          ?.map(item => item.service_reference)
          .filter(Boolean) || []
      );

      // Filter out orders that are already invoiced
      const ordersWithoutInvoices = orders.filter(
        order => !invoicedOrderIds.has(order.id)
      );

      return ordersWithoutInvoices as VehicleForInvoice[];
    },
    enabled: open && !!dealerId,
    staleTime: 30 * 1000,
  });

  // Filter vehicles by search term
  const filteredVehicles = useMemo(() => {
    if (!searchTerm) return availableVehicles;

    const term = searchTerm.toLowerCase();
    return availableVehicles.filter(vehicle =>
      vehicle.customer_name?.toLowerCase().includes(term) ||
      vehicle.stock_number?.toLowerCase().includes(term) ||
      vehicle.vehicle_vin?.toLowerCase().includes(term) ||
      vehicle.vehicle_make?.toLowerCase().includes(term) ||
      vehicle.vehicle_model?.toLowerCase().includes(term) ||
      vehicle.order_number?.toLowerCase().includes(term)
    );
  }, [availableVehicles, searchTerm]);

  // Get selected vehicles
  const selectedVehicles = useMemo(() => {
    return filteredVehicles.filter(v => selectedVehicleIds.has(v.id));
  }, [filteredVehicles, selectedVehicleIds]);

  // Calculate totals
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { p_dealer_id: dealerId });

      if (numberError) throw numberError;

      // Create invoice (without order_id since this is a bulk invoice)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: selectedVehicles[0].id, // Use first order as reference
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
          invoice_notes: invoiceNotes,
          terms_and_conditions: termsAndConditions,
          status: 'pending',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items for each vehicle
      const items = selectedVehicles.map((vehicle, index) => ({
        invoice_id: invoice.id,
        item_type: 'service' as const,
        description: `${vehicle.vehicle_year || ''} ${vehicle.vehicle_make || ''} ${vehicle.vehicle_model || ''} - ${vehicle.stock_number || 'N/A'}`.trim(),
        quantity: 1,
        unit_price: vehicle.total_amount || 0,
        discount_amount: 0,
        tax_rate: 0, // Tax is applied at invoice level
        total_amount: vehicle.total_amount || 0,
        service_reference: vehicle.id, // Store order ID as reference
        sort_order: index,
        metadata: {
          order_number: vehicle.custom_order_number || vehicle.order_number,
          customer_name: vehicle.customer_name,
          vehicle_vin: vehicle.vehicle_vin,
          stock_number: vehicle.stock_number,
          completed_at: vehicle.completed_at,
        },
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success(`Invoice created with ${selectedVehicles.length} vehicles`);

      // Reset and close
      setSelectedVehicleIds(new Set());
      setSearchTerm('');
      setInvoiceNotes('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      toast.error(`Failed to create invoice: ${error.message}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MM/dd/yyyy');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Receipt className="h-5 w-5" />
            Create Bulk Invoice
          </DialogTitle>
          <DialogDescription>
            Select vehicles to include in the invoice
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          {/* Filters Section */}
          <div className="border rounded-lg p-4 mb-4 bg-white">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Filter className="h-4 w-4" />
              Filter Vehicles
            </div>

            {/* First Row: Department and Date Range Preset */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="space-y-1.5">
                <Label htmlFor="orderType" className="text-xs font-medium">Department</Label>
                <Select value={orderType} onValueChange={setOrderType}>
                  <SelectTrigger id="orderType" className="h-10">
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
                <Label htmlFor="dateRange" className="text-xs font-medium">Date Range</Label>
                <Select value={dateRange} onValueChange={handleDateRangeChange}>
                  <SelectTrigger id="dateRange" className="h-10">
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
                <Label htmlFor="search" className="text-xs font-medium">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
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
              <div className="grid grid-cols-2 gap-3 pt-3 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate" className="text-xs font-medium">From Date</Label>
                  <Input
                    id="startDate"
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
                  <Label htmlFor="endDate" className="text-xs font-medium">To Date</Label>
                  <Input
                    id="endDate"
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
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  Showing vehicles from <span className="font-medium text-foreground">{format(parseISO(startDate), 'MMM dd, yyyy')}</span> to <span className="font-medium text-foreground">{format(parseISO(endDate), 'MMM dd, yyyy')}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Vehicles Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
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
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedVehicleIds.size === filteredVehicles.length && filteredVehicles.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Stock</TableHead>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold">VIN</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Dept</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => (
                    <TableRow
                      key={vehicle.id}
                      className={selectedVehicleIds.has(vehicle.id) ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : ''}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedVehicleIds.has(vehicle.id)}
                          onCheckedChange={() => handleToggleVehicle(vehicle.id)}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(vehicle.completed_at || vehicle.created_at)}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {vehicle.stock_number || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {vehicle.vehicle_year} {vehicle.vehicle_make} {vehicle.vehicle_model}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {vehicle.vehicle_vin || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">{vehicle.customer_name}</TableCell>
                      <TableCell>
                        <span className="text-xs capitalize px-2 py-1 bg-gray-100 rounded">
                          {vehicle.order_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(vehicle.total_amount || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Summary and Invoice Details */}
          {selectedVehicleIds.size > 0 && (
            <div className="mt-4 space-y-4 border-t pt-4">
              {/* Invoice Configuration */}
              <div className="border rounded-lg p-4 bg-white">
                <div className="text-sm font-semibold mb-3">Invoice Configuration</div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="issueDate" className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Issue Date
                    </Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={format(issueDate, 'yyyy-MM-dd')}
                      onChange={(e) => setIssueDate(new Date(e.target.value))}
                      className="h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate" className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Due Date
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={format(dueDate, 'yyyy-MM-dd')}
                      onChange={(e) => setDueDate(new Date(e.target.value))}
                      className="h-10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="taxRate" className="text-xs font-medium flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
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
                      className="h-10"
                    />
                  </div>
                </div>
              </div>

              {/* Total Summary */}
              <div className="border rounded-lg p-4 bg-white">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Selected Vehicles</div>
                    <div className="text-3xl font-bold">{selectedVehicleIds.size}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">Invoice Total</div>
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(totalAmount)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>Discount:</span>
                      <span className="font-medium">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t text-base">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-bold">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={selectedVehicleIds.size === 0}
            >
              Create Invoice ({selectedVehicleIds.size} vehicles)
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
