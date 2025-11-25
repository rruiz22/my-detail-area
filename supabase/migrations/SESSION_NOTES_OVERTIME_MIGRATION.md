# 📋 Notas de Sesión: Migración de Overtime (8h diarias → 40h semanales)

**Fecha**: 2025-11-25
**Estado**: Migración creada, pendiente aplicación
**Problema identificado y resuelto**: Error de tipo de datos en `dealership_id`

---

## 🎯 Resumen Ejecutivo

Se creó una migración SQL para cambiar el cálculo de overtime de **8 horas diarias** a **40 horas semanales** en el módulo Detail Hub Timecards.

**Problema encontrado**: La primera versión de la migración asumía que `dealership_id` era `UUID`, pero en realidad es `INTEGER`.

**Solución**: Se creó una versión corregida con los tipos de datos correctos.

---

## 📁 Archivos Importantes

### **Archivo Principal** (USAR ESTE)
```
supabase/migrations/20251125145626_overtime_weekly_calculation_CORRECTED.sql
```
- ✅ Versión corregida con tipos de datos correctos
- ✅ `dealership_id` definido como INTEGER (no UUID)
- ✅ Backfill incluido
- ✅ Listo para aplicar

### **Archivos de Documentación**
1. `README_OVERTIME_MIGRATION.md` - Documentación técnica completa
2. `APPLY_MIGRATION_INSTRUCTIONS.md` - Instrucciones paso a paso
3. `test_overtime_migration.sql` - Script de validación
4. `SESSION_NOTES_OVERTIME_MIGRATION.md` - **ESTE ARCHIVO** (notas de sesión)

### **Archivos Obsoletos** (NO USAR)
- ❌ `20251125145626_overtime_weekly_calculation.sql` - Versión original con error de tipos
- ❌ `FIX_OVERTIME_BACKFILL.sql` - Intento de fix que también falló
- ❌ `QUICK_FIX_RUN_THIS.sql` - Intento de fix que también falló

---

## 🔍 Problema Identificado

### **Error Original**
```
ERROR: 42846: cannot cast type integer to uuid
```

### **Causa Raíz**
La tabla `detail_hub_time_entries` tiene esta estructura:

```sql
CREATE TABLE detail_hub_time_entries (
  employee_id UUID NOT NULL,           -- ✅ UUID
  dealership_id INTEGER NOT NULL,      -- ❌ INTEGER (no UUID!)
  ...
);
```

La función `calculate_weekly_overtime()` en la versión original esperaba:
```sql
-- ❌ VERSIÓN ORIGINAL (INCORRECTA)
CREATE OR REPLACE FUNCTION calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_start_date TIMESTAMPTZ,
  p_dealership_id UUID  -- ❌ ERROR: debería ser INTEGER
)
```

### **Solución Aplicada**
```sql
-- ✅ VERSIÓN CORREGIDA
CREATE OR REPLACE FUNCTION calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_start_date TIMESTAMPTZ,
  p_dealership_id INTEGER  -- ✅ CORRECTO: INTEGER
)
```

---

## 🚀 Cómo Aplicar la Migración

### **Método 1: Supabase Dashboard** (Recomendado)

1. **Ir a**: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new

2. **Abrir archivo**:
   ```
   supabase/migrations/20251125145626_overtime_weekly_calculation_CORRECTED.sql
   ```

3. **Copiar TODO** el contenido (Ctrl+A, Ctrl+C)

4. **Pegar** en SQL Editor de Supabase (Ctrl+V)

5. **Click "Run"** (o Ctrl+Enter)

6. **Esperar** 1-2 minutos (el backfill recalcula datos históricos)

7. **Verificar** mensajes de éxito:
   ```
   NOTICE: Starting backfill of weekly overtime calculations...
   NOTICE: Processed 100 employee-weeks...
   NOTICE: Backfill complete! Processed X employee-weeks
   NOTICE: ✅ Migration complete: Overtime calculation changed to 40h weekly
   ```

---

### **Método 2: PowerShell Script** (Alternativo)

Creamos un script pero no se probó:
```powershell
powershell.exe -ExecutionPolicy Bypass -File apply_overtime_migration.ps1
```

**Nota**: Este método requiere que la API REST de Supabase tenga habilitada la función `exec_sql`, lo cual puede no estar disponible.

---

### **Método 3: Supabase CLI** (Si funciona)

```bash
# 1. Renombrar archivo corregido al nombre estándar
mv supabase/migrations/20251125145626_overtime_weekly_calculation_CORRECTED.sql \
   supabase/migrations/20251125145626_overtime_weekly_calculation.sql

# 2. Aplicar con CLI
supabase db push
```

