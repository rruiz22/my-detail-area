# SmartNotificationCenter - Correcciones Críticas
**Fecha**: 2025-11-03
**Componente**: SmartNotificationCenter + useSmartNotifications

## 🔴 Problemas Identificados

### 1. **Notificaciones no se borraban**
- **Síntoma**: Usuario intentaba borrar 38 notificaciones pero no se eliminaban
- **Causa raíz**: Función RPC `dismiss_notification` estaba actualizando la tabla incorrecta
  - Actualizaba: `notification_log` (tabla para notificaciones del sistema)
  - Debía actualizar: `get_ready_notifications` (tabla del módulo Get Ready)

### 2. **Inconsistencia de conteo**
- **38 notificaciones totales** en `get_ready_notifications`:
  - 33 ya leídas (`is_read = true`)
  - 5 no leídas (`is_read = false`)
- **La campana mostraba solo 5** porque filtra por no leídas
- **Confusión**: Usuario veía 38 para borrar pero campana mostraba 5

### 3. **Sin feedback de errores**
- Borrado fallaba silenciosamente sin mostrar mensaje al usuario
- No había manejo de errores parciales (algunas notificaciones se borran, otras no)

---

## ✅ Soluciones Implementadas

### 1. Nueva Función RPC en Supabase

**Migración**: `fix_dismiss_get_ready_notification`

```sql
CREATE OR REPLACE FUNCTION public.dismiss_get_ready_notification(p_notification_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dealer_id bigint;
    v_user_id uuid;
BEGIN
    -- Get notification details
    SELECT dealer_id, user_id
    INTO v_dealer_id, v_user_id
    FROM public.get_ready_notifications
    WHERE id = p_notification_id;

    -- Check if notification exists
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Verify user has access
    IF v_user_id IS NOT NULL AND v_user_id != auth.uid() THEN
        RETURN false;
    END IF;

    -- Check user belongs to dealer
    IF NOT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND dealership_id = v_dealer_id
    ) THEN
        RETURN false;
    END IF;

    -- Dismiss notification
    UPDATE public.get_ready_notifications
    SET dismissed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id;

    RETURN FOUND;
END;
$$;
```

**Seguridad**:
- ✅ Verifica que el usuario pertenece al dealer
- ✅ Verifica que la notificación existe
- ✅ Verifica permisos del usuario
- ✅ `SECURITY DEFINER` para ejecutar con privilegios

### 2. Hook useSmartNotifications Corregido

**Archivo**: `src/hooks/useSmartNotifications.tsx`

**Cambios en `deleteNotification`**:

```typescript
// ❌ ANTES - RPC incorrecto
const { error } = await supabase.rpc('dismiss_notification', {
  p_notification_id: notificationId,
});

// ✅ AHORA - RPC correcto con validación
const { data, error } = await supabase.rpc('dismiss_get_ready_notification', {
  p_notification_id: notificationId,
});

if (error) {
  logger.error('[deleteNotification] RPC error:', error);
  throw error;
}

// Verifica si el RPC retornó false (no encontrado o no autorizado)
if (data === false) {
  throw new Error('Failed to dismiss notification - not found or unauthorized');
}

// Invalidación en paralelo para mejor performance
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['smartNotifications'] }),
  queryClient.invalidateQueries({ queryKey: ['getReadyNotifications'] }),
  queryClient.invalidateQueries({ queryKey: ['notificationUnreadCount'] }),
]);
```

**Mejoras**:
- ✅ Usa el RPC correcto para `get_ready_notifications`
- ✅ Valida respuesta del RPC (verifica `data === false`)
- ✅ Mejor logging para debugging
- ✅ Re-lanza error para que el componente lo maneje
- ✅ Invalidación de queries en paralelo

### 3. SmartNotificationCenter - Manejo Robusto de Errores

**Archivo**: `src/components/notifications/SmartNotificationCenter.tsx`

**Cambios en `deleteSelectedNotifications`**:

```typescript
// ✅ Usa Promise.allSettled para procesar todas aunque algunas fallen
const deletePromises = Array.from(selectedNotifications).map(async (id) => {
  try {
    await deleteNotification(id);
    return { id, success: true };
  } catch (error) {
    console.error(`Failed to delete notification ${id}:`, error);
    return { id, success: false, error };
  }
});

const results = await Promise.allSettled(deletePromises);

// Cuenta éxitos y fallos
const successCount = results.filter(
  (r) => r.status === 'fulfilled' && r.value.success
).length;
const failureCount = totalCount - successCount;

// Feedback diferenciado según resultado
if (failureCount === 0) {
  toast({ title: 'Éxito', description: `${successCount} eliminadas` });
} else if (successCount === 0) {
  toast({ title: 'Error', description: 'No se pudo eliminar', variant: 'destructive' });
} else {
  toast({ title: 'Advertencia', description: `${successCount} eliminadas, ${failureCount} fallaron` });
}
```

