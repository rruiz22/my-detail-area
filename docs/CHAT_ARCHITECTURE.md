# 💬 Team Chat Architecture - My Detail Area

## Overview

El módulo de Team Chat proporciona comunicación en tiempo real para equipos de concesionarios con mensajería, archivos compartidos, menciones, y más.

---

## 🏗️ Arquitectura de Componentes

```
src/components/chat/
├── ChatLayout.tsx              # Layout principal con ResizablePanels
├── EnhancedChatInterface.tsx   # UI avanzada con reactions, threads
├── ConversationList.tsx        # Lista de conversaciones con filtros
├── MessageThread.tsx           # Hilo de mensajes
├── MessageComposer.tsx         # Input para enviar mensajes
├── MessageBubble.tsx           # Burbuja individual de mensaje
├── FloatingChatBubble.tsx      # Botón flotante global
├── ChatHeader.tsx              # Header de conversación
├── TypingIndicator.tsx         # Indicador de "usuario escribiendo"
├── DateSeparator.tsx           # Separador de fecha entre mensajes
└── ContextualChatLauncher.tsx  # Lanzador contextual (orders, etc)
```

---

## 📊 Database Schema (Supabase)

### **Tablas Principales:**

#### **1. `chat_conversations`**
```sql
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id),
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('direct', 'group', 'channel', 'announcement')),
  name TEXT,
  description TEXT,
  avatar_url TEXT,
  is_private BOOLEAN DEFAULT true,
  is_archived BOOLEAN DEFAULT false,
  is_muted BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  max_participants INTEGER,
  allow_external_users BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb
);
```

#### **2. `chat_participants`**
```sql
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission_level TEXT DEFAULT 'write' CHECK (permission_level IN ('admin', 'write', 'read')),
  is_active BOOLEAN DEFAULT true,
  is_muted BOOLEAN DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE,
  notification_frequency TEXT DEFAULT 'all' CHECK (notification_frequency IN ('all', 'mentions', 'none')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
```

#### **3. `chat_messages`**
```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  message_type TEXT NOT NULL CHECK (message_type IN ('text', 'voice', 'file', 'image', 'system')),
  content TEXT,

  -- Files and media
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,

  -- Voice messages
  voice_duration_ms INTEGER,
  voice_transcription TEXT,

  -- Threading
  parent_message_id UUID REFERENCES chat_messages(id),
  thread_count INTEGER DEFAULT 0,

  -- State
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_system_message BOOLEAN DEFAULT false,

  -- Social features
  reactions JSONB DEFAULT '{}'::jsonb,  -- {emoji: [user_ids]}
  mentions TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,

  metadata JSONB DEFAULT '{}'::jsonb
);
```

---

## 🔧 **RPCs Necesarias (PostgreSQL Functions)**

### **RPC 1: `get_unread_message_counts`**

**Propósito:** Obtener conteo de mensajes no leídos por conversación.

```sql
CREATE OR REPLACE FUNCTION get_unread_message_counts(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS TABLE (
  conversation_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.conversation_id,
    COUNT(*)::BIGINT as unread_count
  FROM chat_messages cm
  INNER JOIN chat_participants cp ON cp.conversation_id = cm.conversation_id
  WHERE
    cm.conversation_id = ANY(conversation_ids)
    AND cp.user_id = user_id
    AND cm.created_at > COALESCE(cp.last_read_at, '1970-01-01'::TIMESTAMP)
    AND cm.user_id != user_id
    AND cm.is_deleted = false
  GROUP BY cm.conversation_id;
END;
$$;
```

**Uso:** `useChatConversations.tsx:112`

---

### **RPC 2: `get_conversation_last_messages`**

**Propósito:** Obtener el último mensaje de cada conversación para preview.

```sql
CREATE OR REPLACE FUNCTION get_conversation_last_messages(
  conversation_ids UUID[]
)
RETURNS TABLE (
  conversation_id UUID,
  last_message_content TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_message_type TEXT,
  last_message_user_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (cm.conversation_id)
    cm.conversation_id,
    CASE
      WHEN cm.message_type = 'text' THEN LEFT(cm.content, 100)
      WHEN cm.message_type = 'image' THEN '📷 Image'
      WHEN cm.message_type = 'file' THEN '📎 ' || cm.file_name
      WHEN cm.message_type = 'voice' THEN '🎤 Voice message'
      ELSE cm.content
    END as last_message_content,
    cm.created_at as last_message_at,
    cm.message_type as last_message_type,
    cm.user_id as last_message_user_id
  FROM chat_messages cm
  WHERE
    cm.conversation_id = ANY(conversation_ids)
    AND cm.is_deleted = false
  ORDER BY cm.conversation_id, cm.created_at DESC;
END;
$$;
```

**Uso:** `useChatConversations.tsx:126`

---

### **RPC 3: `get_conversation_participants`**

