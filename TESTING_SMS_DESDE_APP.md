# 📱 Guía: Probar SMS desde la Aplicación

## 🚀 Configuración Previa

Asegúrate de tener configurado en Supabase Secrets:

```bash
✅ TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
✅ TWILIO_AUTH_TOKEN=your_token
✅ TWILIO_PHONE_NUMBER=+1234567890
```

---

## 🎯 Método 1: Botón de Prueba en Dashboard

### Pasos:

1. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

2. **Navega al Dashboard:**
   - Abre http://localhost:5173
   - Inicia sesión
   - Ve al Dashboard principal

3. **Encuentra el botón de prueba:**
   - Al final de la página verás: **"🧪 Probar SMS"**
   - Si no lo ves, refresca la página

4. **Configura y envía:**
   - Ingresa tu número con código de país: `+17744108962`
   - Escribe un mensaje de prueba
   - Click en **"📱 Enviar SMS de Prueba"**

5. **Verifica:**
   - Deberías ver un toast de confirmación
   - Recibirás el SMS en tu teléfono en 5-10 segundos

### ⚠️ Ajustes Necesarios:

En `src/components/testing/TestSMSButton.tsx`, **cambia el dealerId**:

```typescript
const dealerId = 1; // ❌ CAMBIA ESTO
// Por tu dealer ID real, puedes obtenerlo del contexto:
const { selectedDealerId } = useDealerContext();
```

---

## 🎯 Método 2: Integración en Flujo de Órdenes

### Ejemplo: Enviar SMS cuando una orden cambia de estado

1. **En tu componente de órdenes** (ej: `src/pages/ServiceOrders.tsx`):

```typescript
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';

function ServiceOrders() {
  const dealerId = 1; // Tu dealer ID
  const { sendNotification } = useEnhancedNotifications(dealerId);

  const handleStatusChange = async (order: any, newStatus: string) => {
    // 1. Actualiza el estado en la BD
    await updateOrderStatus(order.id, newStatus);

    // 2. Envía SMS automáticamente
    await sendNotification({
      dealerId,
      userId: order.user_id,
      notificationType: 'order_status_changed',
      entityType: 'order',
      entityId: order.id,
      channels: ['sms', 'in_app'],
      data: {
        message: `Su orden ${order.order_number} está ahora: ${newStatus}`,
        phoneNumber: order.customer_phone,
        orderNumber: order.order_number,
        status: newStatus
      },
      priority: 'high'
    });
  };

  return (
    // ... tu UI
    <Button onClick={() => handleStatusChange(order, 'completed')}>
      Completar Orden
    </Button>
  );
}
```

---

## 🎯 Método 3: Usando Métodos Quick del Hook

El hook `useEnhancedNotifications` tiene métodos predefinidos:

```typescript
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';

function MiComponente() {
  const dealerId = 1;
  const { notifyOrderUpdate } = useEnhancedNotifications(dealerId);

  // Uso simplificado
  const notificar = async () => {
    await notifyOrderUpdate({
      id: 'ORD-123',
      order_number: 'ORD-123',
      status: 'completed',
      customer_name: 'Juan Pérez'
    });
  };

  return <button onClick={notificar}>Notificar</button>;
}
```

---

## 🔍 Verificación y Debugging

### 1. **Verifica que el SMS se encolado:**

```sql
SELECT * FROM notification_log
WHERE target_channels @> ARRAY['sms']
ORDER BY created_at DESC
LIMIT 10;
```

### 2. **Verifica el estado de envío:**

```sql
SELECT
  id,
  title,
  target_channels,
  delivery_status,
  created_at
FROM notification_log
WHERE entity_id = 'TEST-001' -- Tu ID de prueba
ORDER BY created_at DESC;
```

### 3. **Revisa logs de la Edge Function:**

- Ve a Supabase Dashboard
- Edge Functions → `send-sms`
- Pestaña **"Logs"**
- Busca errores o confirmaciones

### 4. **Verifica en Twilio:**