**Nota**: Puede fallar si hay migraciones desincronizadas entre local y remoto.

---

## ✅ Verificación Post-Migración

Después de aplicar, ejecutar este SQL para verificar:

```sql
-- Test 1: Verificar que la función existe con la firma correcta
SELECT
  routine_name,
  data_type as return_type,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'calculate_weekly_overtime';
-- Debe devolver 1 fila con data_type = 'void'

-- Test 2: Ver parámetros de la función
SELECT
  parameter_name,
  data_type,
  ordinal_position
FROM information_schema.parameters
WHERE specific_name = (
  SELECT specific_name
  FROM information_schema.routines
  WHERE routine_name = 'calculate_weekly_overtime'
)
ORDER BY ordinal_position;
-- Debe mostrar:
-- p_employee_id     | uuid            | 1
-- p_week_start_date | timestamp with time zone | 2
-- p_dealership_id   | integer         | 3

-- Test 3: Verificar índice
SELECT indexname
FROM pg_indexes
WHERE indexname = 'idx_time_entries_employee_week';
-- Debe devolver 1 fila

-- Test 4: Verificar view
SELECT viewname
FROM pg_views
WHERE viewname = 'detail_hub_weekly_hours';
-- Debe devolver 1 fila

-- Test 5: Ver ejemplo de datos recalculados
SELECT
  employee_id,
  DATE_TRUNC('week', clock_in)::DATE as week_start,
  COUNT(*) as entries,
  ROUND(SUM(total_hours)::NUMERIC, 2) as total_h,
  ROUND(SUM(regular_hours)::NUMERIC, 2) as regular_h,
  ROUND(SUM(overtime_hours)::NUMERIC, 2) as ot_h
FROM detail_hub_time_entries
WHERE clock_out IS NOT NULL
  AND status != 'disputed'
  AND clock_in >= NOW() - INTERVAL '4 weeks'
GROUP BY employee_id, DATE_TRUNC('week', clock_in)
HAVING SUM(overtime_hours) > 0
ORDER BY SUM(overtime_hours) DESC
LIMIT 10;
```

---

## 📊 Cambio de Comportamiento

### **ANTES** (8 horas diarias)
```
Lunes:    10h → 8h regular + 2h OT ❌
Martes:   10h → 8h regular + 2h OT
Miércoles: 8h → 8h regular + 0h OT
Jueves:    8h → 8h regular + 0h OT
Viernes:   9h → 8h regular + 1h OT
────────────────────────────────────
TOTAL:   45h → 40h regular + 5h OT
```

### **DESPUÉS** (40 horas semanales)
```
Lunes:    10h → 10h regular + 0h OT ✅
Martes:   10h → 10h regular + 0h OT
Miércoles: 8h → 8h regular + 0h OT
Jueves:    8h → 8h regular + 0h OT
Viernes:   9h → 4h regular + 5h OT
────────────────────────────────────
TOTAL:   45h → 40h regular + 5h OT
```

**Nota**: En el ejemplo DESPUÉS, el overtime de 5h se asigna **cronológicamente** al último día (viernes) una vez que se superan las 40h semanales.

---

## 🔧 Detalles Técnicos

### **Tabla Afectada**
```sql
detail_hub_time_entries
├── employee_id (UUID)
├── dealership_id (INTEGER)  ← Tipo corregido en migración
├── clock_in (TIMESTAMPTZ)
├── clock_out (TIMESTAMPTZ)
├── total_hours (DECIMAL)
├── regular_hours (DECIMAL)  ← Recalculado por migración
└── overtime_hours (DECIMAL) ← Recalculado por migración
```

### **Función Creada**
```sql
calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_start_date TIMESTAMPTZ,
  p_dealership_id INTEGER
) RETURNS void
```

**Lógica**:
1. Obtiene todas las entradas del empleado para esa semana (lunes-domingo)
2. Suma `total_hours` de todos los registros
3. Si `total_semanal <= 40h`: Todo es `regular_hours`, `overtime_hours = 0`
4. Si `total_semanal > 40h`: Distribuye primeros 40h como `regular_hours`, resto como `overtime_hours`
5. Distribución cronológica: Entries más tempranos obtienen horas regulares primero

### **Trigger Modificado**
```sql
trigger_calculate_time_entry_hours
  ON detail_hub_time_entries
  BEFORE INSERT OR UPDATE OF clock_out, break_duration_minutes
```

