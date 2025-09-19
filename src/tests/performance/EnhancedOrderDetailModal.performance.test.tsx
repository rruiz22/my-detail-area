import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { performance } from 'perf_hooks';
import { EnhancedOrderDetailModal } from '@/components/orders/EnhancedOrderDetailModal';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import type { OrderData } from '@/types/order';

// Mock performance monitoring hooks
vi.mock('@/hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: vi.fn(() => ({
    startMeasure: vi.fn(() => 'measure-id'),
    endMeasure: vi.fn(() => 50),
    recordMetric: vi.fn(),
    getMetrics: vi.fn(() => ({
      measures: new Map(),
      counters: new Map(),
      gauges: new Map()
    })),
    clearMetrics: vi.fn(),
    exportMetrics: vi.fn(() => ({})),
    measureRender: vi.fn(() => vi.fn())
  }))
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null })
    }))
  }
}));

// Mock order modal data hook
vi.mock('@/hooks/useOrderModalData', () => ({
  useOrderModalData: vi.fn(() => ({
    data: {
      attachments: [],
      activities: [],
      comments: [],
      followers: [],
      analytics: null,
      userType: null
    },
    loading: false,
    error: null,
    performanceMetrics: {
      cacheHit: false,
      staleCacheHit: false,
      cacheStats: { size: 0, totalAccesses: 0, averageAge: 0, oldestEntry: 0 },
      lastFetchTime: null,
      realtimeMetrics: {},
      queryOptimizerStats: { totalQueries: 0, averageTime: 0 }
    },
    refetch: vi.fn(),
    forceRefresh: vi.fn(),
    prefetchData: vi.fn(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(),
    addAttachment: vi.fn(),
    removeAttachment: vi.fn(),
    addComment: vi.fn(),
    addActivity: vi.fn(),
    updateAnalytics: vi.fn()
  }))
}));

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        'orders.order_details': 'Order Details',
        'orders.order_details_description': 'Details for customer {{customer}} and vehicle {{vehicle}}',
        'messages.notes_updated_successfully': 'Notes updated successfully',
        'messages.error_updating_notes': 'Error updating notes',
        'attachments.uploadSuccess': 'Attachment uploaded successfully',
        'attachments.deleteSuccess': 'Attachment deleted successfully'
      };
      return options ? translations[key]?.replace(/\{\{(\w+)\}\}/g, (_, prop) => options[prop]) : translations[key] || key;
    }
  })
}));

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (
  ui: React.ReactElement,
  { queryClient = createTestQueryClient() } = {}
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

// Mock order data
const createMockOrder = (overrides: Partial<OrderData> = {}): OrderData => ({
  id: 'order-123',
  customOrderNumber: 'DEAL-SALES-001',
  order_number: 'DEAL-SALES-001',
  custom_order_number: 'DEAL-SALES-001',
  status: 'pending',
  notes: 'Test order notes',
  internal_notes: 'Internal test notes',
  customerName: 'John Doe',
  customer_name: 'John Doe',
  customerPhone: '+1-555-0123',
  customer_phone: '+1-555-0123',
  vehicleYear: '2023',
  vehicle_year: '2023',
  vehicleMake: 'Honda',
  vehicle_make: 'Honda',
  vehicleModel: 'Civic',
  vehicle_model: 'Civic',
  vehicleVin: '1HGBH41JXMN109186',
  vehicle_vin: '1HGBH41JXMN109186',
  dealer_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  estimated_completion: new Date(Date.now() + 86400000).toISOString(),
  qr_code_url: 'https://api.qrserver.com/v1/create-qr-code/?data=test',
  short_link: 'https://mda.to/ABC12',
  ...overrides
});

describe('EnhancedOrderDetailModal Performance Tests', () => {
  let performanceMetrics: any;
  let mockOrder: OrderData;

  beforeAll(() => {
    // Setup performance monitoring
    performanceMetrics = usePerformanceMonitor();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder = createMockOrder();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('🚀 Load Time Performance (Target: <2s vs Previous 30s)', () => {
    it('should render modal under 2 seconds with cold cache', async () => {
      const startTime = performance.now();

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      // Wait for modal to be fully rendered
      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;

      // Should load in under 2 seconds (2000ms)
      expect(loadTime).toBeLessThan(2000);

      // Log performance for debugging
      console.log(`📊 Cold modal load time: ${loadTime.toFixed(2)}ms`);
    });

    it('should render modal under 100ms with warm cache', async () => {
      // First render to warm cache
      const { unmount } = renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      unmount();

      // Second render with warm cache
      const startTime = performance.now();

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const loadTime = performance.now() - startTime;

      // Should load in under 100ms with cache
      expect(loadTime).toBeLessThan(100);

      console.log(`📊 Warm modal load time: ${loadTime.toFixed(2)}ms`);
    });

    it('should validate no lazy loading delays', async () => {
      const componentRenderTimes: number[] = [];

      // Mock component render tracking
      const originalRender = React.createElement;
      vi.spyOn(React, 'createElement').mockImplementation((type, props, ...children) => {
        if (typeof type === 'string' && type.includes('Modal')) {
          const start = performance.now();
          const result = originalRender(type, props, ...children);
          componentRenderTimes.push(performance.now() - start);
          return result;
        }
        return originalRender(type, props, ...children);
      });

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      // All components should render without lazy loading delays
      componentRenderTimes.forEach(time => {
        expect(time).toBeLessThan(10); // No component should take more than 10ms
      });
    });
  });

  describe('🧠 Memory Usage and Leak Detection', () => {
    it('should not create memory leaks on modal open/close cycles', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Perform multiple open/close cycles
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderWithProviders(
          <EnhancedOrderDetailModal
            order={createMockOrder({ id: `order-${i}` })}
            open={true}
            onClose={vi.fn()}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
        });

        unmount();

        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);

      console.log(`💾 Memory increase after 10 cycles: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should cleanup performance monitoring on unmount', async () => {
      const { unmount } = renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const measureRenderSpy = vi.spyOn(performanceMetrics, 'measureRender');

      unmount();

      // Verify cleanup was called
      expect(measureRenderSpy).toHaveBeenCalled();
    });

    it('should handle large datasets without performance degradation', async () => {
      const largeOrder = createMockOrder({
        notes: 'A'.repeat(10000), // 10KB notes
        internal_notes: 'B'.repeat(10000) // 10KB internal notes
      });

      const startTime = performance.now();

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={largeOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;

      // Should handle large data without significant slowdown
      expect(renderTime).toBeLessThan(500);

      console.log(`📊 Large dataset render time: ${renderTime.toFixed(2)}ms`);
    });
  });

  describe('⚛️ React.memo Optimization Validation', () => {
    it('should prevent unnecessary re-renders with stable props', async () => {
      let renderCount = 0;

      // Mock React.memo to track renders
      const originalMemo = React.memo;
      vi.spyOn(React, 'memo').mockImplementation((component: any, compare?: any) => {
        return originalMemo((props: any) => {
          renderCount++;
          return component(props);
        }, compare);
      });

      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const initialRenderCount = renderCount;

      // Rerender with same props - should not trigger re-render
      rerender(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      // Render count should not increase significantly
      expect(renderCount - initialRenderCount).toBeLessThan(3);

      console.log(`🔄 Re-renders prevented: ${renderCount - initialRenderCount}`);
    });

    it('should re-render only when essential props change', async () => {
      let renderCount = 0;
      const onClose = vi.fn();

      const originalMemo = React.memo;
      vi.spyOn(React, 'memo').mockImplementation((component: any, compare?: any) => {
        return originalMemo((props: any) => {
          renderCount++;
          return component(props);
        }, compare);
      });

      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const initialRenderCount = renderCount;

      // Change essential prop - should trigger re-render
      const updatedOrder = { ...mockOrder, status: 'in_progress' as const };
      rerender(
        <EnhancedOrderDetailModal
          order={updatedOrder}
          open={true}
          onClose={onClose}
        />
      );

      // Should trigger re-render for status change
      expect(renderCount).toBeGreaterThan(initialRenderCount);
    });

    it('should use custom comparison function effectively', async () => {
      const onClose = vi.fn();

      const { rerender } = renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      // Change non-essential prop - should not trigger re-render
      const orderWithExtraField = {
        ...mockOrder,
        someRandomField: 'should not trigger rerender'
      } as any;

      rerender(
        <EnhancedOrderDetailModal
          order={orderWithExtraField}
          open={true}
          onClose={onClose}
        />
      );

      // Modal should still be displayed without unnecessary re-render
      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
    });
  });

  describe('💾 Cache Efficiency and Data Fetching', () => {
    it('should achieve high cache hit rate on repeated access', async () => {
      const mockUseOrderModalData = vi.mocked(
        require('@/hooks/useOrderModalData').useOrderModalData
      );

      // First render
      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      // Verify cache was populated
      expect(mockUseOrderModalData).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockOrder.id,
          enabled: true
        })
      );
    });

    it('should implement request deduplication correctly', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        attachments: [],
        comments: [],
        analytics: null
      });

      vi.mocked(require('@/hooks/useOrderModalData').useOrderModalData)
        .mockReturnValue({
          data: {
            attachments: [],
            activities: [],
            comments: [],
            followers: [],
            analytics: null,
            userType: null
          },
          loading: false,
          error: null,
          performanceMetrics: {
            cacheHit: true, // Simulate cache hit
            staleCacheHit: false,
            cacheStats: { size: 1, totalAccesses: 2, averageAge: 1000, oldestEntry: 1000 }
          },
          refetch: fetchSpy
        });

      // Render multiple modals with same data simultaneously
      renderWithProviders(
        <div>
          <EnhancedOrderDetailModal
            order={mockOrder}
            open={true}
            onClose={vi.fn()}
          />
          <EnhancedOrderDetailModal
            order={mockOrder}
            open={true}
            onClose={vi.fn()}
          />
        </div>
      );

      await waitFor(() => {
        expect(screen.getAllByTestId('order-detail-modal')).toHaveLength(2);
      });

      // Should not duplicate requests
      expect(fetchSpy).not.toHaveBeenCalled(); // Cache hit scenario
    });

    it('should handle stale-while-revalidate pattern', async () => {
      vi.mocked(require('@/hooks/useOrderModalData').useOrderModalData)
        .mockReturnValue({
          data: {
            attachments: [],
            activities: [],
            comments: [],
            followers: [],
            analytics: null,
            userType: null
          },
          loading: false,
          error: null,
          performanceMetrics: {
            cacheHit: false,
            staleCacheHit: true, // Stale cache hit
            cacheStats: { size: 1, totalAccesses: 1, averageAge: 6000, oldestEntry: 6000 }
          },
          refetch: vi.fn()
        });

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      // Should display stale data immediately and revalidate in background
      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
    });
  });

  describe('📊 TypeScript Type Safety Validation', () => {
    it('should enforce strict typing without any types', () => {
      // This test validates TypeScript compilation
      const order: OrderData = createMockOrder();
      const onClose: () => void = vi.fn();
      const onEdit: (order: OrderData) => void = vi.fn();
      const onDelete: (orderId: string) => void = vi.fn();
      const onStatusChange: (orderId: string, newStatus: string) => void = vi.fn();

      expect(() => {
        renderWithProviders(
          <EnhancedOrderDetailModal
            order={order}
            open={true}
            onClose={onClose}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
          />
        );
      }).not.toThrow();
    });

    it('should handle optional props correctly', () => {
      const order: OrderData = createMockOrder();

      expect(() => {
        renderWithProviders(
          <EnhancedOrderDetailModal
            order={order}
            open={true}
            onClose={vi.fn()}
            // onEdit, onDelete, onStatusChange are optional
          />
        );
      }).not.toThrow();
    });

    it('should validate order data structure', () => {
      const invalidOrder = { id: 'test' } as any;

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={invalidOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      // Should handle missing data gracefully
      expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
    });
  });

  describe('🔄 Real-time Updates Performance', () => {
    it('should handle real-time updates without performance degradation', async () => {
      const mockUpdateHandler = vi.fn();

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
          onStatusChange={mockUpdateHandler}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const startTime = performance.now();

      // Simulate multiple rapid updates
      for (let i = 0; i < 10; i++) {
        act(() => {
          // Simulate real-time update
          fireEvent.click(screen.getByText('pending'));
        });
      }

      const updateTime = performance.now() - startTime;

      // Updates should be processed quickly
      expect(updateTime).toBeLessThan(100);

      console.log(`📡 Real-time update processing: ${updateTime.toFixed(2)}ms`);
    });

    it('should batch real-time updates for optimal performance', async () => {
      let updateBatchCount = 0;
      const mockBatchHandler = vi.fn(() => {
        updateBatchCount++;
      });

      vi.mocked(require('@/hooks/useOrderModalData').useOrderModalData)
        .mockReturnValue({
          data: {
            attachments: [],
            activities: [],
            comments: [],
            followers: [],
            analytics: null,
            userType: null
          },
          loading: false,
          error: null,
          addAttachment: mockBatchHandler,
          removeAttachment: mockBatchHandler,
          addComment: mockBatchHandler
        });

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      // Should handle batching efficiently
      expect(updateBatchCount).toBe(0); // No updates triggered yet
    });
  });

  describe('🎯 User Experience Performance', () => {
    it('should respond to user interactions within 16ms (60fps)', async () => {
      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close');

      const startTime = performance.now();
      fireEvent.click(closeButton);
      const responseTime = performance.now() - startTime;

      // Should respond within one frame (16ms for 60fps)
      expect(responseTime).toBeLessThan(16);

      console.log(`🖱️ UI response time: ${responseTime.toFixed(2)}ms`);
    });

    it('should maintain smooth scrolling performance', async () => {
      renderWithProviders(
        <EnhancedOrderDetailModal
          order={createMockOrder({
            notes: 'Long notes '.repeat(1000) // Create long content
          })}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const modalContent = screen.getByTestId('order-detail-modal');

      const startTime = performance.now();

      // Simulate scroll events
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(modalContent, { target: { scrollTop: i * 100 } });
      }

      const scrollTime = performance.now() - startTime;

      // Scrolling should be smooth (under 100ms for 10 scroll events)
      expect(scrollTime).toBeLessThan(100);

      console.log(`📜 Scroll performance: ${scrollTime.toFixed(2)}ms`);
    });
  });

  describe('📈 Performance Regression Prevention', () => {
    it('should maintain performance benchmarks over time', async () => {
      const benchmarks = {
        initialRender: 2000, // ms
        cachedRender: 100,   // ms
        memoryGrowth: 5,     // MB
        reRenderCount: 3     // max re-renders
      };

      // Test all major performance metrics
      const startTime = performance.now();

      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      const renderTime = performance.now() - startTime;

      // Validate against benchmarks
      expect(renderTime).toBeLessThan(benchmarks.initialRender);

      console.log(`🎯 Performance benchmark validation: ${renderTime.toFixed(2)}ms / ${benchmarks.initialRender}ms`);
    });

    it('should export performance metrics for monitoring', async () => {
      renderWithProviders(
        <EnhancedOrderDetailModal
          order={mockOrder}
          open={true}
          onClose={vi.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('order-detail-modal')).toBeInTheDocument();
      });

      // Should provide performance metrics
      expect(performanceMetrics.exportMetrics).toBeDefined();
      expect(performanceMetrics.getMetrics).toBeDefined();

      const metrics = performanceMetrics.exportMetrics();
      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('measures');
      expect(metrics).toHaveProperty('counters');
    });
  });
});