import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface EntityFollower {
  id: string;
  user_id: string;
  follow_type: string;
  notification_level: string;
  followed_at: string;
  user_name: string;
  user_email: string;
  presence_status: string;
}

export interface UseEntityFollowersReturn {
  followers: EntityFollower[];
  loading: boolean;
  error: string | null;
  followerCount: number;
  isFollowing: boolean;
  followEntity: (notificationLevel?: string) => Promise<void>;
  unfollowEntity: () => Promise<void>;
  updateNotificationLevel: (level: string) => Promise<void>;
  refreshFollowers: () => Promise<void>;
}

export function useEntityFollowers(
  entityType: string,
  entityId: string | undefined,
  dealerId?: number
): UseEntityFollowersReturn {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<EntityFollower[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFollowers = useCallback(async () => {
    if (!entityId || !dealerId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .rpc('get_entity_followers', {
          p_entity_type: entityType,
          p_entity_id: entityId,
          p_dealer_id: dealerId
        });

      if (fetchError) throw fetchError;

      setFollowers(data || []);
    } catch (err) {
      console.error('Error fetching followers:', err);
      setError(err instanceof Error ? err.message : 'Error fetching followers');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, dealerId]);

  const followEntity = useCallback(async (notificationLevel = 'all') => {
    if (!entityId || !dealerId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('entity_followers')
        .upsert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          dealer_id: dealerId,
          follow_type: 'manual' as any,
          notification_level: notificationLevel as any,
          followed_by: user.id
        });

      if (error) throw error;

      await fetchFollowers();
      toast({
        title: "Following",
        description: `You're now following this ${entityType}`
      });
    } catch (err) {
      console.error('Error following entity:', err);
      toast({
        title: "Error",
        description: "Failed to follow entity",
        variant: "destructive"
      });
    }
  }, [entityType, entityId, dealerId, user?.id, fetchFollowers]);

  const unfollowEntity = useCallback(async () => {
    if (!entityId || !dealerId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('entity_followers')
        .delete()
        .match({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          dealer_id: dealerId
        });

      if (error) throw error;

      await fetchFollowers();
      toast({
        title: "Unfollowed",
        description: `You're no longer following this ${entityType}`
      });
    } catch (err) {
      console.error('Error unfollowing entity:', err);
      toast({
        title: "Error",
        description: "Failed to unfollow entity",
        variant: "destructive"
      });
    }
  }, [entityType, entityId, dealerId, user?.id, fetchFollowers]);

  const updateNotificationLevel = useCallback(async (level: string) => {
    if (!entityId || !dealerId || !user?.id) return;

    try {
      const { error } = await supabase
        .from('entity_followers')
        .update({ notification_level: level as any })
        .match({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          dealer_id: dealerId
        });

      if (error) throw error;

      await fetchFollowers();
      toast({
        title: "Notifications Updated",
        description: `Notification level set to ${level}`
      });
    } catch (err) {
      console.error('Error updating notification level:', err);
      toast({
        title: "Error",
        description: "Failed to update notifications",
        variant: "destructive"
      });
    }
  }, [entityType, entityId, dealerId, user?.id, fetchFollowers]);

  useEffect(() => {
    fetchFollowers();
  }, [fetchFollowers]);

  // Real-time subscription to followers changes
  useEffect(() => {
    if (!entityId || !dealerId) return;

    const channel = supabase
      .channel(`entity_followers_${entityType}_${entityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entity_followers',
          filter: `entity_type=eq.${entityType},entity_id=eq.${entityId}`
        },
        () => {
          fetchFollowers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entityType, entityId, dealerId, fetchFollowers]);

  const isFollowing = followers.some(f => f.user_id === user?.id);
  const followerCount = followers.length;

  return {
    followers,
    loading,
    error,
    followerCount,
    isFollowing,
    followEntity,
    unfollowEntity,
    updateNotificationLevel,
    refreshFollowers: fetchFollowers
  };
}