# 🔐 SUPABASE SECRETS - Configuración de Credenciales

**Fecha:** Octubre 2025
**Propósito:** Configurar todas las credenciales de servicios externos de forma segura

---

## 📋 RESUMEN

Todas las credenciales sensibles (API keys, tokens, passwords) se almacenan en **Supabase Secrets**, no en variables de ambiente del frontend. Esto garantiza que nunca sean expuestas al cliente.

### ✅ **Arquitectura de Seguridad:**

```
┌──────────────────────────┐
│ Frontend (Railway)       │
│ • Solo VAPID public key  │
│ • Escribe a notification_│
│   log                    │
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ Supabase notification_log│
└──────────────────────────┘
           ↓
┌──────────────────────────┐
│ Edge Functions           │
│ • Lee Supabase Secrets   │
│ • Envía notificaciones   │
│   (Push, SMS, Email)     │
└──────────────────────────┘
```

---

## 🔑 CREDENCIALES REQUERIDAS

### 1. **Push Notifications (Web Push API)**

Ya tienes las keys generadas (ver `VAPID_KEYS_SETUP.md`):

```bash
# Public Key (OK exponerla - va en .env.local y Railway)
VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A

# Private Key (SECRETA - va en Supabase Secrets)
VAPID_PRIVATE_KEY=whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs

# Subject (tu email de contacto)
VAPID_SUBJECT=mailto:support@mydetailarea.com
```

### 2. **SMS Notifications (Twilio)**

#### Cómo obtener credenciales de Twilio:

1. **Crear cuenta:** https://www.twilio.com/try-twilio
2. **Obtener Trial Credits:** $15 gratis para testing
3. **Dashboard:** https://console.twilio.com/

**Credenciales necesarias:**

```bash
# Account SID (en Dashboard principal)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Auth Token (clic en "Show" en Dashboard)
TWILIO_AUTH_TOKEN=tu_auth_token_aqui

# Phone Number (Console → Phone Numbers → Buy a Number o usa el de trial)
TWILIO_PHONE_NUMBER=+12345678900
```

**📝 Nota sobre Trial:**
- Trial account: Solo puedes enviar SMS a números verificados
- Para verificar número: Console → Phone Numbers → Verified Caller IDs
- Para producción: Agregar billing y comprar número

### 3. **Email Notifications - Opción A: Sendgrid (Recomendado)**

#### Cómo obtener API key de Sendgrid:

1. **Crear cuenta:** https://signup.sendgrid.com/
2. **Free tier:** 100 emails/día gratis
3. **Settings → API Keys → Create API Key**
4. **Full Access** (para enviar emails)

**Credenciales necesarias:**

```bash
# API Key (generada en Settings → API Keys)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# From Address (email verificado en Sendgrid)
EMAIL_FROM_ADDRESS=notifications@mydetailarea.com

# From Name (nombre que aparece en email)
EMAIL_FROM_NAME=My Detail Area Notifications
```

**📝 Pasos adicionales en Sendgrid:**
1. **Verificar dominio o email:** Settings → Sender Authentication
2. **Single Sender Verification:** Verificar email individual (más fácil para empezar)
3. **Domain Authentication:** Para producción (mejor reputación)

### 4. **Email Notifications - Opción B: SMTP (Gmail, Office365, etc.)**

#### Ejemplo con Gmail App Password:

1. **Habilitar 2FA** en tu cuenta de Google
2. **Crear App Password:**
   - Google Account → Security → 2-Step Verification
   - App passwords → Generate
3. **Usar credenciales:**

```bash
# SMTP Server
SMTP_HOST=smtp.gmail.com

# SMTP Port (587 para TLS, 465 para SSL)
SMTP_PORT=587

# SMTP User (tu email completo)
SMTP_USER=tu-email@gmail.com

# SMTP Password (App Password generado, NO tu password de Gmail)
SMTP_PASS=xxxx xxxx xxxx xxxx

# From Address
EMAIL_FROM_ADDRESS=tu-email@gmail.com

# From Name
EMAIL_FROM_NAME=My Detail Area
```

**⚠️ Nota importante sobre Gmail:**
- Límite de 500 emails/día para cuentas gratuitas
- Para producción, mejor usar Sendgrid o servicio dedicado

