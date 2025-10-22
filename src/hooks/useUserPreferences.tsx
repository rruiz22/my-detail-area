import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch user preferences from database
 * Returns preferences data including phone, bio, job_title, department, etc.
 */
export function useUserPreferences() {
  const { user } = useAuth();

  const {
    data: preferences,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user_preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid error if no row exists

      if (error) {
        console.error('Error fetching user preferences:', error);
        return null;
      }

      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });

  return {
    preferences,
    isLoading,
    error,
    refetch
  };
}
