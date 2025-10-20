# 🔔 Firebase Cloud Messaging Implementation Plan

**Fecha:** 2025-10-18
**Status:** In Progress - Conservative Approach
**Backup Location:** `backups/push-notifications-20251018-152941/`

---

## 📊 Estado Actual

### Sistema Web-Push Existente (v66)

**Archivos:**
- Hook: `src/hooks/usePushNotifications.tsx` (10.5 KB)
- Service Worker: `public/sw.js` (5.8 KB)
- Edge Function: `supabase/functions/push-notification-sender/index.ts` (8.8 KB)

**Status:**
- ✅ Edge Function desplegada y ejecutándose
- ✅ VAPID keys configuradas en Supabase Secrets
- ✅ Query encuentra subscriptions correctamente
- ✅ Envío a WNS retorna 201 (accepted)
- ❌ Service Worker NO recibe evento push
- ❌ Notificaciones NO aparecen en navegador

**Problema Identificado:**
- Librería `npm:web-push@3.6.7` NO funciona correctamente en Deno
- Envía a WNS pero en formato incorrecto
- WNS acepta pero NO triggerea el Service Worker

**Browsers Probados:**
- ❌ Microsoft Edge (WNS) - Falla
- ❌ Google Chrome (FCM nativo) - Falla

**Conclusión:** El problema es la librería web-push en Deno, NO los push services.

---

## 🎯 Implementación FCM - Enfoque Conservador

### Estrategia: Sistema Dual

**Mantener:**
- Sistema web-push actual (v66) - como fallback
- Todos los archivos existentes - sin modificaciones destructivas

**Agregar:**
- Nuevo sistema FCM - en paralelo
- Nuevos archivos - sin sobrescribir existentes
- Toggle en UI - para elegir sistema

### Archivos Nuevos a Crear

```
src/
├── hooks/
│   └── useFCMNotifications.tsx (NUEVO - no toca usePushNotifications.tsx)
├── config/
│   └── firebase.ts (NUEVO - config de Firebase)
public/
└── firebase-messaging-sw.js (NUEVO - SW específico para FCM)
supabase/
└── functions/
    └── push-notification-fcm/ (NUEVO - función paralela)
        ├── index.ts
        └── deno.json
```

**CERO modificaciones a archivos existentes** en esta fase inicial.

---

## 🔑 Credenciales Firebase Necesarias

### Del Firebase Console necesitas:

1. **Firebase Config Object** (para frontend):
```javascript
{
  apiKey: "AIza...",
  authDomain: "mydetailarea-xxxx.firebaseapp.com",
  projectId: "mydetailarea-xxxx",
  storageBucket: "mydetailarea-xxxx.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:xxxxx"
}
```

2. **Server Key** (para Edge Function):
```
AAAA...:xxxxxxxxxxxxx
```

3. **Sender ID** (número):
```
1234567890
```

---

## 📝 Pasos para Obtener Credenciales

### 1. Crear Proyecto Firebase

1. Ir a: https://console.firebase.google.com
2. Click "Add project" o "Crear proyecto"
3. Nombre: **"MyDetailArea"** o **"mydetailarea"**
4. Desactivar Google Analytics (opcional para este caso)
5. Click "Create project"

### 2. Activar Cloud Messaging

1. En el proyecto, ir a **Build** → **Cloud Messaging**
2. Click "Get Started"
3. Seguir wizard (todo default está bien)

### 3. Obtener Web Credentials

**A. Firebase Config (para frontend):**
1. Project Settings (⚙️ arriba izquierda)
2. Scroll down → "Your apps"
3. Click el ícono **Web** (`</>`)
4. App nickname: "MyDetailArea Web"
5. **NO** marcar "Firebase Hosting"
6. Click "Register app"
7. **COPIAR** el objeto `firebaseConfig`

**B. Server Key (para Edge Function):**
1. Project Settings → Cloud Messaging tab
2. Scroll → "Cloud Messaging API (Legacy)"
3. **COPIAR** el "Server key" (empieza con AAAA)

**C. Sender ID:**
1. Mismo lugar que Server Key
2. **COPIAR** el "Sender ID" (número largo)

---

## ⚠️ IMPORTANTE - Antes de Continuar

Una vez que tengas las 3 credenciales:
1. **NO las pegues directamente aquí** (son secretas)
2. **Avísame que las tienes**
3. Yo crearé los archivos con placeholders
4. Tú las pegarás en `.env.local` y Supabase Secrets

---

## 🔄 Rollback Plan

Si algo sale mal en CUALQUIER momento:

```bash
cd C:\Users\rudyr\apps\mydetailarea

# Restaurar archivos originales
cp backups/push-notifications-20251018-152941/usePushNotifications.tsx src/hooks/
cp backups/push-notifications-20251018-152941/sw.js public/
cp backups/push-notifications-20251018-152941/edge-function-index.ts supabase/functions/push-notification-sender/index.ts

# Eliminar archivos nuevos de FCM
rm -rf src/hooks/useFCMNotifications.tsx
rm -rf src/config/firebase.ts
rm -rf public/firebase-messaging-sw.js
rm -rf supabase/functions/push-notification-fcm/

# Refresh navegador
```

**Tiempo de rollback:** < 1 minuto

---

## 🚀 Próximo Paso

**Por favor, crea el proyecto Firebase y obtén las credenciales siguiendo los pasos de arriba.**

Cuando las tengas, **dime "tengo las credenciales"** (sin pegarlas aquí) y continuamos con la implementación.

¿Alguna duda antes de crear el proyecto Firebase?
