# Sistema de Roles de Dos Niveles - Guía de Migración

## 📋 Resumen

Esta migración implementa un sistema de roles de dos niveles:

1. **System Roles** (globales): `user`, `manager`, `system_admin` - con `dealer_id = NULL`
2. **Dealer Custom Roles** (específicos): `used_car_manager`, `service_manager`, etc. - con `dealer_id = [ID]`

## ⚠️ ORDEN DE EJECUCIÓN IMPORTANTE

**Debes ejecutar estos scripts en el SQL Editor de Supabase en este orden exacto:**

### 1️⃣ MIGRATE_DEALER_CUSTOM_ROLES_ALLOW_NULL.sql

**Qué hace**: Modifica el esquema de la tabla `dealer_custom_roles` para permitir valores `NULL` en la columna `dealer_id`.

**Por qué es necesario**: Los system roles se identifican por tener `dealer_id = NULL`, pero actualmente la columna tiene restricción `NOT NULL`.

```sql
-- Ejecuta este archivo completo en el SQL Editor
```

**Resultado esperado**:
```
✅ ALTER TABLE
✅ CREATE UNIQUE INDEX
✅ COMMENT
```

---

### 2️⃣ CREATE_SYSTEM_ROLES.sql

**Qué hace**: Crea los tres system roles globales:
- `user` - Usuario básico de dealer
- `manager` - Gestor de sistema (puede administrar dealers y configuraciones globales)
- `system_admin` - Administrador total del sistema

**Resultado esperado**:
```
INSERT 0 1 (para cada role)

Luego mostrará:
id | role_name | display_name | dealer_id | is_active
---+-----------+--------------+-----------+----------
...| user      | User         | NULL      | true
...| manager   | Manager      | NULL      | true
...| system_admin | System Admin | NULL   | true
```

---

### 3️⃣ CONFIGURE_SYSTEM_ROLE_PERMISSIONS.sql

**Qué hace**: Configura los permisos granulares para cada system role:

- **user**: Solo permisos de vista en módulos básicos (dashboard, orders, etc.)
- **manager**: Permisos completos en TODOS los módulos

**NOTA**: Este script usa las tablas `module_permissions` y `role_module_permissions_new` con una relación via `permission_id` (foreign key a `module_permissions.id`).

**Resultado esperado**:
```
NOTICE: Configuring permissions for user role: [uuid]
NOTICE: Configuring permissions for manager role: [uuid]
NOTICE: User role: Added view permissions for 9 modules
NOTICE: Manager role: Added full permissions for 13 modules
NOTICE: Manager role: Enabled all 13 modules
NOTICE: User role: Enabled 9 basic modules
NOTICE: ✅ System role permissions configured successfully

Luego mostrará resumen de permisos por role
```

---

### 4️⃣ UPDATE_USER_SYSTEM_ROLE.sql

**Qué hace**: Actualiza `dealer_memberships.custom_role_id` para usar el nuevo role "user" en lugar de "sales_manager" (dealer-specific).

**Resultado esperado**:
```
-- Primera query: Muestra estado actual (antes)
-- Segunda query: UPDATE X (número de usuarios actualizados)
-- Tercera query: Muestra usuarios con system roles (después)
-- Cuarta query: Resumen de categorías
```

Deberías ver tu usuario con `system_role = 'user'` y `validation = '✅ System Role'`

---

## ✅ Verificación Post-Migración

### En el navegador (consola de desarrollo)

Después de ejecutar los 4 scripts, **recarga la aplicación** y revisa los logs:

**ANTES** (estado actual):
```javascript
⚠️ Invalid system role assignment - dealer_id should be NULL for system roles: sales_manager (dealer_id: 5)
📋 Found 1 total role(s) for user
   - Dealer custom roles: 1
   - System role: 0
```

**DESPUÉS** (estado esperado):
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
    dealer_id: null
  }
]
```

El warning **⚠️ Invalid system role assignment** debe desaparecer completamente.

---

## 🔧 SQL de Diagnóstico

Si algo no funciona, ejecuta este query para diagnosticar:

```sql
-- Ver todos los roles del sistema
SELECT
  id,
  dealer_id,
  role_name,
  display_name,
  CASE
    WHEN dealer_id IS NULL THEN '✅ System Role'
    ELSE 'Dealer Role'
  END as type
FROM dealer_custom_roles
ORDER BY dealer_id NULLS FIRST, role_name;

-- Ver asignaciones de tu usuario
SELECT
  'dealer_memberships' as source,
  dm.user_id,
  p.email,
  dcr.role_name,
  dcr.dealer_id,
  CASE
    WHEN dcr.dealer_id IS NULL THEN '✅ System Role'
    ELSE '⚠️ Should be NULL'
  END as validation
FROM dealer_memberships dm
JOIN profiles p ON p.id = dm.user_id
LEFT JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
WHERE p.email = 'tu-email@example.com'

UNION ALL

SELECT
  'user_custom_role_assignments' as source,
  ucra.user_id,
  p.email,
  dcr.role_name,
  dcr.dealer_id,
  CASE
    WHEN dcr.dealer_id IS NOT NULL THEN '✅ Dealer Role'
    ELSE '⚠️ Should have dealer_id'
  END as validation
FROM user_custom_role_assignments ucra
JOIN profiles p ON p.id = ucra.user_id
LEFT JOIN dealer_custom_roles dcr ON dcr.id = ucra.custom_role_id
WHERE p.email = 'tu-email@example.com'
ORDER BY source, role_name;
```

---

## 🎯 Siguiente Paso

Una vez completada la migración, el sistema estará listo para:

1. ✅ Gestionar roles globales del sistema
2. ✅ Asignar roles específicos por dealer
3. ✅ Combinar permisos de ambos tipos de roles
4. 🔜 **Phase 3**: Crear UI para administrar system roles

---

## 🆘 Troubleshooting

### Error: "null value violates not-null constraint"
**Causa**: No ejecutaste el script #1 primero
**Solución**: Ejecuta `MIGRATE_DEALER_CUSTOM_ROLES_ALLOW_NULL.sql`

### Error: "duplicate key value violates unique constraint"
**Causa**: Los roles ya existen
**Solución**: Normal, el script usa `ON CONFLICT DO NOTHING`

### Los logs siguen mostrando "Invalid system role"
**Causa**: El role actual en `dealer_memberships` todavía tiene `dealer_id != NULL`
**Solución**: Ejecuta el script #4 (`UPDATE_USER_SYSTEM_ROLE.sql`)

### No veo el system role en los logs
**Causa**: La aplicación está cacheando el estado anterior
**Solución**:
1. Recarga la página (Ctrl+R o Cmd+R)
2. Si persiste, abre una ventana de incógnito
3. Limpia localStorage y recarga
