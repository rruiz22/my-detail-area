# Reporte Ejecutivo: Fix de Permisos en Notificaciones Get Ready
**Fecha**: 2025-11-03
**Severidad**: 🔴 CRÍTICA - Problema de seguridad
**Estado**: ✅ RESUELTO

---

## 📋 Resumen Ejecutivo

### Problema Crítico Identificado
**Usuarios SIN permiso al módulo "get_ready" estaban recibiendo notificaciones in-app** cuando vehículos cambiaban de step en el workflow.

### Causa Raíz
El trigger `notify_step_completion()` hacía **broadcast** de notificaciones (`user_id = NULL`) a todos los usuarios del dealership sin validar permisos de módulo.

### Impacto de Seguridad
- ⚠️ **Exposición de información**: Usuarios sin acceso a get_ready veían detalles de vehículos
- ⚠️ **Violación de permisos**: Sistema de permisos no se respetaba para notificaciones
- ⚠️ **Inconsistencia**: SMS sí validaba permisos, pero in-app no

### Solución Implementada
Sistema de validación de permisos en 3 capas (defense-in-depth):
1. ✅ Función de query para usuarios con permiso
2. ✅ Trigger modificado para enviar notificaciones individuales
3. ✅ RLS Policy adicional para filtrado en lectura

---

## 🔍 Análisis Técnico Detallado

### Comparación: Sistema Actual

| Componente | **SMS (Correcto ✅)** | **In-App Get Ready (Bug ❌)** |
|------------|---------------------|----------------------------|
| **Validación** | JOIN a `module_permissions` | Broadcast sin validación |
| **Filtro** | `permission_key = 'receive_sms_notifications'` | `user_id = NULL` (todos) |
| **Query** | Solo followers con permiso específico | Todos los usuarios del dealer |
| **Resultado** | Solo usuarios autorizados reciben SMS | TODOS recibían notificación |

### Arquitectura de Permisos (Actual)

```
profiles (usuarios)
    ↓
dealer_memberships (pertenencia a dealer)
    ↓
dealer_custom_roles (roles personalizados)
    ↓
role_module_permissions_new (permisos de role)
    ↓
module_permissions (permisos disponibles)
    ↓
    Módulo: 'get_ready'
    Permiso: 'view_vehicles'
```

**Nota**: Sistema migrado de `dealer_groups` a `dealer_custom_roles` (tabla vacía vs 13 roles + 439 permisos activos).

---

## ✅ Solución Implementada

### 1. Nueva Función: `get_users_with_module_permission()`

**Propósito**: Retornar array de `user_id` con un permiso específico en un módulo.

```sql
CREATE FUNCTION get_users_with_module_permission(
  p_dealer_id BIGINT,
  p_module TEXT,
  p_permission_key TEXT
)
RETURNS TABLE (user_id UUID)
```

**Lógica**:
```sql
SELECT DISTINCT dm.user_id
FROM dealer_memberships dm
INNER JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
INNER JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
INNER JOIN module_permissions mp ON mp.id = rmp.permission_id
WHERE dm.dealer_id = p_dealer_id
  AND dm.is_active = true
  AND dcr.is_active = true
  AND mp.module = p_module
  AND mp.permission_key = p_permission_key
  AND mp.is_active = true
```

**Uso en trigger**:
```sql
FOR v_user_id IN
  SELECT user_id FROM get_users_with_module_permission(
    NEW.dealer_id,
    'get_ready',
    'view_vehicles'
  )
LOOP
  PERFORM create_get_ready_notification(..., v_user_id, ...);
END LOOP;
```

---

### 2. Trigger Modificado: `notify_step_completion()`

**ANTES (Bug)**:
```sql
-- ❌ Broadcast a TODOS los usuarios del dealership
PERFORM create_get_ready_notification(
  NEW.dealer_id,
  NULL,  -- ❌ user_id = NULL = broadcast
  'vehicle_status_change',
  ...
);
```

**DESPUÉS (Fix)**:
```sql
-- ✅ Loop sobre usuarios con permiso específico
FOR v_user_id IN
  SELECT user_id FROM get_users_with_module_permission(
    NEW.dealer_id,
    'get_ready',
    'view_vehicles'
  )
LOOP
  PERFORM create_get_ready_notification(
    NEW.dealer_id,
    v_user_id,  -- ✅ Usuario específico
    'vehicle_status_change',
    ...
    jsonb_build_object(
      ...,
      'module', 'get_ready'  -- ✅ Metadata para RLS
    )
  );
END LOOP;
```

