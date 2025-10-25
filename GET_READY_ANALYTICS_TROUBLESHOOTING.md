# 🔧 Get Ready Historical Analytics - Troubleshooting Guide

**Fecha de creación**: 2025-10-25
**Estado actual**: Funciones creadas pero errores 400 en llamadas desde frontend
**Branch**: `feature/get-ready-enterprise-overview`

---

## 📋 Resumen del Estado Actual

### ✅ Completado

1. **Frontend implementado completamente**:
   - ✅ Hook `useGetReadyHistoricalAnalytics.ts` con todas las queries
   - ✅ Componentes de visualización:
     - `TimeSeriesCharts.tsx`
     - `StepPerformanceMatrix.tsx`
     - `BottleneckAnalysis.tsx`
   - ✅ Integración en `GetReadyOverview.tsx` con selector de tiempo (7d/30d/90d)
   - ✅ Traducciones completas (EN/ES/PT-BR)
   - ✅ Tipos TypeScript extendidos en `getReady.ts`

2. **Base de datos**:
   - ✅ Tabla `vehicle_step_history` creada
   - ✅ Trigger `manage_vehicle_step_history` activo
   - ✅ RLS policies aplicadas
   - ✅ 5 funciones RPC creadas (con DROP y re-CREATE)

3. **Correcciones previas**:
   - ✅ Overview muestra datos de todos los steps (no filtrado)
   - ✅ `useVehicleManagement.tsx` no resetea `intake_date`
   - ✅ Imports corregidos en hooks

---

## 🚨 Problema Actual: Errores 400 (Bad Request)

### Funciones con Error

```
POST /rest/v1/rpc/get_historical_kpis - 400 Bad Request
POST /rest/v1/rpc/get_dealer_step_analytics - 400 Bad Request
```

### Diagnóstico Inicial

**Error 400** indica que:
- ✅ La función **existe** en la base de datos (no es 404)
- ❌ Los **parámetros enviados desde el frontend** no coinciden con la firma de la función
- ❌ Posible problema de **tipos de datos** (BIGINT vs INTEGER, etc.)

---

## 🔍 Pasos de Diagnóstico

### 1️⃣ Verificar que las Funciones Existen

Ejecuta en **SQL Editor de Supabase**:

```sql
-- Listar todas las funciones RPC creadas
SELECT
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE 'get_%'
ORDER BY routine_name;
```

**Resultado esperado**: 5 funciones
- ✅ `get_accumulated_hours_in_step`
- ✅ `get_dealer_step_analytics`
- ✅ `get_historical_kpis`
- ✅ `get_step_visit_breakdown`
- ✅ `get_vehicle_step_times`

---

### 2️⃣ Verificar Firmas de Funciones Problemáticas

#### Función: `get_historical_kpis`

```sql
-- Ver parámetros exactos
SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'get_historical_kpis'
ORDER BY ordinal_position;
```

**Firma esperada en SQL** (según `ADD_HISTORICAL_ANALYTICS_FUNCTIONS.sql`):

```sql
CREATE OR REPLACE FUNCTION get_historical_kpis(
  p_dealer_id BIGINT,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
```

**¿Qué envía el frontend?** Verificar en `useGetReadyHistoricalAnalytics.ts`:

```typescript
const { data, error } = await supabase.rpc('get_historical_kpis', {
  p_dealer_id: dealerIds[0],  // ⚠️ ¿Qué tipo tiene dealerIds[0]?
  p_start_date: startDate.toISOString(),
  p_end_date: endDate.toISOString(),
});
```

**PROBLEMA POTENCIAL**:
- `dealerIds[0]` podría ser `string` (UUID) pero la función espera `BIGINT`
- Supabase puede estar rechazando la conversión implícita

---

#### Función: `get_dealer_step_analytics`

```sql
-- Ver parámetros
SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'get_dealer_step_analytics'
ORDER BY ordinal_position;
```

**Firma esperada**:

```sql
CREATE OR REPLACE FUNCTION get_dealer_step_analytics(
  p_dealer_id BIGINT,
  p_days INTEGER DEFAULT 30
)
```

**¿Qué envía el frontend?**

