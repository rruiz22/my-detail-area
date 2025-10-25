# ⚡ Aplicar Fix de Analytics - MANUAL (3 minutos)

**Fecha**: 2025-10-25
**Riesgo**: 🟢 BAJO (solo re-crea funciones RPC)
**Tiempo**: 3 minutos

---

## 🎯 Problema Identificado

### ❌ Error 1: `get_historical_kpis`
```
Returned type bigint does not match expected type integer in column 3
```
**Fix**: Cambié `INTEGER` → `BIGINT` para 3 columnas de retorno

### ❌ Error 2: `get_dealer_step_analytics`
```
column reference "step_id" is ambiguous
```
**Fix**: Renombré columnas en CTEs para evitar ambigüedad

---

## 🚀 INSTRUCCIONES - Copiar y Pegar

### Paso 1: Abrir Supabase Dashboard (30 segundos)

1. Ve a: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Click: **SQL Editor** (sidebar izquierdo)
3. Click: **"New Query"**

---

### Paso 2: Ejecutar Migración (1 minuto)

**COPIA TODO EL CÓDIGO DE ABAJO Y PEGA EN SQL EDITOR:**

```sql
-- =====================================================
-- FIX #1: get_historical_kpis - Change INTEGER to BIGINT
-- =====================================================

CREATE OR REPLACE FUNCTION get_historical_kpis(
  p_dealer_id BIGINT,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS TABLE (
  date DATE,
  avg_t2l NUMERIC,
  daily_throughput BIGINT,  -- FIX: Changed from INTEGER to BIGINT
  sla_compliance NUMERIC,
  active_vehicles BIGINT,   -- FIX: Changed from INTEGER to BIGINT (consistency)
  vehicles_completed BIGINT -- FIX: Changed from INTEGER to BIGINT (consistency)
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_metrics AS (
    SELECT
      DATE(vsh.entry_date) AS metric_date,
      COUNT(DISTINCT vsh.vehicle_id) AS vehicles_active,
      COUNT(DISTINCT v.id) FILTER (WHERE v.status = 'completed') AS completed_count
    FROM vehicle_step_history vsh
    INNER JOIN get_ready_vehicles v ON vsh.vehicle_id = v.id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date BETWEEN p_start_date AND p_end_date
      AND v.deleted_at IS NULL
    GROUP BY DATE(vsh.entry_date)
  )
  SELECT
    dm.metric_date::DATE,
    ROUND(AVG(v.actual_t2l)::NUMERIC, 2) AS avg_t2l,
    dm.completed_count AS daily_throughput,  -- Now matches BIGINT
    ROUND((COUNT(*) FILTER (WHERE v.sla_status = 'on_track')::NUMERIC /
           NULLIF(COUNT(*), 0)::NUMERIC), 3) AS sla_compliance,
    dm.vehicles_active AS active_vehicles,   -- Now matches BIGINT
    dm.completed_count AS vehicles_completed -- Now matches BIGINT
  FROM daily_metrics dm
  INNER JOIN get_ready_vehicles v ON DATE(v.created_at) = dm.metric_date
  WHERE v.dealer_id = p_dealer_id AND v.deleted_at IS NULL
  GROUP BY dm.metric_date, dm.vehicles_active, dm.completed_count
  ORDER BY dm.metric_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_historical_kpis IS
  '[FIXED v2] Get historical KPI trends for Get Ready module - Fixed BIGINT type mismatch';

-- =====================================================
-- FIX #2: get_dealer_step_analytics - Qualify ambiguous column reference
-- =====================================================

CREATE OR REPLACE FUNCTION get_dealer_step_analytics(
  p_dealer_id BIGINT,
  p_days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  total_vehicles BIGINT,
  revisit_rate NUMERIC,
  avg_time_first_visit NUMERIC,
  avg_time_revisits NUMERIC,
  avg_total_time NUMERIC,
  max_revisits INTEGER,
  backtrack_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH step_stats AS (
    SELECT
      vsh.step_id AS stat_step_id,  -- FIX: Renamed to avoid ambiguity
      MAX(vsh.step_name) AS step_name,
      COUNT(DISTINCT vsh.vehicle_id) AS total_vehicles,
      COUNT(DISTINCT vsh.vehicle_id) FILTER (WHERE vsh.visit_number > 1) AS vehicles_with_revisits,
      ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date))
            FILTER (WHERE vsh.visit_number = 1), 2) AS avg_time_first_visit,
      ROUND(AVG(calculate_step_hours(vsh.entry_date, vsh.exit_date))
            FILTER (WHERE vsh.visit_number > 1), 2) AS avg_time_revisits,
      MAX(vsh.visit_number) AS max_revisits,
      COUNT(*) FILTER (WHERE vsh.is_backtrack) AS backtrack_count
    FROM vehicle_step_history vsh
    INNER JOIN get_ready_vehicles v ON vsh.vehicle_id = v.id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date >= NOW() - (p_days_back || ' days')::INTERVAL
      AND v.deleted_at IS NULL
    GROUP BY vsh.step_id
  ),
  summary_stats AS (
    SELECT
      vsts.step_id AS summary_step_id,  -- FIX: Renamed to avoid ambiguity
      ROUND(AVG(vsts.total_hours), 2) AS avg_total_time
    FROM vehicle_step_time_summary vsts
    INNER JOIN vehicle_step_history vsh ON vsts.vehicle_id = vsh.vehicle_id
    WHERE
      vsh.dealer_id = p_dealer_id
      AND vsh.entry_date >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY vsts.step_id
  )
  SELECT
    ss.stat_step_id AS step_id,  -- FIX: Use renamed column
    ss.step_name,
    ss.total_vehicles,
    ROUND((ss.vehicles_with_revisits::NUMERIC / NULLIF(ss.total_vehicles, 0)::NUMERIC) * 100, 1) AS revisit_rate,
    ss.avg_time_first_visit,
    ss.avg_time_revisits,
    COALESCE(sms.avg_total_time, ss.avg_time_first_visit) AS avg_total_time,
    ss.max_revisits,
    ss.backtrack_count
  FROM step_stats ss
  LEFT JOIN summary_stats sms ON ss.stat_step_id = sms.summary_step_id  -- FIX: Use renamed columns
  ORDER BY (
    SELECT order_index FROM get_ready_steps WHERE id = ss.stat_step_id LIMIT 1  -- FIX: Use renamed column
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_dealer_step_analytics IS
  '[FIXED v2] Get comprehensive step analytics - Fixed ambiguous column reference';
```