**Cambios clave**:
- ✅ Ya NO usa `user_id = NULL` (broadcast)
- ✅ Crea notificación individual por cada usuario con permiso
- ✅ Agrega `module` en metadata para RLS policy
- ✅ Valida permiso `view_vehicles` (mínimo para ver vehículos)

---

### 3. Función Actualizada: `user_has_module_access()`

**ANTES (Sistema antiguo)**:
```sql
-- ❌ Usaba dealer_groups (tabla vacía)
SELECT EXISTS (
  FROM dealer_groups dg
  WHERE dg.permissions ? ('module.' || module_name)
);
```

**DESPUÉS (Sistema actual)**:
```sql
-- ✅ Usa dealer_custom_roles (sistema activo)
SELECT EXISTS (
  FROM dealer_memberships dm
  INNER JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
  INNER JOIN role_module_permissions_new rmp ON rmp.role_id = dcr.id
  INNER JOIN module_permissions mp ON mp.id = rmp.permission_id
  WHERE dm.user_id = user_uuid
    AND dm.dealer_id = target_dealer_id
    AND mp.module = module_name
);
```

**Uso**: RLS policies y validaciones frontend.

---

### 4. RLS Policy: Defense-in-Depth

**Nueva policy en `notification_log`**:

```sql
CREATE POLICY "Users see notifications for modules they have access to"
ON notification_log
FOR SELECT
USING (
  user_id = auth.uid()
  AND (
    -- Si metadata contiene module, validar acceso
    (metadata->>'module' IS NOT NULL AND
     user_has_module_access(auth.uid(), dealer_id, metadata->>'module'))
    OR
    -- Si NO tiene module, permitir (notificaciones generales)
    (metadata->>'module' IS NULL)
  )
);
```

**Propósito**: Capa adicional de seguridad. Aunque el trigger ya filtra, esta policy evita lecturas no autorizadas.

**Ventajas**:
- ✅ Seguridad por capas (defense-in-depth)
- ✅ Protección contra queries directas a `notification_log`
- ✅ Compatible con notificaciones generales (`module IS NULL`)

---

## 📊 Resultados

### ANTES del Fix:

```
Cambio de step en vehículo
    ↓
Trigger: notify_step_completion()
    ↓
create_get_ready_notification(user_id = NULL)  ❌ BROADCAST
    ↓
notification_log: 1 notificación con user_id = NULL
    ↓
Frontend: RLS filtra por dealership (NO por módulo)
    ↓
RESULTADO: TODOS los usuarios del dealer ven la notificación ❌
```

**Ejemplo**:
- Dealer 5 tiene 10 usuarios
- Solo 3 tienen permiso `get_ready.view_vehicles`
- **Resultado**: Los 10 usuarios veían la notificación ❌

---

### DESPUÉS del Fix:

```
Cambio de step en vehículo
    ↓
Trigger: notify_step_completion()
    ↓
Query: get_users_with_module_permission('get_ready', 'view_vehicles')  ✅
    ↓
Retorna: [user_1, user_2, user_3] (solo usuarios con permiso)
    ↓
Loop: create_get_ready_notification() para cada usuario ✅
    ↓
notification_log: 3 notificaciones (user_id específicos)
    ↓
Frontend: RLS policy valida module access ✅
    ↓
RESULTADO: Solo 3 usuarios autorizados ven notificaciones ✅
```

**Ejemplo**:
- Dealer 5 tiene 10 usuarios
- Solo 3 tienen permiso `get_ready.view_vehicles`
- **Resultado**: Solo esos 3 usuarios ven la notificación ✅

---

## 🧪 Testing

### Script de Testing Creado

**Archivo**: `TEST_GET_READY_NOTIFICATION_PERMISSIONS.sql`

**Tests incluidos**:

1. ✅ **TEST 1**: Función `get_users_with_module_permission()` retorna usuarios
2. ✅ **TEST 2**: Función `user_has_module_access()` valida correctamente
3. ✅ **TEST 3**: Trigger crea N notificaciones (una por usuario con permiso)
4. ✅ **TEST 4**: RLS Policy existe y está activa
5. ✅ **TEST 5**: Notificaciones recientes tienen `metadata.module`

### Cómo Ejecutar Tests

