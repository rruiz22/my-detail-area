# Chat Permissions Hooks - Documentation

## Overview

Sistema de hooks para gestionar permisos granulares de chat integrado con el sistema de capabilities basado en RPC de Supabase.

## Files

- **`useChatPermissions.tsx`** - Implementación principal (764 líneas)
- **`useChatPermissions.examples.tsx`** - Ejemplos de uso prácticos
- **`README_CHAT_PERMISSIONS.md`** - Este archivo

## Available Hooks

### 1. `useChatPermissions(conversationId?, dealerId?)`

**Propósito:** Obtener permisos específicos para una conversación

**Uso:**
```typescript
const { permissions, isLoading, error } = useChatPermissions(conversationId);

if (permissions.canSendText) {
  // Mostrar input de texto
}

if (permissions.canDeleteOthersMessages) {
  // Mostrar botón de eliminar para todos los mensajes
}
```

**Retorna:**
```typescript
{
  permissions: ChatPermissions;
  isLoading: boolean;
  error: Error | null;
}
```

**Características:**
- ✅ Basado en RPC `get_chat_effective_permissions`
- ✅ Cache de 5 minutos (staleTime)
- ✅ Permisos granulares por tipo de mensaje (text/voice/files)
- ✅ Niveles de permiso: none, read, restricted_write, write, moderate, admin
- ✅ Helpers derivados: isAdmin, isModerator, canModerate, isReadOnly

---

### 2. `useGlobalChatPermissions(dealerId?)`

**Propósito:** Obtener permisos globales de chat (no específicos de conversación)

**Uso:**
```typescript
const { permissions } = useGlobalChatPermissions();

if (permissions.canCreateDirectChats) {
  // Mostrar botón "New Chat"
}

if (permissions.canCreateChannels) {
  // Mostrar botón "New Channel"
}
```

**Retorna:**
```typescript
{
  permissions: GlobalChatPermissions;
  isLoading: boolean;
  error: Error | null;
}
```

**Características:**
- ✅ Basado en `dealer_groups.permissions`
- ✅ Cache de 10 minutos (staleTime)
- ✅ Auto-grant all para admins
- ✅ Soporta wildcard permission `chat.*`

---

### 3. `useContactPermissions(dealerId?)`

**Propósito:** Gestionar permisos de contactos (bloqueos, favoritos)

**Uso:**
```typescript
const {
  contactPermissions,
  blockUser,
  unblockUser,
  isUserBlocked,
  canContactUser
} = useContactPermissions();

if (isUserBlocked(userId)) {
  // Mostrar botón "Unblock"
}

await blockUser(userId);
await canContactUser(userId); // Check si puede contactar
```

**Retorna:**
```typescript
{
  contactPermissions: UserContactPermissions | null;
  isLoading: boolean;
  error: Error | null;

  // Methods
  blockUser: (userId: string) => Promise<boolean>;
  unblockUser: (userId: string) => Promise<boolean>;
  addToFavorites: (userId: string) => Promise<boolean>;
  removeFromFavorites: (userId: string) => Promise<boolean>;
  isUserBlocked: (userId: string) => boolean;
  isUserFavorite: (userId: string) => boolean;
  updateContactPermissions: (updates: Partial<UserContactPermissions>) => Promise<boolean>;
  canContactUser: (targetUserId: string) => Promise<boolean>;
  canInviteToGroup: (targetUserId: string) => Promise<boolean>;
  canMentionInChannel: (targetUserId: string) => Promise<boolean>;
}
```

**Características:**
- ✅ Auto-create default permissions si no existen
- ✅ Gestión de blocked_users y favorite_contacts
- ✅ Validación cruzada de permisos de contacto
- ✅ Cache automático con invalidación

---

### 4. `useInvalidateChatPermissions()`

**Propósito:** Invalidar cache de permisos después de cambios

**Uso:**
```typescript
const invalidate = useInvalidateChatPermissions();

// Después de cambiar rol de usuario
await updateUserRole(userId, 'admin');
invalidate(conversationId); // Invalidar conversación específica

// O invalidar todos los permisos
invalidate(); // Global invalidation
```

**Características:**
- ✅ Invalidación selectiva por conversationId
- ✅ Invalidación global de todos los permisos
- ✅ Trigger automático de refetch

