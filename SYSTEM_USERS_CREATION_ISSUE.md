# 🐛 System Users Creation - Issue Pendiente

**Fecha**: 2025-11-04
**Estado**: ❌ NO RESUELTO
**Sesión**: Claude Code Team
**Prioridad**: 🔴 ALTA

---

## 📋 Problema

La creación de usuarios del sistema (system_admin / supermanager) en `/admin` → tab "System Users" **FALLA** con error 400.

### Síntomas
- ✅ Modal se abre correctamente
- ✅ Form se llena sin problemas
- ✅ Validación frontend funciona
- ❌ Edge function retorna 400 (Bad Request)
- ❌ Toast muestra: "Error: Database error creating new user"
- ❌ Usuario NO se crea

---

## 🔍 Diagnóstico Realizado

### Intentos de Corrección (4 deploys)

#### **Version 1** - Bug de JSON
- **Error**: `\n` literal dentro del JSON rompía el formato
- **Fix**: Corregido
- **Resultado**: Aún fallaba con 400

#### **Version 2** - Simplificación
- **Error**: Código duplicado y complejo
- **Fix**: Simplificado y limpiado
- **Resultado**: Aún fallaba con 400

#### **Version 3** - Logging mejorado
- **Error**: No se capturaba mensaje de error específico
- **Fix**: Agregados console.logs detallados
- **Resultado**: Mostró "Database error creating new user"

#### **Version 4** - Columna full_name eliminada
- **Error**: Columna `full_name` NO existe en tabla `profiles`
- **Fix**: Eliminado `full_name` del UPDATE
- **Resultado**: **NO PROBADO** - Usuario abandonó sesión

### Estado de la Edge Function

**Función**: `create-system-user`
**Version desplegada**: 4
**Estado**: ACTIVE
**ID**: d6cb6c07-31fc-4adc-b23e-f6f7fcd889d6

**URL**: https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/create-system-user

---

## 📁 Archivos Modificados

### Frontend
- `src/components/admin/SystemUsersManagement.tsx`
  - Línea 50: Eliminado `!inner` en query de dealer_memberships

- `src/components/admin/CreateSystemUserModal.tsx`
  - Líneas 175-201: Mejorada captura de errores
  - Ahora lee `response.error.context.json()` para obtener mensaje específico

### Backend
- `supabase/functions/create-system-user/index.ts` (Version 4)
  - Interface actualizada: `firstName`, `lastName`, `role`, `primaryDealershipId`, `sendWelcomeEmail`
  - Eliminado: `full_name` del UPDATE (columna no existe)
  - UPDATE solo incluye: `role`, `first_name`, `last_name`, `dealership_id`

---

## 🔧 Estructura de la Tabla profiles

```sql
Columnas confirmadas:
- id (uuid, NOT NULL)
- email (text, NOT NULL)
- first_name (text, nullable)
- last_name (text, nullable)
- role (text, nullable)
- dealership_id (bigint, nullable)
- created_at (timestamp with time zone)
- updated_at (timestamp with time zone)
- user_type (USER-DEFINED enum)
- avatar_url (text)
- avatar_variant (text)
- avatar_seed (text)
- avatar_colors (ARRAY)
- use_new_role_system (boolean)
- phone_number (text)
- presence_status (text, NOT NULL)

❌ NO EXISTE: full_name
```

---

## 🎯 Flujo de la Edge Function (Version 4)

```typescript
1. Validar método POST
2. Validar environment variables
3. Validar authentication token
4. Verificar caller es system_admin
5. Parse request body (email, firstName, lastName, role, primaryDealershipId)
6. Validar campos requeridos
7. Verificar que usuario NO existe (by email)
8. Crear usuario en Auth con email_confirm: true
9. UPDATE profiles SET:
   - role = 'system_admin' | 'supermanager'
   - first_name = firstName
   - last_name = lastName
   - dealership_id = primaryDealershipId (opcional)
   WHERE id = authUser.user.id
10. Si primaryDealershipId: Crear dealer_membership
11. Return success
```

