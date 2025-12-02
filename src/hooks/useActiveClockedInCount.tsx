/**
 * Active Clocked-In Count Hook
 *
 * Fetches the count of currently clocked-in employees for the topbar badge.
 * Uses SHORT cache time (1 minute) for frequently changing data.
 */

import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useAuth } from '@/contexts/AuthContext';
import { useDealerFilter } from '@/contexts/DealerFilterContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export function useActiveClockedInCount() {
  const { selectedDealerId } = useDealerFilter();
  const { user } = useAuth();

  return useQuery({
    queryKey: ['detail-hub', 'active-clocked-in-count', selectedDealerId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      let query = supabase
        .from('detail_hub_time_entries')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');

      // Filter by dealership
      if (selectedDealerId !== 'all') {
        query = query.eq('dealership_id', selectedDealerId);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - frequently changing data
    gcTime: GC_TIMES.MEDIUM,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });
}
