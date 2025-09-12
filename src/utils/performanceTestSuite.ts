// Comprehensive performance testing suite for modal optimizations
import { modalDataCache, cacheKeys, cachePerformanceMonitor } from './modalDataCache';

interface PerformanceTestResult {
  testName: string;
  duration: number;
  memoryUsage?: number;
  success: boolean;
  iterations: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number;
}

interface PerformanceTestSuite {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: PerformanceTestResult[];
  recommendations: string[];
}

export class ModalPerformanceTester {
  private results: PerformanceTestResult[] = [];
  private recommendations: string[] = [];

  async runAllTests(): Promise<PerformanceTestSuite> {
    console.log('🚀 Starting Modal Performance Test Suite...');
    const startTime = performance.now();

    // Clear any existing data
    modalDataCache.clear();
    this.results = [];
    this.recommendations = [];

    // Run all performance tests
    await this.testCachePerformance();
    await this.testMemoryUsage();
    await this.testConcurrentOperations();
    await this.testDataNormalization();
    await this.testErrorHandling();
    await this.testLargeDatasets();

    const totalDuration = performance.now() - startTime;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;

    // Generate performance recommendations
    this.generateRecommendations();

    const suite: PerformanceTestSuite = {
      totalTests: this.results.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.results,
      recommendations: this.recommendations
    };

    console.log('✅ Performance Test Suite Complete:', suite);
    return suite;
  }

  private async testCachePerformance(): Promise<void> {
    const testName = 'Cache Performance Test';
    const iterations = 1000;
    const durations: number[] = [];

    try {
      for (let i = 0; i < iterations; i++) {
        const key = `test-key-${i}`;
        const data = { id: i, name: `Test Item ${i}`, timestamp: Date.now() };

        // Test cache set performance
        const setStart = performance.now();
        modalDataCache.set(key, data);
        const setDuration = performance.now() - setStart;

        // Test cache get performance
        const getStart = performance.now();
        const retrieved = modalDataCache.get(key);
        const getDuration = performance.now() - getStart;

        const totalDuration = setDuration + getDuration;
        durations.push(totalDuration);

        // Validate data integrity
        if (JSON.stringify(retrieved) !== JSON.stringify(data)) {
          throw new Error(`Data integrity check failed for key: ${key}`);
        }
      }

      const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const minTime = Math.min(...durations);
      const maxTime = Math.max(...durations);
      const p95Time = this.calculatePercentile(durations, 95);

      this.results.push({
        testName,
        duration: durations.reduce((sum, d) => sum + d, 0),
        success: true,
        iterations,
        averageTime,
        minTime,
        maxTime,
        p95Time
      });

      // Performance threshold validation
      if (averageTime > 1.0) { // More than 1ms average
        this.recommendations.push(
          `Cache operations are slower than expected (${averageTime.toFixed(2)}ms avg). Consider reducing data size or optimizing serialization.`
        );
      }

    } catch (error) {
      this.results.push({
        testName,
        duration: 0,
        success: false,
        iterations: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });
      console.error(`${testName} failed:`, error);
    }
  }

