# 📋 Schedule System Deprecation Plan - Fases Restantes

**Fecha de inicio:** 26 de Noviembre, 2025
**Estado actual:** FASE 1 y 2 COMPLETADAS
**Objetivo:** Deprecar `detail_hub_schedules` y usar solo `employee.schedule_template`

---

## ✅ COMPLETADO (Sesión Actual)

### FASE 1: Backend Template Validation ✅

**Archivos modificados:**
- ✅ Migración: `create_can_punch_in_from_template_function_fixed.sql`
- ✅ Migración: `update_variance_trigger_use_template.sql`
- ✅ Migración: `add_timezone_to_dealerships.sql`
- ✅ Migración: `fix_schedule_variance_timezone_aware.sql`
- ✅ Hook: `src/hooks/useDetailHubDatabase.tsx` (líneas 1488-1526)

**Funcionalidad:**
- ✅ Nueva función `can_punch_in_from_template()` valida usando template del empleado
- ✅ Trigger `calculate_schedule_variance()` actualizado para usar template cuando `schedule_id IS NULL`
- ✅ Hook `useTemplateValidation()` creado para frontend
- ✅ Timezone awareness agregado (dealerships.timezone = 'America/New_York')
- ✅ Fix de error de 300 minutos por timezone

**Testeado:**
- ✅ Función retorna `allowed: true` para empleados válidos
- ✅ Varianzas corregidas (1-125 min en lugar de 300+ min)

---

### FASE 2: Validación Pre-Punch en Modal de Producción ✅

**Archivo modificado:**
- ✅ `src/components/detail-hub/PunchClockKioskModal.tsx`

**Cambios aplicados:**
1. Import de `useTemplateValidation` (línea 64)
2. Import de `AlertCircle` icon (línea 42)
3. Hook call agregado (líneas 187-191)
4. Alert component agregado (líneas 1590-1622)
5. Botón Clock In deshabilitado condicionalmente (línea 1634)

**Comportamiento:**
- ✅ Muestra alerta verde si empleado puede hacer punch
- ✅ Muestra alerta amber si es muy temprano
- ✅ Countdown en tiempo real: "(0h 10m remaining)"
- ✅ Botón deshabilitado si `templateValidation.allowed === false`

---

## 🚧 PENDIENTE (Próxima Sesión)

### FASE 3: Testing Exhaustivo (1 hora)

**CRÍTICO: Testear antes de continuar con deprecación**

#### 3.1 Test Cases

**Test 1: Empleado sin template**
```
1. Seleccionar empleado sin schedule_template configurado
2. Verificar que muestre: "No default schedule configured"
3. Verificar que botón Clock In esté deshabilitado
```

**Test 2: Empleado con template, dentro de ventana**
```
1. Seleccionar empleado con template (shift 8:00 AM, early window 5 min)
2. Verificar hora actual (debe ser >= 7:55 AM)
3. Verificar alerta verde: "Ready to punch in"
4. Verificar botón Clock In HABILITADO
5. Hacer clock in exitoso
6. Verificar que schedule_variance_minutes se calculó correctamente
```

**Test 3: Empleado muy temprano (CRÍTICO)**
```
1. Configurar template: shift_start_time = hora actual + 20 minutos
2. Intentar punch in
3. Verificar alerta amber: "Your shift starts at... You can punch in at..."
4. Verificar countdown actualiza cada 30 segundos
5. Verificar botón Clock In DESHABILITADO
6. ESPERAR hasta que se abra ventana
7. Verificar que botón se habilita automáticamente
```

**Test 4: Día no laboral**
```
1. Configurar template con days_of_week = [1,2,3,4,5] (Lun-Vie)
2. Si hoy es sábado/domingo, intentar punch
3. Verificar mensaje: "Not a scheduled work day"
4. Verificar botón deshabilitado
```

**Test 5: Break flow (asegurar que no se rompió)**
```
1. Clock in exitoso
2. Start break
3. End break (verificar 30 min minimum)
4. Clock out
5. Verificar que TODO funciona sin errores
```

#### 3.2 SQL Verification Queries

