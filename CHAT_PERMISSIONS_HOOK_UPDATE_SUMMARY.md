# Chat Permissions Hook - Update Summary

## Executive Summary

Se ha actualizado el hook `useChatPermissions.tsx` para integrar el nuevo sistema de permisos granulares basado en capabilities con la función RPC `get_chat_effective_permissions`.

**Estado:** ✅ Completado y listo para integración

**Ubicación:** `C:\Users\rudyr\apps\mydetailarea\src\hooks\useChatPermissions.tsx`

---

## Changes Overview

### 1. Architecture Transformation

**De:** Sistema monolítico basado en `dealer_groups` permissions
**A:** Sistema híbrido con 3 hooks especializados + RPC integration

### 2. New Hook Structure

```typescript
// HOOK 1: Conversation-Specific Permissions (RPC-based)
useChatPermissions(conversationId?, dealerId?)
  → ChatPermissions (granular capabilities)

// HOOK 2: Global Chat Permissions (dealer_groups-based)
useGlobalChatPermissions(dealerId?)
  → GlobalChatPermissions (create conversations, view all, settings)

// HOOK 3: Contact Permissions (backward compatible)
useContactPermissions(dealerId?)
  → UserContactPermissions (block, favorite, contact checks)

// HOOK 4: Cache Invalidation Utility
useInvalidateChatPermissions()
  → invalidate(conversationId?) function
```

### 3. Key Improvements

#### ✅ Granular Message Permissions
```typescript
// Antes: canSendMessages (boolean)
// Ahora: 3 permisos separados
permissions.canSendText      // Texto
permissions.canSendVoice     // Mensajes de voz
permissions.canSendFiles     // Archivos adjuntos
```

#### ✅ Permission Levels (ENUM)
```typescript
type ChatPermissionLevel =
  | 'none'              // Sin acceso
  | 'read'              // Solo lectura
  | 'restricted_write'  // Solo texto (no voice/files)
  | 'write'             // Acceso completo a mensajería
  | 'moderate'          // Moderación + gestión participantes
  | 'admin'             // Control administrativo total
```

#### ✅ RPC-Based Effective Permissions
```typescript
// Llama directamente a la función RPC
const { data } = await supabase.rpc('get_chat_effective_permissions', {
  p_user_id: user.id,
  p_conversation_id: conversationId,
  p_dealer_id: dealerId
});

// Prioridad de merge (RPC lo maneja):
// 1. chat_participants.capabilities (custom overrides)
// 2. dealer_role_chat_templates.default_capabilities (role template)
// 3. Permission level defaults (basado en ENUM)
```

#### ✅ TanStack Query v5 Integration
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['chat-permissions', conversationId, user?.id, effectiveDealerId],
  queryFn: async () => { /* RPC call */ },
  enabled: !!conversationId && !!user?.id && !!effectiveDealerId,
  staleTime: 5 * 60 * 1000,    // 5 minutos
  gcTime: 10 * 60 * 1000,      // 10 minutos
  retry: 1,
  refetchOnWindowFocus: false
});
```

#### ✅ Separation of Concerns
- **Conversation permissions** → Por conversación (RPC)
- **Global permissions** → Por dealership (dealer_groups)
- **Contact permissions** → Por usuario (user_contact_permissions)

---

## Type Definitions

### ChatPermissions (Conversation-Specific)
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

  // Derived permissions (computed)
  isAdmin: boolean;
  isModerator: boolean;
  canModerate: boolean;
  canSendMessages: boolean;  // any type
  isReadOnly: boolean;
}
```

### GlobalChatPermissions (Dealership-Wide)
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

### UserContactPermissions (Contact Management)
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

## Usage Examples

### Example 1: Message Input (Conversation-Specific)
```typescript
import { useChatPermissions } from '@/hooks/useChatPermissions';

function MessageInput({ conversationId }: { conversationId: string }) {
  const { permissions, isLoading } = useChatPermissions(conversationId);

  if (isLoading) return <Skeleton />;
  if (!permissions.hasAccess) return <NoAccess />;
  if (permissions.isReadOnly) return <ReadOnlyBadge />;

  return (
    <div>
      {permissions.canSendText && <TextInput />}
      {permissions.canSendVoice && <VoiceRecorder />}
      {permissions.canSendFiles && <FileUpload />}
    </div>
  );
}
```

### Example 2: Chat Sidebar (Global Permissions)
```typescript
import { useGlobalChatPermissions } from '@/hooks/useChatPermissions';

function ChatSidebar() {
  const { permissions } = useGlobalChatPermissions();

  return (
    <div>
      {permissions.canCreateDirectChats && (
        <button>New Direct Chat</button>
      )}
      {permissions.canCreateGroups && (
        <button>New Group</button>
      )}
      {permissions.canCreateChannels && (
        <button>New Channel</button>
      )}
    </div>
  );
}
```

