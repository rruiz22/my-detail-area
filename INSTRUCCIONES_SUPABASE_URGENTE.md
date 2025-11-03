# 🚨 INSTRUCCIONES URGENTES - Configurar Email Template

## ❌ Problema Identificado

**Error en consola:**
```
❌ Token verification failed: AuthApiError: Email link is invalid or has expired
```

**Causa:** El email está enviando `token` pero necesitamos `token_hash`.

---

## ✅ SOLUCIÓN PASO A PASO

### **Paso 1: Acceder a Supabase Dashboard**

1. Ve a: https://app.supabase.com
2. Selecciona tu proyecto
3. Click en **"Authentication"** en el menú izquierdo
4. Click en **"Email Templates"**

### **Paso 2: Editar Template de Reset Password**

1. Busca y selecciona: **"Reset Password"** o **"Change Email"** (dependiendo del idioma)
2. Reemplaza TODO el contenido con este template:

```html
<h2>Reset Your Password</h2>

<p>Hi there,</p>

<p>Follow this link to reset your password for your account:</p>

<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>

<p>Or copy and paste this URL into your browser:</p>
<p>{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery</p>

<p><strong>This link will expire in 1 hour.</strong></p>

<p>If you didn't request this password reset, you can safely ignore this email.</p>
```

3. **IMPORTANTE:** Fíjate que dice `token_hash={{ .TokenHash }}` NO `token={{ .Token }}`
4. Click en **"Save"** o **"Update"**

### **Paso 3: Verificar Configuración de URLs**

1. En el menú de Authentication, click en **"URL Configuration"**
2. Verifica que en **"Redirect URLs"** tengas:
   ```
   https://dds.mydetailarea.com/reset-password
   ```
3. Si no está, agrégala y haz click en **"Add URL"**
4. Click en **"Save"**

### **Paso 4: Probar Nuevamente**

1. Ve a: https://dds.mydetailarea.com/forgot-password
2. Solicita un NUEVO reset (los anteriores seguirán con el formato viejo)
3. Revisa tu email
4. Verifica que la URL ahora tenga: `?token_hash=...` (no `?token=...`)
5. Haz click en el link

**Logs esperados en la consola:**
```
🔐 Verifying recovery session...
📧 Recovery token found in URL: { paramName: 'token_hash', ... }
✅ Recovery session established successfully
```

---

## 🎯 RESUMEN VISUAL

**ANTES (malo):**
```
{{ .SiteURL }}/reset-password?token={{ .Token }}&type=recovery
                              ^^^^^^    ^^^^^^^^
                              INCORRECTO
```

**DESPUÉS (correcto):**
```
{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
                              ^^^^^^^^^^    ^^^^^^^^^^^^
                              CORRECTO
```

---

## ⚠️ IMPORTANTE

- Los links **anteriores seguirán fallando** porque fueron generados con el formato viejo
- **Solicita un nuevo link** después de cambiar el template
- El nuevo link tendrá `token_hash` en la URL
- Solo entonces funcionará correctamente

---

## 🐛 Si Aún Falla

Comparte el log de la consola después de usar un link NUEVO (generado después del cambio).

Específicamente estos logs:
```
🔍 URL params: { ... }
📧 Recovery token found in URL: { ... }
```

---

## 📝 Notas

- Este cambio NO afecta otras funcionalidades
- Solo afecta los emails de reset password
- Es un cambio de configuración, no de código
- Los cambios en el template son inmediatos

---

**Tiempo estimado:** 3 minutos
**Prioridad:** URGENTE
**Requiere código:** NO, solo configuración en Supabase
