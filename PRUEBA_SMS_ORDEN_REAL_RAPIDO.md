# 🚀 Prueba Rápida: SMS en Orden Real

## ✅ Lo que ya funciona:
- ✅ SMS básico (ya probado con el botón de prueba)
- ✅ Servicio creado (`orderSMSService.ts`)
- ✅ Followers automáticos en órdenes

---

## 🎯 Prueba RÁPIDA en 3 Pasos

### **Paso 1: Agrega tu teléfono a tu perfil**

```sql
-- En Supabase SQL Editor:
UPDATE profiles
SET phone = '+17744108962'  -- TU NÚMERO
WHERE id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';  -- Tu user ID
```

**Verifica:**
```sql
SELECT first_name, last_name, phone, email
FROM profiles
WHERE id = '122c8d5b-e5f5-4782-a179-544acbaaceb9';
```

---

### **Paso 2: Crea una orden de prueba (o usa una existente)**

**Opción A - Crear nueva orden de prueba:**
```sql
-- Crea una orden y automáticamente serás follower (porque la creaste)
INSERT INTO sales_orders (
  dealer_id,
  order_number,
  customer_name,
  status,
  make,
  model,
  year,
  created_by
) VALUES (
  5, -- Tu dealer ID (BMW of Sudbury)
  'TEST-SMS-' || floor(random() * 10000),
  'Cliente Prueba SMS',
  'in_progress',
  'BMW',
  'X5',
  '2023',
  '122c8d5b-e5f5-4782-a179-544acbaaceb9' -- Tu user ID
)
RETURNING id, order_number;
```

**Opción B - Usa una orden existente:**
```sql
-- Agrégate como follower a una orden existente
SELECT id, order_number FROM sales_orders WHERE dealer_id = 5 LIMIT 5;

-- Copia el ID de una orden y ejecuta:
INSERT INTO entity_followers (
  entity_type,
  entity_id,
  user_id,
  dealer_id,
  follow_type,
  notification_level,
  is_active,
  followed_by
) VALUES (
  'order',
  'ORDEN-ID-AQUI', -- ⚠️ Reemplaza con ID real de la orden
  '122c8d5b-e5f5-4782-a179-544acbaaceb9',
  5,
  'interested',
  'all', -- 👈 Recibirás TODAS las notificaciones
  true,
  '122c8d5b-e5f5-4782-a179-544acbaaceb9'
);
```

---

### **Paso 3: Prueba desde la Consola del Navegador**

