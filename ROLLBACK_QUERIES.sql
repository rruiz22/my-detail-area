-- =====================================================
-- ROLLBACK QUERIES - BACKUP DE SEGURIDAD
-- =====================================================
-- Creado: 2025-11-24
-- Propósito: Queries para revertir cambios si es necesario
-- =====================================================

-- =====================================================
-- 1. BACKUP: Ver estado ANTES del fix
-- =====================================================

-- 1.1 Ver todos los registros que serán modificados
SELECT
  te.id AS time_entry_id,
  te.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  te.clock_in,
  te.clock_out,
  te.status,
  te.punch_in_method,
  te.punch_out_method,
  te.notes
FROM detail_hub_time_entries te
JOIN detail_hub_employees e ON e.id = te.employee_id
WHERE te.status = 'active' AND te.clock_out IS NULL
ORDER BY te.employee_id, te.clock_in DESC;

-- 1.2 Backup completo de entradas activas (para restaurar si es necesario)
CREATE TABLE IF NOT EXISTS detail_hub_time_entries_backup_20251124 AS
SELECT * FROM detail_hub_time_entries
WHERE status = 'active' AND clock_out IS NULL;

-- Verificar backup creado
SELECT COUNT(*) AS backed_up_entries
FROM detail_hub_time_entries_backup_20251124;

-- =====================================================
-- 2. ROLLBACK PARCIAL: Revertir solo los duplicados cerrados
-- =====================================================

-- 2.1 Identificar entradas cerradas automáticamente (después del fix)
SELECT
  te.id AS time_entry_id,
  te.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  te.clock_in,
  te.clock_out,
  te.punch_out_method,
  te.notes
FROM detail_hub_time_entries te
JOIN detail_hub_employees e ON e.id = te.employee_id
WHERE te.punch_out_method = 'auto_close'
  AND te.notes LIKE '%Auto-closed by system%'
ORDER BY te.clock_in DESC;

-- 2.2 REVERTIR entradas auto-cerradas (SOLO SI ES NECESARIO)
/*
⚠️ CUIDADO: Esto volverá a crear los duplicados
⚠️ Solo ejecutar si el fix causó problemas inesperados

BEGIN;

UPDATE detail_hub_time_entries
SET
  clock_out = NULL,
  punch_out_method = NULL,
  status = 'active',
  notes = REGEXP_REPLACE(
    notes,
    '\[\d{4}-\d{2}-\d{2}\] Auto-closed by system\. Employee forgot to clock out\.\n?',
    '',
    'g'
  )
WHERE punch_out_method = 'auto_close'
  AND notes LIKE '%Auto-closed by system%'
  AND clock_in >= '2024-11-21'::DATE;  -- Solo entradas recientes

-- Verificar cambios antes de commit
SELECT COUNT(*) AS reverted_entries
FROM detail_hub_time_entries
WHERE status = 'active' AND clock_out IS NULL;

-- Si todo se ve bien:
COMMIT;

-- Si algo está mal:
-- ROLLBACK;
*/

-- =====================================================
-- 3. ROLLBACK COMPLETO: Restaurar desde backup
-- =====================================================

-- 3.1 Ver diferencias entre backup y estado actual
SELECT
  'BACKUP' AS source,
  id,
  employee_id,
  clock_in,
  clock_out,
  status,
  punch_out_method
FROM detail_hub_time_entries_backup_20251124
UNION ALL
SELECT
  'CURRENT' AS source,
  te.id,
  te.employee_id,
  te.clock_in,
  te.clock_out,
  te.status,
  te.punch_out_method
FROM detail_hub_time_entries te
WHERE EXISTS (
  SELECT 1 FROM detail_hub_time_entries_backup_20251124 b
  WHERE b.id = te.id
)
ORDER BY id, source;

-- 3.2 RESTAURAR desde backup (ÚLTIMO RECURSO)
/*
⚠️ PELIGRO: Esto sobrescribirá todos los cambios del fix
⚠️ Solo ejecutar si el fix falló completamente

BEGIN;

-- Eliminar cambios actuales
DELETE FROM detail_hub_time_entries
WHERE id IN (SELECT id FROM detail_hub_time_entries_backup_20251124);

-- Restaurar desde backup
INSERT INTO detail_hub_time_entries
SELECT * FROM detail_hub_time_entries_backup_20251124;

-- Verificar
SELECT COUNT(*) AS restored_entries
FROM detail_hub_time_entries
WHERE status = 'active' AND clock_out IS NULL;

-- Si todo se ve bien:
COMMIT;

-- Si algo está mal:
-- ROLLBACK;
*/

-- =====================================================
-- 4. LIMPIAR BACKUP (Después de confirmar que el fix funciona)
-- =====================================================

/*
-- Solo ejecutar cuando estés 100% seguro que el fix está bien
-- Esperar al menos 7 días para confirmar

DROP TABLE IF EXISTS detail_hub_time_entries_backup_20251124;
*/

-- =====================================================
-- 5. ROLLBACK DE OBJETOS: Eliminar vista y función
-- =====================================================

-- 5.1 Eliminar vista
/*
⚠️ Esto causará errores 404 en la app nuevamente
⚠️ Solo ejecutar si la vista tiene problemas

DROP VIEW IF EXISTS detail_hub_currently_working CASCADE;
*/

-- 5.2 Eliminar función
/*
⚠️ Esto causará errores 404 en la app nuevamente
⚠️ Solo ejecutar si la función tiene problemas

DROP FUNCTION IF EXISTS get_live_dashboard_stats(INTEGER);
*/

-- =====================================================
-- 6. VERIFICACIÓN POST-ROLLBACK
-- =====================================================

-- 6.1 Contar duplicados (debe ser > 0 si hiciste rollback)
SELECT
  employee_id,
  COUNT(*) as active_entries
FROM detail_hub_time_entries
WHERE status = 'active' AND clock_out IS NULL
GROUP BY employee_id
HAVING COUNT(*) > 1;

-- 6.2 Verificar que objetos NO existen (si los eliminaste)
SELECT
  'detail_hub_currently_working' AS object_name,
  'VIEW' AS object_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_name = 'detail_hub_currently_working'
    ) THEN 'EXISTS ✓'
    ELSE 'MISSING ✗'
  END AS status
UNION ALL
SELECT
  'get_live_dashboard_stats' AS object_name,
  'FUNCTION' AS object_type,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.proname = 'get_live_dashboard_stats' AND n.nspname = 'public'
    ) THEN 'EXISTS ✓'
    ELSE 'MISSING ✗'
  END AS status;

-- =====================================================
-- 7. NOTAS IMPORTANTES
-- =====================================================

/*
IMPORTANTE: El enum 'auto_close' NO puede ser revertido fácilmente

PostgreSQL NO permite eliminar valores de enum sin recrear el tipo completo.
Sin embargo, agregar 'auto_close' es SAFE y beneficioso para el sistema.

Si por alguna razón necesitas eliminar el enum value, ver:
EXECUTION_GUIDE.md > Sección ROLLBACK > "Si necesitas revertir PASO 2.1"

RECOMENDACIÓN: NO revertir el enum, solo revertir los datos si es necesario.
*/

-- =====================================================
-- FIN DEL ARCHIVO
-- =====================================================
