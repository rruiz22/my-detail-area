import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Centralized hook for dealer memberships with shared cache
 * Eliminates redundant membership verification queries
 *
 * staleTime: 15 minutes - Memberships don't change frequently
 * gcTime: 30 minutes - Keep in cache longer
 */

export interface DealerMembership {
  dealer_id: number;
  user_id: string;
  is_active: boolean;
  role?: string;
  created_at?: string;
}

/**
 * Get all active dealer memberships for current user
 * Shared cache prevents redundant queries across components
 */
export function useDealerMemberships() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['dealer_memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from('dealer_memberships')
        .select('dealer_id, user_id, is_active, role, created_at')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching dealer memberships:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Check if user has membership for a specific dealer
 * Uses shared cache from useDealerMemberships
 */
export function useHasDealerMembership(dealerId: number | undefined) {
  const { data: memberships, isLoading } = useDealerMemberships();

  const hasMembership = dealerId
    ? memberships?.some(m => m.dealer_id === dealerId && m.is_active) ?? false
    : false;

  return {
    hasMembership,
    isLoading,
    memberships: memberships || [],
  };
}

/**
 * Get accessible dealer IDs for current user
 * Returns array of dealer IDs the user can access
 */
export function useAccessibleDealerIds() {
  const { data: memberships, isLoading } = useDealerMemberships();

  const dealerIds = memberships
    ?.filter(m => m.is_active)
    .map(m => m.dealer_id) || [];

  return {
    dealerIds,
    isLoading,
    count: dealerIds.length,
  };
}
