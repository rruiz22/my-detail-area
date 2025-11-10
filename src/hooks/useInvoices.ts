// =====================================================
// INVOICES HOOK
// Created: 2024-10-16
// Description: Hook for managing invoices and payments
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type {
  Invoice,
  InvoiceWithDetails,
  InvoiceFormData,
  Payment,
  PaymentFormData,
  InvoiceFilters,
  InvoiceSummary,
  InvoiceRow,
  InvoiceItemRow,
  PaymentRow
} from '@/types/invoices';

// Transform database rows to frontend types
const transformInvoice = (row: any): Invoice => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  orderId: row.order_id,
  dealerId: row.dealer_id,
  createdBy: row.created_by,
  issueDate: row.issue_date,
  dueDate: row.due_date,
  subtotal: parseFloat(row.subtotal),
  taxRate: parseFloat(row.tax_rate),
  taxAmount: parseFloat(row.tax_amount),
  discountAmount: parseFloat(row.discount_amount || 0),
  totalAmount: parseFloat(row.total_amount),
  amountPaid: parseFloat(row.amount_paid || 0),
  amountDue: parseFloat(row.amount_due),
  status: row.status,
  invoiceNotes: row.invoice_notes,
  termsAndConditions: row.terms_and_conditions,
  emailSent: row.email_sent,
  emailSentAt: row.email_sent_at,
  emailSentCount: row.email_sent_count,
  lastEmailRecipient: row.last_email_recipient,
  metadata: row.metadata || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  paidAt: row.paid_at,
  cancelledAt: row.cancelled_at,
  order: row.orders ? {
    orderNumber: row.orders.order_number || row.orders.custom_order_number,
    orderType: row.orders.order_type,
    customerName: row.orders.customer_name,
    customerEmail: row.orders.customer_email,
    customerPhone: row.orders.customer_phone,
    vehicleMake: row.orders.vehicle_make,
    vehicleModel: row.orders.vehicle_model,
    vehicleYear: row.orders.vehicle_year,
    vehicleVin: row.orders.vehicle_vin,
    vehicleInfo: row.orders.vehicle_info,
    services: row.orders.services,
    totalAmount: parseFloat(row.orders.total_amount || 0),
    status: row.orders.status
  } : undefined,
  dealership: row.dealerships ? {
    id: row.dealerships.id,
    name: row.dealerships.name,
    email: row.dealerships.email,
    phone: row.dealerships.phone,
    address: row.dealerships.address,
    logo: row.dealerships.logo
  } : undefined
});

const transformPayment = (row: any): Payment => ({
  id: row.id,
  paymentNumber: row.payment_number,
  invoiceId: row.invoice_id,
  dealerId: row.dealer_id,
  recordedBy: row.recorded_by,
  paymentDate: row.payment_date,
  amount: parseFloat(row.amount),
  paymentMethod: row.payment_method,
  referenceNumber: row.reference_number,
  notes: row.notes,
  status: row.status,
  metadata: row.metadata || {},
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  refundedAt: row.refunded_at
});

// =====================================================
// INVOICES QUERIES
// =====================================================