### Example 3: Contact Management
```typescript
import { useContactPermissions } from '@/hooks/useChatPermissions';

function UserCard({ userId }: { userId: string }) {
  const {
    blockUser,
    unblockUser,
    isUserBlocked,
    canContactUser
  } = useContactPermissions();

  const handleStartChat = async () => {
    if (await canContactUser(userId)) {
      // Start chat...
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
    </div>
  );
}
```

### Example 4: Cache Invalidation
```typescript
import { useInvalidateChatPermissions } from '@/hooks/useChatPermissions';

function PermissionManager({ conversationId, userId }: any) {
  const invalidate = useInvalidateChatPermissions();

  const updateUserRole = async (newLevel: ChatPermissionLevel) => {
    await supabase
      .from('chat_participants')
      .update({ permission_level: newLevel })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    // Invalidate cache for this conversation
    invalidate(conversationId);
  };

  return (
    <div>
      <button onClick={() => updateUserRole('read')}>Set Read-Only</button>
      <button onClick={() => updateUserRole('write')}>Set Writer</button>
      <button onClick={() => updateUserRole('moderate')}>Set Moderator</button>
      <button onClick={() => updateUserRole('admin')}>Set Admin</button>
    </div>
  );
}
```

---

## Performance Characteristics

### Caching Strategy
```typescript
// Conversation permissions - 5-10 min cache
staleTime: 5 * 60 * 1000    // Permissions don't change frequently
gcTime: 10 * 60 * 1000

// Global permissions - 10-20 min cache
staleTime: 10 * 60 * 1000   // Global permissions change rarely
gcTime: 20 * 60 * 1000

// Contact permissions - 5-10 min cache
staleTime: 5 * 60 * 1000
gcTime: 10 * 60 * 1000
```

### Query Keys
```typescript
// Conversation-specific
['chat-permissions', conversationId, userId, dealerId]

// Global
['global-chat-permissions', userId, dealerId]

// Contacts
['contact-permissions', userId, dealerId]
```

### Optimizations
- ✅ No refetch on window focus
- ✅ Retry once on failure
- ✅ Automatic garbage collection after gcTime
- ✅ Shared cache across components (TanStack Query)
- ✅ Automatic deduplication of concurrent requests

---

## Breaking Changes

### REMOVED from ChatPermissions
```typescript
// ❌ Moved to GlobalChatPermissions
canCreateDirectChats
canCreateGroups
canCreateChannels
canCreateAnnouncements

// ❌ Replaced with granular permissions
canSendMessages → canSendText + canSendVoice + canSendFiles

// ❌ Replaced with level-based checks
canModerateConversations → canModerate (derived)
canManageParticipants → canInviteUsers + canRemoveUsers

// ❌ Removed (no longer needed)
canMuteUsers
canKickUsers
canBanUsers
```

### ADDED to ChatPermissions
```typescript
// ✅ New granular fields
canSendText: boolean
canSendVoice: boolean
canSendFiles: boolean
canEditOwnMessages: boolean
canDeleteOwnMessages: boolean
canDeleteOthersMessages: boolean

canInviteUsers: boolean
canRemoveUsers: boolean
canChangePermissions: boolean

canUpdateSettings: boolean
canArchiveConversation: boolean
canDeleteConversation: boolean

// ✅ New derived helpers
level: ChatPermissionLevel
hasAccess: boolean
isAdmin: boolean
isModerator: boolean
canModerate: boolean
canSendMessages: boolean  // any type
isReadOnly: boolean
```

