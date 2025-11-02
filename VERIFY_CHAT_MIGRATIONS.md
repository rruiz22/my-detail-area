# ✅ Verificación de Chat Permissions Migrations

## Estado: Aplicadas en Supabase
**Fecha:** 2025-11-01
**Proyecto:** swfnnrpzpkdypbrzmgnr.supabase.co

---

## 🔍 Queries de Verificación

Ejecuta estos queries en Supabase Dashboard > SQL Editor para verificar:

### 1. Verificar nuevos niveles de permisos
```sql
SELECT enumlabel
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'chat_permission_level'
ORDER BY e.enumsortorder;
```

**Resultado esperado:** Debe mostrar 6 niveles:
- `read`
- `write`
- `moderate`
- `admin`
- `none` ✨ NUEVO
- `restricted_write` ✨ NUEVO

---

### 2. Verificar tabla dealer_role_chat_templates
```sql
SELECT
  role_name,
  default_permission_level,
  conversation_types,
  dealer_id
FROM dealer_role_chat_templates
ORDER BY dealer_id, role_name;
```

**Resultado esperado:** Debe mostrar templates para cada grupo de dealer que tengas.

---

### 3. Verificar función get_chat_effective_permissions
```sql
SELECT
  proname as function_name,
  prorettype::regtype as return_type,
  pronargs as num_args
FROM pg_proc
WHERE proname = 'get_chat_effective_permissions';
```

**Resultado esperado:**
- `function_name`: get_chat_effective_permissions
- `return_type`: jsonb
- `num_args`: 3

---

### 4. Verificar trigger auto_assign_chat_capabilities
```sql
SELECT
  tgname as trigger_name,
  tgrelid::regclass as table_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_auto_assign_chat_capabilities';
```

**Resultado esperado:**
- `trigger_name`: trigger_auto_assign_chat_capabilities
- `table_name`: chat_participants
- `enabled`: O (enabled)

---

### 5. Verificar columna capabilities en chat_participants
```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'chat_participants'
  AND column_name = 'capabilities';
```

**Resultado esperado:**
- `column_name`: capabilities
- `data_type`: jsonb
- `is_nullable`: YES

---

### 6. Test de función (con datos de prueba)
```sql
-- Reemplaza con UUIDs reales de tu base de datos
SELECT get_chat_effective_permissions(
  '00000000-0000-0000-0000-000000000000'::UUID,  -- user_id (cambia esto)
  '00000000-0000-0000-0000-000000000000'::UUID,  -- conversation_id (cambia esto)
  1                                                -- dealer_id (cambia esto)
);
```

**Resultado esperado:** JSON con:
```json
{
  "has_access": false,
  "level": "none",
  "source": "no_participant_record",
  "capabilities": {...}
}
```

---

## 📊 Conteo de Templates por Dealer

```sql
SELECT
  d.id as dealer_id,
  d.name as dealer_name,
  COUNT(drct.id) as template_count,
  ARRAY_AGG(drct.role_name ORDER BY drct.role_name) as roles
FROM dealerships d
LEFT JOIN dealer_role_chat_templates drct ON drct.dealer_id = d.id
GROUP BY d.id, d.name
ORDER BY d.name;
```

---

## 🧪 Testing en la Aplicación

### 1. Verificar hook useChatPermissions
Abre la consola del navegador en la página de Chat:

```javascript
// Debería cargar sin errores
console.log('useChatPermissions loaded');
```

### 2. Verificar permisos efectivos
En un componente que use el hook:

```typescript
const { permissions, loading } = useChatPermissions(conversationId, dealerId);

console.log('Permissions:', permissions);
// Debe mostrar: { has_access, level, capabilities, ... }
```

### 3. Verificar auto-assignment
Crea una nueva conversación y verifica que los participantes tengan:
- `permission_level` asignado según su rol
- `capabilities` asignadas automáticamente

---

## ✅ Checklist de Verificación

- [ ] Enum `chat_permission_level` tiene 6 valores
- [ ] Tabla `dealer_role_chat_templates` existe
- [ ] Tabla tiene datos (templates creados)
- [ ] Función `get_chat_effective_permissions` existe
- [ ] Trigger `trigger_auto_assign_chat_capabilities` existe
- [ ] Columna `capabilities` en `chat_participants` existe
- [ ] Hook `useChatPermissions` funciona sin errores
- [ ] No hay errores en la consola del navegador
- [ ] Chat funciona correctamente

---

## 🚨 Rollback (Si algo sale mal)

Si necesitas revertir las migrations:

### Eliminar trigger
```sql
DROP TRIGGER IF EXISTS trigger_auto_assign_chat_capabilities ON chat_participants;
DROP FUNCTION IF EXISTS auto_assign_chat_capabilities();
```

### Eliminar función
```sql
DROP FUNCTION IF EXISTS get_chat_effective_permissions(UUID, UUID, BIGINT);
```

### Eliminar tabla
```sql
DROP TABLE IF EXISTS dealer_role_chat_templates;
```

### Eliminar columna
```sql
ALTER TABLE chat_participants DROP COLUMN IF EXISTS capabilities;
```

### Nota sobre ENUM
⚠️ No se pueden eliminar valores de un ENUM fácilmente.
Si es necesario, contacta para procedimiento completo.

---

## 📍 Próximos Pasos

1. ✅ Verificar todas las queries anteriores
2. ✅ Probar el chat en la aplicación
3. ✅ Crear una conversación nueva y verificar auto-assignment
4. ✅ Verificar que los permisos se respetan en la UI
5. 🔄 Arreglar los 5 problemas críticos identificados en el análisis
6. 🔄 Completar features pendientes (threading, channels, etc.)

---

**Estado:** ✅ Migrations aplicadas - En proceso de verificación
