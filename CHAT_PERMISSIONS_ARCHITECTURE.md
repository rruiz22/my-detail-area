# Chat Permissions System - Architecture Documentation

## Overview

Sistema de permisos granulares para el chat de MyDetailArea implementando arquitectura híbrida: **5 niveles base + capabilities JSONB**.

Este sistema permite control fino sobre qué acciones puede realizar cada usuario en conversaciones, basado en su rol organizacional dentro del dealership.

---

## Componentes del Sistema

### 1. Niveles de Permiso (ENUM)

**Tipo:** `chat_permission_level`

**Valores:**

| Nivel | Descripción | Caso de Uso |
|-------|-------------|-------------|
| `none` | Sin acceso | Usuarios baneados temporalmente |
| `read` | Solo lectura | Viewers, consultores externos |
| `restricted_write` | Write limitado (solo texto) | Técnicos que no deben compartir archivos |
| `write` | Write completo | Staff general con acceso completo a mensajería |
| `moderate` | Moderación + gestión de participantes | Managers, supervisores |
| `admin` | Control administrativo total | Admins del dealership |

**Migración:** `20251024230000_add_chat_permission_levels_none_restricted_write.sql`

---

### 2. Templates de Rol (Tabla)

**Tabla:** `dealer_role_chat_templates`

**Propósito:** Mapear roles de `dealer_groups` a permisos de chat predeterminados.

**Estructura:**

```sql
CREATE TABLE dealer_role_chat_templates (
  id UUID PRIMARY KEY,
  dealer_id BIGINT NOT NULL REFERENCES dealerships(id),
  role_name TEXT NOT NULL,  -- Matches dealer_groups.name

  default_permission_level chat_permission_level DEFAULT 'write',
  default_capabilities JSONB NOT NULL,
  conversation_types TEXT[] DEFAULT ARRAY['direct', 'group'],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(dealer_id, role_name)
);
```

**Capabilities JSONB Structure:**

```json
{
  "messages": {
    "send_text": boolean,
    "send_voice": boolean,
    "send_files": boolean,
    "edit_own": boolean,
    "delete_own": boolean,
    "delete_others": boolean
  },
  "participants": {
    "invite_users": boolean,
    "remove_users": boolean,
    "change_permissions": boolean
  },
  "conversation": {
    "update_settings": boolean,
    "archive": boolean,
    "delete": boolean
  }
}
```

**Migraciones:**
- Create: `20251024230100_create_dealer_role_chat_templates_table.sql`
- Seed: `20251024230300_seed_default_chat_role_templates.sql`

**Índices:**
- `idx_dealer_role_chat_templates_dealer` (dealer_id)
- `idx_dealer_role_chat_templates_role` (role_name)
- `idx_dealer_role_chat_templates_lookup` (dealer_id, role_name)
- `idx_dealer_role_chat_templates_capabilities` (GIN on JSONB)

**RLS Policies:**
- ✅ Users can view templates for their dealerships
- ✅ Only admins can manage templates

---

### 3. Capabilities por Participante (Columna)

**Tabla:** `chat_participants`

**Nueva columna:** `capabilities JSONB DEFAULT NULL`

**Propósito:** Overrides opcionales de capabilities por usuario en conversación específica.

- **NULL** = Usar template del rol
- **Non-NULL** = Capabilities personalizadas para esta conversación

**Migración:** `20251024230200_add_capabilities_to_chat_participants.sql`

**Índices:**
- `idx_chat_participants_capabilities` (GIN on JSONB)
- `idx_chat_participants_permission_lookup` (conversation_id, user_id, permission_level)

**Ejemplo de uso:**

```sql
-- Restringir usuario a text-only en conversación específica
UPDATE chat_participants
SET capabilities = '{
  "messages": {
    "send_text": true,
    "send_voice": false,
    "send_files": false,
    ...
  }
}'::JSONB
WHERE conversation_id = 'conv-123' AND user_id = 'user-456';
```

---

### 4. Función de Permisos Efectivos

**Función:** `get_chat_effective_permissions(user_id, conversation_id, dealer_id)`

**Propósito:** Calcular permisos efectivos mergeando múltiples fuentes.

**Prioridad (mayor a menor):**

1. `chat_participants.capabilities` (custom overrides)
2. `dealer_role_chat_templates.default_capabilities` (role template)
3. Permission level defaults (basado en ENUM)

