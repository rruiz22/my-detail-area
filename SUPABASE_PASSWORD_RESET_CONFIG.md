# 🔒 Configuración de Password Reset en Supabase

## Problema Resuelto

Cuando el usuario hacía clic en el link de reset password del email, era redirigido a `/auth` en lugar de `/reset-password`.

## ✅ Solución Implementada

### **Parte 1: Detección Automática en el Frontend (IMPLEMENTADO)**

Hemos agregado lógica en `Auth.tsx` que detecta automáticamente cuando llega un link de reset password y redirige a `/reset-password`.

```typescript
// En Auth.tsx - Líneas 120-133
useEffect(() => {
  const code = searchParams.get('code');
  const type = searchParams.get('type');

  // Si hay un código, probablemente es un link de reset password
  if (code && (type === 'recovery' || !type)) {
    console.log('🔐 Detected password reset token, redirecting to /reset-password');
    const fullParams = window.location.search;
    navigate(`/reset-password${fullParams}`, { replace: true });
    return;
  }
}, [searchParams, navigate]);
```

**Esto significa que el flujo funciona AHORA, incluso si Supabase redirige a `/auth`**

### **Parte 2: Verificación de Token con verifyOtp() (IMPLEMENTADO)**

`ResetPassword.tsx` ahora verifica explícitamente el token usando `supabase.auth.verifyOtp()`:

```typescript
// En ResetPassword.tsx - Líneas 47-89
const verifyRecoverySession = async () => {
  const tokenHash = searchParams.get('token_hash') || searchParams.get('code');
  const type = searchParams.get('type');
  
  if (tokenHash) {
    // Verificar el token OTP con Supabase
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: (type === 'recovery' ? 'recovery' : 'email') as any,
    });
    
    if (error) {
      console.error('❌ Token verification failed:', error.message);
      setError('Invalid or expired reset link');
    } else if (data.session) {
      console.log('✅ Recovery session established successfully');
      // Session is now established, user can proceed
    }
  }
};
```

---

## ⚙️ Configuración Recomendada en Supabase (OPCIONAL pero MEJOR)

Aunque el frontend ahora maneja el redirect automáticamente, es mejor configurar Supabase correctamente:

### **Paso 1: URLs Permitidas**

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Authentication → URL Configuration**
4. En **Redirect URLs**, agrega:

```
https://dds.mydetailarea.com/reset-password
http://localhost:5173/reset-password
```

5. Asegúrate de que **Site URL** sea:
```
https://dds.mydetailarea.com
```

6. Haz clic en **Save**

### **Paso 2: Template de Email (OPCIONAL)**

1. Ve a **Authentication → Email Templates**
2. Selecciona **"Reset Password"** o **"Confirm Password Recovery"**
3. Actualiza el template para usar el redirect correcto:

**Opción A - Redirect Directo (Recomendado):**
```html
<h2>Reset Your Password</h2>

<p>Follow this link to reset your password:</p>
<p><a href="{{ .SiteURL }}/reset-password?code={{ .TokenHash }}&type=recovery">Reset Password</a></p>

<p>Or copy and paste this URL:</p>
<p>{{ .SiteURL }}/reset-password?code={{ .TokenHash }}&type=recovery</p>

<p>This link will expire in 1 hour.</p>
```

**Opción B - Usar Confirmation URL (Simple):**
```html
<h2>Reset Your Password</h2>

<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>

<p>This link will expire in 1 hour.</p>
```

**NOTA:** Con la Opción B, asegúrate de que el redirect URL configurado en el Paso 1 sea correcto.

4. Haz clic en **Save**

---

## 🧪 Cómo Probar

### **Flujo Actual (Sin cambiar Supabase):**

1. Ve a `https://dds.mydetailarea.com/forgot-password`
2. Ingresa tu email y solicita reset
3. Revisa tu email
4. Haz clic en el link del email
5. Serás redirigido a `/auth?code=...`
6. **Automáticamente** serás redirigido a `/reset-password`
7. Verás "Verifying reset link..." por unos segundos
8. Podrás cambiar tu contraseña

### **Flujo Ideal (Después de configurar Supabase):**

1. Ve a `https://dds.mydetailarea.com/forgot-password`
2. Ingresa tu email y solicita reset
3. Revisa tu email
4. Haz clic en el link del email
5. **Directamente** llegas a `/reset-password`
6. Verás "Verifying reset link..." brevemente
7. Podrás cambiar tu contraseña

---

## 🔍 Debugging

### **Console Logs Útiles:**

En el navegador, abre la consola y verás:

```
🔐 Detected password reset token, redirecting to /reset-password   (en Auth.tsx)
🔐 Verifying recovery session...                                   (en ResetPassword.tsx)
📧 Recovery token found in URL, verifying with Supabase...         (si hay token)
✅ Recovery session established successfully                        (si funciona)
❌ Token verification failed: [error message]                       (si falla)
```

### **Si el Link No Funciona:**

1. **Verifica la consola del navegador** para ver los logs
2. **Verifica que el link tenga un parámetro `code`:**
   ```
   https://dds.mydetailarea.com/...?code=xxxx-xxxx-xxxx
   ```
3. **Revisa que el código no haya expirado** (1 hora por defecto)
4. **Solicita un nuevo link** desde `/forgot-password`

### **Si Supabase No Reconoce el Token:**

Esto puede pasar si:
- El formato del token en el email es incorrecto
- El token ya fue usado
- El token expiró

**Solución:**
1. Ve a Supabase Dashboard → Authentication → Email Templates
2. Verifica que el template use `{{ .TokenHash }}` o `{{ .Token }}`
3. O usa `{{ .ConfirmationURL }}` que incluye todo automáticamente

---

## 📋 Variables de Template de Supabase

Cuando edites el email template, puedes usar:

| Variable | Descripción |
|----------|-------------|
| `{{ .SiteURL }}` | URL base de tu app (ej: https://dds.mydetailarea.com) |
| `{{ .Token }}` | Token de recuperación (deprecated) |
| `{{ .TokenHash }}` | Hash del token de recuperación (recomendado) |
| `{{ .ConfirmationURL }}` | URL completa con token incluido |
| `{{ .Email }}` | Email del usuario |

---

## ✅ Estado Actual

- [x] Detección automática de links de reset en `/auth`
- [x] Redirect automático a `/reset-password`
- [x] Verificación de sesión con retry (hasta 3 segundos)
- [x] UI de loading mientras se verifica
- [x] Manejo de errores cuando el link es inválido
- [ ] Configuración óptima de Supabase (OPCIONAL - el flujo ya funciona)

---

## 🚀 Próximos Pasos

1. **Probar el flujo actual** - Debe funcionar incluso sin cambiar nada en Supabase
2. **Configurar Supabase** (opcional) - Para un flujo más directo
3. **Monitorear logs** - Para asegurar que todo funcione correctamente

---

## 📚 Referencias

- [Supabase Auth - Password Recovery](https://supabase.com/docs/guides/auth/passwords#password-recovery)
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

---

**Última actualización:** 2025-11-03
**Versión:** 1.2.3
