# Migration Guide: Chat Permissions System

## Overview

Este documento describe cómo migrar del sistema de permisos antiguo basado en `dealer_groups` al nuevo sistema granular basado en RPC `get_chat_effective_permissions`.

## Breaking Changes Summary

### 1. Hook Principal: `useChatPermissions`

**ANTES (Antiguo):**
```typescript
const {
  permissions,
  contactPermissions,
  canPerformAction,
  loading,
  error,
  refreshPermissions
} = useChatPermissions(dealerId);

// Permisos globales y por conversación mezclados
if (permissions.canSendMessages) { ... }
if (permissions.canCreateDirectChats) { ... }
```

**AHORA (Nuevo):**
```typescript
// Para permisos por conversación
const {
  permissions,
  isLoading,
  error
} = useChatPermissions(conversationId, dealerId);

// Para permisos globales
const {
  permissions: globalPermissions,
  isLoading,
  error
} = useGlobalChatPermissions(dealerId);

// Para permisos de contactos
const {
  contactPermissions,
  isLoading,
  error,
  blockUser,
  unblockUser,
  // ...
} = useContactPermissions(dealerId);
```

### 2. Interface `ChatPermissions` - Nuevos Campos

**CAMPOS ELIMINADOS:**
```typescript
// ❌ Ya no existen en ChatPermissions
canCreateDirectChats
canCreateGroups
canCreateChannels
canCreateAnnouncements
canModerateConversations
canManageParticipants
canMuteUsers
canKickUsers
canBanUsers
canViewAllConversations
canManageChatSettings
```

**NUEVOS CAMPOS:**
```typescript
// ✅ Nuevos campos granulares
interface ChatPermissions {
  // Access control
  hasAccess: boolean;
  level: 'none' | 'read' | 'restricted_write' | 'write' | 'moderate' | 'admin';

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
  canSendMessages: boolean; // any message type
  isReadOnly: boolean;
}
```

### 3. Return Types Simplificados

**ANTES:**
```typescript
interface UseChatPermissionsReturn {
  permissions: ChatPermissions;
  contactPermissions: UserContactPermissions | null;
  canPerformAction: (action: keyof ChatPermissions) => boolean;
  canContactUser: (targetUserId: string) => Promise<boolean>;
  // ... muchos métodos mezclados
  loading: boolean;
  error: string | null;
  refreshPermissions: () => void;
}
```

**AHORA:**
```typescript
// Separado en 3 hooks especializados
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
  // ... métodos de contactos
}
```

## Migration Steps

### Step 1: Actualizar Imports

**ANTES:**
```typescript
import { useChatPermissions, ChatPermissions } from '@/hooks/useChatPermissions';
```

**AHORA:**
```typescript
import {
  useChatPermissions,
  useGlobalChatPermissions,
  useContactPermissions,
  useInvalidateChatPermissions,
  ChatPermissions,
  GlobalChatPermissions,
  UserContactPermissions,
  ChatPermissionLevel
} from '@/hooks/useChatPermissions';
```

### Step 2: Separar Permisos Globales vs Por Conversación

**ANTES:**
```typescript
const { permissions } = useChatPermissions();

return (
  <>
    {/* Crear conversaciones (global) */}
    {permissions.canCreateDirectChats && <button>New Chat</button>}

    {/* Enviar mensajes (por conversación) */}
    {permissions.canSendMessages && <textarea />}
  </>
);
```

**AHORA:**
```typescript
const { permissions: globalPerms } = useGlobalChatPermissions();
const { permissions: convPerms } = useChatPermissions(conversationId);

return (
  <>
    {/* Crear conversaciones (global) */}
    {globalPerms.canCreateDirectChats && <button>New Chat</button>}

    {/* Enviar mensajes (por conversación) */}
    {convPerms.canSendText && <textarea />}
  </>
);
```

### Step 3: Actualizar Permisos de Mensajes Granulares

**ANTES:**
```typescript
const { permissions } = useChatPermissions();

if (permissions.canSendMessages) {
  // Usuario puede enviar cualquier tipo de mensaje
}
```

