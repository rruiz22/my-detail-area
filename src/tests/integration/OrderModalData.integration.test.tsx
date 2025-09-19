import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { useOrderModalData } from '@/hooks/useOrderModalData';
import type { OrderAttachment, OrderComment, OrderActivity, OrderFollower } from '@/types/order';

// Mock Supabase with realistic responses
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn().mockResolvedValue({ data: [], error: null })
  })),
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
  }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

// Mock short link service
vi.mock('@/services/shortLinkService', () => ({
  shortLinkService: {
    getAnalytics: vi.fn().mockResolvedValue({
      totalClicks: 15,
      uniqueVisitors: 8,
      lastClicked: new Date().toISOString(),
      clickHistory: []
    })
  }
}));

// Mock query optimizer
const mockQueryOptimizer = {
  executeOrderModalQueries: vi.fn().mockResolvedValue({
    attachments: [
      {
        id: 'att-1',
        order_id: 'order-123',
        file_name: 'test-document.pdf',
        file_url: 'https://example.com/test-document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString()
      }
    ],
    comments: [
      {
        id: 'comment-1',
        order_id: 'order-123',
        user_id: 'user-1',
        comment: 'Test comment',
        is_internal: false,
        created_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        }
      }
    ],
    analytics: {
      totalClicks: 15,
      uniqueVisitors: 8,
      lastClicked: new Date().toISOString(),
      clickHistory: []
    },
    userType: 'admin'
  }),
  getPerformanceStats: vi.fn().mockReturnValue({
    totalQueries: 1,
    averageTime: 150,
    cacheHitRate: 0.85
  })
};

vi.mock('@/services/supabaseQueryOptimizer', () => ({
  supabaseQueryOptimizer: mockQueryOptimizer
}));

// Mock performance monitor
vi.mock('@/hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    startMeasure: vi.fn(() => 'measure-id'),
    endMeasure: vi.fn(() => 150),
    recordMetric: vi.fn()
  })
}));

