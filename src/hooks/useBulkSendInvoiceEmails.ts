// =====================================================
// BULK SEND INVOICE EMAILS HOOK
// Created: 2025-12-17
// Description: Hook for sending multiple invoices in a single email
// =====================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePDFBlob } from '@/utils/generateInvoicePDFBlob';
import { generateInvoiceExcelBlob } from '@/utils/generateInvoiceExcelBlob';
import type { Invoice } from '@/types/invoices';

// =====================================================
// HELPER: Convert ArrayBuffer to Base64
// =====================================================
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface BulkSendInvoiceEmailsRequest {
  invoiceIds: string[];
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  includePDF: boolean;
  includeExcel: boolean;
  dealershipId: number;
}

interface EmailAttachment {
  filename: string;
  content: string; // base64
  content_type: string;
}

export const useBulkSendInvoiceEmails = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkSendInvoiceEmailsRequest) => {
      const {
        invoiceIds,
        recipients,
        cc = [],
        bcc = [],
        subject,
        message,
        includePDF,
        includeExcel,
        dealershipId,
      } = request;

      // Get authenticated user for RLS policy compliance
      const { data: user } = await supabase.auth.getUser();

      // Fetch all invoices with their details (using alias for dealership)
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          dealership:dealerships(*)
        `)
        .in('id', invoiceIds);

      if (fetchError) throw fetchError;
      if (!invoices || invoices.length === 0) {
        throw new Error('No invoices found');
      }

      // Generate attachments for all invoices
      const attachments: EmailAttachment[] = [];
      const processingErrors: string[] = [];

      // Process each invoice - fetch items and generate PDFs/Excel
      for (const invoiceData of invoices) {
        try {
          // Get invoice items with order info using RPC (same as single email hook)
          const { data: itemsData, error: itemsError } = await supabase
            .rpc('get_invoice_items_with_order_info', { p_invoice_id: invoiceData.id });

          if (itemsError) {
            throw new Error(`Failed to fetch items: ${itemsError.message}`);
          }

          // Combine invoice with items (same structure as single email hook)
          const invoice = {
            ...invoiceData,
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
              total_amount: parseFloat(item.total_amount),
              serviceReference: item.service_reference,
              sortOrder: item.sort_order,
              isPaid: item.is_paid || false,
              metadata: {
                ...(item.metadata || {}),
                order_number: item.order_number,
                order_type: item.order_type,
                po: item.po,
                ro: item.ro,
                tag: item.tag,
                service_names: item.service_names,
                vehicle_vin: item.metadata?.vehicle_vin,
                stock_number: item.metadata?.stock_number,
                due_date: item.metadata?.due_date,
                completed_at: item.metadata?.completed_at,
                completed_date: item.metadata?.completed_date,
              },
              createdAt: item.created_at,
              created_at: item.created_at,
              updatedAt: item.updated_at
            }))
          };

          // Generate PDF if requested
          if (includePDF) {
            const { blob: pdfBlob, filename: pdfFilename } = await generateInvoicePDFBlob(invoice as any);
            const pdfArrayBuffer = await pdfBlob.arrayBuffer();
            const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

            attachments.push({
              filename: pdfFilename,
              content: pdfBase64,
              content_type: 'application/pdf',
            });
          }

          // Generate Excel if requested
          if (includeExcel) {
            const { blob: excelBlob, filename: excelFilename } = await generateInvoiceExcelBlob(invoice as any);
            const excelArrayBuffer = await excelBlob.arrayBuffer();
            const excelBase64 = arrayBufferToBase64(excelArrayBuffer);

            attachments.push({
              filename: excelFilename,
              content: excelBase64,
              content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
          }
        } catch (error) {
          const invoiceNum = invoiceData.invoiceNumber || invoiceData.invoice_number || 'Unknown';
          console.error(`Error processing invoice ${invoiceNum}:`, error);
          processingErrors.push(`Invoice ${invoiceNum}: ${error.message}`);
        }
      }

      // If we have processing errors but some attachments, continue
      // If we have no attachments at all, throw an error
      if (attachments.length === 0) {
        throw new Error(
          processingErrors.length > 0
            ? `Failed to generate attachments: ${processingErrors.join(', ')}`
            : 'No attachments generated'
        );
      }

      // Send the email with all attachments via Edge Function
      // Edge Function will create the email history record (bypassing RLS)
      const { data: emailData, error: sendError } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoice_id: invoiceIds[0], // Primary invoice for reference
          dealership_id: dealershipId,
          sent_by: user.user?.id, // Pass user ID for tracking
          recipients,
          reply_to: user.user?.email,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          message,
          include_pdf: includePDF,
          include_excel: includeExcel,
          attachments,
          metadata: {
            bulk_send: true,
            invoice_ids: invoiceIds,
            total_invoices: invoices.length,
            total_amount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
            attachment_count: attachments.length,
            processing_errors: processingErrors,
          },
        },
      });

      if (sendError) throw sendError;

      return {
        success: true,
        email_history_id: emailData?.email_history_id,
        invoiceCount: invoices.length,
        attachmentCount: attachments.length,
        processingErrors,
        email_id: emailData?.email_id,
      };
    },

    onSuccess: () => {
      // Invalidate email history queries to show the new email
      queryClient.invalidateQueries({ queryKey: ['invoice-email-history'] });
      queryClient.invalidateQueries({ queryKey: ['dealership-email-history'] });
    },

    onError: (error) => {
      console.error('Failed to send bulk invoice emails:', error);
    },
  });
};