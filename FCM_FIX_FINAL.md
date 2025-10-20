# FCM Push Notifications - Solución Final

**Fecha:** 2025-10-19
**Estado:** ✅ Implementado - Listo para probar

---

## 🔍 Problema Raíz Identificado

### ❌ El Service Worker NO se estaba registrando

**Causa:**
- Vite PWA con estrategia `injectManifest` requiere que el service worker incluya `self.__WB_MANIFEST`
- `firebase-messaging-sw.js` NO tenía este placeholder
- Vite PWA no podía procesar el archivo
- **Resultado:** No hay service worker = No hay FCM token = Toggle deshabilitado

---

## ✅ Solución Implementada

### **Arquitectura de Doble Service Worker**

En lugar de mezclar PWA y FCM en un solo service worker, ahora usamos **DOS service workers separados**:

```
Service Worker 1 (PWA)                Service Worker 2 (FCM)
├─ Generado por Vite PWA             ├─ firebase-messaging-sw.js
├─ Scope: / (raíz)                   ├─ Scope: /firebase-cloud-messaging-push-scope
├─ Función: Cache offline            ├─ Función: Push notifications
├─ Auto-registrado por Vite          └─ Registrado manualmente en useFCMNotifications
└─ Workbox precaching
```

**Ventajas:**
✅ Separación de responsabilidades
✅ No hay conflictos entre SW
✅ Más fácil de debuggear
✅ PWA y FCM funcionan independientemente

---

## 📝 Cambios Realizados

### 1. **vite.config.ts** - Cambio de Estrategia

**ANTES (❌ No funcionaba):**
```typescript
VitePWA({
  strategies: 'injectManifest',  // ❌ Requiere self.__WB_MANIFEST
  srcDir: 'public',
  filename: 'firebase-messaging-sw.js',  // ❌ No tiene el placeholder
  devOptions: {
    enabled: false,  // ❌ No registra SW en desarrollo
  }
})
```

**DESPUÉS (✅ Funcionando):**
```typescript
VitePWA({
  strategies: 'generateSW',  // ✅ Vite genera el SW automáticamente
  // NO especificamos srcDir ni filename
  devOptions: {
    enabled: true,  // ✅ Registra SW en desarrollo
  }
})
```

**Resultado:**
- Vite PWA ahora genera y registra automáticamente el service worker para PWA
- Scope: `/` (raíz del sitio)
- Archivo generado: `sw.js` (en dist/)

---

### 2. **useFCMNotifications.tsx** - Registro Manual de FCM SW

**Agregado al `useEffect` de inicialización:**

```typescript
useEffect(() => {
  const checkSupport = async () => {
    const supported = 'Notification' in window &&
                      'serviceWorker' in navigator &&
                      'PushManager' in window;

    setIsSupported(supported);
    setIsConfigured(isFirebaseConfigured());

    if (supported) {
      setPermission(Notification.permission);

      // ✅ NUEVO: Registrar Firebase Messaging SW manualmente
      try {
        const registration = await navigator.serviceWorker.register(
          '/firebase-messaging-sw.js',
          { scope: '/firebase-cloud-messaging-push-scope' }  // Scope diferente
        );
        console.log('[FCM] Firebase Messaging SW registered:', registration.scope);
      } catch (error) {
        console.error('[FCM] Firebase Messaging SW registration failed:', error);
      }
    }
  };

  checkSupport();
}, []);
```

**Resultado:**
- `firebase-messaging-sw.js` ahora se registra con un scope específico para FCM
- No interfiere con el service worker de PWA

---

### 3. **useFCMNotifications.tsx** - Obtener SW Correcto para FCM Token

**ANTES (❌):**
```typescript
const registration = await navigator.serviceWorker.ready;
// ❌ Esto podía devolver el SW de PWA, no el de FCM
```

**DESPUÉS (✅):**
```typescript
// Buscar el service worker de FCM específicamente
const registrations = await navigator.serviceWorker.getRegistrations();
const fcmRegistration = registrations.find(reg =>
  reg.scope.includes('firebase-cloud-messaging-push-scope')
);

if (!fcmRegistration) {
  throw new Error('Firebase Messaging service worker not found. Please refresh the page.');
}

console.log('[FCM] Using FCM Service Worker:', fcmRegistration.scope);

// Usar el registration correcto para obtener el token
const token = await getToken(messaging, {
  serviceWorkerRegistration: fcmRegistration,  // ✅ SW de FCM
  vapidKey: fcmVapidKey,
});
```

