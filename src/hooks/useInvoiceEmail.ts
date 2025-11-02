// =====================================================
// USE INVOICE EMAIL HOOK
// Created: 2025-11-03
// Description: Send invoice emails and track history
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EmailHistory, SendInvoiceEmailRequest, EmailAttachmentData } from '@/types/email';
import type { InvoiceWithDetails } from '@/types/invoices';
import { useToast } from '@/hooks/use-toast';
import { generateInvoicePDFBlob } from '@/utils/generateInvoicePDFBlob';
import { generateInvoiceExcelBlob } from '@/utils/generateInvoiceExcelBlob';
import { useInvoice } from '@/hooks/useInvoices';

// =====================================================
// QUERY: Get email history for an invoice
// =====================================================
export const useInvoiceEmailHistory = (invoiceId: string | null) => {
  return useQuery({
    queryKey: ['invoice-email-history', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];

      const { data, error } = await supabase
        .from('invoice_email_history')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      return data as EmailHistory[];
    },
    enabled: !!invoiceId,
  });
};

// =====================================================
// QUERY: Get all email history for a dealership
// =====================================================
export const useDealershipEmailHistory = (dealershipId: number | null, limit = 50) => {
  return useQuery({
    queryKey: ['dealership-email-history', dealershipId, limit],
    queryFn: async () => {
      if (!dealershipId) return [];

      const { data, error } = await supabase
        .from('invoice_email_history')
        .select('*')
        .eq('dealership_id', dealershipId)
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as EmailHistory[];
    },
    enabled: !!dealershipId,
  });
};

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

// =====================================================
// MUTATION: Send invoice email
// =====================================================
export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (request: SendInvoiceEmailRequest) => {
      const { data: user } = await supabase.auth.getUser();

      // Fetch full invoice details for attachment generation
      const { data: invoice } = await supabase
        .from('invoices')
        .select(`
          *,
          dealership:dealerships(*),
          items:invoice_items(*)
        `)
        .eq('id', request.invoice_id)
        .single();

      if (!invoice) throw new Error('Invoice not found');

      // Generate attachments if requested
      const attachments: EmailAttachmentData[] = [];

      if (request.include_pdf) {
        try {
          const { blob: pdfBlob, filename: pdfFilename } = await generateInvoicePDFBlob(invoice as any);
          const pdfBuffer = await pdfBlob.arrayBuffer();
          const pdfBase64 = arrayBufferToBase64(pdfBuffer);

          attachments.push({
            filename: pdfFilename,
            content: pdfBase64,
            content_type: 'application/pdf'
          });
        } catch (error) {
          console.error('Error generating PDF:', error);
        }
      }

      if (request.include_excel) {
        try {
          const { blob: excelBlob, filename: excelFilename } = await generateInvoiceExcelBlob(invoice as any);
          const excelBuffer = await excelBlob.arrayBuffer();
          const excelBase64 = arrayBufferToBase64(excelBuffer);

          attachments.push({
            filename: excelFilename,
            content: excelBase64,
            content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          });
        } catch (error) {
          console.error('Error generating Excel:', error);
        }
      }

      // Create email history record
      const { data: historyRecord, error: historyError } = await supabase
        .from('invoice_email_history')
        .insert({
          invoice_id: request.invoice_id,
          dealership_id: request.dealership_id,
          sent_to: request.recipients,
          cc: request.cc,
          bcc: request.bcc,
          subject: request.subject || `Invoice ${request.invoice_id}`,
          message: request.message,
          sent_by: user.user?.id,
          status: 'pending',
          attachments: attachments.map(att => ({
            filename: att.filename,
            size: Math.round(att.content.length * 0.75) // Approximate size from base64
          })),
        })
        .select()
        .single();

      if (historyError) throw historyError;

      try {
        // Call Edge Function to send the email
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-invoice-email', {
          body: {
            ...request,
            email_history_id: historyRecord.id,
            attachments
          }
        });

        if (emailError) throw emailError;

        return {
          success: true,
          email_history_id: historyRecord.id,
          message: 'Email sent successfully',
          email_id: emailResult?.email_id,
        };
      } catch (error: any) {
        // Update history with error
        await supabase
          .from('invoice_email_history')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', historyRecord.id);

        throw error;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-email-history', variables.invoice_id] });
      queryClient.invalidateQueries({ queryKey: ['dealership-email-history', variables.dealership_id] });
      toast({
        title: 'Success',
        description: 'Invoice email sent successfully',
      });
    },
    onError: (error: any) => {
      console.error('Error sending invoice email:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice email',
        variant: 'destructive',
      });
    },
  });
};
