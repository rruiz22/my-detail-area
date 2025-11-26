# Sistema de Múltiples Breaks - Documentación Técnica

**Fecha**: November 25, 2024
**Versión**: v2.0
**Estado**: ✅ En Producción

---

## 🎯 Problema Resuelto

### Antes (v1.0 - Pérdida de Datos)

```
Timeline de Billy Mas - Nov 25, 2024:

08:17 AM → Clock In
02:00 PM → Start Break (Lunch) ✅
02:30 PM → End Break (30 min) ✅
05:47 PM → Start Break (ACCIDENTAL) ❌
           ↓
Result: Sistema SOBRESCRIBE primer break
        Break de 2 PM PERDIDO COMPLETAMENTE
        Solo queda break de 5:47 PM
        Data de payroll INCORRECTA ❌
```

### Ahora (v2.0 - Múltiples Breaks)

```
Timeline de Billy Mas - Nov 25, 2024:

08:17 AM → Clock In
02:00 PM → Start Break #1 (Lunch) ✅
02:30 PM → End Break #1 (30 min) ✅ GUARDADO en detail_hub_breaks
05:47 PM → Start Break #2 (Short Break) ✅
05:52 PM → End Break #2 (5 min) ✅ GUARDADO en detail_hub_breaks
06:03 PM → Clock Out
           ↓
Result: AMBOS breaks guardados
        Break #1: 30 min (lunch)
        Break #2: 5 min (short)
        Total break time: 35 min
        Data de payroll CORRECTA ✅
```

---

## 🏗️ Arquitectura del Sistema

### Nueva Tabla: `detail_hub_breaks`

```sql
CREATE TABLE detail_hub_breaks (
  id UUID PRIMARY KEY,
  time_entry_id UUID REFERENCES detail_hub_time_entries(id),
  employee_id UUID NOT NULL,
  dealership_id INTEGER NOT NULL,

  -- Break tracking
  break_number INTEGER NOT NULL,  -- 1, 2, 3, 4...
  break_start TIMESTAMPTZ NOT NULL,
  break_end TIMESTAMPTZ,
  duration_minutes INTEGER,

  -- Classification
  break_type TEXT DEFAULT 'regular',  -- 'lunch' | 'regular'
  is_paid BOOLEAN DEFAULT false,      -- ALL breaks unpaid

  -- Verification
  photo_start_url TEXT,
  photo_end_url TEXT,
  kiosk_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Relación con time_entries

```
detail_hub_time_entries (1)
    ↓ time_entry_id
detail_hub_breaks (many)

Un time_entry puede tener múltiples breaks (0, 1, 2, 3...)
```

---

## 📏 Reglas de Validación

### Break #1 (Lunch Break)

```
✅ Duración mínima: 30 minutos (o employee.template_break_minutes)
✅ Tipo: 'lunch'
✅ Unpaid: true
✅ Validación aplicada al intentar cerrar

Mensaje UI: "Lunch Break (min 30 min, unpaid)"
```

### Break #2+ (Short Breaks)

```
✅ Duración mínima: NINGUNA
✅ Tipo: 'regular'
✅ Unpaid: true
✅ Sin validación (libres)

Mensaje UI: "Short Break (no minimum, unpaid)"
Ejemplos: Bathroom, smoke, personal call, etc.
```

---

## 🔄 Flujo de Operación

### Iniciar Break

```typescript
// useStartBreak() - src/hooks/useDetailHubDatabase.tsx:483

