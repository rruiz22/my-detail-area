# Order Modal Data Fetching Optimization

## Overview

The order modal data fetching system has been completely rewritten to provide enterprise-grade performance, intelligent caching, and real-time synchronization for the dealership management system.

## Architecture Components

### 1. Optimized Order Modal Cache (`OptimizedOrderModalCache`)

**Features:**
- **LRU-style eviction** with access tracking
- **Stale-while-revalidate** pattern for improved UX
- **Automatic cleanup** with configurable intervals
- **Memory management** with size limits
- **TTL management** with fresh and stale thresholds

**Configuration:**
```typescript
const cache = new OptimizedOrderModalCache();
// DEFAULT_TTL: 5 minutes (fresh data)
// STALE_TTL: 15 minutes (stale-while-revalidate)
// MAX_CACHE_SIZE: 100 entries
// CLEANUP_INTERVAL: 2 minutes
```

### 2. Request Deduplication (`RequestDeduplicator`)

**Features:**
- **Prevents duplicate requests** for the same order
- **Request timeout handling** (30 seconds)
- **Automatic cleanup** of expired requests
- **Abort signal support** for cancellation

**Usage:**
```typescript
const data = await requestDeduplicator.execute(
  cacheKey,
  (signal) => fetchFunction(signal),
  forceRefresh
);
```

### 3. Supabase Query Optimizer (`SupabaseQueryOptimizer`)

**Features:**
- **Connection pooling** with configurable limits
- **Query batching** and parallel execution
- **Retry policies** with exponential backoff
- **Performance monitoring** and metrics
- **Intelligent caching** at query level

**Key Optimizations:**
- **Selective field queries** (only fetch needed columns)
- **User data enrichment** (batch fetch user names for comments)
- **Concurrency control** (respects Supabase connection limits)
- **Query timeout handling** (per-query timeouts)

### 4. Real-time Subscriptions (`useRealtimeOrderData`)

**Features:**
- **Batched updates** for smooth UI performance
- **Automatic reconnection** with exponential backoff
- **Connection heartbeat** monitoring
- **Error recovery** and retry logic
- **Subscription lifecycle management**

**Configuration:**
```typescript
const realtimeConfig = {
  enabled: true,
  reconnectAttempts: 5,
  reconnectDelay: 2000,
  heartbeatInterval: 30000,
  batchUpdates: true,
  batchDelay: 100
};
```

## Performance Optimizations

### Database Query Optimization

1. **Selective Field Selection:**
   ```sql
   SELECT id, file_name, file_path, file_size, mime_type, created_at
   FROM order_attachments
   WHERE order_id = $1
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. **Batch User Enrichment:**
   ```sql
   -- First get comments
   SELECT id, comment, created_by, created_at FROM order_comments WHERE order_id = $1;

   -- Then batch fetch user names
   SELECT id, full_name, email FROM profiles WHERE id IN ($1, $2, $3...);
   ```

3. **Connection Pool Management:**
   - Maximum 8 concurrent connections
   - Connection timeout: 10 seconds
   - Idle timeout: 60 seconds
   - Automatic cleanup of stale connections

### Caching Strategy

1. **Multi-level Caching:**
   - **Component level**: React state with optimistic updates
   - **Hook level**: Optimized cache with TTL management
   - **Query level**: Supabase query optimizer cache

2. **Cache Invalidation:**
   - **Time-based**: Automatic TTL expiration
   - **Event-based**: Real-time updates invalidate relevant cache entries
   - **Manual**: Force refresh capability

3. **Cache Statistics:**
   ```typescript
   const stats = {
     size: 45,           // Current cache entries
     totalAccesses: 1250, // Total cache accesses
     averageAge: 125000,  // Average entry age in ms
     oldestEntry: 300000  // Oldest entry age in ms
   };
   ```

### Real-time Optimization

1. **Update Batching:**
   - Collects multiple updates over 100ms window
   - Processes as single batch for smooth UI
   - Prevents UI flickering from rapid updates

2. **Connection Management:**
   - Single channel per order
   - Automatic reconnection on failures
   - Heartbeat monitoring for connection health

3. **Error Recovery:**
   - Exponential backoff for reconnections
   - Maximum retry attempts with fallback
   - Graceful degradation on persistent errors

## Usage Examples

### Basic Usage

```typescript
const {
  data,
  loading,
  error,
  performanceMetrics
} = useOrderModalData({
  orderId: 'order-123',
  qrCodeUrl: 'https://mda.to/ABC12',
  enabled: true
});
```

### Advanced Usage with Prefetching

```typescript
const modalHook = useOrderModalData({
  orderId: 'order-123',
  enabled: false // Start disabled
});

// Prefetch before modal opens
useEffect(() => {
  if (willOpenModal) {
    modalHook.prefetchData();
  }
}, [willOpenModal]);

// Enable when modal actually opens
useEffect(() => {
  if (modalOpen) {
    modalHook.updateConfig({ enabled: true });
  }
}, [modalOpen]);
```

### Optimistic Updates with Rollback

```typescript
const { addComment } = useOrderModalData({ orderId });

const handleAddComment = async (commentText: string) => {
  // Optimistic update
  const rollback = addComment({
    id: 'temp-id',
    comment: commentText,
    created_at: new Date().toISOString(),
    // ... other fields
  });

  try {
    await saveCommentToDatabase(commentText);
  } catch (error) {
    // Rollback on failure
    rollback();
    toast.error('Failed to add comment');
  }
};
```

## Performance Monitoring

### Available Metrics

```typescript
const { performanceMetrics } = useOrderModalData({ orderId });

