# 🚀 Team Chat - Roadmap de Mejoras

## Estado Actual

**Última actualización:** 2024-10-24

### ✅ Completado en Esta Sesión:

1. **Footer System**
   - Versión dinámica desde package.json
   - Modales de Privacy Policy y Terms of Service
   - Traducciones completas (EN/ES/PT-BR)

2. **Team Chat - Seguridad**
   - XSS vulnerability eliminada (mentions seguros)
   - Validación de file uploads (10MB max, tipos permitidos)
   - RLS policies completas (12 políticas)
   - Sin recursión infinita

3. **Team Chat - Funcionalidad Core**
   - Modal de nueva conversación con selector de usuarios
   - Conversaciones Direct y Group funcionando
   - Mensajes en tiempo real (suscripciones estables)
   - Filtro global de dealerships respetado
   - 95+ traducciones (EN/ES/PT-BR)

4. **Team Chat - UX**
   - ScrollArea corregido (overflow-y-auto nativo)
   - Colores Notion-compliant (emerald en lugar de blue)
   - Voice recording con error handling
   - Debug logging completo

---

## 🎯 Mejoras Pendientes para Próximas Sesiones

### **FASE 1: Quick Wins (2-3 horas) - PRIORIDAD ALTA**

#### **1.1 Conectar Reactions** 🎭
**Estado:** Código existe, UI no conectada

**Archivos a modificar:**
- `MessageBubble.tsx` - Conectar onReact a hook
- `MessageThread.tsx` - Pasar addReaction/removeReaction
- Agregar emoji-picker-react

**Implementación:**
```typescript
// MessageThread.tsx
<MessageBubble
  onReact={(emoji) => messagesHook.addReaction(message.id, emoji)}
/>

// Agregar EmojiPicker component
import EmojiPicker from 'emoji-picker-react';
```

**Traducciones necesarias:**
- chat.add_reaction
- chat.reactions

**Tiempo estimado:** 45 minutos

---

#### **1.2 Conectar Edit/Delete Messages** ✏️
**Estado:** Botones existen, funciones no conectadas

**Archivos a modificar:**
- `MessageBubble.tsx` - Conectar a editMessage/deleteMessage
- Agregar estado para edición inline
- Agregar confirmación de delete

**Implementación:**
```typescript
// MessageBubble.tsx
const [isEditing, setIsEditing] = useState(false);

<DropdownMenuItem onClick={() => setIsEditing(true)}>
  Edit
</DropdownMenuItem>

{isEditing && (
  <Input value={editedContent} onChange={...} />
)}
```

**Traducciones necesarias:**
- chat.confirm_delete
- chat.delete_message_confirm
- chat.message_deleted
- chat.message_updated

**Tiempo estimado:** 1 hora

---

#### **1.3 Mentions Autocomplete** @
**Estado:** Rendering funciona, input autocomplete falta

**Archivos a modificar:**
- `MessageComposer.tsx` - Detectar @ y mostrar picker
- Agregar componente MentionSuggestions
- Usar teamMembers del dealership

**Implementación:**
```typescript
// MessageComposer.tsx
const [showMentions, setShowMentions] = useState(false);
const [mentionQuery, setMentionQuery] = useState('');

const handleInput = (e) => {
  const text = e.target.value;
  const cursorPos = e.target.selectionStart;
  const textBeforeCursor = text.slice(0, cursorPos);
  const match = textBeforeCursor.match(/@(\w*)$/);

  if (match) {
    setShowMentions(true);
    setMentionQuery(match[1]);
  } else {
    setShowMentions(false);
  }
};

{showMentions && (
  <MentionSuggestions
    query={mentionQuery}
    users={teamMembers}
    onSelect={insertMention}
  />
)}
```

**Componente nuevo:**
- `MentionSuggestions.tsx` - Popup con lista filtrada de usuarios

**Tiempo estimado:** 1.5 horas

---

### **FASE 2: Features Mayores (1 día) - PRIORIDAD MEDIA**

#### **2.1 Threading/Replies** 💬
**Estado:** DB ready, UI falta completamente

**Archivos a modificar:**
- `MessageBubble.tsx` - Conectar reply button
- Crear `MessageThreadView.tsx` - Vista de hilo
- `MessageThread.tsx` - Mostrar replies count

**Database:**
- ✅ parent_message_id ya existe
- ✅ thread_count ya existe