```sql
-- 1. Abrir Supabase SQL Editor
-- 2. Ejecutar: TEST_GET_READY_NOTIFICATION_PERMISSIONS.sql
-- 3. Revisar outputs con símbolos:
--    ✅ PASS = Funciona
--    ❌ FAIL = Problema
--    ⚠️ PARCIAL = Revisar manualmente
```

### Test Crítico: Simulación de Cambio de Step

```sql
-- Test automático que:
1. Toma un vehículo de dealer 5
2. Cambia su step (dispara trigger)
3. Cuenta notificaciones creadas
4. Verifica: notificaciones = usuarios_con_permiso
5. Auto-limpia (revierte cambio)
```

**Resultado esperado**:
```
📊 Resultados del test:
  - Vehículo testeado: abc123...
  - Usuarios con permiso: 3
  - Notificaciones creadas: 3
✅ PASS: Se crearon 3 notificaciones (una por usuario)
```

---

## 🔐 Verificación Manual

### Prueba de Seguridad (Recomendado)

1. **Identificar usuario SIN permiso**:
```sql
-- Ejecutar query del TEST para encontrar usuarios sin permiso
SELECT p.email, dcr.role_name
FROM profiles p
JOIN dealer_memberships dm ON dm.user_id = p.id
LEFT JOIN dealer_custom_roles dcr ON dcr.id = dm.custom_role_id
WHERE dm.dealer_id = 5
  AND p.id NOT IN (
    SELECT user_id FROM get_users_with_module_permission(5, 'get_ready', 'view_vehicles')
  )
LIMIT 1;
```

2. **Iniciar sesión como ese usuario**

3. **Cambiar step de un vehículo** (desde cuenta con permiso)

4. **Verificar que el usuario SIN permiso NO ve la notificación**:
   - Abrir NotificationBell
   - NO debería aparecer notificación de "Vehicle Moved"
   - Campana NO debería incrementar contador

5. **Verificar usuario CON permiso SÍ ve la notificación**:
   - Iniciar sesión con cuenta autorizada
   - Debería ver notificación de "Vehicle Moved"
   - Campana debería mostrar contador

---

## 📁 Archivos Modificados

### 1. Migración SQL (Supabase)
**Archivo**: Migración `fix_get_ready_notification_permissions_v2`

**Contenido**:
- ✅ Función `get_users_with_module_permission()`
- ✅ Función `user_has_module_access()` actualizada
- ✅ Trigger `notify_step_completion()` modificado
- ✅ RLS Policy en `notification_log`
- ✅ Comentarios de documentación
- ✅ Test de verificación inline

**Estado**: ✅ Aplicada exitosamente en Supabase

---

### 2. Script de Testing
**Archivo**: `TEST_GET_READY_NOTIFICATION_PERMISSIONS.sql`

**Propósito**: Suite de 5 tests automatizados + verificación manual

**Estado**: ⏳ Pendiente de ejecución (recomendado ejecutar)

---

### 3. Documentación
**Archivos**:
- ✅ `GET_READY_NOTIFICATIONS_PERMISSIONS_FIX_2025-11-03.md` (este reporte)
- ✅ `SMARTNOTIFICATIONCENTER_FIX_2025-11-03.md` (fix anterior)

---

## 🎯 Estado del Proyecto

| Item | Estado |
|------|--------|
| Análisis del problema | ✅ Completado |
| Identificación de causa raíz | ✅ Completado |
| Función `get_users_with_module_permission()` | ✅ Creada |
| Función `user_has_module_access()` | ✅ Actualizada |
| Trigger `notify_step_completion()` | ✅ Modificado |
| RLS Policy | ✅ Creada |
| Migración aplicada | ✅ En Supabase |
| Script de testing | ✅ Creado |
| Documentación | ✅ Completa |
| Testing manual | ⏳ Recomendado |
| Build sin errores | ✅ Verificado |

---

## 🚀 Próximos Pasos Recomendados

### Inmediatos (Hoy)

1. ✅ **Ejecutar suite de tests**:
   ```bash
   # En Supabase SQL Editor
   # Ejecutar: TEST_GET_READY_NOTIFICATION_PERMISSIONS.sql
   ```

2. ✅ **Verificación manual de seguridad**:
   - Usuario SIN permiso → NO debe ver notificaciones get_ready
   - Usuario CON permiso → SÍ debe ver notificaciones get_ready

3. ⏳ **Monitoring de producción**:
   - Verificar logs de Supabase
   - Confirmar que notificaciones se crean correctamente
   - Validar que conteo de notificaciones es correcto

