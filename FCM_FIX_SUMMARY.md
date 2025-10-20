# FCM Push Notifications - Fix Summary

**Fecha:** 2025-10-19
**Error Original:** "Request is missing required authentication credential"
**Estado:** ✅ Corregido

---

## 🔍 Problemas Identificados

### 1. **gcm_sender_id Incorrecto** ❌
**Archivo:** `vite.config.ts`

**Antes:**
```typescript
gcm_sender_id: '103953800507'  // ❌ Incorrecto
```

**Después:**
```typescript
gcm_sender_id: '242154179799'  // ✅ Correcto (coincide con FIREBASE_MESSAGING_SENDER_ID)
```

### 2. **Service Worker Incorrecto** ❌
**Archivo:** `vite.config.ts`

**Antes:**
```typescript
filename: 'sw.js'  // ❌ Service worker genérico sin FCM
```

**Después:**
```typescript
filename: 'firebase-messaging-sw.js'  // ✅ Service worker con FCM configurado
```

### 3. **Conflicto de Service Workers** ❌
**Problema:** Dos service workers compitiendo por el mismo scope

**Solución:**
- ✅ Renombrado: `public/sw.js` → `public/sw.js.backup`
- ✅ Ahora solo se usa: `public/firebase-messaging-sw.js`

---

## 🔧 Cambios Realizados

### Archivo: `vite.config.ts`

**Cambios:**
1. Actualizado `gcm_sender_id` de `103953800507` a `242154179799`
2. Actualizado `filename` de `sw.js` a `firebase-messaging-sw.js`
3. Agregados comentarios explicativos

**Diff:**
```diff
- gcm_sender_id: '103953800507',
+ // IMPORTANT: This MUST match VITE_FIREBASE_MESSAGING_SENDER_ID
+ gcm_sender_id: '242154179799',

- filename: 'sw.js',
+ // IMPORTANT: Using Firebase Messaging Service Worker for FCM support
+ filename: 'firebase-messaging-sw.js',
```

### Archivo: `src/hooks/useFCMNotifications.tsx`

**Mejoras:**
1. Agregada verificación de service worker correcto
2. Logging mejorado para debugging
3. Advertencias si se detecta service worker incorrecto

**Código agregado:**
```typescript
// Verify correct service worker is registered
if (registration.active) {
  console.log('[FCM] Active service worker:', registration.active.scriptURL);
  if (!registration.active.scriptURL.includes('firebase-messaging-sw')) {
    console.warn('[FCM] Warning: Expected firebase-messaging-sw.js but got:', registration.active.scriptURL);
  }
}
```

### Archivo: `public/sw.js`

**Acción:** Renombrado a `public/sw.js.backup` para evitar conflictos

---

## 📋 Configuración Final

### Variables de Entorno (.env.local)
```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyD3QeCOdORBuMSpbeqsfML9lPS5wFMOXmQ
VITE_FIREBASE_AUTH_DOMAIN=my-detail-area.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=my-detail-area
VITE_FIREBASE_STORAGE_BUCKET=my-detail-area.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=242154179799
VITE_FIREBASE_APP_ID=1:242154179799:web:7c5b71cdcdeedac9277492
VITE_FIREBASE_MEASUREMENT_ID=G-39ZK4JR77C

# FCM VAPID Key
VITE_FCM_VAPID_KEY=BKXpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8Zl6rOVVUgtVtn6LCpRj07anNaUSLnqQ0PkpkXUPm6Q
```

### Service Worker (`public/firebase-messaging-sw.js`)
```javascript
// Firebase configuration (matches .env.local)
const firebaseConfig = {
  apiKey: 'AIzaSyD3QeCOdORBuMSpbeqsfML9lPS5wFMOXmQ',
  authDomain: 'my-detail-area.firebaseapp.com',
  projectId: 'my-detail-area',
  storageBucket: 'my-detail-area.firebasestorage.app',
  messagingSenderId: '242154179799',
  appId: '1:242154179799:web:7c5b71cdcdeedac9277492',
};

// VAPID Public Key (matches VITE_FCM_VAPID_KEY)
const vapidKey = 'BKXpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yFT8Zl6rOVVUgtVtn6LCpRj07anNaUSLnqQ0PkpkXUPm6Q';
```

