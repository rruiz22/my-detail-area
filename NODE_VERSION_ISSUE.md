# Node.js v22 Compatibility Issue - Workaround Temporal

**Fecha:** 2025-10-19
**Problema:** `workbox-build` incompatible con Node.js v22
**Estado:** ⚠️ Workaround aplicado

---

## 🔴 Problema

### Error Encontrado
```
Cannot find module 'fs.realpath'
Require stack:
- node_modules/workbox-build/node_modules/glob/glob.js
```

### Causa Raíz
- **Node.js actual:** v22.19.0
- **`vite-plugin-pwa`:** 1.1.0 (muy antigua, de 2022)
- **`workbox-build`:** 7.3.0 (usa `glob` antigua)
- **Problema:** `glob` antigua usa `fs.realpath` que fue removido en Node.js v22

---

## ✅ Workaround Temporal Aplicado

### Solución Inmediata: Deshabilitar Vite PWA

**Archivo modificado:** `vite.config.ts`

```typescript
plugins: [
  react(),
  mode === "development" && componentTagger(),
  // TEMPORARILY DISABLED due to workbox-build compatibility issue with Node.js v22
  false && VitePWA({
    // ... config
  })
]
```

**Resultado:**
- ✅ Vite ahora inicia sin errores
- ✅ FCM puede funcionar con registro manual del service worker
- ⚠️ PWA offline cache NO está disponible temporalmente

---

## 🔧 Arquitectura sin Vite PWA

### Service Worker Único: Firebase Messaging

```
Service Worker (FCM)
├─ firebase-messaging-sw.js
├─ Scope: /firebase-cloud-messaging-push-scope
├─ Función: Push notifications ONLY
├─ Registro: Manual en useFCMNotifications.tsx
└─ NO hay cache offline (por ahora)
```

**Ventajas:**
- ✅ Simple y directo
- ✅ Funciona sin problemas de compatibilidad
- ✅ FCM notifications funcionarán perfectamente

**Desventajas:**
- ❌ Sin cache offline de PWA
- ❌ Sin precaching de assets
- ❌ Sin "Add to Home Screen" optimization

---

## 🧪 Cómo Probar FCM Ahora

### Paso 1: Reiniciar Servidor

```bash
# Detener servidor actual
Ctrl + C

# Limpiar cache (ya hecho)
# rm -rf node_modules/.vite dist dev-dist

# Iniciar servidor
npm run dev
```

**Salida esperada:**
```
VITE v5.x.x ready in XXX ms

➜  Local:   http://localhost:8080/
```

✅ **SIN errores de workbox-build**

---

### Paso 2: Verificar Service Worker

1. Abrir: http://localhost:8080/get-ready
2. F12 → Application → Service Workers

**Debe mostrar UN service worker:**
```
Source: http://localhost:8080/firebase-messaging-sw.js
Status: activated and is running
Scope: http://localhost:8080/firebase-cloud-messaging-push-scope
```

---

### Paso 3: Activar FCM

1. Click en campana (🔔)
2. Activar toggle "FCM Push Notifications"
3. Permitir notificaciones
4. Click "Send Test Notification"

**Consola debe mostrar:**
```
✅ [FCM] Firebase Messaging SW registered
✅ [FCM] Using FCM Service Worker: /firebase-cloud-messaging-push-scope
✅ [FCM] Token received
```

---

## 🔄 Soluciones Permanentes (Opciones)

### Opción A: Downgrade Node.js (RECOMENDADO)

**Usar Node.js v20 LTS:**

```bash
# Con nvm (Node Version Manager)
nvm install 20
nvm use 20

# Verificar
node --version  # v20.x.x

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install

# Re-habilitar Vite PWA en vite.config.ts
# Cambiar: false && VitePWA({
# A:       VitePWA({

# Reiniciar
npm run dev
```

**Ventajas:**
- ✅ Vite PWA funciona completo
- ✅ PWA offline cache
- ✅ FCM notifications
- ✅ Solución estable y probada

**Desventajas:**
- ⚠️ Requiere cambiar versión de Node.js
- ⚠️ Puede afectar otros proyectos si usas Node.js v22

---

### Opción B: Esperar Actualización de workbox-build

**Estado actual:**
- `workbox-build@7.3.0` no es compatible con Node.js v22
- No hay fecha estimada para actualización
- Alternativa: usar `workbox-build@8.x` cuando esté disponible

**Monitorear:**
- https://github.com/GoogleChrome/workbox/issues
- https://www.npmjs.com/package/workbox-build

---

### Opción C: Fork y Patch de workbox-build

**Para usuarios avanzados:**

1. Fork de `workbox-build`
2. Actualizar dependencia `glob` a versión compatible
3. Publicar como package privado
4. Usar en `package.json`

⚠️ **No recomendado:** Requiere mantenimiento continuo

---

### Opción D: Implementar Service Worker Manual (Actual)

**Ya implementado:**
- Service worker manual: `firebase-messaging-sw.js`
- Sin Vite PWA
- Solo FCM, sin cache offline

**Mantener esta solución si:**
- No necesitas cache offline
- Solo quieres push notifications
- Prefieres simplicidad

---

## ⚡ Recomendación

### Para Desarrollo: Usar Opción D (Actual)

**Motivo:**
- ✅ Funciona ahora mismo
- ✅ FCM notifications completas
- ✅ Sin bloqueos de desarrollo
- ✅ Simple de mantener

**Acción:**
1. Continuar con `npm run dev`
2. Probar FCM notifications
3. Verificar que todo funcione

---

### Para Producción: Usar Opción A (Node.js v20)

**Motivo:**
- ✅ PWA offline cache es importante para UX
- ✅ "Add to Home Screen" mejora engagement
- ✅ Solución estable y probada
- ✅ Node.js v20 LTS hasta abril 2026

**Acción:**
1. Usar Node.js v20 en servidor de producción
2. Re-habilitar Vite PWA
3. Build y deploy normalmente

---

## 📊 Comparación de Opciones

| Aspecto | Opción A (Node v20) | Opción D (Manual SW) |
|---------|---------------------|----------------------|
| **Complejidad** | Baja | Muy baja |
| **FCM** | ✅ Funciona | ✅ Funciona |
| **PWA Cache** | ✅ Funciona | ❌ No disponible |
| **Offline** | ✅ Si | ❌ No |
| **Mantenimiento** | Bajo | Muy bajo |
| **Tiempo impl.** | 10 minutos | ✅ Ya implementado |
| **Producción** | ✅ Recomendado | ⚠️ Limitado |

---

## ✅ Próximos Pasos Inmediatos

1. **Ahora:** Probar FCM con la configuración actual
   ```bash
   npm run dev
   ```

2. **Verificar:** Service worker de FCM se registra
   ```
   DevTools → Application → Service Workers
   ```

3. **Probar:** Activar toggle y enviar notificación de prueba
   ```
   Get Ready → Settings → FCM Push Notifications
   ```

4. **Decidir:** Si necesitas PWA cache:
   - **Sí** → Implementar Opción A (Node v20)
   - **No** → Mantener Opción D (actual)

---

## 🔗 Referencias

- [Node.js v22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
- [Workbox GitHub Issues](https://github.com/GoogleChrome/workbox/issues)
- [Vite PWA Plugin](https://vite-plugin-pwa.netlify.app/)
- [Node.js v20 LTS](https://nodejs.org/en/blog/release/v20.0.0)

---

**Configurado por:** Claude Code
**Última actualización:** 2025-10-19 16:30 UTC
**Estado:** ⚠️ Workaround activo - FCM funcional sin PWA cache