**Comportamiento**:
- Se ejecuta antes de INSERT/UPDATE cuando `clock_out` o `break_duration_minutes` cambian
- Calcula `total_hours` = (clock_out - clock_in - breaks) / 60
- Llama a `calculate_weekly_overtime()` para recalcular toda la semana
- **Implicación**: Editar cualquier día de la semana recalcula el overtime de TODA la semana

### **View Creado**
```sql
detail_hub_weekly_hours
```

Muestra agregados semanales:
- `total_entries` - Número de registros en la semana
- `total_hours` - Suma de horas trabajadas
- `total_regular_hours` - Suma de horas regulares
- `total_overtime_hours` - Suma de horas overtime

---

## ⚠️ Consideraciones Importantes

### **Performance**
- El trigger ahora hace queries adicionales (todas las entradas de la semana)
- Se agregó índice `idx_time_entries_employee_week` para optimizar
- Editar un día recalcula ~5-7 registros (semana completa) en lugar de 1

### **Casos Edge**
1. **Semanas parciales**: Empleado nuevo que empieza miércoles → Sigue teniendo derecho a 40h completas
2. **Ediciones retroactivas**: Editar lunes en viernes → Toda la semana se recalcula automáticamente
3. **Registros disputados**: Se excluyen del cálculo de overtime (`status != 'disputed'`)

### **Zona Horaria**
- Usa `DATE_TRUNC('week', clock_in)` que considera ISO week (lunes = día 1)
- Semana: Lunes 00:00:00 → Domingo 23:59:59.999999
- Timezone: Respeta `TIMESTAMPTZ` de la columna `clock_in`

---

## 🐛 Troubleshooting

### **Si la migración falla**

**Error**: `function already exists`
**Solución**: Es normal, `CREATE OR REPLACE` lo maneja automáticamente

**Error**: `relation "detail_hub_time_entries" does not exist`
**Solución**: La tabla Detail Hub no existe en este proyecto (verificar que estás en el proyecto correcto)

**Error**: `permission denied`
**Solución**: Ejecutar en SQL Editor del dashboard (tiene permisos elevados)

### **Si el backfill es muy lento**

El backfill puede tomar tiempo si hay muchos registros. Puedes:

1. **Comentar el backfill** en la migración (líneas 178-217)
2. **Aplicar solo la estructura** (función + trigger + índice)
3. **Ejecutar backfill por separado** en horario de baja actividad

```sql
-- Backfill manual (ejecutar después)
SELECT calculate_weekly_overtime(
  employee_id,
  DATE_TRUNC('week', clock_in),
  dealership_id
)
FROM (
  SELECT DISTINCT
    employee_id,
    dealership_id,
    DATE_TRUNC('week', clock_in) as week_start
  FROM detail_hub_time_entries
  WHERE clock_out IS NOT NULL
) t;
```

---

## ✅ Checklist Final

Antes de aplicar:
- [ ] Confirmar que estás en el proyecto correcto (`swfnnrpzpkdypbrzmgnr`)
- [ ] Usar el archivo **CORRECTED** (no el original)
- [ ] Leer documentación en `README_OVERTIME_MIGRATION.md`

Durante aplicación:
- [ ] Monitorear mensajes de NOTICE en SQL Editor
- [ ] Confirmar que backfill completa (ver "Processed X employee-weeks")
- [ ] No interrumpir la ejecución (puede tardar 1-2 minutos)

Después de aplicar:
- [ ] Ejecutar queries de verificación (arriba)
- [ ] Verificar que función existe con firma correcta
- [ ] Revisar datos de ejemplo en `detail_hub_weekly_hours` view
- [ ] Probar crear un nuevo time entry para ver que trigger funciona

---

## 📞 Próximos Pasos (Próxima Sesión)

1. **Aplicar migración** usando Supabase Dashboard
2. **Verificar** que todo funciona correctamente
3. **Probar** con datos de prueba si es posible
4. **Comunicar** cambio a usuarios (overtime ahora es semanal)
5. **Monitorear** por 48 horas para detectar issues

---

## 📚 Archivos de Referencia

- **Tabla original**: `supabase/migrations_backup_2025-11-24/20251117000002_create_detail_hub_time_entries.sql`
- **Trigger original** (8h diarias): Líneas 123-170 del archivo arriba
- **Migración corregida**: `supabase/migrations/20251125145626_overtime_weekly_calculation_CORRECTED.sql`

---

**Estado Final**: ✅ Migración lista para aplicar
**Acción Requerida**: Ejecutar SQL en Supabase Dashboard
**Tiempo Estimado**: 2-3 minutos
**Riesgo**: Bajo (usa CREATE OR REPLACE, no destructivo)