**Punto de falla**: Step 9 (UPDATE profiles)

---

## 🚨 Posibles Causas del Error 400

### **Hipótesis 1: RLS Policy bloquea UPDATE** (MÁS PROBABLE)
La tabla `profiles` tiene RLS habilitado y el service role **podría estar bloqueado** por una policy.

**Verificar:**
```sql
-- Ver RLS policies en profiles
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

**Solución:**
- Verificar que service role tiene permisos de UPDATE en profiles
- O agregar policy que permita UPDATE con service_role_key

### **Hipótesis 2: Trigger bloqueando UPDATE**
Podría haber un trigger en `profiles` que valida algo y rechaza el UPDATE.

**Verificar:**
```sql
-- Ver triggers en profiles
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';
```

### **Hipótesis 3: Constraint violation**
El role o dealership_id podrían tener constraints que fallan.

**Verificar:**
```sql
-- Ver constraints en profiles
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'profiles';
```

### **Hipótesis 4: Tipo de dato incorrecto**
`role` es tipo `text` pero podría esperarse un enum específico.

**Verificar:**
```sql
-- Ver tipo de datos de role
SELECT data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'role';
```

---

## 🔬 Debugging Pendiente

### **Paso 1: Ver logs detallados de la función**

Los logs de Supabase NO muestran console.logs. Para ver los logs reales:

```bash
# Opción A: Supabase CLI (requiere login y project link)
npx supabase functions serve create-system-user --debug

# Opción B: Ver logs en dashboard de Supabase
# https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions/create-system-user/logs
```

### **Paso 2: Probar UPDATE manualmente**

```sql
-- Crear usuario de prueba en Auth primero (desde Supabase Dashboard Auth)
-- Luego intentar UPDATE manual:
UPDATE profiles
SET
  role = 'supermanager',
  first_name = 'Test',
  last_name = 'User',
  dealership_id = NULL
WHERE id = '[USER_ID_CREADO]';

-- Si falla, ver el error específico
```

### **Paso 3: Verificar RLS policies**

```sql
-- Deshabilitar RLS temporalmente para testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Intentar crear usuario
-- Si funciona, el problema es RLS

