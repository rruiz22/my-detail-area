# 📊 Reporte: Sistema de Conteo de Días en Get Ready Module

**Fecha**: 13 de Octubre, 2025
**Módulo**: Get Ready (Reconditioning Workflow)
**Análisis**: Tracking de días por step y acumulado total

---

## 🎯 Resumen Ejecutivo

El sistema actual de Get Ready **NO mantiene un historial acumulado** de días por step. Cuando un vehículo se mueve a un nuevo step, se **reinicia el contador** y se **pierde el tiempo acumulado** del step anterior.

### ⚠️ Problema Crítico Identificado

**Si un vehículo regresa a un step anterior, NO se reanuda el tiempo que ya había estado ahí.**

---

## 📋 Estructura Actual

### 1. Tabla `get_ready_vehicles`

```sql
CREATE TABLE public.get_ready_vehicles (
  id UUID PRIMARY KEY,
  -- Time tracking
  intake_date TIMESTAMPTZ DEFAULT NOW(),       -- ⏰ Fecha de entrada al step ACTUAL
  days_in_step INTEGER DEFAULT 0,              -- 📅 Días en el step ACTUAL
  completed_at TIMESTAMPTZ,                    -- ✅ Fecha de completado (final)
  target_frontline_date TIMESTAMPTZ,           -- 🎯 Objetivo para llegar a front line

  -- Total time tracking
  t2l_estimate DECIMAL(10,2),                  -- 📊 Estimado Time-to-Line en días
  actual_t2l DECIMAL(10,2),                    -- ✅ T2L real después de completar

  -- Cost tracking
  holding_cost_daily DECIMAL(10,2) DEFAULT 35.00,
  total_holding_cost DECIMAL(10,2) DEFAULT 0, -- 💰 Costo total acumulado

  ...
);
```

**Campos relevantes:**
- ✅ `intake_date`: Se actualiza cada vez que cambia de step
- ✅ `days_in_step`: Se calcula en base a `intake_date` (días desde entrada al step actual)
- ❌ **NO hay campo para días acumulados por step**
- ❌ **NO hay campo para historial de tiempo en steps anteriores**

---

### 2. Tabla `vehicle_timeline_events`

```sql
CREATE TABLE public.vehicle_timeline_events (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES get_ready_vehicles(id),
  event_type timeline_event_type NOT NULL,     -- 'step_change', 'work_started', etc.
  event_title TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),         -- ⏰ Cuándo ocurrió el evento
  duration_hours DECIMAL(8,2),                 -- ⏱️ Duración del evento
  ...
);
```

**Lo que SÍ guarda:**
- ✅ Registra cada cambio de step como evento
- ✅ Guarda `duration_hours = days_in_step * 24` **al momento del cambio**
- ✅ Permite reconstruir historial de movimientos

**Trigger que lo crea:**
```sql
CREATE TRIGGER trigger_vehicle_step_change_timeline
  AFTER UPDATE OF step_id ON public.get_ready_vehicles
  FOR EACH ROW
  WHEN (NEW.step_id IS DISTINCT FROM OLD.step_id)
  EXECUTE FUNCTION public.create_step_change_timeline_event();
```

---

## 🔧 Lógica Actual de Movimiento entre Steps

**Archivo:** `src/hooks/useVehicleManagement.ts` (líneas 197-208)

```typescript
const { data, error } = await supabase
  .from('get_ready_vehicles')
  .update({
    step_id: stepId,
    intake_date: new Date().toISOString(),  // ⚠️ RESETEA la fecha
    days_in_step: 0,                        // ⚠️ RESETEA a 0
    sla_status: 'on_track',
    updated_at: new Date().toISOString(),
  })
  .eq('id', actualId);
```

### ❌ Problema:

1. **Al mover a nuevo step:**
   - Se resetea `intake_date` a NOW()
   - Se resetea `days_in_step` a 0
   - Se pierde el tiempo acumulado en el step anterior

2. **Si regresa a step anterior:**
   - Se trata como si fuera la primera vez en ese step
   - NO se recupera el tiempo previo
   - NO se acumula el tiempo

---

## 📊 Cálculo de Días Actual

### Trigger: `calculate_days_in_step()`

```sql
CREATE OR REPLACE FUNCTION public.calculate_days_in_step()
RETURNS TRIGGER AS $$
BEGIN
  -- Calcula días desde intake_date hasta NOW
  NEW.days_in_step := EXTRACT(DAY FROM (NOW() - NEW.intake_date))::INTEGER;

  -- Calcula costo total
  NEW.total_holding_cost := NEW.holding_cost_daily * NEW.days_in_step;

  RETURN NEW;
END;
$$;
```

**Se ejecuta:**
- Solo cuando cambia `intake_date` o `holding_cost_daily`
- Calcula días **desde la última entrada al step actual**

---

## 🚨 Escenarios Problemáticos

