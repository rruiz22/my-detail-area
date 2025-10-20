# Firebase Cloud Messaging API v1 - Guía de Configuración

**Fecha:** 2025-10-18
**Estado:** ✅ Edge Function migrado a FCM API v1
**Versión:** HTTP v1 (OAuth2 con Service Account)

---

## 🎯 Resumen de Cambios

El Edge Function `push-notification-fcm` ha sido migrado de la **API Legacy (deprecated)** a la **API v1** de Firebase Cloud Messaging.

### Antes (API Legacy - Deprecated)
```typescript
// ❌ Ya no funciona
Endpoint: https://fcm.googleapis.com/fcm/send
Autenticación: Server Key (AAAA...)
Estado: Disabled por Firebase
```

### Ahora (API v1 - Actual)
```typescript
// ✅ Funcionando
Endpoint: https://fcm.googleapis.com/v1/projects/my-detail-area/messages:send
Autenticación: OAuth2 con Service Account
Estado: Enabled y recomendado
```

---

## 📋 Pasos de Configuración

### 1. Descargar Service Account de Firebase

1. Ir a **Firebase Console**: https://console.firebase.google.com
2. Seleccionar proyecto: **My Detail Area**
3. Click en ⚙️ **Project Settings**
4. Pestaña: **Service Accounts**
5. Click en: **Generate new private key**
6. Descargar archivo JSON (ejemplo: `my-detail-area-firebase-adminsdk-xxxxx.json`)

**El archivo descargado contiene:**
```json
{
  "type": "service_account",
  "project_id": "my-detail-area",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@my-detail-area.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

### 2. Configurar Secrets en Supabase

**Opción A: Via Supabase CLI**

```bash
# IMPORTANTE: Copia los valores EXACTOS del archivo JSON descargado

# 1. Project ID
supabase secrets set FIREBASE_PROJECT_ID=my-detail-area

# 2. Client Email (firebase-adminsdk-...)
supabase secrets set FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@my-detail-area.iam.gserviceaccount.com"

# 3. Private Key (TODO el bloque, con \n literales)
# IMPORTANTE: Debe incluir BEGIN y END, y usar \n como literales
supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAo...\n-----END PRIVATE KEY-----\n"
```

**Opción B: Via Supabase Dashboard**

1. Ir a: https://supabase.com/dashboard
2. Seleccionar proyecto
3. **Project Settings** → **Edge Functions** → **Secrets**
4. Agregar los 3 secrets:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`

⚠️ **IMPORTANTE para Private Key:**
- Copiar TODO el bloque desde `-----BEGIN` hasta `-----END`
- Los saltos de línea deben estar como `\n` (literales)
- NO agregar espacios extras
- NO formatear o pretty-print el JSON

### 3. Redesplegar Edge Function

```bash
# Cambiar al directorio del proyecto
cd C:\Users\rudyr\apps\mydetailarea

# Redesplegar Edge Function con nuevas credenciales
supabase functions deploy push-notification-fcm
```

**Output esperado:**
```
Deploying push-notification-fcm (project ref: ...)
Bundled push-notification-fcm (149.5 KB) in 1.2s
push-notification-fcm deployed successfully ✓
```

### 4. Verificar Configuración

**Consultar logs para confirmar:**

```sql
SELECT
  created_at,
  level,
  message,
  data
FROM edge_function_logs
WHERE function_name = 'push-notification-fcm'
ORDER BY created_at DESC
LIMIT 5;
```

**Logs esperados después de enviar test:**
```
[FCM] JWT created, requesting access token
[FCM] Access token obtained
[FCM v1] Sending notification to token: fAkUAM8SGAMWX6rQPcK...
[FCM v1] Response status: 200
[FCM v1] Success, message name: projects/my-detail-area/messages/...
```

---

## 🧪 Probar Notificaciones

### Desde Get Ready

1. Abrir: http://localhost:8080/get-ready
2. Click en **Settings** (icono de campana)
3. Sección: **Firebase Cloud Messaging (FCM)**
4. Activar toggle: **FCM Push Notifications**
5. Click: **Send Test Notification**

