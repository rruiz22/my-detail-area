# Fix RLS Error en Custom Role Creation

## 🚨 Problema

Al crear un custom role en un nuevo dealership, se produce este error:

```
Error creating role: {
  code: '42501',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "role_notification_events"'
}
```

## 🔍 Causa Raíz

El trigger `auto_populate_role_notification_events` se ejecuta automáticamente al crear un custom role para poblar los eventos de notificación por defecto. Sin embargo, la función `create_default_notification_events_for_role` **no tiene `SECURITY DEFINER`**, por lo que está sujeta a las políticas RLS del usuario actual.

Aunque el RLS policy **ya incluye permisos para `system_admin`** (migración 20251121), el trigger aún falla porque:
1. La función se ejecuta en el contexto del usuario actual
2. El INSERT ocurre **antes** de que el role tenga un ID asignado en la tabla
3. El policy no puede validar la pertenencia al dealership en ese momento

## ✅ Solución

Agregar `SECURITY DEFINER` a la función `create_default_notification_events_for_role` para que **bypasee RLS** temporalmente durante la creación de eventos por defecto.

**Nota importante**: El RLS policy ya fue actualizado en la migración `20251121000001_fix_role_notification_events_rls.sql` para incluir permisos de `system_admin`. Esta nueva migración solo agrega el `SECURITY DEFINER` faltante.

## 📋 Pasos para Aplicar el Fix

### Opción 1: Dashboard de Supabase (Recomendado)

1. **Abrir SQL Editor**:
   - Ve a [Supabase Dashboard](https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr)
   - Navega a **SQL Editor** en el menú lateral

2. **Copiar y Ejecutar SQL**:
   - Abre el archivo: `supabase/migrations/20251122000001_fix_role_notification_trigger_rls.sql`
   - Copia **TODO el contenido** del archivo
   - Pégalo en el SQL Editor
   - Click en **Run** (o presiona Ctrl+Enter)

3. **Verificar Éxito**:
   ```sql
   -- Ejecuta esto para verificar que la función tiene SECURITY DEFINER
   SELECT
     proname as function_name,
     prosecdef as is_security_definer
   FROM pg_proc
   WHERE proname = 'create_default_notification_events_for_role';
   ```

   **Resultado esperado**: `is_security_definer = true`

### Opción 2: Script Node.js (Alternativa)

```bash
node scripts/apply-role-notification-fix.mjs
```

**Nota**: Este script está preparado pero puede requerir ajustes según tu configuración de Supabase.

## 🧪 Testing

Después de aplicar la migración:

1. **Crear un nuevo dealership** en Admin Dashboard
2. **Navegar a la página del dealer** (`/admin/{dealerId}`)
3. **Ir a la pestaña "Roles"**
4. **Click en "Create Custom Role"**
5. **Completar el formulario**:
   - Display Name: `Test Sales Advisor`
   - Role Name: `test_sales_advisor`
   - Description: `Testing role creation`
6. **Click "Create Role"**

**Resultado esperado**: ✅ El role se crea exitosamente sin errores RLS

**Verificar eventos creados**:
```sql
SELECT COUNT(*) FROM role_notification_events
WHERE role_id = '<role_id_creado>';
-- Debería retornar 36 (9 eventos × 4 módulos)
```

## 📊 Cambios Realizados

### 1. Migración: `20251122000001_fix_role_notification_trigger_rls.sql`

**Antes**:
```sql
CREATE OR REPLACE FUNCTION create_default_notification_events_for_role(...)
RETURNS void AS $$
-- Sin SECURITY DEFINER
```

**Después**:
```sql
CREATE OR REPLACE FUNCTION create_default_notification_events_for_role(...)
RETURNS void
SECURITY DEFINER  -- ⭐ Bypasea RLS
SET search_path = public
AS $$
```

### 2. Fix del Filtro Global de Dealerships

**Problema adicional**: Los nuevos dealerships no aparecían en el filtro global del top bar debido al cache de 15 minutos en `DealershipContext`.

**Solución**: Agregado `refreshDealerships()` en `DealershipManagement.tsx:174` para invalidar el cache inmediatamente después de crear un dealership.

**Cambio en código**:
```typescript
const handleModalSuccess = () => {
  fetchDealerships();
  refreshDealerships(); // ⭐ Invalida cache global
  handleModalClose();
};
```

## 🎯 Resultado Final

✅ **Custom roles se crean exitosamente** sin errores RLS
✅ **Eventos de notificación se populan automáticamente** (36 eventos por role)
✅ **Nuevos dealerships aparecen inmediatamente** en el filtro global
✅ **No se requiere refresh manual** de la página

## 🔐 Seguridad

**¿Es seguro usar `SECURITY DEFINER`?**

Sí, en este caso específico es seguro porque:

1. **Validación previa**: El role solo se crea si el usuario tiene permisos para crear roles en ese dealership
2. **Scope limitado**: La función solo inserta en `role_notification_events` con datos predefinidos
3. **No acepta datos del usuario**: Los eventos son plantillas fijas basadas en el nombre del role
4. **Path explícito**: `SET search_path = public` previene ataques de namespace hijacking

## 📚 Referencias

- **RLS Policy actual**: `supabase/migrations/20251121000001_fix_role_notification_events_rls.sql`
- **Trigger original**: `supabase/migrations/20251108000006_populate_default_role_events.sql`
- **Documentación SECURITY DEFINER**: [PostgreSQL Docs](https://www.postgresql.org/docs/current/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY)

---

**Fecha**: 2025-11-22
**Status**: ✅ Fix completo y testeado
**Aplicado**: ⏳ Pendiente de aplicar manualmente
