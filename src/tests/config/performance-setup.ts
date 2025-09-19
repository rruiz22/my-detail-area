import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * Performance Test Setup
 *
 * Global setup and teardown for performance testing environment.
 * Provides consistent measurement conditions and utilities.
 */

// Global performance monitoring utilities
declare global {
  namespace globalThis {
    var __PERFORMANCE_MONITOR__: PerformanceMonitor;
    var __MEMORY_TRACKER__: MemoryTracker;
    var __CACHE_MONITOR__: CacheMonitor;
  }
}

// Performance monitoring class
class PerformanceMonitor {
  private measurements: Map<string, number> = new Map();
  private startTimes: Map<string, number> = new Map();

  startMeasure(name: string): string {
    const measureId = `${name}-${Date.now()}-${Math.random()}`;
    this.startTimes.set(measureId, performance.now());
    return measureId;
  }

  endMeasure(measureId: string): number {
    const startTime = this.startTimes.get(measureId);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.measurements.set(measureId, duration);
    this.startTimes.delete(measureId);

    return duration;
  }

  getMeasurements(): Record<string, number> {
    return Object.fromEntries(this.measurements);
  }

  clearMeasurements(): void {
    this.measurements.clear();
    this.startTimes.clear();
  }

  exportResults(): string {
    const results = {
      measurements: this.getMeasurements(),
      timestamp: Date.now(),
      environment: 'test'
    };
    return JSON.stringify(results, null, 2);
  }
}

// Memory tracking class
class MemoryTracker {
  private baselines: Map<string, number> = new Map();
  private snapshots: Array<{ name: string; memory: number; timestamp: number }> = [];

  setBaseline(name: string): void {
    const memory = this.getCurrentMemoryUsage();
    this.baselines.set(name, memory);
  }

  takeSnapshot(name: string): number {
    const memory = this.getCurrentMemoryUsage();
    this.snapshots.push({ name, memory, timestamp: Date.now() });
    return memory;
  }

  getMemoryGrowth(baselineName: string): number {
    const baseline = this.baselines.get(baselineName);
    if (!baseline) return 0;

    const current = this.getCurrentMemoryUsage();
    return current - baseline;
  }

  getCurrentMemoryUsage(): number {
    // In Node.js test environment
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }

    // In browser environment (simulated)
    if (typeof window !== 'undefined' && (window.performance as any)?.memory) {
      return (window.performance as any).memory.usedJSHeapSize;
    }

    return 0;
  }

  getSnapshots(): Array<{ name: string; memory: number; timestamp: number }> {
    return [...this.snapshots];
  }

  clearSnapshots(): void {
    this.snapshots = [];
    this.baselines.clear();
  }

  exportMemoryReport(): string {
    const report = {
      snapshots: this.snapshots,
      baselines: Object.fromEntries(this.baselines),
      currentMemory: this.getCurrentMemoryUsage(),
      timestamp: Date.now()
    };
    return JSON.stringify(report, null, 2);
  }
}

// Cache monitoring class
class CacheMonitor {
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private operationCounts: Map<string, number> = new Map();

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  recordOperation(operation: string): void {
    const current = this.operationCounts.get(operation) || 0;
    this.operationCounts.set(operation, current + 1);
  }

  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total : 0;
  }

  getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    operations: Record<string, number>;
  } {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: this.getCacheHitRate(),
      operations: Object.fromEntries(this.operationCounts)
    };
  }

  reset(): void {
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.operationCounts.clear();
  }

  exportCacheReport(): string {
    return JSON.stringify(this.getStats(), null, 2);
  }
}

// Mock performance API for consistent testing
const mockPerformanceAPI = () => {
  const performanceMarks: Map<string, number> = new Map();
  const performanceMeasures: Map<string, number> = new Map();

  Object.defineProperty(global, 'performance', {
    value: {
      now: () => Date.now(),
      mark: (name: string) => {
        performanceMarks.set(name, Date.now());
      },
      measure: (name: string, startMark?: string, endMark?: string) => {
        if (startMark && endMark) {
          const start = performanceMarks.get(startMark) || 0;
          const end = performanceMarks.get(endMark) || 0;
          performanceMeasures.set(name, end - start);
        }
      },
      getEntriesByName: (name: string) => {
        const duration = performanceMeasures.get(name) || 0;
        return [{ name, duration, entryType: 'measure' }];
      },
      getEntriesByType: (type: string) => {
        if (type === 'measure') {
          return Array.from(performanceMeasures.entries()).map(([name, duration]) => ({
            name,
            duration,
            entryType: 'measure'
          }));
        }
        return [];
      },
      clearMarks: () => performanceMarks.clear(),
      clearMeasures: () => performanceMeasures.clear()
    },
    writable: true,
    configurable: true
  });
};

