/**
 * Order Modal Data Hook - Simplified Polling Version
 *
 * Replacement for complex useRealtimeOrderData.ts with simple, efficient polling.
 * Uses smart polling instead of 4 separate real-time subscriptions for modal data.
 */

import { useOrderDetailsPolling } from '@/hooks/useSmartPolling';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

// Import comprehensive order types for consistency
import type {
    OrderActivity,
    OrderAttachment,
    OrderComment,
    OrderFollower,
    OrderModalData,
    QRAnalytics
} from '@/types/order';

// Re-export types for backward compatibility
export type {
    OrderActivity, OrderAttachment, OrderComment,
    OrderFollower,
    OrderModalData,
    QRAnalytics
};

interface UseOrderModalDataProps {
  orderId: string | null;
  qrCodeUrl?: string;
  qrSlug?: string;
  enabled?: boolean;
}

/**
 * Simplified order modal data fetching with smart polling
 * Replaces the complex 493-line useRealtimeOrderData hook
 */
export const useOrderModalData = ({
  orderId,
  qrSlug,
  enabled = true
}: UseOrderModalDataProps) => {

  // Fetch all modal data in a single optimized query
  const fetchModalData = useCallback(async (): Promise<OrderModalData> => {
    if (!orderId) {
      return {
        attachments: [],
        comments: [],
        activities: [],
        followers: [],
        analytics: null,
        userType: null
      };
    }

    try {
      console.log(`🔄 Fetching modal data for order ${orderId}`);

      // Parallel queries for better performance
      const [attachmentsResult, commentsResult, activitiesResult, followersResult] = await Promise.all([
        // Attachments
        supabase
          .from('order_attachments')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }),

        // Comments with user profiles
        supabase
          .from('order_comments')
          .select(`
            *,
            profiles:created_by (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false }),

        // Recent activities
        supabase
          .from('order_activities')
          .select(`
            *,
            profiles:created_by (
              id,
              first_name,
              last_name
            )
          `)
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .limit(20),

        // Followers
        supabase
          .from('order_followers')
          .select(`
            *,
            profiles:user_id (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .eq('order_id', orderId)
      ]);

      // Simple analytics if QR slug available
      let analytics = null;
      if (qrSlug) {
        const { data: analyticsData } = await supabase
          .from('qr_analytics')
          .select('*')
          .eq('slug', qrSlug)
          .single();

        analytics = analyticsData;
      }

      return {
        attachments: attachmentsResult.data || [],
        comments: commentsResult.data || [],
        activities: activitiesResult.data || [],
        followers: followersResult.data || [],
        analytics,
        userType: 'detail'
      };

    } catch (error) {
      console.error('Error fetching modal data:', error);
      return {
        attachments: [],
        comments: [],
        activities: [],
        followers: [],
        analytics: null,
        userType: null
      };
    }
  }, [orderId, qrSlug]);

  // Use smart polling for modal data (30s when modal open)
  const query = useOrderDetailsPolling(
    ['order-modal-data', orderId || ''],
    fetchModalData,
    enabled && !!orderId
  );

  // Optimistic update functions for immediate UI feedback
  const addAttachment = useCallback((newAttachment: OrderAttachment) => {
    console.log('📎 Optimistic attachment add:', newAttachment.file_name);

    // Trigger refresh to get updated data
    query.refetch();
  }, [query]);

  const removeAttachment = useCallback((attachmentId: string) => {
    console.log('🗑️ Optimistic attachment remove:', attachmentId);

    // Trigger refresh to get updated data
    query.refetch();
  }, [query]);

  const addComment = useCallback((newComment: OrderComment) => {
    console.log('💬 Optimistic comment add');

    // Trigger refresh to get updated data
    query.refetch();
  }, [query]);

  return {
    data: query.data || {
      attachments: [],
      comments: [],
      activities: [],
      followers: [],
      analytics: null,
      userType: null
    },
    loading: query.isLoading,
    error: query.error?.message || null,
    addAttachment,
    removeAttachment: removeAttachment,
    addComment,
    refetch: query.refetch,
    forceRefresh: query.refetch,
    clearCache: () => {
      console.log('🧹 Cache cleared (polling-based system)');
    },
    getCacheSize: () => 0
  };
};