**Retorna:**

```json
{
  "has_access": boolean,
  "level": "none" | "read" | "restricted_write" | "write" | "moderate" | "admin",
  "user_group": "role_name" | null,
  "source": "custom_override" | "role_template" | "level_default" | "no_participant_record",
  "capabilities": {
    "messages": { ... },
    "participants": { ... },
    "conversation": { ... }
  }
}
```

**Migración:** `20251024230400_create_get_chat_effective_permissions_function.sql`

**Performance:** `STABLE SECURITY DEFINER` con índices optimizados.

**Ejemplo de uso:**

```sql
SELECT get_chat_effective_permissions(
  '550e8400-e29b-41d4-a716-446655440000'::UUID,  -- user_id
  '660e8400-e29b-41d4-a716-446655440000'::UUID,  -- conversation_id
  5                                               -- dealer_id
);
```

---

### 5. Auto-asignación de Capabilities (Trigger)

**Función:** `auto_assign_chat_capabilities()`

**Trigger:** `trigger_auto_assign_chat_capabilities` (BEFORE INSERT on chat_participants)

**Lógica:**

1. Obtener `dealer_id` de la conversación
2. Obtener grupo (rol) del usuario en ese dealership
3. Buscar template del rol en `dealer_role_chat_templates`
4. Si existe template:
   - Auto-asignar `capabilities` si NULL
   - Auto-asignar `permission_level` si usando default 'write'

**Migración:** `20251024230500_create_auto_assign_chat_capabilities_trigger.sql`

**Comportamiento:**

```sql
-- Sin capabilities explícitas → auto-asignadas desde template
INSERT INTO chat_participants (conversation_id, user_id)
VALUES ('conv-id', 'user-id');
-- Resultado: capabilities = role_template.default_capabilities

-- Con capabilities explícitas → se respetan
INSERT INTO chat_participants (conversation_id, user_id, capabilities)
VALUES ('conv-id', 'user-id', '{"messages": {"send_text": false}}'::jsonb);
-- Resultado: capabilities = custom value
```

---

## Arquitectura de Datos

### Relaciones

```
dealerships (1) ──┬── (N) dealer_groups
                  │
                  ├── (N) dealer_role_chat_templates
                  │        │
                  │        └─ role_name matches dealer_groups.name
                  │
                  └── (N) chat_conversations
                           │
                           └── (N) chat_participants
                                    │
                                    ├── permission_level (ENUM)
                                    └── capabilities (JSONB, nullable)
```

### Flujo de Resolución de Permisos

```
User Action in Conversation
    │
    ├─► Check chat_participants.is_active
    │   └─► false → DENY (no access)
    │
    ├─► Check chat_participants.permission_level
    │   └─► 'none' → DENY (banned)
    │
    ├─► Get chat_participants.capabilities
    │   └─► NOT NULL → USE (custom override) ✓
    │
    ├─► Get dealer_role_chat_templates.default_capabilities
    │   └─► EXISTS → USE (role template) ✓
    │
    └─► Use permission_level defaults ✓
```

---

## Templates por Defecto (Auto-generados)

La migración `seed_default_chat_role_templates` crea templates automáticamente basándose en `dealer_groups`:

| Role Pattern | Level | send_files | send_voice | delete_others | Can Create |
|--------------|-------|------------|------------|---------------|------------|
| `%admin%` | `admin` | ✅ | ✅ | ✅ | All types |
| `%manager%` | `moderate` | ✅ | ✅ | ✅ | All types |
| `%staff%`, `%advisor%` | `write` | ✅ | ✅ | ❌ | direct, group |
| `%viewer%` | `read` | ❌ | ❌ | ❌ | None |
| `%technician%` | `restricted_write` | ❌ | ❌ | ❌ | None |
| *default* | `write` | ✅ | ✅ | ❌ | direct, group |

---

## Seguridad (RLS)

### dealer_role_chat_templates

**SELECT:**
```sql
Users can view templates for their dealerships
```
- Usuarios ven templates de dealerships donde tienen membership

**INSERT/UPDATE/DELETE:**
```sql
Admins can manage templates
```
- Solo usuarios con permisos admin en `dealer_groups`
- Verifica: `dealer_groups.permissions @> '["chat.admin"]'` o `'["admin"]'`

---

## Performance

### Índices Críticos

1. **GIN indexes on JSONB:**
   - `dealer_role_chat_templates.default_capabilities`
   - `chat_participants.capabilities`

