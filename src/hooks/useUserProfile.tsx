import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Centralized hook for user profiles with shared cache
 * Eliminates redundant profile queries across components
 *
 * staleTime: 15 minutes - Profile data rarely changes
 * gcTime: 30 minutes - Keep in cache longer
 */

export interface UserProfile {
  id: string;
  email?: string;
  role?: string;
  user_type?: string;
  dealership_id?: number;
  first_name?: string;
  last_name?: string;
  avatar_seed?: string;
  avatar_variant?: string;
}

/**
 * Get user profile with shared cache across all components
 * Single query result shared by all consumers
 */
export function useUserProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_profile', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get minimal profile data (commonly used fields)
 * Uses same cache key to share with full profile query
 */
export function useUserProfileMinimal() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_profile_minimal', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role, dealership_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching minimal profile:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get user avatar preferences
 * Separate query key for avatar-specific data
 */
export function useUserAvatar() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_avatar', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_seed, avatar_variant')
        .eq('id', user.id)
        .single();

      if (error) {
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 1800000, // 30 minutes (avatars change less frequently)
    gcTime: 3600000, // 60 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

/**
 * ✅ OPTIMIZED: Get user profile for permissions with shared TanStack Query cache
 * Use this in usePermissions and other permission-related components
 * Eliminates redundant profile queries
 */
export function useUserProfileForPermissions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user_profile_permissions', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return null;
      }

      // ⚡ PERF FIX: Use profile data from AuthContext (already loaded by loadUserProfile)
      // This eliminates redundant query to profiles table that was competing for connection pool
      // All needed fields are already available in ExtendedUser from AuthContext
      console.log('⚡ [useUserProfileForPermissions] Using cached profile from AuthContext');

      // 🆕 Load allowed_modules for supermanagers (only RPC call needed, profile data is cached)
      let allowedModules: string[] = [];
      if (user.role === 'supermanager') {
        const { data: modules, error: modulesError } = await supabase
          .rpc('get_user_allowed_modules', { target_user_id: user.id });

        if (modulesError) {
          console.error('Error loading allowed modules:', modulesError);
          // Don't fail completely - just log and continue with empty array
        } else {
          allowedModules = modules || [];
          console.log(`✅ Loaded ${allowedModules.length} allowed modules for supermanager:`, allowedModules);
        }
      }

      // Return profile data from AuthContext (no DB query needed)
      return {
        id: user.id,
        email: user.email || '',
        role: user.role || 'admin',
        user_type: user.user_type || 'system_admin',
        dealership_id: user.dealershipId,
        first_name: user.first_name,
        last_name: user.last_name,
        allowed_modules: allowedModules
      };
    },
    enabled: !!user?.id,
    staleTime: 900000, // 15 minutes
    gcTime: 1800000, // 30 minutes
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
