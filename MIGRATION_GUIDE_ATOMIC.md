# 🚀 Work Items Status Migration Guide - ATOMIC VERSION

## ⚠️ USAR ESTA VERSIÓN - Soluciona Problemas de ENUM

Esta guía describe la migración **ATÓMICA** del sistema de estados de work items, que resuelve los problemas de límites transaccionales de PostgreSQL ENUM.

---

## 📋 Enfoque Atómico (2 Scripts, Ejecución Secuencial)

### Por Qué Este Enfoque

**Problema Original:**
- PostgreSQL requiere que los valores ENUM se "commiteen" antes de usarlos
- No se puede agregar un valor ENUM y usarlo en la misma transacción
- Los bloques `DO $$` con `ALTER TYPE` dentro pueden no funcionar correctamente

**Solución Atómica:**
1. **Script 1**: Crea columna temporal TEXT → Migra datos → Agrega valores ENUM
2. **Script 2**: Convierte columna temporal a ENUM → Limpia columna temporal

Este enfoque evita el problema de transacciones porque:
- Los datos se migran primero a una columna TEXT (sin restricciones ENUM)
- Los valores ENUM se agregan y commitean
- Finalmente, convertimos TEXT → ENUM (los valores ya existen)

---

## 🎯 Scripts de Migración

### Script 1: `20250123000004_enhance_work_items_ATOMIC_complete.sql`

**Qué hace:**
1. ✅ Crea tabla de backup (`get_ready_work_items_backup_pre_status_migration`)
2. ✅ Agrega 5 nuevas columnas (blocked_reason, on_hold_reason, etc.)
3. ✅ Crea columna temporal `status_temp` (TEXT)
4. ✅ Migra datos a la columna temporal:
   - `pending` + approval_required=true → `awaiting_approval`
   - `pending` + approval_required=false → `ready`
   - `declined` → `rejected`
   - `in_progress` → `in_progress`
   - `completed` → `completed`
5. ✅ Agrega 7 nuevos valores ENUM (awaiting_approval, rejected, ready, scheduled, on_hold, blocked, cancelled)

### Script 2: `20250123000005_enhance_work_items_ATOMIC_finalize.sql`

**Qué hace:**
1. ✅ Verifica que todos los valores ENUM existen
2. ✅ Convierte `status_temp` (TEXT) → `status` (ENUM)
3. ✅ Elimina columna temporal
4. ✅ Crea índices de rendimiento
5. ✅ Muestra estadísticas de migración

---

## 📝 Pre-Migración Checklist

- [ ] **Backup completo de la base de datos**
- [ ] **Notificar al equipo** sobre la migración
- [ ] **Programar ventana de mantenimiento** (5-10 minutos estimados)
- [ ] **Verificar estado actual de work items**

### Verificar Estado Actual

```sql
-- Ejecutar en Supabase SQL Editor para ver estado actual
SELECT
    status,
    approval_required,
    COUNT(*) as count
FROM get_ready_work_items
GROUP BY status, approval_required
ORDER BY status, approval_required;
```

Ejemplo de resultado:
```
status      | approval_required | count
------------|-------------------|------
pending     | true              | 12
pending     | false             | 8
in_progress | false             | 5
completed   | false             | 45
declined    | true              | 3
```

---

## 🚀 Ejecución de la Migración

### Opción A: Dashboard de Supabase (Recomendado)

1. **Ve al SQL Editor**: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new

2. **Ejecuta Script 1**:
   ```
   - Abre: supabase/migrations/20250123000004_enhance_work_items_ATOMIC_complete.sql
   - Copia TODO el contenido
   - Pégalo en el SQL Editor
   - Click "RUN" (botón verde)
   - Espera 30-60 segundos
   ```

   **✅ Mensajes de Éxito Esperados:**
   ```
   NOTICE: ✓ All required ENUM values exist
   Comment on column: status
   ```