**4. Click "Run" (botón verde)**

**Resultado esperado**:
```
✅ Success. No rows returned
```

---

### Paso 3: Verificar en Browser (1 minuto)

1. **Vuelve a la app**: http://localhost:8080/get-ready
2. **Hard refresh**: `Ctrl + Shift + R`
3. **Abre Console** (F12)

#### ✅ ANTES (Error):
```
❌ [get_historical_kpis] RPC Error: {
  message: 'structure of query does not match function result type',
  details: 'Returned type bigint does not match expected type integer'
}

❌ [get_dealer_step_analytics] RPC Error: {
  message: 'column reference "step_id" is ambiguous'
}
```

#### ✅ DESPUÉS (Éxito):
```
🔍 [get_historical_kpis] Calling RPC with params: {...}
✅ [get_historical_kpis] Success: { records_returned: 0 }

🔍 [get_dealer_step_analytics] Calling RPC with params: {...}
✅ [get_dealer_step_analytics] Success: { records_returned: 0 }
```

**Nota**: `records_returned: 0` es normal porque `vehicle_step_history` está vacía.

---

## 📊 Cambios Técnicos Aplicados

### Fix #1: `get_historical_kpis`

#### ANTES:
```sql
RETURNS TABLE (
  date DATE,
  avg_t2l NUMERIC,
  daily_throughput INTEGER,    -- ❌ Error: COUNT() returns BIGINT
  sla_compliance NUMERIC,
  active_vehicles INTEGER,     -- ❌ Error
  vehicles_completed INTEGER   -- ❌ Error
)
```

#### DESPUÉS:
```sql
RETURNS TABLE (
  date DATE,
  avg_t2l NUMERIC,
  daily_throughput BIGINT,     -- ✅ Corregido
  sla_compliance NUMERIC,
  active_vehicles BIGINT,      -- ✅ Corregido
  vehicles_completed BIGINT    -- ✅ Corregido
)
```

---

### Fix #2: `get_dealer_step_analytics`

#### ANTES:
```sql
WITH step_stats AS (
  SELECT
    vsh.step_id,  -- ❌ Ambiguo: variable vs columna
    ...
)
```

#### DESPUÉS:
```sql
WITH step_stats AS (
  SELECT
    vsh.step_id AS stat_step_id,  -- ✅ Renombrado
    ...
)
SELECT
  ss.stat_step_id AS step_id,  -- ✅ Usa nombre único
  ...
```

---

## ✅ Checklist de Verificación

- [ ] Abrir Supabase Dashboard
- [ ] SQL Editor → New Query
- [ ] Copiar SQL de arriba
- [ ] Ejecutar (Click "Run")
- [ ] Ver "✅ Success"
- [ ] Volver a app y hacer hard refresh
- [ ] Verificar que NO hay errores 400 en console
- [ ] Ver logs ✅ Success en lugar de ❌ RPC Error

---

## 🎉 Resultado Esperado

### Antes del Fix:
- ❌ 6+ errores 400 en console
- ❌ Analytics no funcionan
- ❌ Errores de tipo de datos

### Después del Fix:
- ✅ 0 errores 400
- ✅ Funciones ejecutan correctamente
- ✅ Retornan arrays vacíos (esperado - sin datos históricos)

---

## ⚠️ Nota Importante: Datos Vacíos

Si ves `records_returned: 0`, es **NORMAL** porque:
- La tabla `vehicle_step_history` está vacía
- El trigger aún no se ha ejecutado
- No se han movido vehículos entre steps

**Para generar datos de prueba** (opcional):
```sql
-- Obtener un dealer_id real
SELECT id, name FROM dealerships LIMIT 1;

-- Mover un vehículo a otro step para activar el trigger
UPDATE get_ready_vehicles
SET step_id = (
  SELECT id FROM get_ready_steps
  WHERE dealer_id = <DEALER_ID_DE_ARRIBA>
  ORDER BY order_index
  LIMIT 1 OFFSET 1
)
WHERE id = (
  SELECT id FROM get_ready_vehicles
  WHERE dealer_id = <DEALER_ID_DE_ARRIBA>
  LIMIT 1
);

-- Verificar que se creó historia
SELECT * FROM vehicle_step_history
ORDER BY entry_date DESC
LIMIT 5;
```

---

## 📞 Si Algo Sale Mal

### Error: "function already exists"
**Solución**: Es normal. `CREATE OR REPLACE` sobreescribe la función existente.

### Error: "permission denied"
**Solución**: Asegúrate de estar conectado con permisos de admin en Supabase Dashboard.

### Aún veo errores 400
**Solución**:
1. Verifica que la migración se ejecutó sin errores
2. Haz hard refresh en el browser (`Ctrl + Shift + R`)
3. Limpia caché del browser
4. Cierra y abre DevTools nuevamente

---

**¿Listo para aplicar el fix? Son solo 3 minutos** 🚀
