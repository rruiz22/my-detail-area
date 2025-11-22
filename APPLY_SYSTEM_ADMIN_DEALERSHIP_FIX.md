# Fix System Admin Dealership Access

## 🚨 Problema

Los usuarios `system_admin` (como `rruiz@lima.llc`) no ven TODOS los dealerships en el filtro global del top bar. Solo ven dealerships donde tienen membership explícito.

Esto causa que nuevos dealerships creados (como "Audi Natick") NO aparezcan en el filtro global para system admins.

## 🔍 Causa Raíz

La función `get_user_accessible_dealers()` solo retorna dealerships donde el usuario tiene un `dealer_membership` activo:

```sql
-- CÓDIGO ACTUAL (INCORRECTO para system_admin)
SELECT d.*
FROM dealerships d
INNER JOIN dealer_memberships dm
  ON dm.dealer_id = d.id
  AND dm.user_id = user_uuid
  AND dm.is_active = true
```

Para `system_admin`, esto NO funciona porque:
- System admins **NO tienen memberships explícitos** en cada dealership
- Se supone que tienen **acceso global a TODOS los dealerships**
- Esto es diferente a otros roles que sí necesitan memberships

## ✅ Solución

Modificar `get_user_accessible_dealers()` para:

1. **Verificar si el usuario es `system_admin`** (chequeando `profiles.user_type`)
2. **Si es system_admin**: Retornar TODOS los dealerships activos
3. **Si es usuario regular**: Retornar solo dealerships con membership activo (comportamiento actual)

## 📋 Pasos para Aplicar el Fix

### 1. Abrir Supabase SQL Editor

1. Ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Click en **SQL Editor** en el menú lateral izquierdo
3. Click en **New query** (botón verde)

### 2. Copiar y Ejecutar la Migración

**Abre el archivo**: `supabase/migrations/20251122000002_fix_get_user_accessible_dealers_system_admin.sql`

**Copia TODO el contenido** (aproximadamente 110 líneas de código SQL)

**Pega en el SQL Editor** y haz click en **Run** (o presiona `Ctrl + Enter`)

### 3. Verificar que se Aplicó Correctamente

Después de ejecutar, corre esta verificación en el mismo SQL Editor:

```sql
-- Test como system_admin (reemplaza con tu UUID real)
SELECT id, name, status
FROM get_user_accessible_dealers('c01ba9e6-f638-4f02-a7fb-e5e7b95cf1c2'::uuid);
```

**Resultado esperado**: Deberías ver **TODOS** los dealerships activos, incluyendo:
- Land Rover of Sudbury
- Admin Dealership
- Bmw of Sudbury
- **Audi Natick** ⭐ (el nuevo)

### 4. Probar en la Aplicación

1. **Refresca la página** (F5)
2. Mira el **filtro global del top bar** (selector de dealerships)
3. ✅ Deberías ver "Audi Natick" en la lista

### 5. Probar Crear Invitación

1. Ve a la página de "Audi Natick" (`/admin/11`)
2. Click en la pestaña **"Users"**
3. Click en **"Invite User"**
4. El modal debería mostrar **"Invite user to Audi Natick"** (no "Dealership #11")

## 📊 Cambios Realizados

### Antes (Problema)

```sql
CREATE FUNCTION get_user_accessible_dealers(user_uuid uuid)
...
BEGIN
  -- SIEMPRE usa INNER JOIN con dealer_memberships
  RETURN QUERY
  SELECT d.*
  FROM dealerships d
  INNER JOIN dealer_memberships dm
    ON dm.dealer_id = d.id
    AND dm.user_id = user_uuid
    AND dm.is_active = true;
END;
```

**Problema**: System admins no tienen memberships, entonces NO ven dealerships nuevos.

### Después (Solución)

```sql
CREATE FUNCTION get_user_accessible_dealers(user_uuid uuid)
...
DECLARE
  is_system_admin boolean;
BEGIN
  -- 1. Verificar si es system_admin
  SELECT (user_type = 'system_admin')
  INTO is_system_admin
  FROM profiles
  WHERE id = user_uuid;

  -- 2. System admins ven TODO
  IF is_system_admin THEN
    RETURN QUERY
    SELECT d.*
    FROM dealerships d
    WHERE d.status = 'active'
      AND d.deleted_at IS NULL;

  -- 3. Usuarios regulares ven solo sus memberships
  ELSE
    RETURN QUERY
    SELECT d.*
    FROM dealerships d
    INNER JOIN dealer_memberships dm ...;
  END IF;
END;
```

**Solución**: System admins ven TODOS los dealerships activos automáticamente.

## 🔐 Seguridad

**¿Es seguro dar acceso global a system_admin?**

✅ **Sí**, porque:

1. **Ya tienen permisos de lectura global**: Los RLS policies ya permiten `user_type = 'system_admin'` leer TODO
2. **Rol especial**: System admin es el rol más alto del sistema (equivalente a superuser)
3. **No crea memberships automáticamente**: Solo retorna la LISTA de dealerships para el filtro
4. **Consistente con otros RLS**: Todos los policies ya permiten system_admin acceder a todo

## 🎯 Resultado Final

✅ **System admins ven TODOS los dealerships** en filtro global
✅ **Nuevos dealerships aparecen inmediatamente** en la lista (después de refresh)
✅ **Modal de invitación muestra nombre correcto** ("Audi Natick" en lugar de "Dealership #11")
✅ **Usuarios regulares NO afectados** (siguen viendo solo sus dealerships con membership)

## 🚨 Troubleshooting

### El filtro global aún no muestra el nuevo dealership

1. **Refresca la página** (F5) - El cache de TanStack Query puede tener data vieja
2. **Verifica que aplicaste la migración** - Ejecuta la query de verificación del paso 3
3. **Limpia localStorage**:
   ```javascript
   // En DevTools Console
   localStorage.removeItem('dealerships-cache');
   location.reload();
   ```

### La función no se actualizó correctamente

Si ves error `function already exists`, ejecuta primero:

```sql
DROP FUNCTION IF EXISTS get_user_accessible_dealers(uuid);
```

Luego vuelve a ejecutar la migración completa.

### Quiero verificar mi user_type

```sql
SELECT id, email, user_type
FROM profiles
WHERE email = 'rruiz@lima.llc';
```

Debería retornar:
```
user_type = 'system_admin'
```

---

**Fecha**: 2025-11-22
**Status**: ⏳ Pendiente de aplicar manualmente
**Prioridad**: 🔴 Alta (afecta experiencia de system_admin)
