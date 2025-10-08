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
          ),
          profiles (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit * 2);  // Fetch more to ensure we have enough after filtering

      if (error) {
        console.error('Error fetching recent activity:', error);
        throw error;
      }

      // Transform data to flatten the joined tables
      const allActivities: ActivityLog[] = (data || []).map((item: any) => ({
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
        user_name: item.profiles
          ? `${item.profiles.first_name || ''} ${item.profiles.last_name || ''}`.trim()
          : 'Unknown User'
      }));

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
