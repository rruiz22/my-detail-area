import { test, expect, Page, BrowserContext } from '@playwright/test';
import { performance } from 'perf_hooks';

// Test data setup
const TEST_ORDER = {
  id: 'test-order-123',
  orderNumber: 'DEAL-SALES-E2E-001',
  customerName: 'E2E Test Customer',
  customerPhone: '+1-555-E2E-TEST',
  vehicleYear: '2023',
  vehicleMake: 'Toyota',
  vehicleModel: 'Camry',
  vehicleVin: '1HGBH41JXMN109186',
  status: 'pending'
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  MODAL_LOAD_TIME: 2000, // 2 seconds (vs previous 30s)
  CACHED_LOAD_TIME: 100,  // 100ms for cached loads
  INTERACTION_RESPONSE: 16, // 16ms for 60fps interactions
  MEMORY_GROWTH_LIMIT: 10 * 1024 * 1024, // 10MB max memory growth
  NETWORK_TIMEOUT: 5000 // 5 seconds for network requests
};

// Custom performance measurement helpers
class PerformanceMonitor {
  private measurements: Record<string, number> = {};
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async startMeasure(name: string): Promise<void> {
    await this.page.evaluate((measureName) => {
      (window as any).performanceMarks = (window as any).performanceMarks || {};
      (window as any).performanceMarks[measureName] = performance.now();
    }, name);
  }

  async endMeasure(name: string): Promise<number> {
    const duration = await this.page.evaluate((measureName) => {
      const start = (window as any).performanceMarks?.[measureName];
      if (!start) return 0;
      return performance.now() - start;
    }, name);

    this.measurements[name] = duration;
    return duration;
  }

  async getMemoryUsage(): Promise<{ used: number; total: number; limit: number }> {
    return await this.page.evaluate(() => {
      const memory = (performance as any).memory;
      if (!memory) return { used: 0, total: 0, limit: 0 };

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      };
    });
  }

  getMeasurements(): Record<string, number> {
    return { ...this.measurements };
  }

  async measureNetworkRequests(): Promise<{ count: number; totalTime: number; averageTime: number }> {
    return await this.page.evaluate(() => {
      const entries = performance.getEntriesByType('navigation').concat(
        performance.getEntriesByType('resource')
      ) as PerformanceEntry[];

      const networkEntries = entries.filter(entry =>
        entry.name.includes('/api/') || entry.name.includes('supabase')
      );

      const totalTime = networkEntries.reduce((sum, entry) => sum + entry.duration, 0);

      return {
        count: networkEntries.length,
        totalTime,
        averageTime: networkEntries.length > 0 ? totalTime / networkEntries.length : 0
      };
    });
  }
}

