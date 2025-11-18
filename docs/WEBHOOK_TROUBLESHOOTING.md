# 🔧 Troubleshooting - Webhook de Twilio No Funciona

**Síntoma:** SMS se envía y llega correctamente, pero `webhook_received_at` siempre NULL
**Causa Probable:** STATUS CALLBACK URL no configurada correctamente en Twilio

---

## 🎯 Diagnóstico Actual

**Lo que SÍ funciona:**
- ✅ SMS enviado exitosamente (Twilio SID: SM36e6b333...)
- ✅ SMS recibido en teléfono (+15084942278)
- ✅ sent_day poblado correctamente (2025-11-18)
- ✅ retry_count inicializado (0)

**Lo que NO funciona:**
- ❌ Webhook delivery callback no llega
- ❌ `webhook_received_at` = NULL
- ❌ `status` permanece en 'sent' (no cambia a 'delivered')

---

## ⚠️ Configuración Crítica de Twilio

En Twilio Console, hay **DOS webhooks DIFERENTES** que debes configurar:

### 1. "A MESSAGE COMES IN" (Mensajes Entrantes)
**Propósito:** Recibir SMS de clientes
**URL:** `https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/sms-webhook`
**Method:** POST
**Status:** Probablemente configurado ✅

### 2. "STATUS CALLBACK URL" ⚠️ CRÍTICO
**Propósito:** Recibir notificaciones de delivery status
**URL:** `https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/sms-webhook`
**Method:** POST
**Status:** ❓ ¿Está configurado?

---

## 🔍 Verificación Paso a Paso

### PASO 1: Verificar STATUS CALLBACK URL

**Ubicación en Twilio Console:**
```
Phone Numbers → Manage → Active numbers → [Tu número]
→ Scroll down → Sección "Messaging"
```

**Debes ver DOS configuraciones:**

```
┌─────────────────────────────────────────────────┐
│ CONFIGURE WITH                                  │
│ ○ TwiML Bins  ○ TwiML Apps  ● Webhooks/TwiML  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ A MESSAGE COMES IN                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://swfnnrpzpkdypbrzmgnr.supabase.co/  │ │
│ │ functions/v1/sms-webhook                    │ │
│ └─────────────────────────────────────────────┘ │
│ HTTP [POST ▼]                                   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ PRIMARY HANDLER FAILS                           │
│ (Opcional - dejar en blanco)                    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ STATUS CALLBACK URL              ⚠️ CRÍTICO     │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://swfnnrpzpkdypbrzmgnr.supabase.co/  │ │
│ │ functions/v1/sms-webhook                    │ │
│ └─────────────────────────────────────────────┘ │
│ HTTP [POST ▼]                                   │
└─────────────────────────────────────────────────┘
```

**IMPORTANTE:** El segundo campo "STATUS CALLBACK URL" es el que probablemente falta.

---

### PASO 2: Configurar STATUS CALLBACK URL

Si el campo "STATUS CALLBACK URL" está vacío:

1. **Pegar la URL:**
   ```
   https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/sms-webhook
   ```

2. **Seleccionar método:** POST

3. **Save** (botón rojo al final de la página)

---

### PASO 3: Enviar Otro SMS de Prueba

Después de configurar el STATUS CALLBACK URL, envía otro SMS:

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
      "commenterName": "Test 2",
      "commentText": "Segundo test con webhook configurado",
      "shortLink": "https://mda.to/TEST2"
    },
    "triggeredBy": "test-2"
  }'
```

**Esperar 10 segundos y verificar:**
```sql
SELECT * FROM sms_send_history
WHERE message_content LIKE '%Test 2%'
ORDER BY sent_at DESC LIMIT 1;
```

Si ahora `webhook_received_at` tiene valor → ✅ Problema resuelto

---

### PASO 4: Alternativa - Simular Webhook Manualmente

Si el problema persiste, podemos simular el webhook para verificar que el código funciona:

```bash
curl -X POST "https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/sms-webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "MessageSid=SM36e6b333adcbd49a8129f238a26b7bf8&MessageStatus=delivered"
```

**Verificar:**
```sql
SELECT status, webhook_received_at
FROM sms_send_history
WHERE twilio_sid = 'SM36e6b333adcbd49a8129f238a26b7bf8';
```

Si ahora tiene webhook_received_at → El código funciona, problema es configuración Twilio

---

## 🔍 Posibles Causas

### Causa #1: STATUS CALLBACK URL no configurada (90% probable)
**Solución:** Configurarla en Twilio Console (PASO 2 arriba)

### Causa #2: Twilio enviando webhooks pero fallando
**Diagnóstico:** Revisar Twilio logs
- Ir a: Twilio Console → Monitor → Logs → Errors
- Buscar webhooks recientes
- Verificar si hay errores

### Causa #3: Signature validation rechazando webhooks
**Solución Temporal:** Deshabilitar temporalmente
(Ya está en el código: si no hay TWILIO_AUTH_TOKEN, skip validation)

---

## 📋 Checklist de Verificación

**En Twilio Console:**
- [ ] Ir a Phone Numbers → [Tu número]
- [ ] Scroll a sección "Messaging"
- [ ] Verificar "A MESSAGE COMES IN" = configurado
- [ ] **Verificar "STATUS CALLBACK URL" = configurado** ⚠️
- [ ] Ambos deben ser POST
- [ ] Ambos deben apuntar a la misma URL
- [ ] Click Save

---

## 💡 Tip: Dónde Encontrar el Campo

El campo "STATUS CALLBACK URL" está **ABAJO** de "A MESSAGE COMES IN", en la misma sección de Messaging. Es fácil pasarlo por alto porque está más abajo en la página.

---

**¿Puedes verificar en Twilio Console si el campo "STATUS CALLBACK URL" tiene la URL configurada?**

Si está vacío, configúralo y prueba de nuevo. Si ya está configurado, avísame y buscamos otra causa.
