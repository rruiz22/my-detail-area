// =====================================================
// VEHICLE INVOICE SEARCH
// Created: 2025-11-01
// Description: Search to check if a vehicle is already in an invoice
// =====================================================

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { AlertCircle, Car, CheckCircle2, FileText, Search } from 'lucide-react';
import React, { useState } from 'react';

interface VehicleInvoiceSearchProps {
  dealerId: number;
}

interface VehicleSearchResult {
  order_id: string;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  stock_number: string | null;
  vehicle_vin: string | null;
  customer_name: string | null;
  order_number: string | null;
  total_amount: number;
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_status: string | null;
  invoice_date: string | null;
  has_invoice: boolean;
}

export const VehicleInvoiceSearch: React.FC<VehicleInvoiceSearchProps> = ({ dealerId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: searchResults = [], isLoading, isFetching } = useQuery({
    queryKey: ['vehicle-invoice-search', dealerId, debouncedSearchTerm],
    queryFn: async (): Promise<VehicleSearchResult[]> => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 3) {
        return [];
      }

      const searchLower = debouncedSearchTerm.toLowerCase();

      // Get all orders matching the search
      let query = supabase
        .from('orders')
        .select('id, order_number, custom_order_number, customer_name, stock_number, vehicle_make, vehicle_model, vehicle_year, vehicle_vin, total_amount, status')
        .eq('dealer_id', dealerId)
        .eq('status', 'completed')
        .limit(50);

      // Apply search filter
      query = query.or(
        `vehicle_vin.ilike.%${searchLower}%,stock_number.ilike.%${searchLower}%,customer_name.ilike.%${searchLower}%,vehicle_make.ilike.%${searchLower}%,vehicle_model.ilike.%${searchLower}%`
      );

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      // Get all invoice items for these orders
      const orderIds = orders.map(o => o.id);
      const { data: invoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select(`
          service_reference,
          invoice_id,
          invoices:invoice_id (
            id,
            invoice_number,
            status,
            issue_date
          )
        `)
        .in('service_reference', orderIds)
        .limit(10000); // ✅ Fix: Remove Supabase 1000 row default limit

      if (itemsError) throw itemsError;

      // Create map of order_id -> invoice data
      const invoiceMap = new Map();
      invoiceItems?.forEach(item => {
        if (item.service_reference && item.invoices) {
          invoiceMap.set(item.service_reference, {
            invoice_id: item.invoices.id,
            invoice_number: item.invoices.invoice_number,
            invoice_status: item.invoices.status,
            invoice_date: item.invoices.issue_date,
          });
        }
      });

      // Combine data
      const results: VehicleSearchResult[] = orders.map(order => {
        const invoiceData = invoiceMap.get(order.id);
        return {
          order_id: order.id,
          vehicle_year: order.vehicle_year,
          vehicle_make: order.vehicle_make,
          vehicle_model: order.vehicle_model,
          stock_number: order.stock_number,
          vehicle_vin: order.vehicle_vin,
          customer_name: order.customer_name,
          order_number: order.custom_order_number || order.order_number,
          total_amount: order.total_amount || 0,
          invoice_id: invoiceData?.invoice_id || null,
          invoice_number: invoiceData?.invoice_number || null,
          invoice_status: invoiceData?.invoice_status || null,
          invoice_date: invoiceData?.invoice_date || null,
          has_invoice: !!invoiceData,
        };
      });

      return results;
    },
    enabled: debouncedSearchTerm.length >= 3,
    staleTime: 10 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;

    const styles: Record<string, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      pending: { variant: 'outline', label: 'Pending' },
      paid: { variant: 'default', label: 'Paid' },
      partially_paid: { variant: 'secondary', label: 'Partial' },
      overdue: { variant: 'destructive', label: 'Overdue' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };

    const style = styles[status] || { variant: 'outline', label: status };
    return <Badge variant={style.variant}>{style.label}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="border-b bg-gray-50/50">
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Check Vehicle Invoice Status
        </CardTitle>
        <CardDescription>
          Search by VIN, stock number, customer name, or vehicle make/model to check if a vehicle is already in an invoice
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-6">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by VIN, stock number, customer name, make, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 text-base"
              autoFocus
            />
            {(isLoading || isFetching) && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
              </div>
            )}
          </div>

          {/* Instructions */}
          {!debouncedSearchTerm && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Car className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Search for a Vehicle</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Enter at least 3 characters to search for vehicles by VIN, stock number, customer name, or vehicle details
              </p>
            </div>
          )}

          {/* Search too short */}
          {searchTerm.length > 0 && searchTerm.length < 3 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                Please enter at least 3 characters to search
              </p>
            </div>
          )}

          {/* No Results */}
          {debouncedSearchTerm.length >= 3 && !isLoading && searchResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No vehicles found</p>
              <p className="text-sm text-muted-foreground mt-2">
                No completed orders match your search criteria
              </p>
            </div>
          )}

          {/* Results Table */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold">Stock/VIN</TableHead>
                    <TableHead className="font-semibold">Customer</TableHead>
                    <TableHead className="font-semibold">Order #</TableHead>
                    <TableHead className="font-semibold">Amount</TableHead>
                    <TableHead className="font-semibold">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((result) => (
                    <TableRow key={result.order_id}>
                      <TableCell>
                        {result.has_invoice ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-sm font-medium text-emerald-600">Invoiced</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-medium text-amber-600">Not Invoiced</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {result.vehicle_year} {result.vehicle_make} {result.vehicle_model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-medium">Stock:</span> {result.stock_number || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {result.vehicle_vin || 'No VIN'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{result.customer_name}</TableCell>
                      <TableCell className="font-mono text-sm">{result.order_number}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(result.total_amount)}</TableCell>
                      <TableCell>
                        {result.has_invoice ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-mono text-sm">{result.invoice_number}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(result.invoice_status)}
                              <span className="text-xs text-muted-foreground">
                                {formatDate(result.invoice_date)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results Count */}
          {searchResults.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              Found {searchResults.length} vehicle{searchResults.length !== 1 ? 's' : ''} •{' '}
              {searchResults.filter(r => r.has_invoice).length} invoiced •{' '}
              {searchResults.filter(r => !r.has_invoice).length} not invoiced
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

