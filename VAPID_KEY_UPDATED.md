# VAPID Key Actualizada - Instrucciones Finales

**Fecha:** 2025-10-19
**Estado:** ✅ VAPID key corregida

---

## ✅ Cambios Aplicados

### VAPID Key Correcta (de Firebase Console)
```
BKxpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8ZI6rOVVUgtVtn6LCpRj07anNaUSLnqO0PkpkXUPm6Q
```

### Archivos Actualizados

1. ✅ `.env.local` (línea 5)
2. ✅ `public/firebase-messaging-sw.js` (línea 22)

**Ambos archivos ahora tienen la MISMA clave correcta.**

---

## 🔄 Próximos Pasos CRÍTICOS

### Paso 1: Reiniciar Servidor

**En la terminal donde corre `npm run dev`:**

```bash
# Presionar Ctrl + C para detener el servidor

# Luego iniciar de nuevo
npm run dev
```

**Importante:** Esto es necesario para que Vite cargue la nueva variable de entorno `VITE_FCM_VAPID_KEY`

---

### Paso 2: Limpiar Service Worker en el Navegador

**CRÍTICO:** Debes eliminar el service worker antiguo que tiene la clave incorrecta.

#### Chrome/Edge:

1. Abrir DevTools: `F12`
2. Tab: **Application**
3. Sidebar: **Service Workers**
4. Buscar: `firebase-messaging-sw.js`
5. Click: **Unregister**
6. Sidebar: **Storage**
7. Click: **Clear site data**
8. **Cerrar y volver a abrir el navegador** (importante)

#### Firefox:

1. DevTools: `F12`
2. Tab: **Storage**
3. Sidebar: **Service Workers**
4. Click: **Unregister** en todos los SW
5. **Cache Storage** → Delete All
6. **Cerrar y volver a abrir el navegador**

---

### Paso 3: Refrescar y Verificar

1. Abrir: http://localhost:8080/get-ready
2. Abrir consola: `F12` → Console

**Verificar que el service worker se registre:**
```
✅ [FCM SW] Firebase Messaging Service Worker loaded
✅ [FCM SW] Firebase app initialized
✅ [FCM] Firebase Messaging SW registered: /firebase-cloud-messaging-push-scope
```

---

### Paso 4: Activar FCM Notifications

1. Click en **campana (🔔)** en topbar
2. Panel "Notification Settings" se abre
3. Sección: **Firebase Cloud Messaging (FCM)**
4. **Activar el toggle**

**Navegador pedirá permisos:**
```
"localhost:8080 wants to show notifications"
[Block] [Allow]
```

5. Click: **Allow**

---

### Paso 5: Verificar Token Generado

**En consola del navegador:**

```javascript
✅ [FCM] Using FCM Service Worker: /firebase-cloud-messaging-push-scope
✅ [FCM] Requesting FCM token with VAPID key...
✅ [FCM] Token received: fAkUAM8... (truncated)
✅ [FCM] Token saved to database
```

**Toast notification:**
```
🎉 FCM Notifications Enabled
   You will now receive Firebase Cloud Messaging notifications
```

---

### Paso 6: Enviar Notificación de Prueba

1. En Notification Settings
2. Click: **Send Test Notification**

**Consola:**
```
[FCM Test] Sending test notification via Edge Function
[FCM Test] Response: { success: true, sentCount: 1 }
```

**Toast:**
```
✅ Test Notification Sent
   Successfully sent to 1 device(s)
```

**Notificación del navegador:**
```
┌─────────────────────────────────┐
│ 🔔 FCM Test Notification        │
│ This is a test notification     │
│ from Firebase Cloud Messaging   │
└─────────────────────────────────┘
```

---

## ❌ Si el Error 401 Persiste

### Verificar que la clave cargó correctamente

**En consola del navegador:**
```javascript
console.log('VAPID Key:', import.meta.env.VITE_FCM_VAPID_KEY);
```

**Debe mostrar:**
```
BKxpBg3iYCdISvgW2JnSR1ZSfXixxkESOkZR0yjR0yFT8ZI6rOVVUgtVtn6LCpRj07anNaUSLnqO0PkpkXUPm6Q
```

**Si muestra la clave ANTIGUA:**
- ❌ Servidor no se reinició correctamente
- Solución: `Ctrl+C` y `npm run dev` de nuevo

---

### Verificar service worker usa la clave correcta

**En consola del navegador:**
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('SW:', reg.scope);
    if (reg.scope.includes('firebase-cloud-messaging')) {
      console.log('✅ FCM Service Worker encontrado');
    }
  });
});
```

**Si no aparece:**
- Refrescar página: `Ctrl+Shift+R` (hard reload)
- Verificar en DevTools → Application → Service Workers

---

## ✅ Checklist Final

- [ ] Servidor reiniciado (`Ctrl+C` y `npm run dev`)
- [ ] Service worker antiguo unregistered en DevTools
- [ ] Cache limpiado (Clear site data)
- [ ] Navegador cerrado y reabierto
- [ ] Página refrescada (F5)
- [ ] Service worker de FCM registrado correctamente
- [ ] Toggle de FCM activado sin errores
- [ ] Permisos de notificación concedidos
- [ ] Token FCM generado exitosamente
- [ ] Notificación de prueba enviada y recibida

---

## 🎯 Resultado Esperado

**Sin errores 401 Unauthorized** ✅

**En su lugar, deberías ver:**
```
✅ POST https://fcmregistrations.googleapis.com/v1/projects/my-detail-area/registrations 200 (OK)
✅ [FCM] Token received: ...
```

---

**Siguiente acción:** Reinicia el servidor ahora con `Ctrl+C` y `npm run dev`
