# Aplicar Migraciones del Sistema de Punch - DetailHub

## 📋 Resumen

Se han creado **4 migraciones SQL** para implementar el sistema de punch tipo TSheets con políticas y validaciones.

## 🗂️ Migraciones a Aplicar

1. **`20251117000005_create_detail_hub_schedules.sql`** - Sistema de turnos programados
2. **`20251117000006_add_kiosk_assignment_to_employees.sql`** - Asignación de kiosk
3. **`20251117000007_add_break_photos_and_schedule_link.sql`** - Fotos de breaks y validaciones
4. **`20251117000008_create_live_dashboard_views.sql`** - Vista en tiempo real

## 🚀 Instrucciones de Aplicación

### Paso 1: Ir a Supabase Dashboard

1. Abrir: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Menu lateral → **SQL Editor**
3. Click en **New query**

### Paso 2: Aplicar Migraciones en Orden

#### **Migración 1 - Schedules Table**

Copiar y pegar contenido completo de:
```
supabase/migrations/20251117000005_create_detail_hub_schedules.sql
```

Click en **Run** (Ctrl+Enter)

Verificar output: `Success. No rows returned`

#### **Migración 2 - Kiosk Assignment**

Copiar y pegar contenido completo de:
```
supabase/migrations/20251117000006_add_kiosk_assignment_to_employees.sql
```

Click en **Run**

#### **Migración 3 - Break Photos & Schedule Link**

Copiar y pegar contenido completo de:
```
supabase/migrations/20251117000007_add_break_photos_and_schedule_link.sql
```

Click en **Run**

#### **Migración 4 - Live Dashboard Views**

Copiar y pegar contenido completo de:
```
supabase/migrations/20251117000008_create_live_dashboard_views.sql
```

Click en **Run**

### Paso 3: Verificar Tablas y Columnas Creadas

```sql
-- Verificar que detail_hub_schedules existe
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'detail_hub_schedules'
ORDER BY ordinal_position;

-- Verificar nuevas columnas en detail_hub_employees
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'detail_hub_employees'
  AND column_name IN ('default_kiosk_id', 'can_punch_any_kiosk');

-- Verificar nuevas columnas en detail_hub_time_entries
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'detail_hub_time_entries'
  AND column_name IN (
    'schedule_id',
    'break_start_photo_url',
    'break_end_photo_url',
    'schedule_variance_minutes',
    'break_policy_compliant'
  );

-- Verificar que la vista currently_working existe
SELECT * FROM detail_hub_currently_working LIMIT 1;
```

### Paso 4: Verificar Funciones Creadas

```sql
-- Ver funciones creadas
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%schedule%'
    OR routine_name LIKE '%punch%'
    OR routine_name LIKE '%break%'
    OR routine_name LIKE '%currently_working%'
  )
ORDER BY routine_name;
```

**Funciones esperadas:**
- `can_punch_in_now` - Validación de punch window
- `validate_break_duration` - Validación de break 30 min
- `detect_schedule_conflicts` - Detectar overlaps
- `get_employee_schedule` - Obtener schedule de hoy
- `get_weekly_schedules` - Schedules de la semana
- `get_live_dashboard_stats` - Estadísticas en tiempo real
- `get_break_violations` - Violaciones de break policy
- `get_schedule_compliance_report` - Reporte de compliance

### Paso 5: Verificar Triggers

```sql
-- Ver triggers creados
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('detail_hub_schedules', 'detail_hub_time_entries')
  AND trigger_name LIKE '%schedule%' OR trigger_name LIKE '%break%'
ORDER BY event_object_table, trigger_name;
```

**Triggers esperados:**
- `trigger_update_schedule_status` - Auto-update schedule status
- `trigger_calculate_schedule_variance` - Calcular variance vs schedule
- `trigger_validate_break_policy` - Validar break 30 min

---

## 🧪 Pruebas Post-Migración

### Test 1: Crear Schedule de Prueba

