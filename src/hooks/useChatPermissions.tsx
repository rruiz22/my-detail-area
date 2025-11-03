import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Chat permission levels from database ENUM
 */
export type ChatPermissionLevel = 'none' | 'read' | 'restricted_write' | 'write' | 'moderate' | 'admin';

/**
 * RPC response structure from get_chat_effective_permissions
 */
interface ChatPermissionsRPCResponse {
  has_access: boolean;
  level: ChatPermissionLevel;
  capabilities: {
    messages: {
      send_text: boolean;
      send_voice: boolean;
      send_files: boolean;
      edit_own: boolean;
      delete_own: boolean;
      delete_others: boolean;
    };
    participants: {
      invite_users: boolean;
      remove_users: boolean;
      change_permissions: boolean;
    };
    conversation: {
      update_settings: boolean;
      archive: boolean;
      delete: boolean;
    };
  };
}

/**
 * Chat permissions interface for conversation-specific permissions
 * Used by UI components to check what actions user can perform
 */
export interface ChatPermissions {
  // Access control
  hasAccess: boolean;
  level: ChatPermissionLevel;

  // Message capabilities
  canSendText: boolean;
  canSendVoice: boolean;
  canSendFiles: boolean;
  canEditOwnMessages: boolean;
  canDeleteOwnMessages: boolean;
  canDeleteOthersMessages: boolean;

  // Participant management
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canChangePermissions: boolean;

  // Conversation management
  canUpdateSettings: boolean;
  canArchiveConversation: boolean;
  canDeleteConversation: boolean;

  // Derived permissions (computed helpers)
  isAdmin: boolean;
  isModerator: boolean;
  canModerate: boolean;
  canSendMessages: boolean; // any message type
  isReadOnly: boolean;
}

/**
 * Global chat permissions (not conversation-specific)
 * Used for creating conversations and global chat features
 */
export interface GlobalChatPermissions {
  canCreateDirectChats: boolean;
  canCreateGroups: boolean;
  canCreateChannels: boolean;
  canCreateAnnouncements: boolean;
  canViewAllConversations: boolean;
  canManageChatSettings: boolean;
}

/**
 * User contact permissions for managing blocked users and favorites
 * Maintained for backward compatibility with existing contact system
 */
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

/**
 * Return type for conversation-specific permissions hook
 */
interface UseChatPermissionsReturn {
  permissions: ChatPermissions;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Return type for global chat permissions hook
 */
interface UseGlobalChatPermissionsReturn {
  permissions: GlobalChatPermissions;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Return type for contact permissions hook (backward compatibility)
 */
interface UseContactPermissionsReturn {
  contactPermissions: UserContactPermissions | null;
  isLoading: boolean;
  error: Error | null;

  // Contact management methods
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  addToFavorites: (userId: string) => Promise<boolean>;
  removeFromFavorites: (userId: string) => Promise<boolean>;
  isUserBlocked: (userId: string) => boolean;
  isUserFavorite: (userId: string) => boolean;
  updateContactPermissions: (updates: Partial<UserContactPermissions>) => Promise<boolean>;

