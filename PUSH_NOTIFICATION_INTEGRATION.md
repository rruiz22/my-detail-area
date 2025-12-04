# 🔔 Push Notification Integration - useStatusPermissions.tsx

## Ubicación
**Archivo**: `src/hooks/useStatusPermissions.tsx`
**Línea**: Después de la línea 214 (después del bloque de SMS, antes del bloque de Slack)

## Código a Agregar

```typescript
        // 🔔 PUSH NOTIFICATION: Send push notification to followers
        try {
          console.log(`🔔 [PUSH] Sending push notification for status change to "${newStatus}"`);

          const { pushNotificationHelper } = await import('@/services/pushNotificationHelper');

          // Send push notification asynchronously (don't block the status update)
          pushNotificationHelper.notifyOrderStatusChange(
            orderId,
            currentOrder.order_number || orderId,
            newStatus,
            `${enhancedUser.first_name} ${enhancedUser.last_name}`.trim() || 'A team member'
          ).catch(error => {
            console.error('[PUSH] Failed to send push notification (non-critical):', error);
          });

          console.log('✅ [PUSH] Push notification triggered successfully');
        } catch (error) {
          console.error('[PUSH] Error triggering push notification (non-critical):', error);
        }
```

## Contexto

### ANTES:
```typescript
        } else {
          console.log(`ℹ️ [SMS] Status changed to "${newStatus}" - SMS not sent (only sent for "completed" status in ${module})`);
        }

        // 📤 SLACK NOTIFICATION: Status Changed
        console.log('🔍 [DEBUG] Checking Slack for status change:', {
```

### DESPUÉS:
```typescript
        } else {
          console.log(`ℹ️ [SMS] Status changed to "${newStatus}" - SMS not sent (only sent for "completed" status in ${module})`);
        }

        // 🔔 PUSH NOTIFICATION: Send push notification to followers
        try {
          console.log(`🔔 [PUSH] Sending push notification for status change to "${newStatus}"`);

          const { pushNotificationHelper } = await import('@/services/pushNotificationHelper');

          // Send push notification asynchronously (don't block the status update)
          pushNotificationHelper.notifyOrderStatusChange(
            orderId,
            currentOrder.order_number || orderId,
            newStatus,
            `${enhancedUser.first_name} ${enhancedUser.last_name}`.trim() || 'A team member'
          ).catch(error => {
            console.error('[PUSH] Failed to send push notification (non-critical):', error);
          });

          console.log('✅ [PUSH] Push notification triggered successfully');
        } catch (error) {
          console.error('[PUSH] Error triggering push notification (non-critical):', error);
        }

        // 📤 SLACK NOTIFICATION: Status Changed
        console.log('🔍 [DEBUG] Checking Slack for status change:', {
```

## Instrucciones de Instalación Manual

1. **Abre** `src/hooks/useStatusPermissions.tsx` en tu editor
2. **Busca** la línea 214 que contiene:
   ```typescript
   } else {
     console.log(`ℹ️ [SMS] Status changed to "${newStatus}" - SMS not sent (only sent for "completed" status in ${module})`);
   }
   ```
3. **Desplázate** después del cierre `}` (línea 214)
4. **Verás** un comentario que dice `// 📤 SLACK NOTIFICATION: Status Changed`
5. **Inserta** el bloque de código de push notifications ANTES de ese comentario
6. **Guarda** el archivo
7. **Verifica** que no haya errores de sintaxis

## Características

- ✅ **Asíncrono**: No bloquea la actualización de status
- ✅ **Non-blocking**: Si falla, no rompe el flujo principal
- ✅ **Logging completo**: Console logs para debugging
- ✅ **Error handling**: Try-catch para evitar crashes
- ✅ **Dynamic import**: Carga lazy del helper para mejor performance
- ✅ **User info**: Incluye nombre del usuario que hizo el cambio

## Qué hace este código

1. **Importa dinámicamente** el `pushNotificationHelper` (lazy loading)
2. **Llama** a `notifyOrderStatusChange()` con:
   - `orderId`: ID de la orden
   - `orderNumber`: Número de orden legible (ej: "ABC123")
   - `newStatus`: Nuevo estado de la orden
   - `changedBy`: Nombre completo del usuario que hizo el cambio
3. **Envía notificación** a todos los followers de la orden que tengan:
   - Token FCM activo
   - `notification_level != 'none'`
   - `user_preferences.notification_push = true`
4. **No espera** el resultado (fire-and-forget) para no bloquear
5. **Captura errores** silenciosamente (non-critical)

## Testing

Después de agregar el código:

```bash
# 1. Inicia el dev server
npm run dev

# 2. Abre la app en http://localhost:8080

# 3. Cambia el status de una orden

# 4. Verifica en la consola del navegador:
#    🔔 [PUSH] Sending push notification for status change to "completed"
#    ✅ [PUSH] Push notification triggered successfully

# 5. Si tienes push notifications habilitadas, deberías recibir la notificación
```

## Próximos Pasos

Una vez agregado este código, el sistema enviará push notifications automáticamente cuando:
- Una orden cambie de estado
- El usuario que recibe es follower de la orden
- El usuario tiene push notifications habilitadas
- El usuario tiene un token FCM activo

Para probar end-to-end:
1. Habilita push notifications en Settings → Notifications
2. Sigue una orden (become follower)
3. Cambia el status de esa orden
4. Deberás recibir una push notification 🔔