export const useInvoices = (filters: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async (): Promise<Invoice[]> => {
      // Use RPC function for complex filtering with order fields
      const dealerId = filters.dealerId && filters.dealerId !== 'all'
        ? (typeof filters.dealerId === 'string' ? parseInt(filters.dealerId) : filters.dealerId)
        : null;

      const { data, error } = await supabase.rpc('get_invoices_with_filters', {
        p_dealer_id: dealerId,
        p_status: filters.status && filters.status !== 'all' ? filters.status : null,
        p_order_type: filters.orderType && filters.orderType !== 'all' ? filters.orderType : null,
        p_start_date: filters.startDate?.toISOString() || null,
        p_end_date: filters.endDate?.toISOString() || null,
        p_search_term: filters.searchTerm || null
      });

      if (error) throw error;

      // Transform RPC results to Invoice type
      return (data || []).map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        orderId: row.order_id,
        dealerId: row.dealer_id,
        createdBy: row.created_by,
        issueDate: row.issue_date,
        dueDate: row.due_date,
        subtotal: parseFloat(row.subtotal),
        taxRate: parseFloat(row.tax_rate),
        taxAmount: parseFloat(row.tax_amount),
        discountAmount: parseFloat(row.discount_amount || 0),
        totalAmount: parseFloat(row.total_amount),
        amountPaid: parseFloat(row.amount_paid || 0),
        amountDue: parseFloat(row.amount_due),
        status: row.status,
        invoiceNotes: row.invoice_notes,
        termsAndConditions: row.terms_and_conditions,
        emailSent: row.email_sent,
        emailSentAt: row.email_sent_at,
        emailSentCount: row.email_sent_count,
        lastEmailRecipient: row.last_email_recipient,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        paidAt: row.paid_at,
        cancelledAt: row.cancelled_at,
        commentsCount: parseInt(row.comments_count || '0'),
        order: row.order_number ? {
          orderNumber: row.order_number || row.custom_order_number,
          orderType: row.order_type,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          customerPhone: row.customer_phone,
          vehicleMake: row.vehicle_make,
          vehicleModel: row.vehicle_model,
          vehicleYear: row.vehicle_year,
          vehicleVin: row.vehicle_vin,
          vehicleInfo: row.vehicle_info,
          services: row.order_services,
          totalAmount: parseFloat(row.order_total_amount || 0),
          status: row.order_status
        } : undefined,
        dealership: row.dealership_name ? {
          id: row.dealership_id,
          name: row.dealership_name,
          email: row.dealership_email,
          phone: row.dealership_phone,
          address: row.dealership_address,
          logo: row.dealership_logo_url
        } : undefined
      } as Invoice));
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async (): Promise<InvoiceWithDetails> => {
      // Get basic invoice data
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          orders (*),
          dealerships (*),
          payments (*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Invoice not found');

      // Get invoice items with order info using RPC
      const { data: itemsData, error: itemsError } = await supabase
        .rpc('get_invoice_items_with_order_info', { p_invoice_id: invoiceId });

      if (itemsError) throw itemsError;

      return {
        ...transformInvoice(data),
        order: data.orders,
        items: (itemsData || []).map((item: any) => ({
          id: item.id,
          invoiceId: item.invoice_id,
          itemType: item.item_type,
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unit_price),
          discountAmount: parseFloat(item.discount_amount || 0),
          taxRate: parseFloat(item.tax_rate),
          totalAmount: parseFloat(item.total_amount),
          serviceReference: item.service_reference,
          sortOrder: item.sort_order,
          metadata: {
            ...(item.metadata || {}),
            // Add order info from RPC
            order_number: item.order_number,
            order_type: item.order_type,
            po: item.po,
            ro: item.ro,
            tag: item.tag,
            service_names: item.service_names
          },
          createdAt: item.created_at,
          updatedAt: item.updated_at
        })),
        payments: (data.payments || []).map(transformPayment)
      } as InvoiceWithDetails;
    },
    enabled: !!invoiceId,
  });
};

export const useInvoiceSummary = (filters: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoice-summary', filters],
    queryFn: async (): Promise<InvoiceSummary> => {
      let query = supabase
        .from('invoices')
        .select('status, total_amount, amount_paid, amount_due');

      // Apply filters
      if (filters.dealerId && filters.dealerId !== 'all') {
        query = query.eq('dealer_id', filters.dealerId);
      }
      if (filters.startDate) {
        query = query.gte('issue_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('issue_date', filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const summary: InvoiceSummary = {
        totalInvoices: data?.length || 0,
        totalAmount: data?.reduce((sum, inv) => sum + parseFloat(inv.total_amount || '0'), 0) || 0,
        totalPaid: data?.reduce((sum, inv) => sum + parseFloat(inv.amount_paid || '0'), 0) || 0,
        totalDue: data?.reduce((sum, inv) => sum + parseFloat(inv.amount_due || '0'), 0) || 0,
        pendingCount: data?.filter(inv => inv.status === 'pending').length || 0,
        overdueCount: data?.filter(inv => inv.status === 'overdue').length || 0,
        paidCount: data?.filter(inv => inv.status === 'paid').length || 0
      };

      return summary;
    },
    staleTime: 30 * 1000,
  });
};

