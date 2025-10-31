/**
 * useNotificationMetrics Hook
 * Fetches delivery and engagement metrics from Supabase RPC functions
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getDateRangeFromTimeRange,
  calculateTrend,
  calculateDeliveryRate,
  calculateOpenRate,
  calculateClickRate,
  calculateAverage
} from '@/lib/notification-analytics';
import type {
  DeliveryMetrics,
  EngagementMetrics,
  AnalyticsOverview,
  AnalyticsFilters,
  UseNotificationMetricsReturn,
  TrendData,
} from '@/types/notification-analytics';

export function useNotificationMetrics(
  dealerId?: number,
  filters?: AnalyticsFilters
): UseNotificationMetricsReturn {
  const [deliveryMetrics, setDeliveryMetrics] = useState<DeliveryMetrics[]>([]);
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetrics[]>([]);
  const [previousMetrics, setPreviousMetrics] = useState<{
    delivery: DeliveryMetrics[];
    engagement: EngagementMetrics[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get date range from filters
  const dateRange = useMemo(() => {
    if (filters?.timeRange === 'custom' && filters.startDate && filters.endDate) {
      return {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate),
      };
    }
    return getDateRangeFromTimeRange(filters?.timeRange || '7d');
  }, [filters?.timeRange, filters?.startDate, filters?.endDate]);

  /**
   * Fetch delivery metrics from Supabase RPC
   */
  const fetchDeliveryMetrics = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_delivery_metrics', {
        p_start_date: dateRange.startDate.toISOString(),
        p_end_date: dateRange.endDate.toISOString(),
        p_dealer_id: dealerId,
        p_channel: filters?.channels?.[0] || null, // Support single channel filter
      });

      if (rpcError) throw rpcError;

      return (data as DeliveryMetrics[]) || [];
    } catch (err) {
      console.error('Failed to fetch delivery metrics:', err);
      throw err;
    }
  }, [dateRange, dealerId, filters?.channels]);

  /**
   * Fetch engagement metrics from Supabase RPC
   */
  const fetchEngagementMetrics = useCallback(async () => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_engagement_metrics', {
        p_start_date: dateRange.startDate.toISOString(),
        p_end_date: dateRange.endDate.toISOString(),
        p_dealer_id: dealerId,
        p_channel: filters?.channels?.[0] || null,
      });

      if (rpcError) throw rpcError;

      return (data as EngagementMetrics[]) || [];
    } catch (err) {
      console.error('Failed to fetch engagement metrics:', err);
      throw err;
    }
  }, [dateRange, dealerId, filters?.channels]);

  /**
   * Fetch previous period metrics for trend calculation
   */
  const fetchPreviousMetrics = useCallback(async () => {
    const periodLength = dateRange.endDate.getTime() - dateRange.startDate.getTime();
    const previousStart = new Date(dateRange.startDate.getTime() - periodLength);
    const previousEnd = new Date(dateRange.startDate.getTime());

    try {
      const [deliveryData, engagementData] = await Promise.all([
        supabase.rpc('get_delivery_metrics', {
          p_start_date: previousStart.toISOString(),
          p_end_date: previousEnd.toISOString(),
          p_dealer_id: dealerId,
          p_channel: filters?.channels?.[0] || null,
        }),
        supabase.rpc('get_engagement_metrics', {
          p_start_date: previousStart.toISOString(),
          p_end_date: previousEnd.toISOString(),
          p_dealer_id: dealerId,
          p_channel: filters?.channels?.[0] || null,
        }),
      ]);

      return {
        delivery: (deliveryData.data as DeliveryMetrics[]) || [],
        engagement: (engagementData.data as EngagementMetrics[]) || [],
      };
    } catch (err) {
      console.error('Failed to fetch previous metrics:', err);
      return { delivery: [], engagement: [] };
    }
  }, [dateRange, dealerId, filters?.channels]);

  /**
   * Main fetch function
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [delivery, engagement, previous] = await Promise.all([
        fetchDeliveryMetrics(),
        fetchEngagementMetrics(),
        fetchPreviousMetrics(),
      ]);

      setDeliveryMetrics(delivery);
      setEngagementMetrics(engagement);
      setPreviousMetrics(previous);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchDeliveryMetrics, fetchEngagementMetrics, fetchPreviousMetrics]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Calculate overview metrics
   */
  const overview: AnalyticsOverview = useMemo(() => {
    // Aggregate current metrics
    const totalSent = deliveryMetrics.reduce((sum, m) => sum + m.total_sent, 0);
    const totalDelivered = deliveryMetrics.reduce((sum, m) => sum + m.total_delivered, 0);
    const totalFailed = deliveryMetrics.reduce((sum, m) => sum + m.total_failed, 0);
    const totalOpened = engagementMetrics.reduce((sum, m) => sum + m.total_opened, 0);
    const totalClicked = engagementMetrics.reduce((sum, m) => sum + m.total_clicked, 0);

    // Calculate rates
    const deliveryRate = calculateDeliveryRate(totalDelivered, totalSent);
    const openRate = calculateOpenRate(totalOpened, totalDelivered);
    const clickRate = calculateClickRate(totalClicked, totalOpened);

    // Calculate average time to read
    const avgTimeToRead = calculateAverage(
      engagementMetrics
        .filter((m) => m.avg_time_to_open > 0)
        .map((m) => m.avg_time_to_open)
    );

    // Count unique users (estimate from engagement data)
    const activeUsers = engagementMetrics.reduce((sum, m) => sum + m.total_opened, 0);

    // Calculate trend compared to previous period
    const previousSent = previousMetrics?.delivery.reduce((sum, m) => sum + m.total_sent, 0) || 0;
    const trend = calculateTrend(totalSent, previousSent);

    return {
      totalSent,
      totalDelivered,
      totalFailed,
      totalOpened,
      totalClicked,
      deliveryRate,
      openRate,
      clickRate,
      avgTimeToRead,
      activeUsers,
      trend,
    };
  }, [deliveryMetrics, engagementMetrics, previousMetrics]);

  return {
    deliveryMetrics,
    engagementMetrics,
    overview,
    loading,
    error,
    refetch,
  };
}