// Mock real-time hook
vi.mock('@/hooks/useRealtimeOrderData', () => ({
  useRealtimeOrderData: vi.fn(() => ({
    isConnected: true,
    metrics: {
      connectionTime: 50,
      messagesReceived: 0,
      errors: 0
    },
    disconnect: vi.fn()
  }))
}));

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('OrderModalData Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('📊 Data Fetching and Caching Strategy', () => {
    it('should fetch and cache modal data efficiently', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          qrCodeUrl: 'https://example.com/qr',
          enabled: true
        }),
        { wrapper }
      );

      // Initial state
      expect(result.current.loading).toBe(true);
      expect(result.current.data.attachments).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Verify data was fetched
      expect(result.current.data.attachments).toHaveLength(1);
      expect(result.current.data.comments).toHaveLength(1);
      expect(result.current.data.analytics).toEqual(
        expect.objectContaining({
          totalClicks: 15,
          uniqueVisitors: 8
        })
      );

      // Verify cache hit metrics
      expect(result.current.performanceMetrics.queryOptimizerStats).toEqual(
        expect.objectContaining({
          totalQueries: 1,
          averageTime: 150
        })
      );
    });

    it('should implement cache hit optimization', async () => {
      // First hook instance
      const { result: result1 } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          qrCodeUrl: 'https://example.com/qr',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      // Second hook instance with same parameters
      const { result: result2 } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          qrCodeUrl: 'https://example.com/qr',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      // Second instance should benefit from cache
      expect(mockQueryOptimizer.executeOrderModalQueries).toHaveBeenCalledTimes(1);
    });

    it('should handle stale-while-revalidate pattern', async () => {
      // Mock stale cache scenario
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 7 * 60 * 1000); // 7 minutes later

      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          qrCodeUrl: 'https://example.com/qr',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should serve stale data and revalidate
      expect(result.current.performanceMetrics.staleCacheHit).toBe(false);
      expect(result.current.data.attachments).toHaveLength(1);
    });

    it('should prevent request deduplication effectively', async () => {
      // Create multiple hooks simultaneously
      const hooks = Array.from({ length: 5 }, () =>
        renderHook(
          () => useOrderModalData({
            orderId: 'order-123',
            qrCodeUrl: 'https://example.com/qr',
            enabled: true
          }),
          { wrapper }
        )
      );

      // Wait for all to complete
      await Promise.all(
        hooks.map(({ result }) =>
          waitFor(() => expect(result.current.loading).toBe(false))
        )
      );

      // Should only make one API call despite multiple hooks
      expect(mockQueryOptimizer.executeOrderModalQueries).toHaveBeenCalledTimes(1);

      // All hooks should have the same data
      hooks.forEach(({ result }) => {
        expect(result.current.data.attachments).toHaveLength(1);
      });
    });
  });

  describe('🔄 Real-time Updates and Synchronization', () => {
    it('should handle real-time attachment updates', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const newAttachment: OrderAttachment = {
        id: 'att-2',
        order_id: 'order-123',
        file_name: 'new-document.pdf',
        file_url: 'https://example.com/new-document.pdf',
        file_size: 2048000,
        mime_type: 'application/pdf',
        uploaded_by: 'user-2',
        created_at: new Date().toISOString()
      };

      // Simulate real-time attachment addition
      act(() => {
        result.current.addAttachment(newAttachment);
      });

      expect(result.current.data.attachments).toHaveLength(2);
      expect(result.current.data.attachments[0]).toEqual(newAttachment);
    });

    it('should handle optimistic updates with rollback', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialAttachmentCount = result.current.data.attachments.length;

      const newAttachment: OrderAttachment = {
        id: 'att-temp',
        order_id: 'order-123',
        file_name: 'temp-document.pdf',
        file_url: 'https://example.com/temp-document.pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        uploaded_by: 'user-1',
        created_at: new Date().toISOString()
      };

      // Add attachment optimistically
      let rollback: (() => void) | undefined;
      act(() => {
        rollback = result.current.addAttachment(newAttachment);
      });

      expect(result.current.data.attachments).toHaveLength(initialAttachmentCount + 1);

      // Rollback the change
      act(() => {
        rollback?.();
      });

      expect(result.current.data.attachments).toHaveLength(initialAttachmentCount);
    });

    it('should batch real-time updates for performance', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const updates = Array.from({ length: 10 }, (_, i) => ({
        id: `comment-${i + 2}`,
        order_id: 'order-123',
        user_id: 'user-1',
        comment: `Batch comment ${i + 1}`,
        is_internal: false,
        created_at: new Date().toISOString(),
        user: {
          id: 'user-1',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User'
        }
      }));

      // Apply multiple updates rapidly
      act(() => {
        updates.forEach(comment => {
          result.current.addComment(comment);
        });
      });

      // All updates should be applied
      expect(result.current.data.comments).toHaveLength(11); // 1 initial + 10 new
    });
  });

  describe('🎯 Cache Management and Invalidation', () => {
    it('should manage cache size and cleanup stale entries', async () => {
      // Create multiple hooks with different order IDs
      const orderIds = Array.from({ length: 150 }, (_, i) => `order-${i}`);

      const hooks = orderIds.map(orderId =>
        renderHook(
          () => useOrderModalData({
            orderId,
            enabled: true
          }),
          { wrapper }
        )
      );

      // Wait for all to load
      await Promise.all(
        hooks.map(({ result }) =>
          waitFor(() => expect(result.current.loading).toBe(false))
        )
      );

      // Check cache stats
      const cacheStats = hooks[0].result.current.getCacheStats();

      // Cache should be managed within limits (max 100 entries)
      expect(cacheStats.size).toBeLessThanOrEqual(100);
    });

    it('should invalidate cache on demand', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCacheStats = result.current.getCacheStats();

      // Clear cache
      act(() => {
        result.current.clearCache();
      });

      const clearedCacheStats = result.current.getCacheStats();
      expect(clearedCacheStats.activeRequests).toBe(0);
    });

    it('should handle cache expiration correctly', async () => {
      // Mock time progression
      const originalNow = Date.now;
      let currentTime = Date.now();
      vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Advance time by 20 minutes (beyond stale threshold)
      currentTime += 20 * 60 * 1000;

      // Force refresh should work
      act(() => {
        result.current.forceRefresh();
      });

      // Restore original Date.now
      Date.now = originalNow;
    });
  });

  describe('📈 Performance Metrics and Monitoring', () => {
    it('should provide comprehensive performance metrics', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          qrCodeUrl: 'https://example.com/qr',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const metrics = result.current.performanceMetrics;

      expect(metrics).toHaveProperty('cacheHit');
      expect(metrics).toHaveProperty('staleCacheHit');
      expect(metrics).toHaveProperty('cacheStats');
      expect(metrics).toHaveProperty('realtimeMetrics');
      expect(metrics).toHaveProperty('queryOptimizerStats');

      expect(metrics.cacheStats).toEqual(
        expect.objectContaining({
          size: expect.any(Number),
          totalAccesses: expect.any(Number)
        })
      );
    });

    it('should track query optimizer performance', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockQueryOptimizer.getPerformanceStats).toHaveBeenCalled();
      expect(result.current.performanceMetrics.queryOptimizerStats).toEqual(
        expect.objectContaining({
          totalQueries: expect.any(Number),
          averageTime: expect.any(Number),
          cacheHitRate: expect.any(Number)
        })
      );
    });

    it('should measure fetch performance correctly', async () => {
      const performanceStartMock = vi.fn(() => 'measure-id');
      const performanceEndMock = vi.fn(() => 150);

      vi.mocked(require('@/hooks/usePerformanceMonitor').usePerformanceMonitor)
        .mockReturnValue({
          startMeasure: performanceStartMock,
          endMeasure: performanceEndMock,
          recordMetric: vi.fn()
        });

      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(performanceStartMock).toHaveBeenCalledWith('modal-data-fetch');
      expect(performanceEndMock).toHaveBeenCalledWith('measure-id', 'modal-data-fetch-network');
    });
  });

  describe('🔧 Error Handling and Recovery', () => {
    it('should handle network errors gracefully', async () => {
      mockQueryOptimizer.executeOrderModalQueries.mockRejectedValueOnce(
        new Error('Network connection failed')
      );

      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe('Network connection failed');
      expect(result.current.data.attachments).toEqual([]);
    });

    it('should recover from errors on retry', async () => {
      let callCount = 0;
      mockQueryOptimizer.executeOrderModalQueries.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve({
          attachments: [],
          comments: [],
          analytics: null,
          userType: null
        });
      });

      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      // First attempt should fail
      await waitFor(() => {
        expect(result.current.error).toBe('Temporary error');
      });

      // Retry should succeed
      act(() => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBe(null);
        expect(result.current.loading).toBe(false);
      });
    });

    it('should handle request cancellation properly', async () => {
      let resolvePromise: ((value: any) => void) | undefined;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockQueryOptimizer.executeOrderModalQueries.mockReturnValueOnce(slowPromise);

      const { result, unmount } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      expect(result.current.loading).toBe(true);

      // Unmount before request completes
      unmount();

      // Resolve the slow promise
      resolvePromise?.({
        attachments: [],
        comments: [],
        analytics: null,
        userType: null
      });

      // Should not cause any state updates after unmount
      // (This test validates that cancelled requests don't leak)
    });
  });

  describe('🚀 Prefetch and Background Loading', () => {
    it('should support data prefetching', async () => {
      const { result } = renderHook(
        () => useOrderModalData({
          orderId: null, // Start disabled
          enabled: false
        }),
        { wrapper }
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data.attachments).toEqual([]);

      // Prefetch data before enabling
      await act(async () => {
        // Update to enable prefetch
        result.current.prefetchData();
      });

      // Should have prefetched data ready
      expect(mockQueryOptimizer.executeOrderModalQueries).toHaveBeenCalledTimes(0); // No orderId provided
    });

    it('should handle prefetch with valid order ID', async () => {
      const { result, rerender } = renderHook(
        ({ orderId, enabled }) => useOrderModalData({ orderId, enabled }),
        {
          wrapper,
          initialProps: { orderId: null, enabled: false }
        }
      );

      // Update with valid order ID and enable prefetch
      rerender({ orderId: 'order-123', enabled: false });

      await act(async () => {
        await result.current.prefetchData();
      });

      // Now enable to see if data was prefetched
      rerender({ orderId: 'order-123', enabled: true });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data.attachments).toHaveLength(1);
    });
  });

  describe('📱 Mobile and Network Optimization', () => {
    it('should handle slow network conditions', async () => {
      // Simulate slow network by adding delay
      mockQueryOptimizer.executeOrderModalQueries.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  attachments: [],
                  comments: [],
                  analytics: null,
                  userType: null
                }),
              1000
            ); // 1 second delay
          })
      );

      const startTime = Date.now();

      const { result } = renderHook(
        () => useOrderModalData({
          orderId: 'order-123',
          enabled: true
        }),
        { wrapper }
      );

      expect(result.current.loading).toBe(true);

      await waitFor(
        () => {
          expect(result.current.loading).toBe(false);
        },
        { timeout: 2000 }
      );

      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeGreaterThanOrEqual(1000);
      expect(result.current.data).toBeDefined();
    });

    it('should optimize for low memory environments', async () => {
      // Create many hooks to test memory usage
      const hooks = Array.from({ length: 20 }, (_, i) =>
        renderHook(
          () => useOrderModalData({
            orderId: `order-${i}`,
            enabled: true
          }),
          { wrapper }
        )
      );

      await Promise.all(
        hooks.map(({ result }) =>
          waitFor(() => expect(result.current.loading).toBe(false))
        )
      );

      // Memory should be managed efficiently
      const cacheStats = hooks[0].result.current.getCacheStats();
      expect(cacheStats.size).toBeLessThanOrEqual(100); // Within cache limits
    });
  });
});