# 🔌 MCP Configuration Guide - MyDetailArea

**Fecha**: 2025-10-27
**MCPs Configurados**: Supabase + Firebase
**Estado**: ✅ Configurado y Listo

---

## 📋 MCPs INSTALADOS

### 1. **Supabase MCP** ✅
- **Server**: `@supabase/mcp-server-supabase`
- **Project**: `swfnnrpzpkdypbrzmgnr`
- **URL**: `https://swfnnrpzpkdypbrzmgnr.supabase.co`
- **Capabilities**: SQL queries, migrations, logs, tables, docs

### 2. **Firebase MCP** ✅
- **Server**: `firebase-tools@latest mcp`
- **Project**: `my-detail-area`
- **Directory**: `C:\Users\rudyr\apps\mydetailarea`
- **Capabilities**: FCM, Auth, Firestore, Storage, Analytics

---

## 🔧 ARCHIVOS DE CONFIGURACIÓN

### `.claude/mcp.json` (Project-specific)
```json
{
  "mcpServers": {
    "supabase": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["-y", "@supabase/mcp-server-supabase", "PROJECT_ID", "SERVICE_KEY"]
    },
    "firebase": {
      "command": "C:\\Program Files\\nodejs\\npx.cmd",
      "args": ["-y", "firebase-tools@latest", "mcp", "--dir", "PROJECT_PATH"]
    }
  }
}
```

### `.firebaserc` (Firebase project config)
```json
{
  "projects": {
    "default": "my-detail-area"
  }
}
```

### `firebase.json` (Firebase features)
```json
{
  "hosting": {
    "public": "dist",
    "rewrites": [{"source": "**", "destination": "/index.html"}]
  }
}
```

---

## 🚀 CÓMO USAR

### **IMPORTANTE**: Reiniciar Claude Code

Para que los MCPs se activen, **DEBES reiniciar Claude Code**:

1. Cierra Claude Code completamente
2. Vuelve a abrir Claude Code
3. Abre el proyecto MyDetailArea

### Una vez reiniciado, podrás:

## 📊 SUPABASE MCP - Ejemplos de Uso

### Queries SQL Directos:
```
"Muéstrame todas las tablas en el schema public"
"Ejecuta SELECT * FROM dealer_custom_roles WHERE dealer_id = 5"
"Verifica cuántas entradas hay en role_module_access para el rol 'detail'"
"Muéstrame los permisos del rol 'detail'"
```

### Migraciones:
```
"Crea una migración para agregar un índice en la tabla orders"
"Aplica la migración 20251027_add_dealer_id_index"
"Muéstrame todas las migraciones aplicadas"
```

### Logs y Debugging:
```
"Obtén los logs de la API de Supabase de las últimas 24 horas"
"Muéstrame los logs de autenticación"
"Verifica los logs de Edge Functions"
```

### Tablas y Estructura:
```
"Lista todas las tablas y sus relaciones"
"Describe la estructura de la tabla 'orders'"
"Muéstrame las columnas de 'dealer_custom_roles'"
```

---

## 🔥 FIREBASE MCP - Ejemplos de Uso

### Firebase Cloud Messaging (FCM):
```
"Muéstrame la configuración de FCM para mi proyecto"
"Lista los tokens de dispositivos registrados"
"Envía una notificación de prueba a un token específico"
"Verifica el estado de las push notifications"
```

### Firebase Authentication:
```
"Lista todos los usuarios en Firebase Auth"
"Muéstrame el usuario con email rudyruizlima@gmail.com"
"Agrega custom claims al usuario X"
"Verifica los métodos de autenticación habilitados"
```

### Firestore (si aplica):
```
"Lista las colecciones en Firestore"
"Muéstrame documentos en la colección X"
```

### Firebase Analytics:
```
"Muéstrame eventos de analytics recientes"
"Verifica la configuración de Google Analytics"
```

---

## 🎯 CASOS DE USO PRÁCTICOS

### Debugging de Push Notifications

**Problema típico**: Notificaciones no llegan

**Con MCP de Firebase**:
```
"Verifica si el VAPID key configurado coincide con Firebase Console"
"Lista los tokens FCM activos del último mes"
"Muéstrame errores recientes de FCM en logs"
"Envía una notificación de prueba al token ABC123..."
```

### Debugging de Permisos

**Problema típico**: Usuario no tiene permisos correctos

**Con MCP de Supabase**:
```
"Ejecuta query para mostrar todos los roles del usuario X"
"Verifica qué entradas tiene role_module_access para el rol Y"
"Muéstrame los permisos del módulo 'car_wash'"
"Inserta entrada en role_module_access para habilitar módulo Z"
```

### Performance Monitoring

**Con MCP de Supabase**:
```
"Muéstrame las queries más lentas de la última hora"
"Verifica el uso de índices en la tabla orders"
"Obtén logs de API con errores 500"
```

**Con MCP de Firebase**:
```
"Muéstrame estadísticas de FCM del último día"
"Verifica latencia de entrega de notificaciones"
```

---

## 🔐 HERRAMIENTAS DISPONIBLES

### Supabase MCP Tools:
- `list_tables` - Listar tablas del schema
- `execute_sql` - Ejecutar queries SQL
- `apply_migration` - Aplicar migraciones DDL
- `get_logs` - Obtener logs por servicio (api, auth, storage, etc.)
- `list_migrations` - Ver migraciones aplicadas
- `list_extensions` - Ver extensiones instaladas
- `search_docs` - Buscar en documentación Supabase
- `generate_typescript_types` - Generar types de DB

