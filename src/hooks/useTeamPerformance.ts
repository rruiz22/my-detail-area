import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';

export interface TeamMemberPerformance {
  user_id: string;
  user_name: string;
  email: string;
  completed_7d: number;
  in_progress: number;
  active_modules: string[];
}

/**
 * Hook to fetch team performance data filtered by allowed order types
 * Shows activity only for modules the current user has permission to view
 */
export function useTeamPerformance(allowedOrderTypes?: string[]) {
  const { user } = useAuth();

  return useQuery<TeamMemberPerformance[], Error>({
    queryKey: ['team-performance', user?.id, allowedOrderTypes],
    queryFn: async () => {
      if (!user) return [];

      // If no allowed order types, return empty (user has no module access)
      if (allowedOrderTypes && allowedOrderTypes.length === 0) {
        return [];
      }

      try {
        // Fetch orders from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Build query with optional order_type filter
        let query = supabase
          .from('orders')
          .select(`
            assigned_to,
            status,
            order_type,
            created_at,
            profiles!orders_assigned_to_fkey (
              id,
              first_name,
              last_name,
              email
            )
          `)
          .gte('created_at', sevenDaysAgo.toISOString());

        // Filter by allowed order types if provided
        if (allowedOrderTypes && allowedOrderTypes.length > 0) {
          query = query.in('order_type', allowedOrderTypes);
        }

        const { data: orders, error } = await query;

        if (error) {
          console.error('Error fetching team performance:', error);
          throw error;
        }

        if (!orders || orders.length === 0) return [];

        // Group by user
        const userMap = new Map<string, TeamMemberPerformance>();

        orders.forEach((order: any) => {
          const userId = order.assigned_to;
          if (!userId || !order.profiles) return;

          const profile = order.profiles;
          const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User';

          if (!userMap.has(userId)) {
            userMap.set(userId, {
              user_id: userId,
              user_name: userName,
              email: profile.email || '',
              completed_7d: 0,
              in_progress: 0,
              active_modules: []
            });
          }

          const userStats = userMap.get(userId)!;

          // Count completed in last 7 days
          if (order.status === 'completed') {
            userStats.completed_7d++;
          }

          // Count in progress
          if (order.status === 'in_progress') {
            userStats.in_progress++;
          }

          // Track active modules
          if (order.order_type && !userStats.active_modules.includes(order.order_type)) {
            userStats.active_modules.push(order.order_type);
          }
        });

        // Convert map to array and sort by completed orders
        const teamPerformance = Array.from(userMap.values())
          .sort((a, b) => b.completed_7d - a.completed_7d);

        return teamPerformance;

      } catch (error) {
        console.error('Error in useTeamPerformance:', error);
        throw error;
      }
    },
    enabled: !!user,
    staleTime: CACHE_TIMES.SHORT, // 1 minute - dashboard data
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
