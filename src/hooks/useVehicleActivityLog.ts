import { supabase } from '@/integrations/supabase/client';
import { useInfiniteQuery } from '@tanstack/react-query';

export interface VehicleActivity {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  activity_type: string;
  action_by: string;
  action_at: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Joined data from profiles table
  profiles?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  } | null;
}

const PAGE_SIZE = 20;

export function useVehicleActivityLog(vehicleId: string | null) {
  return useInfiniteQuery({
    queryKey: ['vehicle-activity-log', vehicleId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!vehicleId) return { activities: [], hasMore: false };

      // Fetch activity log with optimized join to profiles table
      const { data: activityData, error } = await supabase
        .from('get_ready_vehicle_activity_log')
        .select(`
          *,
          profiles:action_by(first_name, last_name, avatar_url),
          get_ready_vehicles!inner(stock_number, vin, vehicle_year, vehicle_make, vehicle_model)
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching activity log:', error);
        throw error;
      }

      return {
        activities: (activityData || []) as VehicleActivity[],
        hasMore: activityData?.length === PAGE_SIZE,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!vehicleId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}
