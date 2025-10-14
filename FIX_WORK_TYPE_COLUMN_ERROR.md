# Fix: Work Type Column Error

## Problema

Al intentar mover un vehículo entre pasos en el módulo Get Ready, aparece el siguiente error:

```
column "work_type" is of type work_item_type but expression is of type character varying
```

## Causa

La tabla `get_ready_vehicles` tiene una columna `work_type` que no debería existir. Esta columna solo debe estar en la tabla `get_ready_work_items`.

La presencia de esta columna incorrecta está causando conflictos de tipo de datos cuando se actualizan vehículos.

## Solución

### Opción 1: Script Automatizado (Recomendado)

Ejecuta el script que hemos creado:

```bash
node scripts/fix_work_type_column.js
```

Este script:
1. Lee la migración `20251014000000_remove_work_type_from_vehicles.sql`
2. La aplica a tu base de datos de Supabase
3. Elimina la columna `work_type` de `get_ready_vehicles`

### Opción 2: Supabase Dashboard

Si el script falla, puedes ejecutar manualmente en el Supabase Dashboard:

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Ejecuta el siguiente comando:

```sql
-- Eliminar la columna work_type de get_ready_vehicles
ALTER TABLE public.get_ready_vehicles DROP COLUMN IF EXISTS work_type;
```

## Verificación

Después de aplicar la solución:

1. ✅ **Prueba mover un vehículo entre pasos** en el módulo Get Ready
2. ✅ **Verifica que no aparezcan errores** en la consola
3. ✅ **Confirma que los work items** siguen funcionando correctamente

## Estructura Correcta

### `get_ready_vehicles` (NO debe tener `work_type`)
- ✅ `stock_number`
- ✅ `vin`
- ✅ `step_id` (paso actual del vehículo)
- ✅ `workflow_type` (standard, express, priority)
- ✅ `priority` (low, normal, medium, high, urgent)
- ❌ ~~`work_type`~~ (NO DEBE EXISTIR AQUÍ)

### `get_ready_work_items` (SÍ debe tener `work_type`)
- ✅ `vehicle_id`
- ✅ `title`
- ✅ `work_type` (mechanical, body_repair, detailing, etc.)
- ✅ `status` (pending, in_progress, completed, declined)

## Notas Técnicas

- El `work_type` es un ENUM de tipo `work_item_type`
- Este ENUM solo aplica a work items individuales, no a vehículos completos
- La columna fue probablemente agregada por error en algún punto
- Esta migración limpia la base de datos sin afectar funcionalidad existente

## Soporte

Si encuentras problemas adicionales después de aplicar esta solución, revisa:

1. Los logs de la consola del navegador
2. Los logs de Supabase (Dashboard > Logs)
3. Las políticas RLS de las tablas involucradas
