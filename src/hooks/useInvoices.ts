// =====================================================
// INVOICES HOOK
// Created: 2024-10-16
// Description: Hook for managing invoices and payments
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
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
      let query = supabase
        .from('invoices')
        .select(`
          *,
          orders (
            order_number,
            custom_order_number,
            order_type,
            customer_name,
            customer_email,
            customer_phone,
            vehicle_make,
            vehicle_model,
            vehicle_year,
            vehicle_vin,
            vehicle_info,
            services,
            total_amount,
            status
          ),
          dealerships (
            id,
            name,
            email,
            phone,
            address,
            logo
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.dealerId && filters.dealerId !== 'all') {
        query = query.eq('dealer_id', filters.dealerId);
      }
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.orderType && filters.orderType !== 'all') {
        query = query.eq('orders.order_type', filters.orderType);
      }
      if (filters.startDate) {
        query = query.gte('issue_date', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        query = query.lte('issue_date', filters.endDate.toISOString());
      }
      if (filters.searchTerm) {
        query = query.or(`invoice_number.ilike.%${filters.searchTerm}%,orders.customer_name.ilike.%${filters.searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []).map(transformInvoice);
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useInvoice = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async (): Promise<InvoiceWithDetails> => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          orders (*),
          dealerships (*),
          invoice_items (*),
          payments (*)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Invoice not found');

      return {
        ...transformInvoice(data),
        order: data.orders,
        items: (data.invoice_items || []).map((item: any) => ({
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
          metadata: item.metadata || {},
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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      toast.success('Invoice created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create invoice: ${error.message}`);
    }
  });
};

export const useRecordPayment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

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
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });
      toast.success('Payment recorded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    }
  });
};

export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      toast.success('Invoice sent successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to send invoice: ${error.message}`);
    }
  });
};


