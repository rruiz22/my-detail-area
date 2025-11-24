# 🚨 APLICAR FIX DE KIOSK_ID URGENTE

## Problema Detectado

La columna `kiosk_id` en la tabla `detail_hub_time_entries` está definida como **UUID** pero debe ser **TEXT** para almacenar el código del kiosk (ej: "KIOSK-003").

Esto causa errores **400 Bad Request** cuando intentamos filtrar o guardar datos:

```
GET .../detail_hub_time_entries?kiosk_id=eq.KIOSK-003 400 (Bad Request)
```

## Solución

Cambiar el tipo de columna de `UUID` a `TEXT` usando la migración creada.

---

## 📋 INSTRUCCIONES PASO A PASO

### 1. Ir al SQL Editor de Supabase

```
https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
```

### 2. Copiar y Pegar el Siguiente SQL

```sql
-- =====================================================
-- FIX: Change kiosk_id column type from UUID to TEXT
-- =====================================================

-- Drop any existing foreign key constraints on kiosk_id (if any)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'detail_hub_time_entries'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.constraint_name LIKE '%kiosk_id%'
    ) THEN
        ALTER TABLE detail_hub_time_entries
        DROP CONSTRAINT IF EXISTS detail_hub_time_entries_kiosk_id_fkey;
    END IF;
END $$;

-- Alter column type from UUID to TEXT
ALTER TABLE detail_hub_time_entries
  ALTER COLUMN kiosk_id TYPE TEXT
  USING kiosk_id::TEXT;

-- Add comment to clarify expected format
COMMENT ON COLUMN detail_hub_time_entries.kiosk_id IS
  'Kiosk code identifier (e.g., KIOSK-001, KIOSK-002). Stores detail_hub_kiosks.kiosk_code, not the UUID.';

-- Verify the change
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_name = 'detail_hub_time_entries'
    AND column_name = 'kiosk_id';

  IF v_data_type = 'text' THEN
    RAISE NOTICE '✅ SUCCESS: kiosk_id column type changed to TEXT';
  ELSE
    RAISE EXCEPTION '❌ FAILED: kiosk_id is still type: %', v_data_type;
  END IF;
END $$;
```

### 3. Ejecutar el SQL

Click en el botón **"Run"** o presiona `Ctrl+Enter`

### 4. Verificar Éxito

Deberías ver el mensaje:

```
✅ SUCCESS: kiosk_id column type changed to TEXT
```

---

## ✅ Verificación Post-Fix

Después de aplicar el fix:

1. **Refresca la página** del kiosk modal (F5)
2. **Verifica en la consola** que NO aparezcan más errores 400:
   ```
   ❌ ANTES: GET .../detail_hub_time_entries?kiosk_id=eq.KIOSK-003 400 (Bad Request)
   ✅ DESPUÉS: GET .../detail_hub_time_entries?kiosk_id=eq.KIOSK-003 200 (OK)
   ```
3. **Abre el modal de detalle del kiosk** y verifica que carguen:
   - Last Activity section (actividades recientes)
   - Employees section (empleados únicos)
4. **Haz un clock in/out** y verifica que se guarde el `kiosk_id` correctamente

---

## 🔍 Verificar en la Base de Datos

Para confirmar que el cambio se aplicó correctamente, ejecuta este SQL:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'detail_hub_time_entries'
  AND column_name = 'kiosk_id';
```

**Resultado esperado:**
| column_name | data_type | is_nullable |
|------------|-----------|-------------|
| kiosk_id   | text      | YES         |

---

## 📁 Archivos Relacionados

- **Migración**: `supabase/migrations/20251122000002_fix_kiosk_id_type.sql`
- **Código Frontend**:
  - `src/hooks/useDetailHubDatabase.tsx` (líneas 336, 403-404, 470-471, 547-548)
  - `src/components/detail-hub/PunchClockKioskModal.tsx` (líneas 671-672, 686-687, 700-701, 714-715)
  - `src/components/detail-hub/KioskDetailModal.tsx` (líneas 84, 136)

---

## 🔧 Troubleshooting

### Error: "cannot cast type uuid to text"

Si ves este error, significa que hay UUIDs válidos en la columna. Ejecuta primero:

```sql
-- Ver valores actuales
SELECT DISTINCT kiosk_id FROM detail_hub_time_entries WHERE kiosk_id IS NOT NULL;

-- Si hay UUIDs, limpiarlos primero (CUIDADO: esto borra los datos)
UPDATE detail_hub_time_entries SET kiosk_id = NULL;
```

Luego ejecuta la migración nuevamente.

### Error: "constraint does not exist"

Esto es normal - significa que no había constraints que eliminar. Continúa con el siguiente paso.

---

## 📊 Impacto

**Antes del fix:**
- ❌ Errores 400 en todas las queries con `kiosk_id`
- ❌ Modal de kiosk no carga actividades
- ❌ No se puede rastrear qué kiosk usó cada empleado

**Después del fix:**
- ✅ Queries funcionan correctamente
- ✅ Modal carga actividades y empleados
- ✅ Audit trail completo con kiosk_code e IP

---

**Tiempo estimado**: 2 minutos
**Prioridad**: 🔴 CRÍTICA (bloquea funcionalidad del kiosk modal)
