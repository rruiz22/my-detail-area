import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface RecentComment {
  id: string;
  comment_text: string;
  created_at: string;
  user_id: string;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  avatar_seed?: string;
}

interface UseRecentCommentsOptions {
  orderId: string;
  limit?: number;
  enabled?: boolean;
}

export const useRecentComments = ({
  orderId,
  limit = 3,
  enabled = true
}: UseRecentCommentsOptions) => {
  return useQuery({
    queryKey: ['comments-preview', orderId, limit],
    queryFn: async () => {
      try {
        logger.dev('Fetching recent comments preview', { orderId, limit });

        const { data, error } = await supabase
          .from('order_comments')
          .select(`
            id,
            comment_text,
            created_at,
            user_id,
            profiles!inner (
              first_name,
              last_name,
              email,
              avatar_seed
            )
          `)
          .eq('order_id', orderId)
          .eq('comment_type', 'public')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          logger.error('Failed to fetch recent comments', error, { orderId });
          throw error;
        }

        // Transform data to flat structure
        const comments: RecentComment[] = (data || []).map(comment => ({
          id: comment.id,
          comment_text: comment.comment_text,
          created_at: comment.created_at,
          user_id: comment.user_id,
          user_first_name: (comment.profiles as any)?.first_name || '',
          user_last_name: (comment.profiles as any)?.last_name || '',
          user_email: (comment.profiles as any)?.email || '',
          avatar_seed: (comment.profiles as any)?.avatar_seed
        }));

        logger.dev('Recent comments fetched', { count: comments.length });
        return comments;
      } catch (error) {
        logger.error('Error in useRecentComments', error, { orderId });
        return [];
      }
    },
    enabled: enabled && !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
};
