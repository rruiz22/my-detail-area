# 🔒 Plan de Verificación Seguro - Get Ready Analytics

**Fecha**: 2025-10-25
**Objetivo**: Verificar estado actual SIN hacer cambios
**Nivel de Riesgo**: 🟢 NINGUNO (solo lectura)

---

## ⚠️ IMPORTANTE: Este es un Plan de VERIFICACIÓN Solamente

**NO ejecutar cambios hasta confirmar el estado actual.**

---

## 📋 Checklist de Verificación (Solo Lectura)

### ✅ Paso 1: Verificar Funciones RPC Existen

**Query segura (solo lectura)**:
```sql
-- Ejecutar en Supabase SQL Editor
SELECT
  routine_name AS function_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'get_historical_kpis',
    'get_dealer_step_analytics',
    'get_vehicle_step_times',
    'get_accumulated_hours_in_step',
    'get_step_visit_breakdown'
  )
ORDER BY routine_name;
```

**Resultado Esperado**: 5 filas (una por función)

**Interpretación**:
- ✅ **5 funciones listadas** → Migración aplicada, continuar con Paso 2
- ❌ **0 funciones listadas** → Migración NO aplicada, necesita aplicarse
- ⚠️ **1-4 funciones listadas** → Aplicación parcial, necesita re-aplicar

---

### ✅ Paso 2: Verificar Tabla vehicle_step_history Existe

**Query segura**:
```sql
-- Verificar que la tabla existe
SELECT
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'vehicle_step_history';
```

**Resultado Esperado**: 1 fila

**Interpretación**:
- ✅ **1 fila** → Tabla existe, continuar con Paso 3
- ❌ **0 filas** → Tabla NO existe, migración NO aplicada

---

### ✅ Paso 3: Contar Registros en Historia (Safe)

**Query segura**:
```sql
-- Solo contar, no modificar nada
SELECT
  COUNT(*) AS total_records,
  COUNT(DISTINCT vehicle_id) AS unique_vehicles,
  COUNT(DISTINCT dealer_id) AS unique_dealers,
  MIN(entry_date) AS earliest_entry,
  MAX(entry_date) AS latest_entry
FROM vehicle_step_history;
```

**Interpretación**:
- ✅ **total_records > 0** → Hay datos, funciones deberían funcionar
- ⚠️ **total_records = 0** → Tabla vacía, funciones retornarán arrays vacíos (no error)

---

### ✅ Paso 4: Verificar Trigger Existe

**Query segura**:
```sql
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND trigger_name = 'trigger_manage_vehicle_step_history';
```

**Resultado Esperado**: 1 fila

**Interpretación**:
- ✅ **1 fila** → Trigger activo, generará historia en futuros cambios
- ❌ **0 filas** → Trigger NO existe, migración incompleta

---

### ✅ Paso 5: Obtener ID de Dealer Real (Safe)

**Query segura**:
```sql
-- Obtener IDs reales para testing
SELECT
  d.id,
  d.name,
  COUNT(v.id) AS vehicle_count
FROM dealerships d
LEFT JOIN get_ready_vehicles v ON v.dealer_id = d.id
GROUP BY d.id, d.name
HAVING COUNT(v.id) > 0
ORDER BY vehicle_count DESC
LIMIT 3;
```

**Guardar uno de estos IDs para el próximo paso.**

---

### ✅ Paso 6: Test Manual de Función (Safe - Solo Lectura)

**Query segura** (reemplazar `<DEALER_ID>` con ID real del Paso 5):
```sql
-- Test get_historical_kpis
SELECT * FROM get_historical_kpis(
  <DEALER_ID>::BIGINT,
  NOW() - INTERVAL '7 days',
  NOW()
);

-- Si funciona, test get_dealer_step_analytics
SELECT * FROM get_dealer_step_analytics(
  <DEALER_ID>::BIGINT,
  30
);
```

**Resultados Posibles**:
- ✅ **Retorna filas o array vacío `[]`** → Función funciona correctamente
- ❌ **Error "function does not exist"** → Función NO aplicada
- ❌ **Error "column does not exist"** → Schema incompleto
- ❌ **Error "permission denied"** → Problema de RLS (verificar usuario)

