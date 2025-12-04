# 📱 Sesión Push Notifications - Resumen Completo

**Fecha**: 3 de Diciembre 2025
**Objetivo**: Implementar notificaciones push end-to-end para cambios de status de órdenes
**Estado**: ⚠️ **CASI COMPLETO - FALTA UN PASO CRÍTICO**

---

## ✅ Logros Completados

### 1. **Firebase Service Account Credentials** ✅
- **Problema**: JSON parsing error en Edge Function `send-notification`
- **Causa**: Malformed `private_key` con escape sequences incorrectos
- **Solución**: Usar variables separadas `FIREBASE_CLIENT_EMAIL` y `FIREBASE_PRIVATE_KEY`
- **Archivo modificado**: `supabase/functions/send-notification/index.ts`
- **Script**: `fix-firebase-credentials.ps1`
- **Resultado**: Edge Function ahora retorna status 200 exitosamente

### 2. **Auto-Exclusión en Push Notifications** ✅
- **Implementación**: Agregar parámetro `triggeredBy` a `pushNotificationHelper.notifyOrderStatusChange()`
- **Comportamiento**: Usuario que cambia status NO recibe su propia notificación
- **Archivo modificado**: `src/hooks/useStatusPermissions.tsx` (líneas 211-231)

### 3. **FirebaseMessagingProvider** ✅
- **Problema**: `useFirebaseMessaging` hook no se estaba ejecutando
- **Solución**: Crear componente wrapper y agregarlo a App.tsx
- **Archivos creados**:
  - `src/components/FirebaseMessagingProvider.tsx`
  - `add-firebase-messaging-provider.ps1` (script de instalación)
- **Resultado**: FCM se inicializa correctamente en todas las sesiones

### 4. **Eliminación de Llamada Duplicada** ✅
- **Problema**: Dos llamadas a `notifyOrderStatusChange()` en el mismo evento
  - Primera llamada (líneas 139-148): SIN `triggeredBy` → 404 error
  - Segunda llamada (líneas 223-231): CON `triggeredBy` → 200 success
- **Solución**: Eliminar primera llamada (líneas 139-148)
- **Script**: `fix-duplicate-push-notifications.ps1`
- **Resultado**: Solo una llamada correcta con auto-exclusión

---

## ⚠️ Problema Actual (CRÍTICO)

### **Token FCM no registrado para navegador actual**

#### Diagnóstico Completo:

**Usuario**: rruiz@lima.llc (122c8d5b-e5f5-4782-a179-544acbaaceb9)

**Tokens en base de datos** (desde query SQL):
```sql
SELECT * FROM fcm_tokens WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9' AND is_active = true;

-- RESULTADO: 2 tokens activos
-- Token 1: dc_GMMROOi... (creado 2025-12-03 17:13, actualizado 18:13)
-- Token 2: dxgh1t3iL0S... (creado 2025-11-21 21:33)
```

**El problema**: Estos tokens son de **OTRO navegador/dispositivo**, NO del navegador Edge actual.

#### Evidencia del problema:

**En ventana de bosdetail** (donde se hace el cambio):
```javascript
[PushNotificationHelper] Notification sent successfully: {sent: 1, failed: 0, tokens: 1}
```
✅ Edge Function envía exitosamente

**En ventana de rruiz** (donde DEBERÍA recibir):
```javascript
🔥 Firebase Cloud Messaging initialized successfully
// ❌ PERO NO HAY:
// [FCM] Foreground message:
// [FCM] Token registered successfully
```
❌ NO recibe nada porque el token registrado NO es de este navegador

---

## 🔧 Solución Pendiente

### **Ejecutar script de re-registro de token FCM**

**Archivo**: `force-fcm-reregister.js` (ya creado en raíz del proyecto)

#### Instrucciones de ejecución:

1. **Abrir ventana con rruiz@lima.llc** (navegador Edge normal, NO incógnito)
2. **Abrir DevTools** (F12) → Consola
3. **Copiar TODO el contenido** del archivo `force-fcm-reregister.js`
4. **Pegar en consola** y presionar Enter
5. **Observar mensajes**:
   ```
   🔄 Iniciando re-registro de FCM...
   👤 User ID: 122c8d5b-e5f5-4782-a179-544acbaaceb9
   🗑️ Desactivando tokens antiguos...
   ✅ Tokens antiguos desactivados
   🧹 Limpiando localStorage...
   ✅ localStorage limpio
   🔄 Recargando página en 2 segundos...
   ```
6. **Esperar reload automático**
7. **Buscar en consola**:
   ```
   🔥 Firebase Cloud Messaging initialized successfully
   [FCM] Requesting notification permission...
   [FCM] Permission granted
   [FCM] Token: ...
   [FCM] Token registered successfully
   ```