test.describe('Order Modal Performance E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let performanceMonitor: PerformanceMonitor;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      // Enable performance monitoring
      recordVideo: process.env.CI ? undefined : { dir: 'test-results/videos' }
    });

    page = await context.newPage();
    performanceMonitor = new PerformanceMonitor(page);

    // Navigate to application
    await page.goto('/');

    // Setup test data if needed
    await page.evaluate((testOrder) => {
      // Mock API responses for consistent testing
      localStorage.setItem('test-order-data', JSON.stringify(testOrder));
    }, TEST_ORDER);
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.describe('🚀 Modal Load Time Performance (Target: <2s vs Previous 30s)', () => {
    test('should load modal under 2 seconds with cold cache', async () => {
      // Clear cache to simulate cold start
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
        if ('caches' in window) {
          caches.keys().then(names => names.forEach(name => caches.delete(name)));
        }
      });

      // Navigate to orders page
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Start performance measurement
      await performanceMonitor.startMeasure('modal-cold-load');

      // Open order modal
      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();

      // Wait for modal to be fully loaded
      await page.waitForSelector('[data-testid="order-detail-modal"]', {
        state: 'visible',
        timeout: PERFORMANCE_THRESHOLDS.MODAL_LOAD_TIME
      });

      // Wait for all content to load
      await page.waitForSelector('[data-testid="qr-code-block"]');
      await page.waitForSelector('[data-testid="vehicle-info-block"]');

      const loadTime = await performanceMonitor.endMeasure('modal-cold-load');

      console.log(`📊 Cold modal load time: ${loadTime.toFixed(2)}ms`);

      // Should load within performance threshold
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODAL_LOAD_TIME);

      // Close modal
      await page.click('[data-testid="close-modal-button"]');
    });

    test('should load modal under 100ms with warm cache', async () => {
      // First load to warm cache
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');
      await page.click('[data-testid="close-modal-button"]');

      // Second load with warm cache
      await performanceMonitor.startMeasure('modal-warm-load');

      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      const loadTime = await performanceMonitor.endMeasure('modal-warm-load');

      console.log(`📊 Warm modal load time: ${loadTime.toFixed(2)}ms`);

      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHED_LOAD_TIME);

      await page.click('[data-testid="close-modal-button"]');
    });

    test('should eliminate lazy loading delays', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Monitor for lazy loading indicators
      const lazyLoadingElements = page.locator('[data-testid*="lazy-"], [data-testid*="suspense-"]');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();

      await page.waitForSelector('[data-testid="order-detail-modal"]');

      // Should not find any lazy loading elements
      const lazyCount = await lazyLoadingElements.count();
      expect(lazyCount).toBe(0);

      await page.click('[data-testid="close-modal-button"]');
    });
  });

  test.describe('🧠 Memory Usage and Leak Detection', () => {
    test('should not create memory leaks during modal cycles', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const initialMemory = await performanceMonitor.getMemoryUsage();
      console.log(`💾 Initial memory: ${(initialMemory.used / 1024 / 1024).toFixed(2)}MB`);

      // Perform multiple open/close cycles
      for (let i = 0; i < 10; i++) {
        const orderRow = page.locator('[data-testid="order-row"]').first();
        await orderRow.click();
        await page.waitForSelector('[data-testid="order-detail-modal"]');

        // Interact with modal briefly
        await page.hover('[data-testid="qr-code-block"]');

        await page.click('[data-testid="close-modal-button"]');
        await page.waitForTimeout(100); // Brief pause between cycles
      }

      // Force garbage collection if available
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });

      const finalMemory = await performanceMonitor.getMemoryUsage();
      const memoryGrowth = finalMemory.used - initialMemory.used;

      console.log(`💾 Final memory: ${(finalMemory.used / 1024 / 1024).toFixed(2)}MB`);
      console.log(`💾 Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);

      expect(memoryGrowth).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_GROWTH_LIMIT);
    });

    test('should handle large datasets without degradation', async () => {
      // Create order with large notes data
      await page.evaluate(() => {
        const largeOrder = {
          ...JSON.parse(localStorage.getItem('test-order-data') || '{}'),
          notes: 'Large notes content. '.repeat(1000), // ~20KB of notes
          internal_notes: 'Internal notes content. '.repeat(1000)
        };
        localStorage.setItem('test-order-data', JSON.stringify(largeOrder));
      });

      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      await performanceMonitor.startMeasure('large-dataset-render');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      const renderTime = await performanceMonitor.endMeasure('large-dataset-render');

      console.log(`📊 Large dataset render time: ${renderTime.toFixed(2)}ms`);

      // Should handle large data without significant slowdown
      expect(renderTime).toBeLessThan(1000);

      await page.click('[data-testid="close-modal-button"]');
    });
  });

  test.describe('📡 Network and Caching Performance', () => {
    test('should optimize network requests and implement caching', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Monitor network requests
      const networkRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/') || request.url().includes('supabase')) {
          networkRequests.push(request.url());
        }
      });

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      await page.waitForTimeout(1000); // Allow all requests to complete

      const networkStats = await performanceMonitor.measureNetworkRequests();

      console.log(`📡 Network requests: ${networkStats.count}`);
      console.log(`📡 Average request time: ${networkStats.averageTime.toFixed(2)}ms`);

      // Should not make excessive network requests
      expect(networkRequests.length).toBeLessThan(10);

      // Average request time should be reasonable
      expect(networkStats.averageTime).toBeLessThan(500);

      await page.click('[data-testid="close-modal-button"]');
    });

    test('should implement request deduplication', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const networkRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('order-modal-data')) {
          networkRequests.push(request.url());
        }
      });

      // Open modal multiple times quickly
      const orderRow = page.locator('[data-testid="order-row"]').first();

      await orderRow.click();
      await page.click('[data-testid="close-modal-button"]');

      await orderRow.click();
      await page.click('[data-testid="close-modal-button"]');

      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      // Should not duplicate identical requests
      const uniqueRequests = [...new Set(networkRequests)];
      expect(networkRequests.length - uniqueRequests.length).toBeLessThan(3);

      await page.click('[data-testid="close-modal-button"]');
    });
  });

  test.describe('🎯 User Interaction Performance', () => {
    test('should respond to interactions within 16ms (60fps)', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      // Test close button response time
      await performanceMonitor.startMeasure('close-interaction');

      const closeButton = page.locator('[data-testid="close-modal-button"]');
      await closeButton.click();

      await page.waitForSelector('[data-testid="order-detail-modal"]', { state: 'hidden' });

      const responseTime = await performanceMonitor.endMeasure('close-interaction');

      console.log(`🖱️ Close interaction response: ${responseTime.toFixed(2)}ms`);

      expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE);
    });

    test('should maintain smooth scrolling performance', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      const modalContent = page.locator('[data-testid="order-detail-modal"]');

      await performanceMonitor.startMeasure('scroll-performance');

      // Perform scroll operations
      for (let i = 0; i < 10; i++) {
        await modalContent.evaluate((element, scrollTop) => {
          element.scrollTop = scrollTop;
        }, i * 100);
        await page.waitForTimeout(10);
      }

      const scrollTime = await performanceMonitor.endMeasure('scroll-performance');

      console.log(`📜 Scroll performance: ${scrollTime.toFixed(2)}ms`);

      expect(scrollTime).toBeLessThan(200);

      await page.click('[data-testid="close-modal-button"]');
    });

    test('should handle status changes efficiently', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      await performanceMonitor.startMeasure('status-change');

      const statusBadge = page.locator('[data-testid="status-badge"]');
      await statusBadge.click();

      // Wait for status update to complete
      await page.waitForSelector('[data-testid="status-updated"]', { timeout: 2000 });

      const statusChangeTime = await performanceMonitor.endMeasure('status-change');

      console.log(`🔄 Status change time: ${statusChangeTime.toFixed(2)}ms`);

      expect(statusChangeTime).toBeLessThan(1000);

      await page.click('[data-testid="close-modal-button"]');
    });
  });

  test.describe('📱 Mobile Performance Optimization', () => {
    test('should perform well on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });

      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      await performanceMonitor.startMeasure('mobile-modal-load');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      const mobileLoadTime = await performanceMonitor.endMeasure('mobile-modal-load');

      console.log(`📱 Mobile modal load time: ${mobileLoadTime.toFixed(2)}ms`);

      // Mobile should still be performant (allowing slightly more time)
      expect(mobileLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.MODAL_LOAD_TIME * 1.5);

      await page.click('[data-testid="close-modal-button"]');

      // Reset viewport
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    test('should handle touch interactions efficiently', async () => {
      await page.setViewportSize({ width: 375, height: 812 });

      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      await performanceMonitor.startMeasure('touch-response');

      // Simulate touch interaction
      const qrCodeBlock = page.locator('[data-testid="qr-code-block"]');
      await qrCodeBlock.tap();

      const touchResponseTime = await performanceMonitor.endMeasure('touch-response');

      console.log(`👆 Touch response time: ${touchResponseTime.toFixed(2)}ms`);

      expect(touchResponseTime).toBeLessThan(50);

      await page.click('[data-testid="close-modal-button"]');
      await page.setViewportSize({ width: 1280, height: 720 });
    });
  });

  test.describe('📊 Performance Regression Prevention', () => {
    test('should maintain baseline performance metrics', async () => {
      const performanceBaseline = {
        modalLoadTime: PERFORMANCE_THRESHOLDS.MODAL_LOAD_TIME,
        cachedLoadTime: PERFORMANCE_THRESHOLDS.CACHED_LOAD_TIME,
        memoryGrowth: PERFORMANCE_THRESHOLDS.MEMORY_GROWTH_LIMIT,
        interactionResponse: PERFORMANCE_THRESHOLDS.INTERACTION_RESPONSE
      };

      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      // Test all key metrics
      const measurements: Record<string, number> = {};

      // Modal load time
      await performanceMonitor.startMeasure('baseline-modal-load');
      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');
      measurements.modalLoadTime = await performanceMonitor.endMeasure('baseline-modal-load');

      // Interaction response
      await performanceMonitor.startMeasure('baseline-interaction');
      await page.click('[data-testid="close-modal-button"]');
      await page.waitForSelector('[data-testid="order-detail-modal"]', { state: 'hidden' });
      measurements.interactionResponse = await performanceMonitor.endMeasure('baseline-interaction');

      // Validate against baseline
      Object.entries(measurements).forEach(([metric, value]) => {
        const threshold = performanceBaseline[metric as keyof typeof performanceBaseline];
        console.log(`🎯 ${metric}: ${value.toFixed(2)}ms / ${threshold}ms`);
        expect(value).toBeLessThan(threshold);
      });

      // Export metrics for CI/CD monitoring
      const allMeasurements = performanceMonitor.getMeasurements();
      console.log('📈 Performance Metrics Export:', JSON.stringify(allMeasurements, null, 2));
    });

    test('should export performance data for monitoring', async () => {
      await page.goto('/orders');
      await page.waitForLoadState('networkidle');

      const orderRow = page.locator('[data-testid="order-row"]').first();
      await orderRow.click();
      await page.waitForSelector('[data-testid="order-detail-modal"]');

      const performanceData = await page.evaluate(() => {
        return {
          navigation: performance.getEntriesByType('navigation')[0],
          resources: performance.getEntriesByType('resource').length,
          measures: performance.getEntriesByType('measure').length,
          memory: (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize
          } : null,
          timing: {
            domContentLoaded: performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd,
            loadComplete: performance.getEntriesByType('navigation')[0]?.loadEventEnd
          }
        };
      });

      expect(performanceData).toHaveProperty('navigation');
      expect(performanceData).toHaveProperty('resources');
      expect(performanceData).toHaveProperty('timing');

      console.log('📊 Performance Export:', JSON.stringify(performanceData, null, 2));

      await page.click('[data-testid="close-modal-button"]');
    });
  });
});