---

## 📊 Interpretación de Resultados

### Escenario A: Todo Existe y Funciona ✅

**Si todos los pasos 1-6 pasan**:
- Funciones existen
- Tabla existe
- Trigger existe
- Queries manuales funcionan

**Diagnóstico**: El problema está en el FRONTEND o en la forma de llamar las funciones.

**Próximo Paso**: Agregar logging detallado en `useGetReadyHistoricalAnalytics.ts`

---

### Escenario B: Funciones No Existen ❌

**Si Paso 1 retorna 0 funciones**:

**Diagnóstico**: La migración `20251025000000_create_vehicle_step_history.sql` NO fue aplicada.

**Próximo Paso**:
1. ⚠️ **ADVERTENCIA**: Aplicar migración es un cambio REAL a la base de datos
2. Confirmar con el usuario antes de proceder
3. Backup recomendado (aunque cambios son aditivos)
4. Aplicar migración completa

---

### Escenario C: Funciones Existen Pero Fallan ⚠️

**Si Paso 1 pasa pero Paso 6 falla**:

**Posibles Causas**:
1. **Error de parámetros**: Tipos no coinciden
2. **Error de permisos**: RLS bloqueando acceso
3. **Error de datos**: Tabla referenciada no existe
4. **Error de schema**: Columna esperada no existe

**Próximo Paso**: Analizar mensaje de error específico

---

### Escenario D: Tabla Vacía (No es Error) ℹ️

**Si Paso 3 retorna 0 registros**:

**Diagnóstico**: Es comportamiento esperado si:
- Ningún vehículo ha cambiado de step desde que se aplicó la migración
- El trigger no ha sido activado aún

**No es un bug**. Funciones retornarán arrays vacíos.

**Próximo Paso (Opcional)**: Generar datos de prueba moviendo un vehículo de step.

---

## 🎯 Acción Inmediata Requerida

### **Para el Usuario**:

**Por favor ejecutar estos queries en orden en Supabase SQL Editor y reportar resultados**:

1. ✅ Paso 1: ¿Cuántas funciones se listan? (Espero: 5)
2. ✅ Paso 2: ¿Existe la tabla? (Espero: Sí)
3. ✅ Paso 3: ¿Cuántos registros hay? (Espero: 0 o más)
4. ✅ Paso 4: ¿Existe el trigger? (Espero: Sí)
5. ✅ Paso 5: ¿Qué dealer_id vamos a usar para testing?
6. ✅ Paso 6: ¿Qué resultado da el test manual?

**Con estos 6 datos podré diagnosticar exactamente el problema.**

---

## ⚠️ Advertencias de Seguridad

### ✅ Safe (Todas las queries arriba son solo lectura):
- `SELECT` statements
- `information_schema` queries
- `COUNT`, `MIN`, `MAX` aggregations

### ❌ NO ejecutar todavía (requieren confirmación):
- `CREATE` statements
- `UPDATE` statements
- `INSERT` statements
- `DROP` statements
- Migración completa

---

## 📞 Próximos Pasos Después de Verificación

**Una vez tengamos los resultados, decidiré**:

1. ✅ **Si funciones NO existen** → Aplicar migración con confirmación del usuario
2. ✅ **Si funciones existen pero fallan** → Analizar error específico y crear fix quirúrgico
3. ✅ **Si funciones funcionan en SQL** → Problema está en frontend, agregar logging
4. ✅ **Si tabla vacía** → Opcionalmente generar datos de prueba (con confirmación)

---

**Estado**: ⏸️ **Esperando Verificación del Usuario**
**Nivel de Riesgo Actual**: 🟢 **NINGUNO** (solo lectura)
**Próxima Acción**: Usuario ejecuta queries de verificación

---

**¿Quieres que ejecute yo mismo el diagnóstico usando el MCP de Supabase (si está disponible), o prefieres hacerlo manualmente en el SQL Editor?** 🔍
