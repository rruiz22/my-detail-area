# 🔧 Troubleshooting: Chat Real-time Updates

## 🎯 Problema Reportado

**Síntoma:** Al enviar un mensaje, la sidebar y la lista de conversaciones no se actualizan automáticamente.

**Esperado:** Después de enviar un mensaje, debería:
- ✅ Aparecer inmediatamente en el chat
- ✅ Actualizar "No messages yet" con el mensaje nuevo
- ✅ Mover la conversación al tope de la lista
- ✅ Actualizar el badge en la sidebar

---

## ✅ Arreglos Completados en el Código

### 1. Badge en Sidebar
- ✅ Agregado contador de mensajes no leídos en el ícono "Team Chat"
- ✅ Se actualiza automáticamente cuando llegan nuevos mensajes

### 2. Import Faltante
- ✅ Arreglado error `AvatarImage is not defined` en ConversationList

### 3. Real-time Subscriptions
- ✅ Optimizadas en `useChatConversations`
- ✅ Optimizadas en `useChatMessages`
- ✅ Eliminados memory leaks y mensajes duplicados

---

## 🔍 Diagnóstico: ¿Por qué no se actualiza?

El problema MÁS PROBABLE es que **Supabase Realtime no está habilitado** en las tablas de chat.

### Paso 1: Verificar en Supabase Dashboard

1. Ve a tu proyecto en https://supabase.com/dashboard
2. Click en **Database** (en el menú izquierdo)
3. Click en **Replication**
4. Busca estas tablas:
   - `chat_conversations`
   - `chat_messages`
   - `chat_participants`

**¿Qué deberías ver?**
- ✅ **Verde**: Realtime habilitado → Todo OK
- ❌ **Gris**: Realtime deshabilitado → **ESTE ES EL PROBLEMA**

---

## 🛠️ Solución: Habilitar Realtime

### Opción 1: Desde el Dashboard (Recomendado)

1. Ve a **Database** → **Replication**
2. Busca cada tabla de chat:
   - `chat_conversations`
   - `chat_messages`
   - `chat_participants`
3. Click en el **toggle switch** para habilitar Realtime
4. Espera unos segundos hasta que aparezca en verde

**Nota:** No necesitas recargar la app, los cambios son inmediatos.

---

### Opción 2: Desde SQL Editor (Avanzado)

1. Ve a **SQL Editor** en Supabase Dashboard
2. Copia y pega el contenido de `scripts/enable-chat-realtime.sql`
3. Click en **Run**
4. Verifica que no haya errores

