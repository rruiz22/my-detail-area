/**
 * Detail Hub Invoices Database Integration
 *
 * Real Supabase queries using TanStack Query for invoice and billing management.
 *
 * PHASE: Real Database Integration
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { useToast } from '@/hooks/use-toast';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// TYPES (matching database schema)
// =====================================================

export interface DetailHubInvoice {
  id: string;
  dealership_id: number;
  invoice_number: string; // e.g., INV-2024-001

  // Client information
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;

  // Invoice details
  description: string | null;
  notes: string | null;

  // Financial details
  subtotal: number;
  tax_rate: number; // Percentage
  tax_amount: number;
  total_amount: number;

  // Dates
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  sent_date: string | null;

  // Status
  status: 'draft' | 'pending' | 'sent' | 'paid' | 'overdue' | 'cancelled';

  // Payment tracking
  payment_method: string | null;
  payment_reference: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface DetailHubInvoiceLineItem {
  id: string;
  invoice_id: string;

  // Line item details
  line_number: number;
  service_name: string;
  description: string | null;

  // Pricing
  quantity: number;
  unit_price: number;
  line_total: number;

  // Optional link to time entries
  time_entry_id: string | null;

  // Metadata
  created_at: string;
}

export interface InvoiceWithLineItems extends DetailHubInvoice {
  line_items: DetailHubInvoiceLineItem[];
}

// =====================================================
// QUERY KEYS
// =====================================================

const QUERY_KEYS = {
  invoices: (dealershipId: number | 'all') => ['detail-hub', 'invoices', dealershipId],
  invoiceById: (invoiceId: string) => ['detail-hub', 'invoice', invoiceId],
  invoiceLineItems: (invoiceId: string) => ['detail-hub', 'invoice-line-items', invoiceId],
  invoiceStats: (dealershipId: number | 'all') => ['detail-hub', 'invoice-stats', dealershipId],
} as const;

// =====================================================
// INVOICES QUERIES
// =====================================================

export function useDetailHubInvoices() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.invoices(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DetailHubInvoice[];
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useDetailHubInvoiceById(invoiceId: string, includeLineItems = true) {
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.invoiceById(invoiceId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      // Fetch invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('detail_hub_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      if (!includeLineItems) {
        return invoice as DetailHubInvoice;
      }

      // Fetch line items
      const { data: lineItems, error: lineItemsError } = await supabase
        .from('detail_hub_invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('line_number');

      if (lineItemsError) throw lineItemsError;

      return {
        ...invoice,
        line_items: lineItems
      } as InvoiceWithLineItems;
    },
    enabled: !!user && !!invoiceId,
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: GC_TIMES.MEDIUM,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (invoiceData: Partial<DetailHubInvoice> & { line_items?: Partial<DetailHubInvoiceLineItem>[] }) => {
      if (!user) throw new Error('User not authenticated');

      const { line_items, ...invoiceFields } = invoiceData;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('detail_hub_invoices')
        .insert({
          ...invoiceFields,
          dealership_id: invoiceFields.dealership_id || (selectedDealerId !== 'all' ? selectedDealerId : undefined),
          created_by: user.id,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create line items if provided
      if (line_items && line_items.length > 0) {
        const lineItemsToInsert = line_items.map((item, index) => ({
          ...item,
          invoice_id: invoice.id,
          line_number: item.line_number || index + 1,
        }));

        const { error: lineItemsError } = await supabase
          .from('detail_hub_invoice_line_items')
          .insert(lineItemsToInsert);

        if (lineItemsError) throw lineItemsError;
      }

      return invoice as DetailHubInvoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceStats(selectedDealerId) });
      toast({
        title: "Invoice Created",
        description: `Invoice ${data.invoice_number} has been created successfully.`
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to create invoice',
        variant: "destructive"
      });
    }
  });
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DetailHubInvoice> }) => {
      const { data, error } = await supabase
        .from('detail_hub_invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubInvoice;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceById(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceStats(selectedDealerId) });
      toast({
        title: "Invoice Updated",
        description: "Invoice has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update invoice',
        variant: "destructive"
      });
    }
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { selectedDealerId } = useDealerFilter();

  return useMutation({
    mutationFn: async (id: string) => {
      // Line items will be deleted automatically via ON DELETE CASCADE
      const { error } = await supabase
        .from('detail_hub_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoices(selectedDealerId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceStats(selectedDealerId) });
      toast({
        title: "Invoice Deleted",
        description: "Invoice has been removed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete invoice',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// LINE ITEMS OPERATIONS
// =====================================================

export function useAddLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (lineItem: Partial<DetailHubInvoiceLineItem>) => {
      const { data, error } = await supabase
        .from('detail_hub_invoice_line_items')
        .insert(lineItem)
        .select()
        .single();

      if (error) throw error;
      return data as DetailHubInvoiceLineItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceById(data.invoice_id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceLineItems(data.invoice_id) });
      toast({
        title: "Line Item Added",
        description: "Invoice line item has been added successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to add line item',
        variant: "destructive"
      });
    }
  });
}

export function useDeleteLineItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, invoiceId }: { id: string; invoiceId: string }) => {
      const { error } = await supabase
        .from('detail_hub_invoice_line_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, invoiceId };
    },
    onSuccess: ({ invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceById(invoiceId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.invoiceLineItems(invoiceId) });
      toast({
        title: "Line Item Deleted",
        description: "Invoice line item has been removed successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete line item',
        variant: "destructive"
      });
    }
  });
}

// =====================================================
// INVOICE STATISTICS
// =====================================================

export interface InvoiceStatistics {
  total_invoices: number;
  draft_count: number;
  pending_count: number;
  paid_count: number;
  overdue_count: number;
  total_revenue: number;
  pending_amount: number;
  overdue_amount: number;
}

export function useInvoiceStatistics() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.invoiceStats(selectedDealerId),
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      if (selectedDealerId === 'all') {
        // Aggregate stats from all invoices
        const { data: invoices, error } = await supabase
          .from('detail_hub_invoices')
          .select('status, total_amount');

        if (error) throw error;

        const stats: InvoiceStatistics = {
          total_invoices: invoices.length,
          draft_count: invoices.filter(i => i.status === 'draft').length,
          pending_count: invoices.filter(i => i.status === 'pending').length,
          paid_count: invoices.filter(i => i.status === 'paid').length,
          overdue_count: invoices.filter(i => i.status === 'overdue').length,
          total_revenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total_amount, 0),
          pending_amount: invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total_amount, 0),
          overdue_amount: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total_amount, 0),
        };

        return stats;
      }

      // Use RPC function for specific dealership
      const { data, error } = await supabase.rpc('get_invoice_statistics', {
        p_dealership_id: selectedDealerId
      });

      if (error) throw error;
      return data[0] as InvoiceStatistics;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM,
  });
}

// =====================================================
// HELPER FUNCTION: Generate next invoice number
// =====================================================
export async function generateInvoiceNumber(dealershipId: number): Promise<string> {
  const { data, error } = await supabase.rpc('generate_invoice_number', {
    p_dealership_id: dealershipId
  });

  if (error) {
    console.error('Error generating invoice number:', error);
    // Fallback to client-side generation
    const year = new Date().getFullYear();
    const { data: invoices, error: fetchError } = await supabase
      .from('detail_hub_invoices')
      .select('invoice_number')
      .eq('dealership_id', dealershipId)
      .like('invoice_number', `INV-${year}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1);

    if (fetchError) throw fetchError;

    if (!invoices || invoices.length === 0) {
      return `INV-${year}-001`;
    }

    const lastNumber = parseInt(invoices[0].invoice_number.split('-')[2]) || 0;
    return `INV-${year}-${String(lastNumber + 1).padStart(3, '0')}`;
  }

  return data as string;
}
