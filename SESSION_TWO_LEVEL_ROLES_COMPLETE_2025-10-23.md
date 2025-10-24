# Sistema de Roles de Dos Niveles - Resumen Completo de Implementación
**Fecha**: 23 de Octubre, 2025
**Estado**: ✅ Scripts SQL corregidos - Listo para ejecutar

---

## 📋 Resumen Ejecutivo

Se implementó exitosamente un sistema de roles de dos niveles para distinguir entre:

1. **System Roles** (globales): Roles del sistema como `user`, `manager`, `system_admin`
2. **Dealer Custom Roles** (específicos): Roles personalizados por dealer como `used_car_manager`, `service_manager`

### Estado Actual

- ✅ **Código TypeScript**: Completamente actualizado en `usePermissions.tsx`
- ✅ **Scripts SQL**: Corregidos y listos para ejecutar
- ⏳ **Base de Datos**: Scripts pendientes de ejecución
- ⏳ **UI Admin**: Pendiente (Fase 3)

---

## 🏗️ Arquitectura del Sistema

### Estructura de Base de Datos

```
dealer_custom_roles
├─ dealer_id = NULL    → System Roles (global)
│  ├─ system_admin     → Full access
│  ├─ manager          → Manage dealers/settings
│  └─ user             → Basic user (default)
│
└─ dealer_id = [ID]    → Dealer Custom Roles (specific)
   ├─ used_car_manager
   ├─ service_manager
   └─ ...

Asignación de Roles:
├─ dealer_memberships.custom_role_id       → 1 System Role
└─ user_custom_role_assignments            → N Dealer Custom Roles
```

### Tablas Descubiertas

Durante el diagnóstico descubrimos la estructura real:

#### `module_permissions` (catálogo de permisos disponibles)
```sql
Columnas:
- id (uuid)
- module (text)
- permission_key (text)
- display_name (text)
- description (text)
- is_active (boolean)
- created_at, updated_at
```

#### `role_module_permissions_new` (asignación de permisos)
```sql
Columnas:
- role_id (uuid) → dealer_custom_roles.id
- permission_id (uuid) → module_permissions.id  ← CLAVE
- granted_by (uuid) → profiles.id
```

**Nota importante**: La tabla NO tiene columnas `module`, `permission_key` ni `is_active` directamente. Usa `permission_id` como foreign key.

#### `role_module_access` (activación de módulos por role)
```sql
Columnas:
- role_id (uuid)
- module (app_module) ← ENUM type
- is_enabled (boolean)
```

---

## 🔧 Scripts SQL Corregidos

### Orden de Ejecución

Ejecuta estos 4 scripts en el **SQL Editor de Supabase** en este orden:

#### 1️⃣ `MIGRATE_DEALER_CUSTOM_ROLES_ALLOW_NULL.sql`

**Propósito**: Permitir `dealer_id = NULL` para system roles

```sql
ALTER TABLE dealer_custom_roles
ALTER COLUMN dealer_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dealer_custom_roles_unique_name
ON dealer_custom_roles (role_name, COALESCE(dealer_id, -1));
```

**Estado**: ✅ Listo para ejecutar

---

#### 2️⃣ `CREATE_SYSTEM_ROLES.sql`

**Propósito**: Crear los 3 system roles: `user`, `manager`, `system_admin`

```sql
INSERT INTO dealer_custom_roles (
  id, dealer_id, role_name, display_name, description, is_active
) VALUES (
  gen_random_uuid(), NULL, 'user', 'User',
  'Basic dealer user with default permissions', true
) ON CONFLICT DO NOTHING;

-- Similar para manager y system_admin
```

**Estado**: ✅ Listo para ejecutar

---

#### 3️⃣ `CONFIGURE_SYSTEM_ROLE_PERMISSIONS.sql`

**Propósito**: Asignar permisos granulares a cada system role

