# 🚀 INSTRUCCIONES PARA APLICAR MIGRACIÓN DE OVERTIME

## Paso 1: Ir al SQL Editor de Supabase

1. Abre: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
2. Deberías ver el SQL Editor

## Paso 2: Copiar y Ejecutar el SQL

**Opción A: Todo de una vez** (Recomendado)

1. Abre el archivo: `20251125145626_overtime_weekly_calculation.sql`
2. Selecciona TODO el contenido (Ctrl+A)
3. Copia (Ctrl+C)
4. Pega en el SQL Editor de Supabase (Ctrl+V)
5. Click en "Run" (o Ctrl+Enter)
6. Espera 1-2 minutos (el backfill puede tardar)
7. Verifica que veas mensajes de éxito al final

**Opción B: Paso a paso** (Si la Opción A falla)

Ejecuta cada uno de estos bloques por separado:

### Bloque 1: Índice
```sql
CREATE INDEX IF NOT EXISTS idx_time_entries_employee_week
ON detail_hub_time_entries(employee_id, clock_in, dealership_id)
WHERE clock_out IS NOT NULL;
```

### Bloque 2: Función calculate_weekly_overtime
```sql
CREATE OR REPLACE FUNCTION calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_start_date TIMESTAMPTZ,
  p_dealership_id UUID
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_week_end_date TIMESTAMPTZ;
  v_total_weekly_hours NUMERIC;
  v_remaining_regular_hours NUMERIC;
  v_entry RECORD;
BEGIN
  v_week_end_date := p_week_start_date + INTERVAL '6 days 23 hours 59 minutes 59.999999 seconds';

  SELECT COALESCE(SUM(total_hours), 0)
  INTO v_total_weekly_hours
  FROM detail_hub_time_entries
  WHERE employee_id = p_employee_id
    AND dealership_id = p_dealership_id
    AND clock_in >= p_week_start_date
    AND clock_in < v_week_end_date
    AND clock_out IS NOT NULL
    AND status != 'disputed';

  IF v_total_weekly_hours <= 40 THEN
    UPDATE detail_hub_time_entries
    SET regular_hours = total_hours, overtime_hours = 0, updated_at = NOW()
    WHERE employee_id = p_employee_id
      AND dealership_id = p_dealership_id
      AND clock_in >= p_week_start_date
      AND clock_in < v_week_end_date
      AND clock_out IS NOT NULL
      AND status != 'disputed';
  ELSE
    v_remaining_regular_hours := 40;

    FOR v_entry IN (
      SELECT id, total_hours, clock_in
      FROM detail_hub_time_entries
      WHERE employee_id = p_employee_id
        AND dealership_id = p_dealership_id
        AND clock_in >= p_week_start_date
        AND clock_in < v_week_end_date
        AND clock_out IS NOT NULL
        AND status != 'disputed'
      ORDER BY clock_in ASC
    )
    LOOP
      IF v_remaining_regular_hours >= v_entry.total_hours THEN
        UPDATE detail_hub_time_entries
        SET regular_hours = v_entry.total_hours, overtime_hours = 0, updated_at = NOW()
        WHERE id = v_entry.id;
        v_remaining_regular_hours := v_remaining_regular_hours - v_entry.total_hours;
      ELSIF v_remaining_regular_hours > 0 THEN
        UPDATE detail_hub_time_entries
        SET regular_hours = v_remaining_regular_hours,
            overtime_hours = v_entry.total_hours - v_remaining_regular_hours,
            updated_at = NOW()
        WHERE id = v_entry.id;
        v_remaining_regular_hours := 0;
      ELSE
        UPDATE detail_hub_time_entries
        SET regular_hours = 0, overtime_hours = v_entry.total_hours, updated_at = NOW()
        WHERE id = v_entry.id;
      END IF;
    END LOOP;
  END IF;
END;
$$;
```

### Bloque 3: Modificar Trigger
```sql
CREATE OR REPLACE FUNCTION calculate_time_entry_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_minutes INTEGER;
  v_worked_minutes INTEGER;
  v_work_hours NUMERIC;
  v_week_start TIMESTAMPTZ;
BEGIN
  IF NEW.clock_out IS NULL THEN RETURN NEW; END IF;
  IF NEW.clock_out <= NEW.clock_in THEN
    RAISE EXCEPTION 'Clock out time must be after clock in time';
  END IF;

  v_total_minutes := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60;
  v_worked_minutes := v_total_minutes - COALESCE(NEW.break_duration_minutes, 0);

  IF v_worked_minutes < 0 THEN
    RAISE EXCEPTION 'Break duration cannot exceed total time worked';
  END IF;

  v_work_hours := v_worked_minutes / 60.0;
  NEW.total_hours := ROUND(v_work_hours, 2);
  NEW.regular_hours := NEW.total_hours;
  NEW.overtime_hours := 0;

  v_week_start := DATE_TRUNC('week', NEW.clock_in);

  PERFORM calculate_weekly_overtime(NEW.employee_id, v_week_start, NEW.dealership_id);

  RETURN NEW;
END;
$$;
```

### Bloque 4: Backfill (OPCIONAL - puede tardar)
```sql
DO $$
DECLARE
  v_employee RECORD;
  v_processed_count INTEGER := 0;
BEGIN
  FOR v_employee IN (
    SELECT DISTINCT
      employee_id,
      dealership_id,
      DATE_TRUNC('week', clock_in) as week_start
    FROM detail_hub_time_entries
    WHERE clock_out IS NOT NULL AND status != 'disputed'
    ORDER BY week_start ASC
  )
  LOOP
    PERFORM calculate_weekly_overtime(
      v_employee.employee_id,
      v_employee.week_start,
      v_employee.dealership_id
    );
    v_processed_count := v_processed_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfill complete! Processed % employee-weeks', v_processed_count;
END;
$$;
```

### Bloque 5: Crear View
```sql
CREATE OR REPLACE VIEW detail_hub_weekly_hours AS
SELECT
  employee_id,
  dealership_id,
  DATE_TRUNC('week', clock_in) as week_start,
  DATE_TRUNC('week', clock_in) + INTERVAL '6 days' as week_end,
  COUNT(*) as total_entries,
  SUM(total_hours) as total_hours,
  SUM(regular_hours) as total_regular_hours,
  SUM(overtime_hours) as total_overtime_hours,
  MIN(clock_in) as first_clock_in,
  MAX(clock_out) as last_clock_out
FROM detail_hub_time_entries
WHERE clock_out IS NOT NULL AND status != 'disputed'
GROUP BY employee_id, dealership_id, DATE_TRUNC('week', clock_in)
ORDER BY week_start DESC, employee_id;
```

## Paso 3: Verificar que Funcionó

Ejecuta esto para verificar:

```sql
-- Debería devolver 3 filas
SELECT
  (SELECT COUNT(*) FROM pg_proc WHERE proname = 'calculate_weekly_overtime') as function_exists,
  (SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_time_entries_employee_week') as index_exists,
  (SELECT COUNT(*) FROM pg_views WHERE viewname = 'detail_hub_weekly_hours') as view_exists;
```

Resultado esperado: `function_exists=1, index_exists=1, view_exists=1`

## ✅ Listo!

Una vez completado, el overtime se calculará semanalmente (40h/semana) en lugar de diariamente (8h/día).
