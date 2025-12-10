import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface Dealership {
  id: number;
  name: string;
  shortcode: string;
  is_active: boolean;
  logo_url?: string | null;
}

/**
 * React Query hook to fetch and cache dealerships accessible to the current user
 * - Automatically caches results for 10 minutes
 * - Refetches in background when cache is stale
 * - Shares cache across all components
 */
export const useDealerships = () => {
  const { user } = useAuth();

  return useQuery<Dealership[], Error>({
    queryKey: ['dealerships', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.rpc('get_user_accessible_dealers', {
        user_uuid: user.id
      });

      if (error) {
        console.error('Error fetching dealerships:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user, // Only run query if user is authenticated
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep unused data in cache for 30 minutes (was cacheTime in v4)
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
};

/**
 * Hook to fetch users for a specific dealership
 * Caches results per dealership ID
 */
export const useDealerUsers = (dealerId: number | null) => {
  return useQuery({
    queryKey: ['dealer-users', dealerId],
    queryFn: async () => {
      if (!dealerId) {
        return [];
      }

      const { data, error } = await supabase
        .from('dealer_memberships')
        .select(`
          profiles!inner (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching dealer users:', error);
        throw error;
      }

      // Transform data to flat structure
      return (data || []).map((membership: any) => ({
        id: membership.profiles.id,
        first_name: membership.profiles.first_name,
        last_name: membership.profiles.last_name,
        email: membership.profiles.email,
      }));
    },
    enabled: !!dealerId, // Only run if dealerId is provided
    staleTime: 1000 * 60 * 5, // Fresh for 5 minutes
    gcTime: 1000 * 60 * 15, // Cache for 15 minutes
  });
};

/**
 * Hook to fetch services for a specific dealership and department
 * Caches results per dealership and department combination
 */
export const useDealerServices = (dealerId: number | null, departmentName: string = 'Service Dept') => {
  return useQuery({
    queryKey: ['dealer-services', dealerId, departmentName],
    queryFn: async () => {
      if (!dealerId) {
        return [];
      }

      const { data, error } = await supabase.rpc('get_dealer_services_by_department', {
        p_dealer_id: dealerId,
        p_department_name: departmentName
      });

      if (error) {
        console.error('Error fetching dealer services:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!dealerId, // Only run if dealerId is provided
    staleTime: 1000 * 60 * 10, // Fresh for 10 minutes (services don't change often)
    gcTime: 1000 * 60 * 30, // Cache for 30 minutes
  });
};
