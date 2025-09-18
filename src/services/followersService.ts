import { supabase } from '@/integrations/supabase/client';

export interface FollowerData {
  entityType: string;
  entityId: string;
  userId: string;
  dealerId: number;
  followType: 'assigned' | 'manual' | 'creator' | 'interested';
  notificationLevel: 'all' | 'important' | 'none';
  followedBy?: string;
  autoAddedReason?: string;
}

export class FollowersService {

  /**
   * Auto-follow system: Add user as follower when assigned to order
   */
  async autoFollowOnAssignment(orderId: string, assignedUserId: string, assignedByUserId: string): Promise<void> {
    try {
      console.log(`🎯 Auto-following user ${assignedUserId} on order ${orderId}`);

      // Check if already following to avoid duplicates
      const { data: existingFollow } = await supabase
        .from('entity_followers')
        .select('id')
        .eq('entity_type', 'order')
        .eq('entity_id', orderId)
        .eq('user_id', assignedUserId)
        .eq('is_active', true)
        .single();

      if (existingFollow) {
        console.log('ℹ️ User already following this order');
        return;
      }

      // Get user's dealership for proper scoping
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', assignedUserId)
        .single();

      const dealerId = userProfile?.dealership_id || 5;

      // Add as follower with assigned type
      await this.addFollower({
        entityType: 'order',
        entityId: orderId,
        userId: assignedUserId,
        dealerId,
        followType: 'assigned',
        notificationLevel: 'all', // Assigned users get all notifications
        followedBy: assignedByUserId,
        autoAddedReason: 'User assigned to order'
      });

      console.log('✅ Auto-follow completed for assigned user');

    } catch (error) {
      console.error('❌ Auto-follow failed:', error);
      // Don't throw error to avoid breaking order assignment
    }
  }

  /**
   * Auto-follow system: Add creator as follower when order is created
   */
  async autoFollowOnCreation(orderId: string, creatorUserId: string): Promise<void> {
    try {
      console.log(`🎯 Auto-following creator ${creatorUserId} on order ${orderId}`);

      // Get creator's dealership
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('dealership_id')
        .eq('id', creatorUserId)
        .single();

      const dealerId = userProfile?.dealership_id || 5;

      // Add creator as follower
      await this.addFollower({
        entityType: 'order',
        entityId: orderId,
        userId: creatorUserId,
        dealerId,
        followType: 'creator',
        notificationLevel: 'important', // Creators get important notifications
        followedBy: creatorUserId,
        autoAddedReason: 'Order creator'
      });

      console.log('✅ Auto-follow completed for creator');

    } catch (error) {
      console.error('❌ Auto-follow creator failed:', error);
      // Don't throw error to avoid breaking order creation
    }
  }

  /**
   * Add a follower to an entity
   */
  async addFollower(followerData: FollowerData): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_followers')
        .insert({
          entity_type: followerData.entityType,
          entity_id: followerData.entityId,
          user_id: followerData.userId,
          dealer_id: followerData.dealerId,
          follow_type: followerData.followType,
          notification_level: followerData.notificationLevel,
          followed_at: new Date().toISOString(),
          followed_by: followerData.followedBy,
          is_active: true,
          auto_added_reason: followerData.autoAddedReason
        });

      if (error) {
        console.error('❌ Error adding follower:', error);
        throw error;
      }

      console.log('✅ Follower added successfully');

    } catch (error) {
      console.error('❌ Failed to add follower:', error);
      throw error;
    }
  }

  /**
   * Remove a follower from an entity
   */
  async removeFollower(entityType: string, entityId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_followers')
        .update({ is_active: false })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error removing follower:', error);
        throw error;
      }

      console.log('✅ Follower removed successfully');

    } catch (error) {
      console.error('❌ Failed to remove follower:', error);
      throw error;
    }
  }

  /**
   * Update notification level for a follower
   */
  async updateNotificationLevel(
    entityType: string,
    entityId: string,
    userId: string,
    level: 'all' | 'important' | 'none'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('entity_followers')
        .update({ notification_level: level })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('user_id', userId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error updating notification level:', error);
        throw error;
      }

      console.log('✅ Notification level updated successfully');

    } catch (error) {
      console.error('❌ Failed to update notification level:', error);
      throw error;
    }
  }

  /**
   * Get all followers for an entity
   */
  async getFollowers(entityType: string, entityId: string): Promise<Follower[]> {
    try {
      const { data, error } = await supabase
        .from('entity_followers')
        .select(`
          id,
          user_id,
          follow_type,
          notification_level,
          followed_at,
          is_active,
          profiles (
            id,
            first_name,
            last_name,
            email,
            user_type,
            phone,
            avatar_url
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .order('followed_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting followers:', error);
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        userId: item.user_id,
        firstName: item.profiles?.first_name || '',
        lastName: item.profiles?.last_name || '',
        email: item.profiles?.email || '',
        userType: item.profiles?.user_type || 'regular',
        followType: item.follow_type,
        notificationLevel: item.notification_level,
        followedAt: item.followed_at || '',
        isPrimary: item.follow_type === 'assigned' || item.follow_type === 'creator',
        phone: item.profiles?.phone,
        avatarUrl: item.profiles?.avatar_url
      }));

    } catch (error) {
      console.error('❌ Failed to get followers:', error);
      return [];
    }
  }

  /**
   * Get followers count for an entity
   */
  async getFollowersCount(entityType: string, entityId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('entity_followers')
        .select('id', { count: 'exact' })
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error getting followers count:', error);
        return 0;
      }

      return count || 0;

    } catch (error) {
      console.error('❌ Failed to get followers count:', error);
      return 0;
    }
  }

  /**
   * Get notification settings for followers
   */
  async getNotificationSettings(entityType: string, entityId: string): Promise<Array<{userId: string, level: string}>> {
    try {
      const { data, error } = await supabase
        .from('entity_followers')
        .select('user_id, notification_level')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_active', true)
        .neq('notification_level', 'none');

      if (error) {
        console.error('❌ Error getting notification settings:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('❌ Failed to get notification settings:', error);
      return [];
    }
  }

  /**
   * Bulk follow for team members when order is created
   */
  async autoFollowTeamMembers(orderId: string, dealerId: number, creatorUserId: string): Promise<void> {
    try {
      console.log(`👥 Auto-following team members for order ${orderId}`);

      // Get active team members from dealership
      const { data: teamMembers, error } = await supabase
        .from('dealer_memberships')
        .select(`
          user_id,
          profiles (
            id,
            user_type,
            first_name,
            last_name
          )
        `)
        .eq('dealer_id', dealerId)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching team members:', error);
        return;
      }

      // Auto-follow managers and admins
      const autoFollowPromises = (teamMembers || [])
        .filter(member =>
          member.profiles?.user_type === 'admin' ||
          member.profiles?.user_type === 'manager'
        )
        .map(member =>
          this.addFollower({
            entityType: 'order',
            entityId: orderId,
            userId: member.user_id,
            dealerId,
            followType: 'interested',
            notificationLevel: 'important',
            followedBy: creatorUserId,
            autoAddedReason: `Auto-added ${member.profiles?.user_type}`
          })
        );

      await Promise.allSettled(autoFollowPromises);
      console.log('✅ Team auto-follow completed');

    } catch (error) {
      console.error('❌ Team auto-follow failed:', error);
      // Don't throw to avoid breaking order creation
    }
  }
}

// Export singleton instance
export const followersService = new FollowersService();