1. **Abre tu app** (http://localhost:8080)

2. **Abre DevTools** (F12)

3. **Ve a la pestaña Console**

4. **Copia y pega esto:**

```javascript
// Import el servicio
const { orderSMSService } = await import('/src/services/orderSMSService.ts');

// PRUEBA 1: Notificar orden completada
const result = await orderSMSService.notifyOrderCompleted(
  'ORDEN-ID-AQUI', // ⚠️ Reemplaza con tu orden ID
  'TEST-SMS-1234',
  '2023 BMW X5'
);

console.log('Resultado:', result);
// Deberías ver: {sent: 1, failed: 0, total: 1, errors: []}
```

5. **Espera 5-10 segundos** → ¡Deberías recibir el SMS! 📱

---

## 📱 Ejemplo del SMS que Recibirás:

```
🎉 Order TEST-SMS-1234 (2023 BMW X5) has been completed and is ready!

Order: TEST-SMS-1234
```

---

## 🔍 Verificación

### **Ver tus followers actuales:**
```sql
SELECT
  ef.entity_id as order_id,
  ef.notification_level,
  ef.follow_type,
  p.first_name,
  p.last_name,
  p.phone
FROM entity_followers ef
JOIN profiles p ON ef.user_id = p.id
WHERE ef.entity_type = 'order'
  AND ef.user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
  AND ef.is_active = true;
```

### **Ver órdenes donde eres follower:**
```sql
SELECT
  so.id,
  so.order_number,
  so.customer_name,
  so.status,
  ef.notification_level,
  ef.follow_type
FROM sales_orders so
JOIN entity_followers ef ON ef.entity_id = so.id AND ef.entity_type = 'order'
WHERE ef.user_id = '122c8d5b-e5f5-4782-a179-544acbaaceb9'
  AND ef.is_active = true;
```

---

## 🎯 Probar Otros Eventos

### **Cambio de Estado:**
```javascript
const result = await orderSMSService.notifyStatusChange(
  'orden-id',
  'TEST-SMS-1234',
  'completed'
);
```

### **Evento Crítico:**
```javascript
const result = await orderSMSService.notifyCriticalEvent(
  'orden-id',
  'TEST-SMS-1234',
  'Retraso de 2 horas por falta de piezas'
);
```

**SMS que recibirás:**
```
⚠️ URGENT: Order TEST-SMS-1234 - Retraso de 2 horas por falta de piezas

Order: TEST-SMS-1234
```

### **Asignación:**
```javascript
const result = await orderSMSService.notifyAssignment(
  'orden-id',
  'TEST-SMS-1234',
  'Juan Pérez'
);
```

---

## ❓ Troubleshooting

### **"No eligible followers found"**
✅ **Solución:**
```sql
-- Verifica que tienes teléfono
SELECT phone FROM profiles WHERE id = 'tu-user-id';

-- Verifica que eres follower
SELECT * FROM entity_followers
WHERE user_id = 'tu-user-id'
AND entity_id = 'orden-id';
```

### **"SMS sent to 0 followers"**
Significa que:
- ❌ No hay followers con teléfono
- ❌ O el nivel de notificación no coincide

**Solución:**
```sql
-- Cambia tu nivel a "all" para recibir todo
UPDATE entity_followers
SET notification_level = 'all'
WHERE user_id = 'tu-user-id';
```

### **SMS no llega pero dice "sent: 1"**
- ⏰ Espera 10-30 segundos
- 📱 Verifica el número tenga código de país (+1)
- 🔍 Revisa Twilio Console para el status real

---

## 📊 Ver Resultados en Tiempo Real

```javascript
// Ejecuta en consola mientras pruebas:
const { orderSMSService } = await import('/src/services/orderSMSService.ts');

// Función helper para probar fácilmente
window.testOrderSMS = async (orderId, orderNumber) => {
  console.log('🧪 Testing SMS for order:', orderNumber);

  const result = await orderSMSService.notifyOrderCompleted(
    orderId,
    orderNumber,
    'Test Vehicle'
  );

  console.log('📊 Results:', {
    sent: result.sent,
    failed: result.failed,
    total: result.total
  });

  if (result.errors.length > 0) {
    console.error('❌ Errors:', result.errors);
  } else {
    console.log('✅ All SMS sent successfully!');
  }

  return result;
};

// Ahora puedes usar:
testOrderSMS('orden-id', 'ORD-12345');
```

---

## 🎉 Siguiente Paso

Una vez que confirmes que funciona:

1. **Integra en tus componentes reales** (ver `ORDER_SMS_INTEGRATION_GUIDE.md`)
2. **Agrega teléfonos** a más usuarios de tu equipo
3. **Prueba en órdenes reales** de producción
4. **Configura workflows** para notificaciones automáticas

---

## 📝 Comandos Rápidos (Copy-Paste)

```sql
-- 1. Agregar tu teléfono
UPDATE profiles SET phone = '+17744108962' WHERE email = 'tu-email@ejemplo.com';

-- 2. Ver tus órdenes
SELECT id, order_number, status FROM sales_orders WHERE dealer_id = 5 LIMIT 5;

-- 3. Agregar como follower
INSERT INTO entity_followers (entity_type, entity_id, user_id, dealer_id, follow_type, notification_level, is_active, followed_by)
VALUES ('order', 'ORDEN-ID', 'USER-ID', 5, 'interested', 'all', true, 'USER-ID');

-- 4. Ver followers de una orden
SELECT * FROM entity_followers WHERE entity_type = 'order' AND entity_id = 'ORDEN-ID';
```

---

**¿Listo para probarlo?** 🚀

¡Cuéntame si te llega el SMS! 📱✨