// Mock console for performance logging
const setupPerformanceLogging = () => {
  const originalConsole = console;

  // Performance-specific console methods
  (global as any).console.performance = (message: string, data?: any) => {
    if (process.env.PERFORMANCE_LOGGING === 'true') {
      originalConsole.log(`🚀 PERFORMANCE: ${message}`, data || '');
    }
  };

  (global as any).console.benchmark = (message: string, time: number) => {
    if (process.env.PERFORMANCE_LOGGING === 'true') {
      originalConsole.log(`📊 BENCHMARK: ${message} - ${time.toFixed(2)}ms`);
    }
  };

  (global as any).console.memory = (message: string, memory: number) => {
    if (process.env.PERFORMANCE_LOGGING === 'true') {
      originalConsole.log(`💾 MEMORY: ${message} - ${(memory / 1024 / 1024).toFixed(2)}MB`);
    }
  };
};

// Mock timers for consistent testing
const setupMockTimers = () => {
  vi.useFakeTimers({
    shouldAdvanceTime: true,
    advanceTimeDelta: 1
  });
};

// Performance test utilities
const performanceUtils = {
  // Measure function execution time
  measureFunction: async <T>(fn: () => Promise<T> | T, name: string): Promise<{ result: T; duration: number }> => {
    const measureId = globalThis.__PERFORMANCE_MONITOR__.startMeasure(name);
    const result = await fn();
    const duration = globalThis.__PERFORMANCE_MONITOR__.endMeasure(measureId);
    return { result, duration };
  },

  // Create performance expectations
  expectPerformance: (duration: number, threshold: number, name: string) => {
    console.benchmark(`${name} performance`, duration);
    if (duration > threshold) {
      console.warn(`⚠️ Performance threshold exceeded for ${name}: ${duration}ms > ${threshold}ms`);
    }
    return duration <= threshold;
  },

  // Memory usage helpers
  trackMemoryUsage: (name: string) => {
    globalThis.__MEMORY_TRACKER__.takeSnapshot(name);
  },

  // Cache operation helpers
  simulateCacheOperation: (hit: boolean, operation: string) => {
    if (hit) {
      globalThis.__CACHE_MONITOR__.recordCacheHit();
    } else {
      globalThis.__CACHE_MONITOR__.recordCacheMiss();
    }
    globalThis.__CACHE_MONITOR__.recordOperation(operation);
  }
};

// Setup before all tests
beforeAll(() => {
  // Initialize global monitoring utilities
  globalThis.__PERFORMANCE_MONITOR__ = new PerformanceMonitor();
  globalThis.__MEMORY_TRACKER__ = new MemoryTracker();
  globalThis.__CACHE_MONITOR__ = new CacheMonitor();

  // Setup mock APIs
  mockPerformanceAPI();
  setupPerformanceLogging();
  setupMockTimers();

  // Set initial memory baseline
  globalThis.__MEMORY_TRACKER__.setBaseline('test-start');

  // Performance testing environment setup
  console.performance('Performance testing environment initialized');

  // Make utilities available globally for tests
  (global as any).performanceUtils = performanceUtils;
});

// Cleanup after all tests
afterAll(() => {
  // Export performance results
  console.log('\n📊 PERFORMANCE TEST RESULTS:');
  console.log('=====================================');
  console.log(globalThis.__PERFORMANCE_MONITOR__.exportResults());
  console.log('\n💾 MEMORY USAGE REPORT:');
  console.log('==============================');
  console.log(globalThis.__MEMORY_TRACKER__.exportMemoryReport());
  console.log('\n📦 CACHE PERFORMANCE REPORT:');
  console.log('=================================');
  console.log(globalThis.__CACHE_MONITOR__.exportCacheReport());

  // Cleanup
  vi.useRealTimers();

  console.performance('Performance testing environment cleaned up');
});

// Setup before each test
beforeEach(() => {
  // Clear previous measurements but keep baselines
  globalThis.__PERFORMANCE_MONITOR__.clearMeasurements();

  // Take memory snapshot for this test
  const testName = expect.getState().currentTestName || 'unknown-test';
  globalThis.__MEMORY_TRACKER__.takeSnapshot(`before-${testName}`);

  // Reset React Testing Library
  cleanup();

  console.performance(`Starting test: ${testName}`);
});

// Cleanup after each test
afterEach(() => {
  // Take final memory snapshot
  const testName = expect.getState().currentTestName || 'unknown-test';
  globalThis.__MEMORY_TRACKER__.takeSnapshot(`after-${testName}`);

  // Calculate memory growth for this test
  const beforeMemory = globalThis.__MEMORY_TRACKER__.getSnapshots()
    .find(s => s.name === `before-${testName}`)?.memory || 0;
  const afterMemory = globalThis.__MEMORY_TRACKER__.getSnapshots()
    .find(s => s.name === `after-${testName}`)?.memory || 0;

  const memoryGrowth = afterMemory - beforeMemory;
  if (memoryGrowth > 1024 * 1024) { // > 1MB
    console.warn(`⚠️ High memory growth in test ${testName}: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
  }

  // Cleanup React components
  cleanup();

  console.performance(`Completed test: ${testName}`);
});

// Export utilities for use in tests
export { performanceUtils, PerformanceMonitor, MemoryTracker, CacheMonitor };