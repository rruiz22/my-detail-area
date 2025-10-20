# FCM Testing Guide - Paso a Paso

**Fecha:** 2025-10-19
**Estado:** ✅ Listo para Testing
**Servidor:** http://localhost:8080

---

## ✅ Pre-requisitos Completados

- [x] Node.js v20 LTS instalado
- [x] Vite PWA habilitado y funcionando
- [x] Servidor corriendo en puerto 8080
- [x] Vulnerabilidades de seguridad eliminadas (0 vulnerabilities)
- [x] **Supabase Secrets configurados** (CRÍTICO)
  - [x] FIREBASE_PROJECT_ID
  - [x] FIREBASE_CLIENT_EMAIL
  - [x] FIREBASE_PRIVATE_KEY

---

## 🧪 Paso 1: Verificar Service Workers

### 1.1 Abrir DevTools

1. **Abrir la aplicación:**
   ```
   http://localhost:8080/get-ready
   ```

2. **Abrir DevTools:**
   - Presionar `F12`
   - O Click derecho → "Inspect"

3. **Ir a Application tab:**
   - DevTools → **Application**

4. **Verificar Service Workers:**
   - Application → Service Workers

### 1.2 Resultado Esperado

Deberías ver **DOS service workers** activos:

| Service Worker | Status | Scope |
|----------------|--------|-------|
| `sw.js` | ✅ `activated and is running` | `http://localhost:8080/` |
| `firebase-messaging-sw.js` | ✅ `activated and is running` | `http://localhost:8080/firebase-cloud-messaging-push-scope` |

**Si NO ves los service workers:**
1. Hard refresh: `Ctrl + Shift + R`
2. Clear site data:
   - DevTools → Application → Storage → Clear site data
3. Refresh: `F5`

---

## 🧪 Paso 2: Verificar Logs de Inicialización

### 2.1 Console Tab

1. **Ir a Console tab:**
   - DevTools → **Console**

2. **Filtrar logs:**
   - Buscar: `FCM`

### 2.2 Resultado Esperado

Deberías ver logs de inicialización:

```javascript
✅ [Firebase] App initialized successfully
✅ [Firebase] Messaging initialized successfully
✅ [FCM SW] Firebase Messaging Service Worker loaded
✅ [FCM SW] Firebase app initialized
✅ [FCM] Firebase Messaging SW registered: /firebase-cloud-messaging-push-scope
```

**Si NO ves estos logs:**
- Verificar que `.env.local` tiene todas las variables `VITE_FIREBASE_*`
- Reiniciar servidor: `Ctrl+C` y `npm run dev`

---

## 🧪 Paso 3: Activar FCM Push Notifications

### 3.1 Abrir Notification Settings

1. **En la página Get Ready:**
   - Buscar el icono de campana (🔔) en el topbar
   - Click en el icono

2. **Panel se abre:**
   - Título: "Notification Settings"

### 3.2 Verificar Estado Inicial

El panel debe mostrar:

```
✅ Browser Support: Yes
✅ Firebase Configured: Yes
ℹ️ Permission: default (o "granted" si ya diste permisos antes)
```

**Si "Firebase Configured" = No:**
- Verificar `.env.local` tiene todas las variables
- Reiniciar servidor

### 3.3 Activar Toggle

1. **Buscar el toggle:**
   - "FCM Push Notifications"

2. **Click en el toggle para activarlo:**
   - Toggle debe cambiar de OFF a ON

3. **Navegador pide permisos:**
   ```
   "localhost:8080 wants to show notifications"
   [Block] [Allow]
   ```

4. **Click en "Allow"**

### 3.4 Resultado Esperado

**En Console:**
```javascript
✅ [FCM] Using FCM Service Worker: /firebase-cloud-messaging-push-scope
✅ [FCM] Requesting FCM token with VAPID key...
✅ [FCM] Token received: fRsZzKJc20ED4340kisa...
✅ [FCM] Token saved to database
```

**En UI:**
- Toast notification aparece:
  ```
  🎉 FCM Notifications Enabled
     You will now receive Firebase Cloud Messaging notifications
  ```

- Estado del panel cambia:
  ```
  ✅ Permission: granted
  ✅ Status: Active
  ```