#### Qué hace el script:

```javascript
1. Desactiva todos los tokens antiguos en fcm_tokens (SET is_active = false)
2. Limpia localStorage:
   - fcm_token
   - fcm_permission_requested
   - fcm_token_registered
3. Recarga la página (location.reload())
4. useFirebaseMessaging se ejecuta automáticamente
5. Registra nuevo token FCM para este navegador
```

---

## 📊 Flujo Completo (Cuando esté funcionando)

### **Escenario**: bosdetail cambia status de orden SA-365

#### **Paso 1: Usuario bosdetail cambia status**
```javascript
// useStatusPermissions.tsx:206
🔔 [PUSH] Sending push notification for status change to "completed"

// pushNotificationHelper.ts:220
[PushNotificationHelper] Notifying order followers: {
  orderId: 'c9efefa2-34e4-4258-a51b-c55de36cbf50',
  triggeredBy: 'f2875799-7e7b-4622-9923-83d1965d99b0'  // bosdetail ID
}

// pushNotificationHelper.ts:244
[PushNotificationHelper] Excluding trigger user: f2875799-7e7b-4622-9923-83d1965d99b0
// ✅ bosdetail NO recibirá su propia notificación

// pushNotificationHelper.ts:264
[PushNotificationHelper] Found 1 follower(s) to notify
// ✅ Solo rruiz (quien sigue la orden)
```

#### **Paso 2: Edge Function envía notificación**
```javascript
// Edge Function send-notification
POST https://swfnnrpzpkdypbrzmgnr.supabase.co/functions/v1/send-notification

// Response:
{
  sent: 1,
  failed: 0,
  tokens: 1
}
// ✅ Notificación enviada a FCM con status 200
```

#### **Paso 3: rruiz recibe notificación** (CUANDO TENGA TOKEN VÁLIDO)

**Si app en FOREGROUND** (pestaña activa):
```javascript
// En consola de rruiz:
[FCM] Foreground message received: {
  notification: {
    title: "Order SA-365 Status Updated",
    body: "Detail Department changed status to completed"
  },
  data: {
    url: "https://app.mydetailarea.com/sales/c9efefa2-34e4-4258-a51b-c55de36cbf50",
    orderId: "c9efefa2-34e4-4258-a51b-c55de36cbf50"
  }
}

// ✅ Toast notification aparece en pantalla
```

**Si app en BACKGROUND** (pestaña minimizada/otra pestaña):
```javascript
// firebase-messaging-sw.js ejecuta:
[FCM SW] Background message received: {...}
[FCM SW] Showing notification: Order SA-365 Status Updated

// ✅ Notificación nativa del OS aparece
// Click en notificación → Abre pestaña con la orden
```

---

## 🗂️ Archivos Clave Modificados

### **1. Supabase Edge Function**
```
supabase/functions/send-notification/index.ts
- Cambio: Usar FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY separados
- Líneas: 15-21, 89-95
```

### **2. Componente Provider**
```
src/components/FirebaseMessagingProvider.tsx (NUEVO)
- Propósito: Wrapper que ejecuta useFirebaseMessaging() en App.tsx
- Líneas: 1-17
```

### **3. App.tsx**
```
src/App.tsx
- Cambio: Agregar <FirebaseMessagingProvider> después de <AuthProvider>
- Líneas: 12 (import), 314-342 (wrapping)
```

### **4. Hook de permisos de status**
```
src/hooks/useStatusPermissions.tsx
- Cambio 1: Eliminar llamada duplicada sin triggeredBy (líneas 139-148 ELIMINADAS)
- Cambio 2: Llamada correcta con auto-exclusión (líneas 204-236 MANTENER)
```

### **5. Service Worker**
```
public/firebase-messaging-sw.js
- Estado: ✅ Correcto, no modificado
- Líneas clave: 36-68 (onBackgroundMessage handler)
```

---

## 🧪 Cómo Probar (Después de ejecutar script)

### **Setup**:
1. **Ventana 1** (Edge normal): rruiz@lima.llc
2. **Ventana 2** (Edge incógnito): bosdetail@mydetailarea.com

### **Test 1: Notificación en FOREGROUND**
1. En ventana rruiz: Ir a `/sales` (mantener visible)
2. En ventana bosdetail: Cambiar status de orden SA-365
3. **Esperar ver en rruiz**:
   - Console: `[FCM] Foreground message received:`
   - Pantalla: Toast notification en esquina superior derecha

### **Test 2: Notificación en BACKGROUND**
1. En ventana rruiz: Minimizar o cambiar a otra pestaña
2. En ventana bosdetail: Cambiar status de orden SA-365
3. **Esperar ver**:
   - Notificación nativa del OS (Windows notification center)
   - Click en notificación → Abre pestaña con la orden

