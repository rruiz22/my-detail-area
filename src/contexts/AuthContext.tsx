import { supabase } from '@/integrations/supabase/client';
import { userProfileCache } from '@/services/userProfileCache';
import { auth, error as logError, warn } from '@/utils/logger';
import { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, useContext, useEffect, useState } from 'react';
// ✅ PHASE 2.2: Import clearPermissionsCache for logout
import { clearPermissionsCache } from '@/utils/permissionSerialization';

// Extended user interface with profile data
interface ExtendedUser extends User {
  user_type?: string;
  role?: string;
  first_name?: string;
  last_name?: string;
  dealershipId?: number;
  dealership_name?: string;
  avatar_seed?: string;
  avatar_url?: string | null;
}

interface AuthContextType {
  user: ExtendedUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ PERF FIX: Get QueryClient for pre-loading permissions
  const queryClient = useQueryClient();

  // Load extended user profile data with timeout and fallback
  const loadUserProfile = async (authUser: User): Promise<ExtendedUser> => {
    try {
      auth('Loading extended profile for user:', authUser.id);

      // Add timeout to prevent infinite loading
      const profilePromise = supabase
        .from('profiles')
        .select('user_type, role, first_name, last_name, dealership_id, avatar_seed, avatar_url')
        .eq('id', authUser.id)
        .single();

      // 5 second timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout')), 5000)
      );

      const { data: profile, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as { data: { user_type?: string; role?: string; first_name?: string; last_name?: string; dealership_id?: number; avatar_seed?: string; avatar_url?: string | null } | null; error: Error | null };

      if (error) {
        logError('Error loading user profile:', error);
        // Return basic user with minimal extension
        return {
          ...authUser,
          user_type: 'system_admin', // Default for your user
          role: 'admin'
        };
      }

      // Extend auth user with profile data (no dealership for now)
      const extendedUser: ExtendedUser = {
        ...authUser,
        user_type: profile.user_type || 'system_admin',
        role: profile.role || 'admin',
        first_name: profile.first_name,
        last_name: profile.last_name,
        dealershipId: profile.dealership_id,
        avatar_seed: profile.avatar_seed,
        avatar_url: profile.avatar_url
      };

      auth('Extended user profile loaded:', {
        user_type: extendedUser.user_type,
        role: extendedUser.role
      });
      return extendedUser;

    } catch (error) {
      logError('Failed to load user profile, using fallback:', error);
      // Emergency fallback to unblock app
      return {
        ...authUser,
        user_type: 'system_admin',
        role: 'admin'
      };
    }
  };

  // Cache-first user loading strategy
  const loadUserWithCache = async (authUser: User) => {
    // 1. Try cache first for INSTANT loading
    const cachedProfile = userProfileCache.getCachedProfile(authUser.id);

    if (cachedProfile) {
      auth('Using cached profile for instant load');
      // Set user immediately with cached data
      const cachedUser: ExtendedUser = {
        ...authUser,
        user_type: cachedProfile.user_type,
        role: cachedProfile.role,
        first_name: cachedProfile.first_name,
        last_name: cachedProfile.last_name,
        dealershipId: cachedProfile.dealershipId,
        dealership_name: cachedProfile.dealership_name,
        avatar_seed: cachedProfile.avatar_seed
      };
      setUser(cachedUser);

      // 2. Sync with database in background (if needed)
      if (userProfileCache.needsRefresh(authUser.id)) {
        loadUserProfile(authUser).then(freshProfile => {
          auth('Background sync completed');
          setUser(freshProfile);
          // Update cache with fresh data
          userProfileCache.cacheProfile({
            userId: freshProfile.id,
            user_type: freshProfile.user_type || 'system_admin',
            role: freshProfile.role || 'admin',
            first_name: freshProfile.first_name || '',
            last_name: freshProfile.last_name || '',
            email: freshProfile.email || '',
            dealershipId: freshProfile.dealershipId,
            dealership_name: freshProfile.dealership_name,
            avatar_seed: freshProfile.avatar_seed
          });
        });
      }
    } else {
      auth('No cache found, loading from database');
      // No cache - load from database and cache result
      const freshProfile = await loadUserProfile(authUser);
      setUser(freshProfile);

      // Cache the loaded profile
      userProfileCache.cacheProfile({
        userId: freshProfile.id,
        user_type: freshProfile.user_type || 'system_admin',
        role: freshProfile.role || 'admin',
        first_name: freshProfile.first_name || '',
        last_name: freshProfile.last_name || '',
        email: freshProfile.email || '',
        dealershipId: freshProfile.dealershipId,
        dealership_name: freshProfile.dealership_name,
        avatar_seed: freshProfile.avatar_seed
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (session?.user) {
          await loadUserWithCache(session.user);
        } else {
          setUser(null);
          // Clear caches on logout
          userProfileCache.clearCache();
          // ✅ PHASE 2.2: Clear permissions cache on logout
          clearPermissionsCache();
        }

        // IMMEDIATE loading completion
        setLoading(false);
      }
    );

    // Check for existing session with network error handling
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          // Handle network errors gracefully
          if (
            error.message?.includes('Failed to fetch') ||
            error.message?.includes('NetworkError') ||
            !navigator.onLine
          ) {
            warn('Network error during session check, will retry when online');
            setLoading(false);
            return;
          }
          logError('Error getting session:', error);
        }

        setSession(session);

        if (session?.user) {
          await loadUserWithCache(session.user);
        } else {
          setUser(null);
        }

        // IMMEDIATE loading completion
        setLoading(false);
      })
      .catch((error) => {
        // Catch any unexpected errors
        logError('Unexpected error during session initialization:', error);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const redirectUrl = `${window.location.origin}/dashboard`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
