# 🧪 Instrucciones para Probar FCM Push Notifications

**Fecha:** 2025-10-19
**Estado:** ✅ Correcciones aplicadas - Listo para probar

---

## 🔧 Cambios Aplicados

### 1. ✅ Configuración Corregida
- **gcm_sender_id:** `242154179799` (correcto)
- **Service Worker:** `firebase-messaging-sw.js` (correcto)
- **dev-sw.js:** Deshabilitado para evitar conflictos

### 2. ✅ Archivos Limpiados
- Eliminado: `dev-dist/` (contenía dev-sw.js conflictivo)
- Eliminado: `node_modules/.vite/` (cache limpiado)
- Renombrado: `public/sw.js` → `public/sw.js.backup`

---

## 📋 Pasos para Probar (Ejecutar en Orden)

### Paso 1: Limpiar Cache del Navegador 🧹

**IMPORTANTE:** Debes hacer esto ANTES de reiniciar el servidor.

#### Chrome/Edge:
1. Presionar `F12` para abrir DevTools
2. Click derecho en el botón de **Refresh** (recargar)
3. Seleccionar: **"Empty Cache and Hard Reload"**
4. O ir a: DevTools → **Application** → **Storage** → **Clear site data**

#### Firefox:
1. Presionar `F12` para abrir DevTools
2. Ir a: **Storage** → **Service Workers**
3. Click en **Unregister** en todos los service workers listados
4. Ir a: **Cache Storage** → Click derecho → **Delete All**

#### Paso Crítico - Unregister Service Workers:
```
DevTools → Application → Service Workers
→ Click "Unregister" en TODOS los service workers
→ Verificar que la lista quede vacía
```

---

### Paso 2: Reiniciar Servidor de Desarrollo 🔄

**Terminal actual:**
```bash
# Si el servidor está corriendo, detenerlo:
Ctrl + C

# Iniciar el servidor nuevamente:
npm run dev
```

**Salida esperada:**
```
VITE v5.x.x ready in XXX ms

➜  Local:   http://localhost:8080/
➜  Network: use --host to expose
➜  press h + enter to show help
```

⚠️ **IMPORTANTE:** Verificar que diga `http://localhost:8080/` (puerto 8080)

---

### Paso 3: Verificar Service Worker Correcto ✅

1. Abrir navegador en: **http://localhost:8080**
2. Presionar `F12` → **Application** → **Service Workers**

**Verificar:**
- ✅ Debe aparecer: `firebase-messaging-sw.js`
- ✅ Estado: **activated and is running**
- ❌ NO debe aparecer: `dev-sw.js` ni `sw.js`

**En la consola del navegador, verificar:**
```javascript
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Service Workers registrados:', registrations.length);
  registrations.forEach(reg => console.log('SW:', reg.active?.scriptURL));
});
```

**Resultado esperado:**
```
Service Workers registrados: 1
SW: http://localhost:8080/firebase-messaging-sw.js
```

---

### Paso 4: Verificar Configuración de Firebase 🔥

**En la consola del navegador:**
```javascript
// Verificar variables de entorno
console.log('Firebase Config:', {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  senderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  vapidKey: import.meta.env.VITE_FCM_VAPID_KEY?.substring(0, 10) + '...'
});
```

**Resultado esperado:**
```javascript
{
  apiKey: "AIzaSyD3Qe...",
  projectId: "my-detail-area",
  senderId: "242154179799",
  vapidKey: "BKXpBg3iYC..."
}
```

---

### Paso 5: Probar Notificaciones Push 🔔

#### A. Navegar a Get Ready
```
http://localhost:8080/get-ready
```

#### B. Abrir Configuración de Notificaciones
1. Click en el icono de **campana** (🔔) en la barra superior derecha
2. Se abrirá el panel de **Notification Settings**

#### C. Activar FCM Push Notifications
1. Buscar la sección: **"Firebase Cloud Messaging (FCM)"**
2. Verificar estado:
   - ✅ **Browser Support:** Yes
   - ✅ **Firebase Configured:** Yes
   - ℹ️ **Permission:** default (o granted)

3. Click en el toggle: **"FCM Push Notifications"**

#### D. Conceder Permisos
El navegador mostrará un prompt:
```
"localhost:8080 wants to show notifications"
[Block] [Allow]
```
→ Click en **"Allow"**

