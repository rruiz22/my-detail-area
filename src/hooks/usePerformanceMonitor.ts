import { useCallback, useRef, useEffect } from 'react';

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  type: 'measure' | 'counter' | 'gauge';
}

interface PerformanceData {
  measures: Map<string, number>;
  counters: Map<string, number>;
  gauges: Map<string, number>;
}

// Global performance store for the modal system
const performanceStore: PerformanceData = {
  measures: new Map(),
  counters: new Map(),
  gauges: new Map()
};

export function usePerformanceMonitor() {
  const measureStartTimes = useRef<Map<string, number>>(new Map());

  // Start measuring a performance metric
  const startMeasure = useCallback((name: string): string => {
    const measureId = `${name}-${Date.now()}-${Math.random()}`;
    measureStartTimes.current.set(measureId, performance.now());
    
    // Use Performance API if available
    if (window.performance?.mark) {
      window.performance.mark(`${name}-start`);
    }
    
    return measureId;
  }, []);

  // End measuring and record the duration
  const endMeasure = useCallback((measureId: string, name?: string): number => {
    const startTime = measureStartTimes.current.get(measureId);
    if (!startTime) {
      console.warn(`No start time found for measure: ${measureId}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    measureStartTimes.current.delete(measureId);

    const metricName = name || (measureId?.includes('-') ? measureId.split('-')[0] : measureId) || 'unknown';
    performanceStore.measures.set(metricName, duration);

    // Use Performance API if available
    if (window.performance?.mark && window.performance?.measure) {
      try {
        window.performance.mark(`${metricName}-end`);
        window.performance.measure(metricName, `${metricName}-start`, `${metricName}-end`);
      } catch (error) {
        // Silently handle performance API errors
        console.debug('Performance API error:', error);
      }
    }

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`Slow operation detected: ${metricName} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }, []);

  // Record a simple metric value
  const recordMetric = useCallback((name: string, value: number, type: 'counter' | 'gauge' = 'counter') => {
    if (type === 'counter') {
      const current = performanceStore.counters.get(name) || 0;
      performanceStore.counters.set(name, current + value);
    } else {
      performanceStore.gauges.set(name, value);
    }

    // Custom event for performance monitoring tools
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('modal-performance-metric', {
        detail: { name, value, type, timestamp: Date.now() }
      }));
    }
  }, []);

  // Get all performance metrics
  const getMetrics = useCallback((): PerformanceData => {
    return {
      measures: new Map(performanceStore.measures),
      counters: new Map(performanceStore.counters),
      gauges: new Map(performanceStore.gauges)
    };
  }, []);

  // Clear all metrics
  const clearMetrics = useCallback(() => {
    performanceStore.measures.clear();
    performanceStore.counters.clear();
    performanceStore.gauges.clear();
    measureStartTimes.current.clear();
  }, []);

  // Export metrics for external monitoring
  const exportMetrics = useCallback(() => {
    const metrics = getMetrics();
    return {
      measures: Object.fromEntries(metrics.measures),
      counters: Object.fromEntries(metrics.counters),
      gauges: Object.fromEntries(metrics.gauges),
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
  }, [getMetrics]);

  // Monitor React render performance
  const measureRender = useCallback((componentName: string) => {
    const measureId = startMeasure(`render-${componentName}`);
    
    return () => {
      endMeasure(measureId, `render-${componentName}`);
    };
  }, [startMeasure, endMeasure]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      measureStartTimes.current.clear();
    };
  }, []);

  return {
    startMeasure,
    endMeasure,
    recordMetric,
    getMetrics,
    clearMetrics,
    exportMetrics,
    measureRender
  };
}

// Hook for getting performance insights
export function usePerformanceInsights() {
  const getInsights = useCallback(() => {
    const metrics = {
      measures: Object.fromEntries(performanceStore.measures),
      counters: Object.fromEntries(performanceStore.counters),
      gauges: Object.fromEntries(performanceStore.gauges)
    };

    // Calculate insights
    const insights = {
      averageRenderTime: calculateAverage(metrics.measures, 'render-'),
      slowestOperation: findSlowest(metrics.measures),
      totalErrorCount: metrics.counters['modal-error'] || 0,
      totalSuccessCount: metrics.counters['modal-success'] || 0,
      memoryUsage: (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };

    return insights;
  }, []);

  return { getInsights };
}

// Utility functions for performance analysis
function calculateAverage(measures: Record<string, number>, prefix: string): number {
  const relevantMeasures = Object.entries(measures)
    .filter(([name]) => name.startsWith(prefix))
    .map(([, value]) => value);

  if (relevantMeasures.length === 0) return 0;
  return relevantMeasures.reduce((sum, value) => sum + value, 0) / relevantMeasures.length;
}

function findSlowest(measures: Record<string, number>): { name: string; duration: number } | null {
  const entries = Object.entries(measures);
  if (entries.length === 0) return null;

  const [slowestName, slowestDuration] = entries.reduce(
    (max, [name, duration]) => duration > max[1] ? [name, duration] : max,
    ['', 0]
  );

  return { name: slowestName, duration: slowestDuration };
}

// Performance monitoring component for debugging
export function PerformanceMonitor({ enabled = false }: { enabled?: boolean }) {
  const { getInsights } = usePerformanceInsights();

  useEffect(() => {
    if (!enabled || process.env.NODE_ENV !== 'development') return;

    const interval = setInterval(() => {
      const insights = getInsights();
      console.group('🚀 Modal Performance Insights');
      console.log('Average Render Time:', `${insights.averageRenderTime.toFixed(2)}ms`);
      console.log('Slowest Operation:', insights.slowestOperation);
      console.log('Total Errors:', insights.totalErrorCount);
      console.log('Memory Usage:', insights.memoryUsage);
      console.groupEnd();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [enabled, getInsights]);

  return null;
}