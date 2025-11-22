# Aplicar Migración de DetailHub Kiosks - Manual

## Problema
El endpoint de creación de kiosks devuelve error 400 porque la tabla `detail_hub_kiosks` existe pero le falta la columna `camera_status` (y posiblemente otras columnas).

## Solución
Aplicar la migración completa desde el archivo `supabase/migrations/20251117000003_create_detail_hub_kiosks.sql`

---

## Método 1: Supabase SQL Editor (RECOMENDADO)

### Paso 1: Abrir SQL Editor
1. Ve a https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr
2. Click en **SQL Editor** en el menú lateral izquierdo
3. Click en **New query**

### Paso 2: Copiar el SQL de migración
1. Abre el archivo `c:\Users\rudyr\apps\mydetailarea\supabase\temp_apply_kiosks_migration.sql`
2. Copia TODO el contenido (Ctrl+A, Ctrl+C)
3. Pega en el SQL Editor de Supabase

### Paso 3: Ejecutar la migración
1. Click en el botón **Run** (o presiona Ctrl+Enter)
2. Espera a que se complete la ejecución
3. Verifica que aparezca el mensaje de éxito

### Paso 4: Verificar la tabla
Ejecuta este SQL en una nueva query:

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'detail_hub_kiosks'
ORDER BY ordinal_position;
```

**Verifica que existan TODAS estas columnas:**
- ✅ `id` (uuid)
- ✅ `dealership_id` (integer)
- ✅ `kiosk_code` (text)
- ✅ `name` (text)
- ✅ `location` (text)
- ✅ `description` (text)
- ✅ `ip_address` (inet)
- ✅ `mac_address` (macaddr)
- ✅ `status` (USER-DEFINED - detail_hub_kiosk_status)
- ✅ **`camera_status`** (USER-DEFINED - detail_hub_camera_status) ⬅ **CRÍTICO**
- ✅ `last_ping` (timestamp with time zone)
- ✅ `last_heartbeat` (timestamp with time zone)
- ✅ `face_recognition_enabled` (boolean)
- ✅ `face_confidence_threshold` (integer)
- ✅ `kiosk_mode` (boolean)
- ✅ `auto_sleep` (boolean)
- ✅ `sleep_timeout_minutes` (integer)
- ✅ `allow_manual_entry` (boolean)
- ✅ `require_photo_fallback` (boolean)
- ✅ `screen_brightness` (integer)
- ✅ `volume` (integer)
- ✅ `theme` (text)
- ✅ `total_punches` (integer)
- ✅ `punches_today` (integer)
- ✅ `last_punch_at` (timestamp with time zone)
- ✅ `created_at` (timestamp with time zone)
- ✅ `updated_at` (timestamp with time zone)

### Paso 5: Verificar ENUMs
Ejecuta este SQL:

```sql
SELECT typname, typcategory
FROM pg_type
WHERE typname IN ('detail_hub_kiosk_status', 'detail_hub_camera_status');
```

Deberías ver 2 filas:
- `detail_hub_kiosk_status` | `E` (Enum)
- `detail_hub_camera_status` | `E` (Enum)

### Paso 6: Verificar RLS Policies
Ejecuta este SQL:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'detail_hub_kiosks';
```

Deberías ver 4 policies:
1. `Users can view kiosks from their dealerships` (SELECT)
2. `Managers can insert kiosks` (INSERT)
3. `Managers can update kiosks` (UPDATE)
4. `Admins can delete kiosks` (DELETE)

### Paso 7: Verificar Funciones
Ejecuta este SQL:

```sql
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name IN (
  'update_kiosk_heartbeat',
  'increment_kiosk_punch_counter',
  'get_kiosk_statistics',
  'reset_kiosk_daily_counter'
);
```

Deberías ver 4 funciones.

---

## Método 2: TablePlus / DBeaver (Alternativa)

Si tienes un cliente SQL instalado:

1. **Obtener credenciales de conexión**:
   - Host: `aws-0-us-east-1.pooler.supabase.com`
   - Port: `6543`
   - Database: `postgres`
   - User: `postgres.swfnnrpzpkdypbrzmgnr`
   - Password: `Y6u7aXMvNgXkbf4D`
   - SSL Mode: `require`

2. **Conectar y ejecutar**:
   - Abre el archivo `temp_apply_kiosks_migration.sql`
   - Ejecuta todo el contenido
   - Verifica con las queries del Paso 4-7 de arriba

---

## Verificación Final

Una vez aplicada la migración, prueba crear un kiosk desde la app:

```bash
curl -X POST https://swfnnrpzpkdypbrzmgnr.supabase.co/rest/v1/detail_hub_kiosks \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "dealership_id": 1,
    "kiosk_code": "KIOSK-TEST-001",
    "name": "Test Kiosk",
    "camera_status": "inactive"
  }'
```

Si devuelve **201 Created** en lugar de **400 Bad Request**, la migración fue exitosa.

---

## Limpieza

Después de verificar que todo funciona, elimina el archivo temporal:

```bash
rm c:\Users\rudyr\apps\mydetailarea\supabase\temp_apply_kiosks_migration.sql
```

---

## Troubleshooting

### Error: "relation already exists"
La tabla existe parcialmente. Ejecuta esto ANTES de la migración:

```sql
DROP TABLE IF EXISTS detail_hub_kiosks CASCADE;
DROP TYPE IF EXISTS detail_hub_camera_status CASCADE;
DROP TYPE IF EXISTS detail_hub_kiosk_status CASCADE;
```

Luego ejecuta la migración completa.

### Error: "column already exists"
Algunas columnas ya existen. Puedes:

**Opción A (RECOMENDADA)**: Dropear y recrear:
```sql
DROP TABLE detail_hub_kiosks CASCADE;
-- Luego ejecutar migración completa
```

**Opción B**: Agregar solo columnas faltantes:
```sql
ALTER TABLE detail_hub_kiosks
ADD COLUMN IF NOT EXISTS camera_status detail_hub_camera_status NOT NULL DEFAULT 'inactive';

ALTER TABLE detail_hub_kiosks
ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;

-- ... (agregar todas las columnas faltantes una por una)
```

### Error: "type already exists"
Los ENUMs ya existen. Esto es OK, la migración debería manejarlos con `IF NOT EXISTS`. Si da error, usa:

```sql
-- Verificar si los tipos existen
SELECT typname FROM pg_type WHERE typname IN ('detail_hub_kiosk_status', 'detail_hub_camera_status');

-- Si existen, comentar las líneas CREATE TYPE en la migración
```

---

## Contacto
Si encuentras problemas, contacta al DBA o revisa los logs en Supabase Dashboard → Logs → Database Logs.