  // Contact permission checks
  canContactUser: (targetUserId: string) => Promise<boolean>;
  canInviteToGroup: (targetUserId: string) => Promise<boolean>;
  canMentionInChannel: (targetUserId: string) => Promise<boolean>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform RPC response from snake_case to camelCase and add derived properties
 */
function transformPermissions(data: ChatPermissionsRPCResponse | null): ChatPermissions {
  if (!data || !data.has_access) {
    return getDefaultNoAccessPermissions();
  }

  const caps = data.capabilities || {
    messages: {},
    participants: {},
    conversation: {}
  };
  const messages = caps.messages || {};
  const participants = caps.participants || {};
  const conversation = caps.conversation || {};

  return {
    hasAccess: data.has_access,
    level: data.level,

    // Message capabilities
    canSendText: messages.send_text ?? false,
    canSendVoice: messages.send_voice ?? false,
    canSendFiles: messages.send_files ?? false,
    canEditOwnMessages: messages.edit_own ?? false,
    canDeleteOwnMessages: messages.delete_own ?? false,
    canDeleteOthersMessages: messages.delete_others ?? false,

    // Participant management
    canInviteUsers: participants.invite_users ?? false,
    canRemoveUsers: participants.remove_users ?? false,
    canChangePermissions: participants.change_permissions ?? false,

    // Conversation management
    canUpdateSettings: conversation.update_settings ?? false,
    canArchiveConversation: conversation.archive ?? false,
    canDeleteConversation: conversation.delete ?? false,

    // Derived permissions
    isAdmin: data.level === 'admin',
    isModerator: data.level === 'moderate' || data.level === 'admin',
    canModerate: data.level === 'moderate' || data.level === 'admin',
    canSendMessages: messages.send_text || messages.send_voice || messages.send_files,
    isReadOnly: data.level === 'read'
  };
}

/**
 * Get default permissions for users with no access
 */
function getDefaultNoAccessPermissions(): ChatPermissions {
  return {
    hasAccess: false,
    level: 'none',

    canSendText: false,
    canSendVoice: false,
    canSendFiles: false,
    canEditOwnMessages: false,
    canDeleteOwnMessages: false,
    canDeleteOthersMessages: false,

    canInviteUsers: false,
    canRemoveUsers: false,
    canChangePermissions: false,

    canUpdateSettings: false,
    canArchiveConversation: false,
    canDeleteConversation: false,

    isAdmin: false,
    isModerator: false,
    canModerate: false,
    canSendMessages: false,
    isReadOnly: true
  };
}

/**
 * Parse global chat permissions from dealer_groups permissions array
 */
function parseGlobalPermissions(groupsData: any[]): GlobalChatPermissions {
  const permissions = new Set<string>();

  // Collect all permissions from all groups
  groupsData?.forEach((membership: any) => {
    const groupPerms = membership.dealer_groups?.permissions || [];
    groupPerms.forEach((perm: string) => permissions.add(perm));
  });

  const hasWildcard = permissions.has('chat.*');

  return {
    canCreateDirectChats: hasWildcard || permissions.has('chat.create_direct'),
    canCreateGroups: hasWildcard || permissions.has('chat.create_groups'),
    canCreateChannels: hasWildcard || permissions.has('chat.create_channels'),
    canCreateAnnouncements: hasWildcard || permissions.has('chat.create_announcements'),
    canViewAllConversations: hasWildcard || permissions.has('chat.view_all'),
    canManageChatSettings: hasWildcard || permissions.has('chat.manage_settings')
  };
}

// ============================================================================
// PRIMARY HOOKS
// ============================================================================

/**
 * Get conversation-specific permissions using RPC-based granular system
 *
 * @param conversationId - UUID of the conversation
 * @param dealerId - Optional dealer ID (defaults to current dealership)
 *
 * @example
 * ```tsx
 * const { permissions, isLoading } = useChatPermissions(conversationId);
 *
 * if (permissions.canSendText) {
 *   // Show message input
 * }
 *
 * if (permissions.canDeleteOthersMessages) {
 *   // Show delete button for all messages
 * }
 * ```
 */
export function useChatPermissions(
  conversationId?: string,
  dealerId?: number
): UseChatPermissionsReturn {
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const effectiveDealerId = dealerId || currentDealership?.id;

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['chat-permissions', conversationId, user?.id, effectiveDealerId],
    queryFn: async () => {
      if (!conversationId || !user?.id || !effectiveDealerId) {
        return getDefaultNoAccessPermissions();
      }

      const { data, error: rpcError } = await supabase.rpc('get_chat_effective_permissions', {
        p_user_id: user.id,
        p_conversation_id: conversationId,
        p_dealer_id: effectiveDealerId
      });

      if (rpcError) {
        console.error('[useChatPermissions] Error fetching chat permissions:', rpcError);
        throw rpcError;
      }

      return transformPermissions(data as ChatPermissionsRPCResponse);
    },
    enabled: !!conversationId && !!user?.id && !!effectiveDealerId,
    staleTime: 5 * 60 * 1000, // 5 minutes - permissions don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });

  return {
    permissions: permissions || getDefaultNoAccessPermissions(),
    isLoading,
    error: error as Error | null
  };
}

/**
 * Get global chat permissions (not conversation-specific)
 * Used for creating conversations and accessing global chat features
 *
 * @param dealerId - Optional dealer ID (defaults to current dealership)
 *
 * @example
 * ```tsx
 * const { permissions } = useGlobalChatPermissions();
 *
 * if (permissions.canCreateDirectChats) {
 *   // Show "New Chat" button
 * }
 * ```
 */
export function useGlobalChatPermissions(dealerId?: number): UseGlobalChatPermissionsReturn {
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const effectiveDealerId = dealerId || currentDealership?.id;

  const { data: permissions, isLoading, error } = useQuery({
    queryKey: ['global-chat-permissions', user?.id, effectiveDealerId],
    queryFn: async () => {
      if (!user?.id || !effectiveDealerId) {
        return {
          canCreateDirectChats: false,
          canCreateGroups: false,
          canCreateChannels: false,
          canCreateAnnouncements: false,
          canViewAllConversations: false,
          canManageChatSettings: false
        };
      }

      // Check if user has elevated system role (bypass permission checks)
      // UPDATED: Changed from 'admin' to 'system_admin'/'supermanager' for role system redesign
      // Regular users (role='user') get permissions via custom roles below
      if (user.role === 'system_admin' || user.role === 'supermanager' || user.user_type === 'system_admin') {
        return {
          canCreateDirectChats: true,
          canCreateGroups: true,
          canCreateChannels: true,
          canCreateAnnouncements: true,
          canViewAllConversations: true,
          canManageChatSettings: true
        };
      }

      // Fetch dealer_groups permissions
      const { data: groupsData, error: fetchError } = await supabase
        .from('dealer_membership_groups')
        .select(`
          dealer_groups (
            permissions
          )
        `)
        .eq('dealer_memberships.user_id', user.id)
        .eq('dealer_memberships.dealer_id', effectiveDealerId)
        .eq('dealer_memberships.is_active', true);

      if (fetchError) {
        console.error('[useGlobalChatPermissions] Error fetching global permissions:', fetchError);
        throw fetchError;
      }

      return parseGlobalPermissions(groupsData || []);
    },
    enabled: !!user?.id && !!effectiveDealerId,
    staleTime: 10 * 60 * 1000, // 10 minutes - global permissions change rarely
    gcTime: 20 * 60 * 1000, // 20 minutes
    retry: 1,
    refetchOnWindowFocus: false
  });

  // FIX: Protect elevated permissions - Never return all-false if user has elevated role
  // UPDATED: Check for supermanager in addition to system_admin
  const isElevatedUser = user?.role === 'system_admin' ||
                         user?.role === 'supermanager' ||
                         (user as any)?.is_system_admin === true ||
                         user?.user_type === 'system_admin';

  const fallbackPermissions = isElevatedUser ? {
    // System admins and supermanagers always have full permissions, even if there's an error loading
    canCreateDirectChats: true,
    canCreateGroups: true,
    canCreateChannels: true,
    canCreateAnnouncements: true,
    canViewAllConversations: true,
    canManageChatSettings: true
  } : {
    // Regular users get restricted permissions on error
    canCreateDirectChats: false,
    canCreateGroups: false,
    canCreateChannels: false,
    canCreateAnnouncements: false,
    canViewAllConversations: false,
    canManageChatSettings: false
  };

  return {
    permissions: permissions || fallbackPermissions,
    isLoading,
    error: error as Error | null
  };
}

/**
 * Get user contact permissions for managing blocked users and favorites
 * Maintained for backward compatibility with existing contact system
 *
 * @param dealerId - Optional dealer ID (defaults to current dealership)
 *
 * @example
 * ```tsx
 * const { contactPermissions, blockUser, isUserBlocked } = useContactPermissions();
 *
 * if (isUserBlocked(userId)) {
 *   // Show unblock button
 * }
 *
 * await blockUser(userId);
 * ```
 */
export function useContactPermissions(dealerId?: number): UseContactPermissionsReturn {
  const { user } = useAuth();
  const { currentDealership } = useAccessibleDealerships();
  const effectiveDealerId = dealerId || currentDealership?.id;
  const queryClient = useQueryClient();

  // Fetch contact permissions
  const { data: contactPermissions, isLoading, error } = useQuery({
    queryKey: ['contact-permissions', user?.id, effectiveDealerId],
    queryFn: async () => {
      if (!user?.id || !effectiveDealerId) {
        return null;
      }

      const { data, error: fetchError } = await supabase
        .from('user_contact_permissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('dealer_id', effectiveDealerId)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Create default contact permissions if not exists
        const defaultPermissions: Partial<UserContactPermissions> = {
          user_id: user.id,
          dealer_id: effectiveDealerId,
          allow_direct_messages: true,
          allow_group_invitations: true,
          allow_channel_mentions: true,
          blocked_users: [],
          favorite_contacts: [],
          show_online_status: true,
          show_last_seen: true,
          auto_accept_invites: false
        };

        const { data: newData, error: createError } = await supabase
          .from('user_contact_permissions')
          .insert(defaultPermissions)
          .select()
          .single();

        if (createError) {
          console.error('[useContactPermissions] Error creating default permissions:', createError);
          throw createError;
        }

        return {
          ...newData,
          blocked_users: (newData.blocked_users as string[]) || [],
          favorite_contacts: (newData.favorite_contacts as string[]) || []
        } as UserContactPermissions;
      }

      if (fetchError) {
        throw fetchError;
      }

      return {
        ...data,
        blocked_users: (data.blocked_users as string[]) || [],
        favorite_contacts: (data.favorite_contacts as string[]) || []
      } as UserContactPermissions;
    },
    enabled: !!user?.id && !!effectiveDealerId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  });

  // Block user
  const blockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions || !effectiveDealerId) return false;

