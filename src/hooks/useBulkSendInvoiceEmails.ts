// =====================================================
// BULK SEND INVOICE EMAILS HOOK
// Created: 2025-12-17
// Description: Hook for sending multiple invoices in a single email
// =====================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { generateInvoicePDFBlob } from '@/utils/generateInvoicePDFBlob';
import { generateInvoiceExcelBlob } from '@/utils/generateInvoiceExcelBlob';
import { useAuth } from '@/contexts/AuthContext';
import type { Invoice } from '@/types/invoices';

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
  const { user } = useAuth();

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

      // Fetch all invoices with their details
      const { data: invoices, error: fetchError } = await supabase
        .from('invoices')
        .select(`
          *,
          dealership:dealerships(id, name),
          payments:invoice_payments(*)
        `)
        .in('id', invoiceIds);

      if (fetchError) throw fetchError;
      if (!invoices || invoices.length === 0) {
        throw new Error('No invoices found');
      }

      // Generate attachments for all invoices
      const attachments: EmailAttachment[] = [];
      const processingErrors: string[] = [];

      // Process each invoice
      for (const invoice of invoices) {
        try {
          // Generate PDF if requested
          if (includePDF) {
            const { blob: pdfBlob, filename: pdfFilename } = await generateInvoicePDFBlob(invoice.id);
            const pdfArrayBuffer = await pdfBlob.arrayBuffer();
            const pdfBase64 = btoa(
              String.fromCharCode(...new Uint8Array(pdfArrayBuffer))
            );

            attachments.push({
              filename: pdfFilename,
              content: pdfBase64,
              content_type: 'application/pdf',
            });
          }

          // Generate Excel if requested
          if (includeExcel) {
            const { blob: excelBlob, filename: excelFilename } = await generateInvoiceExcelBlob(invoice.id);
            const excelArrayBuffer = await excelBlob.arrayBuffer();
            const excelBase64 = btoa(
              String.fromCharCode(...new Uint8Array(excelArrayBuffer))
            );

            attachments.push({
              filename: excelFilename,
              content: excelBase64,
              content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
          }
        } catch (error) {
          console.error(`Error processing invoice ${invoice.invoiceNumber}:`, error);
          processingErrors.push(`Invoice ${invoice.invoiceNumber}: ${error.message}`);
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
      const { data: emailData, error: sendError } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoice_id: invoiceIds[0], // Use first invoice ID for tracking
          dealership_id: dealershipId,
          recipients,
          reply_to: user?.email,
          cc: cc.length > 0 ? cc : undefined,
          bcc: bcc.length > 0 ? bcc : undefined,
          subject,
          message,
          attachments,
          metadata: {
            bulk_send: true,
            invoice_ids: invoiceIds,
            total_invoices: invoices.length,
            attachment_count: attachments.length,
            processing_errors: processingErrors,
          },
        },
      });

      if (sendError) throw sendError;

      // Create email history record for tracking
      const { error: historyError } = await supabase.from('invoice_email_history').insert({
        invoice_id: invoiceIds[0], // Primary invoice for reference
        dealership_id: dealershipId,
        sent_by: user?.id,
        sent_to: recipients,
        cc: cc.length > 0 ? cc : null,
        bcc: bcc.length > 0 ? bcc : null,
        subject,
        message,
        attachments: attachments.map(a => ({
          filename: a.filename,
          size: Math.ceil(a.content.length * 0.75), // Approximate size from base64
        })),
        status: 'sent',
        provider_response: emailData,
        metadata: {
          bulk_send: true,
          invoice_ids: invoiceIds,
          total_invoices: invoices.length,
          total_amount: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        },
      });

      if (historyError) {
        console.error('Failed to save email history:', historyError);
        // Don't throw - email was sent successfully
      }

      return {
        success: true,
        invoiceCount: invoices.length,
        attachmentCount: attachments.length,
        processingErrors,
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