**Correcciones aplicadas**:
- ✅ Usa `permission_id` (no `module_permission_id`)
- ✅ Eliminada columna `is_active` del INSERT
- ✅ Cast a `::app_module` para ENUM

```sql
-- USER ROLE: Solo permisos de vista
INSERT INTO role_module_permissions_new (role_id, permission_id)
SELECT user_role_id, mp.id
FROM module_permissions mp
WHERE mp.module IN ('dashboard', 'sales_orders', ...)
  AND mp.permission_key = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- MANAGER ROLE: Todos los permisos
INSERT INTO role_module_permissions_new (role_id, permission_id)
SELECT manager_role_id, mp.id
FROM module_permissions mp
WHERE mp.module IN (...)
  AND mp.permission_key IN ('view', 'create', 'edit', 'delete', 'change_status', 'manage', 'admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Activar módulos (con CAST a app_module)
INSERT INTO role_module_access (role_id, module, is_enabled)
SELECT manager_role_id, module::app_module, true
FROM (VALUES ('dashboard'), ('sales_orders'), ...) AS modules(module)
ON CONFLICT (role_id, module) DO UPDATE SET is_enabled = true;
```

**Estado**: ✅ Corregido y listo para ejecutar

---

#### 4️⃣ `UPDATE_USER_SYSTEM_ROLE.sql`

**Propósito**: Actualizar usuarios de "Sales Manager" (dealer-specific) a "User" (system role)

```sql
UPDATE dealer_memberships
SET custom_role_id = (
  SELECT id FROM dealer_custom_roles
  WHERE role_name = 'user' AND dealer_id IS NULL
)
WHERE custom_role_id = (
  SELECT id FROM dealer_custom_roles
  WHERE role_name = 'sales_manager' AND dealer_id IS NOT NULL
);
```

**Estado**: ✅ Listo para ejecutar

---

## 💻 Cambios en el Código

### `src/hooks/usePermissions.tsx`

#### Cambios Principales

1. **Fetch de roles de dos fuentes**:
```typescript
// 1. Dealer custom roles
const { data: assignmentsData } = await supabase
  .from('user_custom_role_assignments')
  .select(`custom_role_id, dealer_id, dealer_custom_roles(...)`)
  .eq('user_id', user.id)
  .eq('is_active', true);

// 2. System role (debe tener dealer_id = NULL)
const { data: membershipsData } = await supabase
  .from('dealer_memberships')
  .select(`custom_role_id, dealer_id, dealer_custom_roles(...)`)
  .eq('user_id', user.id)
  .eq('is_active', true)
  .not('custom_role_id', 'is', null);
```

2. **Validación de system roles**:
```typescript
(membershipsData || []).forEach(m => {
  if (m.dealer_custom_roles?.id) {
    if (m.dealer_custom_roles.dealer_id === null) {
      // ✅ Valid system role
      roleIds.add(m.dealer_custom_roles.id);
    } else {
      // ⚠️ Invalid - reject it
      console.warn('Invalid system role - dealer_id should be NULL');
    }
  }
});
```

3. **Logging mejorado**:
```typescript
console.log(`📋 Found ${roleIdsArray.length} total role(s) for user`);
console.log(`   - Dealer custom roles: ${assignmentsData?.length || 0}`);
console.log(`   - System role: ${systemRoleCount}`);
console.log(`📋 Roles breakdown:`, rolesDebug);
```

### `src/types/permissions.ts`

**Nueva interfaz actualizada**:
```typescript
export interface GranularCustomRole {
  id: string;
  role_name: string;
  display_name: string;
  dealer_id: number | null; // NULL = system role, number = dealer role
  role_type: 'system_role' | 'dealer_custom_role'; // ← NUEVO
  system_permissions: Set<SystemPermissionKey>;
  module_permissions: Map<AppModule, Set<ModulePermissionKey>>;
}
```

---

## 🐛 Problemas Encontrados y Solucionados