    try {
      const currentBlocked = contactPermissions.blocked_users || [];
      if (currentBlocked.includes(userId)) return true;

      const updatedBlocked = [...currentBlocked, userId];

      const { error: updateError } = await supabase
        .from('user_contact_permissions')
        .update({ blocked_users: updatedBlocked })
        .eq('user_id', user.id)
        .eq('dealer_id', effectiveDealerId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['contact-permissions', user.id, effectiveDealerId] });

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error blocking user:', error);
      return false;
    }
  }, [user?.id, contactPermissions, effectiveDealerId, queryClient]);

  // Unblock user
  const unblockUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions || !effectiveDealerId) return false;

    try {
      const currentBlocked = contactPermissions.blocked_users || [];
      const updatedBlocked = currentBlocked.filter(id => id !== userId);

      const { error: updateError } = await supabase
        .from('user_contact_permissions')
        .update({ blocked_users: updatedBlocked })
        .eq('user_id', user.id)
        .eq('dealer_id', effectiveDealerId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['contact-permissions', user.id, effectiveDealerId] });

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error unblocking user:', error);
      return false;
    }
  }, [user?.id, contactPermissions, effectiveDealerId, queryClient]);

  // Add to favorites
  const addToFavorites = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions || !effectiveDealerId) return false;

    try {
      const currentFavorites = contactPermissions.favorite_contacts || [];
      if (currentFavorites.includes(userId)) return true;

      const updatedFavorites = [...currentFavorites, userId];

      const { error: updateError } = await supabase
        .from('user_contact_permissions')
        .update({ favorite_contacts: updatedFavorites })
        .eq('user_id', user.id)
        .eq('dealer_id', effectiveDealerId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['contact-permissions', user.id, effectiveDealerId] });

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error adding to favorites:', error);
      return false;
    }
  }, [user?.id, contactPermissions, effectiveDealerId, queryClient]);

  // Remove from favorites
  const removeFromFavorites = useCallback(async (userId: string): Promise<boolean> => {
    if (!user?.id || !contactPermissions || !effectiveDealerId) return false;

    try {
      const currentFavorites = contactPermissions.favorite_contacts || [];
      const updatedFavorites = currentFavorites.filter(id => id !== userId);

      const { error: updateError } = await supabase
        .from('user_contact_permissions')
        .update({ favorite_contacts: updatedFavorites })
        .eq('user_id', user.id)
        .eq('dealer_id', effectiveDealerId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['contact-permissions', user.id, effectiveDealerId] });

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error removing from favorites:', error);
      return false;
    }
  }, [user?.id, contactPermissions, effectiveDealerId, queryClient]);

  // Check if user is blocked
  const isUserBlocked = useCallback((userId: string): boolean => {
    return contactPermissions?.blocked_users?.includes(userId) || false;
  }, [contactPermissions?.blocked_users]);

  // Check if user is favorite
  const isUserFavorite = useCallback((userId: string): boolean => {
    return contactPermissions?.favorite_contacts?.includes(userId) || false;
  }, [contactPermissions?.favorite_contacts]);

  // Update contact permissions
  const updateContactPermissions = useCallback(async (
    updates: Partial<UserContactPermissions>
  ): Promise<boolean> => {
    if (!user?.id || !effectiveDealerId) return false;

    try {
      const { error: updateError } = await supabase
        .from('user_contact_permissions')
        .update(updates)
        .eq('user_id', user.id)
        .eq('dealer_id', effectiveDealerId);

      if (updateError) throw updateError;

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['contact-permissions', user.id, effectiveDealerId] });

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error updating contact permissions:', error);
      return false;
    }
  }, [user?.id, effectiveDealerId, queryClient]);

  // Check if user can contact another user
  const canContactUser = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || targetUserId === user.id) return false;

    try {
      // Check if target user allows direct messages
      const { data: targetPermissions } = await supabase
        .from('user_contact_permissions')
        .select('allow_direct_messages, blocked_users')
        .eq('user_id', targetUserId)
        .eq('dealer_id', effectiveDealerId)
        .single();

      if (!targetPermissions?.allow_direct_messages) return false;

      // Check if current user is blocked by target
      const blockedUsers = (targetPermissions.blocked_users as string[]) || [];
      if (blockedUsers.includes(user.id)) return false;

      // Check if current user has blocked the target
      const currentUserBlockedUsers = contactPermissions?.blocked_users || [];
      if (currentUserBlockedUsers.includes(targetUserId)) return false;

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error checking contact permissions:', error);
      return false;
    }
  }, [user?.id, contactPermissions?.blocked_users, effectiveDealerId]);

  // Check if user can invite to group
  const canInviteToGroup = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || targetUserId === user.id) return false;

    try {
      // Check if target user allows group invitations
      const { data: targetPermissions } = await supabase
        .from('user_contact_permissions')
        .select('allow_group_invitations, blocked_users')
        .eq('user_id', targetUserId)
        .eq('dealer_id', effectiveDealerId)
        .single();

      if (!targetPermissions?.allow_group_invitations) return false;

      // Check blocking status
      const blockedUsers = (targetPermissions.blocked_users as string[]) || [];
      if (blockedUsers.includes(user.id)) return false;

      const currentUserBlockedUsers = contactPermissions?.blocked_users || [];
      if (currentUserBlockedUsers.includes(targetUserId)) return false;

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error checking group invite permissions:', error);
      return false;
    }
  }, [user?.id, contactPermissions?.blocked_users, effectiveDealerId]);

  // Check if user can mention in channel
  const canMentionInChannel = useCallback(async (targetUserId: string): Promise<boolean> => {
    if (!user?.id || targetUserId === user.id) return false;

    try {
      // Check if target user allows channel mentions
      const { data: targetPermissions } = await supabase
        .from('user_contact_permissions')
        .select('allow_channel_mentions, blocked_users')
        .eq('user_id', targetUserId)
        .eq('dealer_id', effectiveDealerId)
        .single();

      if (!targetPermissions?.allow_channel_mentions) return false;

      // Check blocking status
      const blockedUsers = (targetPermissions.blocked_users as string[]) || [];
      if (blockedUsers.includes(user.id)) return false;

      return true;
    } catch (error) {
      console.error('[useContactPermissions] Error checking mention permissions:', error);
      return false;
    }
  }, [user?.id, effectiveDealerId]);

  return {
    contactPermissions: contactPermissions || null,
    isLoading,
    error: error as Error | null,
    blockUser,
    unblockUser,
    addToFavorites,
    removeFromFavorites,
    isUserBlocked,
    isUserFavorite,
    updateContactPermissions,
    canContactUser,
    canInviteToGroup,
    canMentionInChannel
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Invalidate chat permissions cache
 * Use after permission changes or role updates
 *
 * @example
 * ```tsx
 * const invalidatePermissions = useInvalidateChatPermissions();
 *
 * // After updating user role
 * await updateUserRole(userId, newRole);
 * invalidatePermissions(conversationId);
 * ```
 */
export function useInvalidateChatPermissions() {
  const queryClient = useQueryClient();

  return useCallback((conversationId?: string) => {
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: ['chat-permissions', conversationId] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['chat-permissions'] });
    }
    queryClient.invalidateQueries({ queryKey: ['global-chat-permissions'] });
  }, [queryClient]);
}
