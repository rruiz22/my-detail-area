// =====================================================
// INVOICE TAGS HOOKS
// Created: 2024-12-04
// Description: Hooks para gestionar tags de invoices
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InvoiceTag } from '@/types/invoices';
import { toast } from 'sonner';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

// =====================================================
// QUERY: Get tags for a specific invoice
// =====================================================
export function useInvoiceTags(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-tags', invoiceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_invoice_tags', { p_invoice_id: invoiceId });

      if (error) {
        console.error('Error fetching invoice tags:', error);
        throw error;
      }

      // Transform snake_case to camelCase
      return (data || []).map((tag: any) => ({
        id: tag.id,
        tagName: tag.tag_name,
        colorIndex: tag.color_index,
      })) as InvoiceTag[];
    },
    staleTime: CACHE_TIMES.SHORT, // 1 minute
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
    enabled: !!invoiceId,
  });
}

// =====================================================
// QUERY: Get suggested tags for a dealer (most used)
// =====================================================
export function useSuggestedTags(dealerId: number, options?: { limit?: number }) {
  return useQuery({
    queryKey: ['suggested-tags', dealerId, options?.limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_suggested_tags', {
          p_dealer_id: dealerId,
          p_limit: options?.limit || 20
        });

      if (error) {
        console.error('Error fetching suggested tags:', error);
        throw error;
      }

      // Transform snake_case to camelCase
      return (data || []).map((tag: any) => ({
        id: tag.id,
        tagName: tag.tag_name,
        colorIndex: tag.color_index,
        usageCount: tag.usage_count,
      })) as InvoiceTag[];
    },
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.LONG, // 30 minutes
    enabled: !!dealerId,
  });
}

// =====================================================
// QUERY: Get all tags summary for a dealer
// =====================================================
export function useDealerTagsSummary(dealerId: number) {
  return useQuery({
    queryKey: ['dealer-tags-summary', dealerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_dealer_tags_summary', { p_dealer_id: dealerId });

      if (error) {
        console.error('Error fetching dealer tags summary:', error);
        throw error;
      }

      // Transform snake_case to camelCase
      return (data || []).map((tag: any) => ({
        id: tag.id,
        tagName: tag.tag_name,
        colorIndex: tag.color_index,
        usageCount: tag.usage_count,
        invoiceCount: tag.invoice_count,
      }));
    },
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.LONG, // 30 minutes
    enabled: !!dealerId,
  });
}

// =====================================================
// MUTATION: Update invoice tags
// =====================================================
export function useUpdateInvoiceTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      dealerId,
      tagNames,
    }: {
      invoiceId: string;
      dealerId: number;
      tagNames: string[];
    }) => {
      // Validate inputs
      if (!invoiceId || !dealerId) {
        throw new Error('Invoice ID and Dealer ID are required');
      }

      // Validate tag names (max 10 tags, max 30 characters each)
      if (tagNames.length > 10) {
        throw new Error('Maximum 10 tags allowed per invoice');
      }

      const invalidTags = tagNames.filter(name => name.length > 30);
      if (invalidTags.length > 0) {
        throw new Error(`Tag names must be 30 characters or less: ${invalidTags.join(', ')}`);
      }

      // Remove duplicates and empty strings
      const cleanedTagNames = Array.from(
        new Set(
          tagNames
            .map(name => name.trim())
            .filter(name => name.length > 0)
        )
      );

      const { error } = await supabase.rpc('update_invoice_tags', {
        p_invoice_id: invoiceId,
        p_dealer_id: dealerId,
        p_tag_names: cleanedTagNames,
      });

      if (error) {
        console.error('Error updating invoice tags:', error);
        throw error;
      }

      return { invoiceId, tagNames: cleanedTagNames };
    },
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoice-tags', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['suggested-tags', variables.dealerId] });
      queryClient.invalidateQueries({ queryKey: ['dealer-tags-summary', variables.dealerId] });

      toast.success('Tags updated successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to update invoice tags:', error);
      toast.error(error.message || 'Failed to update tags');
    },
  });
}

// =====================================================
// MUTATION: Delete tag from invoice
// =====================================================
export function useDeleteInvoiceTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      invoiceId,
      tagId,
    }: {
      invoiceId: string;
      tagId: string;
    }) => {
      const { error } = await supabase
        .from('invoice_tag_relations')
        .delete()
        .eq('invoice_id', invoiceId)
        .eq('tag_id', tagId);

      if (error) {
        console.error('Error deleting invoice tag:', error);
        throw error;
      }

      return { invoiceId, tagId };
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['invoice-tags', data.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', data.invoiceId] });

      toast.success('Tag removed successfully');
    },
    onError: (error: Error) => {
      console.error('Failed to delete invoice tag:', error);
      toast.error('Failed to remove tag');
    },
  });
}