```sql
-- Verificar que empleados tienen templates configurados
SELECT
  first_name || ' ' || last_name AS name,
  schedule_template IS NOT NULL AS has_template,
  schedule_template->>'shift_start_time' AS shift_start,
  schedule_template->>'early_punch_allowed_minutes' AS early_window
FROM detail_hub_employees
WHERE status = 'active'
ORDER BY first_name;

-- Verificar que varianzas se calculan correctamente
SELECT
  e.first_name || ' ' || e.last_name AS name,
  te.clock_in AT TIME ZONE d.timezone AS clock_in_local,
  e.schedule_template->>'shift_start_time' AS template_start,
  te.schedule_variance_minutes
FROM detail_hub_time_entries te
JOIN detail_hub_employees e ON e.id = te.employee_id
JOIN dealerships d ON d.id = te.dealership_id
WHERE te.clock_out IS NULL
  AND te.status = 'active'
  AND te.schedule_id IS NULL  -- Using template, not schedule
ORDER BY te.clock_in DESC
LIMIT 10;
```

#### 3.3 Rollback Plan (Si algo falla)

**Si la validación no funciona correctamente:**

```sql
-- 1. Remover disabled del botón
-- Archivo: src/components/detail-hub/PunchClockKioskModal.tsx
-- Línea 1634: Eliminar disabled={templateValidation?.allowed === false}

-- 2. (Opcional) Restaurar can_punch_in_now() original
-- Revisar backup en: supabase/migrations_backup_2025-11-24/
```

---

### FASE 4: Mejorar UI de Template en Employee Creation (30 min)

**Objetivo:** Hacer obvio y fácil configurar horario default del empleado

#### 4.1 Archivo a Modificar

`src/components/detail-hub/EmployeePortal.tsx`

#### 4.2 Cambios Necesarios

**Encontrar sección de Schedule Template (aproximadamente líneas 800-900)**

**Antes (probablemente oculto o no prominente):**
```tsx
<Collapsible>
  <CollapsibleTrigger>Advanced Settings</CollapsibleTrigger>
  <CollapsibleContent>
    <Input name="shift_start_time" />
    <Input name="shift_end_time" />
  </CollapsibleContent>
</Collapsible>
```

**Después (prominente y claro):**
```tsx
{/* Default Work Schedule - REQUIRED */}
<Card className="border-2 border-emerald-500">
  <CardHeader>
    <CardTitle>Default Work Schedule</CardTitle>
    <CardDescription>
      Set employee's standard shift hours. This will be used for all punch-in validations.
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Shift Times */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Shift Start Time *</Label>
        <Input
          type="time"
          defaultValue="08:00"
          {...register('schedule_template.shift_start_time')}
        />
      </div>
      <div>
        <Label>Shift End Time *</Label>
        <Input
          type="time"
          defaultValue="17:00"
          {...register('schedule_template.shift_end_time')}
        />
      </div>
    </div>

    {/* Work Days */}
    <div>
      <Label>Work Days</Label>
      <div className="flex gap-2 mt-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
          <Button
            key={day}
            type="button"
            variant={workDays.includes(index + 1) ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleWorkDay(index + 1)}
          >
            {day}
          </Button>
        ))}
      </div>
    </div>

    {/* Punch Windows */}
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label>Early Punch Window (minutes)</Label>
        <Input
          type="number"
          min="0"
          max="15"
          step="5"
          defaultValue="5"
          {...register('schedule_template.early_punch_allowed_minutes')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          How early can employee punch in? (Max 15 min)
        </p>
      </div>
      <div>
        <Label>Late Punch Grace (minutes)</Label>
        <Input
          type="number"
          min="0"
          max="30"
          step="5"
          defaultValue="15"
          {...register('schedule_template.late_punch_grace_minutes')}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Grace period for late arrivals
        </p>
      </div>
    </div>

    {/* Preview */}
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-700">
        <strong>Preview:</strong> {employeeName} will work Mon-Fri, 8:00 AM - 5:00 PM.
        Can punch in starting at 7:55 AM.
      </p>
    </div>

    {/* Auto-enable */}
    <input
      type="hidden"
      value="true"
      {...register('auto_generate_schedules')}
    />
  </CardContent>
</Card>
```

#### 4.3 Validación a Agregar

```typescript
// En el schema de validación (Zod o similar)
schedule_template: z.object({
  shift_start_time: z.string().regex(/^\d{2}:\d{2}$/),
  shift_end_time: z.string().regex(/^\d{2}:\d{2}$/),
  days_of_week: z.array(z.number().min(1).max(7)).min(1),
  early_punch_allowed_minutes: z.number().min(0).max(15),
  late_punch_grace_minutes: z.number().min(0).max(30),
}).refine(
  (data) => data.shift_end_time > data.shift_start_time,
  { message: "End time must be after start time" }
)
```