3. **Ejecuta Script 2** (inmediatamente después):
   ```
   - Abre: supabase/migrations/20250123000005_enhance_work_items_ATOMIC_finalize.sql
   - Copia TODO el contenido
   - Pégalo en el SQL Editor
   - Click "RUN"
   - Espera 10-20 segundos
   ```

   **✅ Mensajes de Éxito Esperados:**
   ```
   NOTICE: ✓ All required ENUM values exist
   NOTICE: ✓ All records migrated successfully
   NOTICE: ========================================
   NOTICE: ✓ MIGRATION COMPLETED SUCCESSFULLY!
   NOTICE: ========================================
   NOTICE:
   NOTICE: Final Status Distribution:
   NOTICE:   Total Records: X
   NOTICE:   awaiting_approval: X
   NOTICE:   rejected: X
   NOTICE:   ready: X
   NOTICE:   scheduled: 0
   NOTICE:   in_progress: X
   NOTICE:   on_hold: 0
   NOTICE:   blocked: 0
   NOTICE:   completed: X
   NOTICE:   cancelled: 0
   ```

### Opción B: Supabase CLI (Si tienes configurado)

```bash
cd c:/Users/rudyr/apps/mydetailarea

# Ejecutar Script 1
npx supabase db push

# Verificar que completó exitosamente (buscar mensajes NOTICE)

# Ejecutar Script 2
npx supabase db push
```

---

## ✅ Verificación Post-Migración

### 1. Verificar Distribución de Estados

```sql
-- Ver distribución final de estados
SELECT
    status,
    COUNT(*) as count
FROM get_ready_work_items
GROUP BY status
ORDER BY status;
```

**Resultado Esperado:**
```
status              | count
--------------------|------
awaiting_approval   | 12
blocked             | 0
cancelled           | 0
completed           | 45
in_progress         | 5
on_hold             | 0
ready               | 8
rejected            | 3
scheduled           | 0
```

### 2. Verificar Valores ENUM Disponibles

```sql
-- Ver todos los valores ENUM disponibles
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'work_item_status'::regtype
ORDER BY enumsortorder;
```

**Resultado Esperado:**
```
enumlabel
------------------
awaiting_approval
pending
rejected
ready
scheduled
in_progress
on_hold
blocked
completed
declined
cancelled
```

### 3. Verificar Nuevas Columnas

```sql
-- Ver columnas nuevas
SELECT
    id,
    status,
    blocked_reason,
    on_hold_reason,
    cancelled_reason,
    cancelled_by,
    cancelled_at
FROM get_ready_work_items
LIMIT 5;
```

### 4. Verificar Tabla de Backup

```sql
-- Verificar que el backup existe
SELECT COUNT(*) as backup_count
FROM get_ready_work_items_backup_pre_status_migration;
```

---

## 🧪 Testing de la Aplicación

### Pruebas Manuales Requeridas

1. **Login y Acceso**
   - [ ] Login exitoso
   - [ ] Acceso al módulo Get Ready
   - [ ] Lista de vehículos carga correctamente

2. **Visualización de Work Items**
   - [ ] Work items se muestran correctamente
   - [ ] Badges de estado se muestran con colores correctos
   - [ ] Agrupación por estado funciona

3. **Transiciones de Estado** (CRÍTICO)
   - [ ] Crear nuevo work item → `awaiting_approval` o `ready`
   - [ ] Aprobar work item → `ready`
   - [ ] Rechazar work item → `rejected`
   - [ ] Iniciar work item → `in_progress`
   - [ ] Pausar work item → `on_hold` (con razón)
   - [ ] Reanudar work item → `in_progress`
   - [ ] Bloquear work item → `blocked` (con razón)
   - [ ] Desbloquear work item → `in_progress`
   - [ ] Completar work item → `completed`
   - [ ] Cancelar work item → `cancelled` (con razón)

4. **Funcionalidad de Búsqueda y Filtros**
   - [ ] Buscar por VIN funciona
   - [ ] Filtrar por estado funciona
   - [ ] Filtrar por fecha funciona

5. **Real-time Updates**
   - [ ] Cambios de estado se reflejan en tiempo real
   - [ ] Múltiples usuarios ven los mismos cambios

---

## 🔄 Rollback (Si es Necesario)

### Si la Migración Falla o Hay Problemas

