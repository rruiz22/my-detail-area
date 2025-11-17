# ⚠️ Verificación de ENUMs de DetailHub

## Estado Actual

Los tipos TypeScript se regeneraron exitosamente desde Supabase, PERO algunos ENUMs no se están reflejando correctamente.

## 📊 Tablas Creadas ✅

Todas las tablas se crearon exitosamente:

- ✅ `detail_hub_employees`
- ✅ `detail_hub_time_entries`
- ✅ `detail_hub_kiosks`
- ✅ `detail_hub_invoices`
- ✅ `detail_hub_invoice_line_items`
- ✅ `detail_hub_face_audit` (extra - posiblemente creada por el usuario anteriormente)

## ⚠️ Problema con ENUMs

### ENUMs Creados en Migraciones

Según las migraciones SQL, deberíamos tener estos 8 tipos ENUM:

1. `detail_hub_employee_role`
2. `detail_hub_department`
3. `detail_hub_employee_status`
4. `detail_hub_punch_method`
5. `detail_hub_time_entry_status`
6. `detail_hub_kiosk_status`
7. `detail_hub_camera_status`
8. `detail_hub_invoice_status` ✅

### ENUMs Detectados por la Generación de Tipos

Solo se detectó correctamente:
- ✅ `detail_hub_invoice_status` → `"draft" | "pending" | "sent" | "paid" | "overdue" | "cancelled"`

### Campos que Deberían Usar ENUMs pero Usan `string`

**En `detail_hub_employees`:**
- ❌ `role: string` → Debería ser `Database["public"]["Enums"]["detail_hub_employee_role"]`
- ❌ `department: string` → Debería ser `Database["public"]["Enums"]["detail_hub_department"]`
- ❌ `status: string` → Debería ser `Database["public"]["Enums"]["detail_hub_employee_status"]`

**En `detail_hub_time_entries` (necesita verificación):**
- Campos esperados: `punch_in_method`, `punch_out_method`, `status`

**En `detail_hub_kiosks` (necesita verificación):**
- Campos esperados: `status`, `camera_status`

## 🔍 Verificar en Supabase Dashboard

Para diagnosticar el problema, ejecuta estas queries en Supabase SQL Editor:

### 1. Verificar que los ENUMs existen en PostgreSQL

```sql
-- Ver todos los tipos ENUM de detail_hub
SELECT
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname LIKE 'detail_hub%'
ORDER BY t.typname, e.enumsortorder;
```

**Resultado esperado:**
```
detail_hub_camera_status     | active
detail_hub_camera_status     | inactive
detail_hub_camera_status     | error
detail_hub_department        | detail
detail_hub_department        | car_wash
detail_hub_department        | service
detail_hub_department        | management
detail_hub_employee_role     | detailer
...
```

### 2. Verificar el tipo de las columnas

```sql
-- Ver tipos de columnas de detail_hub_employees
SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'detail_hub_employees'
  AND column_name IN ('role', 'department', 'status')
ORDER BY column_name;
```

**Resultado esperado:**
```
column_name | data_type      | udt_name
role        | USER-DEFINED   | detail_hub_employee_role
department  | USER-DEFINED   | detail_hub_department
status      | USER-DEFINED   | detail_hub_employee_status
```

**Si ves `data_type: 'text'` o `data_type: 'character varying'` en lugar de `USER-DEFINED`, significa que los tipos ENUM no se aplicaron.**

## 🛠️ Posibles Causas y Soluciones

### Causa 1: Migraciones No Se Aplicaron Completamente

**Síntomas**: Las tablas existen pero los ENUMs no.

**Solución**: Re-aplicar solo las secciones de CREATE TYPE:

```sql
-- Copiar y ejecutar SOLO las secciones CREATE TYPE de cada migración:

-- De 20251117000001_create_detail_hub_employees.sql
CREATE TYPE detail_hub_employee_role AS ENUM (
  'detailer',
  'car_wash',
  'supervisor',
  'manager',
  'technician'
);

CREATE TYPE detail_hub_department AS ENUM (
  'detail',
  'car_wash',
  'service',
  'management'
);

CREATE TYPE detail_hub_employee_status AS ENUM (
  'active',
  'inactive',
  'suspended',
  'terminated'
);

-- De 20251117000002_create_detail_hub_time_entries.sql
CREATE TYPE detail_hub_punch_method AS ENUM (
  'face',
  'pin',
  'manual',
  'photo_fallback'
);

CREATE TYPE detail_hub_time_entry_status AS ENUM (
  'active',
  'complete',
  'disputed',
  'approved'
);

-- De 20251117000003_create_detail_hub_kiosks.sql
CREATE TYPE detail_hub_kiosk_status AS ENUM (
  'online',
  'offline',
  'warning',
  'maintenance'
);

CREATE TYPE detail_hub_camera_status AS ENUM (
  'active',
  'inactive',
  'error'
);

-- detail_hub_invoice_status ya existe (funciona correctamente)
```

