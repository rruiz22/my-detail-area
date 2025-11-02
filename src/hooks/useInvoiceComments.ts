import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { InvoiceComment } from '@/types/invoices';

export const useInvoiceComments = (invoiceId: string) => {
  return useQuery({
    queryKey: ['invoice-comments', invoiceId],
    queryFn: async () => {
      // Get comments
      const { data: comments, error } = await supabase
        .from('invoice_comments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(comments.map(c => c.user_id).filter(Boolean))];

      // Fetch user data
      let users: any[] = [];
      if (userIds.length > 0) {
        const { data: userData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        users = userData || [];
      }

      // Map users to comments
      return comments.map(record => ({
        id: record.id,
        invoice_id: record.invoice_id,
        dealership_id: record.dealership_id,
        user_id: record.user_id,
        comment: record.comment,
        is_internal: record.is_internal,
        is_edited: record.is_edited,
        created_at: record.created_at,
        updated_at: record.updated_at,
        user: users.find(u => u.id === record.user_id),
      })) as InvoiceComment[];
    },
    enabled: !!invoiceId,
  });
};

export const useAddInvoiceComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      invoice_id: string;
      dealership_id: number;
      comment: string;
      is_internal: boolean;
    }) => {
      const { data: result, error } = await supabase
        .from('invoice_comments')
        .insert([{
          invoice_id: data.invoice_id,
          dealership_id: data.dealership_id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
          comment: data.comment,
          is_internal: data.is_internal,
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-comments', variables.invoice_id] });
      toast({
        title: 'Comment Added',
        description: 'Your comment has been added successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add comment',
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateInvoiceComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; comment: string; invoice_id: string }) => {
      const { data: result, error } = await supabase
        .from('invoice_comments')
        .update({ comment: data.comment })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-comments', variables.invoice_id] });
      toast({
        title: 'Comment Updated',
        description: 'Your comment has been updated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update comment',
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteInvoiceComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; invoice_id: string }) => {
      const { error } = await supabase
        .from('invoice_comments')
        .delete()
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoice-comments', variables.invoice_id] });
      toast({
        title: 'Comment Deleted',
        description: 'The comment has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete comment',
        variant: 'destructive',
      });
    },
  });
};
