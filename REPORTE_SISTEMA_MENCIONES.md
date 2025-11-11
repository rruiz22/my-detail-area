# 📋 Reporte: Sistema de Menciones (@mentions) - MyDetailArea

**Fecha**: 2025-11-10
**Versión**: 1.3.10
**Estado**: ✅ Bugs Corregidos

---

## 🐛 Bugs Encontrados y Corregidos

### 1. **Error: `toast is not defined`**
**Archivo**: `src/components/orders/TeamCommunicationBlock.tsx`
**Línea**: 114, 121, 145, 171, 178

**Problema**:
```typescript
// ❌ INCORRECTO - toast importado pero no declarado
import { useToast } from '@/hooks/use-toast'; // Importado
// ... falta const { toast } = useToast();
toast({ description: 'Comment added' }); // Error: toast is not defined
```

**Solución Aplicada**:
```typescript
// ✅ CORRECTO
export function TeamCommunicationBlock({ orderId }: TeamCommunicationBlockProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast(); // FIX: Added missing toast hook
  // ...
}
```

---

### 2. **Error: `toast.loading is not a function`**
**Archivo**: `src/hooks/useOrderComments.ts`
**Línea**: 313

**Problema**:
```typescript
// ❌ INCORRECTO - shadcn/ui toast no tiene método .loading()
toast.loading('📲 Sending push notification...', { id: 'push-notif' });
```

**Solución Aplicada**:
```typescript
// ✅ CORRECTO - Comentado porque shadcn/ui toast no soporta .loading()
// toast.loading('📲 Sending push notification to followers...', { id: 'push-notif' });

// El resultado se muestra después con toast normal:
if (result && result.sent > 0) {
  toast({ description: `✅ Push notification sent to ${result.sent} device(s)` });
}
```

---

## 📊 Arquitectura del Sistema de Menciones

### **1. Frontend Components**

#### **A. MentionInput Component**
**Ubicación**: `src/components/mentions/MentionInput.tsx` (242 líneas)

**Características**:
- ✅ Autocompletado de menciones con `@` trigger
- ✅ Búsqueda en tiempo real de miembros del equipo
- ✅ Navegación con teclado (ArrowUp, ArrowDown, Enter, Escape)
- ✅ Avatares dinámicos del sistema
- ✅ Filtra por nombre completo o email
- ✅ Soporte para múltiples menciones en un mensaje

**Flujo de Uso**:
```typescript
<MentionInput
  value={newMessage}
  onChange={(value, mentions) => {
    setNewMessage(value);
    setCurrentMentions(mentions); // Array de user IDs mencionados
  }}
  placeholder="@mention team members"
  disabled={loading}
/>
```

**Ejemplo de Extracción de Menciones**:
```typescript
// Input: "Hey @JohnDoe can you @JaneSmith review this?"
// Output mentions: ['JohnDoe', 'JaneSmith']

const extractMentions = (text: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(match => match.substring(1)) : [];
};
```

---

#### **B. TeamCommunicationBlock Component**
**Ubicación**: `src/components/orders/TeamCommunicationBlock.tsx` (600+ líneas)

**Funcionalidad**:
- ✅ Tab system: Comments (público) vs Internal Notes (privado)
- ✅ Integración con MentionInput para menciones
- ✅ Sistema de threading (comentarios + replies)
- ✅ Adjuntar archivos a comentarios
- ✅ Reacciones emoji a comentarios
- ✅ Permisos basados en Custom Roles

**Estados Clave**:
```typescript
const [newMessage, setNewMessage] = useState('');
const [currentMentions, setCurrentMentions] = useState<string[]>([]); // User IDs mencionados
const [activeTab, setActiveTab] = useState('comments'); // 'comments' | 'internal'
```

---

### **2. Backend Logic**

#### **A. useOrderComments Hook**
**Ubicación**: `src/hooks/useOrderComments.ts` (466 líneas)

**Responsabilidades**:
1. ✅ CRUD de comentarios (create, read, delete)
2. ✅ Threading de replies
3. ✅ Verificación de permisos (Internal Notes)
4. ✅ Real-time subscriptions
5. ✅ Notificaciones push a seguidores
6. ✅ Integración con sistema de notificaciones