### Return Type Changes
```typescript
// BEFORE
interface UseChatPermissionsReturn {
  permissions: ChatPermissions;
  contactPermissions: UserContactPermissions | null;
  canPerformAction: (action: keyof ChatPermissions) => boolean;
  loading: boolean;
  error: string | null;
  refreshPermissions: () => void;
  // + many contact methods
}

// AFTER - Split into 3 specialized hooks
interface UseChatPermissionsReturn {
  permissions: ChatPermissions;
  isLoading: boolean;
  error: Error | null;
}

interface UseGlobalChatPermissionsReturn {
  permissions: GlobalChatPermissions;
  isLoading: boolean;
  error: Error | null;
}

interface UseContactPermissionsReturn {
  contactPermissions: UserContactPermissions | null;
  isLoading: boolean;
  error: Error | null;
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

---

## Backward Compatibility

### ✅ Maintained
- `UserContactPermissions` interface unchanged
- All contact management methods preserved
- `useContactPermissions()` has same API as before
- Blocking/favorite functionality unchanged
- Contact permission checks unchanged

### ❌ Breaking Changes
- Hook must receive `conversationId` for conversation-specific permissions
- Global permissions moved to separate hook
- `canPerformAction` utility removed (use direct property checks)
- `refreshPermissions` removed (use `useInvalidateChatPermissions`)
- `loading` renamed to `isLoading` (TanStack Query convention)
- `error` type changed from `string | null` to `Error | null`

---

## Migration Checklist

- [x] Update hook implementation with RPC integration
- [x] Create type definitions for all interfaces
- [x] Implement `useChatPermissions` with RPC call
- [x] Implement `useGlobalChatPermissions` with dealer_groups
- [x] Implement `useContactPermissions` with backward compatibility
- [x] Implement `useInvalidateChatPermissions` utility
- [x] Add transformation helpers (snake_case → camelCase)
- [x] Add default permissions helper
- [x] Create usage examples file
- [x] Create migration guide
- [x] Document breaking changes
- [ ] Update existing components to use new hooks
- [ ] Add unit tests for all hooks
- [ ] Add integration tests with mocked RPC
- [ ] Test cache invalidation scenarios
- [ ] Performance testing with large permission sets
- [ ] QA validation in development environment
- [ ] Production deployment

---

## Dependencies

### Required RPC Function
```sql
-- Must exist in Supabase
FUNCTION get_chat_effective_permissions(
  p_user_id UUID,
  p_conversation_id UUID,
  p_dealer_id BIGINT
) RETURNS JSONB
```

### Required Tables/Columns
```sql
-- chat_participants.capabilities (JSONB)
-- dealer_role_chat_templates (entire table)
-- user_contact_permissions (existing, unchanged)
```

### Required Migrations
```sql
20251024230000_add_chat_permission_levels_none_restricted_write.sql
20251024230100_create_dealer_role_chat_templates_table.sql
20251024230200_add_capabilities_to_chat_participants.sql
20251024230300_seed_default_chat_role_templates.sql
20251024230400_create_get_chat_effective_permissions_function.sql
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('useChatPermissions', () => {
  it('returns no access for invalid conversation')
  it('returns granular permissions for valid conversation')
  it('handles RPC errors gracefully')
  it('caches permissions correctly')
  it('invalidates cache on demand')
});

describe('useGlobalChatPermissions', () => {
  it('returns global permissions for dealer')
  it('grants all permissions to admins')
  it('parses dealer_groups permissions correctly')
});

describe('useContactPermissions', () => {
  it('creates default permissions if not exists')
  it('blocks/unblocks users correctly')
  it('manages favorites correctly')
  it('checks contact permissions accurately')
});
```

### Integration Tests
```typescript
describe('Chat Permissions Integration', () => {
  it('conversation permissions update when role changes')
  it('cache invalidation triggers refetch')
  it('global and conversation permissions work together')
  it('contact permissions affect conversation access')
});
```

---

## Documentation Files

1. **Implementation:** `src/hooks/useChatPermissions.tsx` (764 lines)
2. **Examples:** `src/hooks/useChatPermissions.examples.tsx` (450+ lines)
3. **Migration Guide:** `MIGRATION_GUIDE_CHAT_PERMISSIONS.md`
4. **This Summary:** `CHAT_PERMISSIONS_HOOK_UPDATE_SUMMARY.md`
5. **Architecture Docs:** `CHAT_PERMISSIONS_ARCHITECTURE.md` (existing)

---

## Next Steps

1. **Component Integration**
   - [ ] Identify all components using old `useChatPermissions`
   - [ ] Update imports to use new specialized hooks
   - [ ] Add `conversationId` prop where needed
   - [ ] Test each component individually

2. **Testing**
   - [ ] Write unit tests for all 4 hooks
   - [ ] Write integration tests for permission scenarios
   - [ ] Test cache invalidation flows
   - [ ] Performance test with large datasets

3. **QA Validation**
   - [ ] Test all permission levels (none, read, restricted_write, write, moderate, admin)
   - [ ] Test permission transitions (role changes)
   - [ ] Test edge cases (no dealer, invalid conversation, etc.)
   - [ ] Test cache behavior

4. **Production Deployment**
   - [ ] Deploy RPC function to production
   - [ ] Run migrations in production
   - [ ] Seed default role templates
   - [ ] Deploy hook updates
   - [ ] Monitor for errors

---

## Support & Troubleshooting

### Common Issues

**Issue:** `RPC function not found`
**Solution:** Ensure `get_chat_effective_permissions` is deployed to Supabase

**Issue:** `Permissions always return no access`
**Solution:** Check that user has active `dealer_membership` and is in `chat_participants`

**Issue:** `Cache not invalidating`
**Solution:** Use `useInvalidateChatPermissions()` hook after permission changes

**Issue:** `Global permissions not working`
**Solution:** Check `dealer_groups.permissions` array includes chat.* permissions

### Debug Mode
```typescript
// Add to RPC call for debugging
const { data, error } = await supabase.rpc('get_chat_effective_permissions', {
  p_user_id: user.id,
  p_conversation_id: conversationId,
  p_dealer_id: dealerId
});

console.log('[DEBUG] RPC Response:', data);
console.log('[DEBUG] Transformed:', transformPermissions(data));
```

---

## Credits

**Author:** Claude Code (React Architect Agent)
**Date:** 2025-10-24
**Project:** MyDetailArea - Enterprise Dealership Management System
**Version:** 1.0.0
**Status:** ✅ Ready for Integration
