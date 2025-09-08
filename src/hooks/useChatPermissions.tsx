import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

export type ChatPermissionLevel = 'read' | 'write' | 'moderate' | 'admin';

export interface ChatPermissions {
  // Conversation permissions
  canCreateDirectChats: boolean;
  canCreateGroups: boolean;
  canCreateChannels: boolean;
  canCreateAnnouncements: boolean;
  
  // Message permissions
  canSendMessages: boolean;
  canSendVoiceMessages: boolean;
  canSendFiles: boolean;
  canEditOwnMessages: boolean;
  canDeleteOwnMessages: boolean;
  canDeleteOthersMessages: boolean;
  
  // Moderation permissions
  canModerateConversations: boolean;
  canManageParticipants: boolean;
  canMuteUsers: boolean;
  canKickUsers: boolean;
  canBanUsers: boolean;
  
  // System permissions
  canViewAllConversations: boolean;
  canManageChatSettings: boolean;
  isAdmin: boolean;
}

export interface UserContactPermissions {
  user_id: string;
  dealer_id: number;
  allow_direct_messages: boolean;
  allow_group_invitations: boolean;
  allow_channel_mentions: boolean;
  blocked_users: string[];
  favorite_contacts: string[];
  show_online_status: boolean;
  show_last_seen: boolean;
  auto_accept_invites: boolean;
}

interface UseChatPermissionsReturn {
  // Current user permissions
  permissions: ChatPermissions;
  contactPermissions: UserContactPermissions | null;
  
  // Permission checks
  canPerformAction: (action: keyof ChatPermissions) => boolean;
  canContactUser: (targetUserId: string) => Promise<boolean>;
  canInviteToGroup: (targetUserId: string) => Promise<boolean>;
  canMentionInChannel: (targetUserId: string) => Promise<boolean>;
  
  // Contact management
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  addToFavorites: (userId: string) => Promise<boolean>;
  removeFromFavorites: (userId: string) => Promise<boolean>;
  isUserBlocked: (userId: string) => boolean;
  isUserFavorite: (userId: string) => boolean;
  
  // Settings management
  updateContactPermissions: (updates: Partial<UserContactPermissions>) => Promise<boolean>;
  
  loading: boolean;
  error: string | null;
  refreshPermissions: () => void;
}