```sql
-- Insertar schedule para mañana
INSERT INTO detail_hub_schedules (
  employee_id,
  dealership_id,
  shift_date,
  shift_start_time,
  shift_end_time,
  required_break_minutes,
  early_punch_allowed_minutes
)
VALUES (
  (SELECT id FROM detail_hub_employees LIMIT 1),
  (SELECT id FROM dealerships LIMIT 1),
  CURRENT_DATE + INTERVAL '1 day',
  '08:00:00',
  '17:00:00',
  30,
  5
)
RETURNING *;
```

### Test 2: Probar Validación de Punch

```sql
-- Probar si employee puede punch in ahora
SELECT * FROM can_punch_in_now(
  (SELECT id FROM detail_hub_employees LIMIT 1),
  (SELECT id FROM detail_hub_kiosks LIMIT 1),
  NOW()
);
```

**Resultado esperado:**
- Si NO hay schedule hoy: `allowed = false`, `reason = 'No schedule found for today'`
- Si es muy temprano: `allowed = false`, `reason = 'Your shift starts at 08:00:00. You can punch in at 07:55:00'`
- Si está en ventana: `allowed = true`, `reason = 'Ready to punch in'`

### Test 3: Verificar Vista de Currently Working

```sql
-- Ver empleados activos (debe estar vacía inicialmente)
SELECT * FROM detail_hub_currently_working;
```

---

## 🔄 Después de Aplicar las Migraciones

### Regenerar Tipos TypeScript

```bash
npx supabase gen types typescript --project-id swfnnrpzpkdypbrzmgnr > src/types/supabase.ts
```

Esto actualizará los tipos con:
- `detail_hub_schedules` table
- Nuevas columnas en `detail_hub_employees`
- Nuevas columnas en `detail_hub_time_entries`
- Vista `detail_hub_currently_working`
- Nuevos ENUMs: `detail_hub_shift_status`

---

## 📊 Resumen de Cambios

### Nuevas Tablas (1)
- ✅ `detail_hub_schedules` - Turnos programados con kiosk assignment

### Columnas Agregadas

**En `detail_hub_employees` (2):**
- `default_kiosk_id` - Kiosk asignado por defecto
- `can_punch_any_kiosk` - Permiso para usar cualquier kiosk

**En `detail_hub_time_entries` (7):**
- `schedule_id` - Link a schedule programado
- `break_start_photo_url` - Foto al iniciar break
- `break_end_photo_url` - Foto al terminar break
- `schedule_variance_minutes` - Diferencia vs horario programado
- `early_punch_approved` - Si punch temprano fue aprobado
- `late_punch_approved` - Si punch tarde fue aprobado
- `break_policy_compliant` - Si cumple con 30 min mínimo
- `break_violation_reason` - Razón de no compliance

### Funciones SQL (8)
- `can_punch_in_now()` - **CRÍTICA** para validación
- `validate_break_duration()` - Validar 30 min
- `detect_schedule_conflicts()` - Prevenir overlaps
- `get_employee_schedule()` - Schedule de hoy
- `get_weekly_schedules()` - Schedules de semana
- `get_live_dashboard_stats()` - Estadísticas en tiempo real
- `get_break_violations()` - Reporte de violaciones
- `get_schedule_compliance_report()` - Compliance por employee

### Triggers (5)
- Auto-update de schedule status
- Auto-cálculo de variance vs schedule
- Validación automática de break policy (30 min)
- Auto-link de schedule a time entry
- Updated_at timestamp

### Vista (1)
- `detail_hub_currently_working` - Vista en tiempo real de empleados activos

---

## ⚠️ Importante

Después de aplicar estas migraciones, el sistema tendrá:

1. **Schedule enforcement** - Employees solo pueden punch in dentro de ventana permitida
2. **Kiosk assignment** - Validación de kiosk correcto
3. **Break policy** - Mínimo 30 minutos obligatorio
4. **Photo capture** - URLs guardadas para breaks (frontend por implementar)
5. **Compliance tracking** - Flags automáticos de violaciones

**Todo esto funciona automáticamente vía triggers - NO requiere lógica adicional en frontend.**

---

**Fecha**: 2025-11-17
**Status**: ⏳ Pendiente de aplicación
