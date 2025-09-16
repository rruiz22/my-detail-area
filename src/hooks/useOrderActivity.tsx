import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OrderActivity {
  id: string;
  order_id: string;
  user_id: string | null;
  activity_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  metadata: any;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  } | null;
}

export function useOrderActivity(orderId: string) {
  const [activities, setActivities] = useState<OrderActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('order_activity_log')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        throw fetchError;
      }

      // Get unique user IDs to fetch profiles
      const userIds = [...new Set(data?.filter(a => a.user_id).map(a => a.user_id) || [])];
      let profiles: any[] = [];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);
        profiles = profilesData || [];
      }

      // Combine activities with profile data
      const activitiesWithProfiles = data?.map(activity => ({
        ...activity,
        profiles: activity.user_id
          ? profiles.find(p => p.id === activity.user_id) || null
          : null
      })) || [];

      setActivities(activitiesWithProfiles);
    } catch (error) {
      console.error('Error fetching order activities:', error);
      setError('Failed to load activity history');
      toast.error('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Set up real-time subscription for activity updates
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel('order-activity-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_activity_log',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          // Simply fetch the new activity and add it to the list
          supabase
            .from('order_activity_log')
            .select('*')
            .eq('id', payload.new.id)
            .single()
            .then(async ({ data }) => {
              if (data) {
                // Fetch user profile if needed
                let userProfile = null;
                if (data.user_id) {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, email')
                    .eq('id', data.user_id)
                    .single();
                  userProfile = profile;
                }
                
                setActivities(prev => [{
                  ...data,
                  profiles: userProfile
                }, ...prev]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return {
    activities,
    loading,
    error,
    refetch: fetchActivities
  };
}