---

### Paso 6: Verificar en Consola 📊

**Después de activar el toggle, la consola debe mostrar:**

```
✅ [Firebase] App initialized successfully
✅ [Firebase] Messaging initialized successfully
✅ [FCM] Service Worker ready: /
✅ [FCM] Active service worker: http://localhost:8080/firebase-messaging-sw.js
✅ [FCM] Requesting FCM token with VAPID key...
```

**Luego, después de unos segundos:**
```
✅ [FCM] Token received: fAkUAM8SGAMWX6rQPcK... (truncated)
✅ [FCM] Token saved to database
```

**Toast notification debe aparecer:**
```
🎉 "FCM Notifications Enabled"
   "You will now receive Firebase Cloud Messaging notifications"
```

---

### Paso 7: Enviar Notificación de Prueba 🚀

1. En el panel de Notification Settings
2. Click en el botón: **"Send Test Notification"**

**Resultado esperado en consola:**
```
[FCM Test] Sending test notification via Edge Function
[FCM Test] Response: { success: true, sentCount: 1, ... }
```

**Toast notification:**
```
✅ "Test Notification Sent"
   "Successfully sent to 1 device(s)"
```

**Notificación del navegador debe aparecer:**
```
🔔 "FCM Test Notification"
   "This is a test notification from Firebase Cloud Messaging"
```

---

## ❌ Troubleshooting

### Error: "Service worker registration failed"

**Solución:**
```bash
# Limpiar completamente
rm -rf node_modules/.vite dist dev-dist
npm run dev
```

### Error: "Authentication credential expected"

**Verificar VAPID key:**
1. Abrir: [FCM_VAPID_KEY_VERIFICATION.md](./FCM_VAPID_KEY_VERIFICATION.md)
2. Seguir pasos de verificación
3. Confirmar que `.env.local` y `firebase-messaging-sw.js` tengan la MISMA clave

### Error: "Firebase is not configured"

**Verificar en consola:**
```javascript
console.log('All env vars:', Object.keys(import.meta.env).filter(k => k.startsWith('VITE_FIREBASE')));
```

Debe mostrar:
```
['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_AUTH_DOMAIN', 'VITE_FIREBASE_PROJECT_ID', ...]
```

### Notificación no aparece

**Verificar permisos:**
```javascript
console.log('Notification permission:', Notification.permission);
// Debe ser: "granted"
```

**Verificar service worker:**
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Registration:', reg);
  console.log('Active SW:', reg?.active?.scriptURL);
});
```

---

## ✅ Checklist Final

Antes de marcar como completo, verificar:

- [ ] Cache del navegador limpiado
- [ ] Todos los service workers anteriores unregistered
- [ ] Servidor reiniciado en puerto 8080
- [ ] Solo `firebase-messaging-sw.js` está registrado
- [ ] Variables de entorno cargadas correctamente
- [ ] Permisos de notificación concedidos ("granted")
- [ ] Token FCM generado y guardado en base de datos
- [ ] Notificación de prueba enviada exitosamente
- [ ] Notificación apareció en el navegador

---

## 📸 Screenshots de Éxito

### DevTools - Service Workers
```
Source: http://localhost:8080/firebase-messaging-sw.js
Status: #123 activated and is running
```

### Consola del Navegador
```
[FCM] Token received: fAkUAM8SGAMWX6rQPcK...
✅ FCM Notifications Enabled
✅ Test Notification Sent
```

### Notificación del Navegador
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

## 🎯 ¿Qué Sigue?

Una vez que las notificaciones funcionen:

1. **Testing en producción:**
   - Build: `npm run build`
   - Preview: `npm run preview`
   - Verificar que funcione en build de producción

2. **Testing en diferentes navegadores:**
   - Chrome ✅
   - Edge ✅
   - Firefox ✅
   - Safari (limitaciones conocidas)

3. **Configurar backend (Edge Function):**
   - Ver: [FCM_V1_SETUP.md](./FCM_V1_SETUP.md)
   - Configurar Service Account en Supabase
   - Probar envío desde servidor

---

**¿Listo para probar?**

1. ✅ Limpia cache del navegador
2. ✅ Ctrl+C para detener servidor
3. ✅ `npm run dev` para reiniciar
4. ✅ Sigue los pasos anteriores

**¡Buena suerte!** 🚀