---

### FASE 5: Deprecar Tabla de Schedules (1.5 horas)

**ADVERTENCIA: Esta fase es DESTRUCTIVA. Hacer backup primero.**

#### 5.1 Backup de Data Histórica

```sql
-- Migración: backup_schedules_before_deprecation.sql

-- Crear tabla de archivo
CREATE TABLE IF NOT EXISTS detail_hub_schedules_archive AS
SELECT * FROM detail_hub_schedules
WHERE 1=0;  -- Copy structure only

-- Copiar TODOS los schedules existentes
INSERT INTO detail_hub_schedules_archive
SELECT * FROM detail_hub_schedules;

-- Verificar count
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM detail_hub_schedules_archive;
  RAISE NOTICE 'Backed up % schedules to archive table', v_count;
END $$;
```

#### 5.2 Eliminar Schedule_ID de Time Entries Activos

```sql
-- Migración: remove_schedule_id_from_active_entries.sql

-- CRITICAL: Hacer que schedule_id sea completamente opcional
-- Eliminar schedule_id de time entries activos para que usen template
UPDATE detail_hub_time_entries
SET schedule_id = NULL,
    updated_at = NOW()
WHERE clock_out IS NULL
  AND status = 'active';

-- Comentar columna como deprecated
COMMENT ON COLUMN detail_hub_time_entries.schedule_id IS
  'DEPRECATED: No longer used. Schedule variance now calculated from employee.schedule_template. Column preserved for historical data only.';
```

#### 5.3 Deshabilitar Triggers de Schedules

```sql
-- Migración: disable_schedule_triggers.sql

-- Deshabilitar trigger de auto-generación
DROP TRIGGER IF EXISTS trigger_auto_generate_schedules ON detail_hub_employees;

-- Deshabilitar trigger de update status
DROP TRIGGER IF EXISTS trigger_update_schedule_status ON detail_hub_schedules;

-- Preservar función calculate_schedule_variance (ya actualizada para templates)
-- Preservar función allow_supervisor_override (necesita schedules para walk-ins)
```

#### 5.4 DROP Funciones de Schedules (Cuidadosamente)

```sql
-- Migración: drop_schedule_functions.sql

-- ⚠️ CUIDADO: Verificar que ninguna de estas se usa en UI antes de eliminar

-- DROP funciones relacionadas con schedules (en este orden)
DROP FUNCTION IF EXISTS get_weekly_schedules(UUID, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS detect_schedule_conflicts(UUID, DATE, TIME, TIME, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_employee_schedule(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS generate_employee_schedules(UUID, DATE, DATE) CASCADE;

-- NO ELIMINAR estas funciones (aún se usan):
-- ✅ calculate_schedule_variance() - Actualizada para templates
-- ✅ can_punch_in_from_template() - Nueva función principal
-- ✅ allow_supervisor_override() - Crea schedules temporales

-- Marcar can_punch_in_now() como deprecated
COMMENT ON FUNCTION can_punch_in_now IS
  'DEPRECATED: Use can_punch_in_from_template() instead. Preserved for backward compatibility only.';
```

#### 5.5 Soft Delete de Schedules Futuros

```sql
-- Migración: soft_delete_future_schedules.sql

-- Eliminar schedules auto-generados futuros (preserva manuales y completados)
DELETE FROM detail_hub_schedules
WHERE status IN ('scheduled', 'confirmed')
  AND shift_date > CURRENT_DATE
  AND notes LIKE '%Auto-generated%';

-- Log resultado
DO $$
DECLARE
  v_deleted INTEGER;
BEGIN
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Deleted % auto-generated future schedules', v_deleted;
END $$;

-- Preservar:
-- ✅ Schedules completados (status = 'completed')
-- ✅ Schedules históricos (shift_date <= CURRENT_DATE)
-- ✅ Schedules manuales (notes NOT LIKE '%Auto-generated%')
```

#### 5.6 (Opcional) DROP Tabla Completa

**⚠️ SOLO SI ESTÁS 100% SEGURO**

```sql
-- Migración: drop_schedules_table.sql

-- ADVERTENCIA: ESTO ES IRREVERSIBLE (backup ya existe en _archive)

-- 1. Eliminar foreign key de time_entries
ALTER TABLE detail_hub_time_entries
DROP CONSTRAINT IF EXISTS detail_hub_time_entries_schedule_id_fkey;

-- 2. DROP tabla
DROP TABLE IF EXISTS detail_hub_schedules CASCADE;

-- 3. Verificar que nada se rompió
SELECT COUNT(*) FROM detail_hub_time_entries WHERE clock_out IS NULL;
-- Debería retornar el número de empleados actualmente trabajando
```

