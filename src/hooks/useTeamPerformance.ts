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
  total_orders: number;
  active_modules: string[];
}

/**
 * Hook to fetch team performance data filtered by allowed order types
 * Shows activity for users who created orders in accessible modules
 * Displays users with most orders created
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
          .select('created_by, status, order_type, created_at')
          .gte('created_at', sevenDaysAgo.toISOString())
          .not('created_by', 'is', null);

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

        // Get unique user IDs
        const userIds = [...new Set(orders.map(o => o.created_by).filter(Boolean))];

        // Fetch profiles for all users - Use RPC to bypass RLS caching issue
        const { data: allProfiles, error: profileError } = await supabase.rpc('get_dealer_user_profiles');
        const profiles = allProfiles?.filter(p => userIds.includes(p.id));

        if (profileError) {
          console.error('Error fetching profiles:', profileError);
          throw profileError;
        }

        // Create profile map for quick lookup
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

        // Group by user
        const userMap = new Map<string, TeamMemberPerformance>();

        orders.forEach((order: any) => {
          const userId = order.created_by;
          if (!userId) return;

          const profile = profileMap.get(userId);
          if (!profile) return;

          const userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown User';

          if (!userMap.has(userId)) {
            userMap.set(userId, {
              user_id: userId,
              user_name: userName,
              email: profile.email || '',
              completed_7d: 0,
              in_progress: 0,
              total_orders: 0,
              active_modules: []
            });
          }

          const userStats = userMap.get(userId)!;
          userStats.total_orders++;

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

        // Convert map to array and sort by total orders (top performers)
        const teamPerformance = Array.from(userMap.values())
          .sort((a, b) => b.total_orders - a.total_orders);

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