export const useChatPermissions = (dealerId?: number): UseChatPermissionsReturn => {
  const { user } = useAuth();
  const { dealerships } = useAccessibleDealerships();
  
  const [permissions, setPermissions] = useState<ChatPermissions>({
    canCreateDirectChats: false,
    canCreateGroups: false,
    canCreateChannels: false,
    canCreateAnnouncements: false,
    canSendMessages: false,
    canSendVoiceMessages: false,
    canSendFiles: false,
    canEditOwnMessages: false,
    canDeleteOwnMessages: false,
    canDeleteOthersMessages: false,
    canModerateConversations: false,
    canManageParticipants: false,
    canMuteUsers: false,
    canKickUsers: false,
    canBanUsers: false,
    canViewAllConversations: false,
    canManageChatSettings: false,
    isAdmin: false
  });
  
  const [contactPermissions, setContactPermissions] = useState<UserContactPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const activeDealerId = dealerId || dealerships[0]?.id;

  // Fetch user permissions based on roles and group memberships
  const fetchPermissions = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      setError(null);

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin';

      // Get user's dealer membership and group permissions
      const { data: membershipData } = await supabase
        .from('dealer_memberships')
        .select(`
          *,
          dealer_membership_groups (
            group_id,
            dealer_groups (
              name,
              permissions
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .eq('is_active', true)
        .single();

      // Collect all permissions from groups
      const groupPermissions = new Set<string>();
      
      membershipData?.dealer_membership_groups?.forEach((membership: any) => {
        const groupPerms = membership.dealer_groups?.permissions || [];
        groupPerms.forEach((perm: string) => groupPermissions.add(perm));
      });

      // Define permission mappings
      const permissionMap: ChatPermissions = {
        canCreateDirectChats: isAdmin || groupPermissions.has('chat.create_direct') || groupPermissions.has('chat.*'),
        canCreateGroups: isAdmin || groupPermissions.has('chat.create_groups') || groupPermissions.has('chat.*'),
        canCreateChannels: isAdmin || groupPermissions.has('chat.create_channels') || groupPermissions.has('chat.*'),
        canCreateAnnouncements: isAdmin || groupPermissions.has('chat.create_announcements') || groupPermissions.has('chat.*'),
        
        canSendMessages: isAdmin || groupPermissions.has('chat.send_messages') || groupPermissions.has('chat.*'),
        canSendVoiceMessages: isAdmin || groupPermissions.has('chat.send_voice') || groupPermissions.has('chat.*'),
        canSendFiles: isAdmin || groupPermissions.has('chat.send_files') || groupPermissions.has('chat.*'),
        canEditOwnMessages: isAdmin || groupPermissions.has('chat.edit_messages') || groupPermissions.has('chat.*'),
        canDeleteOwnMessages: isAdmin || groupPermissions.has('chat.delete_messages') || groupPermissions.has('chat.*'),
        canDeleteOthersMessages: isAdmin || groupPermissions.has('chat.delete_others_messages') || groupPermissions.has('chat.*'),
        
        canModerateConversations: isAdmin || groupPermissions.has('chat.moderate') || groupPermissions.has('chat.*'),
        canManageParticipants: isAdmin || groupPermissions.has('chat.manage_participants') || groupPermissions.has('chat.*'),
        canMuteUsers: isAdmin || groupPermissions.has('chat.mute_users') || groupPermissions.has('chat.*'),
        canKickUsers: isAdmin || groupPermissions.has('chat.kick_users') || groupPermissions.has('chat.*'),
        canBanUsers: isAdmin || groupPermissions.has('chat.ban_users') || groupPermissions.has('chat.*'),
        
        canViewAllConversations: isAdmin || groupPermissions.has('chat.view_all') || groupPermissions.has('chat.*'),
        canManageChatSettings: isAdmin || groupPermissions.has('chat.manage_settings') || groupPermissions.has('chat.*'),
        isAdmin
      };

      setPermissions(permissionMap);

    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err instanceof Error ? err.message : 'Error fetching permissions');
    }
  }, [user?.id, activeDealerId]);

  // Fetch user contact permissions
  const fetchContactPermissions = useCallback(async () => {
    if (!user?.id || !activeDealerId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('user_contact_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create default contact permissions
        const defaultPermissions = {
          user_id: user.id,
          dealer_id: activeDealerId,
          allow_direct_messages: true,
          allow_group_invitations: true,
          allow_channel_mentions: true,
          blocked_users: [],
          favorite_contacts: [],
          show_online_status: true,
          show_last_seen: true,
          auto_accept_invites: false
        };

        const newPermissions = {
          ...defaultPermissions,
          user_id: user.id,
          dealer_id: activeDealerId,
          blocked_users: [],
          favorite_contacts: []
        };

        const { data: newPermissionsData, error: createError } = await supabase
          .from('user_contact_permissions')
          .insert(newPermissions)
          .select()
          .single();

        if (createError) throw createError;
        const typedNewPermissions = {
          ...newPermissionsData,
          blocked_users: (newPermissionsData.blocked_users as string[]) || [],
          favorite_contacts: (newPermissionsData.favorite_contacts as string[]) || []
        };
        setContactPermissions(typedNewPermissions);
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Cast JSON fields to proper types
        const typedPermissions = {
          ...data,
          blocked_users: (data.blocked_users as string[]) || [],
          favorite_contacts: (data.favorite_contacts as string[]) || []
        };
        setContactPermissions(typedPermissions);
      }
    } catch (err) {
      console.error('Error fetching contact permissions:', err);
      setError(err instanceof Error ? err.message : 'Error fetching contact permissions');
    }
  }, [user?.id, activeDealerId]);

  // Permission check utility
  const canPerformAction = useCallback((action: keyof ChatPermissions): boolean => {
    return permissions[action] === true;
  }, [permissions]);

  // Check if user can contact another user
  const canContactUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || targetUserId === user.id) return false;

    try {
      // Check if current user has permission to send direct messages
      if (!permissions.canCreateDirectChats) return false;

      // Check if target user allows direct messages
      const { data: targetPermissions } = await supabase
        .from('user_contact_permissions')
        .select('allow_direct_messages, blocked_users')
        .eq('user_id', targetUserId)
        .eq('dealer_id', activeDealerId)
        .single();

      if (!targetPermissions?.allow_direct_messages) return false;

      // Check if current user is blocked by target
      const blockedUsers = (targetPermissions.blocked_users as string[]) || [];
      if (blockedUsers.includes(user.id)) return false;

      // Check if current user has blocked the target
      const currentUserBlockedUsers = (contactPermissions?.blocked_users as string[]) || [];
      if (currentUserBlockedUsers.includes(targetUserId)) return false;

      return true;
    } catch (err) {
      console.error('Error checking contact permissions:', err);
      return false;
    }
  }, [user?.id, permissions.canCreateDirectChats, contactPermissions?.blocked_users, activeDealerId]);

  // Check if user can invite to group
  const canInviteToGroup = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || targetUserId === user.id) return false;

    try {
      // Check if current user has permission to manage participants
      if (!permissions.canManageParticipants) return false;

      // Check if target user allows group invitations
      const { data: targetPermissions } = await supabase
        .from('user_contact_permissions')
        .select('allow_group_invitations, blocked_users')
        .eq('user_id', targetUserId)
        .eq('dealer_id', activeDealerId)
        .single();

      if (!targetPermissions?.allow_group_invitations) return false;

      // Check blocking status
      const blockedUsers = (targetPermissions.blocked_users as string[]) || [];
      if (blockedUsers.includes(user.id)) return false;

      const currentUserBlockedUsers = (contactPermissions?.blocked_users as string[]) || [];
      if (currentUserBlockedUsers.includes(targetUserId)) return false;

      return true;
    } catch (err) {
      console.error('Error checking group invite permissions:', err);
      return false;
    }
  }, [user?.id, permissions.canManageParticipants, contactPermissions?.blocked_users, activeDealerId]);

  // Check if user can mention in channel
  const canMentionInChannel = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || targetUserId === user.id) return false;

    try {
      // Check if target user allows channel mentions
      const { data: targetPermissions } = await supabase
        .from('user_contact_permissions')
        .select('allow_channel_mentions, blocked_users')
        .eq('user_id', targetUserId)
        .eq('dealer_id', activeDealerId)
        .single();

      if (!targetPermissions?.allow_channel_mentions) return false;

      // Check blocking status
      const blockedUsers = (targetPermissions.blocked_users as string[]) || [];
      if (blockedUsers.includes(user.id)) return false;

      return true;
    } catch (err) {
      console.error('Error checking mention permissions:', err);
      return false;
    }
  }, [user?.id, activeDealerId]);

  // Block user
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions) return false;

    try {
      const currentBlocked = contactPermissions.blocked_users || [];
      if (currentBlocked.includes(userId)) return true;

      const updatedBlocked = [...currentBlocked, userId];

      const { error } = await supabase
        .from('user_contact_permissions')
        .update({ blocked_users: updatedBlocked })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId);

      if (error) throw error;

      setContactPermissions(prev => prev ? {
        ...prev,
        blocked_users: updatedBlocked
      } : null);

      return true;
    } catch (err) {
      console.error('Error blocking user:', err);
      setError(err instanceof Error ? err.message : 'Error blocking user');
      return false;
    }
  }, [user?.id, contactPermissions, activeDealerId]);

  // Unblock user
  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions) return false;

    try {
      const currentBlocked = contactPermissions.blocked_users || [];
      const updatedBlocked = currentBlocked.filter(id => id !== userId);

      const { error } = await supabase
        .from('user_contact_permissions')
        .update({ blocked_users: updatedBlocked })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId);

      if (error) throw error;

      setContactPermissions(prev => prev ? {
        ...prev,
        blocked_users: updatedBlocked
      } : null);

      return true;
    } catch (err) {
      console.error('Error unblocking user:', err);
      setError(err instanceof Error ? err.message : 'Error unblocking user');
      return false;
    }
  }, [user?.id, contactPermissions, activeDealerId]);

  // Add to favorites
  const addToFavorites = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions) return false;

    try {
      const currentFavorites = contactPermissions.favorite_contacts || [];
      if (currentFavorites.includes(userId)) return true;

      const updatedFavorites = [...currentFavorites, userId];

      const { error } = await supabase
        .from('user_contact_permissions')
        .update({ favorite_contacts: updatedFavorites })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId);

      if (error) throw error;

      setContactPermissions(prev => prev ? {
        ...prev,
        favorite_contacts: updatedFavorites
      } : null);

      return true;
    } catch (err) {
      console.error('Error adding to favorites:', err);
      setError(err instanceof Error ? err.message : 'Error adding to favorites');
      return false;
    }
  }, [user?.id, contactPermissions, activeDealerId]);

  // Remove from favorites
  const removeFromFavorites = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions) return false;

    try {
      const currentFavorites = contactPermissions.favorite_contacts || [];
      const updatedFavorites = currentFavorites.filter(id => id !== userId);

      const { error } = await supabase
        .from('user_contact_permissions')
        .update({ favorite_contacts: updatedFavorites })
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId);

      if (error) throw error;

      setContactPermissions(prev => prev ? {
        ...prev,
        favorite_contacts: updatedFavorites
      } : null);

      return true;
    } catch (err) {
      console.error('Error removing from favorites:', err);
      setError(err instanceof Error ? err.message : 'Error removing from favorites');
      return false;
    }
  }, [user?.id, contactPermissions, activeDealerId]);

  // Utility functions
  const isUserBlocked = useCallback((userId: string): boolean => {
    return contactPermissions?.blocked_users?.includes(userId) || false;
  }, [contactPermissions?.blocked_users]);

  const isUserFavorite = useCallback((userId: string): boolean => {
    return contactPermissions?.favorite_contacts?.includes(userId) || false;
  }, [contactPermissions?.favorite_contacts]);

  // Update contact permissions
  const updateContactPermissions = useCallback(async (updates: Partial<UserContactPermissions>): Promise<boolean> => {
    if (!user?.id || !activeDealerId) return false;

    try {
      const { error } = await supabase
        .from('user_contact_permissions')
        .update(updates)
        .eq('user_id', user.id)
        .eq('dealer_id', activeDealerId);

      if (error) throw error;

      setContactPermissions(prev => prev ? { ...prev, ...updates } : null);
      return true;
    } catch (err) {
      console.error('Error updating contact permissions:', err);
      setError(err instanceof Error ? err.message : 'Error updating contact permissions');
      return false;
    }
  }, [user?.id, activeDealerId]);

  // Refresh all permissions
  const refreshPermissions = useCallback(() => {
    if (user?.id && activeDealerId) {
      fetchPermissions();
      fetchContactPermissions();
    }
  }, [user?.id, activeDealerId, fetchPermissions, fetchContactPermissions]);

  // Initial load
  useEffect(() => {
    if (user?.id && activeDealerId) {
      setLoading(true);
      Promise.all([
        fetchPermissions(),
        fetchContactPermissions()
      ]).finally(() => setLoading(false));
    }
  }, [user?.id, activeDealerId, fetchPermissions, fetchContactPermissions]);

  return {
    permissions,
    contactPermissions,
    canPerformAction,
    canContactUser,
    canInviteToGroup,
    canMentionInChannel,
    blockUser,
    unblockUser,
    addToFavorites,
    removeFromFavorites,
    isUserBlocked,
    isUserFavorite,
    updateContactPermissions,
    loading,
    error,
    refreshPermissions
  };
};