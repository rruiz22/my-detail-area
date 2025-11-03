# 🔧 Configuración del Email Template de Reset Password en Supabase

## 📋 Problema Identificado

El código frontend ahora maneja **todos** los formatos de token que Supabase puede enviar:
- ✅ `token` (formato actual que estás recibiendo)
- ✅ `token_hash` (formato PKCE)
- ✅ `code` (formato legacy)

**PERO** el template de email en Supabase debe configurarse correctamente.

---

## 🎯 Solución: Configurar Email Template en Supabase

### **Paso 1: Acceder a Email Templates**

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Navega a **Authentication → Email Templates**
4. Selecciona **"Reset Password"** o **"Confirm Password Recovery"**

### **Paso 2: Actualizar el Template**

**Opción A - Template Recomendado (Con token_hash):**

```html
<h2>Reset Your Password</h2>

<p>Follow this link to reset your password for {{ .SiteURL }}:</p>

<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Reset Password</a></p>

<p>Or copy and paste this URL into your browser:</p>
<p>{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery</p>

<p><strong>Important:</strong> This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

**Opción B - Template Simple (Usando ConfirmationURL):**

```html
<h2>Reset Your Password</h2>

<p>Follow this link to reset your password:</p>

<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>

<p><strong>Important:</strong> This link expires in 1 hour.</p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

**⚠️ IMPORTANTE:** Con la Opción B, Supabase generará automáticamente el URL con el formato correcto.

### **Paso 3: Configurar Redirect URLs**

1. En Supabase Dashboard, ve a **Authentication → URL Configuration**
2. Asegúrate de tener configuradas estas URLs en **Redirect URLs**:

```
https://dds.mydetailarea.com/reset-password
http://localhost:5173/reset-password
```

3. Verifica que **Site URL** sea:
```
https://dds.mydetailarea.com
```

4. Haz clic en **Save**

---

## 🔍 Variables Disponibles en Email Templates

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{ .SiteURL }}` | URL base de tu app | `https://dds.mydetailarea.com` |
| `{{ .Token }}` | Token de recuperación (deprecated) | `abc123...` |
| `{{ .TokenHash }}` | Hash del token (recomendado) | `def456...` |
| `{{ .ConfirmationURL }}` | URL completa pre-formateada | `https://dds.mydetailarea.com/...` |
| `{{ .Email }}` | Email del usuario | `user@example.com` |

---

## 🧪 Cómo Probar

### **Método 1: Prueba Completa**

1. Ve a `https://dds.mydetailarea.com/forgot-password`
2. Ingresa tu email
3. Haz clic en "Send Reset Link"
4. Revisa tu email
5. **IMPORTANTE**: Abre la consola del navegador (F12)
6. Haz clic en el link del email
7. Revisa los logs en la consola:

```
🔐 Detected password reset token, redirecting to /reset-password
Token params: { token: '...', tokenHash: null, code: null, type: 'recovery' }
🔐 Verifying recovery session...
🔍 URL params: { token: '574941', token_hash: null, code: null, type: 'recovery', all: '?token=574941&type=recovery' }
📧 Recovery token found in URL: { paramName: 'token', tokenPreview: '574941...', type: 'recovery' }
```

8. Si ves `✅ Recovery session established successfully`, funciona!
9. Si ves `❌ Token verification failed`, copia el mensaje de error completo

### **Método 2: Prueba en Supabase Dashboard**

1. Ve a **Authentication → Users**
2. Encuentra tu usuario
3. Haz clic en los tres puntos (...)
4. Selecciona **"Send password recovery"**
5. Revisa tu email y prueba el link

---

## 🐛 Troubleshooting

### **Error: "Invalid or expired reset link"**

**Posibles causas:**

1. **Token expirado** (1 hora por defecto)
   - Solución: Solicita un nuevo link

2. **Token ya usado**
   - Los tokens solo funcionan una vez
   - Solución: Solicita un nuevo link

3. **URL de redirect incorrecta**
   - Verifica que `/reset-password` esté en la lista de Redirect URLs
   - Asegúrate de que `Site URL` sea correcto

4. **Formato de token incorrecto**
   - El código ahora acepta cualquier formato: `token`, `token_hash`, o `code`
   - Revisa los logs de la consola para ver qué parámetro se está recibiendo

### **Error: "Token verification failed"**

Abre la consola y busca logs como:

```
❌ Token verification failed: [mensaje de error]
Error details: { message: '...', status: ..., name: '...' }
```

**Errores comunes:**

1. **"Invalid token"**
   - El token no existe en la base de datos de Supabase
   - Puede estar mal formateado en el email template

2. **"Token expired"**
   - El link tiene más de 1 hora
   - Solicita un nuevo link

3. **"Session not found"**
   - Supabase no pudo crear la sesión de recuperación
   - Verifica la configuración de Auth en Supabase

---

## 📊 Logs Detallados

El código ahora incluye logs extensivos para debugging. En la consola verás:

```javascript
// 1. Redirect desde /auth
🔐 Detected password reset token, redirecting to /reset-password
Token params: { token: 'xxx', tokenHash: null, code: null, type: 'recovery' }

// 2. En /reset-password
🔐 Verifying recovery session...
🔍 URL params: { token: 'xxx', token_hash: null, code: null, type: 'recovery', all: '...' }

// 3. Token detectado
📧 Recovery token found in URL: { paramName: 'token', tokenPreview: 'xxx...', type: 'recovery' }

// 4. Resultado de verificación (éxito)
✅ Recovery session established successfully
Session details: { user: 'email@example.com', expiresAt: '...' }

// O resultado de verificación (error)
❌ Token verification failed: [error]
Error details: { message: '...', status: ..., name: '...' }
```

---

## 🎯 Checklist de Verificación

Antes de probar, asegúrate de:

- [ ] Email template actualizado en Supabase
- [ ] Redirect URLs configuradas en Supabase
- [ ] Site URL correcto en Supabase
- [ ] Código frontend actualizado y desplegado
- [ ] Consola del navegador abierta para ver logs
- [ ] Email de prueba válido y accesible

---

## 💡 Recomendaciones

1. **Usa la Opción B (ConfirmationURL)** si no necesitas personalizar el URL
2. **Siempre verifica los logs de la consola** al probar
3. **Solicita un nuevo link** si el actual tiene más de 5 minutos (para evitar expiraciones durante pruebas)
4. **Prueba en incógnito** para asegurar que no hay sesiones activas interfiriendo

---

**Última actualización:** 2025-11-03  
**Versión:** 1.2.3  
**Estado:** Código frontend actualizado - Requiere configuración de Supabase

