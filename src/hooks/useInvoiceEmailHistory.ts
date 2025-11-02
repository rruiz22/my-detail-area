import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceEmailHistory } from '@/types/invoices';

export const useInvoiceEmailHistory = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice-email-history', invoiceId],
    queryFn: async () => {
      // Get email history
      const { data: emailHistory, error } = await supabase
        .from('invoice_email_history')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('sent_at', { ascending: false });

      if (error) throw error;
      if (!emailHistory || emailHistory.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(emailHistory.map(e => e.sent_by).filter(Boolean))];

      // Fetch user data if there are any user IDs
      let users: any[] = [];
      if (userIds.length > 0) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        users = userData || [];
      }

      // Map users to email history
      return emailHistory.map(record => ({
        id: record.id,
        invoice_id: record.invoice_id,
        dealership_id: record.dealership_id,
        sent_to: record.sent_to,
        cc: record.cc,
        bcc: record.bcc,
        subject: record.subject,
        message: record.message,
        attachments: record.attachments,
        sent_at: record.sent_at,
        sent_by: record.sent_by,
        status: record.status,
        error_message: record.error_message,
        provider_response: record.provider_response,
        metadata: record.metadata,
        sent_by_user: record.sent_by ? users.find(u => u.id === record.sent_by) : undefined,
      })) as InvoiceEmailHistory[];
    },
    enabled: !!invoiceId,
  });
};
