/**
 * Usage Examples for useChatPermissions Hooks
 *
 * This file demonstrates how to use the new RPC-based chat permissions system
 * in various components throughout the application.
 */

import { useChatPermissions, useGlobalChatPermissions, useContactPermissions, useInvalidateChatPermissions } from './useChatPermissions';

// ============================================================================
// EXAMPLE 1: Conversation-Specific Permissions (Message Input Component)
// ============================================================================

/**
 * ChatMessageInput - Shows message input with conditional features
 */
export function ChatMessageInputExample() {
  const conversationId = 'conv-123-uuid';
  const { permissions, isLoading } = useChatPermissions(conversationId);

  if (isLoading) {
    return <div>Loading permissions...</div>;
  }

  if (!permissions.hasAccess) {
    return <div>You do not have access to this conversation</div>;
  }

  if (permissions.isReadOnly) {
    return <div>This is a read-only conversation</div>;
  }

  return (
    <div className="message-input">
      {/* Text input - always shown if user can send messages */}
      {permissions.canSendText && (
        <textarea placeholder="Type a message..." />
      )}

      {/* Voice message button */}
      {permissions.canSendVoice && (
        <button>
          <MicIcon /> Voice Message
        </button>
      )}

      {/* File attachment button */}
      {permissions.canSendFiles && (
        <button>
          <PaperclipIcon /> Attach File
        </button>
      )}

      {/* Show disabled state if user has restricted_write */}
      {!permissions.canSendMessages && (
        <div className="text-muted">
          You cannot send messages in this conversation
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Message Actions (Edit/Delete Buttons)
// ============================================================================

/**
 * ChatMessageActions - Shows edit/delete buttons based on permissions
 */
export function ChatMessageActionsExample({ message, currentUserId }: any) {
  const { permissions } = useChatPermissions(message.conversation_id);

  const isOwnMessage = message.sender_id === currentUserId;

  return (
    <div className="message-actions">
      {/* Edit own message */}
      {isOwnMessage && permissions.canEditOwnMessages && (
        <button>
          <EditIcon /> Edit
        </button>
      )}

      {/* Delete own message */}
      {isOwnMessage && permissions.canDeleteOwnMessages && (
        <button>
          <TrashIcon /> Delete
        </button>
      )}

      {/* Delete others' messages (moderators/admins) */}
      {!isOwnMessage && permissions.canDeleteOthersMessages && (
        <button className="text-red-500">
          <TrashIcon /> Delete (Moderator)
        </button>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Participant Management (Invite Users, Change Permissions)
// ============================================================================

/**
 * ConversationSettingsPanel - Shows settings based on permissions
 */
export function ConversationSettingsPanelExample({ conversationId }: any) {
  const { permissions } = useChatPermissions(conversationId);

  if (!permissions.hasAccess) {
    return null;
  }

  return (
    <div className="settings-panel">
      <h3>Conversation Settings</h3>

      {/* Invite users to conversation */}
      {permissions.canInviteUsers && (
        <section>
          <h4>Invite Users</h4>
          <button>
            <UserPlusIcon /> Add Participants
          </button>
        </section>
      )}

      {/* Remove users from conversation */}
      {permissions.canRemoveUsers && (
        <section>
          <h4>Manage Participants</h4>
          <button className="text-red-500">
            <UserMinusIcon /> Remove Participant
          </button>
        </section>
      )}

      {/* Change user permissions */}
      {permissions.canChangePermissions && (
        <section>
          <h4>Permission Management</h4>
          <button>
            <ShieldIcon /> Manage Permissions
          </button>
        </section>
      )}

      {/* Update conversation settings (name, description, etc.) */}
      {permissions.canUpdateSettings && (
        <section>
          <h4>Conversation Settings</h4>
          <button>
            <SettingsIcon /> Update Settings
          </button>
        </section>
      )}

      {/* Archive conversation */}
      {permissions.canArchiveConversation && (
        <button>
          <ArchiveIcon /> Archive Conversation
        </button>
      )}

      {/* Delete conversation (admins only) */}
      {permissions.canDeleteConversation && (
        <button className="text-red-500">
          <TrashIcon /> Delete Conversation
        </button>
      )}

      {/* Show permission level badge */}
      <div className="mt-4">
        <span className="badge">
          Your Role: {permissions.level}
        </span>
        {permissions.isModerator && (
          <span className="badge badge-warning">Moderator</span>
        )}
        {permissions.isAdmin && (
          <span className="badge badge-danger">Admin</span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Global Chat Permissions (Create Conversations)
// ============================================================================

/**
 * ChatSidebar - Shows "New Chat" buttons based on global permissions
 */
export function ChatSidebarExample() {
  const { permissions, isLoading } = useGlobalChatPermissions();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-sidebar">
      <h2>Messages</h2>

      {/* New Direct Chat */}
      {permissions.canCreateDirectChats && (
        <button>
          <MessageSquareIcon /> New Direct Chat
        </button>
      )}

      {/* New Group Chat */}
      {permissions.canCreateGroups && (
        <button>
          <UsersIcon /> New Group
        </button>
      )}

      {/* New Channel */}
      {permissions.canCreateChannels && (
        <button>
          <HashIcon /> New Channel
        </button>
      )}

      {/* New Announcement (admins only) */}
      {permissions.canCreateAnnouncements && (
        <button>
          <MegaphoneIcon /> New Announcement
        </button>
      )}

      {/* View all conversations (admins/moderators) */}
      {permissions.canViewAllConversations && (
        <button>
          <EyeIcon /> View All Conversations
        </button>
      )}

      {/* Chat settings (admins only) */}
      {permissions.canManageChatSettings && (
        <button>
          <SettingsIcon /> Chat Settings
        </button>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Contact Permissions (Block/Favorite Users)
// ============================================================================

/**
 * UserContactCard - Shows contact actions based on permissions
 */
export function UserContactCardExample({ userId }: { userId: string }) {
  const {
    contactPermissions,
    blockUser,
    unblockUser,
    addToFavorites,
    removeFromFavorites,
    isUserBlocked,
    isUserFavorite,
    canContactUser
  } = useContactPermissions();

  const handleBlockToggle = async () => {
    if (isUserBlocked(userId)) {
      await unblockUser(userId);
    } else {
      await blockUser(userId);
    }
  };

  const handleFavoriteToggle = async () => {
    if (isUserFavorite(userId)) {
      await removeFromFavorites(userId);
    } else {
      await addToFavorites(userId);
    }
  };

  const handleStartChat = async () => {
    const canContact = await canContactUser(userId);

    if (!canContact) {
      alert('Cannot start chat with this user');
      return;
    }

    // Start chat logic...
  };

  return (
    <div className="user-card">
      <h3>User Profile</h3>

      {/* Start Direct Chat */}
      <button onClick={handleStartChat}>
        <MessageSquareIcon /> Send Message
      </button>

      {/* Add to Favorites */}
      <button onClick={handleFavoriteToggle}>
        <StarIcon fill={isUserFavorite(userId) ? 'gold' : 'none'} />
        {isUserFavorite(userId) ? 'Remove from Favorites' : 'Add to Favorites'}
      </button>

      {/* Block/Unblock User */}
      <button onClick={handleBlockToggle} className="text-red-500">
        <BanIcon />
        {isUserBlocked(userId) ? 'Unblock User' : 'Block User'}
      </button>

      {/* Show user's contact preferences */}
      {contactPermissions && (
        <div className="mt-4 text-sm text-muted">
          <p>Contact Preferences:</p>
          <ul>
            <li>Direct Messages: {contactPermissions.allow_direct_messages ? 'Allowed' : 'Blocked'}</li>
            <li>Group Invites: {contactPermissions.allow_group_invitations ? 'Allowed' : 'Blocked'}</li>
            <li>Channel Mentions: {contactPermissions.allow_channel_mentions ? 'Allowed' : 'Blocked'}</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Permission Updates (Invalidate Cache After Role Changes)
// ============================================================================

/**
 * UserRoleManager - Updates user role and invalidates permissions cache
 */
export function UserRoleManagerExample({ userId, conversationId }: any) {
  const invalidatePermissions = useInvalidateChatPermissions();

  const updateUserRole = async (newLevel: 'read' | 'write' | 'moderate' | 'admin') => {
    try {
      // Update user's permission level in chat_participants
      await supabase
        .from('chat_participants')
        .update({ permission_level: newLevel })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      // Invalidate permissions cache for this conversation
      invalidatePermissions(conversationId);

      alert('User role updated successfully');
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  return (
    <div className="role-manager">
      <h3>Manage User Role</h3>

      <button onClick={() => updateUserRole('read')}>
        Set as Read-Only
      </button>

      <button onClick={() => updateUserRole('write')}>
        Set as Writer
      </button>

      <button onClick={() => updateUserRole('moderate')}>
        Set as Moderator
      </button>

      <button onClick={() => updateUserRole('admin')}>
        Set as Admin
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Conditional Rendering Based on Multiple Permissions
// ============================================================================

/**
 * ConversationHeader - Shows different UI based on combined permissions
 */
export function ConversationHeaderExample({ conversationId }: any) {
  const { permissions, isLoading } = useChatPermissions(conversationId);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="conversation-header">
      <h2>Conversation Name</h2>

      {/* Show moderation tools for moderators/admins */}
      {permissions.canModerate && (
        <div className="moderation-tools">
          <button>
            <ShieldIcon /> Moderation Tools
          </button>
        </div>
      )}

      {/* Show admin panel for admins only */}
      {permissions.isAdmin && (
        <div className="admin-panel">
          <button>
            <SettingsIcon /> Admin Panel
          </button>
        </div>
      )}

      {/* Show warning for read-only users */}
      {permissions.isReadOnly && (
        <div className="alert alert-info">
          You are viewing this conversation in read-only mode
        </div>
      )}

      {/* Show restricted write notice */}
      {permissions.level === 'restricted_write' && (
        <div className="alert alert-warning">
          You can only send text messages in this conversation
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 8: TypeScript Type Guards
// ============================================================================

/**
 * Helper functions for type-safe permission checks
 */
export function permissionHelpers() {
  const { permissions } = useChatPermissions('conv-123');

  // Check if user can perform any write action
  const canWrite = permissions.canSendText ||
                   permissions.canSendVoice ||
                   permissions.canSendFiles;

  // Check if user can moderate
  const canModerate = permissions.canDeleteOthersMessages ||
                      permissions.canRemoveUsers ||
                      permissions.canMuteUsers;

  // Check if user is admin or moderator
  const isStaff = permissions.isAdmin || permissions.isModerator;

  // Get permission level as string
  const levelString: string = permissions.level;

  // Type-safe level checks
  const isExactlyAdmin = permissions.level === 'admin';
  const isAtLeastModerator = ['moderate', 'admin'].includes(permissions.level);
  const hasWriteAccess = ['write', 'moderate', 'admin'].includes(permissions.level);

  return {
    canWrite,
    canModerate,
    isStaff,
    levelString,
    isExactlyAdmin,
    isAtLeastModerator,
    hasWriteAccess
  };
}

// ============================================================================
// ICON PLACEHOLDERS (replace with actual icons)
// ============================================================================

const MicIcon = () => <span>🎤</span>;
const PaperclipIcon = () => <span>📎</span>;
const EditIcon = () => <span>✏️</span>;
const TrashIcon = () => <span>🗑️</span>;
const UserPlusIcon = () => <span>➕</span>;
const UserMinusIcon = () => <span>➖</span>;
const ShieldIcon = () => <span>🛡️</span>;
const SettingsIcon = () => <span>⚙️</span>;
const ArchiveIcon = () => <span>📦</span>;
const MessageSquareIcon = () => <span>💬</span>;
const UsersIcon = () => <span>👥</span>;
const HashIcon = () => <span>#️⃣</span>;
const MegaphoneIcon = () => <span>📢</span>;
const EyeIcon = () => <span>👁️</span>;
const StarIcon = ({ fill }: { fill?: string }) => <span>⭐</span>;
const BanIcon = () => <span>🚫</span>;
