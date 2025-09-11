import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { shortLinkService } from '@/services/shortLinkService';

interface OrderAttachment {
  id: string;
  order_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  upload_context: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface OrderActivity {
  id: string;
  order_id: string;
  action: string;
  description: string;
  user_id: string;
  created_at: string;
  user_name?: string;
}

interface OrderComment {
  id: string;
  order_id: string;
  comment: string;
  is_internal: boolean;
  created_by: string;
  created_at: string;
  user_name?: string;
}

interface OrderFollower {
  id: string;
  order_id: string;
  user_id: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

interface OrderModalData {
  attachments: OrderAttachment[];
  activities: OrderActivity[];
  comments: OrderComment[];
  followers: OrderFollower[];
  analytics: any;
  userType: 'detail' | 'regular' | null;
}

interface UseOrderModalDataProps {
  orderId: string | null;
  qrSlug?: string;
  enabled?: boolean; // Only fetch when modal is open
}

export function useOrderModalData({ orderId, qrSlug, enabled = true }: UseOrderModalDataProps) {
  const [data, setData] = useState<OrderModalData>({
    attachments: [],
    activities: [],
    comments: [],
    followers: [],
    analytics: null,
    userType: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parallel data fetching function
  const fetchModalData = useCallback(async () => {
    if (!orderId || !enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel for maximum performance
      // Note: Only fetch from tables that actually exist in the database
      const [
        attachmentsResult,
        commentsResult,
        userResult,
        analyticsResult
      ] = await Promise.allSettled([
        // Fetch attachments
        supabase
          .from('order_attachments')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .then(result => result.error ? { data: [], error: null } : result), // Graceful fallback
        
        // Fetch comments with user names - fetch separately to avoid join issues
        supabase
          .from('order_comments')
          .select('*')
          .eq('order_id', orderId)
          .order('created_at', { ascending: false })
          .then(result => result.error ? { data: [], error: null } : result), // Graceful fallback
        
        // Check user type
        supabase.auth.getUser().then(async ({ data: user }) => {
          if (!user.user) return null;
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_type')
            .eq('id', user.user.id)
            .single();
          
          return profile?.user_type || 'regular';
        }),
        
        // Fetch QR analytics if slug exists
        qrSlug ? shortLinkService.getAnalytics(qrSlug).catch(() => null) : Promise.resolve(null)
      ]);

      // Process results, handling any failures gracefully
      const newData: OrderModalData = {
        attachments: attachmentsResult.status === 'fulfilled' && !attachmentsResult.value.error 
          ? attachmentsResult.value.data || [] 
          : [],
        
        // Set empty arrays for non-existent tables for now
        activities: [],
        
        comments: commentsResult.status === 'fulfilled' && !commentsResult.value.error
          ? (commentsResult.value.data || []).map((comment: any) => ({
              ...comment,
              user_name: 'System User' // We'll fetch user names separately later
            }))
          : [],
        
        // Set empty array for non-existent followers table for now
        followers: [],
        
        userType: userResult.status === 'fulfilled' 
          ? userResult.value as 'detail' | 'regular' | null
          : null,
        
        analytics: analyticsResult.status === 'fulfilled' 
          ? analyticsResult.value 
          : null
      };

      setData(newData);
      
      // Log any failed requests for debugging
      const failures = [attachmentsResult, commentsResult, userResult, analyticsResult]
        .filter(result => result.status === 'rejected')
        .map(result => (result as PromiseRejectedResult).reason);
      
      if (failures.length > 0) {
        console.warn('Some modal data requests failed:', failures);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch modal data';
      setError(errorMessage);
      console.error('Modal data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, qrSlug, enabled]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchModalData();
  }, [fetchModalData]);

  // Individual update functions for optimistic updates
  const addAttachment = useCallback((attachment: OrderAttachment) => {
    setData(prev => ({
      ...prev,
      attachments: [attachment, ...prev.attachments]
    }));
  }, []);

  const removeAttachment = useCallback((attachmentId: string) => {
    setData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }));
  }, []);

  const addComment = useCallback((comment: OrderComment) => {
    setData(prev => ({
      ...prev,
      comments: [comment, ...prev.comments]
    }));
  }, []);

  const addActivity = useCallback((activity: OrderActivity) => {
    setData(prev => ({
      ...prev,
      activities: [activity, ...prev.activities]
    }));
  }, []);

  const updateAnalytics = useCallback((analytics: any) => {
    setData(prev => ({
      ...prev,
      analytics
    }));
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchModalData,
    // Optimistic update functions
    addAttachment,
    removeAttachment,
    addComment,
    addActivity,
    updateAnalytics
  };
}