---

## Type Definitions

### ChatPermissionLevel
```typescript
type ChatPermissionLevel =
  | 'none'              // Sin acceso
  | 'read'              // Solo lectura
  | 'restricted_write'  // Solo texto (no voice/files)
  | 'write'             // Acceso completo a mensajería
  | 'moderate'          // Moderación + participantes
  | 'admin';            // Control administrativo total
```

### ChatPermissions
```typescript
interface ChatPermissions {
  // Access control
  hasAccess: boolean;
  level: ChatPermissionLevel;

  // Message capabilities (granular)
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

  // Derived permissions (helpers)
  isAdmin: boolean;
  isModerator: boolean;
  canModerate: boolean;
  canSendMessages: boolean; // any type
  isReadOnly: boolean;
}
```

### GlobalChatPermissions
```typescript
interface GlobalChatPermissions {
  canCreateDirectChats: boolean;
  canCreateGroups: boolean;
  canCreateChannels: boolean;
  canCreateAnnouncements: boolean;
  canViewAllConversations: boolean;
  canManageChatSettings: boolean;
}
```

### UserContactPermissions
```typescript
interface UserContactPermissions {
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
```

---

## Quick Start

### Installation

```bash
# Ya está incluido en el proyecto
# Solo importar y usar
```

### Basic Usage

```typescript
import {
  useChatPermissions,
  useGlobalChatPermissions,
  useContactPermissions,
  useInvalidateChatPermissions
} from '@/hooks/useChatPermissions';

function MyComponent({ conversationId }: { conversationId: string }) {
  // Permisos de conversación
  const { permissions, isLoading } = useChatPermissions(conversationId);

  // Permisos globales
  const { permissions: globalPerms } = useGlobalChatPermissions();

  // Permisos de contactos
  const { blockUser, isUserBlocked } = useContactPermissions();

  // Invalidación
  const invalidate = useInvalidateChatPermissions();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* Message input */}
      {permissions.canSendText && <textarea />}

      {/* Voice recorder */}
      {permissions.canSendVoice && <button>Record Voice</button>}

      {/* File upload */}
      {permissions.canSendFiles && <button>Attach File</button>}

      {/* Admin actions */}
      {permissions.isAdmin && <button>Settings</button>}

      {/* Global actions */}
      {globalPerms.canCreateGroups && <button>New Group</button>}
    </div>
  );
}
```

---

## Common Patterns

### Pattern 1: Conditional UI Based on Permissions

```typescript
function MessageInput({ conversationId }: { conversationId: string }) {
  const { permissions } = useChatPermissions(conversationId);

  return (
    <div>
      {permissions.canSendText && (
        <textarea placeholder="Type a message..." />
      )}

      {permissions.canSendVoice && (
        <VoiceRecorderButton />
      )}

      {permissions.canSendFiles && (
        <FileUploadButton />
      )}

      {permissions.isReadOnly && (
        <div className="alert">This is a read-only conversation</div>
      )}
    </div>
  );
}
```

### Pattern 2: Permission-Based Buttons

```typescript
function MessageActions({ message, conversationId }: any) {
  const { permissions } = useChatPermissions(conversationId);
  const isOwnMessage = message.sender_id === currentUserId;

  return (
    <div>
      {isOwnMessage && permissions.canEditOwnMessages && (
        <button>Edit</button>
      )}

      {isOwnMessage && permissions.canDeleteOwnMessages && (
        <button>Delete</button>
      )}

      {!isOwnMessage && permissions.canDeleteOthersMessages && (
        <button className="text-red-500">Delete (Moderator)</button>
      )}
    </div>
  );
}
```

### Pattern 3: Role-Based Panels

```typescript
function ConversationSettings({ conversationId }: any) {
  const { permissions } = useChatPermissions(conversationId);

  if (!permissions.hasAccess) return null;

  return (
    <div>
      {permissions.canInviteUsers && (
        <section>
          <h3>Invite Users</h3>
          <button>Add Participant</button>
        </section>
      )}

      {permissions.isModerator && (
        <section>
          <h3>Moderation Tools</h3>
          <button>Manage Participants</button>
        </section>
      )}

      {permissions.isAdmin && (
        <section>
          <h3>Admin Panel</h3>
          <button>Delete Conversation</button>
        </section>
      )}
    </div>
  );
}
```