### Causa 2: Columnas Usan `TEXT` en Lugar de ENUM

**Síntomas**: Los ENUMs existen pero las columnas no los usan.

**Solución**: Alterar las columnas para usar los tipos ENUM:

```sql
-- ADVERTENCIA: Esto fallará si hay datos existentes que no coincidan con los valores ENUM

-- Para detail_hub_employees
ALTER TABLE detail_hub_employees
  ALTER COLUMN role TYPE detail_hub_employee_role
  USING role::detail_hub_employee_role;

ALTER TABLE detail_hub_employees
  ALTER COLUMN department TYPE detail_hub_department
  USING department::detail_hub_department;

ALTER TABLE detail_hub_employees
  ALTER COLUMN status TYPE detail_hub_employee_status
  USING status::detail_hub_employee_status;

-- Para detail_hub_time_entries
ALTER TABLE detail_hub_time_entries
  ALTER COLUMN punch_in_method TYPE detail_hub_punch_method
  USING punch_in_method::detail_hub_punch_method;

ALTER TABLE detail_hub_time_entries
  ALTER COLUMN punch_out_method TYPE detail_hub_punch_method
  USING punch_out_method::detail_hub_punch_method;

ALTER TABLE detail_hub_time_entries
  ALTER COLUMN status TYPE detail_hub_time_entry_status
  USING status::detail_hub_time_entry_status;

-- Para detail_hub_kiosks
ALTER TABLE detail_hub_kiosks
  ALTER COLUMN status TYPE detail_hub_kiosk_status
  USING status::detail_hub_kiosk_status;

ALTER TABLE detail_hub_kiosks
  ALTER COLUMN camera_status TYPE detail_hub_camera_status
  USING camera_status::detail_hub_camera_status;
```

### Causa 3: Error en Aplicación de Migraciones

**Síntomas**: Tablas existen pero incompletas o con errores.

**Solución**: Revisar logs de Supabase para errores.

## ✅ Después de Corregir los ENUMs

Regenerar los tipos TypeScript:

```bash
npx supabase gen types typescript --project-id swfnnrpzpkdypbrzmgnr > src/types/supabase.ts
```

Luego verificar que los tipos ahora incluyan los ENUMs:

```typescript
// En src/types/supabase.ts, deberías ver:

Database["public"]["Enums"]["detail_hub_employee_role"]:
  | "detailer"
  | "car_wash"
  | "supervisor"
  | "manager"
  | "technician"

Database["public"]["Enums"]["detail_hub_department"]:
  | "detail"
  | "car_wash"
  | "service"
  | "management"

// etc...
```

## 📝 Estado Actual del Código

**Por ahora, el código funcionará correctamente** porque los hooks de `useDetailHubDatabase.tsx` ya están tipados manualmente con interfaces locales:

```typescript
export interface DetailHubEmployee {
  role: 'detailer' | 'car_wash' | 'supervisor' | 'manager' | 'technician';
  department: 'detail' | 'car_wash' | 'service' | 'management';
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  // ...
}
```

Estas interfaces manuales proporcionan la misma validación de tipos que los ENUMs de Supabase, así que **la aplicación funcionará sin problemas mientras se corrigen los ENUMs en la base de datos**.

## 🎯 Recomendación

1. **Ejecutar verificación query #1** para confirmar si los ENUMs existen
2. **Si ENUMs no existen**: Ejecutar los CREATE TYPE de la solución Causa 1
3. **Si ENUMs existen pero columnas no los usan**: Ejecutar ALTER TABLE de la solución Causa 2
4. **Regenerar tipos** después de la corrección
5. **Opcional**: Migrar de tipos manuales a tipos generados de Supabase

---

**Fecha**: 2025-11-17
**Status**: ⚠️ Requiere verificación manual en Supabase Dashboard