**Si el token NO se genera:**
- Verificar VAPID key en `.env.local`
- Verificar que la VAPID key coincide con Firebase Console
- Ver errores en console

---

## 🧪 Paso 4: Enviar Test Notification

### 4.1 Enviar Notificación

1. **En Notification Settings panel:**
   - Buscar botón "Send Test Notification"
   - Click en el botón

### 4.2 Resultado Esperado - CRÍTICO

**Esto es lo que ESTABA FALLANDO antes:**

**En Console:**
```javascript
[FCM Test] Sending test notification via Edge Function
[FCM Test] Response: {
  success: true,
  sentCount: 1,
  failedCount: 0,
  totalTokens: 1
}
[FCM] Foreground message received: {
  notification: {
    title: "FCM Test Notification",
    body: "This is a test notification from Firebase Cloud Messaging"
  },
  data: {
    type: "test",
    url: "/get-ready"
  }
}
```

**⚠️ CLAVE:** El log `[FCM] Foreground message received` **DEBE aparecer**.

**En UI:**

1. **Toast en la app:**
   ```
   Test Notification Sent
   Successfully sent to 1 device(s)
   ```

2. **🎯 NOTIFICACIÓN DEL NAVEGADOR** (esquina superior derecha):
   ```
   ┌─────────────────────────────────────┐
   │ 🔔 FCM Test Notification            │
   │ This is a test notification from    │
   │ Firebase Cloud Messaging            │
   └─────────────────────────────────────┘
   ```

3. **Click en la notificación:**
   - Ventana se enfoca (si estaba minimizada)
   - NO debería navegar porque ya estás en /get-ready

---

## 🧪 Paso 5: Verificar Edge Function Logs

### 5.1 Verificar Autenticación OAuth2

Si tienes acceso a Supabase CLI:

```bash
npx supabase functions logs push-notification-fcm --limit 10
```

### 5.2 Logs Esperados (ÉXITO)

```
[FCM] Getting OAuth2 access token...
[FCM] Private key format validated
[FCM] JWT created, requesting access token
[FCM] Access token obtained
[FCM v1] Sending notification to token: fRsZzKJc...
[FCM v1] Response status: 200
[FCM v1] Success, message name: projects/my-detail-area/messages/...
```

**✅ Esto confirma que:**
1. Service Account configurado correctamente
2. OAuth2 token generado exitosamente
3. FCM API aceptó la notificación
4. Notificación entregada al navegador

### 5.3 Logs de ERROR (si algo falla)

**Error 1: Service Account no configurado**
```
Error: Firebase Service Account not configured. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY secrets.
```

**Solución:**
- Verificar que los 3 secrets estén en Supabase Dashboard
- Redeploy Edge Function (no necesario si usaste dashboard)

**Error 2: Private key con formato incorrecto**
```
Error: invalid_grant
Failed to get access token: 400
```

**Solución:**
- Verificar que FIREBASE_PRIVATE_KEY tiene el formato correcto
- Debe empezar con `-----BEGIN PRIVATE KEY-----`
- Debe terminar con `-----END PRIVATE KEY-----`
- En dashboard: usar saltos de línea reales
- Volver a configurar el secret

---

## 🧪 Paso 6: Test Background Notification

### 6.1 Preparar Test

1. **Asegurar que FCM toggle está ON**
2. **Minimizar el navegador** (no cerrar, solo minimizar)
3. **Abrir otra aplicación** (cualquier app)

### 6.2 Enviar Notificación

**Opción A: Desde otra tab/ventana del navegador**

1. Abrir nueva ventana de navegador
2. Ir a: http://localhost:8080/get-ready
3. Activar FCM (si es necesario)
4. Click "Send Test Notification"

**Opción B: Usando curl (si tienes Supabase anon key)**

```bash
curl -X POST https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/push-notification-fcm \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "TU_USER_ID",
    "notification": {
      "title": "Background Test",
      "body": "This notification was sent while app was minimized"
    },
    "data": {
      "type": "test",
      "url": "/get-ready"
    }
  }'
```

### 6.3 Resultado Esperado

**Notificación aparece aunque la app esté minimizada:**

