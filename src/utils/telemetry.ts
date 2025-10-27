/**
 * Telemetry and Monitoring System
 *
 * Tracks application performance, user behavior, and system health.
 *
 * Features:
 * - Performance tracking (page loads, API calls)
 * - User action tracking
 * - Error tracking
 * - Custom metrics
 * - Integration with analytics services (Google Analytics, Mixpanel, etc.)
 */

import { logger } from './logger';

/**
 * Event categories for better organization
 */
export enum EventCategory {
  // User interactions
  USER_ACTION = 'user_action',
  NAVIGATION = 'navigation',

  // System events
  PERFORMANCE = 'performance',
  ERROR = 'error',

  // Business events
  PERMISSION = 'permission',
  ORDER = 'order',
  INVENTORY = 'inventory',

  // Technical events
  API_CALL = 'api_call',
  CACHE = 'cache',
}

/**
 * Event interface
 */
export interface TelemetryEvent {
  category: EventCategory;
  action: string;
  label?: string;
  value?: number;
  metadata?: Record<string, any>;
  timestamp?: number;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count';
  metadata?: Record<string, any>;
}

/**
 * Telemetry service class
 */
class TelemetryService {
  private events: TelemetryEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private sessionId: string;
  private isEnabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = this.shouldEnable();

    if (this.isEnabled) {
      logger.dev('📊 Telemetry service initialized', { sessionId: this.sessionId });
      this.setupPerformanceObserver();
    }
  }

  /**
   * Check if telemetry should be enabled
   */
  private shouldEnable(): boolean {
    // Disabled in development by default (can be enabled with localStorage flag)
    if (import.meta.env.DEV) {
      return localStorage.getItem('enable_telemetry') === 'true';
    }

    // Enabled in production (respect user privacy settings)
    return !localStorage.getItem('disable_telemetry');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup performance observer for automatic metrics
   */
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.trackMetric({
              name: 'page_load_time',
              value: navEntry.loadEventEnd - navEntry.fetchStart,
              unit: 'ms',
              metadata: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
                domComplete: navEntry.domComplete - navEntry.fetchStart
              }
            });
          }
        }
      });

      navObserver.observe({ entryTypes: ['navigation'] });

      // Observe resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;

            // Track slow resources (>500ms)
            if (resourceEntry.duration > 500) {
              logger.dev(`⏱️ Slow resource: ${resourceEntry.name} (${Math.round(resourceEntry.duration)}ms)`);
            }
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      logger.dev('⚠️ Failed to setup performance observer:', error);
    }
  }

  /**
   * Track custom event
   */
  trackEvent(event: TelemetryEvent): void {
    if (!this.isEnabled) return;

    const enrichedEvent: TelemetryEvent = {
      ...event,
      timestamp: event.timestamp || Date.now(),
      metadata: {
        ...event.metadata,
        sessionId: this.sessionId
      }
    };

    this.events.push(enrichedEvent);

    // Log in development
    if (import.meta.env.DEV) {
      logger.dev(`📊 Event: [${event.category}] ${event.action}`, event.metadata);
    }

    // Send to analytics services
    this.sendToAnalytics(enrichedEvent);
  }

  /**
   * Track performance metric
   */
  trackMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metrics.push(metric);

    // Log in development
    if (import.meta.env.DEV) {
      logger.dev(`📈 Metric: ${metric.name} = ${metric.value}${metric.unit}`, metric.metadata);
    }

    // Send to monitoring services
    this.sendToMonitoring(metric);
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    this.trackEvent({
      category: EventCategory.API_CALL,
      action: success ? 'api_call_success' : 'api_call_error',
      label: endpoint,
      value: duration,
      metadata: {
        ...metadata,
        success,
        duration
      }
    });

    this.trackMetric({
      name: `api_${endpoint.replace(/\//g, '_')}`,
      value: duration,
      unit: 'ms',
      metadata: { success, ...metadata }
    });
  }

  /**
   * Track permission check
   */
  trackPermissionCheck(module: string, permission: string, granted: boolean, duration?: number): void {
    this.trackEvent({
      category: EventCategory.PERMISSION,
      action: 'permission_check',
      label: `${module}.${permission}`,
      value: duration,
      metadata: { module, permission, granted, duration }
    });
  }

  /**
   * Track cache hit/miss
   */
  trackCache(cacheKey: string, hit: boolean, duration?: number): void {
    this.trackEvent({
      category: EventCategory.CACHE,
      action: hit ? 'cache_hit' : 'cache_miss',
      label: cacheKey,
      value: duration,
      metadata: { cacheKey, hit, duration }
    });
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string, duration?: number): void {
    this.trackEvent({
      category: EventCategory.NAVIGATION,
      action: 'navigate',
      label: `${from} → ${to}`,
      value: duration,
      metadata: { from, to, duration }
    });
  }

  /**
   * Track user action
   */
  trackUserAction(action: string, label?: string, metadata?: Record<string, any>): void {
    this.trackEvent({
      category: EventCategory.USER_ACTION,
      action,
      label,
      metadata
    });
  }

  /**
   * Send event to analytics services
   */
  private sendToAnalytics(event: TelemetryEvent): void {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', event.action, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.metadata
      });
    }

    // Mixpanel
    if (typeof window !== 'undefined' && (window as any).mixpanel) {
      (window as any).mixpanel.track(event.action, {
        category: event.category,
        label: event.label,
        value: event.value,
        ...event.metadata
      });
    }

    // Custom analytics endpoint (if configured)
    const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
    if (analyticsEndpoint && !import.meta.env.DEV) {
      fetch(analyticsEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true
      }).catch((error) => {
        logger.dev('⚠️ Failed to send telemetry:', error);
      });
    }
  }

  /**
   * Send metric to monitoring services
   */
  private sendToMonitoring(metric: PerformanceMetric): void {
    // Custom monitoring endpoint (if configured)
    const monitoringEndpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
    if (monitoringEndpoint && !import.meta.env.DEV) {
      fetch(monitoringEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...metric,
          sessionId: this.sessionId,
          timestamp: Date.now()
        }),
        keepalive: true
      }).catch((error) => {
        logger.dev('⚠️ Failed to send metric:', error);
      });
    }
  }

  /**
   * Get session summary
   */
  getSessionSummary(): {
    sessionId: string;
    events: number;
    metrics: number;
    duration: number;
  } {
    const firstEvent = this.events[0];
    const lastEvent = this.events[this.events.length - 1];
    const duration = firstEvent && lastEvent
      ? (lastEvent.timestamp! - firstEvent.timestamp!)
      : 0;

    return {
      sessionId: this.sessionId,
      events: this.events.length,
      metrics: this.metrics.length,
      duration
    };
  }

  /**
   * Clear session data
   */
  clearSession(): void {
    this.events = [];
    this.metrics = [];
    this.sessionId = this.generateSessionId();
  }
}