- Ve a [Twilio Console](https://console.twilio.com/)
- Monitor → Logs → Messages
- Verifica el estado del mensaje enviado

---

## ⚡ Pruebas Rápidas desde Consola del Navegador

Abre DevTools (F12) en tu aplicación y ejecuta:

```javascript
// Obtén el servicio de notificaciones
const { supabase } = await import('/src/integrations/supabase/client.ts');

// Inserta una notificación de prueba
const { data, error } = await supabase
  .from('notification_log')
  .insert({
    user_id: 'tu-user-id',
    dealer_id: 1,
    module: 'test',
    event_type: 'test_sms',
    entity_type: 'test',
    entity_id: 'TEST-' + Date.now(),
    title: 'Prueba SMS',
    content: 'Mensaje de prueba',
    priority: 'high',
    target_channels: ['sms'],
    metadata: {
      phoneNumber: '+17744108962',
      orderNumber: 'TEST-001'
    }
  })
  .select();

console.log('Notificación creada:', data);
```

---

## 🧹 Limpieza después de Probar

Una vez que confirmes que funciona, **elimina el botón de prueba**:

1. **Remueve el import del Dashboard:**
   ```typescript
   // ❌ Elimina esta línea
   import { TestSMSButton } from '@/components/testing/TestSMSButton';
   ```

2. **Remueve el componente:**
   ```typescript
   // ❌ Elimina estas líneas
   {/* 🧪 TESTING: SMS Button (Remover después de probar) */}
   <TestSMSButton />
   ```

3. **Opcionalmente, elimina el archivo:**
   ```bash
   rm src/components/testing/TestSMSButton.tsx
   ```

---

## 📊 Casos de Uso Reales

### 1. **Notificar cuando una orden está lista:**

```typescript
await sendNotification({
  notificationType: 'order_ready',
  channels: ['sms', 'push'],
  data: {
    message: '¡Su vehículo está listo para recoger!',
    phoneNumber: customer.phone,
    orderNumber: order.number
  },
  priority: 'urgent'
});
```

### 2. **Recordatorio de cita:**

```typescript
await sendNotification({
  notificationType: 'appointment_reminder',
  channels: ['sms', 'email'],
  data: {
    message: 'Recordatorio: Cita mañana a las 10:00 AM',
    phoneNumber: customer.phone,
    email: customer.email,
    appointmentDate: '2024-11-01 10:00'
  },
  priority: 'normal'
});
```

### 3. **Alerta crítica:**

```typescript
await sendNotification({
  notificationType: 'critical_alert',
  channels: ['sms', 'push', 'in_app'],
  data: {
    message: '⚠️ Problema detectado en la orden ' + orderNumber,
    phoneNumber: manager.phone,
    orderNumber: orderNumber
  },
  priority: 'critical'
});
```

---

## 🎯 Próximos Pasos

- [ ] Probar SMS desde el Dashboard
- [ ] Integrar en flujo de órdenes reales
- [ ] Configurar Email (Sendgrid)
- [ ] Configurar Push Notifications (VAPID)
- [ ] Crear templates de notificaciones personalizados
- [ ] Configurar reglas de dealer para notificaciones automáticas

---

## 🆘 Troubleshooting

### Error: "Twilio API error: 400"
- Verifica que `TWILIO_PHONE_NUMBER` esté configurado en Supabase Secrets
- Asegúrate de que el número esté verificado en Twilio

### Error: "Dealer ID required"
- Verifica que estás pasando un `dealerId` válido al hook
- Usa `const { selectedDealerId } = useDealerContext();`

### SMS no llega:
- Verifica que el número tenga código de país (`+1` para USA)
- Revisa logs en Twilio Console
- Verifica que el número no esté bloqueado

### Error: "User not authenticated"
- Asegúrate de estar logueado
- Verifica que `user` no sea `null` en el hook

---

## 📚 Recursos Adicionales

- `SUPABASE_SECRETS_SETUP.md` - Configuración de secrets
- `TESTING_GUIA_NOTIFICACIONES.md` - Guía completa de testing
- `src/examples/order-sms-integration-example.tsx` - Ejemplos de integración
- `QUICK_START_UNIFICACION_NOTIFICACIONES.md` - Quick start del sistema

¡Listo para enviar SMS desde tu app! 🚀
