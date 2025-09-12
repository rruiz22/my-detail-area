import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { shortLinkService } from '@/services/shortLinkService';
import { usePerformanceMonitor } from './usePerformanceMonitor';

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
  qrCodeUrl?: string;
  qrSlug?: string;
  enabled?: boolean; // Only fetch when modal is open
}

// Enhanced cache implementation with TTL and memory management
class OrderModalCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 50; // Prevent memory leaks

  set(key: string, data: any, ttl = this.DEFAULT_TTL) {
    // Implement LRU-style eviction
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }
}

// Global cache instance
const modalDataCache = new OrderModalCache();

// Request deduplication
const activeRequests = new Map<string, Promise<any>>();

export function useOrderModalData({ orderId, qrCodeUrl, enabled = true }: UseOrderModalDataProps) {
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
  const { startMeasure, endMeasure, recordMetric } = usePerformanceMonitor();
  const abortControllerRef = useRef<AbortController | null>(null);

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
        
        // Fetch QR analytics if qrCodeUrl exists
        qrCodeUrl ? (() => {
          const slug = qrCodeUrl.split('/').pop();
          return slug ? shortLinkService.getAnalytics(slug).catch(() => null) : null;
        })() : Promise.resolve(null)
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
  }, [orderId, qrCodeUrl, enabled]);

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

  // Additional cache management functions
  const forceRefresh = useCallback(async () => {
    if (orderId) {
      modalDataCache.clear();
      await fetchModalData();
    }
  }, [orderId, fetchModalData]);

  const clearCache = useCallback(() => {
    modalDataCache.clear();
  }, []);

  const getCacheSize = useCallback(() => {
    return modalDataCache.getSize();
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchModalData,
    forceRefresh,
    clearCache,
    getCacheSize,
    // Optimistic update functions
    addAttachment,
    removeAttachment,
    addComment,
    addActivity,
    updateAnalytics
  };
}