console.log({
  cacheHit: performanceMetrics.cacheHit,           // Boolean
  staleCacheHit: performanceMetrics.staleCacheHit, // Boolean
  cacheStats: performanceMetrics.cacheStats,       // Cache statistics
  realtimeMetrics: performanceMetrics.realtimeMetrics, // Connection status
  queryOptimizerStats: performanceMetrics.queryOptimizerStats // Query performance
});
```

### Custom Performance Events

The system emits custom events for external monitoring:

```typescript
// Listen for performance events
window.addEventListener('modal-data-fetch-complete', (event) => {
  console.log('Fetch completed:', event.detail);
});

window.addEventListener('supabase-query-metric', (event) => {
  console.log('Query metric:', event.detail);
});

window.addEventListener('modal-performance-metric', (event) => {
  console.log('Performance metric:', event.detail);
});
```

## Error Handling

### Graceful Degradation

1. **Network Failures:** Serve stale cache data when available
2. **Database Errors:** Continue with partial data, log errors
3. **Real-time Failures:** Fall back to polling or manual refresh
4. **Cache Failures:** Direct database queries as fallback

### Error Recovery

```typescript
const { error, forceRefresh } = useOrderModalData({ orderId });

if (error) {
  return (
    <div>
      <p>Error loading data: {error}</p>
      <button onClick={forceRefresh}>Retry</button>
    </div>
  );
}
```

## Best Practices

### 1. Modal Lifecycle

```typescript
// Prefetch before opening
useEffect(() => {
  if (shouldPrefetch) {
    prefetchData();
  }
}, [shouldPrefetch]);

// Enable when modal opens
useEffect(() => {
  updateConfig({ enabled: modalOpen });
}, [modalOpen]);

// Force refresh on critical updates
const handleCriticalUpdate = () => {
  forceRefresh();
};
```

### 2. Memory Management

```typescript
// Clear cache when appropriate
useEffect(() => {
  return () => {
    if (shouldClearCache) {
      clearCache();
    }
  };
}, []);
```

### 3. Performance Monitoring

```typescript
// Monitor cache efficiency
const { getCacheStats } = useOrderModalData({ orderId });

useEffect(() => {
  const stats = getCacheStats();
  if (stats.cacheHitRate < 50) {
    console.warn('Low cache hit rate:', stats);
  }
}, [getCacheStats]);
```

## Configuration Options

### Cache Configuration

```typescript
const cache = new OptimizedOrderModalCache({
  DEFAULT_TTL: 3 * 60 * 1000,    // 3 minutes
  STALE_TTL: 10 * 60 * 1000,     // 10 minutes
  MAX_CACHE_SIZE: 50,            // 50 entries
  CLEANUP_INTERVAL: 60 * 1000    // 1 minute
});
```

### Query Optimizer Configuration

```typescript
const optimizer = new SupabaseQueryOptimizer({
  maxConnections: 6,              // Reduced for lower-tier plans
  connectionTimeout: 8000,        // 8 seconds
  idleTimeout: 45000,            // 45 seconds
  retryAttempts: 2,              // Fewer retries
  retryDelay: 800                // 800ms delay
});
```

### Real-time Configuration

```typescript
const realtimeConfig = {
  enabled: true,
  reconnectAttempts: 3,          // Reduced attempts
  reconnectDelay: 1500,          // 1.5 seconds
  heartbeatInterval: 20000,      // 20 seconds
  batchUpdates: true,
  batchDelay: 150                // Longer batch window
};
```

## Migration Guide

### From Old Implementation

1. **Replace imports:**
   ```typescript
   // Old
   import { useOrderModalData } from './useOrderModalData';

   // New (same import, enhanced functionality)
   import { useOrderModalData } from './useOrderModalData';
   ```

2. **Update usage (optional enhancements):**
   ```typescript
   // Old
   const { data, loading, error, refetch } = useOrderModalData({ orderId });

   // New (with enhanced features)
   const {
     data,
     loading,
     error,
     refetch,
     performanceMetrics,  // New
     prefetchData,        // New
     forceRefresh         // Enhanced
   } = useOrderModalData({ orderId });
   ```

3. **Add performance monitoring (optional):**
   ```typescript
   const { performanceMetrics } = useOrderModalData({ orderId });

   // Log performance data
   console.log('Cache hit rate:', performanceMetrics.cacheStats.cacheHitRate);
   console.log('Real-time status:', performanceMetrics.realtimeMetrics.connectionStatus);
   ```

## Troubleshooting

### Common Issues

1. **Slow Initial Load:**
   - Check if prefetching is implemented
   - Verify cache hit rates
   - Monitor connection pool usage

2. **Real-time Updates Not Working:**
   - Check connection status in metrics
   - Verify RLS policies allow real-time access
   - Check for network connectivity issues

3. **Memory Usage:**
   - Monitor cache size statistics
   - Implement proper cleanup on component unmount
   - Check for memory leaks in real-time subscriptions

### Debug Information

```typescript
// Get comprehensive debug info
const { performanceMetrics, getCacheStats } = useOrderModalData({ orderId });

const debugInfo = {
  cache: getCacheStats(),
  realtime: performanceMetrics.realtimeMetrics,
  queryOptimizer: performanceMetrics.queryOptimizerStats
};

console.table(debugInfo);
```

This optimization provides a robust, performant, and scalable solution for order modal data fetching in the dealership management system.