### Firebase MCP Tools:
- **Auth**: `auth:listUsers`, `auth:getUser`, `auth:setCustomClaims`
- **FCM**: `messaging:send`, `messaging:sendMulticast`
- **Firestore**: `firestore:get`, `firestore:list`, `firestore:set`
- **Storage**: `storage:listFiles`, `storage:upload`
- **Analytics**: `analytics:getEvents`
- **Config**: `app:list`, `project:info`

---

## 🛠️ CONFIGURACIÓN AVANZADA

### Limitar Features de Firebase (opcional):

Si solo necesitas FCM y Auth:

```json
"firebase": {
  "command": "C:\\Program Files\\nodejs\\npx.cmd",
  "args": [
    "-y",
    "firebase-tools@latest",
    "mcp",
    "--dir",
    "C:\\Users\\rudyr\\apps\\mydetailarea",
    "--only",
    "auth,messaging"
  ]
}
```

### Habilitar/Deshabilitar MCPs:

```json
"supabase": {
  ...
  "disabled": true  // Desactiva temporalmente
}
```

---

## 📝 TROUBLESHOOTING

### MCP no aparece después de reiniciar:

1. Verifica que el archivo existe: `.claude/mcp.json`
2. Verifica sintaxis JSON válida
3. Cierra COMPLETAMENTE Claude Code (no solo la ventana)
4. Vuelve a abrir Claude Code

### Error "command not found":

- En Windows usa `C:\\Program Files\\nodejs\\npx.cmd`
- NO uses `npx` solo (no funciona en Windows)

### Firebase MCP falla al iniciar:

1. Verifica que `.firebaserc` existe
2. Verifica que `firebase.json` existe
3. Ejecuta `npx firebase-tools@latest login` para autenticarte

### Supabase MCP falla:

1. Verifica el SERVICE_ROLE_KEY en `.env`
2. Verifica el project_id en `supabase/config.toml`

---

## 🎯 PRÓXIMOS PASOS

### 1. **Reiniciar Claude Code** (CRÍTICO)

```bash
# Cierra Claude Code completamente
# Vuelve a abrir
```

### 2. **Verificar MCPs activos**

En Claude Code, pregunta:
```
"Lista las tablas de Supabase"
"Muéstrame la configuración de Firebase"
```

Si funciona, verás respuestas con datos reales de tu proyecto.

### 3. **Usar para debugging**

**Ejemplo práctico**:
```
"Ejecuta query para verificar si el rol 'detail' tiene
entradas en role_module_access"
```

Claude ejecutará:
```sql
SELECT * FROM role_module_access
WHERE role_id = (
  SELECT id FROM dealer_custom_roles
  WHERE role_name = 'detail' AND dealer_id = 5
);
```

---

## 💡 BENEFICIOS

### Antes (sin MCP):
- ❌ No podía ejecutar queries desde Claude
- ❌ Debugging requería copiar/pegar SQL
- ❌ No podía ver logs directamente
- ❌ Firebase admin solo en consola web

### Ahora (con MCP):
- ✅ Ejecuto queries directamente desde chat
- ✅ Debugging en tiempo real
- ✅ Logs accesibles al instante
- ✅ FCM gestionable desde Claude
- ✅ Migraciones automatizadas
- ✅ Documentación integrada

---

## 🔥 CASOS DE USO - Push Notifications

### Verificar configuración FCM:

**Tu pregunta**:
```
"Verifica la configuración de Firebase Cloud Messaging"
```

**Claude ejecuta**:
```
firebase messaging:getConfig
```

### Enviar notificación de prueba:

**Tu pregunta**:
```
"Envía una notificación de prueba con título 'Test'
y body 'Hello from Claude' al token XYZ..."
```

**Claude ejecuta**:
```javascript
firebase messaging:send --token="XYZ..." --notification-title="Test" --notification-body="Hello from Claude"
```

### Listar usuarios con tokens FCM:

**Tu pregunta**:
```
"Muéstrame qué usuarios tienen tokens FCM registrados"
```

**Claude ejecuta**:
```sql
-- Vía Supabase MCP
SELECT
  p.email,
  p.fcm_token,
  p.fcm_token_updated_at
FROM profiles p
WHERE fcm_token IS NOT NULL
ORDER BY fcm_token_updated_at DESC;
```

---

## 📚 RECURSOS

### Documentación Oficial:
- [Supabase MCP Docs](https://github.com/supabase/mcp-server-supabase)
- [Firebase MCP Docs](https://firebase.google.com/docs/cli/mcp-server)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

### Comandos Útiles:
```bash
# Listar MCPs activos en Claude Code
claude mcp list

# Test Firebase CLI
npx firebase-tools@latest --version

# Test Supabase connection
npx @supabase/mcp-server-supabase
```

---

## ✅ CHECKLIST

- [x] ✅ Supabase MCP configurado en `.claude/mcp.json`
- [x] ✅ Firebase MCP configurado en `.claude/mcp.json`
- [x] ✅ `.firebaserc` creado con project_id
- [x] ✅ `firebase.json` creado con hosting config
- [ ] ⏳ Claude Code reiniciado (PENDIENTE - USUARIO)
- [ ] ⏳ MCPs verificados funcionando

---

**🔄 Recuerda: DEBES reiniciar Claude Code para que los MCPs se activen!**

Después de reiniciar, prueba:
```
"Lista las tablas de Supabase"
"Muéstrame la configuración de Firebase"
```

Si ves resultados, ¡los MCPs están funcionando! 🎉