**AHORA:**
```typescript
const { permissions } = useChatPermissions(conversationId);

// Permisos granulares por tipo de mensaje
if (permissions.canSendText) {
  // Mostrar input de texto
}

if (permissions.canSendVoice) {
  // Mostrar botón de voz
}

if (permissions.canSendFiles) {
  // Mostrar botón de archivos
}

// Helper para cualquier tipo de mensaje
if (permissions.canSendMessages) {
  // Al menos uno está habilitado
}
```

### Step 4: Actualizar Permisos de Moderación

**ANTES:**
```typescript
const { permissions } = useChatPermissions();

if (permissions.canModerateConversations) {
  // Mostrar herramientas de moderación
}

if (permissions.canManageParticipants) {
  // Mostrar gestión de participantes
}
```

**AHORA:**
```typescript
const { permissions } = useChatPermissions(conversationId);

// Helper derivado
if (permissions.canModerate) {
  // Usuario es moderador o admin
}

// O usar level directamente
if (permissions.level === 'moderate' || permissions.level === 'admin') {
  // Mostrar herramientas de moderación
}

// Permisos específicos
if (permissions.canInviteUsers) { ... }
if (permissions.canRemoveUsers) { ... }
if (permissions.canChangePermissions) { ... }
```

### Step 5: Actualizar Métodos de Contactos

**ANTES:**
```typescript
const {
  blockUser,
  unblockUser,
  isUserBlocked,
  canContactUser
} = useChatPermissions();
```

**AHORA:**
```typescript
const {
  blockUser,
  unblockUser,
  isUserBlocked,
  canContactUser
} = useContactPermissions();
```

### Step 6: Actualizar Invalidación de Cache

**ANTES:**
```typescript
const { refreshPermissions } = useChatPermissions();

// Después de cambiar permisos
await updateRole(userId, newRole);
refreshPermissions();
```

**AHORA:**
```typescript
import { useInvalidateChatPermissions } from '@/hooks/useChatPermissions';

const invalidatePermissions = useInvalidateChatPermissions();

// Después de cambiar permisos
await updateRole(userId, newRole);
invalidatePermissions(conversationId); // Específico
// o
invalidatePermissions(); // Global
```

## Common Patterns

### Pattern 1: Message Input Component

**ANTES:**
```typescript
function MessageInput() {
  const { permissions } = useChatPermissions();

  if (!permissions.canSendMessages) return null;

  return <textarea />;
}
```

**AHORA:**
```typescript
function MessageInput({ conversationId }: { conversationId: string }) {
  const { permissions, isLoading } = useChatPermissions(conversationId);

  if (isLoading) return <Skeleton />;
  if (!permissions.hasAccess) return <NoAccess />;
  if (permissions.isReadOnly) return <ReadOnlyBadge />;

  return (
    <div>
      {permissions.canSendText && <textarea />}
      {permissions.canSendVoice && <VoiceButton />}
      {permissions.canSendFiles && <FileUploadButton />}

      {!permissions.canSendMessages && (
        <div>You cannot send messages in this conversation</div>
      )}
    </div>
  );
}
```

### Pattern 2: Admin Actions

**ANTES:**
```typescript
function AdminPanel() {
  const { permissions } = useChatPermissions();

  if (!permissions.isAdmin) return null;

  return <div>Admin Panel</div>;
}
```

**AHORA:**
```typescript
function AdminPanel({ conversationId }: { conversationId: string }) {
  const { permissions } = useChatPermissions(conversationId);

  // Usar el helper derivado
  if (!permissions.isAdmin) return null;

  // O verificar el nivel directamente
  // if (permissions.level !== 'admin') return null;

  return (
    <div>
      {permissions.canUpdateSettings && <SettingsButton />}
      {permissions.canDeleteConversation && <DeleteButton />}
      {permissions.canChangePermissions && <PermissionsManager />}
    </div>
  );
}
```

### Pattern 3: Sidebar with Global Permissions