2. **Composite indexes:**
   - `(dealer_id, role_name)` en templates
   - `(conversation_id, user_id, permission_level)` en participants

### Benchmarks Esperados

- `get_chat_effective_permissions()`: < 50ms por llamada
- Bulk permission check (100 users): < 100ms
- Template lookup: < 10ms (índice compuesto)

---

## Testing

**Archivo:** `supabase/migrations/TEST_CHAT_PERMISSIONS.sql`

### Tests Incluidos

1. ✅ Verificar ENUM values (none, restricted_write)
2. ✅ Verificar tabla templates existe y tiene datos
3. ✅ Verificar columna capabilities en participants
4. ✅ Test auto-assignment trigger
5. ✅ Test función get_chat_effective_permissions
6. ✅ Test priority (custom > template > default)
7. ✅ Test RLS policies
8. ✅ Test permission level 'none' bloquea acceso
9. ✅ Verificar índices GIN creados
10. ✅ Performance test (< 100ms para 100 rows)

**Ejecutar tests:**

```bash
psql -f supabase/migrations/TEST_CHAT_PERMISSIONS.sql
```

---

## Integración con Frontend

### Hook Recomendado: `useChatPermissions`

**Ubicación:** `src/hooks/useChatPermissions.tsx`

**Estructura sugerida:**

```typescript
interface ChatPermissions {
  hasAccess: boolean;
  level: 'none' | 'read' | 'restricted_write' | 'write' | 'moderate' | 'admin';
  userGroup: string | null;
  source: 'custom_override' | 'role_template' | 'level_default';
  capabilities: {
    messages: {
      sendText: boolean;
      sendVoice: boolean;
      sendFiles: boolean;
      editOwn: boolean;
      deleteOwn: boolean;
      deleteOthers: boolean;
    };
    participants: {
      inviteUsers: boolean;
      removeUsers: boolean;
      changePermissions: boolean;
    };
    conversation: {
      updateSettings: boolean;
      archive: boolean;
      delete: boolean;
    };
  };
}

export function useChatPermissions(conversationId: string) {
  const { user } = useAuth();
  const { dealerId } = useCurrentDealer();

  const { data: permissions, isLoading } = useQuery({
    queryKey: ['chat-permissions', conversationId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_chat_effective_permissions', {
          p_user_id: user?.id,
          p_conversation_id: conversationId,
          p_dealer_id: dealerId
        });

      if (error) throw error;

      // Transform snake_case to camelCase
      return transformPermissions(data);
    },
    enabled: !!user?.id && !!conversationId && !!dealerId
  });

  return {
    permissions,
    isLoading,
    canSendText: permissions?.capabilities.messages.sendText ?? false,
    canSendVoice: permissions?.capabilities.messages.sendVoice ?? false,
    canSendFiles: permissions?.capabilities.messages.sendFiles ?? false,
    canInviteUsers: permissions?.capabilities.participants.inviteUsers ?? false,
    canModerate: permissions?.level === 'moderate' || permissions?.level === 'admin',
    isAdmin: permissions?.level === 'admin'
  };
}
```

**Uso en componentes:**

```tsx
function ChatInput({ conversationId }: Props) {
  const { canSendText, canSendVoice, canSendFiles } = useChatPermissions(conversationId);

  return (
    <div className="chat-input">
      <input disabled={!canSendText} placeholder={t('chat.type_message')} />

      <button disabled={!canSendVoice}>
        <MicIcon />
      </button>

      <button disabled={!canSendFiles}>
        <AttachIcon />
      </button>
    </div>
  );
}
```

---

## Migraciones Creadas

### Resumen

| # | Archivo | Propósito |
|---|---------|-----------|
| 1 | `20251024230000_add_chat_permission_levels_none_restricted_write.sql` | Extender ENUM con 'none' y 'restricted_write' |
| 2 | `20251024230100_create_dealer_role_chat_templates_table.sql` | Tabla de templates de rol |
| 3 | `20251024230200_add_capabilities_to_chat_participants.sql` | Columna capabilities en participants |
| 4 | `20251024230300_seed_default_chat_role_templates.sql` | Poblar templates desde dealer_groups |
| 5 | `20251024230400_create_get_chat_effective_permissions_function.sql` | Función de cálculo de permisos |
| 6 | `20251024230500_create_auto_assign_chat_capabilities_trigger.sql` | Trigger auto-asignación |

