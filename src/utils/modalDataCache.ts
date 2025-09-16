// Enhanced caching system for modal data with advanced features
interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  defaultTTL?: number;
  maxSize?: number;
  enableCompression?: boolean;
  enableMetrics?: boolean;
}

export class ModalDataCache {
  private cache = new Map<string, CacheEntry>();
  private readonly config: Required<CacheConfig>;
  private metrics = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSets: 0,
    averageAccessTime: 0
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      maxSize: config.maxSize || 50,
      enableCompression: config.enableCompression || false,
      enableMetrics: config.enableMetrics || true
    };
  }

  set<T>(key: string, data: T, ttl = this.config.defaultTTL): void {
    // Implement smart eviction strategy (LRU with access frequency consideration)
    if (this.cache.size >= this.config.maxSize) {
      this.evictLeastUsed();
    }

    const processedData = this.config.enableCompression 
      ? this.compressData(data)
      : data;

    this.cache.set(key, {
      data: JSON.parse(JSON.stringify(processedData)), // Deep clone
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now()
    });

    if (this.config.enableMetrics) {
      this.metrics.totalSets++;
    }
  }

  get<T>(key: string): T | null {
    const startTime = performance.now();
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableMetrics) {
        this.metrics.misses++;
      }
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      if (this.config.enableMetrics) {
        this.metrics.misses++;
      }
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    if (this.config.enableMetrics) {
      this.metrics.hits++;
      const accessTime = performance.now() - startTime;
      this.updateAverageAccessTime(accessTime);
    }

    const data = this.config.enableCompression 
      ? this.decompressData(entry.data)
      : entry.data;

    return data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    if (this.config.enableMetrics) {
      this.metrics = {
        hits: 0,
        misses: 0,
        evictions: 0,
        totalSets: 0,
        averageAccessTime: 0
      };
    }
  }

  getSize(): number {
    return this.cache.size;
  }

  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100 
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheSize: this.cache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  // Get cache entries sorted by priority (access frequency and recency)
  getEntriesByPriority(): Array<{ key: string; priority: number }> {
    const entries: Array<{ key: string; priority: number }> = [];
    
    for (const [key, entry] of this.cache.entries()) {
      // Calculate priority based on access frequency and recency
      const recency = Date.now() - entry.lastAccessed;
      const frequency = entry.accessCount;
      const priority = frequency / (recency / 1000); // Higher is better
      
      entries.push({ key, priority });
    }

    return entries.sort((a, b) => a.priority - b.priority); // Lowest priority first
  }

  // Smart eviction based on LRU + LFU hybrid
  private evictLeastUsed(): void {
    const entries = this.getEntriesByPriority();
    if (entries.length > 0) {
      const leastUsedKey = entries[0].key;
      this.cache.delete(leastUsedKey);
      
      if (this.config.enableMetrics) {
        this.metrics.evictions++;
      }
    }
  }

  private updateAverageAccessTime(accessTime: number): void {
    const totalAccesses = this.metrics.hits + this.metrics.misses;
    this.metrics.averageAccessTime = 
      (this.metrics.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses;
  }

  private compressData(data: any): any {
    // Simple compression strategy - in production, use a proper compression library
    if (typeof data === 'string' && data.length > 1000) {
      // For demo purposes, just return the data as is
      // In production, use LZString or similar
      return data;
    }
    return data;
  }

  private decompressData(data: any): any {
    // Corresponding decompression
    return data;
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // Rough estimate for string keys
      totalSize += JSON.stringify(entry).length * 2; // Rough estimate for data
    }
    return totalSize;
  }

  // Advanced cache warming strategy
  warmCache(keys: string[], dataFetcher: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      if (!this.has(key)) {
        try {
          const data = await dataFetcher(key);
          this.set(key, data);
        } catch (error) {
          console.warn(`Failed to warm cache for key: ${key}`, error);
        }
      }
    });

    return Promise.all(promises).then(() => {});
  }

  // Background cache cleanup
  startBackgroundCleanup(intervalMs = 60000): () => void {
    const interval = setInterval(() => {
      this.cleanup();
    }, intervalMs);

    return () => clearInterval(interval);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        if (this.config.enableMetrics) {
          this.metrics.evictions++;
        }
      }
    }
  }
}

// Global cache instance with optimized configuration
export const modalDataCache = new ModalDataCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100, // Increased for better performance
  enableCompression: false, // Disable for better performance, enable if memory is critical
  enableMetrics: true
});

// Cache key generators for consistency
export const cacheKeys = {
  modalData: (orderId: string, qrSlug?: string) => 
    `modal-data-${orderId}${qrSlug ? `-${qrSlug}` : ''}`,
  userType: (userId: string) => `user-type-${userId}`,
  attachments: (orderId: string) => `attachments-${orderId}`,
  comments: (orderId: string) => `comments-${orderId}`,
  analytics: (qrSlug: string) => `analytics-${qrSlug}`
};

// Performance monitoring for cache operations
export class CachePerformanceMonitor {
  private static instance: CachePerformanceMonitor;
  private measurements: Array<{ operation: string; duration: number; timestamp: number }> = [];

  static getInstance(): CachePerformanceMonitor {
    if (!CachePerformanceMonitor.instance) {
      CachePerformanceMonitor.instance = new CachePerformanceMonitor();
    }
    return CachePerformanceMonitor.instance;
  }

  measureOperation<T>(operation: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    
    this.measurements.push({ operation, duration, timestamp: Date.now() });
    
    // Keep only recent measurements
    if (this.measurements.length > 1000) {
      this.measurements = this.measurements.slice(-500);
    }
    
    return result;
  }

  async measureAsyncOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    
    this.measurements.push({ operation, duration, timestamp: Date.now() });
    
    return result;
  }

  getStats() {
    const groupedByOperation = this.measurements.reduce((acc, measurement) => {
      if (!acc[measurement.operation]) {
        acc[measurement.operation] = [];
      }
      acc[measurement.operation].push(measurement.duration);
      return acc;
    }, {} as Record<string, number[]>);

    const stats = Object.entries(groupedByOperation).map(([operation, durations]) => ({
      operation,
      count: durations.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p95Duration: this.percentile(durations, 95)
    }));

    return stats;
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

// Export performance monitor instance
export const cachePerformanceMonitor = CachePerformanceMonitor.getInstance();