---

### FASE 6: Remover UI de Schedules (1 hora)

**ADVERTENCIA: Esto eliminará 1,746 líneas de código**

#### 6.1 Archivos a ELIMINAR

```bash
# Componentes de schedules (total: 1,746 líneas)
rm src/components/detail-hub/ScheduleCalendar.tsx       # 435 líneas
rm src/components/detail-hub/ScheduleList.tsx           # 592 líneas
rm src/components/detail-hub/ShiftAssignmentDialog.tsx  # 719 líneas

# Hook de schedules
rm src/hooks/useDetailHubSchedules.tsx  # Todas las funciones
```

#### 6.2 Actualizar Navegación

**Archivo:** `src/components/AppSidebar.tsx` (o similar)

**Buscar y eliminar:**
```tsx
{
  title: "Schedules",
  url: "/detail-hub/schedules",
  icon: Calendar,
  permission: { module: "detail_hub", permission: "read" }
}
```

#### 6.3 Actualizar Rutas

**Archivo:** `src/App.tsx` o router file

**Buscar y eliminar:**
```tsx
<Route path="/detail-hub/schedules" element={<ScheduleCalendar />} />
<Route path="/detail-hub/schedules/list" element={<ScheduleList />} />
```

#### 6.4 Actualizar Detail Hub Dashboard

**Archivo:** `src/components/detail-hub/DetailHubDashboard.tsx` (o similar)

**Buscar y eliminar:**
- Links a "View Schedules"
- Quick action buttons relacionados con schedules
- Tabs de schedules

#### 6.5 Actualizar Views de Base de Datos

```sql
-- Migración: update_views_remove_schedule_columns.sql

-- Actualizar detail_hub_currently_working para NO incluir schedule fields
DROP VIEW IF EXISTS detail_hub_currently_working;

CREATE OR REPLACE VIEW detail_hub_currently_working AS
SELECT
  -- Employee fields
  e.id AS employee_id,
  e.employee_number,
  e.first_name,
  e.last_name,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.department,
  e.role,
  e.fallback_photo_url AS profile_photo_url,

  -- Time entry fields
  dte.id AS time_entry_id,
  dte.clock_in,
  dte.photo_in_url,
  dte.kiosk_id,

  -- Kiosk fields
  k.name AS kiosk_name,
  k.kiosk_code,

  -- Calculated fields
  ROUND(EXTRACT(EPOCH FROM NOW() - dte.clock_in) / 3600, 2) AS elapsed_hours,
  TO_CHAR(JUSTIFY_HOURS(NOW() - dte.clock_in), 'HH24:MI') AS elapsed_time_formatted,

  -- Break fields
  CASE
    WHEN dte.break_start IS NOT NULL AND dte.break_end IS NULL THEN true
    ELSE false
  END AS is_on_break,
  dte.break_start,
  CASE
    WHEN dte.break_start IS NOT NULL AND dte.break_end IS NULL
    THEN ROUND(EXTRACT(EPOCH FROM NOW() - dte.break_start) / 60, 0)::integer
    ELSE NULL
  END AS break_elapsed_minutes,

  -- Dealership
  dte.dealership_id,

  -- Schedule variance (calculated from template, not schedule table)
  dte.schedule_variance_minutes

FROM detail_hub_employees e
JOIN detail_hub_time_entries dte ON dte.employee_id = e.id
LEFT JOIN detail_hub_kiosks k ON k.kiosk_code = dte.kiosk_id
WHERE
  dte.status = 'active'
  AND dte.clock_out IS NULL
  AND e.status = 'active'
ORDER BY dte.clock_in;
```

#### 6.6 Actualizar TypeScript Interfaces

**Archivo:** `src/hooks/useCurrentlyWorking.tsx`

**Eliminar campos de schedule:**
```typescript
export interface CurrentlyWorkingEmployee {
  // ... otros campos ...

  // ELIMINAR ESTOS:
  // schedule_id: string | null;
  // scheduled_start: string | null;
  // scheduled_end: string | null;
  // early_punch_approved: boolean | null;

  // MANTENER ESTE:
  schedule_variance_minutes: number | null;  // Calculado de template

  // ... otros campos ...
}
```

