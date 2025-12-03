import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { slackNotificationService } from '@/services/slackNotificationService';

export interface Follower {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: 'detail' | 'regular' | 'admin';
  followType: 'assigned' | 'manual' | 'creator' | 'interested';
  notificationLevel: 'all' | 'important' | 'none';
  followedAt: string;
  isPrimary: boolean;
  phone?: string;
  avatarUrl?: string;
}

export interface FollowersHookResult {
  followers: Follower[];
  loading: boolean;
  error: string | null;
  addFollower: (userId: string, followType?: string, notificationLevel?: string) => Promise<void>;
  removeFollower: (userId: string) => Promise<void>;
  updateNotificationLevel: (userId: string, level: string) => Promise<void>;
  refreshFollowers: () => Promise<void>;
  isUserFollowing: (userId: string) => boolean;
  followersCount: number;
}

export const useFollowers = (entityType: string = 'order', entityId: string): FollowersHookResult => {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch followers for the entity
  const fetchFollowers = useCallback(async () => {
    if (!entityId) return;

    setLoading(true);
    setError(null);

    try {
      console.log(`🔍 Fetching followers for ${entityType}:${entityId}`);

      // First, get the followers data
      const { data: followersData, error: followersError } = await supabase
        .from('entity_followers')
        .select(`
          id,
          user_id,
          follow_type,
          notification_level,
          followed_at,
          is_active
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('followed_at', { ascending: false });

      if (followersError) {
        console.error('❌ Error fetching followers:', followersError);
        setError('Failed to load followers');
        return;
      }

      if (!followersData || followersData.length === 0) {
        console.log('📊 No followers found for this entity');
        setFollowers([]);
        return;
      }

      // Get user IDs for separate profiles query
      const userIds = followersData.map(f => f.user_id);

      // Second, get the profiles data
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          user_type,
          avatar_seed,
          avatar_variant
        `)
        .in('id', userIds);

      if (profilesError) {
        console.error('❌ Error fetching profiles:', profilesError);
        setError('Failed to load user profiles');
        return;
      }

      // Create lookup map for profiles
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.id, profile])
      );

      // Transform and combine data
      const transformedFollowers: Follower[] = followersData
        .map(followerData => {
          const profile = profilesMap.get(followerData.user_id);
          if (!profile) {
            console.warn(`⚠️ Profile not found for user_id: ${followerData.user_id}`);
            return null;
          }

          return {
            id: followerData.id,
            userId: followerData.user_id,
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: profile.email || '',
            userType: profile.user_type || 'regular',
            followType: followerData.follow_type,
            notificationLevel: followerData.notification_level,
            followedAt: followerData.followed_at || '',
            isPrimary: followerData.follow_type === 'assigned' || followerData.follow_type === 'creator',
            phone: undefined, // Remove phone field - not in profiles table
            avatarUrl: profile.avatar_seed || undefined // Use avatar_seed instead of avatar_url
          };
        })
        .filter(Boolean) as Follower[]; // Remove null entries

      console.log(`✅ Loaded ${transformedFollowers.length} followers with profiles`);
      setFollowers(transformedFollowers);

    } catch (err) {
      console.error('❌ Unexpected error fetching followers:', err);
      setError('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  // Add a new follower
  const addFollower = useCallback(async (
    userId: string,
    followType: string = 'manual',
    notificationLevel: string = 'important'
  ) => {
    if (!user || !entityId) return;

    try {
      console.log(`➕ Adding follower ${userId} to ${entityType}:${entityId}`);

      // Check if follower already exists
      const { data: existing } = await supabase
        .from('entity_followers')
        .select('id, is_active')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        // If exists but inactive, reactivate
        if (!existing.is_active) {
          const { error: updateError } = await supabase
            .from('entity_followers')
            .update({
              is_active: true,
              notification_level: notificationLevel,
              followed_at: new Date().toISOString(),
              followed_by: user.id
            })
            .eq('id', existing.id);

          if (updateError) throw updateError;
          console.log('✅ Follower reactivated');
        } else {
          console.log('ℹ️ User is already following');
          // Refresh list anyway to show current state
          await fetchFollowers();
          return; // Not an error, just already following
        }
      } else {
        // Insert new follower
        const { error: insertError } = await supabase
          .from('entity_followers')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            user_id: userId,
            dealer_id: user.dealershipId || 5,
            follow_type: followType,
            notification_level: notificationLevel,
            followed_at: new Date().toISOString(),
            followed_by: user.id,
            is_active: true
          });

        if (insertError) {
          console.error('❌ Error adding follower:', insertError);
          throw insertError;
        }

        console.log('✅ Follower added successfully');

        // 📤 SLACK NOTIFICATION: Follower Added (only for new followers, not reactivations)
        if (entityType === 'order') {
          try {
            // Get order data
            const { data: orderData } = await supabase
              .from('orders')
              .select('order_number, custom_order_number, dealer_id, order_type, stock_number, vehicle_year, vehicle_make, vehicle_model, short_link')
              .eq('id', entityId)
              .single();

            if (orderData) {
              // Get follower's name
              const { data: followerProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', userId)
                .single();

              const followerName = followerProfile?.first_name
                ? `${followerProfile.first_name} ${followerProfile.last_name || ''}`.trim()
                : followerProfile?.email || 'Someone';

              // Get adder's name (who added the follower)
              const { data: adderProfile } = await supabase
                .from('profiles')
                .select('first_name, last_name, email')
                .eq('id', user.id)
                .single();

              const addedByName = adderProfile?.first_name
                ? `${adderProfile.first_name} ${adderProfile.last_name || ''}`.trim()
                : user.email || 'Someone';

              const getNotificationModule = (orderType: string): 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash' => {
                const mapping: Record<string, 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash'> = {
                  'sales': 'sales_orders',
                  'service': 'service_orders',
                  'recon': 'recon_orders',
                  'carwash': 'car_wash'
                };
                return mapping[orderType] || 'sales_orders';
              };

              const notifModule = getNotificationModule(orderData.order_type || 'sales');

              const isEnabled = await slackNotificationService.isEnabled(
                orderData.dealer_id,
                notifModule,
                'follower_added'
              );

              if (isEnabled) {
                await slackNotificationService.sendNotification({
                  orderId: entityId,
                  dealerId: orderData.dealer_id,
                  module: notifModule,
                  eventType: 'follower_added',
                  eventData: {
                    orderNumber: orderData.order_number || orderData.custom_order_number || entityId,
                    stockNumber: orderData.stock_number,
                    vehicleInfo: `${orderData.vehicle_year || ''} ${orderData.vehicle_make || ''} ${orderData.vehicle_model || ''}`.trim() || undefined,
                    shortLink: orderData.short_link || `${window.location.origin}/orders/${entityId}`,
                    followerName: followerName,
                    addedBy: addedByName
                  }
                });
              }
            }
          } catch (notifError) {
            console.error('❌ [Slack] Failed to send follower added notification:', notifError);
            // Don't fail the operation if Slack notification fails
          }
        }
      }

      // Refresh followers list
      await fetchFollowers();

    } catch (err) {
      console.error('❌ Failed to add follower:', err);
      setError('Failed to add follower');
      throw err;
    }
  }, [user, entityType, entityId, fetchFollowers]);

  // Remove a follower
  const removeFollower = useCallback(async (userId: string) => {
    if (!entityId) return;

    try {
      console.log(`➖ Removing follower ${userId} from ${entityType}:${entityId}`);

      const { error: updateError } = await supabase
        .from('entity_followers')
        .update({ is_active: false })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Error removing follower:', updateError);
        throw updateError;
      }

      console.log('✅ Follower removed successfully');

      // Refresh followers list
      await fetchFollowers();

    } catch (err) {
      console.error('❌ Failed to remove follower:', err);
      setError('Failed to remove follower');
      throw err;
    }
  }, [entityType, entityId, fetchFollowers]);

  // Update notification level for a follower
  const updateNotificationLevel = useCallback(async (userId: string, level: string) => {
    if (!entityId) return;

    try {
      console.log(`🔔 Updating notification level for ${userId} to ${level}`);

      const { error: updateError } = await supabase
        .from('entity_followers')
        .update({ notification_level: level })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (updateError) {
        console.error('❌ Error updating notification level:', updateError);
        throw updateError;
      }

      console.log('✅ Notification level updated successfully');

      // Refresh followers list
      await fetchFollowers();

    } catch (err) {
      console.error('❌ Failed to update notification level:', err);
      setError('Failed to update notification level');
      throw err;
    }
  }, [entityType, entityId, fetchFollowers]);

  // Check if a specific user is following
  const isUserFollowing = useCallback((userId: string): boolean => {
    return followers.some(follower => follower.userId === userId);
  }, [followers]);

  // Initialize data on mount and set up real-time subscription
  useEffect(() => {
    fetchFollowers();

    // Set up real-time subscription for followers changes
    const subscription = supabase
      .channel(`followers-${entityType}-${entityId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'entity_followers',
        filter: `entity_type=eq.${entityType},entity_id=eq.${entityId}`
      }, (payload) => {
        console.log('📡 Real-time followers update:', payload.eventType);
        // Refresh followers when changes occur
        fetchFollowers();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [entityType, entityId, fetchFollowers]);

  return {
    followers,
    loading,
    error,
    addFollower,
    removeFollower,
    updateNotificationLevel,
    refreshFollowers: fetchFollowers,
    isUserFollowing,
    followersCount: followers.length
  };
};