### Problema 1: `dealer_id` NOT NULL constraint
**Error**:
```
null value in column "dealer_id" violates not-null constraint
```

**Solución**:
Script `MIGRATE_DEALER_CUSTOM_ROLES_ALLOW_NULL.sql` para remover la restricción.

---

### Problema 2: Columna `module` no existe
**Error**:
```
column "module" of relation "role_module_permissions_new" does not exist
```

**Causa**: La tabla usa `permission_id` (foreign key), no columnas directas.

**Solución**: Reescribir queries para usar JOIN con `module_permissions`:
```sql
INSERT INTO role_module_permissions_new (role_id, permission_id)
SELECT user_role_id, mp.id
FROM module_permissions mp
WHERE mp.module IN (...) AND mp.permission_key = 'view'
```

---

### Problema 3: Columna `is_active` no existe en role_module_permissions_new
**Error**:
```
column "is_active" does not exist
```

**Solución**: Eliminar `is_active` del INSERT:
```sql
-- ANTES (incorrecto)
INSERT INTO role_module_permissions_new (role_id, permission_id, is_active)
SELECT user_role_id, mp.id, true ...

-- DESPUÉS (correcto)
INSERT INTO role_module_permissions_new (role_id, permission_id)
SELECT user_role_id, mp.id ...
```

---

### Problema 4: Type mismatch con ENUM app_module
**Error**:
```
column "module" is of type app_module but expression is of type text
```

**Solución**: Cast explícito a `::app_module`:
```sql
INSERT INTO role_module_access (role_id, module, is_enabled)
SELECT manager_role_id, module::app_module, true  -- ← CAST aquí
FROM (VALUES ('dashboard'), ('sales_orders'), ...) AS modules(module)
```

---

## ✅ Verificación Post-Ejecución

### En Consola del Navegador

**ANTES** (estado actual):
```javascript
⚠️ Invalid system role assignment - dealer_id should be NULL for system roles: sales_manager (dealer_id: 5)
📋 Found 1 total role(s) for user
   - Dealer custom roles: 1
   - System role: 0
```

**DESPUÉS** (esperado):
```javascript
📋 Found 2 total role(s) for user
   - Dealer custom roles: 1  // used_car_manager
   - System role: 1           // user
📋 Roles breakdown: [
  {
    source: 'user_custom_role_assignments',
    type: 'dealer_custom_role',
    role_name: 'used_car_manager',
    dealer_id: 5
  },
  {
    source: 'dealer_memberships',
    type: 'system_role',
    role_name: 'user',
    dealer_id: null  ← CLAVE
  }
]
```

### En Base de Datos

```sql
-- Ver system roles
SELECT id, role_name, display_name, dealer_id
FROM dealer_custom_roles
WHERE dealer_id IS NULL;

-- Debería mostrar:
-- user | User | NULL
-- manager | Manager | NULL
-- system_admin | System Admin | NULL

-- Ver asignación de tu usuario
SELECT
  p.email,
  dcr.role_name as system_role,
  dcr.dealer_id
FROM dealer_memberships dm
JOIN profiles p ON p.id = dm.user_id
LEFT JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
WHERE p.email = 'tu-email@example.com';

-- dealer_id debe ser NULL
```

---

## 🎯 Próximos Pasos (Fase 3 - UI)

### 1. Mostrar System Role en UI

**Archivo**: `src/components/TopBar.tsx` o perfil de usuario

```typescript
const systemRole = enhancedUser?.custom_roles.find(
  r => r.role_type === 'system_role'
);
const dealerRoles = enhancedUser?.custom_roles.filter(
  r => r.role_type === 'dealer_custom_role'
);

// Mostrar:
// System Role: User
// Dealer Roles: UC Manager, Service Manager
```

### 2. Admin UI para System Roles

**Archivo nuevo**: `src/pages/admin/SystemRoles.tsx`

Funcionalidades:
- Listar system roles (dealer_id = NULL)
- Ver/editar permisos de cada system role
- Asignar system role a usuarios
- Ver usuarios por system role