**ANTES:**
```typescript
function ChatSidebar() {
  const { permissions } = useChatPermissions();

  return (
    <div>
      {permissions.canCreateDirectChats && <button>New Chat</button>}
      {permissions.canCreateGroups && <button>New Group</button>}
    </div>
  );
}
```

**AHORA:**
```typescript
function ChatSidebar() {
  const { permissions } = useGlobalChatPermissions();

  return (
    <div>
      {permissions.canCreateDirectChats && <button>New Chat</button>}
      {permissions.canCreateGroups && <button>New Group</button>}
      {permissions.canCreateChannels && <button>New Channel</button>}
      {permissions.canCreateAnnouncements && <button>New Announcement</button>}
    </div>
  );
}
```

## Compatibility Layer (Temporal)

Si necesitas mantener compatibilidad temporal con el código antiguo:

```typescript
/**
 * DEPRECATED: Use useChatPermissions + useGlobalChatPermissions instead
 * This is a compatibility wrapper for gradual migration
 */
export function useChatPermissionsLegacy(dealerId?: number) {
  const { permissions: globalPermissions } = useGlobalChatPermissions(dealerId);
  const { contactPermissions, ...contactMethods } = useContactPermissions(dealerId);

  return {
    permissions: {
      // Map global permissions to old structure
      canCreateDirectChats: globalPermissions.canCreateDirectChats,
      canCreateGroups: globalPermissions.canCreateGroups,
      canCreateChannels: globalPermissions.canCreateChannels,
      canCreateAnnouncements: globalPermissions.canCreateAnnouncements,

      // These need conversationId - return false for now
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

      canViewAllConversations: globalPermissions.canViewAllConversations,
      canManageChatSettings: globalPermissions.canManageChatSettings,
      isAdmin: false // Cannot determine without conversationId
    },
    contactPermissions,
    ...contactMethods,
    loading: false,
    error: null,
    refreshPermissions: () => {},
    canPerformAction: (action: string) => false
  };
}
```

## Testing Migration

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react';
import { useChatPermissions } from './useChatPermissions';

describe('useChatPermissions', () => {
  it('should return no access for invalid conversation', () => {
    const { result } = renderHook(() => useChatPermissions('invalid-id'));

    expect(result.current.permissions.hasAccess).toBe(false);
    expect(result.current.permissions.level).toBe('none');
    expect(result.current.permissions.isReadOnly).toBe(true);
  });

  it('should return granular permissions for valid conversation', async () => {
    const { result } = renderHook(() => useChatPermissions('valid-conv-id'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.permissions.hasAccess).toBe(true);
    expect(result.current.permissions.canSendText).toBe(true);
    expect(result.current.permissions.level).toBe('write');
  });
});
```

## Rollback Plan

Si necesitas revertir la migración:

1. Hacer backup del archivo antiguo:
   ```bash
   cp src/hooks/useChatPermissions.tsx src/hooks/useChatPermissions.backup.tsx
   ```

2. Restaurar desde backup si hay problemas:
   ```bash
   cp src/hooks/useChatPermissions.backup.tsx src/hooks/useChatPermissions.tsx
   ```

3. Los cambios en la base de datos (RPC functions) son compatibles hacia atrás y no afectan el código antiguo.

## Support

Para preguntas sobre la migración:
- Revisar ejemplos en `useChatPermissions.examples.tsx`
- Consultar documentación en `CHAT_PERMISSIONS_ARCHITECTURE.md`
- Contactar al equipo de backend para dudas sobre RPC functions

## Checklist de Migración

- [ ] Actualizar imports en todos los componentes
- [ ] Separar permisos globales vs por conversación
- [ ] Actualizar permisos de mensajes a granulares (text/voice/files)
- [ ] Migrar métodos de contactos a `useContactPermissions`
- [ ] Actualizar invalidación de cache a `useInvalidateChatPermissions`
- [ ] Actualizar tests unitarios
- [ ] Revisar que todos los componentes reciban `conversationId` cuando sea necesario
- [ ] Probar todos los flujos de permisos en desarrollo
- [ ] Validar con QA antes de deploy a producción
