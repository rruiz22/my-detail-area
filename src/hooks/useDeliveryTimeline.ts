/**
 * useDeliveryTimeline Hook
 * Fetches time-series delivery data for charts
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getDateRangeFromTimeRange,
  getTimeInterval,
  aggregateTimeSeriesData,
} from '@/lib/notification-analytics';
import type {
  DeliveryTimelinePoint,
  TimeSeriesData,
  AnalyticsFilters,
  UseDeliveryTimelineReturn,
} from '@/types/notification-analytics';

export function useDeliveryTimeline(
  dealerId?: number,
  filters?: AnalyticsFilters
): UseDeliveryTimelineReturn {
  const [timeline, setTimeline] = useState<DeliveryTimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Get date range and time interval from filters
  const dateRange = useMemo(() => {
    if (filters?.timeRange === 'custom' && filters.startDate && filters.endDate) {
      return {
        startDate: new Date(filters.startDate),
        endDate: new Date(filters.endDate),
      };
    }
    return getDateRangeFromTimeRange(filters?.timeRange || '7d');
  }, [filters?.timeRange, filters?.startDate, filters?.endDate]);

  const interval = useMemo(() => {
    return getTimeInterval(filters?.timeRange || '7d');
  }, [filters?.timeRange]);

  /**
   * Fetch timeline data from Supabase RPC
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_delivery_timeline', {
        p_start_date: dateRange.startDate.toISOString(),
        p_end_date: dateRange.endDate.toISOString(),
        p_interval: interval,
        p_dealer_id: dealerId,
        p_channel: filters?.channels?.[0] || null,
      });

      if (rpcError) throw rpcError;

      setTimeline((data as DeliveryTimelinePoint[]) || []);
    } catch (err) {
      console.error('Failed to fetch delivery timeline:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, interval, dealerId, filters?.channels]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Transform timeline data for chart consumption
   */
  const timeSeriesData: TimeSeriesData[] = useMemo(() => {
    return aggregateTimeSeriesData(timeline);
  }, [timeline]);

  return {
    timeline,
    timeSeriesData,
    loading,
    error,
    refetch,
  };
}
