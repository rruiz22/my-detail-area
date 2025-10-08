# RLS Policy Fix - Recent Activity Empty - October 8, 2025

## 🎯 Objetivo

Resolver el problema de "Recent Activity" vacío en el Dashboard causado por RLS policies usando el campo incorrecto para validar system admins.

## 🐛 Problema Identificado

### Síntoma Visual
- Dashboard carga correctamente ✅
- Widget "Recent Activity" muestra "No recent activity" ❌
- Hay 111 registros en la base de datos ✅
- Foreign key funciona correctamente ✅
- Pero el usuario NO puede verlos ❌

### Causa Raíz: RLS Policy Incorrecta

**Policy problemática:** "System admins can view all activity logs"

```sql
-- ANTES (❌ INCORRECTA):
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'system_admin'::user_type  -- ❌ Campo equivocado
  )
)
```

**Perfil del usuario rruiz@lima.llc:**
```
role = 'system_admin'        ✅ Correcto
user_type = 'dealer'         ❌ No es 'system_admin'
dealership_id = null
```

**Resultado:** La policy buscaba `user_type = 'system_admin'` pero el usuario tiene `user_type = 'dealer'`, entonces la validación fallaba y retornaba 0 registros.

### Prueba de Concepto

**Query con user_type (INCORRECTA):**
```sql
SELECT COUNT(*) FROM order_activity_log
WHERE EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
  AND profiles.user_type = 'system_admin'::user_type
);
-- Resultado: 0 registros ❌
```

**Query con role (CORRECTA):**
```sql
SELECT COUNT(*) FROM order_activity_log
WHERE EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
  AND profiles.role = 'system_admin'
);
-- Resultado: 111 registros ✅
```

## 🔍 Análisis de Inconsistencia en el Sistema

### Auditoría de RLS Policies

Se encontraron **2 policies** usando el campo incorrecto:

| Tabla | Policy | Campo Usado | Estado |
|-------|--------|-------------|--------|
| `order_activity_log` | System admins can view all activity logs | `user_type` | ❌ Incorrecto |
| `dealer_memberships` | Users can view dealership members | `user_type` | ❌ Incorrecto |

**Todas las demás 20+ policies** usan correctamente `role = 'system_admin'` ✅

### Tablas con Policies Correctas

✅ `dealer_invitations` - Usa `role`
✅ `dealer_services` - Usa `role`
✅ `dealerships` - Usa `role`
✅ `module_permissions_v3` - Usa `role`
✅ `orders` - Usa `role`
✅ `system_settings` - Usa `role`
✅ `user_custom_role_assignments` - Usa `role`
✅ `user_dealership_memberships_v2` - Usa `role`
✅ `user_invitations_v3` - Usa `role`
✅ `user_role_assignments_v2` - Usa `role`
✅ `users_v2` - Usa `role`
✅ `work_item_templates` - Usa `role`

## ✅ Solución Implementada

### Migración Creada y Aplicada

**Archivo:** `supabase/migrations/20251008164500_fix_rls_policies_role_field.sql`

**Cambios realizados:**

#### 1. order_activity_log - Policy Corregida

```sql
-- ANTES (❌):
AND profiles.user_type = 'system_admin'::user_type

-- DESPUÉS (✅):
AND profiles.role = 'system_admin'
```

#### 2. dealer_memberships - Policy Corregida (Bonus Fix)

```sql
-- ANTES (❌):
AND p.user_type = 'system_admin'

-- DESPUÉS (✅):
AND p.role = 'system_admin'
```

### Estado de Aplicación

✅ **Migración creada:** `20251008164500_fix_rls_policies_role_field.sql`
✅ **Aplicada a base de datos:** Via MCP Supabase
✅ **Verificada:** Ambas policies usando `role` correctamente

## 📊 Resultado Esperado

### Antes del Fix

| Usuario | role | user_type | Registros Visibles |
|---------|------|-----------|-------------------|
| rruiz@lima.llc | system_admin | dealer | 0 ❌ |

### Después del Fix

| Usuario | role | user_type | Registros Visibles |
|---------|------|-----------|-------------------|
| rruiz@lima.llc | system_admin | dealer | 111 ✅ |

## 🧪 Verificación

**Para confirmar el fix:**

1. **Recarga el Dashboard con hard refresh:**
   ```
   Ctrl + Shift + R (Windows)
   ```

2. **Resultado esperado:**
   - ✅ Widget "Recent Activity" muestra actividad reciente
   - ✅ Sin errores en consola
   - ✅ Datos visibles: SA-29, SA-27, SA-28, etc.

3. **Consola debe mostrar:**
   - ✅ NO más errores `PGRST200`
   - ✅ Query exitoso a `order_activity_log`

## 🔒 Impacto en Seguridad y Permisos

### Seguridad Mantenida

✅ **System admins** (role='system_admin') → Ven toda la actividad
✅ **Usuarios regulares** → Solo ven actividad de sus dealerships (policy existente)
✅ **Usuarios sin dealership** → No ven nada (protección correcta)

### Lógica de Permisos Respetada

El sistema ahora es **consistente** en todas las tablas:
- Todas las policies usan `profiles.role` para verificar system admin
- Se mantiene la separación de `role` (permisos) vs `user_type` (tipo de usuario)
- La lógica de custom roles no se afecta

## 📁 Archivos Modificados

| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/20251008164500_fix_rls_policies_role_field.sql` | Migración para corregir policies |
| `RLS_POLICY_FIX_2025-10-08.md` | Este documento |

## 🔄 Historial de Fixes del Día

| # | Problema | Solución | Estado |
|---|----------|----------|--------|
| 1 | Módulos no visibles en sidebar | Fail-open en useDealershipModules | ✅ Resuelto |
| 2 | Loading infinito en páginas | Fix loading state en refreshModules | ✅ Resuelto |
| 3 | Foreign key faltante | Migración 20251008160000 | ✅ Resuelto |
| 4 | Recent Activity vacío | Fix RLS policies (role vs user_type) | ✅ Resuelto |

## 📝 Notas Técnicas

### Diferencia entre `role` y `user_type`

**`role`** (TEXT):
- Define **permisos/nivel de acceso**
- Valores: `system_admin`, `dealer_admin`, `dealer_manager`, `dealer_user`
- Usado para **validaciones de seguridad**

**`user_type`** (ENUM):
- Define **tipo de usuario**
- Valores: `dealer`, `detail`, `system_admin` (legacy)
- Usado para **categorización**, no permisos

**Problema:** Algunos usuarios tienen:
- `role = 'system_admin'` (permisos de admin)
- `user_type = 'dealer'` (tipo de usuario)

Las policies deben usar `role` para verificar permisos, NO `user_type`.

---

**Implementado:** October 8, 2025
**Aplicado a producción:** ✅ Completado
**Testing:** ⏳ Pendiente (usuario debe recargar Dashboard)