### PWA Manifest (`vite.config.ts`)
```typescript
manifest: {
  gcm_sender_id: '242154179799',  // ✅ Matches MESSAGING_SENDER_ID
}
```

---

## 🧪 Pasos para Probar

### 1. Limpiar Cache del Navegador

**Chrome/Edge:**
1. DevTools (F12) → Application
2. Storage → Clear site data → Clear all
3. Service Workers → Unregister any active workers

**Firefox:**
1. DevTools (F12) → Storage
2. Service Workers → Unregister
3. Cache Storage → Delete all caches

### 2. Reiniciar Servidor de Desarrollo

```bash
# Detener servidor actual (Ctrl+C si está corriendo)

# Limpiar cache de Vite
rm -rf node_modules/.vite

# Iniciar servidor
npm run dev
```

### 3. Verificar Service Worker Correcto

1. Abrir: http://localhost:8080
2. DevTools → Application → Service Workers
3. Verificar que aparezca: **firebase-messaging-sw.js**
4. Estado debe ser: **activated and is running**

### 4. Probar Notificaciones

1. Ir a: http://localhost:8080/get-ready
2. Click en **Settings** (icono de campana en topbar)
3. Sección: **Firebase Cloud Messaging (FCM)**
4. Activar toggle: **FCM Push Notifications**

**Resultado esperado en consola:**
```
[Firebase] App initialized successfully
[Firebase] Messaging initialized successfully
[FCM] Service Worker ready: /
[FCM] Active service worker: http://localhost:8080/firebase-messaging-sw.js
[FCM] Requesting FCM token with VAPID key...
[FCM] Token received: fAkUAM8SGAMWX6rQPcK...
[FCM] Token saved to database
```

5. Click en: **Send Test Notification**

**Resultado esperado:**
- ✅ Toast: "Test Notification Sent - Successfully sent to 1 device(s)"
- ✅ Notificación aparece en el navegador
- ✅ Sin errores de autenticación

---

## 🔍 Troubleshooting

### Error: "Service worker no está registrado"

**Solución:**
```bash
# Limpiar y reconstruir
rm -rf node_modules/.vite dist
npm run build:dev
npm run dev
```

### Error: "Still using old service worker (sw.js)"

**Solución:**
1. DevTools → Application → Service Workers
2. Click en **Unregister** en todos los service workers
3. Click en **Clear site data**
4. Refrescar página (F5)

### Error: "VAPID key mismatch"

**Verificar:**
1. `.env.local` tiene `VITE_FCM_VAPID_KEY`
2. `firebase-messaging-sw.js` tiene el mismo `vapidKey`
3. Ambas claves son IDÉNTICAS (88 caracteres)

**Ver guía detallada:** [FCM_VAPID_KEY_VERIFICATION.md](./FCM_VAPID_KEY_VERIFICATION.md)

---

## ✅ Checklist de Verificación

- [x] Actualizado `gcm_sender_id` en vite.config.ts
- [x] Actualizado service worker a `firebase-messaging-sw.js`
- [x] Renombrado `sw.js` a `sw.js.backup`
- [x] Agregadas verificaciones en `useFCMNotifications.tsx`
- [x] Documentado proceso en `FCM_VAPID_KEY_VERIFICATION.md`
- [ ] **TODO:** Limpiar cache del navegador
- [ ] **TODO:** Reiniciar servidor de desarrollo
- [ ] **TODO:** Verificar service worker correcto
- [ ] **TODO:** Probar suscripción a notificaciones
- [ ] **TODO:** Enviar notificación de prueba
- [ ] **TODO:** Confirmar que no haya errores

---

## 📚 Referencias

- [Firebase Cloud Messaging Web Setup](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Vite PWA Plugin - Inject Manifest](https://vite-plugin-pwa.netlify.app/guide/inject-manifest.html)
- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)

---

## 🎯 Próximos Pasos

Una vez verificado que las notificaciones funcionan:

1. **Testing en diferentes navegadores:**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari (macOS/iOS)

2. **Testing en diferentes escenarios:**
   - Foreground (app abierta)
   - Background (app cerrada)
   - Offline → Online

3. **Monitoreo:**
   - Logs en Supabase Edge Functions
   - Métricas de entrega en Firebase Console
   - Analytics de interacciones con notificaciones

---

**Configurado por:** Claude Code
**Última actualización:** 2025-10-19 13:45 UTC
**Versión:** FCM API v1 (OAuth2)
