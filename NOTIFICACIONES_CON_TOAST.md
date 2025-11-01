# 📲 Sistema de Notificaciones con Toast Visual

## 🐛 Problema Resuelto

**Error Original:**
```
[PushNotificationHelper] Error notifying new comment: TypeError: Cannot read properties of undefined (reading 'length')
```

### Causa del Error

El método `notifyNewComment` esperaba **4 parámetros** pero solo recibía **3**:

```typescript
// ❌ Llamada INCORRECTA (3 parámetros)
pushNotificationHelper.notifyNewComment(
  parseInt(orderId),  // orderId
  userName,           // ← Esto iba en el parámetro 2 (orderNumber)
  text.trim()         // ← Esto iba en el parámetro 3 (commenterName)
                      // ← commentText faltaba! (undefined)
)

// ✅ Firma correcta (4 parámetros)
async notifyNewComment(
  orderId: string,       // Parámetro 1
  orderNumber: string,   // Parámetro 2 (FALTABA!)
  commenterName: string, // Parámetro 3
  commentText: string    // Parámetro 4
)
```

**Resultado:** `commentText` era `undefined`, causando el error al intentar acceder a `.length`.

---

## ✅ Soluciones Implementadas

### 1. **Corrección de Parámetros en Push Notifications**

**Archivo:** `src/hooks/useOrderComments.ts`

**Cambios:**
- ✅ Agregado import: `import { toast } from 'sonner'`
- ✅ Corregido nombre de tabla: `sales_orders` → `orders`
- ✅ Ahora obtiene el `orderNumber` desde la base de datos antes de enviar la notificación
- ✅ Pasa los **4 parámetros correctos** a `notifyNewComment`
- ✅ Agrega **toast visual** para feedback al usuario

```typescript
// ✅ Import necesario
import { toast } from 'sonner';

// ✅ NUEVO: Obtiene orderNumber y envía notificación correctamente
supabase
  .from('orders')
  .select('order_number, custom_order_number')
  .eq('id', orderId)
  .single()
  .then(({ data: orderData }) => {
    if (orderData) {
      const orderNumber = orderData.custom_order_number || orderData.order_number || orderId;

      // 🎉 Toast visual para el usuario
      toast.success('📲 Sending push notification to followers');

      return pushNotificationHelper.notifyNewComment(
        orderId,      // ✅ Parámetro 1: ID de la orden
        orderNumber,  // ✅ Parámetro 2: Número de orden (AHORA INCLUIDO)
        userName,     // ✅ Parámetro 3: Nombre del usuario
        text.trim()   // ✅ Parámetro 4: Texto del comentario
      );
    }
  })
  .catch((notifError) => {
    console.error('❌ Push notification failed (non-critical):', notifError);
    toast.error('⚠️ Push notification failed (comment saved)');
  });
```

---

### 2. **Toast Visual para SMS Notifications**

**Archivo:** `src/services/orderSMSService.ts`

**Cambios:**
- ✅ Agregado import: `import { toast } from 'sonner'`
- ✅ Indicar cuándo se están enviando SMS
- ✅ Mostrar resultados (éxito/fallo)
- ✅ Número de destinatarios

#### Toast al Iniciar Envío
```typescript
// ✅ Import necesario
import { toast } from 'sonner';

// 📱 Toast de "loading" mientras envía
toast.loading(
  `📱 Sending SMS to ${followers.length} follower${followers.length > 1 ? 's' : ''}...`,
  { id: `sms-${orderId}` }
);
```

#### Toast con Resultados
```typescript
// ✅ Toast de éxito/error con resultados
if (sent > 0 && failed === 0) {
  toast.success(`✅ SMS sent to ${sent} follower${sent > 1 ? 's' : ''}`, {
    id: `sms-${orderId}`
  });
} else if (sent > 0 && failed > 0) {
  toast.warning(`⚠️ SMS: ${sent} sent, ${failed} failed`, {
    id: `sms-${orderId}`
  });
} else {
  toast.error(`❌ All SMS failed (${failed} errors)`, {
    id: `sms-${orderId}`
  });
}
```

---

## 📊 Tipos de Notificaciones y Toast

| Tipo de Notificación | Toast Visual | Descripción |
|----------------------|--------------|-------------|
| **Push Notification (Comentarios)** | 📲 Sending push notification to followers | Se envía cuando alguien comenta en una orden |
| **SMS (Orden Completada)** | 📱 Sending SMS to N followers... | Notifica a followers cuando orden está completa |
| **SMS (Actualización)** | 📱 Sending SMS to N followers... | Notifica cambios en el estado de la orden |
| **SMS (Nuevo Comentario)** | 📱 Sending SMS to N followers... | SMS alternativo para comentarios |

---

## 🎯 Experiencia del Usuario (UX)

### Antes ❌
```
Usuario: *Agrega comentario*
Sistema: *Silenciosamente intenta enviar notificación*
Sistema: *Falla sin feedback visible*
Console: [Error: Cannot read properties of undefined...]
Usuario: 🤷 ¿Se envió la notificación? No lo sé...
```