// =====================================================
// INVOICE MUTATIONS
// =====================================================

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: InvoiceFormData) => {
      if (!user) throw new Error('User not authenticated');

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { p_dealer_id: formData.dealerId });

      if (numberError) throw numberError;

      // Get order data to calculate totals
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', formData.orderId)
        .single();

      if (orderError) throw orderError;

      // Calculate totals
      const subtotal = parseFloat(order.total_amount || '0');
      const taxAmount = subtotal * (formData.taxRate / 100);
      const totalAmount = subtotal + taxAmount - (formData.discountAmount || 0);

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          order_id: formData.orderId,
          dealer_id: formData.dealerId,
          created_by: user.id,
          issue_date: formData.issueDate.toISOString(),
          due_date: formData.dueDate.toISOString(),
          subtotal,
          tax_rate: formData.taxRate,
          tax_amount: taxAmount,
          discount_amount: formData.discountAmount || 0,
          total_amount: totalAmount,
          amount_due: totalAmount,
          invoice_notes: formData.invoiceNotes,
          terms_and_conditions: formData.termsAndConditions
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items from order services
      if (order.services && Array.isArray(order.services)) {
        const items = order.services.map((service: any, index: number) => ({
          invoice_id: invoice.id,
          item_type: 'service',
          description: service.name || 'Service',
          quantity: 1,
          unit_price: parseFloat(service.price || '0'),
          tax_rate: formData.taxRate,
          total_amount: parseFloat(service.price || '0'),
          service_reference: service.id || service.name,
          sort_order: index
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      return invoice;
    },
    onSuccess: () => {
      // Invalidate all invoice-related queries to refresh lists automatically
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-for-counts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-without-invoice'] });
      queryClient.invalidateQueries({ queryKey: ['operational-vehicles-list'] });
      toast({ description: 'Invoice created successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', description: `Failed to create invoice: ${error.message}` });
    }
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (formData: PaymentFormData) => {
      if (!user) throw new Error('User not authenticated');

      // Generate payment number
      const { data: paymentNumber, error: numberError } = await supabase
        .rpc('generate_payment_number', { p_dealer_id: formData.dealerId });

      if (numberError) throw numberError;

      // Create payment
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          payment_number: paymentNumber,
          invoice_id: formData.invoiceId,
          dealer_id: formData.dealerId,
          recorded_by: user.id,
          payment_date: formData.paymentDate.toISOString(),
          amount: formData.amount,
          payment_method: formData.paymentMethod,
          reference_number: formData.referenceNumber,
          notes: formData.notes,
          status: 'completed'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      return payment;
    },
    onSuccess: (_, variables) => {
      // Invalidate all invoice-related queries
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      toast({ description: 'Payment recorded successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', description: `Failed to record payment: ${error.message}` });
    }
  });
};

export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ invoiceId, recipient }: { invoiceId: string; recipient: string }) => {
      // This would typically call an edge function to send the email
      // For now, we'll just update the invoice
      const { error } = await supabase
        .from('invoices')
        .update({
          email_sent: true,
          email_sent_at: new Date().toISOString(),
          email_sent_count: supabase.sql`email_sent_count + 1`,
          last_email_recipient: recipient
        })
        .eq('id', invoiceId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidate specific invoice and list to refresh email status
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ description: 'Invoice sent successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', description: `Failed to send invoice: ${error.message}` });
    }
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // Check if invoice has payments
      const { data: payments } = await supabase
        .from('payments')
        .select('id')
        .eq('invoice_id', invoiceId);

      if (payments && payments.length > 0) {
        throw new Error(`Cannot delete invoice with ${payments.length} payment(s). Please delete all payments first.`);
      }

      // Delete invoice (CASCADE will delete invoice_items automatically)
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: () => {
      // Invalidate all invoice-related queries to refresh lists and make vehicles available again
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      queryClient.invalidateQueries({ queryKey: ['all-vehicles-for-counts'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles-without-invoice'] });
      queryClient.invalidateQueries({ queryKey: ['operational-vehicles-list'] });
      toast({ description: 'Invoice deleted successfully - vehicles are now available for billing' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', description: error.message || 'Failed to delete invoice' });
    }
  });
};

export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;

      return { success: true };
    },
    onSuccess: (_, paymentId) => {
      // Invalidate all invoice-related queries to refresh payment status
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      toast({ description: 'Payment deleted successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', description: error.message || 'Failed to delete payment' });
    }
  });
};
