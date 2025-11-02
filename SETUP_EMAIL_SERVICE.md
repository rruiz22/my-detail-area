# 📧 Setup Email Service (Resend)

Este documento explica cómo configurar el servicio de envío de emails para invoices usando Resend.

---

## 🎯 Paso 1: Crear Cuenta en Resend

1. Ve a [https://resend.com](https://resend.com)
2. Click en **"Sign Up"**
3. Crea tu cuenta (gratis - 100 emails/día, 3,000/mes)
4. Verifica tu email

---

## 🔑 Paso 2: Obtener API Key

1. Una vez dentro del dashboard de Resend
2. Ve a **"API Keys"** en el sidebar
3. Click en **"Create API Key"**
4. Dale un nombre: `my-detail-area-production`
5. Copia el API key (empieza con `re_...`)
6. **⚠️ Guárdala en un lugar seguro - no se mostrará de nuevo**

---

## 🏢 Paso 3: Configurar Dominio (Opcional pero Recomendado)

### **Opción A: Sin dominio personalizado** (Para testing)
Puedes usar el dominio de prueba de Resend:
- **From:** `onboarding@resend.dev`
- **Limitación:** Los emails irán a spam en algunos casos

### **Opción B: Con dominio personalizado** (Producción)
1. En Resend, ve a **"Domains"**
2. Click en **"Add Domain"**
3. Ingresa tu dominio: `mydetailarea.com`
4. Sigue las instrucciones para agregar records DNS:
   - **SPF record**
   - **DKIM record**
   - **DMARC record** (opcional)
5. Espera a que se verifique (puede tardar hasta 48 horas)
6. Una vez verificado, podrás enviar desde: `invoices@mydetailarea.com`

---

## ⚙️ Paso 4: Configurar Supabase

### **4.1 Agregar el API Key como Secret**

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Click en **"Settings"** (engranaje) → **"Edge Functions"**
3. Scroll hasta **"Secrets"**
4. Click en **"Add secret"**
5. Agrega:
   ```
   Name: RESEND_API_KEY
   Value: re_xxxxxxxxxxxxxxxx (tu API key de Resend)
   ```
6. Click en **"Save"**

### **4.2 Desplegar la Edge Function**

Opción 1: Desde la terminal (Supabase CLI):
```bash
# Login a Supabase (si no lo has hecho)
supabase login

# Link tu proyecto
supabase link --project-ref tu-project-ref

# Deploy la función
supabase functions deploy send-invoice-email
```

Opción 2: Desde el Dashboard:
1. Ve a **"Edge Functions"** en el sidebar
2. Click en **"Deploy new function"**
3. Sube el archivo `supabase/functions/send-invoice-email/index.ts`
4. Click en **"Deploy"**

---

## ✅ Paso 5: Verificar la Configuración

### **Test desde Supabase Dashboard:**

1. Ve a **"Edge Functions"** → `send-invoice-email`
2. Click en **"Invoke"**
3. Usa este JSON de prueba:
```json
{
  "email_history_id": "test-id",
  "invoice_id": "actual-invoice-id",
  "dealership_id": 1,
  "recipients": ["tu-email@test.com"],
  "subject": "Test Invoice",
  "message": "This is a test email",
  "include_pdf": false,
  "include_excel": false
}
```

4. Si funciona, deberías recibir el email en tu bandeja de entrada

---

## 🔧 Paso 6: Actualizar el Código (Opcional)

Si usas dominio personalizado, actualiza el `from` en la Edge Function:

```typescript
// supabase/functions/send-invoice-email/index.ts
// Línea ~95

from: 'Dealer Detail Service <invoices@mydetailarea.com>',  // ✅ Tu dominio
```

---

## 📊 Monitoreo

### **Dashboard de Resend:**
- Ve a **"Emails"** para ver todos los emails enviados
- Verifica el status: delivered, bounced, opened, clicked
- Revisa logs de errores si algo falla

### **Dashboard de Supabase:**
- Ve a **"Edge Functions"** → **"Logs"**
- Revisa los logs de `send-invoice-email`
- Busca errores (❌) o éxitos (✅)

### **Base de Datos:**
```sql
-- Ver historial de emails
SELECT * FROM invoice_email_history
ORDER BY sent_at DESC
LIMIT 20;

-- Ver emails fallidos
SELECT * FROM invoice_email_history
WHERE status = 'failed'
ORDER BY sent_at DESC;
```

---

## 🚨 Troubleshooting

### **Error: "Invalid API key"**
- Verifica que el API key esté correctamente copiado en los Secrets de Supabase
- Asegúrate de que no tenga espacios al inicio o final
- Regenera el API key en Resend si es necesario

### **Error: "Domain not verified"**
- Espera hasta 48 horas para la verificación de DNS
- Verifica que los records DNS estén correctamente configurados
- Usa el dominio de prueba de Resend mientras tanto

### **Emails van a spam:**
- Verifica que tu dominio esté verificado
- Configura SPF, DKIM y DMARC correctamente
- Evita palabras spam en el subject
- Incluye un link de unsubscribe (opcional)

### **Edge Function no se invoca:**
- Verifica que esté desplegada: `supabase functions list`
- Revisa los logs: Dashboard → Edge Functions → Logs
- Verifica que el nombre sea exacto: `send-invoice-email`

---

## 💰 Límites y Precios

### **Plan Gratuito de Resend:**
- ✅ 100 emails/día
- ✅ 3,000 emails/mes
- ✅ Sin tarjeta de crédito requerida

### **Plan Paid (si necesitas más):**
- $20/mes por 50,000 emails
- $1 por cada 1,000 emails adicionales

### **Supabase Edge Functions:**
- ✅ 500,000 invocaciones/mes (gratis)
- ✅ 2GB transferencia/mes (gratis)

---

## 🎉 ¡Listo!

Ahora cuando hagas click en **"Send Email"** en un invoice:
1. Se creará un registro en `invoice_email_history`
2. Se invocará la Edge Function
3. Resend enviará el email real
4. El status se actualizará a "sent" o "failed"
5. El usuario recibirá el email con el invoice adjunto

---

## 📝 Próximos Pasos (Opcional):

1. **Agregar generación de PDF/Excel real** en la Edge Function
2. **Implementar templates personalizables** por dealership
3. **Agregar tracking de apertura/clicks** (Resend lo soporta)
4. **Implementar recordatorios automáticos** para invoices overdue
5. **Crear dashboard de analytics** de emails

---

**¿Necesitas ayuda? Revisa los logs en Supabase Dashboard o contacta soporte.**