---

## 📝 Checklist Final de Implementación

### Antes de Empezar Próxima Sesión

- [ ] **Testear FASE 1+2** exhaustivamente en browser
- [ ] **Verificar** que badges de early/late funcionan
- [ ] **Confirmar** que empleados tienen templates configurados
- [ ] **Crear backup** de base de datos completo
- [ ] **Documentar** cualquier issue encontrado

### Durante FASE 3 (Testing)

- [ ] Test 1: Empleado sin template
- [ ] Test 2: Empleado con template, dentro de ventana
- [ ] Test 3: Empleado muy temprano (validación bloq)
- [ ] Test 4: Día no laboral
- [ ] Test 5: Break flow completo
- [ ] SQL verification queries ejecutadas
- [ ] **SI TODO FUNCIONA** → Continuar con FASE 4

### Durante FASE 4 (UI Improvement)

- [ ] Encontrar sección de template en EmployeePortal
- [ ] Hacer prominente y requerida
- [ ] Agregar preview card
- [ ] Testear creación de nuevo empleado
- [ ] Verificar que template se guarda correctamente

### Durante FASE 5 (Deprecation)

- [ ] ✅ **Backup ejecutado** (OBLIGATORIO)
- [ ] Eliminar schedule_id de time entries activos
- [ ] Deshabilitar triggers
- [ ] DROP funciones no usadas
- [ ] Soft delete de schedules futuros
- [ ] (Opcional) DROP tabla si estás seguro
- [ ] Verificar que kiosk sigue funcionando

### Durante FASE 6 (UI Cleanup)

- [ ] Eliminar componentes de schedules
- [ ] Actualizar navegación
- [ ] Actualizar rutas
- [ ] Actualizar views de DB
- [ ] Actualizar interfaces TypeScript
- [ ] Build exitoso (`npm run build`)
- [ ] **Test completo** de flujo de kiosk

---

## 🚨 Advertencias Críticas

### NO Ejecutar Estas Migraciones Sin Testing

```sql
-- ❌ PELIGROSO - Solo después de testing exhaustivo
DROP TABLE detail_hub_schedules CASCADE;
DROP FUNCTION can_punch_in_now() CASCADE;
```

### Siempre Tener Rollback Plan

**Si algo falla en FASE 5/6:**

1. Restaurar desde backup
2. Revertir migraciones:
   ```bash
   git revert [commit_hash]
   supabase db reset --linked
   ```
3. Restaurar componentes eliminados desde git:
   ```bash
   git checkout HEAD~1 -- src/components/detail-hub/Schedule*.tsx
   ```

---

## 📊 Progreso Total

**Completado:** 40% (FASE 1-2)
**Pendiente:** 60% (FASE 3-6)
**Tiempo estimado restante:** 4 horas

---

## 🎯 Resultado Final Esperado

### Después de Todas las Fases

**Para Managers:**
```
1. Crear empleado en EmployeePortal
2. Configurar horario: 8:00 AM - 5:00 PM, Lun-Vie
3. Configurar ventanas: early 5 min, late 15 min
4. ¡Listo! No más creación de schedules
```

**Para Empleados:**
```
1. Llegar al kiosk a las 7:55 AM
2. Buscar nombre, ingresar PIN
3. Ver alerta verde: "Ready to punch in"
4. Click en Clock In → Captura foto → ✅ Success
```

**Si llega muy temprano (7:40 AM):**
```
1. Buscar nombre, ingresar PIN
2. Ver alerta amber: "Your shift starts at 8:00. You can punch in at 7:55 (0h 15m remaining)"
3. Botón Clock In DESHABILITADO
4. Esperar hasta 7:55 AM
5. Alert cambia a verde automáticamente
6. Botón se habilita → Clock in
```

---

## 📞 Soporte

**Si encuentras problemas:**

1. Revisar logs de Supabase: `supabase logs --linked`
2. Revisar browser console
3. Verificar queries SQL con `mcp__supabase__execute_sql`
4. Consultar este documento

**Archivos clave:**
- Backend: `src/hooks/useDetailHubDatabase.tsx`
- Modal: `src/components/detail-hub/PunchClockKioskModal.tsx`
- Employee UI: `src/components/detail-hub/EmployeePortal.tsx`

---

**Última actualización:** 26 Nov 2025
**Autor:** Claude Code
**Versión:** v1.3.48