### Pattern 4: Global Permissions in Sidebar

```typescript
function ChatSidebar() {
  const { permissions } = useGlobalChatPermissions();

  return (
    <div>
      <h2>Messages</h2>

      {permissions.canCreateDirectChats && (
        <button>New Direct Chat</button>
      )}

      {permissions.canCreateGroups && (
        <button>New Group</button>
      )}

      {permissions.canCreateChannels && (
        <button>New Channel</button>
      )}

      {permissions.canManageChatSettings && (
        <button>Chat Settings</button>
      )}
    </div>
  );
}
```

### Pattern 5: Contact Management

```typescript
function UserCard({ userId }: { userId: string }) {
  const {
    blockUser,
    unblockUser,
    isUserBlocked,
    addToFavorites,
    isUserFavorite,
    canContactUser
  } = useContactPermissions();

  const handleStartChat = async () => {
    if (await canContactUser(userId)) {
      // Start chat
    } else {
      alert('Cannot contact this user');
    }
  };

  return (
    <div>
      <button onClick={handleStartChat}>Message</button>

      <button onClick={() =>
        isUserBlocked(userId) ? unblockUser(userId) : blockUser(userId)
      }>
        {isUserBlocked(userId) ? 'Unblock' : 'Block'}
      </button>

      <button onClick={() =>
        isUserFavorite(userId) ? removeFromFavorites(userId) : addToFavorites(userId)
      }>
        {isUserFavorite(userId) ? '★' : '☆'} Favorite
      </button>
    </div>
  );
}
```

### Pattern 6: Permission Updates with Cache Invalidation

```typescript
function RoleManager({ conversationId, userId }: any) {
  const invalidate = useInvalidateChatPermissions();

  const updateRole = async (level: ChatPermissionLevel) => {
    await supabase
      .from('chat_participants')
      .update({ permission_level: level })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    // Invalidate cache for this conversation
    invalidate(conversationId);
  };

  return (
    <div>
      <button onClick={() => updateRole('read')}>Read Only</button>
      <button onClick={() => updateRole('write')}>Writer</button>
      <button onClick={() => updateRole('moderate')}>Moderator</button>
      <button onClick={() => updateRole('admin')}>Admin</button>
    </div>
  );
}
```

---

## Performance Considerations

### Caching
- **Conversation permissions:** 5 min stale, 10 min gc
- **Global permissions:** 10 min stale, 20 min gc
- **Contact permissions:** 5 min stale, 10 min gc

### Best Practices
- ✅ Use `conversationId` prop for conversation-specific permissions
- ✅ Use `useGlobalChatPermissions` for sidebar/navigation
- ✅ Use `useContactPermissions` for user interactions
- ✅ Call `invalidate()` after permission changes
- ✅ Let TanStack Query handle caching and deduplication
- ❌ Don't fetch permissions on every render
- ❌ Don't bypass the cache with manual refetch

---

## Troubleshooting

### Issue: Permissions always return no access
**Solution:** Check that user has active `dealer_membership` and is in `chat_participants`

### Issue: RPC function not found
**Solution:** Deploy `get_chat_effective_permissions` to Supabase

### Issue: Cache not invalidating
**Solution:** Use `useInvalidateChatPermissions()` hook

### Issue: Global permissions not working
**Solution:** Check `dealer_groups.permissions` includes chat permissions

---

## Related Documentation

- **Migration Guide:** `../../MIGRATION_GUIDE_CHAT_PERMISSIONS.md`
- **Architecture Docs:** `../../CHAT_PERMISSIONS_ARCHITECTURE.md`
- **Update Summary:** `../../CHAT_PERMISSIONS_HOOK_UPDATE_SUMMARY.md`
- **Usage Examples:** `./useChatPermissions.examples.tsx`

---

## Support

Para preguntas o issues:
1. Revisar ejemplos en `useChatPermissions.examples.tsx`
2. Consultar migration guide
3. Revisar logs de console para debugging
4. Contactar al equipo de backend para RPC issues

---

**Version:** 1.0.0
**Last Updated:** 2025-10-24
**Author:** Claude Code (React Architect)
**Status:** ✅ Production Ready
