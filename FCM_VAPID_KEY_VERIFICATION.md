# FCM VAPID Key Verification Guide

**Fecha:** 2025-10-19
**Estado:** 🔍 Verificación requerida

---

## 🔑 VAPID Key Actual en .env.local

```bash
VITE_FCM_VAPID_KEY=BKXpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8Zl6rOVVUgtVtn6LCpRj07anNaUSLnqQ0PkpkXUPm6Q
```

Esta clave también está configurada en:
- `public/firebase-messaging-sw.js` (línea 22)

---

## ✅ Cómo Verificar que es Correcta

### Opción 1: Firebase Console (Web UI)

1. Ir a: https://console.firebase.google.com
2. Seleccionar proyecto: **My Detail Area**
3. Click en ⚙️ **Project Settings**
4. Pestaña: **Cloud Messaging**
5. Scroll hasta: **Web Push certificates**
6. Verificar que la clave mostrada coincida con `VITE_FCM_VAPID_KEY`

**Formato esperado:**
- Inicia con: `BK` (indica clave pública base64url)
- Longitud: ~88 caracteres
- Solo caracteres alfanuméricos, guiones y guiones bajos

### Opción 2: Firebase Admin SDK (CLI)

```bash
# Si tienes Firebase CLI instalado
firebase projects:list

# Ver configuración del proyecto
firebase apps:sdkconfig web --project my-detail-area
```

### Opción 3: Revisar la Clave en el Service Worker

La clave actual en `firebase-messaging-sw.js` es:
```javascript
const vapidKey = 'BKXpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8Zl6rOVVUgtVtn6LCpRj07anNaUSLnqQ0PkpkXUPm6Q';
```

---

## 🔄 Si la Clave es Incorrecta

### 1. Obtener Nueva Clave desde Firebase Console

1. Firebase Console → Project Settings → Cloud Messaging
2. Sección: **Web Push certificates**
3. Si no hay clave o necesitas una nueva:
   - Click: **Generate key pair**
4. Copiar la clave generada

### 2. Actualizar en Todos los Lugares

**A. Actualizar `.env.local`:**
```bash
VITE_FCM_VAPID_KEY=TU_NUEVA_CLAVE_AQUI
```

**B. Actualizar `public/firebase-messaging-sw.js`:**
```javascript
// Línea 22
const vapidKey = 'TU_NUEVA_CLAVE_AQUI';
```

**C. Reiniciar servidor:**
```bash
# Detener servidor actual (Ctrl+C)
npm run dev
```

---

## 🧪 Cómo Probar que la Clave Funciona

### Test 1: Verificar en Consola del Navegador

1. Abrir: http://localhost:8080
2. Abrir DevTools → Console
3. Ejecutar:
```javascript
console.log('VAPID Key:', import.meta.env.VITE_FCM_VAPID_KEY);
// Debe mostrar la clave configurada
```

### Test 2: Intentar Suscribirse

1. Ir a: http://localhost:8080/get-ready
2. Click en **Settings** (icono de campana)
3. Sección: **Firebase Cloud Messaging (FCM)**
4. Activar toggle: **FCM Push Notifications**
5. Verificar logs en consola:
   - ✅ `[FCM] Requesting FCM token with VAPID key...`
   - ✅ `[FCM] Token received: ...`
   - ❌ Si falla: "Request is missing required authentication credential"

### Test 3: Verificar Service Worker

1. DevTools → Application → Service Workers
2. Verificar que esté activo: `firebase-messaging-sw.js`
3. Click en nombre del service worker para ver código
4. Verificar que `vapidKey` coincide con `.env.local`

---

## 🔍 Troubleshooting VAPID Key

### Error: "Invalid VAPID Key"

**Causa:** Clave mal formateada o corrupta

**Solución:**
1. Regenerar clave en Firebase Console
2. Copiar COMPLETA (88 caracteres)
3. NO agregar comillas extras
4. NO agregar espacios

### Error: "Authentication credential expected"

**Causas posibles:**
1. VAPID key incorrecta
2. VAPID key no coincide con el proyecto de Firebase
3. Service worker usando clave diferente a la de `.env.local`

**Solución:**
1. Verificar que ambos archivos usen la MISMA clave
2. Verificar que la clave corresponde al proyecto `my-detail-area`

### Error: "Key pair mismatch"

**Causa:** Clave pública no corresponde con la configuración del proyecto

**Solución:**
1. Verificar Project ID: `my-detail-area`
2. Verificar Sender ID: `242154179799`
3. Regenerar clave si es necesario

---

## 📊 Información de la Configuración Actual

### Firebase Project
- **Project ID:** `my-detail-area`
- **Sender ID:** `242154179799`
- **App ID:** `1:242154179799:web:7c5b71cdcdeedac9277492`

### VAPID Key Locations
1. ✅ `.env.local` → `VITE_FCM_VAPID_KEY`
2. ✅ `public/firebase-messaging-sw.js` → `vapidKey` (línea 22)
3. ✅ `src/hooks/useFCMNotifications.tsx` → Lee de `import.meta.env.VITE_FCM_VAPID_KEY`

### Service Worker
- **Archivo:** `public/firebase-messaging-sw.js`
- **Scope:** `/`
- **Estrategia:** `injectManifest` (Vite PWA)

---

## ✅ Checklist de Verificación

- [ ] Verificar VAPID key en Firebase Console
- [ ] Confirmar que `.env.local` tiene la clave correcta
- [ ] Confirmar que `firebase-messaging-sw.js` tiene la misma clave
- [ ] Reiniciar servidor de desarrollo (`npm run dev`)
- [ ] Limpiar cache del navegador y service workers
- [ ] Probar suscripción a notificaciones
- [ ] Verificar que no haya errores en consola
- [ ] Confirmar que se genera token FCM

---

**Nota Importante:**

La VAPID key actual (`BKXpBg...m6Q`) fue generada el **19 de octubre de 2025** según el comentario en `firebase-messaging-sw.js`. Si has regenerado claves después de esa fecha, necesitarás actualizar ambos archivos.

---

**Siguiente paso:** Una vez verificada la clave, continuar con la prueba de notificaciones.
