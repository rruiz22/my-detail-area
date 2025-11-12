import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface DealershipUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  user_type: string | null;
  dealership_id: number | null;
}

/**
 * Hook to fetch users from current dealership for task assignment
 */
export const useDealershipUsers = () => {
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();

  const {
    data: users = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['dealership', 'users', currentDealership?.id],
    queryFn: async () => {
      if (!user || !currentDealership) {
        return [];
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url, user_type, dealership_id')
        .eq('dealership_id', currentDealership.id)
        .order('first_name');

      if (error) throw error;
      return (data || []) as DealershipUser[];
    },
    enabled: !!user && !!currentDealership,
    staleTime: 5 * 60 * 1000, // Users don't change often, 5 minutes
    gcTime: 15 * 60 * 1000, // Keep in cache for 15 minutes
  });

  /**
   * Get display name for a user
   */
  const getDisplayName = (user: DealershipUser | undefined | null): string => {
    if (!user) return 'Unassigned';
    
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return user.email.split('@')[0];
  };

  /**
   * Get initials for a user
   */
  const getInitials = (user: DealershipUser | undefined | null): string => {
    if (!user) return '?';
    
    const name = getDisplayName(user);
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Find user by ID
   */
  const getUserById = (userId: string | null): DealershipUser | undefined => {
    if (!userId) return undefined;
    return users.find(u => u.id === userId);
  };

  return {
    users,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    getDisplayName,
    getInitials,
    getUserById,
  };
};



























