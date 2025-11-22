# 🚨 APLICAR FIX DE HEARTBEAT URGENTE

## Problema Detectado
Hay **2 versiones** de la función `update_kiosk_heartbeat` en la base de datos, causando un conflicto de sobrecarga:
- `update_kiosk_heartbeat(p_kiosk_code TEXT)` ← Versión antigua
- `update_kiosk_heartbeat(p_kiosk_code TEXT, p_ip_address TEXT)` ← Versión con IP

Esto impide que el heartbeat del kiosk funcione y el status no cambia de "offline" a "online".

## Solución
Ejecutar el siguiente SQL en el Dashboard de Supabase para eliminar las funciones duplicadas y crear una sola versión correcta.

---

## 📋 INSTRUCCIONES PASO A PASO

### 1. Ir al SQL Editor de Supabase
```
https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/sql/new
```

### 2. Copiar y Pegar el Siguiente SQL

```sql
-- =====================================================
-- FIX: Remove duplicate update_kiosk_heartbeat functions
-- =====================================================

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT);
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT, INET);
DROP FUNCTION IF EXISTS update_kiosk_heartbeat(TEXT, TEXT);

-- Create single version that accepts IP address (optional via default)
CREATE OR REPLACE FUNCTION update_kiosk_heartbeat(
  p_kiosk_code TEXT,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE detail_hub_kiosks
  SET
    last_heartbeat = NOW(),
    last_ping = NOW(),
    status = 'online',
    ip_address = COALESCE(p_ip_address, ip_address) -- Update IP if provided, keep existing if NULL
  WHERE kiosk_code = p_kiosk_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_kiosk_heartbeat IS 'Updates kiosk heartbeat timestamp, sets status to online, and optionally updates IP address';
```

### 3. Ejecutar el SQL
Click en el botón **"Run"** o presiona `Ctrl+Enter`

### 4. Verificar Éxito
Deberías ver el mensaje:
```
Success. No rows returned
```

---

## ✅ Verificación Post-Fix

Después de aplicar el fix:

1. **Refresca la página** del kiosk (F5)
2. **Abre el Time Clock** (Dev Kiosk)
3. **Verifica en la consola** que aparezca:
   ```
   [Kiosk] ✅ Heartbeat sent successfully
   ```
4. **Ve al Kiosk Manager** y verifica que el status cambió de "offline" a "online"
5. **El cambio debe ser instantáneo** gracias al Realtime

---

## 📁 Archivos Relacionados

- **Migración**: `supabase/migrations/20251122000001_fix_kiosk_heartbeat_function.sql`
- **Código Frontend**: `src/components/detail-hub/PunchClockKioskModal.tsx:362`
- **Hook**: `src/hooks/useDetailHubKiosks.tsx:112-143` (Realtime subscription)

---

## 🔍 Debugging

Si después del fix aún no funciona, verifica en la consola del navegador:

```javascript
// Debería ver:
[Kiosk] ✅ Heartbeat sent successfully (IP: 172.20.0.204)

// NO debería ver:
[Kiosk] ❌ Heartbeat failed: {...}
```

Si ves el error, ejecuta en el SQL Editor:
```sql
SELECT proname, proargtypes::regtype[]
FROM pg_proc
WHERE proname = 'update_kiosk_heartbeat';
```

Deberías ver **1 sola función** con argumentos: `{text,inet}`

---

**Tiempo estimado**: 2 minutos
**Prioridad**: 🔴 ALTA (bloquea funcionalidad de kiosks)