  private async testMemoryUsage(): Promise<void> {
    const testName = 'Memory Usage Test';
    let memoryBefore = 0;
    let memoryAfter = 0;

    try {
      // Measure initial memory if available
      if ((performance as any).memory) {
        memoryBefore = (performance as any).memory.usedJSHeapSize;
      }

      // Create large dataset
      const iterations = 5000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const key = cacheKeys.modalData(`order-${i}`, `slug-${i}`);
        const largeData = {
          id: i,
          attachments: Array.from({ length: 10 }, (_, j) => ({
            id: `att-${i}-${j}`,
            name: `attachment-${j}.pdf`,
            size: Math.random() * 1000000
          })),
          comments: Array.from({ length: 20 }, (_, j) => ({
            id: `comment-${i}-${j}`,
            text: `This is a test comment ${j} for order ${i}`.repeat(10)
          })),
          metadata: { timestamp: Date.now(), version: '1.0' }
        };

        modalDataCache.set(key, largeData);
      }

      const duration = performance.now() - startTime;

      // Measure final memory if available
      if ((performance as any).memory) {
        memoryAfter = (performance as any).memory.usedJSHeapSize;
      }

      const memoryUsed = memoryAfter - memoryBefore;
      const cacheMetrics = modalDataCache.getMetrics();

      this.results.push({
        testName,
        duration,
        memoryUsage: memoryUsed,
        success: true,
        iterations,
        averageTime: duration / iterations,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });

      // Memory usage validation
      if (memoryUsed > 50 * 1024 * 1024) { // More than 50MB
        this.recommendations.push(
          `High memory usage detected (${(memoryUsed / 1024 / 1024).toFixed(2)}MB). Consider implementing data compression or reducing cache size.`
        );
      }

      console.log('Cache metrics after memory test:', cacheMetrics);

    } catch (error) {
      this.results.push({
        testName,
        duration: 0,
        success: false,
        iterations: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });
      console.error(`${testName} failed:`, error);
    }
  }

  private async testConcurrentOperations(): Promise<void> {
    const testName = 'Concurrent Operations Test';
    const concurrency = 50;
    const operationsPerWorker = 100;

    try {
      const startTime = performance.now();

      // Create concurrent operations
      const promises = Array.from({ length: concurrency }, async (_, workerId) => {
        const workerDurations: number[] = [];

        for (let i = 0; i < operationsPerWorker; i++) {
          const opStart = performance.now();
          const key = `worker-${workerId}-item-${i}`;
          const data = { workerId, itemId: i, data: `Data for ${key}` };

          // Simulate concurrent read/write operations
          modalDataCache.set(key, data);
          const retrieved = modalDataCache.get(key);
          
          if (!retrieved || (retrieved as any).workerId !== workerId) {
            throw new Error(`Concurrent operation failed for ${key}`);
          }

          workerDurations.push(performance.now() - opStart);
        }

        return workerDurations;
      });

      const allDurations = (await Promise.all(promises)).flat();
      const totalDuration = performance.now() - startTime;
      const totalOperations = concurrency * operationsPerWorker;

      const averageTime = allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length;
      const minTime = Math.min(...allDurations);
      const maxTime = Math.max(...allDurations);
      const p95Time = this.calculatePercentile(allDurations, 95);

      this.results.push({
        testName,
        duration: totalDuration,
        success: true,
        iterations: totalOperations,
        averageTime,
        minTime,
        maxTime,
        p95Time
      });

      // Concurrent operation validation
      if (p95Time > 5.0) { // More than 5ms at 95th percentile
        this.recommendations.push(
          `Concurrent operations are experiencing high latency (P95: ${p95Time.toFixed(2)}ms). Consider implementing request batching or queue management.`
        );
      }

    } catch (error) {
      this.results.push({
        testName,
        duration: 0,
        success: false,
        iterations: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });
      console.error(`${testName} failed:`, error);
    }
  }

  private async testDataNormalization(): Promise<void> {
    const testName = 'Data Normalization Performance Test';
    const iterations = 1000;

    try {
      const startTime = performance.now();
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const rawData = {
          id: i.toString(),
          name: null,
          size: '1024',
          createdAt: '2024-01-01T00:00:00.000Z',
          // Simulate messy data that needs normalization
          extraField: undefined,
          emptyArray: [],
          emptyString: ''
        };

        const normStart = performance.now();
        
        // Simulate data normalization
        const normalized = this.normalizeTestData(rawData);
        
        const normDuration = performance.now() - normStart;
        durations.push(normDuration);

        // Validate normalized data
        if (!normalized.id || typeof normalized.size !== 'number') {
          throw new Error(`Normalization failed for item ${i}`);
        }
      }

      const totalDuration = performance.now() - startTime;
      const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const minTime = Math.min(...durations);
      const maxTime = Math.max(...durations);
      const p95Time = this.calculatePercentile(durations, 95);

      this.results.push({
        testName,
        duration: totalDuration,
        success: true,
        iterations,
        averageTime,
        minTime,
        maxTime,
        p95Time
      });

      // Normalization performance validation
      if (averageTime > 0.5) { // More than 0.5ms average
        this.recommendations.push(
          `Data normalization is slower than expected (${averageTime.toFixed(2)}ms avg). Consider pre-processing data or optimizing normalization logic.`
        );
      }

    } catch (error) {
      this.results.push({
        testName,
        duration: 0,
        success: false,
        iterations: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });
      console.error(`${testName} failed:`, error);
    }
  }

  private async testErrorHandling(): Promise<void> {
    const testName = 'Error Handling Performance Test';

    try {
      const startTime = performance.now();
      let successfulRecoveries = 0;
      const totalAttempts = 100;

      for (let i = 0; i < totalAttempts; i++) {
        try {
          // Simulate various error conditions
          if (i % 3 === 0) {
            throw new Error('Simulated network error');
          }
          if (i % 5 === 0) {
            throw new Error('Simulated validation error');
          }
          if (i % 7 === 0) {
            throw new Error('Simulated timeout error');
          }

          // Normal operation
          modalDataCache.set(`error-test-${i}`, { data: i });
          
        } catch (error) {
          // Simulate error recovery
          const recoveryStart = performance.now();
          
          // Fallback to cached data or default
          const fallbackData = modalDataCache.get(`error-test-${i - 1}`) || { data: 'fallback' };
          modalDataCache.set(`error-test-${i}`, fallbackData);
          
          const recoveryTime = performance.now() - recoveryStart;
          if (recoveryTime < 10) { // Less than 10ms recovery time is good
            successfulRecoveries++;
          }
        }
      }

      const totalDuration = performance.now() - startTime;
      const recoveryRate = (successfulRecoveries / totalAttempts) * 100;

      this.results.push({
        testName,
        duration: totalDuration,
        success: recoveryRate > 90, // 90% recovery rate threshold
        iterations: totalAttempts,
        averageTime: totalDuration / totalAttempts,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });

      if (recoveryRate < 95) {
        this.recommendations.push(
          `Error recovery rate is below optimal (${recoveryRate.toFixed(1)}%). Consider improving fallback mechanisms and error handling strategies.`
        );
      }

    } catch (error) {
      this.results.push({
        testName,
        duration: 0,
        success: false,
        iterations: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });
      console.error(`${testName} failed:`, error);
    }
  }

  private async testLargeDatasets(): Promise<void> {
    const testName = 'Large Dataset Handling Test';

    try {
      const startTime = performance.now();
      const largeDatasetSizes = [100, 500, 1000, 2000, 5000];
      const durations: number[] = [];

      for (const size of largeDatasetSizes) {
        const testStart = performance.now();
        
        // Create large dataset
        const largeDataset = Array.from({ length: size }, (_, i) => ({
          id: `large-item-${i}`,
          name: `Item ${i}`,
          description: `This is a test description for item ${i}`.repeat(10),
          metadata: {
            created: new Date().toISOString(),
            tags: Array.from({ length: 10 }, (_, j) => `tag-${j}`),
            nested: {
              level1: {
                level2: {
                  level3: `Deep nested data for item ${i}`
                }
              }
            }
          }
        }));

        // Test caching large dataset
        const cacheKey = `large-dataset-${size}`;
        modalDataCache.set(cacheKey, largeDataset);
        
        // Test retrieval
        const retrieved = modalDataCache.get(cacheKey);
        
        if (!retrieved || !Array.isArray(retrieved) || retrieved.length !== size) {
          throw new Error(`Large dataset test failed for size ${size}`);
        }

        const testDuration = performance.now() - testStart;
        durations.push(testDuration);
        
        console.log(`Large dataset (${size} items): ${testDuration.toFixed(2)}ms`);
      }

      const totalDuration = performance.now() - startTime;
      const averageTime = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const maxTime = Math.max(...durations);

      this.results.push({
        testName,
        duration: totalDuration,
        success: maxTime < 1000, // Less than 1 second for largest dataset
        iterations: largeDatasetSizes.length,
        averageTime,
        minTime: Math.min(...durations),
        maxTime,
        p95Time: this.calculatePercentile(durations, 95)
      });

      // Large dataset performance validation
      if (maxTime > 500) { // More than 500ms for any dataset
        this.recommendations.push(
          `Large dataset handling is slower than expected (max: ${maxTime.toFixed(2)}ms). Consider implementing pagination, virtualization, or data chunking.`
        );
      }

    } catch (error) {
      this.results.push({
        testName,
        duration: 0,
        success: false,
        iterations: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p95Time: 0
      });
      console.error(`${testName} failed:`, error);
    }
  }

  private generateRecommendations(): void {
    const cacheMetrics = modalDataCache.getMetrics();
    
    // Cache hit rate recommendations
    if (cacheMetrics.hitRate < 80) {
      this.recommendations.push(
        `Cache hit rate is low (${cacheMetrics.hitRate.toFixed(1)}%). Consider increasing cache TTL or improving cache key strategies.`
      );
    }

    // Memory usage recommendations
    if (cacheMetrics.memoryUsage > 10 * 1024 * 1024) { // More than 10MB
      this.recommendations.push(
        `Cache memory usage is high (${(cacheMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB). Consider implementing data compression or reducing cache size.`
      );
    }

    // Performance recommendations based on test results
    const avgRenderTime = this.results
      .filter(r => r.testName.includes('Performance'))
      .reduce((sum, r) => sum + r.averageTime, 0) / 
      this.results.filter(r => r.testName.includes('Performance')).length;

    if (avgRenderTime > 2) { // More than 2ms average
      this.recommendations.push(
        'Consider implementing React.memo, useMemo, and useCallback optimizations for better rendering performance.'
      );
    }

    // General recommendations
    this.recommendations.push(
      'Enable React DevTools Profiler in development to identify performance bottlenecks.',
      'Monitor Core Web Vitals (LCP, FID, CLS) in production.',
      'Consider implementing service worker caching for offline support.',
      'Use React Suspense for better loading states and code splitting.'
    );
  }

  private normalizeTestData(rawData: any): any {
    return {
      id: rawData.id || '',
      name: rawData.name || 'Unknown',
      size: parseInt(rawData.size) || 0,
      createdAt: rawData.createdAt || new Date().toISOString()
    };
  }

  private calculatePercentile(arr: number[], percentile: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

// Export performance tester instance
export const modalPerformanceTester = new ModalPerformanceTester();

// Utility function to run performance tests in development
export async function runModalPerformanceTests(): Promise<PerformanceTestSuite> {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Performance tests should only be run in development environment');
    return {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0,
      results: [],
      recommendations: ['Performance tests are only available in development mode.']
    };
  }

  return modalPerformanceTester.runAllTests();
}