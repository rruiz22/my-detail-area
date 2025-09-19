/**
 * Supabase Query Optimizer Service
 *
 * Advanced query optimization service for dealership management system.
 * Handles connection pooling, query batching, and performance monitoring
 * to ensure optimal database performance for modal data fetching.
 */

import { supabase } from '@/integrations/supabase/client';
import type { PostgrestError, PostgrestResponse } from '@supabase/supabase-js';

// Performance monitoring interface
interface QueryMetrics {
  queryName: string;
  duration: number;
  rowCount?: number;
  cacheHit: boolean;
  timestamp: number;
  error?: string;
}

// Query result with metadata
interface OptimizedQueryResult<T = any> {
  data: T;
  error: PostgrestError | null;
  count?: number;
  metrics: QueryMetrics;
}

// Connection pool configuration
interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Query optimization strategies
type QueryStrategy = 'batch' | 'parallel' | 'sequential' | 'cached';

interface QueryPlan {
  queries: OptimizedQuery[];
  strategy: QueryStrategy;
  timeout: number;
  retryPolicy: RetryPolicy;
}

interface OptimizedQuery {
  name: string;
  priority: number;
  timeout: number;
  cacheKey?: string;
  cacheTTL?: number;
  execute: () => Promise<any>;
}

interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  initialDelay: number;
  maxDelay: number;
}

/**
 * Advanced Supabase Query Optimizer
 * Provides intelligent query batching, connection pooling, and performance optimization
 */
export class SupabaseQueryOptimizer {
  private connectionPool: Map<string, { inUse: boolean; lastUsed: number }> = new Map();
  private queryMetrics: QueryMetrics[] = [];
  private readonly config: ConnectionPoolConfig;
  private readonly queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(config?: Partial<ConnectionPoolConfig>) {
    this.config = {
      maxConnections: 8, // Conservative limit for Supabase
      connectionTimeout: 10000, // 10 seconds
      idleTimeout: 60000, // 1 minute
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      ...config
    };

    // Start connection cleanup timer
    this.startConnectionCleanup();
  }

