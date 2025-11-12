/**
 * Smart Polling Hook
 *
 * Intelligent polling replacement for real-time subscriptions.
 * Features:
 * - Adaptive intervals based on page visibility
 * - Automatic pause when user is inactive
 * - Configurable intervals per feature
 * - Memory efficient with cleanup
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { pollingConfig } from '@/config/realtimeFeatures';

interface UseSmartPollingOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
  onlyWhenVisible?: boolean;
  onlyWhenFocused?: boolean;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
}

// Hook to detect page visibility
const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
};

// Hook to detect window focus
const useWindowFocus = () => {
  const [isFocused, setIsFocused] = useState(document.hasFocus());

  useEffect(() => {
    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return isFocused;
};

/**
 * Smart polling hook that replaces real-time subscriptions with intelligent polling
 */
export const useSmartPolling = <T>(options: UseSmartPollingOptions<T>) => {
  const {
    queryKey,
    queryFn,
    interval = pollingConfig.orders,
    enabled = true,
    onlyWhenVisible = true,
    onlyWhenFocused = false,
    staleTime = 15000,
    refetchOnWindowFocus = true
  } = options;

  const isVisible = usePageVisibility();
  const isFocused = useWindowFocus();

  // Determine if polling should be active
  const shouldPoll = enabled &&
    (!onlyWhenVisible || isVisible) &&
    (!onlyWhenFocused || isFocused);

  const effectiveInterval = shouldPoll ? interval : false;

  return useQuery({
    queryKey,
    queryFn,
    refetchInterval: effectiveInterval,
    refetchOnWindowFocus,
    staleTime,
    enabled,
    // Retry configuration
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

/**
 * Specialized hook for order list polling
 * PHASE 2 OPTIMIZATION: Aligned staleTime with interval to prevent redundant fetches
 */
export const useOrderPolling = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  enabled: boolean = true
) => {
  return useSmartPolling({
    queryKey,
    queryFn,
    interval: pollingConfig.orders, // 60 seconds
    enabled,
    onlyWhenVisible: true,
    onlyWhenFocused: false,
    staleTime: 60000, // OPTIMIZED: Match interval (60s) to prevent refetchOnWindowFocus from firing before next poll
    refetchOnWindowFocus: false // OPTIMIZED: Disabled to prevent redundant fetches (polling handles freshness)
  });
};

/**
 * Specialized hook for order details polling (when modal is open)
 * PHASE 2 OPTIMIZATION: Aligned staleTime with interval
 */
export const useOrderDetailsPolling = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  isModalOpen: boolean = false,
  options?: { interval?: number }
) => {
  const interval = options?.interval ?? pollingConfig.orderDetails;
  return useSmartPolling({
    queryKey,
    queryFn,
    interval, // Default: 30 seconds, configurable via options
    enabled: isModalOpen,
    onlyWhenVisible: true,
    onlyWhenFocused: false,
    staleTime: interval, // OPTIMIZED: Match interval to prevent premature staleness
    refetchOnWindowFocus: false // OPTIMIZED: Disabled (polling handles freshness)
  });
};

/**
 * Hook for system statistics polling
 */
export const useSystemStatsPolling = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  enabled: boolean = true
) => {
  return useSmartPolling({
    queryKey,
    queryFn,
    interval: pollingConfig.systemStats, // 2 minutes
    enabled,
    onlyWhenVisible: true,
    onlyWhenFocused: false,
    staleTime: 60000, // 1 minute stale time
    refetchOnWindowFocus: false // Don't refetch stats on focus
  });
};

/**
 * Hook for activity feed polling
 */
export const useActivityPolling = <T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  enabled: boolean = true
) => {
  return useSmartPolling({
    queryKey,
    queryFn,
    interval: pollingConfig.activities, // 5 minutes
    enabled,
    onlyWhenVisible: true,
    onlyWhenFocused: false,
    staleTime: 120000, // 2 minute stale time
    refetchOnWindowFocus: true
  });
};

/**
 * Hook to monitor polling performance
 */
export const usePollingMetrics = () => {
  const [metrics, setMetrics] = useState({
    activePolls: 0,
    totalRequests: 0,
    averageResponseTime: 0,
    errorRate: 0
  });

  const updateMetrics = useCallback((responseTime: number, isError: boolean = false) => {
    setMetrics(prev => ({
      activePolls: prev.activePolls,
      totalRequests: prev.totalRequests + 1,
      averageResponseTime: (prev.averageResponseTime + responseTime) / 2,
      errorRate: isError
        ? (prev.errorRate * prev.totalRequests + 1) / (prev.totalRequests + 1)
        : (prev.errorRate * prev.totalRequests) / (prev.totalRequests + 1)
    }));
  }, []);

  return { metrics, updateMetrics };
};