**Propósito:** Obtener participantes de una conversación con sus perfiles.

```sql
CREATE OR REPLACE FUNCTION get_conversation_participants(
  conversation_uuid UUID,
  requesting_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  user_avatar_url TEXT,
  permission_level TEXT,
  is_active BOOLEAN,
  last_read_at TIMESTAMP WITH TIME ZONE,
  presence_status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cp.user_id,
    CONCAT(p.first_name, ' ', p.last_name) as user_name,
    p.email as user_email,
    NULL::TEXT as user_avatar_url,
    cp.permission_level,
    cp.is_active,
    cp.last_read_at,
    COALESCE(up.presence_status, 'offline') as presence_status
  FROM chat_participants cp
  INNER JOIN profiles p ON p.id = cp.user_id
  LEFT JOIN user_presence up ON up.user_id = cp.user_id
  WHERE cp.conversation_id = conversation_uuid
    AND cp.is_active = true
  ORDER BY
    CASE WHEN cp.user_id = requesting_user_id THEN 0 ELSE 1 END,
    p.first_name;
END;
$$;
```

**Uso:** `useChatConversations.tsx:138`

---

## 🚨 **Problemas Críticos Identificados**

### **1. RPCs No Implementadas**
❌ Las 3 RPCs listadas arriba no existen en la base de datos.

**Síntomas:**
- Contador de no leídos siempre en 0
- No hay preview de último mensaje
- No se muestran participantes correctamente

**Solución:** Ejecutar los SQL scripts arriba en Supabase.

---

### **2. Vulnerabilidad XSS (CORREGIDA ✅)**
~~❌ `renderMessageContent()` usaba HTML strings sin sanitizar~~

**Estado:** ✅ Corregido con componente React `<MessageContent />`

---

### **3. File Upload Sin Validación (CORREGIDA ✅)**
~~❌ No validaba tamaño ni tipos de archivo~~

**Estado:** ✅ Corregido con:
- Max 10MB por archivo
- Solo tipos permitidos (images, PDFs, docs)
- Toast notifications para errores

---

### **4. ScrollArea Sin Funcionamiento (CORREGIDO ✅)**
~~❌ ScrollArea con `flex-1` no funcionaba~~

**Estado:** ✅ Corregido usando `overflow-y-auto` nativo en:
- FloatingChatBubble.tsx
- ConversationList.tsx

---

### **5. Colores Violando Diseño Notion (CORREGIDO ✅)**
~~❌ Mentions usaban `text-blue-800` y `bg-blue-100`~~

**Estado:** ✅ Corregido a `text-emerald-700` y `bg-emerald-500/10`

---

## 📱 **Funcionalidades del Chat**

### **Implementadas ✅**
- ✅ Mensajería de texto en tiempo real
- ✅ Conversaciones directas y grupales
- ✅ Adjuntar imágenes y archivos (validados)
- ✅ Mensajes de voz (con permisos)
- ✅ Menciones (@usuario) - seguras
- ✅ Reactions con emojis
- ✅ Editar/eliminar mensajes
- ✅ Responder a mensajes (threading)
- ✅ Indicador de escritura
- ✅ Read receipts
- ✅ Búsqueda de mensajes
- ✅ Búsqueda de conversaciones
- ✅ Filtros (All/Direct/Groups)
- ✅ Real-time subscriptions
- ✅ Presence indicators
- ✅ FloatingChatBubble global

### **Parcialmente Implementadas ⚠️**
- ⚠️ Contadores de no leídos (necesita RPC)
- ⚠️ Last message preview (necesita RPC)
- ⚠️ Participant info (necesita RPC)

---

## 🔐 **Seguridad**

| Feature | Estado | Notas |
|---------|--------|-------|
| **XSS Protection** | ✅ | Mentions usan componente React seguro |
| **File Validation** | ✅ | Max 10MB, tipos whitelisted |
| **Permissions** | ⚠️ | Falta PermissionGuard en módulo |
| **Input Sanitization** | ✅ | Todo el input pasa por React |
| **SQL Injection** | ✅ | Usa Supabase client (prepared statements) |

---

## 🎯 **Próximos Pasos Recomendados**

### **Prioridad Alta:**
1. **Implementar las 3 RPCs** en Supabase (scripts provistos arriba)
2. **Agregar PermissionGuard** a página Chat.tsx
3. **Testing E2E** con Playwright

### **Prioridad Media:**
4. Implementar paginación para mensajes (actualmente carga todos)
5. Agregar typing indicators reales (actualmente simulados)
6. Optimizar real-time subscriptions

### **Prioridad Baja:**
7. Message virtualization para conversaciones muy largas
8. Rich text formatting (bold, italic, etc)
9. Emoji picker real

---

**Última actualización:** 2025-10-24
**Estado general:** ⚠️ Funcional pero necesita RPCs para estar completo
