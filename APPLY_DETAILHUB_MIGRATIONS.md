# Aplicar Migraciones de DetailHub a Supabase

## 📋 Resumen

Se han creado 4 migraciones SQL para el módulo DetailHub que deben aplicarse manualmente en Supabase SQL Editor.

## 🗂️ Migraciones Creadas

1. **`20251117000001_create_detail_hub_employees.sql`** - Tabla de empleados
2. **`20251117000002_create_detail_hub_time_entries.sql`** - Tabla de entradas de tiempo
3. **`20251117000003_create_detail_hub_kiosks.sql`** - Tabla de kiosks
4. **`20251117000004_create_detail_hub_invoices.sql`** - Tablas de facturas

## 🚀 Instrucciones de Aplicación

### Opción 1: Aplicar via Supabase Dashboard (Recomendado)

1. **Ir a Supabase Dashboard**:
   - URL: https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
   - Login con tu cuenta de Supabase

2. **Abrir SQL Editor**:
   - Menu lateral → **SQL Editor**
   - Click en **New query**

3. **Aplicar Migraciones en Orden**:

   **Migración 1 - Employees Table**:
   ```sql
   -- Copiar y pegar contenido completo de:
   -- supabase/migrations/20251117000001_create_detail_hub_employees.sql
   ```
   - Click en **Run** (o presionar Ctrl+Enter)
   - Verificar que se ejecute sin errores

   **Migración 2 - Time Entries Table**:
   ```sql
   -- Copiar y pegar contenido completo de:
   -- supabase/migrations/20251117000002_create_detail_hub_time_entries.sql
   ```
   - Click en **Run**
   - Verificar ejecución exitosa

   **Migración 3 - Kiosks Table**:
   ```sql
   -- Copiar y pegar contenido completo de:
   -- supabase/migrations/20251117000003_create_detail_hub_kiosks.sql
   ```
   - Click en **Run**
   - Verificar ejecución exitosa

   **Migración 4 - Invoices Tables**:
   ```sql
   -- Copiar y pegar contenido completo de:
   -- supabase/migrations/20251117000004_create_detail_hub_invoices.sql
   ```
   - Click en **Run**
   - Verificar ejecución exitosa

4. **Verificar Tablas Creadas**:
   ```sql
   -- Verificar que todas las tablas existen
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name LIKE 'detail_hub%'
   ORDER BY table_name;
   ```

   **Resultado esperado**:
   - `detail_hub_employees`
   - `detail_hub_invoice_line_items`
   - `detail_hub_invoices`
   - `detail_hub_kiosks`
   - `detail_hub_time_entries`

### Opción 2: Aplicar via Supabase CLI (Alternativa)

Si tienes la CLI de Supabase configurada:

```bash
# Autenticar con Supabase
npx supabase login

# Link al proyecto
npx supabase link --project-ref swfnnrpzpkdypbrzmgnr

# Aplicar migraciones
npx supabase db push --linked
```

## ✅ Verificación Post-Migración

### 1. Verificar Estructura de Tablas

```sql
-- Ver esquema de detail_hub_employees
\d detail_hub_employees

-- Ver esquema de detail_hub_time_entries
\d detail_hub_time_entries

-- Ver esquema de detail_hub_kiosks
\d detail_hub_kiosks

-- Ver esquema de detail_hub_invoices
\d detail_hub_invoices
```

### 2. Verificar RLS Policies

```sql
-- Ver policies de employees
SELECT * FROM pg_policies WHERE tablename = 'detail_hub_employees';

-- Ver policies de time_entries
SELECT * FROM pg_policies WHERE tablename = 'detail_hub_time_entries';
```

### 3. Verificar Triggers

```sql
-- Ver triggers creados
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_table LIKE 'detail_hub%'
ORDER BY event_object_table, trigger_name;
```

### 4. Verificar Funciones Helper

```sql
-- Ver funciones creadas
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%detail_hub%'
    OR routine_name LIKE '%employee_number%'
    OR routine_name LIKE '%invoice_number%'
  )
ORDER BY routine_name;
```