### Ahora ✅
```
Usuario: *Agrega comentario*
Sistema: 🎊 "Comment added successfully"
Sistema: 📲 "Sending push notification to followers"
Usuario: 😊 ¡Perfecto! Sé que la notificación se está enviando

--- O si falla ---
Sistema: ⚠️ "Push notification failed (comment saved)"
Usuario: 😌 Ok, el comentario se guardó de todas formas
```

---

## 🧪 Cómo Probar

### 1. **Probar Push Notifications**

1. Ve a cualquier orden: `/orders/[order_id]`
2. Agrega un **comentario público**
3. **Verás el toast:** `📲 Sending push notification to followers`
4. Si falla: `⚠️ Push notification failed (comment saved)`

### 2. **Probar SMS Notifications**

#### Opción A: Usando el Servicio Directamente
```typescript
import { orderSMSService } from '@/services/orderSMSService';

// En un componente de orden
await orderSMSService.notifyOrderCompleted('order-id', 'ORD-123');
```

**Toast que verás:**
1. `📱 Sending SMS to 3 followers...` (loading)
2. `✅ SMS sent to 3 followers` (success)

#### Opción B: Integración en Evento Real
Ver `ORDER_SMS_INTEGRATION_GUIDE.md` para integración completa.

---

## 📁 Archivos Modificados

### 1. `src/hooks/useOrderComments.ts`
- ✅ Corregido parámetros en `notifyNewComment`
- ✅ Agregado consulta a DB para obtener `orderNumber`
- ✅ Agregado toasts para push notifications
- ✅ Manejo de errores mejorado

### 2. `src/services/orderSMSService.ts`
- ✅ Agregado toast al iniciar envío de SMS
- ✅ Agregado toast con resultados (éxito/fallo/parcial)
- ✅ Muestra número de destinatarios
- ✅ ID único por orden para evitar toasts duplicados

### 3. `src/services/pushNotificationHelper.ts`
- ✅ Ya tenía validación de `commentText` (agregada anteriormente)
- ✅ Ahora recibe todos los parámetros correctamente

---

## 🔐 Validaciones Implementadas

### En `pushNotificationHelper.ts`
```typescript
// Validación para prevenir el error original
if (!commentText || typeof commentText !== 'string') {
  console.warn('[PushNotificationHelper] Invalid comment text, skipping notification');
  return; // Sale temprano si es inválido
}
```

### En `useOrderComments.ts`
```typescript
// Solo envía notificación si es comentario público
if (type === 'public') {
  // ... envía notificación
}
// Comentarios internos NO envían notificación
```

---

## 🚀 Próximos Pasos

### Opcional: Agregar Toasts a Otros Eventos

Puedes agregar toasts similares para:
- ✅ Email notifications
- ✅ Cambios de estado de orden
- ✅ Asignaciones de usuarios
- ✅ Subida de archivos

**Ejemplo para Email:**
```typescript
toast.loading('📧 Sending email notification...', { id: 'email-123' });
// ... enviar email ...
toast.success('✅ Email sent', { id: 'email-123' });
```

---

## 🎓 Lecciones Aprendidas

1. **Imports Necesarios:** Siempre importar las dependencias (`import { toast } from 'sonner'`)
2. **Validación de Parámetros:** Siempre validar que los parámetros obligatorios estén presentes
3. **Feedback Visual:** Los toasts mejoran significativamente la UX
4. **Fire-and-Forget:** Las notificaciones no deben bloquear la operación principal
5. **Error Handling:** Mostrar errores de forma clara pero no crítica
6. **Parámetros Posicionales:** Cuidado con el orden de parámetros, mejor usar objetos si son muchos
7. **Nombres de Tablas:** Verificar siempre el nombre correcto de las tablas en la DB
8. **Uso Correcto de APIs:** Usar `toast.success()` en vez de `window.toast.success()`

---

## 🐛 Errores Comunes y Soluciones

### Error 404: Tabla no encontrada
```
GET /rest/v1/sales_orders?... 404 (Not Found)
```
**Causa:** Nombre de tabla incorrecto
**Solución:** Verificar nombre real en Supabase: `orders` (no `sales_orders`)

### TypeError: Cannot read properties of undefined
```
TypeError: Cannot read properties of undefined (reading 'length')
```
**Causa:** Parámetros incorrectos o faltantes en función
**Solución:** Validar que todos los parámetros requeridos se pasen correctamente

### Toast no aparece
**Causa:** `window.toast` no está disponible o hay error en el servicio
**Solución:** Verificar que `sonner` esté instalado y configurado en `App.tsx`

### ReferenceError: toast is not defined
```
ReferenceError: toast is not defined at useOrderComments.ts:279:15
```
**Causa:** Falta importar `toast` desde `sonner`
**Solución:** Agregar `import { toast } from 'sonner';` al inicio del archivo

---

## ✅ Resumen

| Aspecto | Estado |
|---------|--------|
| Error de Push Notifications | ✅ **RESUELTO** |
| Toast para Push | ✅ **IMPLEMENTADO** |
| Toast para SMS | ✅ **IMPLEMENTADO** |
| Validaciones | ✅ **FUNCIONANDO** |
| Feedback al Usuario | ✅ **MEJORADO** |
| Tests | ⏳ **Listo para probar** |

---

**🎉 El sistema de notificaciones ahora es más robusto, informativo y user-friendly!**
