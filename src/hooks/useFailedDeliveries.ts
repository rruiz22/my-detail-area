/**
 * useFailedDeliveries Hook
 * Fetches failed delivery logs for debugging and retry
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDateRangeFromTimeRange } from '@/lib/notification-analytics';
import type {
  FailedDelivery,
  AnalyticsFilters,
  UseFailedDeliveriesReturn,
} from '@/types/notification-analytics';

export function useFailedDeliveries(
  dealerId?: number,
  filters?: AnalyticsFilters,
  limit = 50
): UseFailedDeliveriesReturn {
  const [failures, setFailures] = useState<FailedDelivery[]>([]);
  const [totalCount, setTotalCount] = useState(0);
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
   * Fetch failed deliveries from Supabase RPC
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_failed_deliveries', {
        p_start_date: dateRange.startDate.toISOString(),
        p_end_date: dateRange.endDate.toISOString(),
        p_dealer_id: dealerId,
        p_channel: filters?.channels?.[0] || null,
        p_limit: limit,
      });

      if (rpcError) throw rpcError;

      const failureData = (data as FailedDelivery[]) || [];
      setFailures(failureData);
      setTotalCount(failureData.length);
    } catch (err) {
      console.error('Failed to fetch failed deliveries:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, dealerId, filters?.channels, limit]);

  /**
   * Retry a failed delivery
   */
  const retry = useCallback(async (id: string) => {
    try {
      // Call edge function to retry delivery
      const { data, error: retryError } = await supabase.functions.invoke('retry-notification', {
        body: { notification_id: id },
      });

      if (retryError) throw retryError;

      // Refresh list after retry
      await refetch();

      return data;
    } catch (err) {
      console.error('Failed to retry delivery:', err);
      throw err;
    }
  }, [refetch]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    failures,
    totalCount,
    loading,
    error,
    retry,
    refetch,
  };
}