**Resultado esperado:**
- ✅ Toast: "Test Notification Sent - Successfully sent to 1 device(s)"
- ✅ Notificación aparece en el navegador
- ✅ Logs en consola: `[FCM v1] Response status: 200`

---

## 🔍 Troubleshooting

### Error: "Firebase Service Account credentials not configured"

**Causa:** Los secrets no están configurados o tienen nombres incorrectos.

**Solución:**
```bash
# Verificar que existan los 3 secrets
supabase secrets list

# Debe mostrar:
# FIREBASE_PROJECT_ID
# FIREBASE_CLIENT_EMAIL
# FIREBASE_PRIVATE_KEY
```

### Error: "Failed to get access token: 400"

**Causa:** El `FIREBASE_PRIVATE_KEY` está mal formateado.

**Solución:**
1. Volver a copiar el `private_key` del JSON descargado
2. Verificar que incluya `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`
3. Verificar que los `\n` sean literales (no saltos de línea reales)

```bash
# El secret debe verse así (una sola línea con \n literales):
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBA...\n-----END PRIVATE KEY-----\n"
```

### Error: "PERMISSION_DENIED" o "UNAUTHENTICATED"

**Causa:** El Service Account no tiene permisos de Cloud Messaging.

**Solución:**
1. Firebase Console → IAM & Admin
2. Verificar que el Service Account tenga rol: **Firebase Cloud Messaging API Admin**
3. O rol general: **Firebase Admin**

### Notificación no aparece

**Verificar:**
1. Permisos del navegador (debe estar "granted")
2. Service Worker activo en DevTools → Application → Service Workers
3. Token FCM válido en base de datos (`fcm_tokens` con `is_active: true`)
4. Logs de Edge Function (`edge_function_logs`)

---

## 📊 Diferencias API Legacy vs v1

| Feature | API Legacy | API v1 |
|---------|-----------|--------|
| **Endpoint** | `/fcm/send` | `/v1/projects/{project}/messages:send` |
| **Autenticación** | Server Key | OAuth2 (Service Account) |
| **Seguridad** | ⚠️ API key estática | ✅ Access tokens con expiración |
| **Formato** | Flat JSON | Nested `message` object |
| **Estado** | ❌ Deprecated | ✅ Recomendado |
| **Error handling** | Básico | Detallado con códigos específicos |

---

## 🔐 Seguridad

### ✅ Buenas Prácticas

1. **NUNCA** commits del archivo JSON del Service Account
2. **SOLO** configurar en Supabase Secrets (backend)
3. **Rotar** credenciales periódicamente
4. **Limitar** permisos del Service Account al mínimo necesario

### 🗑️ Limpiar Credenciales Antiguas

Si ya no usas la API Legacy:

```bash
# Remover secret antiguo (opcional)
supabase secrets unset FCM_SERVER_KEY
```

---

## 📚 Referencias

- [Firebase Cloud Messaging HTTP v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)
- [Service Account Authentication](https://cloud.google.com/iam/docs/service-accounts)
- [Google OAuth2 Token Endpoint](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Supabase Edge Functions Secrets](https://supabase.com/docs/guides/functions/secrets)

---

## ✅ Checklist de Configuración

- [ ] Descargar Service Account JSON de Firebase
- [ ] Configurar `FIREBASE_PROJECT_ID` en Supabase
- [ ] Configurar `FIREBASE_CLIENT_EMAIL` en Supabase
- [ ] Configurar `FIREBASE_PRIVATE_KEY` en Supabase
- [ ] Redesplegar Edge Function
- [ ] Probar notificación de prueba
- [ ] Verificar logs de Edge Function
- [ ] Confirmar que notificación aparece en navegador
- [ ] (Opcional) Remover `FCM_SERVER_KEY` antiguo

---

**Configurado por:** Claude Code
**Última actualización:** 2025-10-18
**Versión Edge Function:** FCM API v1 (OAuth2)