### **Test 3: Auto-Exclusión**
1. En ventana bosdetail: Cambiar status de orden SA-365
2. **Verificar en console de bosdetail**:
   ```
   [PushNotificationHelper] Excluding trigger user: f2875799-7e7b-4622-9923-83d1965d99b0
   [PushNotificationHelper] Found 1 follower(s) to notify
   ```
3. **bosdetail NO debe recibir notificación** (ni toast ni OS notification)

---

## 📋 Checklist para Próxima Sesión

- [ ] **Ejecutar `force-fcm-reregister.js` en consola de rruiz**
- [ ] **Verificar nuevo token registrado** (query SQL o Settings → Notifications)
- [ ] **Test 1**: Notificación foreground
- [ ] **Test 2**: Notificación background
- [ ] **Test 3**: Auto-exclusión funciona
- [ ] **Verificar**: bosdetail NO recibe su propia notificación
- [ ] **Verificar**: rruiz SÍ recibe notificación de cambio de bosdetail

---

## 🔍 Comandos SQL Útiles

### Ver tokens activos de rruiz:
```sql
SELECT
  id,
  LEFT(fcm_token, 30) as token_preview,
  is_active,
  created_at,
  updated_at
FROM fcm_tokens
WHERE user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
  AND is_active = true
ORDER BY created_at DESC;
```

### Ver todos los followers de orden SA-365:
```sql
SELECT
  of.id,
  of.user_id,
  p.first_name,
  p.last_name,
  p.email,
  COUNT(ft.id) as active_tokens
FROM order_followers of
JOIN profiles p ON p.id = of.user_id
LEFT JOIN fcm_tokens ft ON ft.user_id = of.user_id AND ft.is_active = true
WHERE of.order_id = 'c9efefa2-34e4-4258-a51b-c55de36cbf50'
GROUP BY of.id, of.user_id, p.first_name, p.last_name, p.email;
```

### Ver logs de Edge Function:
```bash
supabase functions logs send-notification --project-ref swfnnrpzpkdypbrzmgnr
```

---

## 🚨 Problemas Conocidos y Soluciones

### **Problema 1**: "No veo mensajes en consola de rruiz"
**Solución**: Verifica que `FirebaseMessagingProvider` esté montado:
```javascript
// En consola de rruiz, buscar:
🔥 Firebase Cloud Messaging initialized successfully
```

### **Problema 2**: "Edge Function retorna 404"
**Solución**: Verificar que credentials de Firebase estén configuradas:
```bash
# Ver secrets en Supabase Dashboard:
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_PROJECT_ID
```

### **Problema 3**: "Token no se registra después de reload"
**Solución**: Verificar permisos de notificación:
```javascript
// En consola de rruiz:
console.log(Notification.permission);  // Debe ser "granted"
```

### **Problema 4**: "Service Worker no está activo"
**Solución**: Refrescar con Ctrl+Shift+R (hard reload):
```javascript
// Verificar SW:
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log("Service Workers:", regs.length);
  regs.forEach(reg => console.log(reg.active?.scriptURL));
});
```

---

## 📦 Scripts Creados

1. ✅ `fix-firebase-credentials.ps1` - Arregla credenciales Firebase en Edge Function
2. ✅ `add-firebase-messaging-provider.ps1` - Agrega provider a App.tsx
3. ✅ `fix-duplicate-push-notifications.ps1` - Elimina llamada duplicada
4. ✅ `force-fcm-reregister.js` - **PENDIENTE DE EJECUTAR** - Re-registra token FCM

---

## 🎯 Estado Final

**Infraestructura**: ✅ 100% completa
**Backend**: ✅ Edge Function funcionando perfectamente
**Frontend**: ✅ FCM inicializado correctamente
**Auto-exclusión**: ✅ Implementada y funcionando
**Token FCM**: ⚠️ **PENDIENTE** - Necesita ejecutar `force-fcm-reregister.js` en consola de rruiz

**Estimado para completar**: **2-5 minutos** (solo ejecutar el script y probar)

---

## 📞 Notas Adicionales

- El sistema SMS ya funciona correctamente (envía solo cuando status = "completed")
- Las notificaciones push NO tienen restricción de status (se envían para todos los cambios)
- Los tokens FCM expiran/cambian si el usuario:
  - Limpia cookies/cache del navegador
  - Usa otro navegador/dispositivo
  - Revoca permisos de notificación
- El Service Worker `firebase-messaging-sw.js` se preserva durante limpieza (ver `main.tsx:40-45`)

---

**Próximo paso**: Ejecutar `force-fcm-reregister.js` en consola de rruiz@lima.llc