```sql
-- 1. Restaurar estados desde backup
UPDATE get_ready_work_items wi
SET
    status = backup.status::work_item_status,
    updated_at = NOW()
FROM get_ready_work_items_backup_pre_status_migration backup
WHERE wi.id = backup.id;

-- 2. Eliminar nuevas columnas
ALTER TABLE get_ready_work_items
DROP COLUMN IF EXISTS blocked_reason,
DROP COLUMN IF EXISTS on_hold_reason,
DROP COLUMN IF EXISTS cancelled_reason,
DROP COLUMN IF EXISTS cancelled_by,
DROP COLUMN IF EXISTS cancelled_at,
DROP COLUMN IF EXISTS status_temp;

-- 3. Eliminar índices nuevos
DROP INDEX IF EXISTS idx_get_ready_work_items_status;
DROP INDEX IF EXISTS idx_get_ready_work_items_cancelled;
DROP INDEX IF EXISTS idx_get_ready_work_items_blocked;

-- 4. Verificar rollback
SELECT status, COUNT(*) as count
FROM get_ready_work_items
GROUP BY status;
```

**⚠️ IMPORTANTE:** No se pueden eliminar valores ENUM fácilmente en PostgreSQL. Los valores nuevos permanecerán en el tipo, pero no se usarán.

---

## 🧹 Limpieza (Después de 30 Días)

Si la migración es exitosa y no hay problemas después de 30 días:

```sql
-- Eliminar tabla de backup
DROP TABLE IF EXISTS get_ready_work_items_backup_pre_status_migration;

-- (Opcional) Eliminar valores ENUM antiguos si no se usan
-- NOTA: Esto es complejo en PostgreSQL y no es estrictamente necesario
-- Los valores 'pending' y 'declined' pueden permanecer sin uso
```

---

## 📊 Monitoreo Post-Migración

### Semana 1: Monitoreo Intensivo

- Revisar logs de errores diariamente
- Verificar reportes de usuarios sobre problemas
- Monitorear performance de queries

### Semana 2-4: Monitoreo Normal

- Revisar logs semanalmente
- Verificar que todas las transiciones de estado funcionan correctamente
- Confirmar que no hay errores relacionados con estados

### Día 30: Revisión Final

- [ ] Sin errores reportados relacionados con estados
- [ ] Todas las transiciones funcionan correctamente
- [ ] Performance es aceptable
- [ ] Proceder con limpieza de backup (opcional)

---

## 🆘 Troubleshooting

### Error: "invalid input value for enum work_item_status"

**Causa:** Los valores ENUM no se agregaron correctamente en el Script 1.

**Solución:**
1. Verificar que Script 1 se ejecutó completamente
2. Ejecutar consulta de verificación:
   ```sql
   SELECT enumlabel FROM pg_enum WHERE enumtypid = 'work_item_status'::regtype;
   ```
3. Si faltan valores, ejecutar Script 1 nuevamente

### Error: "Missing ENUM values"

**Causa:** Script 2 se ejecutó antes de que Script 1 completara.

**Solución:**
1. Esperar unos segundos
2. Ejecutar Script 2 nuevamente

### Error: "column status_temp already exists"

**Causa:** Script 1 se ejecutó parcialmente.

**Solución:**
```sql
-- Eliminar columna temporal y reintentar
ALTER TABLE get_ready_work_items DROP COLUMN IF EXISTS status_temp;
-- Luego ejecutar Script 1 nuevamente
```

---

## 📞 Contacto y Soporte

Si encuentras problemas durante la migración:

1. **Revisar logs en Supabase Dashboard** → Logs → Database
2. **Verificar estado actual de la tabla** con las queries de verificación
3. **Considerar rollback** si los problemas son críticos
4. **Documentar el error** con screenshots y logs para análisis

---

## ✅ Checklist Final

- [ ] Script 1 ejecutado exitosamente
- [ ] Script 2 ejecutado exitosamente
- [ ] Valores ENUM verificados
- [ ] Distribución de estados verificada
- [ ] Backup table existe
- [ ] Aplicación testeada manualmente
- [ ] Todas las transiciones de estado funcionan
- [ ] Real-time updates funcionan
- [ ] Equipo notificado del éxito
- [ ] Monitoreo configurado para próximos 30 días

---

**Última actualización:** 2025-01-23
**Versión:** 2.0.0 (Atomic Migration)