-- Re-habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Agregar policy para service role
CREATE POLICY "Service role can update any profile"
ON profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
```

---

## 📝 Datos de Testing

**Email usado**: ruizpires86@gmail.com
**Nombre**: Alice Ruiz
**Role**: supermanager
**Primary Dealership**: null

**Payload enviado:**
```json
{
  "email": "ruizpires86@gmail.com",
  "firstName": "Alice",
  "lastName": "Ruiz",
  "role": "supermanager",
  "primaryDealershipId": null,
  "sendWelcomeEmail": true
}
```

**Response recibido:**
```
Status: 400 Bad Request
Body: { success: false, error: "Database error creating new user" }
```

---

## 🎯 Próximos Pasos Recomendados

### **OPCIÓN A: Investigar RLS Policies** (RECOMENDADO)
1. Ver policies en tabla `profiles`
2. Verificar que service_role puede UPDATE
3. Agregar policy si es necesario
4. Probar creación nuevamente

### **OPCIÓN B: Testing Manual en SQL**
1. Crear usuario en Auth manualmente
2. Intentar UPDATE en profiles manualmente
3. Ver error específico de PostgreSQL
4. Corregir según el error

### **OPCIÓN C: Usar Función SQL en lugar de UPDATE**
En lugar de `.update()` desde la edge function, crear una función PostgreSQL:

```sql
CREATE OR REPLACE FUNCTION create_system_user_profile(
  p_user_id uuid,
  p_role text,
  p_first_name text,
  p_last_name text,
  p_dealership_id bigint DEFAULT NULL
)
RETURNS void
SECURITY DEFINER  -- Ejecuta con permisos del owner
AS $$
BEGIN
  UPDATE profiles
  SET
    role = p_role,
    first_name = p_first_name,
    last_name = p_last_name,
    dealership_id = p_dealership_id
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Llamar desde edge function:
await supabaseAdmin.rpc('create_system_user_profile', {
  p_user_id: authUser.user.id,
  p_role: role,
  p_first_name: firstName,
  p_last_name: lastName,
  p_dealership_id: primaryDealershipId
});
```

---

## 🔍 Información para Debugging

### **Logs de Edge Function**
Ver en: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions/create-system-user/logs

### **Última ejecución:**
- Timestamp: 1762225576776000 (2025-11-04 03:06:16 UTC)
- Status: 400
- Execution time: 675ms

### **Console Logs Esperados (no visibles en API):**
```
=== CREATE SYSTEM USER START ===
Creating auth user: ruizpires86@gmail.com
Auth user created: [user_id]
Updating profile...
Profile update error: [ERROR ESPECÍFICO AQUÍ]
```

---

## 📖 Archivos Relacionados

### **Frontend Components**
- `src/components/admin/SystemUsersManagement.tsx` - Componente principal
- `src/components/admin/CreateSystemUserModal.tsx` - Modal de creación (con logging mejorado)
- `src/pages/AdminDashboard.tsx` - Página que contiene el componente

### **Edge Function**
- `supabase/functions/create-system-user/index.ts` - Version 4 (ACTIVE)
- Ubicación en Supabase: swfnnrpzpkdypbrzmgnr/d6cb6c07-31fc-4adc-b23e-f6f7fcd889d6

### **Database**
- Tabla: `public.profiles`
- Auth: `auth.users`
- Security: `public.security_audit_log` (para audit trail)

---

## ✅ Funcionalidades Completadas Hoy (Otros Issues)

| Issue | Estado | Archivos |
|-------|--------|----------|
| AdminDashboard tabs | ✅ Resuelto | AdminDashboard.tsx |
| GetReadySetup tabs | ✅ Resuelto | GetReadySetup.tsx, GetReady.tsx |
| Setup integration | ✅ Implementado | GetReadySplitContent.tsx |
| Enterprise Metrics | ✅ Implementado | GetReadyEnterpriseMetrics.tsx |
| TimeRange filtering | ✅ Implementado | GetReadyEnterpriseMetrics.tsx |
| Toast undefined FCM | ✅ Corregido | useFirebaseMessaging.ts |
| Duplicate key Settings | ✅ Corregido | Settings.tsx |
| Query !inner fix | ✅ Corregido | SystemUsersManagement.tsx |
| **System Users Creation** | ❌ **PENDIENTE** | **create-system-user edge function** |

---

## 🎯 Recomendación para Próxima Sesión

**PRIORIDAD 1**: Investigar RLS policies en tabla `profiles`

**Comando rápido:**
```sql
-- Ver todas las policies
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles';

-- Si service_role está bloqueado, agregar:
CREATE POLICY "service_role_can_update_profiles"
ON profiles
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
```

**PRIORIDAD 2**: Si RLS no es el problema, usar función PostgreSQL SECURITY DEFINER (bypass RLS)

**PRIORIDAD 3**: Contactar soporte de Supabase si persiste (podría ser limitación de la plataforma)

---

## 📊 Edge Function Versions History

| Version | Cambio | Estado | Timestamp |
|---------|--------|--------|-----------|
| 1 | Deploy inicial (con bug `\n`) | Failed 400 | 1762224532192 |
| 2 | Simplificado | Failed 400 | 1762225141967 |
| 3 | Logging mejorado | Failed 400 | 1762226541629 |
| 4 | Eliminado full_name | **NO PROBADO** | 1762226778137 |

---

## 🔧 Código Actual (Version 4)

### Edge Function - UPDATE Statement
```typescript
const { error: profileError } = await supabaseAdmin
  .from('profiles')
  .update({
    role,              // 'system_admin' | 'supermanager'
    first_name: firstName,
    last_name: lastName,
    dealership_id: primaryDealershipId || null
  })
  .eq('id', authUser.user.id)