```
┌─────────────────────────────────────┐
│ 🔔 Background Test                  │
│ This notification was sent while    │
│ app was minimized                   │
└─────────────────────────────────────┘
```

**Click en la notificación:**
1. Navegador se enfoca/abre
2. Tab de la app se activa
3. Navega a `/get-ready`

---

## ✅ Checklist de Testing Completo

### Configuración
- [ ] Node.js v20 instalado (`node --version`)
- [ ] Servidor corriendo en puerto 8080
- [ ] Supabase Secrets configurados (3 secrets)
- [ ] `.env.local` tiene todas las variables `VITE_FIREBASE_*`

### Service Workers
- [ ] DOS service workers registrados en DevTools
- [ ] `sw.js` activo (scope: `/`)
- [ ] `firebase-messaging-sw.js` activo (scope: `/firebase-cloud-messaging-push-scope`)
- [ ] Console muestra logs de inicialización

### FCM Toggle
- [ ] Toggle "FCM Push Notifications" habilitado (no deshabilitado)
- [ ] Al activar, navegador pide permisos
- [ ] Permisos concedidos (`Notification.permission === "granted"`)
- [ ] Token FCM generado
- [ ] Token guardado en database
- [ ] Toast "FCM Notifications Enabled" aparece

### Foreground Notification (App Abierta)
- [ ] Click "Send Test Notification"
- [ ] Console: `[FCM Test] Response: {success: true, sentCount: 1}`
- [ ] Console: `[FCM] Foreground message received` (CRÍTICO)
- [ ] Toast "Test Notification Sent" en la app
- [ ] **Notificación del navegador aparece** (esquina superior derecha)
- [ ] Click en notificación funciona

### Background Notification (App Cerrada/Minimizada)
- [ ] App minimizada o tab no visible
- [ ] Notificación enviada (otra tab o curl)
- [ ] Notificación aparece aunque app no esté visible
- [ ] Click abre/enfoca navegador
- [ ] Click navega a URL correcta

### Edge Function Logs
- [ ] Logs muestran "Access token obtained"
- [ ] Logs muestran "Success, message name: ..."
- [ ] NO hay errores "invalid_grant"
- [ ] NO hay errores "Firebase Service Account not configured"

---

## 🎯 Resultado Final Esperado

Si TODOS los items del checklist están marcados:

✅ **Sistema FCM completamente funcional**
✅ **OAuth2 Service Account autenticando correctamente**
✅ **Notificaciones llegando al navegador**
✅ **Foreground y background funcionando**
✅ **Enterprise-grade implementation**

---

## 🚨 Troubleshooting Rápido

### Problema: Toggle FCM deshabilitado
**Causa:** Firebase no configurado
**Solución:** Verificar `.env.local`, reiniciar servidor

### Problema: Token se genera pero notificación no aparece
**Causa:** Service Account no configurado en Supabase
**Solución:** Configurar los 3 secrets en Supabase Dashboard

### Problema: Error "invalid_grant"
**Causa:** FIREBASE_PRIVATE_KEY con formato incorrecto
**Solución:** Volver a configurar con formato correcto (con saltos de línea)

### Problema: No aparece `[FCM] Foreground message received`
**Causa:** Service Account no configurado o Edge Function no deployada
**Solución:**
1. Verificar secrets en Supabase
2. Verificar logs de Edge Function
3. Redeploy si es necesario (aunque no debería ser necesario con dashboard)

---

## 📚 Referencias

- [FCM_COMPLETE_GUIDE.md](FCM_COMPLETE_GUIDE.md) - Guía completa de configuración
- [IMPLEMENTACION_COMPLETA.md](IMPLEMENTACION_COMPLETA.md) - Resumen ejecutivo
- [FCM_PRODUCTION_SETUP.md](FCM_PRODUCTION_SETUP.md) - Setup de producción
- [SECURITY_MIGRATION_COMPLETE.md](SECURITY_MIGRATION_COMPLETE.md) - Migración de seguridad

---

**Última actualización:** 2025-10-19
**Estado:** ✅ Listo para testing
**Servidor:** http://localhost:8080
**Supabase Project:** swfnnrpzpkdypbrzmgnr
