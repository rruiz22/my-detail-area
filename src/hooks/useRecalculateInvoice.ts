// =====================================================
// USE RECALCULATE INVOICE HOOK
// Created: 2025-11-04
// Description: Hook to recalculate invoice data from fresh order data
// =====================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

/**
 * Extract service names from services array using available dealer services
 */
function extractServiceNames(services: any[] | null, availableServices: any[]): string {
  if (!services || !Array.isArray(services) || services.length === 0) {
    return 'N/A';
  }

  return services.map((service: any) => {
    // Priority 1: Direct name from new standard format
    if (service && typeof service === 'object' && service.name) {
      return service.name;
    }

    // Priority 2: Lookup by id field
    if (service && typeof service === 'object' && service.id) {
      const serviceData = availableServices?.find(ds => ds.id === service.id);
      return serviceData?.name || service.id;
    }

    // Priority 3: Legacy carwash - lookup by type field
    if (service && typeof service === 'object' && service.type) {
      const serviceData = availableServices?.find(ds => ds.id === service.type);
      return serviceData?.name || service.type;
    }

    // Priority 4: Legacy string format
    if (typeof service === 'string') {
      const serviceData = availableServices?.find(ds => ds.id === service);
      return serviceData?.name || service;
    }

    return 'Unknown';
  }).filter(Boolean).join(', ');
}

export const useRecalculateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      // 1. Get invoice with items
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          items:invoice_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoice) throw new Error('Invoice not found');

      // 2. Get fresh order data for each item
      const orderIds = invoice.items
        .map((item: any) => item.service_reference)
        .filter(Boolean);

      if (orderIds.length === 0) {
        throw new Error('No orders found in invoice items');
      }

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds);

      if (ordersError) throw ordersError;

      // 3. Get dealer services for name mapping
      const { data: services, error: servicesError } = await supabase
        .from('dealer_services')
        .select('*')
        .eq('dealer_id', invoice.dealer_id);

      if (servicesError) throw servicesError;

      const availableServices = services || [];

      // 4. Update each invoice item
      const updates = invoice.items.map((item: any) => {
        const order = orders?.find(o => o.id === item.service_reference);
        if (!order) {
          console.warn(`Order not found for item ${item.id}`);
          return null;
        }

        // Extract service names using the same logic as invoice creation
        const serviceNames = extractServiceNames(order.services, availableServices);

        // Update metadata with fresh order data
        const updatedMetadata = {
          ...item.metadata,
          service_names: serviceNames,
          // Refresh other order data
          customer_name: order.customer_name,
          vehicle_vin: order.vehicle_vin,
          stock_number: order.stock_number,
          po: order.po,
          ro: order.ro,
          tag: order.tag,
          completed_at: order.completed_at,
          services: order.services,
          order_type: order.order_type,
        };

        return {
          id: item.id,
          total_amount: order.total_amount || item.total_amount,
          unit_price: order.total_amount || item.unit_price,
          metadata: updatedMetadata,
        };
      }).filter(Boolean);

      if (updates.length === 0) {
        throw new Error('No items to update');
      }

      // 5. Update items individually (using update instead of upsert to avoid RLS issues)
      const updatePromises = updates.map(item =>
        supabase
          .from('invoice_items')
          .update({
            total_amount: item.total_amount,
            unit_price: item.unit_price,
            metadata: item.metadata,
          })
          .eq('id', item.id)
      );

      const updateResults = await Promise.all(updatePromises);

      // Check for any errors
      const updateError = updateResults.find(result => result.error);
      if (updateError?.error) throw updateError.error;

      // 6. Recalculate invoice totals
      const newSubtotal = updates.reduce((sum, item) => sum + (item.total_amount || 0), 0);
      const taxAmount = newSubtotal * (invoice.tax_rate / 100);
      const totalAmount = newSubtotal + taxAmount - (invoice.discount_amount || 0);
      const amountDue = totalAmount - (invoice.amount_paid || 0);

      // 7. Update invoice with recalculated totals and timestamp
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          subtotal: newSubtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          amount_due: amountDue,
          metadata: {
            ...invoice.metadata,
            recalculated_at: new Date().toISOString(),
            recalculated_count: (invoice.metadata?.recalculated_count || 0) + 1,
          }
        })
        .eq('id', invoiceId);

      if (invoiceUpdateError) throw invoiceUpdateError;

      return {
        invoice,
        updatedItems: updates.length,
        oldTotal: invoice.total_amount,
        newTotal: totalAmount,
      };
    },
    onSuccess: (data) => {
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.invoice.id] });
      queryClient.invalidateQueries({ queryKey: ['invoice-summary'] });

      // Show success toast
      toast({
        title: 'Invoice Recalculated',
        description: `Updated ${data.updatedItems} item(s). New total: $${data.newTotal.toFixed(2)}`,
      });
    },
    onError: (error: Error) => {
      console.error('Failed to recalculate invoice:', error);
      toast({
        variant: 'destructive',
        title: 'Recalculation Failed',
        description: error.message || 'An error occurred while recalculating the invoice',
      });
    },
  });
};
