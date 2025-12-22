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

        // Fetch comments first
        const { data: commentsData, error: commentsError } = await supabase
          .from('order_comments')
          .select('id, comment_text, created_at, user_id')
          .eq('order_id', orderId)
          .eq('comment_type', 'public')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (commentsError) {
          logger.error('Failed to fetch recent comments', commentsError, { orderId });
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
        const comments: RecentComment[] = commentsData.map(comment => {
          const profile = profileMap.get(comment.user_id);
          return {
            id: comment.id,
            comment_text: comment.comment_text,
            created_at: comment.created_at,
            user_id: comment.user_id,
            user_first_name: profile?.first_name || '',
            user_last_name: profile?.last_name || '',
            user_email: profile?.email || '',
            avatar_seed: profile?.avatar_seed
          };
        });

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