**Verificación:**
```sql
-- Corre esta query para verificar:
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

Deberías ver estas tablas en los resultados:
- chat_conversations
- chat_messages
- chat_participants
- profiles

---

## 🧪 Testing Después de Habilitar Realtime

### Test 1: Mensaje Básico
1. **Recarga la página** (Ctrl+R o F5)
2. Abre el chat
3. Envía un mensaje
4. **Resultado esperado:**
   - ✅ Mensaje aparece inmediatamente
   - ✅ "No messages yet" desaparece
   - ✅ Conversación salta al tope

---

### Test 2: Dos Navegadores (Real-time Bidireccional)
1. Abre el chat en **Chrome** (Usuario A)
2. Abre el chat en **Incógnito/Firefox** (Usuario B)
3. Usuario B envía mensaje a Usuario A
4. **Resultado esperado:**
   - ✅ Usuario A ve el mensaje SIN recargar
   - ✅ Badge rojo aparece en la sidebar de Usuario A
   - ✅ Contador incrementa automáticamente

---

### Test 3: Badge en Sidebar
1. Con la página ya abierta, NO recargues
2. Pide a alguien más que te envíe un mensaje
3. **Resultado esperado:**
   - ✅ Badge rojo aparece en el ícono "Team Chat"
   - ✅ Número incrementa con cada mensaje nuevo

---

## 📊 Logs de Debugging

### En la Consola del Navegador (F12)

Deberías ver estos logs cuando envías un mensaje:

```
📤 [MESSAGES] Sending message: { content: "Hello there", ... }
✅ [MESSAGES] Message inserted to DB: abc-123-xyz
⚡ [MESSAGES] Adding message optimistically to state...
✅ [MESSAGES] Message added to state optimistically
📤 [MESSAGES] Send result: success
```

Y cuando llega un mensaje de otra persona:

```
📡 [MESSAGES] Realtime: New message received from user: user-id-123
⚡ [MESSAGES] Realtime: Adding message to state
✅ [MESSAGES] Realtime message added successfully
```

**Si NO ves estos logs:**
- ❌ El código no está funcionando
- ❌ Verifica que hayas recargado la página después de los cambios

**Si ves "Subscription CLOSED" o "CHANNEL_ERROR":**
- ❌ Realtime no está habilitado en Supabase
- ❌ Sigue los pasos de "Habilitar Realtime" arriba

---

## 🔧 Soluciones Adicionales

### Problema: "Subscription status: CLOSED"

**Causa:** Supabase Realtime no está habilitado en las tablas.

**Solución:**
1. Habilita Realtime en las tablas (ver arriba)
2. Recarga la página
3. El subscription debería cambiar a "SUBSCRIBED"

---

### Problema: "Could not find a relationship between..."

**Causa:** Este error ya fue arreglado en `useChatConversations.tsx`.

**Verificación:**
- Lee `src/hooks/useChatConversations.tsx` líneas 150-250
- Debería tener dos queries separadas (participants + profiles)
- NO debería usar `profiles!inner(...)`

---

### Problema: Badge no aparece

**Causa:** El `AppSidebar` no está usando `useGlobalChat()`.

**Verificación:**
```typescript
// En src/components/AppSidebar.tsx, debe tener:
import { useGlobalChat } from "@/contexts/GlobalChatProvider";

// Y dentro del componente:
const { totalUnreadCount } = useGlobalChat();
```

---

### Problema: Conversación no sube al tope

**Causa:** El trigger `update_conversation_last_message` no está ejecutándose.

**Verificación en Supabase SQL Editor:**
```sql
-- Verifica que el trigger existe:
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'update_conversation_last_message_trigger';

-- Verifica que la función existe:
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'update_conversation_last_message';
```

**Si no existen:**
- Las migraciones no se aplicaron correctamente
- Ejecuta las migraciones de chat manualmente

---

## 📞 ¿Aún no Funciona?

### Checklist Final:

- [ ] Realtime habilitado en `chat_conversations`
- [ ] Realtime habilitado en `chat_messages`
- [ ] Realtime habilitado en `chat_participants`
- [ ] Página recargada después de cambios en el código
- [ ] Navegador actualizado (Chrome/Edge/Firefox latest)
- [ ] No hay errores en la consola (F12)
- [ ] WebSocket connection activa (Network tab → WS)

### Información para Debugging:

Si nada funciona, comparte esta información:

1. **Screenshot del Replication panel** en Supabase Dashboard
2. **Console logs** al enviar un mensaje (F12 → Console)
3. **Network tab** mostrando WebSocket connections (F12 → Network → WS)
4. **Versión de Node/npm:** `node -v && npm -v`
5. **Navegador y versión:** Ej: Chrome 120.0.0

---

## 🎉 Resultado Final Esperado

Después de aplicar todos los arreglos:

### ✅ Al Enviar un Mensaje:
- Aparece **instantáneamente** en el chat (< 100ms)
- La conversación **sube al tope** de la lista
- **"No messages yet"** se reemplaza con el contenido

### ✅ Al Recibir un Mensaje:
- Aparece **sin recargar** la página
- **Badge rojo** aparece en la sidebar
- **Contador incrementa** automáticamente
- **Notificación de sonido** (si está habilitada)

### ✅ Performance:
- **< 2 segundos** de carga inicial
- **< 5 queries** por operación
- **< 100MB** de memoria

---

**Última actualización:** 2025-11-01
**Archivos relacionados:**
- `CHAT_REALTIME_OPTIMIZATION_SUMMARY.md`
- `scripts/enable-chat-realtime.sql`
- `src/components/AppSidebar.tsx`
- `src/hooks/useChatConversations.tsx`
- `src/hooks/useChatMessages.tsx`