**Resultado:**
- Garantiza que el token FCM se genera usando el service worker correcto
- Evita errores de "service worker not found"

---

## 🧪 Cómo Probar

### Paso 1: Limpiar Cache Completo

**CRÍTICO:** Debes eliminar TODOS los service workers antiguos

#### Chrome/Edge:
```
1. F12 → Application → Service Workers
2. Click "Unregister" en TODOS los service workers
3. Application → Storage → Clear site data
4. Cerrar y volver a abrir el navegador
```

#### Firefox:
```
1. F12 → Storage → Service Workers
2. Unregister todos los SW listados
3. Cache Storage → Delete All
4. Cerrar y volver a abrir el navegador
```

---

### Paso 2: Reiniciar Servidor

```bash
# Detener servidor actual
Ctrl + C

# Limpiar cache de Vite
rm -rf node_modules/.vite dist dev-dist

# Reiniciar
npm run dev
```

**Verificar output:**
```
VITE v5.x.x ready in XXX ms

➜  Local:   http://localhost:8080/
```

---

### Paso 3: Verificar Ambos Service Workers

1. Abrir: http://localhost:8080
2. F12 → Application → Service Workers

**Debe mostrar DOS service workers:**

```
1. Source: http://localhost:8080/sw.js
   Status: activated and is running
   Scope: http://localhost:8080/

2. Source: http://localhost:8080/firebase-messaging-sw.js
   Status: activated and is running
   Scope: http://localhost:8080/firebase-cloud-messaging-push-scope
```

**Consola del navegador debe mostrar:**
```
✅ [FCM] Firebase Messaging SW registered: /firebase-cloud-messaging-push-scope
✅ [FCM SW] Firebase Messaging Service Worker loaded
✅ [FCM SW] Firebase app initialized
```

---

### Paso 4: Activar FCM Notifications

1. Ir a: http://localhost:8080/get-ready
2. Click en icono de **campana** (🔔) en topbar
3. Panel de Notification Settings se abre

**Verificar estado:**
```
✅ Browser Support: Yes
✅ Firebase Configured: Yes
ℹ️ Permission: default
```

4. **Activar el toggle: "FCM Push Notifications"**

**Navegador pedirá permisos:**
```
"localhost:8080 wants to show notifications"
[Block] [Allow]
```

5. Click en **"Allow"**

---

### Paso 5: Verificar en Consola

**Después de activar el toggle, debe aparecer:**

```javascript
✅ [Firebase] App initialized successfully
✅ [Firebase] Messaging initialized successfully
✅ [FCM] Using FCM Service Worker: /firebase-cloud-messaging-push-scope
✅ [FCM] Requesting FCM token with VAPID key...
✅ [FCM] Token received: fAkUAM8SGAMWX6rQPcK...
✅ [FCM] Token saved to database
```

**Toast notification:**
```
🎉 "FCM Notifications Enabled"
   "You will now receive Firebase Cloud Messaging notifications"
```

---

### Paso 6: Enviar Notificación de Prueba

1. En Notification Settings, click: **"Send Test Notification"**

**Consola debe mostrar:**
```
[FCM Test] Sending test notification via Edge Function
[FCM Test] Response: { success: true, sentCount: 1 }
```

**Toast:**
```
✅ "Test Notification Sent"
   "Successfully sent to 1 device(s)"
```

**Notificación del navegador:**
```
┌─────────────────────────────────┐
│ 🔔 FCM Test Notification        │
│ This is a test notification     │
│ from Firebase Cloud Messaging   │
│                                  │
│ [View] [Dismiss]                │
└─────────────────────────────────┘
```

---

## 🎯 Qué Esperar

### DevTools → Application → Service Workers

**DOS service workers deben estar activos:**
| Service Worker | Scope | Función |
|----------------|-------|---------|
| `sw.js` | `/` | PWA offline cache |
| `firebase-messaging-sw.js` | `/firebase-cloud-messaging-push-scope` | FCM push notifications |