---

## ⚙️ CONFIGURACIÓN EN SUPABASE

### **Método 1: Supabase CLI (Recomendado)**

```bash
# 1. Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# 2. Login a Supabase
supabase login

# 3. Link al proyecto
supabase link --project-ref your-project-ref

# 4. Configurar secrets (ejecuta uno por uno)

# Push Notifications
supabase secrets set VAPID_PUBLIC_KEY="BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A"
supabase secrets set VAPID_PRIVATE_KEY="whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs"
supabase secrets set VAPID_SUBJECT="mailto:support@mydetailarea.com"

# SMS (Twilio) - Reemplaza con tus valores reales
supabase secrets set TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set TWILIO_AUTH_TOKEN="tu_auth_token_aqui"
supabase secrets set TWILIO_PHONE_NUMBER="+12345678900"

# Email (Sendgrid) - Reemplaza con tus valores reales
supabase secrets set SENDGRID_API_KEY="SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
supabase secrets set EMAIL_FROM_ADDRESS="notifications@mydetailarea.com"
supabase secrets set EMAIL_FROM_NAME="My Detail Area"

# OPCIONAL: Email (SMTP) - Si usas SMTP en lugar de Sendgrid
supabase secrets set SMTP_HOST="smtp.gmail.com"
supabase secrets set SMTP_PORT="587"
supabase secrets set SMTP_USER="tu-email@gmail.com"
supabase secrets set SMTP_PASS="xxxx xxxx xxxx xxxx"

# 5. Verificar que se guardaron
supabase secrets list
```

### **Método 2: Supabase Dashboard (Alternativo)**

1. **Ir al Dashboard:** https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. **Settings → Edge Functions → Secrets**
3. **Add Secret** para cada uno:

| Name | Value |
|------|-------|
| `VAPID_PUBLIC_KEY` | `BC6DN8D...` |
| `VAPID_PRIVATE_KEY` | `whhN1...` |
| `VAPID_SUBJECT` | `mailto:support@...` |
| `TWILIO_ACCOUNT_SID` | `ACxxxx...` |
| `TWILIO_AUTH_TOKEN` | `your_token` |
| `TWILIO_PHONE_NUMBER` | `+123...` |
| `SENDGRID_API_KEY` | `SG.xxx...` |
| `EMAIL_FROM_ADDRESS` | `notifications@...` |
| `EMAIL_FROM_NAME` | `My Detail Area` |

4. **Save** después de cada secret

---

## 🧪 TESTING DE CREDENCIALES

### 1. **Test Push Notifications**

```bash
# En Supabase SQL Editor, ejecuta:
SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/push-notification-sender',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
        'userId', 'your-user-uuid',
        'dealerId', 5,
        'payload', jsonb_build_object(
            'title', 'Test Push Notification',
            'body', 'Testing from Supabase!',
            'icon', '/favicon-mda.svg'
        )
    )
);
```

**Esperado:** Push notification aparece en tu browser (si tienes subscription activa)

### 2. **Test SMS (Twilio)**

```bash
# En Supabase SQL Editor:
SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-sms',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
        'to', '+1234567890',  -- Tu número verificado
        'message', 'Test SMS from My Detail Area',
        'orderNumber', 'TEST-001'
    )
);
```

**Esperado:** Recibes SMS en tu teléfono

### 3. **Test Email (Sendgrid)**

```bash
# Usando Edge Function test-smtp
SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/test-smtp',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
        'to_email', 'tu-email@ejemplo.com',
        'subject', 'Test Email from My Detail Area',
        'text', 'This is a test email.',
        'html', '<h1>Test Email</h1><p>This is a test email.</p>'
    )
);
```

**Esperado:** Recibes email en tu inbox

---

## 📱 CONFIGURACIÓN EN RAILWAY (Producción)

Railway solo necesita la **public key** de VAPID:

### Via Railway Dashboard:

1. **Ir a proyecto:** https://railway.app
2. **Variables tab**
3. **New Variable:**
   ```
   VITE_VAPID_PUBLIC_KEY=BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A
   ```
4. **Deploy** (Railway redeploys automáticamente)

### Via Railway CLI:

```bash
railway variables set VITE_VAPID_PUBLIC_KEY="BC6DN8DGXQOK_uExklYfSDJZVH3H6OUcwDUgCr8OZaB8665BybdbxtUrkfxzL60fM7Fj-GGdppUKjHwco8k0Q0A"
```

---

## 🔍 VERIFICACIÓN DE CONFIGURACIÓN

### Checklist completo:

```bash
# ✅ Paso 1: Verificar que .env.local existe
cat .env.local
# Debe contener: VITE_VAPID_PUBLIC_KEY=...

# ✅ Paso 2: Verificar Supabase Secrets
supabase secrets list
# Debe mostrar todos los secrets configurados

# ✅ Paso 3: Verificar Edge Functions desplegadas
supabase functions list
# Debe mostrar:
# - push-notification-sender
# - send-sms
# - enhanced-notification-engine

# ✅ Paso 4: Test de cada canal
# (Ejecuta los scripts de testing arriba)

# ✅ Paso 5: Verificar Railway
# Railway Dashboard → Variables
# Debe tener: VITE_VAPID_PUBLIC_KEY
```

---

## 🚨 TROUBLESHOOTING

### **Error: "Twilio credentials not configured"**

**Causa:** TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no están en Supabase Secrets

**Solución:**
```bash
supabase secrets set TWILIO_ACCOUNT_SID="ACxxxx..."
supabase secrets set TWILIO_AUTH_TOKEN="your_token"
```

### **Error: "VAPID key not configured"**

**Causa:** VAPID_PRIVATE_KEY no está en Supabase Secrets

**Solución:**
```bash
supabase secrets set VAPID_PRIVATE_KEY="whhN1lt0K0bTF6zSIlPx4I56HSnkxkEvhWC_cDN2bPs"
```

### **Error: "Sendgrid API error 401"**

**Causa:** API key inválida o no tiene permisos

**Solución:**
1. Verificar que API key es correcta en Sendgrid Dashboard
2. Asegurar que tiene **Full Access** permissions
3. Re-generar key si es necesario

### **SMS no llega (Twilio Trial)**

**Causa:** Número destino no está verificado en Twilio

**Solución:**
1. Twilio Console → Phone Numbers → Verified Caller IDs
2. Add a Number → Verificar tu número
3. O upgrade a cuenta de pago

### **Email va a Spam**

**Causa:** Dominio no autenticado en Sendgrid

**Solución:**
1. Sendgrid → Settings → Sender Authentication
2. Authenticate Your Domain
3. Agregar DNS records a tu dominio

---

## 📚 RECURSOS ADICIONALES

### Documentación oficial:

- **Supabase Secrets:** https://supabase.com/docs/guides/functions/secrets
- **Twilio SMS:** https://www.twilio.com/docs/sms
- **Sendgrid:** https://docs.sendgrid.com/
- **Web Push API:** https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- **Railway:** https://docs.railway.app/

### Guías relacionadas:

- `PUSH_NOTIFICATIONS_COMPLETE.md` - Sistema de Push completo
- `VAPID_KEYS_SETUP.md` - Generación de VAPID keys
- `QUICK_START_UNIFICACION_NOTIFICACIONES.md` - Guía de inicio rápido

---

## 🎯 PRÓXIMOS PASOS

Después de configurar todos los secrets:

1. ✅ **Crear datos de prueba** en `notification_log` (ver Quick Start)
2. ✅ **Test de cada canal** (Push, SMS, Email)
3. ✅ **Verificar delivery logs** en Supabase
4. ✅ **Integrar módulos** (Sales Orders, Service Orders, etc.)
5. ✅ **Monitorear analytics** en dashboard

---

## ⚠️ SEGURIDAD - IMPORTANTE

### ❌ NUNCA:
- Commitear archivos .env con credenciales reales
- Compartir API keys en Slack/Email
- Hardcodear credenciales en código
- Exponer private keys al frontend

### ✅ SIEMPRE:
- Usar Supabase Secrets para credenciales privadas
- Rotar keys periódicamente
- Usar trial/sandbox para testing
- Monitorear uso de APIs (evitar facturas sorpresa)

---

**¿Listo para continuar?** Sigue con el Quick Start para poblar datos de prueba y testing.

**Next:** `QUICK_START_UNIFICACION_NOTIFICACIONES.md` (Acción 3)