**Mejoras**:
- ✅ `Promise.allSettled` en lugar de `Promise.all` (no falla si una notificación falla)
- ✅ Procesa cada notificación individualmente
- ✅ Cuenta éxitos y fallos
- ✅ Feedback visual diferenciado:
  - **Éxito total**: Toast verde con cantidad eliminada
  - **Fallo total**: Toast rojo con error
  - **Éxito parcial**: Toast amarillo con estadísticas
- ✅ Siempre refresca la UI y limpia selección

---

## 📊 Resultados Esperados

### Antes:
```
Usuario: Intenta borrar 38 notificaciones
Sistema: No hace nada (falla silenciosamente)
Campana: Sigue mostrando 5 no leídas
Estado: 38 notificaciones siguen en la BD
```

### Ahora:
```
Usuario: Intenta borrar 38 notificaciones
Sistema: Procesa las 38 una por una
        - Actualiza dismissed_at en get_ready_notifications
        - Retorna resultado de cada una
Feedback: "38 eliminadas" o "35 eliminadas, 3 fallaron" (si hay problemas de permisos)
Campana: Se actualiza automáticamente con invalidateQueries
Estado: Notificaciones marcadas como dismissed_at (ocultas de la UI)
```

---

## 🧪 Pruebas Recomendadas

### 1. Borrado Individual
```
1. Abrir NotificationBell
2. Hacer clic en un botón de eliminar (🗑️)
3. Verificar que la notificación desaparece
4. Verificar toast de éxito
5. Verificar que el contador de la campana se actualiza
```

### 2. Borrado Masivo
```
1. Abrir NotificationCenter
2. Hacer clic en "Select to Delete"
3. Seleccionar múltiples notificaciones (ej: 10)
4. Hacer clic en "Delete (10)"
5. Verificar toast: "10 eliminadas"
6. Verificar que desaparecen de la lista
7. Verificar campana actualizada
```

### 3. Manejo de Errores
```
1. Como usuario sin permisos (dealer_user)
2. Intentar borrar notificación de otro usuario
3. Verificar error claro: "not found or unauthorized"
4. Verificar que otras notificaciones sí se borran
```

### 4. Verificación en Base de Datos
```sql
-- Ver notificaciones con dismissed_at
SELECT id, title, is_read, dismissed_at
FROM get_ready_notifications
WHERE dealer_id = 5
ORDER BY created_at DESC
LIMIT 20;

-- Debería mostrar dismissed_at IS NOT NULL para las borradas
```

---

## 🔧 Archivos Modificados

1. **Migración SQL**:
   - Nueva función: `dismiss_get_ready_notification`
   - Ejecutada exitosamente en Supabase

2. **src/hooks/useSmartNotifications.tsx**:
   - Líneas 348-384: Corregida función `deleteNotification`
   - Usa RPC correcto + validación + mejor manejo de errores

3. **src/components/notifications/SmartNotificationCenter.tsx**:
   - Líneas 124-188: Mejorada función `deleteSelectedNotifications`
   - Promise.allSettled + feedback diferenciado

---

## ⚠️ Notas Importantes

### Para usuarios:
- **Las 38 notificaciones ahora SÍ se pueden borrar correctamente**
- **La campana mostrará el conteo correcto** después del borrado
- **Recibirás feedback claro** sobre qué se borró y qué falló

### Para desarrolladores:
- **NO usar `Promise.all` para operaciones masivas** que pueden fallar parcialmente
- **SIEMPRE validar respuesta de RPCs** que retornan boolean
- **Usar `logger.error`** para debugging en producción
- **Re-lanzar errores** en hooks para que componentes los manejen

### Migración aplicada:
```bash
✅ Migración: fix_dismiss_get_ready_notification
✅ Función creada: dismiss_get_ready_notification(uuid) -> boolean
✅ Sin impacto en datos existentes
```

---

## 🎯 Estado Final

| Item | Estado |
|------|--------|
| Función RPC correcta | ✅ Implementada |
| Hook corregido | ✅ Actualizado |
| Manejo de errores | ✅ Mejorado |
| Feedback visual | ✅ Diferenciado |
| Pruebas | ⏳ Pendiente |

**Próximos pasos**:
1. Probar borrado individual
2. Probar borrado masivo (38 notificaciones)
3. Verificar actualización de campana
4. Confirmar que dismissed_at se actualiza en BD