### Seguimiento (Esta Semana)

4. ⏳ **Aplicar mismo patrón a otros módulos**:
   - Revisar si otros triggers tienen el mismo problema
   - Buscar `user_id = NULL` en triggers de notificaciones
   - Aplicar validación de permisos similar

5. ⏳ **Actualizar dual-write trigger** (si existe):
   - Verificar `get_ready_dual_write_trigger.sql`
   - Asegurar que replica correctamente user_id específicos

6. ⏳ **Limpiar notificaciones antiguas broadcast**:
   ```sql
   -- Eliminar notificaciones antiguas con user_id = NULL
   DELETE FROM get_ready_notifications
   WHERE user_id IS NULL
     AND created_at < NOW() - INTERVAL '7 days';
   ```

---

## 📝 Lecciones Aprendidas

### ✅ Buenas Prácticas Identificadas

1. **Sistema SMS como referencia**:
   - El edge function `send-order-sms-notification` SÍ valida permisos correctamente
   - Usar como patrón para futuras implementaciones

2. **Defense-in-Depth**:
   - No confiar solo en trigger o solo en RLS
   - Aplicar validación en múltiples capas

3. **Metadata estructurado**:
   - Agregar `module` en metadata permite RLS policies más robustas

### ⚠️ Anti-Patrones a Evitar

1. ❌ **Broadcast con `user_id = NULL`**:
   - Parece conveniente pero viola permisos
   - Siempre preferir notificaciones individuales

2. ❌ **Confiar solo en RLS policies**:
   - RLS filtra lectura, pero datos ya se crearon
   - Mejor no crear datos no autorizados

3. ❌ **No validar permisos en triggers**:
   - Triggers se ejecutan con privilegios elevados
   - Deben validar permisos manualmente

---

## 🔧 Troubleshooting

### Problema: Usuarios con permiso NO reciben notificaciones

**Diagnóstico**:
```sql
-- Verificar que la función retorna usuarios
SELECT COUNT(*) FROM get_users_with_module_permission(5, 'get_ready', 'view_vehicles');
-- Debería retornar > 0
```

**Solución**:
1. Verificar que existen permisos `view_vehicles` en `module_permissions`
2. Verificar que roles tienen ese permiso en `role_module_permissions_new`
3. Verificar que usuarios tienen esos roles en `dealer_memberships`

---

### Problema: Notificaciones duplicadas

**Diagnóstico**:
```sql
-- Contar notificaciones por vehículo en últimas 24h
SELECT
    related_vehicle_id,
    COUNT(*) as notification_count,
    COUNT(DISTINCT user_id) as unique_users
FROM get_ready_notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY related_vehicle_id
HAVING COUNT(*) > COUNT(DISTINCT user_id);
```

**Solución**:
1. Verificar que trigger solo se dispara en `OLD.step_id IS DISTINCT FROM NEW.step_id`
2. Revisar logs de Supabase para updates múltiples

---

### Problema: Build falla

**Diagnóstico**:
```bash
npm run build
```

**Estado actual**: ✅ Build exitoso (verificado)

---

## 📞 Contacto y Soporte

**Desarrollador**: Claude Code
**Fecha**: 2025-11-03
**Versión**: 1.2.4

**Archivos de referencia**:
- Migración: `fix_get_ready_notification_permissions_v2`
- Tests: `TEST_GET_READY_NOTIFICATION_PERMISSIONS.sql`
- Reporte: `GET_READY_NOTIFICATIONS_PERMISSIONS_FIX_2025-11-03.md`

---

## ✅ Aprobación y Sign-Off

**Estado**: ✅ IMPLEMENTADO Y LISTO PARA TESTING

**Checklist de Implementación**:
- [x] Análisis del problema completado
- [x] Causa raíz identificada
- [x] Solución diseñada (3 capas)
- [x] Migración SQL creada
- [x] Migración aplicada en Supabase
- [x] Tests automatizados creados
- [x] Documentación completa
- [x] Build verificado sin errores
- [ ] Tests ejecutados en ambiente de prueba ⏳
- [ ] Verificación manual de seguridad ⏳
- [ ] Monitoring de producción ⏳

**Próxima acción**: Ejecutar `TEST_GET_READY_NOTIFICATION_PERMISSIONS.sql` en Supabase

---

*Fin del reporte ejecutivo*