1. Verifica que hay time_entry activo
2. Verifica que NO hay break abierto en detail_hub_breaks
3. INSERT nuevo registro en detail_hub_breaks
4. Trigger auto-asigna break_number (1, 2, 3...)
5. Trigger auto-asigna break_type ('lunch' para #1, 'regular' para #2+)
6. También actualiza time_entries.break_start (backward compatibility)

Toast: "Lunch Break started" o "Break #2 started"
```

### Cerrar Break

```typescript
// useEndBreak() - src/hooks/useDetailHubDatabase.tsx:576

1. Busca break abierto en detail_hub_breaks (break_end IS NULL)
2. Calcula duración (break_end - break_start)
3. SI es break #1:
   - Consulta employee.template_break_minutes (default 30)
   - Valida duration >= required_minimum
   - Si falla → Error "First break must be at least 30 minutes"
4. SI es break #2+:
   - NO validación (puede ser 1 min, 5 min, cualquier duración)
5. UPDATE detail_hub_breaks SET break_end = NOW()
6. Trigger calcula duration_minutes automáticamente
7. Trigger actualiza time_entry.break_duration_minutes (SUM de todos)

Toast: "Lunch break ended. Duration: 30 minutes" o "Break #2 ended. Duration: 5 minutes"
```

### Clock Out con Break Abierto

```typescript
// useClockOut() - src/hooks/useDetailHubDatabase.tsx:441-465

1. Busca TODOS los breaks abiertos para esta entry
2. Auto-cierra cada uno con clock_out timestamp
3. Logs: "[AUTO-CLOSE] Break #X auto-closed at clock out"
4. Trigger actualiza duraciones automáticamente
5. Procede con clock out normal

Console: "[AUTO-CLOSE] Found open breaks at clock out - auto-closing: 1"
```

---

## 🎨 Cambios de UI

### PunchClockKioskModal (Kiosk Time Clock)

**Start Break Button**:
```tsx
┌─────────────────────────────────────────┐
│  ☕ Start Break                         │
│     Lunch Break (min 30 min, unpaid)    │  ← Primera vez
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ☕ Start Break                         │
│     Short Break (no minimum, unpaid)    │  ← Segunda+ vez
└─────────────────────────────────────────┘
```

**End Break Button**:
```tsx
┌─────────────────────────────────────────┐
│  ☕ End Break                           │
│     Lunch Break  ⏱️ 5:23               │  ← Break #1 (con countdown)
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  ☕ End Break                           │
│     Break #2                            │  ← Break #2+ (sin countdown)
└─────────────────────────────────────────┘
```

**Break Status Display**:
```tsx
Estado "on_break":

  Break #1 (Lunch):
    - Muestra countdown hasta 30 min
    - Botón disabled hasta cumplir mínimo
    - Timer: "29:45" → "00:00"

  Break #2+:
    - NO muestra countdown
    - Botón enabled inmediatamente
    - Puede cerrar en cualquier momento
```

---

## 🗄️ Base de Datos

### Triggers Automáticos

#### 1. **assign_break_number()**
```sql
-- Auto-asigna break_number secuencial (1, 2, 3...)
-- Auto-asigna break_type ('lunch' si #1, 'regular' si #2+)

Ejecuta: BEFORE INSERT
```

#### 2. **calculate_break_duration()**
```sql
-- Calcula duration_minutes al cerrar break
-- duration = (break_end - break_start) / 60

Ejecuta: BEFORE INSERT OR UPDATE
```

#### 3. **update_time_entry_break_total()**
```sql
-- Suma TODOS los breaks cerrados
-- Actualiza time_entry.break_duration_minutes

SELECT SUM(duration_minutes) FROM detail_hub_breaks
WHERE time_entry_id = X AND break_end IS NOT NULL

Ejecuta: AFTER INSERT OR UPDATE OR DELETE
```

### Queries Importantes

**Ver todos los breaks de una entry**:
```sql
SELECT
  break_number,
  break_start AT TIME ZONE 'America/New_York' as start_et,
  break_end AT TIME ZONE 'America/New_York' as end_et,
  duration_minutes,
  break_type
FROM detail_hub_breaks
WHERE time_entry_id = 'PASTE_ID_HERE'
ORDER BY break_number;
```

**Ver breaks abiertos (no cerrados)**:
```sql
SELECT
  b.break_number,
  b.break_start,
  e.first_name || ' ' || e.last_name as employee_name
FROM detail_hub_breaks b
JOIN detail_hub_employees e ON e.id = b.employee_id
WHERE b.break_end IS NULL
ORDER BY b.break_start DESC;
```

**Resumen de breaks por empleado**:
```sql
SELECT
  e.first_name || ' ' || e.last_name as employee,
  DATE(b.break_start) as date,
  COUNT(*) as total_breaks,
  SUM(b.duration_minutes) as total_break_minutes
FROM detail_hub_breaks b
JOIN detail_hub_employees e ON e.id = b.employee_id
WHERE b.break_end IS NOT NULL
GROUP BY employee, DATE(b.break_start)
ORDER BY date DESC;
```

---

## 🧪 Testing Guide

### Test 1: Primer Break (Lunch) - Validación 30 Min

**Pasos**:
1. Abre kiosk → Clock in con cualquier empleado
2. Click "Start Break"
3. **Observa**: Mensaje dice "Lunch Break (min 30 min, unpaid)"
4. Espera 29 minutos
5. Intenta "End Break"
6. **Esperado**: Error - "First break (lunch) must be at least 30 minutes. Current: 29 min. Please wait 1 more minutes."
7. Espera 1 minuto más (total 30 min)
8. Click "End Break"
9. **Esperado**: Success ✅ - "Lunch break ended. Duration: 30 minutes"

**Verificación BD**:
```sql
SELECT * FROM detail_hub_breaks
WHERE employee_id = 'PASTE_ID'
ORDER BY break_number;

-- Esperado: 1 registro
-- break_number: 1
-- break_type: 'lunch'
-- duration_minutes: 30
```

---

### Test 2: Segundo Break (Short) - Sin Validación

**Pasos**:
1. (Después del lunch break anterior)
2. Click "Start Break" nuevamente
3. **Observa**: Mensaje dice "Short Break (no minimum, unpaid)"
4. Espera solo 5 minutos
5. Click "End Break"
6. **Esperado**: Success ✅ - "Break #2 ended. Duration: 5 minutes" (sin error)

**Verificación BD**:
```sql
SELECT break_number, duration_minutes, break_type
FROM detail_hub_breaks
WHERE employee_id = 'PASTE_ID'
ORDER BY break_number;

-- Esperado: 2 registros
-- Break #1: 30 min, type='lunch'
-- Break #2: 5 min, type='regular'
```

---

### Test 3: Múltiples Breaks (3+)

**Pasos**:
1. Toma lunch break (30 min) ✅
2. Toma break #2 (10 min) ✅
3. Toma break #3 (3 min) ✅
4. Clock out

**Verificación BD**:
```sql
SELECT
  break_number,
  duration_minutes,
  break_type,
  is_paid
FROM detail_hub_breaks
WHERE time_entry_id = 'PASTE_ID'
ORDER BY break_number;

-- Esperado: 3 registros
-- #1: 30 min, lunch, unpaid
-- #2: 10 min, regular, unpaid
-- #3: 3 min, regular, unpaid
```

**Verificar total**:
```sql
SELECT break_duration_minutes
FROM detail_hub_time_entries
WHERE id = 'PASTE_ID';

-- Esperado: 43 (30 + 10 + 3)
```

---

### Test 4: Auto-Close Break al Clock Out

**Pasos**:
1. Clock in
2. Start Break (lunch)
3. Espera 30+ minutos
4. **NO** cierres el break
5. Clock out directamente
6. **Observa consola (F12)**:
   ```
   [AUTO-CLOSE] Found open breaks at clock out - auto-closing: 1
   [AUTO-CLOSE] Break #1 auto-closed at clock out
   ```

**Verificación BD**:
```sql
SELECT break_end, duration_minutes
FROM detail_hub_breaks
WHERE time_entry_id = 'PASTE_ID';

-- Esperado:
-- break_end: NOT NULL (auto-cerrado)
-- duration_minutes: calculado desde break_start hasta clock_out
```

---

## 🔍 Troubleshooting

### Error: "Break must be at least 30 minutes"

**Causa**: Intentaste cerrar el primer break (lunch) antes de 30 minutos.

**Solución**: Espera hasta cumplir 30 minutos. El timer en el botón muestra cuánto falta.

**Excepción**: Si es break #2+ y ves este error → Bug (reportar)

---

### Error: "Break already in progress"

**Causa**: Ya hay un break abierto (break_end IS NULL).

**Solución**: Cierra el break actual antes de iniciar uno nuevo.

**Verificación**:
```sql
SELECT * FROM detail_hub_breaks
WHERE employee_id = 'PASTE_ID'
  AND break_end IS NULL;
```

---

### No se guarda el break

**Diagnóstico**:
```sql
-- 1. Ver breaks en nueva tabla
SELECT * FROM detail_hub_breaks
WHERE time_entry_id = 'PASTE_ID'
ORDER BY break_number;

-- 2. Ver break en columnas viejas (backward compatibility)
SELECT break_start, break_end, break_duration_minutes
FROM detail_hub_time_entries
WHERE id = 'PASTE_ID';

-- Ambos deberían tener data (durante transición)
```

**Si falla**:
1. Check consola del navegador (F12) por errores
2. Verifica que tabla detail_hub_breaks existe
3. Verifica triggers están activos:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE event_object_table = 'detail_hub_breaks';
   ```

---

## 📊 Migración de Data Existente

**Status**: ✅ Completada exitosamente

```
Total breaks migrados: 12
Fecha rango: Nov 24-25, 2025
Total minutos: 448
Todos marcados como break_number=1 (lunch)
Tipo: 'lunch'
Paid: false
```

**Breaks migrados**:
- Billy Mas: 2 entries
- Eleandro De Assis: 2 entries
- Jose Gonzalez: 2 entries
- Jean Moura Barros: 1 entry
- Nayra Fernandes: 2 entries
- Rudy Ruiz: 3 entries

**Columnas viejas**: MANTENIDAS para backward compatibility
- `time_entries.break_start` (deprecated)
- `time_entries.break_end` (deprecated)
- `time_entries.break_duration_minutes` (actualizado por trigger)

---

## 💻 Hooks Disponibles

### useStartBreak()
```typescript
const { mutateAsync: startBreak } = useStartBreak();

await startBreak({
  employeeId: '...',
  method: 'photo_fallback',
  photoUrl: '...',
  kioskId: 'KIOSK-001'
});

// Result: Nuevo registro en detail_hub_breaks
// break_number auto-asignado
// break_type auto-asignado
```

### useEndBreak()
```typescript
const { mutateAsync: endBreak } = useEndBreak();

await endBreak({
  employeeId: '...',
  method: 'photo_fallback',
  photoUrl: '...'
});

// Validación automática:
// - Break #1: requiere >= 30 min
// - Break #2+: sin validación
```

### useCurrentBreak(employeeId)
```typescript
const { data: currentBreak } = useCurrentBreak(employeeId);

// Returns:
// {
//   id: '...',
//   break_number: 2,
//   break_start: '2025-11-25T...',
//   break_end: null,  // Abierto
//   break_type: 'regular'
// }
//
// Or null if no break open
```

### useEmployeeBreaks(timeEntryId)
```typescript
const { data: breaks = [] } = useEmployeeBreaks(timeEntryId);

// Returns array:
// [
//   { break_number: 1, duration_minutes: 30, break_type: 'lunch' },
//   { break_number: 2, duration_minutes: 5, break_type: 'regular' },
//   { break_number: 3, duration_minutes: 10, break_type: 'regular' }
// ]
```

---

## 📈 Beneficios del Nuevo Sistema

### 1. **Cero Pérdida de Datos** ✅
- Cada break = registro separado
- Nunca se sobrescriben
- Historial completo preservado

### 2. **Cumplimiento Legal** ✅
- Primer break validado (30 min mínimo)
- Otros breaks libres (necesidades personales)
- Todos marcados como unpaid

### 3. **Flexibilidad Operativa** ✅
- Empleados pueden tomar múltiples breaks
- Bathroom breaks sin restricción
- Cumple necesidades reales del negocio

### 4. **Auto-Corrección** ✅
- Breaks olvidados se cierran automáticamente
- No quedan breaks "colgados"
- Data siempre consistente

### 5. **Backward Compatible** ✅
- Código viejo sigue funcionando
- Migración segura (can rollback)
- Transición gradual posible

---

## 🚀 Deployment

**Fecha**: November 25, 2024
**Método**: MCP (Supabase Management API)
**Downtime**: 0 segundos
**Rollback**: Posible (columnas viejas mantenidas)

**Commits**:
```
c97a7e6 - Backend: Multiple breaks system
12aafa5 - UI: Smart messaging for breaks
e5acee5 - Audit report update
```

**Migraciones aplicadas**:
1. `20251125214500_create_detail_hub_kiosk_devices_table.sql` ✅
2. `20251125230000_create_detail_hub_breaks_table.sql` ✅

---

## 📞 Soporte

Si encuentras problemas:

1. **Breaks no se guardan**: Check consola (F12) por errores de permisos
2. **Validación incorrecta**: Verifica break_number en BD
3. **Data inconsistente**: Compara detail_hub_breaks vs time_entries columns
4. **Auto-close no funciona**: Check logs "[AUTO-CLOSE]" en consola

**Contacto**: Enviar logs completos de consola + query results de BD

---

**Last Updated**: November 25, 2024
**Status**: Production Ready ✅
**Critical for**: Payroll accuracy, labor compliance