**Flujo de Creación de Comentario**:
```typescript
const addComment = async (text: string, type: 'public' | 'internal', parentId?: string) => {
  // 1. Insertar comentario en DB
  const { data } = await supabase.from('order_comments').insert({
    order_id: orderId,
    user_id: user.id,
    comment_text: text.trim(),
    comment_type: type,
    parent_comment_id: parentId || null
  }).select().single();

  // 2. Enviar notificaciones push (fire-and-forget)
  if (type === 'public') {
    await pushNotificationHelper.notifyNewComment(orderId, orderNumber, userName, text);
  }

  // 3. Crear notificación in-app
  await createCommentNotification({
    userId: assignedUserId,
    module: 'sales_orders',
    entityType: 'sales_order',
    entityId: orderId,
    commenterName: userName,
    commentPreview: text.substring(0, 100)
  });

  // 4. Dispatch custom event para otros componentes
  window.dispatchEvent(new CustomEvent('orderCommentAdded', {
    detail: { orderId, commentId: data.id }
  }));

  return data.id; // Retorna comment ID para linking attachments
};
```

---

### **3. Sistema de Notificaciones**

#### **A. Notificaciones Push**
**Archivo**: `src/services/pushNotificationHelper.ts`

**Método**: `notifyNewComment(orderId, orderNumber, userName, commentText)`

**Funcionalidad**:
- ✅ Envía push notifications a seguidores del orden
- ✅ Soporta FCM (Firebase Cloud Messaging)
- ✅ Soporta WNS (Windows Notification Service)
- ✅ Maneja tokens expirados automáticamente

**Flujo**:
```
Comment Created → Push Notification Helper → Supabase Edge Function
→ FCM/WNS → User Devices (Followers)
```

---

#### **B. Notificaciones In-App**
**Archivo**: `src/utils/notificationHelper.ts`

**Función**: `createCommentNotification()`

**Tipos de Notificación**:
```typescript
{
  module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash',
  entityType: 'sales_order' | 'service_order' | 'recon_order' | 'carwash_order',
  entityId: string,
  commenterName: string,
  commentPreview: string,
  priority: 'high' | 'normal' | 'low'
}
```

---

### **4. Database Schema**

#### **Tabla: order_comments**
```sql
CREATE TABLE order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT NOT NULL CHECK (comment_type IN ('public', 'internal')),
  parent_comment_id UUID REFERENCES order_comments(id), -- Threading support
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_order_comments_order_id ON order_comments(order_id);
CREATE INDEX idx_order_comments_parent_id ON order_comments(parent_comment_id);
```

#### **RLS Policies**
```sql
-- Public comments: Todos los usuarios del dealership pueden ver
CREATE POLICY "Users can view public comments" ON order_comments
  FOR SELECT USING (
    comment_type = 'public' AND
    order_id IN (SELECT id FROM orders WHERE dealer_id IN (
      SELECT dealer_id FROM dealer_memberships WHERE user_id = auth.uid()
    ))
  );

-- Internal notes: Solo usuarios con can_access_internal_notes = true
CREATE POLICY "Users can view internal notes if permitted" ON order_comments
  FOR SELECT USING (
    comment_type = 'internal' AND
    EXISTS (
      SELECT 1 FROM user_custom_roles ucr
      JOIN custom_roles cr ON ucr.role_id = cr.id
      WHERE ucr.user_id = auth.uid()
      AND (cr.granular_permissions->>'can_access_internal_notes')::boolean = true
    )
  );
```

---

### **5. Real-Time System**

#### **Subscription Setup**
```typescript
useEffect(() => {
  const subscription = supabase
    .channel(`order-comments-${orderId}`)
    .on('postgres_changes', {
      event: '*', // INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'order_comments',
      filter: `order_id=eq.${orderId}`
    }, (payload) => {
      console.log('📡 Real-time comment update:', payload.eventType);
      fetchComments(); // Refresh comments list
    })
    .subscribe();

  return () => subscription.unsubscribe();
}, [orderId]);
```

---

## 🔐 Sistema de Permisos

### **Internal Notes Access**
```typescript
const canAccessInternal = (() => {
  if (!user || !enhancedUser) return false;

  // System admins siempre tienen acceso
  if (enhancedUser.is_system_admin) return true;

  // Check if any custom role has can_access_internal_notes permission
  const customRoles = enhancedUser.custom_roles;
  if (customRoles && Array.isArray(customRoles)) {
    return customRoles.some(role => {
      const granPerms = role.granularPermissions;
      return granPerms?.can_access_internal_notes === true;
    });
  }

  return false;
})();
```

### **Permission Matrix**
| User Type | Public Comments | Internal Notes | Delete Own | Delete Others |
|-----------|----------------|----------------|------------|---------------|
| System Admin | ✅ Read/Write | ✅ Read/Write | ✅ Yes | ✅ Yes |
| Custom Role (with permission) | ✅ Read/Write | ✅ Read/Write | ✅ Yes | ❌ No |
| Custom Role (without permission) | ✅ Read/Write | ❌ No Access | ✅ Yes | ❌ No |
| Regular User | ✅ Read/Write | ❌ No Access | ✅ Yes | ❌ No |

