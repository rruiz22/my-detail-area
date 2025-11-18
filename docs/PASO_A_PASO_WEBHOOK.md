# 🔧 Configuración Webhook - Paso a Paso

**Objetivo:** Habilitar delivery status tracking completo
**Tiempo:** 5 minutos
**Dificultad:** Fácil

---

## 📋 PASO 1: Deshabilitar JWT en sms-webhook (Supabase)

### Ir al Dashboard de Supabase

1. **Abrir:** https://supabase.com/dashboard/project/swfnnrpzpkdypbrzmgnr/functions

2. **Encontrar:** `sms-webhook` en la lista de funciones

3. **Click en el nombre** `sms-webhook`

4. **En la página de la función:**
   - Busca en la parte superior o en un menú de configuración
   - Puede estar en: **Settings**, **Configuration**, o directamente en la página

5. **Buscar el toggle:** "Enforce JWT verification" o "Require authorization"
   - Actualmente: ✅ ON (activado)
   - **Cambiarlo a:** ⬜ OFF (desactivado)

6. **Guardar** los cambios

### ¿Dónde está exactamente?

**Opción A - En la página principal de la función:**
```
sms-webhook
├─ Overview
├─ Settings  ← Click aquí
│  └─ Enforce JWT verification [Toggle OFF]
└─ Logs
```

**Opción B - En el menú superior derecho:**
```
[⚙️ Settings] ← Click aquí
└─ Security
   └─ Enforce JWT verification [Toggle OFF]
```

**Opción C - En detalles de la función:**
```
Function Details
├─ Name: sms-webhook
├─ Status: ACTIVE
└─ Enforce JWT: [Toggle OFF] ← Aquí
```

### Verificación

Después de cambiar, la función debería mostrar:
```
verify_jwt: false ✅
```

---

## 📋 PASO 2: Configurar STATUS CALLBACK URL en Twilio

### A. Encontrar el Campo Correcto

1. **Estás en:** Phone Numbers → [Tu número] → Configure

2. **Scroll DOWN** en la página (más abajo de donde estás)

3. **Después de "Primary handler fails"** deberías ver:

```
┌─────────────────────────────────────────────────┐
│ STATUS CALLBACK URL              ⚠️ AQUÍ        │
│ ┌─────────────────────────────────────────────┐ │
│ │ [Campo vacío o con otra URL]                │ │
│ └─────────────────────────────────────────────┘ │
│ HTTP [POST ▼]                                   │
└─────────────────────────────────────────────────┘
```

### B. Pegar la URL

**En el campo "STATUS CALLBACK URL":**
```
https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/sms-webhook
```

**Método:** POST

### C. Guardar

**Scroll al final** de la página y click **"Save configuration"** (botón rojo)

---

## 📋 PASO 3: Test Final

Después de completar PASO 1 y PASO 2, envía este SMS de prueba:

```bash
curl -X POST "https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/send-order-sms-notification" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Zm5ucnB6cGtkeXBicnptZ25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODY5NjAsImV4cCI6MjA3Mjc2Mjk2MH0.HA7ujjknDa-97z-vC-vOZJm5rQ7PYXqn--rdiZoPXcY" \
  -d '{
    "orderId": "95b5e862-bc91-4e76-916f-b50dd2c994f1",
    "dealerId": 5,
    "module": "sales_orders",
    "eventType": "comment_added",
    "eventData": {
      "orderNumber": "SA-153",
      "commenterName": "FINAL TEST",
      "commentText": "Testing webhook with JWT disabled and STATUS CALLBACK configured",
      "shortLink": "https://mda.to/FINAL"
    },
    "triggeredBy": "final-test"
  }'
```

**Esperar 10-20 segundos**, luego verificar:

```sql
SELECT
  message_content,
  status,
  webhook_received_at,
  webhook_received_at IS NOT NULL as webhook_ok,
  EXTRACT(EPOCH FROM (webhook_received_at - sent_at)) as delivery_time_sec
FROM sms_send_history
WHERE message_content LIKE '%FINAL TEST%'
ORDER BY sent_at DESC LIMIT 1;
```

**Si `webhook_ok = true`:**
- 🎉 ¡Sistema 100% funcional!
- `status` = 'delivered'
- `delivery_time_sec` = 5-30 segundos

---

## 🎯 Resumen

**PASO 1:** Supabase Dashboard → sms-webhook → Enforce JWT: OFF
**PASO 2:** Twilio Console → STATUS CALLBACK URL → Pegar URL → Save
**PASO 3:** Enviar SMS test → Esperar 20 seg → Verificar SQL

---

**Avísame cuando completes PASO 1 (cambiar verify_jwt) y te ayudo con el resto.** 🚀