## 🔄 Siguiente Paso: Regenerar Tipos TypeScript

Después de aplicar exitosamente las migraciones, ejecutar:

```bash
# Regenerar tipos TypeScript desde Supabase
npm run generate:types

# O manualmente:
npx supabase gen types typescript --project-id swfnnrpzpkdypbrzmgnr > src/types/supabase.ts
```

## 📊 Resumen de Tablas Creadas

| Tabla | Propósito | Campos Clave |
|-------|-----------|--------------|
| **detail_hub_employees** | Gestión de empleados | `employee_number`, `role`, `department`, `face_enrolled` |
| **detail_hub_time_entries** | Control de horas | `clock_in`, `clock_out`, `total_hours`, `requires_manual_verification` |
| **detail_hub_kiosks** | Dispositivos kiosk | `kiosk_code`, `status`, `face_recognition_enabled` |
| **detail_hub_invoices** | Facturas principales | `invoice_number`, `client_name`, `total_amount`, `status` |
| **detail_hub_invoice_line_items** | Líneas de factura | `service_name`, `quantity`, `unit_price`, `line_total` |

## 🔐 Seguridad (RLS)

Todas las tablas tienen **Row Level Security (RLS)** habilitado con políticas basadas en `dealer_memberships`:

- ✅ **SELECT**: Usuarios pueden ver datos de sus dealerships
- ✅ **INSERT**: Managers y admins pueden insertar
- ✅ **UPDATE**: Managers y admins pueden actualizar
- ✅ **DELETE**: Solo admins pueden eliminar

## ⚙️ Características Automáticas

### Triggers Implementados:

1. **Auto-update `updated_at`** - Timestamp automático en updates
2. **Auto-calculate hours** - Cálculo automático de horas en time entries
3. **Auto-calculate break duration** - Duración de descansos automática
4. **Auto-flag photo fallback** - Marca automática para verificación manual
5. **Auto-calculate invoice totals** - Totales de factura automáticos
6. **Auto-update invoice status** - Estado de factura según fechas
7. **Auto-reset daily counters** - Reseteo de contadores diarios de kiosks

### Funciones Helper Disponibles:

- `generate_employee_number(dealership_id)` - Genera siguiente número de empleado
- `generate_invoice_number(dealership_id)` - Genera siguiente número de factura
- `get_active_time_entry(employee_id)` - Obtiene entrada activa de empleado
- `get_pending_reviews_count(dealership_id)` - Cuenta revisiones pendientes
- `calculate_employee_hours(employee_id, start_date, end_date)` - Calcula horas totales
- `update_kiosk_heartbeat(kiosk_code)` - Actualiza heartbeat de kiosk
- `increment_kiosk_punch_counter(kiosk_code)` - Incrementa contador de punches
- `get_kiosk_statistics(dealership_id)` - Estadísticas de kiosks
- `get_invoice_statistics(dealership_id)` - Estadísticas de facturación

## 🐛 Troubleshooting

### Error: "type already exists"
Si ves errores de tipos que ya existen, puedes usar `DROP TYPE IF EXISTS` antes de crear:
```sql
DROP TYPE IF EXISTS detail_hub_employee_role CASCADE;
```

### Error: "table already exists"
Las migraciones usan `CREATE TABLE IF NOT EXISTS`, pero si necesitas recrear:
```sql
DROP TABLE IF EXISTS detail_hub_time_entries CASCADE;
DROP TABLE IF EXISTS detail_hub_employees CASCADE;
-- Luego ejecuta la migración de nuevo
```

### Error: RLS Policy ya existe
```sql
DROP POLICY IF EXISTS "Users can view employees from their dealerships" ON detail_hub_employees;
-- Luego ejecuta la política de nuevo
```

## 📞 Soporte

Si encuentras problemas aplicando las migraciones:
1. Verificar que tienes permisos de admin en Supabase
2. Revisar logs de errores en Supabase Dashboard
3. Verificar que las tablas de referencia existen (`dealerships`, `dealer_memberships`)

---

**Fecha de creación**: 2025-11-17
**Autor**: Claude Code
**Versión**: 1.0.0
