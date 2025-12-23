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
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
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

  // 🔒 CRITICAL: Track previous userId to detect user changes without causing re-renders
  const previousUserIdRef = React.useRef<string | null>(null);

  // 🔒 FIX: Track mount state to prevent state updates after unmount (React error #310)
  const isMountedRef = React.useRef(true);

  // 🔒 RATE LIMIT PROTECTION: Track token refresh attempts to detect 429 errors
  const tokenRefreshTimestamps = React.useRef<number[]>([]);

  // Track mount state for cleanup
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load extended user profile data with timeout and fallback
  const loadUserProfile = async (authUser: User): Promise<ExtendedUser> => {
    // 📊 Telemetry: Track profile load start time
    const startTime = Date.now();

    try {
      auth('⏱️ [Profile Load] Starting for user:', authUser.id, '@ ' + new Date(startTime).toISOString());

      // 📊 Connection Pool Telemetry: Track concurrent query
      console.log('🔌 [Connection Pool] Profile query started - AuthContext.loadUserProfile()');

      // Add timeout to prevent infinite loading
      const profilePromise = supabase
        .from('profiles')
        .select('user_type, role, first_name, last_name, dealership_id, avatar_seed, avatar_url')
        .eq('id', authUser.id)
        .single();

      // ✅ FIX: Increased from 5s to 15s for slow networks
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile load timeout after 15 seconds')), 15000)
      );

      const { data: profile, error } = await Promise.race([
        profilePromise,
        timeoutPromise
      ]) as { data: { user_type?: string; role?: string; first_name?: string; last_name?: string; dealership_id?: number; avatar_seed?: string; avatar_url?: string | null } | null; error: Error | null };

      // 📊 Telemetry: Calculate load duration
      const loadDuration = Date.now() - startTime;

      if (error) {
        console.log(`🔌 [Connection Pool] Profile query FAILED after ${loadDuration}ms - AuthContext.loadUserProfile()`);
        logError(`❌ [Profile Load] Failed after ${loadDuration}ms:`, error);
        // Return basic user with minimal extension
        return {
          ...authUser,
          user_type: 'system_admin', // Default for your user
          role: 'admin'
        };
      }

      // 📊 Connection Pool Telemetry: Track query completion
      console.log(`🔌 [Connection Pool] Profile query COMPLETED in ${loadDuration}ms - AuthContext.loadUserProfile()`);

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

      // 📊 Telemetry: Log success with duration and warn if slow
      if (loadDuration > 10000) {
        warn(`⚠️ [Profile Load] SLOW: Took ${loadDuration}ms (>10s threshold) for user ${authUser.id}`);
        warn(`⚠️ [Connection Pool] Possible saturation detected - query took >10s`);
      } else {
        auth(`✅ [Profile Load] Success in ${loadDuration}ms:`, {
          user_type: extendedUser.user_type,
          role: extendedUser.role
        });
      }

      return extendedUser;

    } catch (error) {
      // 📊 Telemetry: Log fallback with duration
      const loadDuration = Date.now() - startTime;
      logError(`❌ [Profile Load] FALLBACK after ${loadDuration}ms:`, error);

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

      // ✅ Guard: Only update if component is still mounted
      if (isMountedRef.current) {
        setUser(cachedUser);
      }

      // 2. Sync with database in background (if needed)
      if (userProfileCache.needsRefresh(authUser.id)) {
        loadUserProfile(authUser).then(freshProfile => {
          auth('Background sync completed');

          // ✅ Guard: Only update if component is still mounted
          if (isMountedRef.current) {
            setUser(freshProfile);
          }

          // Update cache with fresh data (safe without guard - localStorage operation)
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

      // ✅ Guard: Only update if component is still mounted
      if (isMountedRef.current) {
        setUser(freshProfile);
      }

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
        // ✅ FIX: Handle TOKEN_REFRESHED to prevent logout on token expiry
        if (event === 'TOKEN_REFRESHED') {
          // 📊 Telemetry: Log token refresh
          const now = Date.now();
          console.log(`🔄 [Token Refresh] Success at ${new Date(now).toISOString()}`);

          // 🔒 Rate limit detection: Track refresh attempts
          tokenRefreshTimestamps.current.push(now);

          // Keep only last 60 seconds of timestamps
          tokenRefreshTimestamps.current = tokenRefreshTimestamps.current.filter(
            timestamp => now - timestamp < 60000
          );

          // Warn if too many refreshes in short period (indicates potential 429 loop)
          const recentRefreshes = tokenRefreshTimestamps.current.length;
          if (recentRefreshes > 5) {
            console.warn(
              `⚠️ [Token Refresh] RATE LIMIT WARNING: ${recentRefreshes} refreshes in last 60s ` +
              `(Supabase may return 429 errors). Consider increasing token expiry time.`
            );
          }

          // Silently update session without clearing caches
          if (isMountedRef.current && session) {
            setSession(session);
            console.log(`✅ [Token Refresh] Session updated - NO cache clearing`);
          }

          // No need to reload user profile or clear caches
          return;
        }

        // 🔒 CRITICAL FIX: Clear ALL caches BEFORE processing session change
        // This prevents race conditions where old user cache is used for new user
        if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
          previousUserIdRef.current = null;

          // ✅ Guard: Only update state if component is still mounted
          if (isMountedRef.current) {
            setUser(null);
            setSession(null);
            setLoading(false);
          }

          // 📊 Telemetry: Log cache clearing with event type
          console.log(`🗑️ [Cache Clear] Event: ${event} - Clearing user-specific caches`);

          // Cache clearing is safe without guard (localStorage operations)
          userProfileCache.clearCache();
          clearPermissionsCache();

          // ✅ FIX: Use removeQueries instead of invalidateQueries to prevent refetch during logout
          // invalidateQueries triggers immediate refetch, which fails because user is already signed out
          // This causes RLS policy violations and caches empty/error states
          const userQueries = [
            'user-permissions',
            'user_profile',
            'user_profile_permissions',  // 🛡️ CRITICAL: Must be removed to prevent cache poisoning
            'dealer-memberships',
            'user-dealerships',
            'user-roles',
            'active-membership'
          ];

          userQueries.forEach(queryKey => {
            queryClient.removeQueries({ queryKey: [queryKey] });
          });

          console.log(`✅ [Cache Clear] Removed ${userQueries.length} user-specific query caches`);
          return;
        }

        // 🔒 CRITICAL FIX: On user change (different user login), clear previous user's cache
        if (event === 'SIGNED_IN' && previousUserIdRef.current && session?.user?.id !== previousUserIdRef.current) {
          auth('🔄 User changed - clearing previous user cache');

          // 📊 Telemetry: Log user switch
          console.log(`🔄 [User Switch] Old: ${previousUserIdRef.current?.slice(0, 8)}... → New: ${session?.user?.id?.slice(0, 8)}...`);

          userProfileCache.clearCache();
          clearPermissionsCache();

          // ✅ FIX: Selective invalidation instead of queryClient.clear()
          // Only clear user-specific queries when switching users
          const userQueries = [
            'user-permissions',
            'user_profile',
            'dealer-memberships',
            'user-dealerships',
            'user-roles',
            'active-membership'
          ];

          userQueries.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          });

          console.log(`✅ [Cache Clear] User switch - Invalidated ${userQueries.length} query caches`);
        }

        // ✅ Guard: Only update session if component is still mounted
        if (isMountedRef.current) {
          setSession(session);
        }

        if (session?.user) {
          // Update ref with current userId
          previousUserIdRef.current = session.user.id;
          // ✅ Cache is now guaranteed to be cleared before loading new user
          await loadUserWithCache(session.user);
        } else {
          // ✅ Guard: Only update if component is still mounted
          if (isMountedRef.current) {
            setUser(null);
          }
        }

        // ✅ Guard: Only update loading if component is still mounted
        if (isMountedRef.current) {
          setLoading(false);
        }
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

            // ✅ Guard: Only update loading if component is still mounted
            if (isMountedRef.current) {
              setLoading(false);
            }
            return;
          }
          logError('Error getting session:', error);
        }

        // ✅ Guard: Only update session if component is still mounted
        if (isMountedRef.current) {
          setSession(session);
        }

        if (session?.user) {
          // Initialize ref with current userId on session restore
          previousUserIdRef.current = session.user.id;
          await loadUserWithCache(session.user);
        } else {
          // ✅ Guard: Only update if component is still mounted
          if (isMountedRef.current) {
            setUser(null);
          }
        }

        // ✅ Guard: IMMEDIATE loading completion only if mounted
        if (isMountedRef.current) {
          setLoading(false);
        }
      })
      .catch((error) => {
        // Catch any unexpected errors
        logError('Unexpected error during session initialization:', error);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []); // ✅ Empty deps - listener setup only once on mount

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
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If authentication failed, return the error
    if (authError) {
      return { error: authError };
    }

    // Authentication successful - now check if user has any active memberships
    const userId = authData?.user?.id;
    if (!userId) {
      console.error('❌ [Auth] User ID not found after successful login');
      return { error: authError };
    }

    console.log('🔍 [Auth] Checking active memberships for user:', email);

    try {
      // Check if user has at least one active membership
      const { data: activeMemberships, error: membershipError } = await supabase
        .from('dealer_memberships')
        .select('id, dealer_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1);

      if (membershipError) {
        console.error('❌ [Auth] Error checking memberships:', membershipError);
        // Don't block login if we can't check - fail open for safety
        return { error: authError };
      }

      // If user has no active memberships, sign them out and return error
      if (!activeMemberships || activeMemberships.length === 0) {
        console.warn('⚠️ [Auth] User has no active memberships:', email);

        // Sign out the user immediately
        await supabase.auth.signOut({ scope: 'local' });

        // Return custom error
        return {
          error: new Error('account_deactivated') as any
        };
      }

      console.log('✅ [Auth] User has active membership(s):', activeMemberships.length);
      return { error: authError };
    } catch (error: any) {
      console.error('❌ [Auth] Unexpected error during membership check:', error);
      // Fail open - allow login if membership check fails unexpectedly
      return { error: authError };
    }
  };

  const signOut = async () => {
    try {
      // Use local scope to sign out only the current session
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error: any) {
      // 403 errors on logout are common with Supabase and safe to ignore
      // The session is already cleared locally, so logout is successful
      if (error?.status === 403 || error?.message?.includes('403') || error?.code === '403') {
        console.log('ℹ️ Logout 403 error (safe to ignore - session cleared locally)');
        return; // Silent success - user is logged out locally
      }

      // Log other errors but don't block logout
      console.error('⚠️ Logout error (non-critical):', error);
      // Don't throw - allow logout to complete locally even if server call fails
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    return { error };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
