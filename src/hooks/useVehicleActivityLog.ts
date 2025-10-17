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
  // Joined data
  user: {
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

      // Fetch activity log
      const { data: activityData, error } = await supabase
        .from('get_ready_vehicle_activity_log')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching activity log:', error);
        throw error;
      }

      // Get unique user IDs (filter out NULLs)
      const userIds = [...new Set(
        activityData
          ?.map(a => a.action_by)
          .filter((id): id is string => id != null) || []
      )];

      // Fetch user profiles only if we have valid user IDs
      let userProfiles: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, avatar_url')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          // Continue without profiles rather than failing
        } else {
          userProfiles = (profiles || []).reduce((acc, profile) => {
            acc[profile.id] = profile;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Combine data
      const data = activityData?.map(activity => ({
        ...activity,
        user: userProfiles[activity.action_by] || null,
      }));

      return {
        activities: (data || []) as VehicleActivity[],
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