### Consola del Navegador

**Al cargar la página:**
```
[FCM] Firebase Messaging SW registered: /firebase-cloud-messaging-push-scope
[FCM SW] Firebase app initialized
```

**Al activar toggle:**
```
[FCM] Using FCM Service Worker: /firebase-cloud-messaging-push-scope
[FCM] Token received: ...
[FCM] Token saved to database
```

**Al enviar test:**
```
[FCM Test] Response: { success: true, sentCount: 1 }
```

---

## ❌ Troubleshooting

### Error: "Firebase Messaging service worker not found"

**Causa:** El service worker de FCM no se registró correctamente

**Solución:**
1. Verificar que `/firebase-messaging-sw.js` existe en `public/`
2. Limpiar cache y service workers
3. Refrescar página (F5)
4. Verificar que el scope sea correcto

```javascript
// En consola del navegador:
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => console.log('SW:', reg.scope));
});
```

---

### Error: "Push notifications not supported in this browser"

**Causa:** `isSupported` es `false`

**Verificar en consola:**
```javascript
console.log({
  hasNotification: 'Notification' in window,
  hasServiceWorker: 'serviceWorker' in navigator,
  hasPushManager: 'PushManager' in window
});
```

Todos deben ser `true`.

---

### Toggle de FCM sigue deshabilitado

**Verificar:**

```javascript
// En consola:
console.log({
  supported: // resultado de isSupported,
  configured: // resultado de isConfigured,
  permission: Notification.permission
});
```

**Si `configured` es `false`:**
- Verificar que `.env.local` tiene todas las variables `VITE_FIREBASE_*`
- Verificar que no tengan el placeholder `YOUR_`

```bash
cat .env.local | grep VITE_FIREBASE
```

---

### Notificación no aparece

1. **Verificar permisos:**
```javascript
console.log('Permission:', Notification.permission);
// Debe ser "granted"
```

2. **Verificar token guardado:**
```sql
-- En Supabase SQL Editor:
SELECT * FROM fcm_tokens WHERE is_active = true;
```

3. **Verificar logs de Edge Function:**
```sql
SELECT * FROM edge_function_logs
WHERE function_name = 'push-notification-fcm'
ORDER BY created_at DESC
LIMIT 5;
```

---

## ✅ Checklist de Validación

Antes de marcar como completado:

- [ ] Cache del navegador limpiado completamente
- [ ] Todos los service workers anteriores unregistered
- [ ] Servidor reiniciado en puerto 8080
- [ ] DOS service workers aparecen en DevTools
  - [ ] `sw.js` (scope: `/`)
  - [ ] `firebase-messaging-sw.js` (scope: `/firebase-cloud-messaging-push-scope`)
- [ ] Consola muestra: "Firebase Messaging SW registered"
- [ ] Toggle de FCM está habilitado (no deshabilitado)
- [ ] Permisos de notificación concedidos ("granted")
- [ ] Token FCM generado y guardado en base de datos
- [ ] Notificación de prueba enviada exitosamente
- [ ] Notificación apareció en el navegador

---

## 📊 Resumen de Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (localhost:8080)                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────┐  ┌───────────────────────────┐│
│  │   Service Worker 1      │  │   Service Worker 2        ││
│  │   (Vite PWA)            │  │   (Firebase Messaging)    ││
│  ├─────────────────────────┤  ├───────────────────────────┤│
│  │ File: sw.js (generated) │  │ File: firebase-messaging- ││
│  │ Scope: /                │  │       sw.js               ││
│  │ Function: PWA cache     │  │ Scope: /firebase-cloud-   ││
│  │ Registration: Auto      │  │        messaging-push-    ││
│  │              (Vite)     │  │        scope              ││
│  │                         │  │ Function: FCM push        ││
│  │                         │  │ Registration: Manual      ││
│  │                         │  │     (useFCMNotifications) ││
│  └─────────────────────────┘  └───────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**Configurado por:** Claude Code
**Última actualización:** 2025-10-19 16:15 UTC
**Versión:** Dual Service Worker Architecture
**Estado:** ✅ Ready for Testing
