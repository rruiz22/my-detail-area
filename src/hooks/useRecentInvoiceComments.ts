import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface RecentInvoiceComment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  avatar_seed?: string;
}

interface UseRecentInvoiceCommentsOptions {
  invoiceId: string;
  limit?: number;
  enabled?: boolean;
}

export const useRecentInvoiceComments = ({
  invoiceId,
  limit = 3,
  enabled = true
}: UseRecentInvoiceCommentsOptions) => {
  return useQuery({
    queryKey: ['invoice-comments-preview', invoiceId, limit],
    queryFn: async () => {
      try {
        logger.dev('Fetching recent invoice comments preview', { invoiceId, limit });

        // Fetch comments first
        const { data: commentsData, error: commentsError } = await supabase
          .from('invoice_comments')
          .select('id, comment, created_at, user_id')
          .eq('invoice_id', invoiceId)
          .order('created_at', { ascending: false })
          .limit(limit);

        if (commentsError) {
          logger.error('Failed to fetch recent invoice comments', commentsError, { invoiceId });
          throw commentsError;
        }

        if (!commentsData || commentsData.length === 0) {
          return [];
        }

        // Fetch profiles separately - Use RPC to bypass RLS caching issue
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: allProfiles } = await supabase.rpc('get_dealer_user_profiles');
        const profilesData = allProfiles?.filter(p => userIds.includes(p.id));

        // Create profile map
        const profileMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );

        // Transform data to flat structure
        const comments: RecentInvoiceComment[] = commentsData.map(comment => {
          const profile = profileMap.get(comment.user_id);
          return {
            id: comment.id,
            comment_text: comment.comment,
            created_at: comment.created_at,
            user_id: comment.user_id,
            user_first_name: profile?.first_name || '',
            user_last_name: profile?.last_name || '',
            user_email: profile?.email || '',
            avatar_seed: profile?.avatar_seed
          };
        });

        logger.dev('Recent invoice comments fetched', { count: comments.length });
        return comments;
      } catch (error) {
        logger.error('Error in useRecentInvoiceComments', error, { invoiceId });
        return [];
      }
    },
    enabled: enabled && !!invoiceId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};