```

### Modal - Error Handling
```typescript
if (response.error) {
  // Lee response.error.context.json() para mensaje específico
  const errorBody = await response.error.context.json();
  errorMessage = errorBody.error || response.error.message;
  throw new Error(errorMessage);
}
```

---

## 🧪 Testing Checklist para Próxima Sesión

### Pre-Testing
- [ ] Verificar RLS policies en `profiles`
- [ ] Verificar triggers en `profiles`
- [ ] Verificar constraints en `profiles`
- [ ] Intentar UPDATE manual en SQL Editor

### Testing de Función
- [ ] Probar con Version 4 (full_name eliminado)
- [ ] Verificar logs en Supabase Dashboard
- [ ] Capturar mensaje de error específico de PostgreSQL
- [ ] Si falla, probar con RLS disabled

### Post-Fix
- [ ] Crear usuario de prueba exitosamente
- [ ] Verificar que aparece en lista
- [ ] Verificar role es correcto
- [ ] Verificar security_audit_log tiene entrada

---

## 💡 Workaround Temporal (Si es urgente)

Mientras se resuelve, crear usuarios del sistema **manualmente** via SQL:

```sql
-- 1. Crear usuario en Auth (vía Supabase Dashboard > Auth > Add User)
--    Email: user@example.com
--    Auto Confirm Email: true

-- 2. Obtener el user_id creado y ejecutar:
UPDATE profiles
SET
  role = 'supermanager',  -- o 'system_admin'
  first_name = 'Alice',
  last_name = 'Ruiz',
  dealership_id = NULL
WHERE email = 'user@example.com';

-- 3. Opcional: Crear dealer_membership si necesita primary dealership
INSERT INTO dealer_memberships (user_id, dealer_id, is_active)
VALUES ('[user_id]', [dealer_id], true);
```

---

## 📞 Recursos Útiles

### **Supabase Dashboard**
- Project: swfnnrpzpkdypbrzmgnr
- Functions: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions
- Database: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/editor
- Logs: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/logs/edge-functions

### **MCP Tools Disponibles**
- `mcp__supabase__execute_sql` - Ejecutar queries SQL
- `mcp__supabase__get_logs` - Ver logs de edge functions
- `mcp__supabase__deploy_edge_function` - Desplegar funciones
- `mcp__supabase__list_tables` - Ver estructura de tablas

### **Documentación Relacionada**
- `SYSTEM_USERS_REVIEW.md` - Análisis completo de la feature
- `ADMIN_TABS_RESOLVED.md` - Fix de tabs (resuelto hoy)

---

## 🔑 Información de Acceso

**Usuario autenticado**: rruiz@lima.llc
**Role**: system_admin
**Dealership seleccionado**: Admin Dealership (ID: 9)

**Email de prueba**: ruizpires86@gmail.com
**Estado en DB**: NO existe (verificado con SELECT)

---

## ⚠️ Notas Importantes

1. **NO usar `full_name` en UPDATE** - Columna no existe en schema
2. **Service role debería tener permisos totales** - Verificar RLS
3. **Rollback implementado** - Si profile update falla, auth user se elimina
4. **Version 4 NO ha sido probada** - Usuario abandonó antes de probar
5. **Logs de console.log NO aparecen en API** - Solo visibles en Dashboard

---

## 🚀 Siguiente Acción Recomendada

```sql
-- EJECUTAR ESTO PRIMERO:
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

Si hay policies que bloquean UPDATE del service_role, ese es el problema.

---

**Creado por**: Claude Code Team
**Fecha**: 2025-11-04 03:15 UTC
**Para sesión**: Próxima
**Usuario**: rudyruizlima@gmail.com