**Implementación:**
```typescript
// Nuevo componente: MessageThreadView.tsx
export function MessageThreadView({ parentMessage, replies }) {
  return (
    <Dialog>
      <DialogContent>
        {/* Parent message */}
        <MessageBubble message={parentMessage} />

        {/* Replies */}
        <div className="space-y-2">
          {replies.map(reply => (
            <MessageBubble key={reply.id} message={reply} isReply />
          ))}
        </div>

        {/* Reply composer */}
        <MessageComposer onSend={replyToMessage} />
      </DialogContent>
    </Dialog>
  );
}
```

**Hook updates:**
```typescript
// useChatMessages.tsx - Ya existe replyToMessage()
// Solo necesita conectarse en UI
```

**Traducciones necesarias:**
- chat.view_thread
- chat.reply_in_thread
- chat.thread_replies_count

**Tiempo estimado:** 3 horas

---

#### **2.2 Channels Support** 📢
**Estado:** DB soporta, UI completamente falta

**Database:**
- ✅ ENUM: 'channel' | 'announcement' ya existe
- ❌ UI para crear channels falta
- ❌ Permisos especiales falta

**Archivos a modificar:**
- `ConversationList.tsx` - Agregar tab "Channels"
- `CreateConversationModal` - Agregar tipo Channel
- `ChatHeader.tsx` - Icono especial para channels

**Implementación:**
```typescript
// ConversationList filters
<Button onClick={() => setFilter('channel')}>
  <Hash className="h-3 w-3 mr-1" />
  Channels
</Button>

// Channel characteristics:
- # prefix en nombre
- is_private = false (público)
- Todos los del dealership pueden ver
- Solo admins/moderators pueden escribir
```

**Announcement channels:**
```typescript
- Solo admins pueden escribir
- Read-only para todos los demás
- Notifications a todos
```

**Traducciones necesarias:**
- chat.channels
- chat.announcements
- chat.create_channel
- chat.channel_desc
- chat.announcement_desc

**Tiempo estimado:** 4 horas

---

#### **2.3 Pin Conversations** 📌
**Estado:** Campo DB existe (is_pinned), UI falta

**Archivos a modificar:**
- `ConversationList.tsx` - Mostrar pinned al inicio
- `ChatHeader.tsx` - Botón pin/unpin

**Implementación:**
```typescript
// ConversationList.tsx
const pinnedConversations = conversations.filter(c => c.is_pinned);
const unpinnedConversations = conversations.filter(c => !c.is_pinned);

return (
  <>
    {pinnedConversations.length > 0 && (
      <>
        <div className="text-xs font-medium px-3 py-2">Pinned</div>
        {pinnedConversations.map(...)}
        <Separator />
      </>
    )}
    {unpinnedConversations.map(...)}
  </>
);
```

**Traducciones necesarias:**
- chat.pinned
- chat.pin
- chat.unpin
- chat.pinned_conversations

**Tiempo estimado:** 1 hora

---

#### **2.4 Search Global en Mensajes** 🔍
**Estado:** search_vector existe en DB, UI falta

**Database:**
- ✅ chat_messages.search_vector (tsvector) existe
- ✅ Full-text search ready

**Archivos a crear:**
- `GlobalMessageSearch.tsx` - Input + resultados
- `SearchResultItem.tsx` - Preview de mensaje encontrado

**Implementación:**
```typescript
// RPC necesaria (crear en Supabase):
CREATE FUNCTION search_chat_messages(
  search_query text,
  dealer_id bigint
)
RETURNS TABLE (
  message_id uuid,
  conversation_id uuid,
  content text,
  created_at timestamp,
  sender_name text,
  conversation_name text
)
AS $$
  SELECT
    cm.id,
    cm.conversation_id,
    cm.content,
    cm.created_at,
    p.first_name || ' ' || p.last_name as sender_name,
    cc.name as conversation_name
  FROM chat_messages cm
  JOIN chat_conversations cc ON cc.id = cm.conversation_id
  JOIN profiles p ON p.id = cm.user_id
  WHERE
    cc.dealer_id = dealer_id
    AND cm.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY cm.created_at DESC
  LIMIT 50;
$$ LANGUAGE sql;
```

**Traducciones necesarias:**
- chat.search_all_messages
- chat.search_results
- chat.no_search_results
- chat.jump_to_message

**Tiempo estimado:** 3 horas

---

### **FASE 3: Polish & UX (4-6 horas) - PRIORIDAD BAJA**

#### **3.1 Mejor Preview de Conversaciones**

**Mejoras:**
```typescript
// Last message preview con iconos
const getMessagePreview = (conv) => {
  if (conv.last_message_type === 'image') return '📷 Image';
  if (conv.last_message_type === 'voice') return '🎤 Voice';
  if (conv.last_message_type === 'file') return '📎 File';
  return conv.last_message_preview;
};

// Participant avatars overlap
<AvatarGroup max={3}>
  {participants.map(p => <Avatar key={p.id} src={p.avatar} />)}
</AvatarGroup>
```

