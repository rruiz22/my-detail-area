import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAccessibleDealerships } from './useAccessibleDealerships';
import type { GetReadyActivity, ActivityFilters, ActivityStats } from '@/types/getReadyActivity';

const ITEMS_PER_PAGE = 50;

export function useGetReadyActivity(filters?: ActivityFilters) {
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(true);

  // Query for activities list with infinite scroll
  const {
    data,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['get-ready-activity', currentDealership?.id, filters],
    queryFn: async ({ pageParam = 0 }) => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      let query = supabase
        .from('get_ready_vehicle_activity_log')
        .select(`
          id,
          vehicle_id,
          dealer_id,
          activity_type,
          action_by,
          action_at,
          field_name,
          old_value,
          new_value,
          description,
          metadata,
          created_at,
          get_ready_vehicles!inner (
            stock_number,
            vin,
            vehicle_year,
            vehicle_make,
            vehicle_model
          ),
          profiles!action_by (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('dealer_id', currentDealership.id)
        .order('created_at', { ascending: false })
        .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);

      // Apply filters
      if (filters?.activityTypes && filters.activityTypes.length > 0) {
        query = query.in('activity_type', filters.activityTypes);
      }

      if (filters?.userIds && filters.userIds.length > 0) {
        query = query.in('action_by', filters.userIds);
      }

      if (filters?.vehicleId) {
        query = query.eq('vehicle_id', filters.vehicleId);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom.toISOString());
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo.toISOString());
      }

      if (filters?.searchQuery) {
        query = query.ilike('description', `%${filters.searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        activities: (data || []) as GetReadyActivity[],
        nextPage: data && data.length === ITEMS_PER_PAGE ? pageParam + 1 : null
      };
    },
    enabled: !!currentDealership?.id,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    initialPageParam: 0,
  });

  // Query for activity stats (dashboard metrics)
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['get-ready-activity-stats', currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership?.id) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .rpc('get_ready_activity_stats', {
          p_dealer_id: currentDealership.id,
          p_days: 30
        });

      if (error) throw error;

      return data?.[0] as ActivityStats;
    },
    enabled: !!currentDealership?.id,
    staleTime: 60000, // 1 minute
  });

  // Real-time subscription
  useEffect(() => {
    if (!currentDealership?.id) return;

    console.log('🔴 [Activity] Setting up realtime subscription...');

    const channel = supabase
      .channel('get-ready-activity-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'get_ready_vehicle_activity_log',
          filter: `dealer_id=eq.${currentDealership.id}`
        },
        (payload) => {
          console.log('🟢 [Activity] New activity received:', payload);

          // Invalidate and refetch
          queryClient.invalidateQueries({
            queryKey: ['get-ready-activity', currentDealership.id]
          });
          queryClient.invalidateQueries({
            queryKey: ['get-ready-activity-stats', currentDealership.id]
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 [Activity] Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      console.log('🔴 [Activity] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [currentDealership?.id, queryClient]);

  // Flatten infinite query pages
  const activities = data?.pages.flatMap(page => page.activities) ?? [];

  const handleRefresh = useCallback(async () => {
    await refetch();
    await queryClient.invalidateQueries({
      queryKey: ['get-ready-activity-stats', currentDealership?.id]
    });
  }, [refetch, queryClient, currentDealership?.id]);

  return {
    activities,
    stats,
    isLoading,
    statsLoading,
    error,
    isConnected,
    refetch: handleRefresh,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  };
}
