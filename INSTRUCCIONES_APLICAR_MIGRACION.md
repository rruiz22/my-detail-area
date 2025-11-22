# 📋 Instrucciones para Aplicar Migración RLS

## 🎯 Objetivo

Permitir que **system_admin** pueda crear custom roles sin errores de RLS.

---

## 📝 Paso 1: Abrir Supabase SQL Editor

1. Ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Click en **SQL Editor** en el menú lateral izquierdo
3. Click en **New query** (botón verde)

---

## 📋 Paso 2: Copiar y Ejecutar la Migración

**Abre el archivo**: `supabase/migrations/20251122000001_fix_role_notification_trigger_rls.sql`

**Copia TODO el contenido** (aproximadamente 170 líneas de código SQL)

**Pega en el SQL Editor** y haz click en **Run** (o presiona `Ctrl + Enter`)

---

## ✅ Paso 3: Verificar que se Aplicó Correctamente

Después de ejecutar, corre esta verificación en el mismo SQL Editor:

```sql
-- 1. Verificar que la función tiene SECURITY DEFINER
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'create_default_notification_events_for_role';
```

**Resultado esperado**:
```
function_name                              | is_security_definer
-------------------------------------------|--------------------
create_default_notification_events_for_role | t
```

Si ves `t` (true) en la columna `is_security_definer`, ✅ **está correcto**.

---

## 🧪 Paso 4: Probar Creación de Custom Role

1. Ve a `/admin` en tu aplicación
2. Selecciona el nuevo dealership que creaste
3. Click en la pestaña **"Roles"**
4. Click en **"Create Custom Role"**
5. Completa:
   - Display Name: `Test Manager`
   - Role Name: `test_manager`
   - Description: `Testing role creation`
6. Click **"Create Role"**

**Resultado esperado**: ✅ El role se crea sin errores

---

## 🔍 Paso 5: Verificar que los Eventos se Crearon

En el SQL Editor, ejecuta:

```sql
-- Reemplaza <ROLE_ID> con el ID del role que acabas de crear
SELECT
  module,
  event_type,
  enabled
FROM role_notification_events
WHERE role_id = '<ROLE_ID>'
ORDER BY module, event_type;
```

**Resultado esperado**: Deberías ver **36 filas** (9 eventos × 4 módulos)

---

## 🚨 Troubleshooting

### Error: "relation already exists"

Si ves este error, significa que parte de la migración ya fue aplicada. Ejecuta solo la parte de `SECURITY DEFINER`:

```sql
CREATE OR REPLACE FUNCTION create_default_notification_events_for_role(
  p_role_id UUID,
  p_role_name TEXT,
  p_module TEXT
) RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
-- (copia el resto del código desde la línea 45 hasta el final de la migración)
```

### Error: "permission denied"

Asegúrate de estar usando una API key con permisos de administrador en Supabase Dashboard.

### El role se crea pero sin eventos

Ejecuta manualmente:

```sql
SELECT create_default_notification_events_for_role(
  '<ROLE_ID>'::uuid,
  'test_manager',
  'sales_orders'
);
```

---

## ✅ Confirmación Final

Si todo está correcto, deberías poder:

1. ✅ Crear custom roles como system_admin
2. ✅ Los eventos de notificación se crean automáticamente
3. ✅ No hay errores de RLS
4. ✅ El nuevo dealership aparece en el filtro global

---

**Última actualización**: 2025-11-22
**Aplicado**: ⏳ Pendiente