### Orden de Aplicación

Las migraciones **DEBEN** aplicarse en orden secuencial (ya están nombradas cronológicamente).

```bash
# Usando Supabase CLI
npx supabase db push

# O manualmente en SQL Editor
-- Copiar y ejecutar cada archivo en orden
```

---

## Backward Compatibility

✅ **100% Backward Compatible**

- No se eliminan valores ENUM existentes
- No se modifican columnas existentes
- `capabilities` es `NULL` por defecto (usa templates)
- Participants existentes mantienen `permission_level = 'write'`
- RLS policies existentes no se modifican

---

## Casos de Uso Empresariales

### 1. Técnico con Acceso Limitado

**Escenario:** Técnicos deben reportar progreso pero NO compartir archivos/fotos (van por otro sistema).

**Solución:**
- Crear grupo "Technician" en `dealer_groups`
- Template auto-generado con `restricted_write` level
- `send_files = false`, `send_voice = false`, `send_text = true`

### 2. Cliente VIP en Conversación

**Escenario:** Cliente importante debe tener conversación especial con capabilities reducidas para staff.

**Solución:**
- Crear conversación con Admin como owner
- Agregar staff members con custom `capabilities` override
- Ejemplo: Staff puede leer pero no eliminar mensajes en esa conversación

### 3. Manager Temporal

**Escenario:** Usuario temporal con permisos de moderación en conversación específica.

**Solución:**
- Agregar participant con `permission_level = 'moderate'`
- O usar `capabilities` override para permisos específicos
- Al terminar, cambiar a `permission_level = 'write'`

### 4. Ban Temporal

**Escenario:** Usuario violó normas, ban temporal de 7 días.

**Solución:**
- Cambiar `permission_level = 'none'` en participant
- Después de 7 días, restaurar nivel original
- Historial de mensajes se mantiene

---

## Mantenimiento

### Agregar Nuevo Rol

Cuando se crea nuevo grupo en `dealer_groups`:

```sql
-- Opción 1: Manual
INSERT INTO dealer_role_chat_templates (dealer_id, role_name, ...)
VALUES (5, 'New Role', ...);

-- Opción 2: Re-ejecutar seed (idempotente)
-- Copia lógica de seed migration
```

### Modificar Template Existente

```sql
UPDATE dealer_role_chat_templates
SET default_capabilities = jsonb_set(
  default_capabilities,
  '{messages,send_files}',
  'false'
)
WHERE dealer_id = 5 AND role_name = 'Staff';
```

### Auditoría de Permisos

```sql
-- Ver quien tiene qué permisos en conversación
SELECT
  p.full_name,
  cp.permission_level,
  get_chat_effective_permissions(cp.user_id, cp.conversation_id, 5)->>'source' AS source,
  get_chat_effective_permissions(cp.user_id, cp.conversation_id, 5)->'capabilities'->'messages'->>'send_files' AS can_send_files
FROM chat_participants cp
JOIN profiles p ON p.id = cp.user_id
WHERE cp.conversation_id = 'conv-id'
ORDER BY cp.permission_level DESC;
```

---

## Próximos Pasos

### Implementación Frontend

1. ✅ Crear `useChatPermissions` hook
2. ✅ Integrar en componentes de chat:
   - `ChatInput` (disable based on capabilities)
   - `MessageActions` (show/hide edit/delete)
   - `ParticipantList` (show/hide invite/remove)
3. ✅ Agregar UI para admin panel:
   - Editar templates de rol
   - Override capabilities por usuario
   - Ban temporal (permission_level = 'none')

### Testing E2E

1. ✅ Test flujo completo de permisos
2. ✅ Test auto-asignación en nuevo participant
3. ✅ Test override de capabilities
4. ✅ Test RLS policies con diferentes roles

### Monitoreo

1. ✅ Log de cambios de permisos (audit trail)
2. ✅ Alertas si capabilities override muy frecuente
3. ✅ Dashboard de distribución de permisos por rol

---

## Soporte

**Autor:** Claude Code (Database Expert Agent)

**Fecha:** 2025-10-24

**Versión:** 1.0.0

**Para preguntas o issues:**
- Revisar `TEST_CHAT_PERMISSIONS.sql` para debugging
- Verificar índices con `EXPLAIN ANALYZE`
- Validar RLS policies con diferentes roles de test
