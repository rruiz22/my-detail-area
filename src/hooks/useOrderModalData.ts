import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { shortLinkService } from '@/services/shortLinkService';
import { usePerformanceMonitor } from './usePerformanceMonitor';
import { supabaseQueryOptimizer } from '@/services/supabaseQueryOptimizer';
import { useRealtimeOrderData } from './useRealtimeOrderData';

// Import comprehensive order types for consistency
import type {
  OrderAttachment,
  OrderActivity,
  OrderComment,
  OrderFollower,
  OrderModalData,
  QRAnalytics
} from '@/types/order';

// Re-export types for backward compatibility
export type {
  OrderAttachment,
  OrderActivity,
  OrderComment,
  OrderFollower,
  OrderModalData,
  QRAnalytics
};

interface UseOrderModalDataProps {
  orderId: string | null;
  qrCodeUrl?: string;
  qrSlug?: string;
  enabled?: boolean; // Only fetch when modal is open
}

// Performance optimized cache with intelligent invalidation
class OptimizedOrderModalCache {
  private cache = new Map<string, {
    data: OrderModalData;
    timestamp: number;
    ttl: number;
    accessCount: number;
    lastAccessed: number;
  }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STALE_TTL = 15 * 60 * 1000; // 15 minutes for stale-while-revalidate
  private readonly MAX_CACHE_SIZE = 100; // Increased for better hit rate
  private readonly CLEANUP_INTERVAL = 2 * 60 * 1000; // 2 minutes cleanup
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    this.startCleanupTimer();
  }

  private startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  private cleanup() {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());

    // Remove expired entries
    entries.forEach(([key, entry]) => {
      if (now - entry.timestamp > this.STALE_TTL) {
        this.cache.delete(key);
      }
    });

    // If still over limit, remove least recently accessed
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key)) // Still exists after cleanup
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

      const toRemove = sortedEntries.slice(0, sortedEntries.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  set(key: string, data: OrderModalData, ttl = this.DEFAULT_TTL) {
    // Ensure we don't exceed cache size before adding
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.cleanup();
    }

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone to prevent mutations
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccessed: Date.now()
    });
  }

  get(key: string): { data: OrderModalData; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = now;

    // Check if expired
    if (age > this.STALE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Return with staleness indicator for stale-while-revalidate
    const isStale = age > entry.ttl;
    return { data: entry.data, isStale };
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  getSize() {
    return this.cache.size;
  }

  getStats() {
    const entries = Array.from(this.cache.values());
    return {
      size: this.cache.size,
      totalAccesses: entries.reduce((sum, entry) => sum + entry.accessCount, 0),
      averageAge: entries.reduce((sum, entry) => sum + (Date.now() - entry.timestamp), 0) / entries.length,
      oldestEntry: Math.max(...entries.map(entry => Date.now() - entry.timestamp))
    };
  }

  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Global cache instance with better memory management
const modalDataCache = new OptimizedOrderModalCache();

// Enhanced request deduplication with timeout handling
class RequestDeduplicator {
  private activeRequests = new Map<string, {
    promise: Promise<OrderModalData>;
    timestamp: number;
    abortController: AbortController;
  }>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds

  async execute<T>(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    forceRefresh = false
  ): Promise<T> {
    // Clean up expired requests
    this.cleanup();

    const existing = this.activeRequests.get(key);
    if (existing && !forceRefresh) {
      return existing.promise as Promise<T>;
    }

    // Cancel existing request if force refresh
    if (existing && forceRefresh) {
      existing.abortController.abort();
      this.activeRequests.delete(key);
    }

    const abortController = new AbortController();
    const promise = fetcher(abortController.signal);

    this.activeRequests.set(key, {
      promise: promise as Promise<OrderModalData>,
      timestamp: Date.now(),
      abortController
    });

    // Clean up on completion
    promise.finally(() => {
      this.activeRequests.delete(key);
    });

    return promise;
  }

  private cleanup() {
    const now = Date.now();
    this.activeRequests.forEach((request, key) => {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        request.abortController.abort();
        this.activeRequests.delete(key);
      }
    });
  }

  cancelAll() {
    this.activeRequests.forEach(request => {
      request.abortController.abort();
    });
    this.activeRequests.clear();
  }

  getActiveCount() {
    return this.activeRequests.size;
  }
}

const requestDeduplicator = new RequestDeduplicator();

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
  const [cacheHit, setCacheHit] = useState(false);
  const [staleCacheHit, setStaleCacheHit] = useState(false);
  const { startMeasure, endMeasure, recordMetric } = usePerformanceMonitor();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Set up real-time subscriptions using the specialized hook
  const realtimeHandlers = useMemo(() => ({
    onAttachmentChange: (attachment: OrderAttachment, eventType: string) => {
      if (eventType === 'INSERT') {
        setData(prev => ({ ...prev, attachments: [attachment, ...prev.attachments] }));
      } else if (eventType === 'DELETE') {
        setData(prev => ({ ...prev, attachments: prev.attachments.filter(a => a.id !== attachment.id) }));
      } else if (eventType === 'UPDATE') {
        setData(prev => ({ ...prev, attachments: prev.attachments.map(a => a.id === attachment.id ? attachment : a) }));
      }
      recordMetric('realtime-attachment-update', 1);
    },
    onCommentChange: (comment: OrderComment, eventType: string) => {
      if (eventType === 'INSERT') {
        setData(prev => ({ ...prev, comments: [comment, ...prev.comments] }));
      } else if (eventType === 'DELETE') {
        setData(prev => ({ ...prev, comments: prev.comments.filter(c => c.id !== comment.id) }));
      } else if (eventType === 'UPDATE') {
        setData(prev => ({ ...prev, comments: prev.comments.map(c => c.id === comment.id ? comment : c) }));
      }
      recordMetric('realtime-comment-update', 1);
    },
    onActivityChange: (activity: OrderActivity, eventType: string) => {
      if (eventType === 'INSERT') {
        setData(prev => ({ ...prev, activities: [activity, ...prev.activities] }));
      } else if (eventType === 'DELETE') {
        setData(prev => ({ ...prev, activities: prev.activities.filter(a => a.id !== activity.id) }));
      } else if (eventType === 'UPDATE') {
        setData(prev => ({ ...prev, activities: prev.activities.map(a => a.id === activity.id ? activity : a) }));
      }
      recordMetric('realtime-activity-update', 1);
    },
    onFollowerChange: (follower: OrderFollower, eventType: string) => {
      if (eventType === 'INSERT') {
        setData(prev => ({ ...prev, followers: [follower, ...prev.followers] }));
      } else if (eventType === 'DELETE') {
        setData(prev => ({ ...prev, followers: prev.followers.filter(f => f.id !== follower.id) }));
      } else if (eventType === 'UPDATE') {
        setData(prev => ({ ...prev, followers: prev.followers.map(f => f.id === follower.id ? follower : f) }));
      }
      recordMetric('realtime-follower-update', 1);
    },
    onError: (error: string) => {
      console.error('Real-time subscription error:', error);
      recordMetric('realtime-error', 1);
    }
  }), [recordMetric]);

  const realtimeConnection = useRealtimeOrderData(
    enabled && orderId ? orderId : null,
    realtimeHandlers,
    {
      enabled: enabled,
      batchUpdates: true,
      batchDelay: 50, // 50ms batching for smooth UI
      reconnectAttempts: 3
    }
  );

  // Optimized data fetching with intelligent caching and real-time updates
  const fetchModalData = useCallback(async (forceRefresh = false) => {
    if (!orderId || !enabled) return;

    const cacheKey = `modal-${orderId}-${qrCodeUrl || 'no-qr'}`;
    const measureId = startMeasure('modal-data-fetch');

    setError(null);
    setCacheHit(false);
    setStaleCacheHit(false);

    try {
      // Check cache first (stale-while-revalidate pattern)
      const cachedResult = modalDataCache.get(cacheKey);

      if (cachedResult && !forceRefresh) {
        if (!cachedResult.isStale) {
          // Fresh cache hit
          setData(cachedResult.data);
          setCacheHit(true);
          recordMetric('cache-hit', 1);
          endMeasure(measureId, 'modal-data-fetch-cached');
          return;
        } else {
          // Stale cache hit - serve stale data while revalidating
          setData(cachedResult.data);
          setStaleCacheHit(true);
          recordMetric('cache-hit-stale', 1);
        }
      }

      setLoading(true);

      // Use optimized query service for better performance
      const queryResult = await requestDeduplicator.execute(
        cacheKey,
        async (signal) => {
          const result = await supabaseQueryOptimizer.executeOrderModalQueries(orderId, qrCodeUrl);
          return {
            attachments: result.attachments,
            activities: [], // Not implemented in database yet
            comments: result.comments,
            followers: [], // Not implemented in database yet
            analytics: result.analytics,
            userType: result.userType
          };
        },
        forceRefresh
      );

      // Update state and cache
      setData(queryResult);
      modalDataCache.set(cacheKey, queryResult);

      recordMetric('cache-miss', 1);
      endMeasure(measureId, 'modal-data-fetch-network');

    } catch (err) {
      if (err instanceof Error && err.message.includes('cancelled')) {
        return; // Request was cancelled, don't update error state
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch modal data';
      setError(errorMessage);
      recordMetric('fetch-error', 1);
      console.error('Modal data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId, qrCodeUrl, enabled, startMeasure, endMeasure, recordMetric]);


  // Fetch data when dependencies change
  useEffect(() => {
    fetchModalData();
  }, [fetchModalData]);

  // Cancel any active requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  const updateAnalytics = useCallback((analytics: QRAnalytics | null) => {
    setData(prev => ({
      ...prev,
      analytics
    }));
  }, []);

  // Enhanced cache management with intelligent invalidation
  const forceRefresh = useCallback(async () => {
    if (orderId) {
      const cacheKey = `modal-${orderId}-${qrCodeUrl || 'no-qr'}`;
      modalDataCache.invalidate(cacheKey);
      await fetchModalData(true);
    }
  }, [orderId, qrCodeUrl, fetchModalData]);

  const clearCache = useCallback(() => {
    modalDataCache.clear();
    requestDeduplicator.cancelAll();
  }, []);

  const getCacheStats = useCallback(() => {
    return {
      ...modalDataCache.getStats(),
      activeRequests: requestDeduplicator.getActiveCount()
    };
  }, []);

  // Prefetch data for better UX (call before modal opens)
  const prefetchData = useCallback(async () => {
    if (!orderId) return;

    const cacheKey = `modal-${orderId}-${qrCodeUrl || 'no-qr'}`;
    const cached = modalDataCache.get(cacheKey);

    // Only prefetch if not in cache or stale
    if (!cached || cached.isStale) {
      await fetchModalData();
    }
  }, [orderId, qrCodeUrl, fetchModalData]);

  // Optimistic update helpers with rollback capability
  const optimisticUpdate = useCallback(<T extends keyof OrderModalData>(
    key: T,
    updater: (current: OrderModalData[T]) => OrderModalData[T],
    rollbackFn?: () => void
  ) => {
    const originalData = data[key];

    setData(prev => ({
      ...prev,
      [key]: updater(prev[key])
    }));

    // Return rollback function
    return () => {
      setData(prev => ({
        ...prev,
        [key]: originalData
      }));
      rollbackFn?.();
    };
  }, [data]);

  // Expose performance metrics and cache statistics
  const performanceMetrics = useMemo(() => ({
    cacheHit,
    staleCacheHit,
    cacheStats: getCacheStats(),
    lastFetchTime: data.attachments.length > 0 ? Date.now() : null,
    realtimeMetrics: realtimeConnection.metrics,
    queryOptimizerStats: supabaseQueryOptimizer.getPerformanceStats()
  }), [cacheHit, staleCacheHit, getCacheStats, data.attachments.length, realtimeConnection.metrics]);

  return {
    // Core data and state
    data,
    loading,
    error,

    // Performance indicators
    performanceMetrics,

    // Enhanced control functions
    refetch: fetchModalData,
    forceRefresh,
    prefetchData,
    clearCache,
    getCacheStats,

    // Optimistic update functions with rollback
    addAttachment: useCallback((attachment: OrderAttachment) => {
      return optimisticUpdate('attachments', current => [attachment, ...current]);
    }, [optimisticUpdate]),

    removeAttachment: useCallback((attachmentId: string) => {
      return optimisticUpdate('attachments', current =>
        current.filter(att => att.id !== attachmentId)
      );
    }, [optimisticUpdate]),

    addComment: useCallback((comment: OrderComment) => {
      return optimisticUpdate('comments', current => [comment, ...current]);
    }, [optimisticUpdate]),

    addActivity: useCallback((activity: OrderActivity) => {
      return optimisticUpdate('activities', current => [activity, ...current]);
    }, [optimisticUpdate]),

    updateAnalytics: useCallback((analytics: QRAnalytics | null) => {
      return optimisticUpdate('analytics', () => analytics);
    }, [optimisticUpdate])
  };
}