### Escenario 1: Movimiento Normal (Funciona)

```
Day 1: Inspection (intake_date = 2025-10-01)
  → days_in_step = 0

Day 4: Inspection (intake_date = 2025-10-01)
  → days_in_step = 3 ✅ Correcto

Day 4: Move to Mechanical (intake_date = 2025-10-04)
  → days_in_step = 0 ✅ Correcto
  → timeline_events guarda: duration_hours = 72 (3 días)

Day 7: Mechanical (intake_date = 2025-10-04)
  → days_in_step = 3 ✅ Correcto
```

### Escenario 2: Regreso a Step Anterior (⚠️ PROBLEMA)

```
Day 1: Inspection (intake_date = 2025-10-01)
  → days_in_step = 0

Day 4: Inspection
  → days_in_step = 3

Day 4: Move to Mechanical (intake_date = 2025-10-04)
  → days_in_step = 0
  → timeline_events: Inspection duration = 72h (3 días)

Day 8: Mechanical
  → days_in_step = 4

Day 8: Move BACK to Inspection (intake_date = 2025-10-08) ⚠️
  → days_in_step = 0 ❌ INCORRECTO - Debería ser 3 + nuevo tiempo
  → timeline_events: Mechanical duration = 96h (4 días)

Day 10: Inspection
  → days_in_step = 2 ❌ INCORRECTO - Debería ser 3 (anterior) + 2 (nuevo) = 5
```

**Días reales en Inspection:**
- Primera vez: 3 días
- Segunda vez: 2 días
- **Total: 5 días** ✅

**Días que muestra el sistema:**
- `days_in_step = 2` ❌ (solo cuenta la segunda vez)

---

## 📈 Posibilidad de Reconstrucción

### ¿Se puede calcular el tiempo real acumulado?

**SÍ, parcialmente**, usando `vehicle_timeline_events`:

```sql
-- Obtener tiempo total acumulado por step para un vehículo
SELECT
  vte.event_description,
  SUM(vte.duration_hours) / 24.0 as total_days_in_step
FROM vehicle_timeline_events vte
WHERE vte.vehicle_id = 'vehicle-uuid-here'
  AND vte.event_type = 'step_change'
GROUP BY vte.event_description;
```

**Limitación:**
- Solo funciona para steps **ya completados**
- El step **actual** solo muestra tiempo desde la última entrada

---

## 🎯 Caso de Uso Solicitado

### Necesidad: "Dispatch hasta Front Line"

**Definición de términos:**
- **Dispatch**: Step inicial (ej: "Inspection" o "Incoming")
- **Front Line**: Step final (ej: "Ready for Sale")

**Cálculo actual:**
```typescript
t2l_estimate: DECIMAL(10,2),    // Estimado - Se calcula manualmente
actual_t2l: DECIMAL(10,2),      // Real - Se calcula al completar
```

**Cómo se calcula `actual_t2l`:**
```typescript
// Al marcar vehículo como completado
actual_t2l = (completed_at - created_at) / days
```

**⚠️ Este cálculo SÍ funciona correctamente** porque usa `created_at` (entrada inicial) hasta `completed_at` (salida final).

---

## ✅ Lo Que Funciona Correctamente

1. **Tiempo total desde entrada hasta salida (T2L)**
   - Campo: `actual_t2l`
   - Cálculo: `completed_at - created_at`
   - Estado: ✅ Correcto

2. **Historial de eventos**
   - Tabla: `vehicle_timeline_events`
   - Guarda: Cada cambio de step con duración
   - Estado: ✅ Correcto (pero no se usa para acumular)

3. **Días en step actual (primera vez)**
   - Campo: `days_in_step`
   - Cálculo: `NOW() - intake_date`
   - Estado: ✅ Correcto (si no ha regresado)

---

## ❌ Lo Que NO Funciona

1. **Tiempo acumulado por step**
   - Si un vehículo pasa 3 días en "Inspection", va a "Mechanical", y regresa a "Inspection"
   - **NO se acumula el tiempo anterior**
   - `days_in_step` se resetea a 0

2. **Persistencia de tiempo al regresar**
   - No hay lógica para "reanudar" el contador
   - Se trata cada entrada como nueva

3. **Visualización de tiempo real por step**
   - Solo se ve el tiempo de la visita actual al step
   - No hay suma de todas las visitas

---

## 🛠️ Soluciones Propuestas

### Opción A: Tabla de Historial Acumulado (Recomendada)

```sql
CREATE TABLE public.vehicle_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.get_ready_vehicles(id),
  step_id TEXT REFERENCES public.get_ready_steps(id),
  dealer_id BIGINT REFERENCES public.dealerships(id),

  -- Time tracking per visit
  entry_date TIMESTAMPTZ NOT NULL,
  exit_date TIMESTAMPTZ,
  hours_accumulated DECIMAL(8,2) DEFAULT 0,

  -- Visit tracking
  visit_number INTEGER DEFAULT 1,
  is_current_visit BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(vehicle_id, step_id, visit_number)
);

-- Índices
CREATE INDEX idx_step_history_vehicle_current
  ON vehicle_step_history(vehicle_id, is_current_visit)
  WHERE is_current_visit = true;
```

