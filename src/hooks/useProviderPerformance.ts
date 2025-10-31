/**
 * useProviderPerformance Hook
 * Fetches provider comparison data for analytics
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDateRangeFromTimeRange } from '@/lib/notification-analytics';
import type {
  ProviderPerformance,
  AnalyticsFilters,
  UseProviderPerformanceReturn,
} from '@/types/notification-analytics';

export function useProviderPerformance(
  dealerId?: number,
  filters?: AnalyticsFilters
): UseProviderPerformanceReturn {
  const [providers, setProviders] = useState<ProviderPerformance[]>([]);
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
   * Fetch provider performance from Supabase RPC
   */
  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_provider_performance', {
        p_start_date: dateRange.startDate.toISOString(),
        p_end_date: dateRange.endDate.toISOString(),
        p_dealer_id: dealerId,
        p_channel: filters?.channels?.[0] || null,
      });

      if (rpcError) throw rpcError;

      // Sort by delivery rate descending
      const sortedData = ((data as ProviderPerformance[]) || []).sort(
        (a, b) => b.delivery_rate - a.delivery_rate
      );

      setProviders(sortedData);
    } catch (err) {
      console.error('Failed to fetch provider performance:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, dealerId, filters?.channels]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    providers,
    loading,
    error,
    refetch,
  };
}