  /**
   * Execute optimized order modal queries with intelligent batching
   */
  async executeOrderModalQueries(orderId: string, qrCodeUrl?: string): Promise<{
    attachments: any[];
    comments: any[];
    userType: string | null;
    analytics: any | null;
    metrics: QueryMetrics[];
  }> {
    const startTime = performance.now();

    try {
      // Create optimized query plan
      const queryPlan = this.createOrderModalQueryPlan(orderId, qrCodeUrl);

      // Execute with strategy-specific optimization
      const results = await this.executeQueryPlan(queryPlan);

      // Process and normalize results
      const processedResults = this.processOrderModalResults(results);

      // Record performance metrics
      const totalDuration = performance.now() - startTime;
      this.recordMetrics('order-modal-batch', totalDuration, true);

      return {
        ...processedResults,
        metrics: this.getRecentMetrics(5) // Return last 5 metrics
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetrics('order-modal-batch', duration, false, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Create optimized query plan for order modal data
   */
  private createOrderModalQueryPlan(orderId: string, qrCodeUrl?: string): QueryPlan {
    const queries: OptimizedQuery[] = [
      {
        name: 'attachments',
        priority: 1,
        timeout: 5000,
        cacheKey: `attachments-${orderId}`,
        cacheTTL: 2 * 60 * 1000, // 2 minutes
        execute: () => this.fetchAttachmentsOptimized(orderId)
      },
      {
        name: 'comments',
        priority: 2,
        timeout: 5000,
        cacheKey: `comments-${orderId}`,
        cacheTTL: 1 * 60 * 1000, // 1 minute
        execute: () => this.fetchCommentsOptimized(orderId)
      },
      {
        name: 'userType',
        priority: 3,
        timeout: 3000,
        cacheKey: 'user-type',
        cacheTTL: 10 * 60 * 1000, // 10 minutes
        execute: () => this.fetchUserTypeOptimized()
      }
    ];

    // Add analytics query if QR code URL exists
    if (qrCodeUrl) {
      queries.push({
        name: 'analytics',
        priority: 4,
        timeout: 8000,
        cacheKey: `analytics-${qrCodeUrl}`,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
        execute: () => this.fetchAnalyticsOptimized(qrCodeUrl)
      });
    }

    return {
      queries,
      strategy: 'parallel',
      timeout: 15000, // 15 seconds total
      retryPolicy: {
        maxAttempts: 2,
        backoffMultiplier: 1.5,
        initialDelay: 500,
        maxDelay: 2000
      }
    };
  }

  /**
   * Execute query plan with optimized strategy
   */
  private async executeQueryPlan(plan: QueryPlan): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    switch (plan.strategy) {
      case 'parallel':
        return this.executeParallelQueries(plan);
      case 'batch':
        return this.executeBatchQueries(plan);
      case 'sequential':
        return this.executeSequentialQueries(plan);
      case 'cached':
        return this.executeCachedQueries(plan);
      default:
        throw new Error(`Unsupported query strategy: ${plan.strategy}`);
    }
  }

  /**
   * Execute queries in parallel with connection pool management
   */
  private async executeParallelQueries(plan: QueryPlan): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    // Sort queries by priority
    const sortedQueries = [...plan.queries].sort((a, b) => a.priority - b.priority);

    // Execute in controlled parallel batches
    const batchSize = Math.min(this.config.maxConnections - 1, sortedQueries.length);
    const batches = [];

    for (let i = 0; i < sortedQueries.length; i += batchSize) {
      batches.push(sortedQueries.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(async (query) => {
        const connectionId = await this.acquireConnection();
        try {
          const result = await this.executeQueryWithRetry(query, plan.retryPolicy);
          results.set(query.name, result);
          return { name: query.name, result };
        } finally {
          this.releaseConnection(connectionId);
        }
      });

      await Promise.allSettled(batchPromises);
    }

    return results;
  }

  /**
   * Execute single query with caching and retry logic
   */
  private async executeQueryWithRetry(
    query: OptimizedQuery,
    retryPolicy: RetryPolicy
  ): Promise<any> {
    // Check cache first
    if (query.cacheKey) {
      const cached = this.getCachedResult(query.cacheKey);
      if (cached) {
        this.recordMetrics(query.name, 0, true);
        return cached;
      }
    }

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < retryPolicy.maxAttempts) {
      try {
        const startTime = performance.now();
        const result = await Promise.race([
          query.execute(),
          this.createTimeoutPromise(query.timeout)
        ]);

        const duration = performance.now() - startTime;
        this.recordMetrics(query.name, duration, false);

        // Cache successful result
        if (query.cacheKey && query.cacheTTL) {
          this.setCachedResult(query.cacheKey, result, query.cacheTTL);
        }

        return result;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        attempt++;

        if (attempt < retryPolicy.maxAttempts) {
          const delay = Math.min(
            retryPolicy.initialDelay * Math.pow(retryPolicy.backoffMultiplier, attempt - 1),
            retryPolicy.maxDelay
          );
          await this.sleep(delay);
        }
      }
    }

    // Record failed metrics
    this.recordMetrics(query.name, 0, false, lastError?.message);
    throw lastError || new Error(`Query ${query.name} failed after ${retryPolicy.maxAttempts} attempts`);
  }

  /**
   * Optimized attachments fetch with selective fields
   */
  private async fetchAttachmentsOptimized(orderId: string) {
    return supabase
      .from('order_attachments')
      .select(`
        id,
        file_name,
        file_path,
        file_size,
        mime_type,
        uploaded_by,
        upload_context,
        description,
        created_at
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(50); // Reasonable limit for performance
  }

  /**
   * Optimized comments fetch with user enrichment
   */
  private async fetchCommentsOptimized(orderId: string) {
    // First fetch comments
    const commentsResult = await supabase
      .from('order_comments')
      .select(`
        id,
        comment,
        is_internal,
        created_by,
        created_at,
        updated_at
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (commentsResult.error || !commentsResult.data?.length) {
      return commentsResult;
    }

    // Batch fetch user names for all unique created_by IDs
    const userIds = [...new Set(commentsResult.data.map(c => c.created_by))];

    if (userIds.length > 0) {
      const usersResult = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersResult.data) {
        const userMap = new Map(
          usersResult.data.map(user => [user.id, user])
        );

        // Enrich comments with user data
        commentsResult.data = commentsResult.data.map(comment => ({
          ...comment,
          user_name: userMap.get(comment.created_by)?.full_name || 'Unknown User',
          user_email: userMap.get(comment.created_by)?.email
        }));
      }
    }

    return commentsResult;
  }

  /**
   * Optimized user type fetch with session caching
   */
  private async fetchUserTypeOptimized() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.user.id)
      .single();

    return profile?.user_type || 'regular';
  }

  /**
   * Optimized analytics fetch with error handling
   */
  private async fetchAnalyticsOptimized(qrCodeUrl: string) {
    try {
      const slug = qrCodeUrl.split('/').pop();
      if (!slug) return null;

      // This would integrate with your analytics service
      // For now, return null to avoid errors
      return null;
    } catch (error) {
      console.warn('Analytics fetch failed:', error);
      return null;
    }
  }

