import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_TIMES, GC_TIMES } from '@/constants/cacheConfig';
import { useQuery } from '@tanstack/react-query';

/**
 * User with access to Get Ready module
 */
export interface GetReadyUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  role: string | null;
}

/**
 * Hook to fetch users with access to Get Ready module for the current dealership
 *
 * Features:
 * - Filters users by dealership membership
 * - Only returns active users
 * - Includes helper functions for display names and initials
 * - Cached for 5 minutes (CACHE_TIMES.MEDIUM)
 *
 * @returns Query result with users and helper functions
 */
export function useGetReadyUsers() {
  const { currentDealership } = useAccessibleDealerships();

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['getReadyUsers', currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership?.id) {
        return [];
      }

      // Fetch all active users for this dealership
      // Note: We're fetching all dealership users since Get Ready permissions
      // are typically managed at the role level (dealer_admin, dealer_manager, etc.)
      // If you need more granular permission filtering, add a JOIN to permission tables
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          avatar_url,
          user_type,
          dealer_memberships!inner (
            role,
            is_active
          )
        `)
        .eq('dealer_memberships.dealer_id', currentDealership.id)
        .eq('dealer_memberships.is_active', true)
        .order('first_name', { ascending: true });

      if (error) {
        console.error('Error fetching Get Ready users:', error);
        throw error;
      }

      // Transform the data to flatten dealer_memberships
      return (data || []).map((user: any) => ({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        user_type: user.user_type,
        role: user.dealer_memberships?.[0]?.role || null,
      })) as GetReadyUser[];
    },
    enabled: !!currentDealership?.id,
    staleTime: CACHE_TIMES.MEDIUM, // 5 minutes
    gcTime: GC_TIMES.MEDIUM, // 10 minutes
  });

  /**
   * Get display name for a user
   * Priority: "First Last" > "First" > "email"
   */
  const getDisplayName = (user: GetReadyUser): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    return user.email;
  };

  /**
   * Get initials for a user
   * Priority: "FL" > "F" > "E"
   */
  const getInitials = (user: GetReadyUser): string => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  /**
   * Get user by ID from the cached list
   */
  const getUserById = (userId: string): GetReadyUser | undefined => {
    return users.find((u) => u.id === userId);
  };

  return {
    users,
    isLoading,
    error,
    refetch,
    getDisplayName,
    getInitials,
    getUserById,
  };
}