```typescript
const { data, error } = await supabase.rpc('get_dealer_step_analytics', {
  p_dealer_id: dealerIds[0],  // ⚠️ Mismo problema
  p_days: days,
});
```

---

### 3️⃣ Verificar Tipo de `dealer_id` en el Sistema

```sql
-- ¿Qué tipo es dealer_id en las tablas principales?
SELECT
  table_name,
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE column_name = 'dealer_id'
  AND table_schema = 'public'
ORDER BY table_name;
```

**Resultado esperado**:
- Si `dealer_id` es `UUID` → Las funciones deben usar `UUID`, no `BIGINT`
- Si `dealer_id` es `BIGINT` → El frontend debe enviar `Number`, no `string`

---

### 4️⃣ Verificar Output de las Funciones

```sql
-- Ver columnas de retorno de get_historical_kpis
SELECT
  routine_name,
  parameter_name,
  data_type,
  parameter_mode
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'get_historical_kpis'
  AND parameter_mode = 'OUT'
ORDER BY ordinal_position;
```

---

## 🛠️ Soluciones Propuestas

### Solución A: Cambiar Tipo de Parámetro en Funciones SQL

Si `dealer_id` es realmente `BIGINT` en la base de datos, **actualizar el frontend** para convertir:

```typescript
// En useGetReadyHistoricalAnalytics.ts

// ❌ ANTES:
p_dealer_id: dealerIds[0],

// ✅ DESPUÉS:
p_dealer_id: parseInt(dealerIds[0], 10),
```

---

### Solución B: Cambiar Funciones para Usar UUID

Si `dealer_id` es `UUID` (más común en Supabase), **recrear las funciones** con tipo correcto:

```sql
-- Ejemplo para get_historical_kpis
DROP FUNCTION IF EXISTS get_historical_kpis(BIGINT, TIMESTAMPTZ, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION get_historical_kpis(
  p_dealer_id UUID,  -- ⬅️ CAMBIO AQUÍ
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  -- ... mismo return type
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- ... misma lógica pero usar p_dealer_id::UUID
  FROM get_ready_vehicles v
  WHERE v.dealer_id = p_dealer_id  -- Ya no necesita cast
  -- ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Aplicar lo mismo para**:
- `get_dealer_step_analytics`
- `get_vehicle_step_times`
- `get_accumulated_hours_in_step`
- `get_step_visit_breakdown`

---

### Solución C: Test Manual de Funciones

Probar directamente en SQL Editor:

```sql
-- Test con dealer_id real de tu sistema
SELECT * FROM get_historical_kpis(
  1::BIGINT,  -- Reemplaza con ID real
  NOW() - INTERVAL '30 days',
  NOW()
);
```

Si esto falla con error, **el problema está en la función SQL**.
Si funciona, **el problema está en el frontend**.

---

## 📝 Checklist de Resolución

### Paso 1: Identificar Tipo Real de dealer_id
```sql
-- Ejecutar query del punto 3️⃣
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name = 'dealer_id'
  AND table_schema = 'public'
  AND table_name = 'get_ready_vehicles';
```

**Resultado**: `dealer_id` es de tipo ___________

---

### Paso 2: Corregir Según Tipo Encontrado

**Si es BIGINT**:
- [ ] Actualizar frontend para usar `parseInt(dealerIds[0], 10)`
- [ ] Verificar que `dealerIds[0]` sea numérico

**Si es UUID**:
- [ ] Recrear las 5 funciones cambiando `BIGINT` → `UUID`
- [ ] Ejecutar script SQL actualizado
- [ ] Mantener frontend como está

---

### Paso 3: Probar Función Manualmente

```sql
-- Reemplaza con valores reales de tu sistema
SELECT * FROM get_historical_kpis(
  '<dealer-id-aqui>',  -- UUID o BIGINT según corresponda
  NOW() - INTERVAL '7 days',
  NOW()
);
```

**Resultado esperado**: Datos de KPIs históricos
**Si falla**: Anotar mensaje de error

---

### Paso 4: Verificar Logs de Supabase

1. Ir a **Supabase Dashboard** → **Logs** → **PostgreSQL Logs**
2. Filtrar por `get_historical_kpis`
3. Buscar mensajes de error detallados

---

### Paso 5: Validar Respuesta de API

En la consola del navegador, capturar el error completo:

```typescript
// Agregar temporalmente en useGetReadyHistoricalAnalytics.ts
const { data, error } = await supabase.rpc('get_historical_kpis', {
  p_dealer_id: dealerIds[0],
  p_start_date: startDate.toISOString(),
  p_end_date: endDate.toISOString(),
});