**Tiempo estimado:** 2 horas

---

#### **3.2 Link Preview**

**Implementación:**
```typescript
// Detectar URLs en mensajes
// Fetch metadata (título, descripción, imagen)
// Mostrar card preview

import { linkifyStr } from 'linkify-string';

const MessageContent = ({ content }) => {
  const urls = extractUrls(content);

  return (
    <>
      <p>{linkifyStr(content)}</p>
      {urls.map(url => (
        <LinkPreviewCard key={url} url={url} />
      ))}
    </>
  );
};
```

**Edge Function necesaria:**
```typescript
// Supabase Edge Function: fetch-link-preview
export async function handler(req: Request) {
  const { url } = await req.json();
  // Fetch URL metadata
  // Return { title, description, image }
}
```

**Tiempo estimado:** 3 horas

---

#### **3.3 Rich Text Formatting**

**Implementación:**
```typescript
// Markdown-style formatting
**bold** → <strong>bold</strong>
*italic* → <em>italic</em>
`code` → <code>code</code>
```javascript
code block
```
→ <pre><code>...</code></pre>

// Usar react-markdown
import ReactMarkdown from 'react-markdown';

<ReactMarkdown>{message.content}</ReactMarkdown>
```

**UI Toolbar:**
```typescript
// MessageComposer.tsx
<div className="flex gap-1 border-t pt-2">
  <Button size="sm" onClick={() => insertFormat('**', '**')}>
    <Bold className="h-3 w-3" />
  </Button>
  <Button size="sm" onClick={() => insertFormat('*', '*')}>
    <Italic className="h-3 w-3" />
  </Button>
  <Button size="sm" onClick={() => insertFormat('`', '`')}>
    <Code className="h-3 w-3" />
  </Button>
</div>
```

**Tiempo estimado:** 2 horas

---

### **FASE 4: Enterprise Features (1-2 días) - FUTURO**

#### **4.1 Export Conversations**
- PDF export de conversación completa
- CSV export de mensajes
- Filtros por fecha
- Include/exclude attachments

#### **4.2 Message Moderation**
- Moderators pueden eliminar cualquier mensaje
- Admin panel para moderation
- Audit log de mensajes eliminados

#### **4.3 Auto-delete & Retention**
- Usar auto_delete_after_days de DB
- Background job para cleanup
- Configuración por conversación

#### **4.4 Contextual Chat**
- Botón "Chat" en Orders/Contacts/Vehicles
- Auto-create conversation para entidad
- Link bidireccional

---

## 📦 Dependencias a Instalar

```bash
# Para próxima sesión:
npm install emoji-picker-react react-markdown linkify-react prism-react-renderer
```

---

## 🔧 Migraciones de Database Pendientes

### **1. Enable Full-Text Search Triggers**
```sql
-- Auto-update search_vector en INSERT/UPDATE
CREATE OR REPLACE FUNCTION update_chat_message_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_message_search_update
BEFORE INSERT OR UPDATE ON chat_messages
FOR EACH ROW EXECUTE FUNCTION update_chat_message_search_vector();
```

### **2. Indices para Performance**
```sql
-- Index para búsqueda de mensajes
CREATE INDEX idx_chat_messages_search_vector
ON chat_messages USING gin(search_vector);

-- Index para conversaciones por dealer
CREATE INDEX idx_chat_conversations_dealer_updated
ON chat_conversations(dealer_id, updated_at DESC);

-- Index para mensajes por conversación
CREATE INDEX idx_chat_messages_conversation_created
ON chat_messages(conversation_id, created_at DESC);
```

---

## 📊 Métricas de Progreso

| Feature | Código | DB | UI | Traducciones | Estado |
|---------|--------|----|----|--------------|--------|
| **Direct Messages** | ✅ | ✅ | ✅ | ✅ | 100% |
| **Group Messages** | ✅ | ✅ | ✅ | ✅ | 100% |
| **Reactions** | ✅ | ✅ | ⚠️ | ⚠️ | 60% |
| **Threading** | ✅ | ✅ | ❌ | ❌ | 40% |
| **Mentions** | ✅ | ✅ | ⚠️ | ✅ | 70% |
| **Edit/Delete** | ✅ | ✅ | ⚠️ | ⚠️ | 60% |
| **Channels** | ✅ | ✅ | ❌ | ❌ | 30% |
| **Pin Conversations** | ✅ | ✅ | ❌ | ❌ | 40% |
| **Search Messages** | ❌ | ✅ | ❌ | ❌ | 20% |
| **Voice Messages** | ✅ | ✅ | ✅ | ✅ | 90% |
| **File Attachments** | ✅ | ✅ | ✅ | ✅ | 100% |

