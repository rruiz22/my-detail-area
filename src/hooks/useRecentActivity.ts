import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivityLog {
  id: string;
  order_id: string;
  user_id: string | null;
  activity_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  description: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  order_number?: string;
  customer_name?: string;
  user_name?: string;
  order_type?: string;
  dealer_id?: number;
  dealer_name?: string;
}

export function useRecentActivity(limit = 20) {
  const { user } = useAuth();
  const [selectedDealer, setSelectedDealer] = useState<number | 'all'>('all');

  // Load dealer filter from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('selectedDealerFilter');
    if (saved) {
      setSelectedDealer(saved === 'all' ? 'all' : parseInt(saved));
    }
  }, []);

  // Listen to dealerFilterChanged event
  useEffect(() => {
    const handleFilterChange = (e: CustomEvent) => {
      setSelectedDealer(e.detail.dealerId);
    };

    window.addEventListener('dealerFilterChanged', handleFilterChange as EventListener);
    return () => window.removeEventListener('dealerFilterChanged', handleFilterChange as EventListener);
  }, []);

  const query = useQuery({
    queryKey: ['recent-activity', limit, selectedDealer],
    queryFn: async () => {
      if (!user) return [];

      // PASO 1: Query principal SIN profiles join (bypass RLS issue)
      const { data, error } = await supabase
        .from('order_activity_log')
        .select(`
          id,
          order_id,
          user_id,
          activity_type,
          field_name,
          old_value,
          new_value,
          description,
          metadata,
          created_at,
          orders!inner (
            order_number,
            customer_name,
            order_type,
            dealer_id,
            dealerships (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit * 2);  // Fetch more to ensure we have enough after filtering

      if (error) {
        console.error('Error fetching recent activity:', error);
        throw error;
      }

      // PASO 2: Get unique user IDs and fetch profiles via RPC (bypass RLS)
      const uniqueUserIds = [...new Set(data?.map((item: any) => item.user_id).filter(Boolean))];
      let profilesMap = new Map<string, { first_name: string; last_name: string }>();

      if (uniqueUserIds.length > 0) {
        const { data: allProfiles, error: profilesError } = await supabase.rpc('get_dealer_user_profiles');
        if (profilesError) {
          console.error('❌ Error fetching profiles for recent activity:', profilesError);
        } else if (allProfiles) {
          const profiles = allProfiles.filter(p => uniqueUserIds.includes(p.id));
          profilesMap = new Map(
            profiles.map(profile => [
              profile.id,
              { first_name: profile.first_name || '', last_name: profile.last_name || '' }
            ])
          );
        }
      }

      // PASO 3: Transform data with profile lookup
      const allActivities: ActivityLog[] = (data || []).map((item: any) => {
        const profile = item.user_id ? profilesMap.get(item.user_id) : null;

        return {
          id: item.id,
          order_id: item.order_id,
          user_id: item.user_id,
          activity_type: item.activity_type,
          field_name: item.field_name,
          old_value: item.old_value,
          new_value: item.new_value,
          description: item.description,
          metadata: item.metadata,
          created_at: item.created_at,
          order_number: item.orders?.order_number,
          customer_name: item.orders?.customer_name,
          order_type: item.orders?.order_type,
          dealer_id: item.orders?.dealer_id,
          dealer_name: item.orders?.dealerships?.name || 'Unknown Dealership',
          user_name: profile
            ? `${profile.first_name} ${profile.last_name}`.trim() || 'Unknown User'
            : 'Unknown User'
        };
      });

      // Apply dealer filter (after RLS has already filtered by security)
      const filteredActivities = selectedDealer === 'all'
        ? allActivities
        : allActivities.filter(activity => activity.dealer_id === selectedDealer);

      // Return only the requested limit after filtering
      return filteredActivities.slice(0, limit);
    },
    enabled: !!user,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => {
      console.log('[useRecentActivity] Refetch triggered');
      return query.refetch();
    }
  };
}