if (error) {
  console.error('❌ get_historical_kpis ERROR:', {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    params: {
      p_dealer_id: dealerIds[0],
      p_start_date: startDate.toISOString(),
      p_end_date: endDate.toISOString(),
    }
  });
}
```

---

## 📂 Archivos Relevantes

### Frontend
- `src/hooks/useGetReadyHistoricalAnalytics.ts` - Llamadas RPC
- `src/hooks/useGetReady.tsx` - Integración de trends
- `src/components/get-ready/GetReadyOverview.tsx` - UI principal

### Backend
- `supabase/migrations/20251025000000_create_vehicle_step_history.sql` - Migración original
- `ADD_HISTORICAL_ANALYTICS_FUNCTIONS.sql` - Script aplicado (funciones creadas)

### Tipos
- `src/types/getReady.ts` - Interfaces TypeScript

---

## 🎯 Próximos Pasos (en orden)

1. **URGENTE**: Ejecutar query para identificar tipo de `dealer_id`
2. Aplicar **Solución A o B** según resultado
3. Test manual de función en SQL Editor
4. Recargar frontend y verificar errores 400
5. Si persisten errores, capturar logs detallados del error
6. Ajustar parámetros de fecha si es necesario (formato ISO vs TIMESTAMPTZ)

---

## 🐛 Debugging Adicional

### Si get_historical_kpis Sigue Fallando

Verificar que el JOIN con `dealers` table funciona:

```sql
-- Test de acceso a datos base
SELECT
  v.id,
  v.dealer_id,
  d.name AS dealer_name,
  v.step_id,
  v.intake_date
FROM get_ready_vehicles v
LEFT JOIN dealers d ON d.id = v.dealer_id
WHERE v.dealer_id = '<tu-dealer-id>'
LIMIT 5;
```

---

### Si get_dealer_step_analytics Falla

```sql
-- Verificar que vehicle_step_history tiene datos
SELECT
  COUNT(*) AS total_records,
  MIN(entry_date) AS first_entry,
  MAX(entry_date) AS last_entry
FROM vehicle_step_history;
```

Si `total_records = 0`:
- El trigger no se ha ejecutado aún
- Necesitas **cambiar un vehículo de step** para que se cree el primer registro

---

## 💡 Notas Importantes

1. **Datos Históricos**: Si `vehicle_step_history` está vacía, las funciones no devolverán datos aunque funcionen correctamente.

2. **Test de Trigger**: Para generar datos de prueba:
   ```sql
   -- Cambiar un vehículo de step manualmente
   UPDATE get_ready_vehicles
   SET step_id = (SELECT id FROM get_ready_steps WHERE name = 'Safety Inspection' LIMIT 1)
   WHERE id = '<algún-vehicle-id>';
   ```

3. **RLS Policies**: Asegúrate de estar autenticado con un usuario que tenga acceso al dealer.

---

## 📞 Contacto para Próxima Sesión

**Estado al finalizar esta sesión**:
- ✅ Script SQL ejecutado sin errores
- ⚠️ Errores 400 en llamadas RPC desde frontend
- 🔍 Necesita diagnóstico de tipos de parámetros

**Primera tarea**:
```sql
-- Ejecutar esto y reportar resultado:
SELECT data_type FROM information_schema.columns
WHERE table_name = 'get_ready_vehicles'
  AND column_name = 'dealer_id';
```

---

## 🗂️ Archivo de Script SQL Actual

El script `ADD_HISTORICAL_ANALYTICS_FUNCTIONS.sql` contiene las funciones con:
- `p_dealer_id BIGINT`
- `p_vehicle_id UUID`

**Si dealer_id es UUID**, crear versión corregida de este archivo.

---

**Fin del documento de troubleshooting** 🚀