/**
 * Global telemetry instance
 */
export const telemetry = new TelemetryService();

/**
 * Helper to measure function execution time
 */
export function measure<T>(
  fn: () => T,
  metricName: string,
  metadata?: Record<string, any>
): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;

    telemetry.trackMetric({
      name: metricName,
      value: duration,
      unit: 'ms',
      metadata
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    telemetry.trackMetric({
      name: `${metricName}_error`,
      value: duration,
      unit: 'ms',
      metadata: { ...metadata, error: true }
    });
    throw error;
  }
}

/**
 * Helper to measure async function execution time
 */
export async function measureAsync<T>(
  fn: () => Promise<T>,
  metricName: string,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    telemetry.trackMetric({
      name: metricName,
      value: duration,
      unit: 'ms',
      metadata
    });

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    telemetry.trackMetric({
      name: `${metricName}_error`,
      value: duration,
      unit: 'ms',
      metadata: { ...metadata, error: true }
    });
    throw error;
  }
}

/**
 * Enable telemetry in development (opt-in)
 */
export function enableTelemetry(): void {
  localStorage.setItem('enable_telemetry', 'true');
  console.log('📊 Telemetry enabled (reload page to apply)');
}

/**
 * Disable telemetry (opt-out)
 */
export function disableTelemetry(): void {
  localStorage.setItem('disable_telemetry', 'true');
  console.log('📊 Telemetry disabled (reload page to apply)');
}