**Ventajas:**
- ✅ Mantiene historial completo
- ✅ Permite acumular tiempo por step
- ✅ Distingue múltiples visitas al mismo step
- ✅ Puede calcular tiempo real acumulado

**Implementación:**
1. Al entrar a un step: crear registro con `entry_date`
2. Al salir de un step: actualizar `exit_date` y `hours_accumulated`
3. Al regresar: crear nuevo registro con `visit_number++`
4. Calcular total: `SUM(hours_accumulated)` para ese `step_id`

---

### Opción B: Campo de Acumulación en Vehículo

```sql
ALTER TABLE public.get_ready_vehicles
ADD COLUMN step_time_history JSONB DEFAULT '{}'::jsonb;

-- Estructura:
{
  "inspection": {
    "total_hours": 72,
    "visits": [
      {"entry": "2025-10-01", "exit": "2025-10-04", "hours": 72},
      {"entry": "2025-10-08", "exit": null, "hours": 0}  -- visita actual
    ]
  },
  "mechanical": {
    "total_hours": 96,
    "visits": [
      {"entry": "2025-10-04", "exit": "2025-10-08", "hours": 96}
    ]
  }
}
```

**Ventajas:**
- ✅ No requiere tabla adicional
- ✅ Toda la info en un solo lugar
- ✅ Fácil de consultar

**Desventajas:**
- ❌ JSONB más difícil de consultar en SQL
- ❌ No se puede indexar eficientemente
- ❌ Más propenso a errores

---

### Opción C: Usar `vehicle_timeline_events` (Solución Rápida)

**Modificar el query para calcular tiempo acumulado:**

```typescript
// Función para calcular días acumulados en un step
async function getAccumulatedDaysInStep(vehicleId: string, stepId: string) {
  const { data: events } = await supabase
    .from('vehicle_timeline_events')
    .select('duration_hours, timestamp')
    .eq('vehicle_id', vehicleId)
    .eq('event_type', 'step_change')
    .order('timestamp', { ascending: false });

  // Buscar todos los eventos donde se salió de este step
  let totalHours = 0;
  for (const event of events) {
    if (event.metadata?.from_step_id === stepId) {
      totalHours += event.duration_hours || 0;
    }
  }

  // Sumar tiempo actual si está en ese step
  const { data: vehicle } = await supabase
    .from('get_ready_vehicles')
    .select('step_id, intake_date')
    .eq('id', vehicleId)
    .single();

  if (vehicle.step_id === stepId) {
    const currentHours = (Date.now() - new Date(vehicle.intake_date).getTime()) / (1000 * 60 * 60);
    totalHours += currentHours;
  }

  return totalHours / 24; // Retornar días
}
```

**Ventajas:**
- ✅ Usa estructura existente
- ✅ No requiere cambios en DB

**Desventajas:**
- ❌ Requiere actualizar `metadata` en eventos
- ❌ Cálculo más complejo
- ❌ No es tiempo real (depende de eventos pasados)

---

## 📝 Recomendación Final

### Implementar Opción A: Tabla `vehicle_step_history`

**Razones:**
1. **Solución robusta** y escalable
2. **Fácil de mantener** y consultar
3. **Datos estructurados** e indexables
4. **Permite análisis avanzados** (tiempo promedio por visita, etc.)
5. **No depende de JSONB** ni cálculos complejos

### Plan de Implementación:

1. **Fase 1: Crear tabla de historial**
   - Migración SQL para crear `vehicle_step_history`
   - Índices para performance

2. **Fase 2: Modificar lógica de movimiento**
   - Al mover vehículo: registrar en historial
   - Actualizar `moveVehicleToStep` en `useVehicleManagement.ts`

3. **Fase 3: Agregar función de acumulación**
   - Crear RPC function para calcular tiempo total por step
   - Usar en UI para mostrar días reales

4. **Fase 4: Migrar datos existentes**
   - Script para poblar historial desde `vehicle_timeline_events`
   - Validar integridad de datos

---

## 📊 Conclusión

El sistema actual de Get Ready:

✅ **Funciona bien para:**
- Tiempo total del vehículo (intake a completion)
- Días en step actual (si no ha regresado)
- Historial de eventos

❌ **NO funciona para:**
- Tiempo acumulado por step con múltiples visitas
- Reanudar contador al regresar a step anterior
- Análisis detallado de tiempo por step

**Acción recomendada:** Implementar tabla `vehicle_step_history` para tracking completo y preciso.

---

**Preparado por:** AI Assistant
**Revisión necesaria:** Equipo de desarrollo
**Prioridad:** Alta (afecta precisión de métricas)