### 3. Selector de System Role en User Management

En la gestión de usuarios, agregar dropdown para seleccionar system role:
- User (default)
- Manager
- System Admin (solo para super admins)

---

## 📁 Archivos Creados/Modificados

### Scripts SQL (Listos para ejecutar)
- ✅ `MIGRATE_DEALER_CUSTOM_ROLES_ALLOW_NULL.sql`
- ✅ `CREATE_SYSTEM_ROLES.sql`
- ✅ `CONFIGURE_SYSTEM_ROLE_PERMISSIONS.sql`
- ✅ `UPDATE_USER_SYSTEM_ROLE.sql`

### Scripts de Diagnóstico
- 📊 `CHECK_TABLE_STRUCTURE.sql`
- 📊 `DIAGNOSE_ALL_TABLES.sql`

### Código TypeScript (Completado)
- ✅ `src/hooks/usePermissions.tsx`
- ✅ `src/types/permissions.ts`

### Documentación
- 📖 `APPLY_SYSTEM_ROLES_MIGRATION.md` - Guía de migración
- 📖 `SESSION_TWO_LEVEL_ROLES_COMPLETE_2025-10-23.md` (este archivo)

---

## 🔍 Queries Útiles para Debugging

### Ver todos los roles de un usuario
```sql
SELECT
  'system_role' as source,
  dcr.role_name,
  dcr.dealer_id
FROM dealer_memberships dm
JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
WHERE dm.user_id = '[USER_ID]'

UNION ALL

SELECT
  'dealer_custom_role' as source,
  dcr.role_name,
  dcr.dealer_id
FROM user_custom_role_assignments ucra
JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
WHERE ucra.user_id = '[USER_ID]';
```

### Ver permisos de un role
```sql
SELECT
  dcr.role_name,
  mp.module,
  mp.permission_key,
  mp.display_name
FROM dealer_custom_roles dcr
JOIN role_module_permissions_new rmpn ON rmpn.role_id = dcr.id
JOIN module_permissions mp ON mp.id = rmpn.permission_id
WHERE dcr.role_name = 'user' AND dcr.dealer_id IS NULL
ORDER BY mp.module, mp.permission_key;
```

### Ver módulos activos de un role
```sql
SELECT
  dcr.role_name,
  rma.module,
  rma.is_enabled
FROM dealer_custom_roles dcr
JOIN role_module_access rma ON rma.role_id = dcr.id
WHERE dcr.dealer_id IS NULL
ORDER BY dcr.role_name, rma.module;
```

---

## ⚠️ Notas Importantes

1. **Ejecutar scripts en orden**: La secuencia es crítica
2. **Backup antes de ejecutar**: Siempre haz backup de `dealer_custom_roles` y `dealer_memberships`
3. **Verificar después**: Usa los logs de consola para confirmar que funciona
4. **System roles son globales**: No los modifiques sin entender el impacto
5. **Un usuario = 1 system role + N dealer roles**: Esta es la regla de negocio

---

## 📞 Contacto para Próxima Sesión

**Para continuar**:
1. Ejecuta los 4 scripts SQL en orden
2. Recarga la aplicación (Ctrl+Shift+R)
3. Revisa los logs de consola
4. Comparte los resultados o errores si los hay

**Estado esperado**: ✅ Sin warnings, 2 roles detectados, permisos funcionando correctamente

---

## 🎉 Logros de Esta Sesión

- ✅ Diseñado arquitectura de dos niveles
- ✅ Actualizado código TypeScript completo
- ✅ Creados y corregidos 4 scripts SQL
- ✅ Descubierta estructura real de tablas
- ✅ Resueltos 4 problemas de schema
- ✅ Agregado logging detallado para debugging
- ✅ Documentación completa para continuidad

**Próxima sesión**: Ejecutar scripts + verificar + UI admin (Fase 3)