---

## 📱 Flujo Completo de Mención

### **Escenario**: Usuario menciona a @JohnDoe en un comentario

```
1. Usuario escribe: "Hey @JohnDoe can you review this order?"
   └─> MentionInput detecta '@' y muestra sugerencias

2. Usuario selecciona "John Doe" de la lista
   └─> MentionInput reemplaza @J con @JohnDoe
   └─> onChange retorna: { value: "Hey @JohnDoe...", mentions: ['JohnDoe'] }

3. Usuario presiona Send
   └─> TeamCommunicationBlock.handleAddMessage()

4. useOrderComments.addComment()
   ├─> INSERT into order_comments
   ├─> Envía push notification a seguidores
   ├─> Crea notificación in-app para @JohnDoe
   └─> Dispatch CustomEvent 'orderCommentAdded'

5. Real-time subscription detecta cambio
   └─> Refresh comments automáticamente

6. @JohnDoe recibe:
   ├─> 📲 Push notification (si tiene app instalada)
   ├─> 🔔 In-app notification (en bell icon)
   └─> 📧 Email notification (opcional, si configurado)
```

---

## 🎨 UI/UX Features

### **Comment Card Design**
- ✅ Avatar con sistema DiceBear
- ✅ Username + timestamp
- ✅ Badge "Detail Team" para internal notes
- ✅ Gradient backgrounds (amber para internal, gray para public)
- ✅ Border-left accent color
- ✅ Reply button + reactions
- ✅ Delete dropdown (solo para autor)

### **Threading Visual**
```
Parent Comment
└─ Reply 1 (indented with border-left)
└─ Reply 2 (indented with border-left)
```

---

## 🚀 Mejoras Futuras Recomendadas

### **Menciones**
1. ❌ **Falta implementar**: Resaltado de @mentions en el texto renderizado
2. ❌ **Falta implementar**: Link directo al perfil del usuario mencionado
3. ❌ **Falta implementar**: Notificación específica cuando eres mencionado
4. ❌ **Falta implementar**: Backend trigger para crear notificación cuando detecta @mention

### **Notificaciones**
1. ✅ **Implementado**: Push notifications a seguidores
2. ✅ **Implementado**: In-app notifications
3. ❌ **Falta**: Email notifications para menciones
4. ❌ **Falta**: SMS notifications para menciones críticas

### **Performance**
1. ⚠️ **Mejorable**: Paginar comentarios si hay más de 100
2. ⚠️ **Mejorable**: Lazy loading de replies anidados
3. ⚠️ **Mejorable**: Cache de team members en MentionInput

---

## 📝 Archivos Clave

### **Frontend**
- `src/components/mentions/MentionInput.tsx` - Input con autocompletado
- `src/components/orders/TeamCommunicationBlock.tsx` - UI de comentarios
- `src/components/orders/UnifiedOrderDetailModal.tsx` - Modal principal
- `src/hooks/useOrderComments.ts` - Lógica de comentarios

### **Notifications**
- `src/services/pushNotificationHelper.ts` - Push notifications
- `src/utils/notificationHelper.ts` - In-app notifications
- `src/hooks/useSmartNotifications.ts` - Real-time notification subscriptions

### **Database**
- `supabase/migrations/*_order_comments.sql` - Schema de comentarios
- `supabase/migrations/*_notifications.sql` - Schema de notificaciones

---

## ✅ Estado Actual

| Feature | Estado | Notas |
|---------|--------|-------|
| @Mention Input | ✅ Funcional | Autocompletado working |
| Comment CRUD | ✅ Funcional | Create, Read, Delete |
| Threading/Replies | ✅ Funcional | Nested replies |
| Internal Notes | ✅ Funcional | Permission-based |
| Real-time Updates | ✅ Funcional | Supabase subscriptions |
| Push Notifications | ✅ Funcional | FCM + WNS |
| In-app Notifications | ✅ Funcional | Bell icon badge |
| Mention Highlighting | ❌ Pendiente | No renderiza @mentions en negrita |
| Mention Notifications | ❌ Pendiente | No notifica específicamente al mencionado |
| Email Notifications | ❌ Pendiente | No implementado |

---

## 🐛 Bugs Históricos Resueltos

1. ✅ **2025-11-10**: Fixed `toast is not defined` en TeamCommunicationBlock
2. ✅ **2025-11-10**: Fixed `toast.loading is not a function` en useOrderComments
3. ✅ **2025-11-10**: Added missing `useToast()` hook declaration

---

**Última actualización**: 2025-11-10 16:15 EST
**Próxima revisión**: Implementar notificaciones específicas para @mentions