  /**
   * Process and normalize query results
   */
  private processOrderModalResults(results: Map<string, any>) {
    return {
      attachments: this.extractData(results.get('attachments')) || [],
      comments: this.extractData(results.get('comments')) || [],
      userType: results.get('userType') || null,
      analytics: results.get('analytics') || null
    };
  }

  /**
   * Extract data from Supabase response format
   */
  private extractData(response: any) {
    if (!response || response.error) {
      return null;
    }
    return response.data;
  }

  /**
   * Connection pool management
   */
  private async acquireConnection(): Promise<string> {
    const connectionId = `conn-${Date.now()}-${Math.random()}`;

    // Wait for available connection if at limit
    while (this.connectionPool.size >= this.config.maxConnections) {
      await this.sleep(50);
    }

    this.connectionPool.set(connectionId, {
      inUse: true,
      lastUsed: Date.now()
    });

    return connectionId;
  }

  private releaseConnection(connectionId: string): void {
    const conn = this.connectionPool.get(connectionId);
    if (conn) {
      conn.inUse = false;
      conn.lastUsed = Date.now();
    }
  }

  private startConnectionCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      this.connectionPool.forEach((conn, id) => {
        if (!conn.inUse && now - conn.lastUsed > this.config.idleTimeout) {
          this.connectionPool.delete(id);
        }
      });
    }, 30000); // Clean up every 30 seconds
  }

  /**
   * Caching utilities
   */
  private getCachedResult(key: string): any | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCachedResult(key: string, data: any, ttl: number): void {
    this.queryCache.set(key, {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Performance monitoring
   */
  private recordMetrics(
    queryName: string,
    duration: number,
    cacheHit: boolean,
    error?: string
  ): void {
    const metric: QueryMetrics = {
      queryName,
      duration,
      cacheHit,
      timestamp: Date.now(),
      error
    };

    this.queryMetrics.push(metric);

    // Keep only last 100 metrics
    if (this.queryMetrics.length > 100) {
      this.queryMetrics = this.queryMetrics.slice(-100);
    }

    // Emit custom event for external monitoring
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-query-metric', {
        detail: metric
      }));
    }
  }

  private getRecentMetrics(count: number): QueryMetrics[] {
    return this.queryMetrics.slice(-count);
  }

  /**
   * Utility methods
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), timeout);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Batch query execution (alternative strategy)
   */
  private async executeBatchQueries(plan: QueryPlan): Promise<Map<string, any>> {
    // For future implementation of true SQL batch operations
    return this.executeParallelQueries(plan);
  }

  /**
   * Sequential query execution (fallback strategy)
   */
  private async executeSequentialQueries(plan: QueryPlan): Promise<Map<string, any>> {
    const results = new Map<string, any>();

    for (const query of plan.queries) {
      const result = await this.executeQueryWithRetry(query, plan.retryPolicy);
      results.set(query.name, result);
    }

    return results;
  }

  /**
   * Cached query execution (high-performance strategy)
   */
  private async executeCachedQueries(plan: QueryPlan): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const uncachedQueries: OptimizedQuery[] = [];

    // Check cache for all queries first
    for (const query of plan.queries) {
      if (query.cacheKey) {
        const cached = this.getCachedResult(query.cacheKey);
        if (cached) {
          results.set(query.name, cached);
          this.recordMetrics(query.name, 0, true);
        } else {
          uncachedQueries.push(query);
        }
      } else {
        uncachedQueries.push(query);
      }
    }

    // Execute uncached queries in parallel
    if (uncachedQueries.length > 0) {
      const uncachedPlan = { ...plan, queries: uncachedQueries };
      const uncachedResults = await this.executeParallelQueries(uncachedPlan);

      uncachedResults.forEach((value, key) => {
        results.set(key, value);
      });
    }

    return results;
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const recentMetrics = this.getRecentMetrics(50);
    const totalQueries = recentMetrics.length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const errors = recentMetrics.filter(m => m.error).length;
    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalQueries || 0;

    return {
      totalQueries,
      cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      errorRate: totalQueries > 0 ? (errors / totalQueries) * 100 : 0,
      averageDuration: avgDuration,
      activeConnections: this.connectionPool.size,
      cacheSize: this.queryCache.size
    };
  }

  /**
   * Clear all caches and reset connections
   */
  reset(): void {
    this.queryCache.clear();
    this.connectionPool.clear();
    this.queryMetrics = [];
  }
}

// Export singleton instance
export const supabaseQueryOptimizer = new SupabaseQueryOptimizer();

// Export configuration for advanced users
export const createOptimizedSupabaseClient = (config?: Partial<ConnectionPoolConfig>) => {
  return new SupabaseQueryOptimizer(config);
};