---

## 🎨 Mejoras de Estilo Sugeridas

### **1. Conversation List**

**Current:**
- Plain text preview
- Small avatars
- Simple badges

**Mejorado:**
```tsx
// Avatar con overlap para grupos
<div className="flex -space-x-2">
  {participants.slice(0, 3).map(p => (
    <Avatar className="border-2 border-background">
      <AvatarImage src={p.avatar} />
    </Avatar>
  ))}
  {participants.length > 3 && (
    <div className="bg-muted border-2 rounded-full h-8 w-8 flex items-center justify-center text-xs">
      +{participants.length - 3}
    </div>
  )}
</div>

// Last message con iconos
<div className="flex items-center gap-1 text-xs text-muted-foreground">
  {getMessageIcon(lastMessage.type)}
  <span className="truncate">{lastMessage.preview}</span>
</div>

// Unread badge más visible
<Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center">
  {unreadCount}
</Badge>
```

---

### **2. Message Bubbles**

**Mejoras:**
```tsx
// Delivery status más visible
<div className="flex items-center gap-1 mt-1">
  <span className="text-xs">{time}</span>
  {message.delivery_status === 'read' && (
    <CheckCheck className="h-3 w-3 text-emerald-500" />
  )}
</div>

// Link detection y preview
import Linkify from 'linkify-react';

<Linkify options={linkifyOptions}>
  {message.content}
</Linkify>

// Code blocks con syntax highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

<SyntaxHighlighter language="javascript">
  {codeContent}
</SyntaxHighlighter>
```

---

### **3. Header Mejorado**

**Agregar:**
```tsx
// Info panel slide-out
<Sheet>
  <SheetTrigger>
    <Button variant="ghost">
      <Info className="h-4 w-4" />
    </Button>
  </SheetTrigger>
  <SheetContent>
    {/* Participant list */}
    {/* Shared files */}
    {/* Shared images */}
    {/* Settings */}
  </SheetContent>
</Sheet>

// Quick actions
<div className="flex gap-2">
  <Button variant="ghost" size="sm">
    <Search className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <Pin className="h-4 w-4" />
  </Button>
  <Button variant="ghost" size="sm">
    <BellOff className="h-4 w-4" />
  </Button>
</div>
```

---

## 🎯 Priorización Recomendada para Próxima Sesión

### **Sesión 1 (3 horas):**
1. ✅ Conectar reactions con emoji picker **(Quick win)**
2. ✅ Conectar edit/delete messages **(Quick win)**
3. ✅ Agregar mentions autocomplete **(High value)**

### **Sesión 2 (4 horas):**
4. ✅ Implementar threading/replies **(High value)**
5. ✅ Agregar channels support **(Enterprise feature)**
6. ✅ Pin conversations **(UX improvement)**

### **Sesión 3 (3 horas):**
7. ✅ Search global de mensajes **(High value)**
8. ✅ Mejorar preview de conversaciones **(Polish)**
9. ✅ Link previews **(Nice to have)**

---

## 🧪 Testing Checklist

**Para cada feature:**
- [ ] Unit tests (Vitest)
- [ ] Integration tests (Testing Library)
- [ ] E2E tests (Playwright)
- [ ] Traducciones completas (EN/ES/PT-BR)
- [ ] Diseño Notion-compliant
- [ ] Mobile responsive
- [ ] Error handling
- [ ] Loading states
- [ ] Accesibilidad (ARIA labels)

---

## 📚 Documentación Relacionada

- `CHAT_ARCHITECTURE.md` - Schema y RPCs
- `VERSION_MANAGEMENT.md` - Sistema de versiones
- `CLAUDE.md` - Guías del proyecto

---

## ✅ Checklist Pre-implementación

Antes de empezar próxima sesión:

- [ ] Instalar dependencias (emoji-picker-react, etc)
- [ ] Revisar este documento
- [ ] Crear branch: `feature/chat-improvements`
- [ ] Leer CHAT_ARCHITECTURE.md
- [ ] Verificar RLS policies funcionando
- [ ] Backup de database

---

**Total estimado para completar todas las mejoras:** 15-20 horas

**Última actualización:** 2025-10-24
**Autor:** Claude Code
**Versión:** 1.0.0
