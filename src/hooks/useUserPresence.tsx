import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline' | 'invisible';

export interface UserPresence {
  user_id: string;
  dealer_id: number;
  status: PresenceStatus;
  custom_status?: string;
  status_emoji?: string;
  last_seen_at: string;
  last_activity_at: string;
  is_mobile: boolean;
  auto_away_minutes: number;
  
  // Computed fields
  user_name?: string;
  user_avatar?: string;
  is_online?: boolean;
  last_seen_formatted?: string;
}

interface UseUserPresenceReturn {
  // Current user presence
  myPresence: UserPresence | null;
  
  // Other users presence in the dealer
  usersPresence: UserPresence[];
  
  // Actions for current user
  setStatus: (status: PresenceStatus) => Promise<void>;
  setCustomStatus: (message: string, emoji?: string) => Promise<void>;
  clearCustomStatus: () => Promise<void>;
  setAutoAwayMinutes: (minutes: number) => Promise<void>;
  
  // Utilities
  getUserPresence: (userId: string) => UserPresence | undefined;
  getOnlineUsers: () => UserPresence[];
  isUserOnline: (userId: string) => boolean;
  
  // Real-time heartbeat
  updateActivity: () => void;
  
  loading: boolean;
  error: string | null;
}

export const useUserPresence = (dealerId?: number): UseUserPresenceReturn => {
  const { user } = useAuth();
  const { dealerships } = useAccessibleDealerships();
  
  const [myPresence, setMyPresence] = useState<UserPresence | null>(null);
  const [usersPresence, setUsersPresence] = useState<UserPresence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const awayTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<Date>(new Date());
  
  const activeDealerId = dealerId || dealerships[0]?.id;

  // Initialize user presence
  const initializePresence = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      setError(null);

      // Get or create user presence record
      const { data: existingPresence, error: fetchError } = await supabase
        .from('user_presence')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .single();

      let presence: UserPresence;

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create new presence record
        const { data: newPresence, error: createError } = await supabase
          .from('user_presence')
          .insert({
            user_id: user.id,
            dealer_id: activeDealerId,
            status: 'online',
            last_seen_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            is_mobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
            user_agent: navigator.userAgent,
            ip_address: null, // Will be set by database trigger if needed
            auto_away_minutes: 15
          })
          .select()
          .single();

        if (createError) throw createError;
        presence = newPresence;
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Update existing presence to online
        const { data: updatedPresence, error: updateError } = await supabase
          .from('user_presence')
          .update({
            status: 'online',
            last_seen_at: new Date().toISOString(),
            last_activity_at: new Date().toISOString(),
            is_mobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
            user_agent: navigator.userAgent
          })
          .eq('user_id', user.id)
          .eq('dealer_id', activeDealerId)
          .select()
          .single();

        if (updateError) throw updateError;
        presence = updatedPresence;
      }

      setMyPresence(presence);
      
      // Start heartbeat
      startHeartbeat();
      
    } catch (err) {
      console.error('Error initializing presence:', err);
      setError(err instanceof Error ? err.message : t('user_presence.error_initializing'));
    }
  }, [user?.id, activeDealerId]);

  // Fetch all users presence in the dealer
  const fetchUsersPresence = useCallback(async () => {
    if (!activeDealerId) return;

    try {
      // Simplified presence data query for now
      const { data, error: fetchError } = await supabase
        .from('user_presence')
        .select('*')
        .eq('dealer_id', activeDealerId)
        .neq('user_id', user?.id || '');

      if (fetchError) throw fetchError;

      // Simplified user presence data for now
      const processedPresence: UserPresence[] = data?.map(presence => ({
        ...presence,
        user_name: t('user_presence.default_user_name'),
        user_avatar: undefined,
        is_online: ['online', 'busy'].includes(presence.status),
        last_seen_formatted: formatLastSeen(presence.last_seen_at)
      })) || [];

      setUsersPresence(processedPresence);
    } catch (err) {
      console.error('Error fetching users presence:', err);
      setError(err instanceof Error ? err.message : t('user_presence.error_fetching_users'));
    }
  }, [activeDealerId, user?.id]);

  // Start heartbeat to maintain online status
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(async () => {
      if (!user?.id || !activeDealerId) return;

      try {
        await supabase
          .from('user_presence')
          .update({
            last_activity_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('dealer_id', activeDealerId);
      } catch (err) {
        console.error('Heartbeat error:', err);
      }
    }, 30000); // Update every 30 seconds
  }, [user?.id, activeDealerId]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Set user status
  const setStatus = useCallback(async (status: PresenceStatus) => {
    if (!user?.id || !activeDealerId) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .update({
          status,
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .select()
        .single();

      if (error) throw error;
      setMyPresence(data);
    } catch (err) {
      console.error('Error setting status:', err);
      setError(err instanceof Error ? err.message : t('user_presence.error_setting_status'));
    }
  }, [user?.id, activeDealerId]);

  // Set custom status message
  const setCustomStatus = useCallback(async (message: string, emoji?: string) => {
    if (!user?.id || !activeDealerId) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .update({
          custom_status: message,
          status_emoji: emoji,
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .select()
        .single();

      if (error) throw error;
      setMyPresence(data);
    } catch (err) {
      console.error('Error setting custom status:', err);
      setError(err instanceof Error ? err.message : t('user_presence.error_custom_status'));
    }
  }, [user?.id, activeDealerId]);

  // Clear custom status
  const clearCustomStatus = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .update({
          custom_status: null,
          status_emoji: null,
          last_activity_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .select()
        .single();

      if (error) throw error;
      setMyPresence(data);
    } catch (err) {
      console.error('Error clearing custom status:', err);
      setError(err instanceof Error ? err.message : 'Error clearing custom status');
    }
  }, [user?.id, activeDealerId]);

  // Set auto-away minutes
  const setAutoAwayMinutes = useCallback(async (minutes: number) => {
    if (!user?.id || !activeDealerId) return;

    try {
      const { data, error } = await supabase
        .from('user_presence')
        .update({ auto_away_minutes: minutes })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .select()
        .single();

      if (error) throw error;
      setMyPresence(data);
    } catch (err) {
      console.error('Error setting auto-away minutes:', err);
      setError(err instanceof Error ? err.message : 'Error setting auto-away minutes');
    }
  }, [user?.id, activeDealerId]);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date();
    
    // Clear existing away timeout
    if (awayTimeoutRef.current) {
      clearTimeout(awayTimeoutRef.current);
    }

    // Set new away timeout based on user's auto_away_minutes
    if (myPresence?.status === 'online' && myPresence.auto_away_minutes > 0) {
      awayTimeoutRef.current = setTimeout(() => {
        setStatus('away');
      }, myPresence.auto_away_minutes * 60 * 1000);
    }
  }, [myPresence?.status, myPresence?.auto_away_minutes, setStatus]);

  // Utility functions
  const getUserPresence = useCallback((userId: string) => {
    return usersPresence.find(p => p.user_id === userId);
  }, [usersPresence]);

  const getOnlineUsers = useCallback(() => {
    return usersPresence.filter(p => p.is_online);
  }, [usersPresence]);

  const isUserOnline = useCallback((userId: string) => {
    const presence = getUserPresence(userId);
    return presence?.is_online || false;
  }, [getUserPresence]);

  // Format last seen time
  const formatLastSeen = (lastSeenAt: string): string => {
    const now = new Date();
    const lastSeen = new Date(lastSeenAt);
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return lastSeen.toLocaleDateString();
  };

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, set to away after delay
        setTimeout(() => {
          if (document.hidden && myPresence?.status === 'online') {
            setStatus('away');
          }
        }, 5000);
      } else {
        // Page is visible, set back to online if was away
        if (myPresence?.status === 'away') {
          setStatus('online');
        }
        updateActivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [myPresence?.status, setStatus, updateActivity]);

  // Handle user activity events
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [updateActivity]);

  // Real-time subscriptions
  useEffect(() => {
    if (!activeDealerId) return;

    // Subscribe to presence changes in the dealer
    const presenceChannel = supabase
      .channel(`presence:${activeDealerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `dealer_id=eq.${activeDealerId}`
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as any;
            if (newData.user_id === user?.id) {
              setMyPresence(newData as UserPresence);
            } else {
              fetchUsersPresence();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [activeDealerId, user?.id, fetchUsersPresence]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user?.id && activeDealerId) {
        await supabase
          .from('user_presence')
          .update({
            status: 'offline',
            last_seen_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('dealer_id', activeDealerId);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      stopHeartbeat();
      if (awayTimeoutRef.current) {
        clearTimeout(awayTimeoutRef.current);
      }
    };
  }, [user?.id, activeDealerId, stopHeartbeat]);

  // Initialize presence on mount
  useEffect(() => {
    if (user?.id && activeDealerId) {
      setLoading(true);
      Promise.all([
        initializePresence(),
        fetchUsersPresence()
      ]).finally(() => setLoading(false));
    }
  }, [user?.id, activeDealerId, initializePresence, fetchUsersPresence]);

  return {
    myPresence,
    usersPresence,
    setStatus,
    setCustomStatus,
    clearCustomStatus,
    setAutoAwayMinutes,
    getUserPresence,
    getOnlineUsers,
    isUserOnline,
    updateActivity,
    loading,
    error
  };
};
