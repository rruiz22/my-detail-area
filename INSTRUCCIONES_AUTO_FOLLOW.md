# 📋 Instrucciones: Sistema de Auto-Follow + Notificaciones SMS

## 🎯 ¿Qué hace este sistema?

Este sistema permite:

1. **Auto-Follow Automático:** Cuando se crea una orden, automáticamente se agregan como followers:
   - El creador de la orden (siempre)
   - El usuario asignado (siempre, si existe)
   - Usuarios con roles configurados para auto-follow (configurable)

2. **SMS Inteligentes:** Envía notificaciones SMS a followers:
   - Solo cuando el evento está habilitado en la configuración
   - Para cambios de status, **solo cuando el status cambia a "completed"**
   - Respeta preferencias de usuario y límites de tasa

---

## 📦 PASO 1: Aplicar Migraciones de Base de Datos

### Opción A: Dashboard de Supabase (Recomendado)

1. **Abre Supabase Dashboard:**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Ve al SQL Editor:**
   - En el menú izquierdo, haz clic en `SQL Editor`

3. **Crea una nueva query:**
   - Haz clic en `+ New query`

4. **Copia y pega el script:**
   - Abre el archivo: `APPLY_AUTO_FOLLOW_MIGRATIONS.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor

5. **Ejecuta el script:**
   - Haz clic en el botón `Run` (o presiona Ctrl+Enter)
   - Espera a que termine (debería tomar ~2 segundos)

6. **Verifica el resultado:**
   - Deberías ver un mensaje de éxito con:
     ```
     ======================================================================
     AUTO-FOLLOW NOTIFICATION SYSTEM SUCCESSFULLY INSTALLED
     ======================================================================
     ```

### Opción B: CLI de Supabase

Si prefieres usar la terminal:

```bash
# Asegúrate de estar en el directorio del proyecto
cd /path/to/mydetailarea

# Aplica las migraciones
supabase db push
```

---

## ⚙️ PASO 2: Configurar Auto-Follow en la UI

### 2.1. Acceder a la Configuración de Roles

1. **Inicia sesión** en tu aplicación como administrador

2. **Ve a Configuración de Dealer:**
   - Menú → Settings → Dealer Management
   - O ve directamente a `/settings/dealers`

3. **Selecciona Custom Roles:**
   - En la página de dealer, ve a la sección de `Custom Roles`

### 2.2. Configurar un Rol para Auto-Follow

1. **Haz clic en el icono de campana (🔔)** en cualquier rol
   - Esto abre el modal de "Notification Settings"

2. **Para cada módulo (Sales, Service, etc.):**

   a. **Habilita los eventos** que quieres que generen notificaciones:
      - `Order Created` ✓
      - `Order Assigned` ✓
      - `Status Changed` ✓
      - etc.

   b. **Selecciona los canales** (In-App, SMS, Email, Push)
      - Para SMS: marca la casilla `SMS`

   c. **Activa Auto-Follow:**
      - Al final de cada módulo, verás un toggle:
        ```
        🔔 Auto-Follow New Orders
        Automatically add users with this role as followers when new orders are created
        ```
      - Activa este toggle para los módulos donde quieras auto-follow

3. **Guarda los cambios:**
   - Haz clic en `Save` en la parte inferior del modal

### 2.3. Ejemplo de Configuración

**Para un rol "Service Manager":**

```
📋 Service Orders
  ✓ Order Created (SMS)
  ✓ Order Assigned (SMS)
  ✓ Status Changed (SMS, In-App)
  ✓ Due Date Approaching (SMS)

  🔔 Auto-Follow New Orders: ✓ ENABLED
```

Esto significa: Todos los usuarios con el rol "Service Manager" se agregarán automáticamente como followers de cada nueva orden de servicio.

---

## 📱 PASO 3: Configurar Preferencias de SMS (Usuarios)

Cada usuario puede personalizar sus preferencias de SMS:

1. **Ve a Settings → Notifications**

2. **Para cada módulo, configura:**
   - ✓ SMS Enabled: Activar/desactivar SMS para este módulo
   - Eventos específicos que quieren recibir por SMS
   - Rate Limits (máximo de SMS por hora/día)
   - Quiet Hours (horas en que no quieren recibir SMS)

---

## 🧪 PASO 4: Probar el Sistema

### Test 1: Auto-Follow al Crear Orden

1. **Configura un rol con auto-follow** (ej: "Sales Manager")
2. **Crea una orden de Sales**
3. **Verifica en la orden:**
   - Ve a la pestaña "Followers" en el detalle de la orden
   - Deberías ver:
     - El creador (tú)
     - El usuario asignado (si asignaste uno)
     - Todos los usuarios con el rol "Sales Manager"

### Test 2: SMS en Status "Completed"

1. **Asegúrate que:**
   - Tienes un rol configurado con SMS para "Status Changed"
   - El usuario tiene un número de teléfono válido
   - El usuario tiene SMS habilitado en sus preferencias

2. **Cambia el status de una orden a "In Progress":**
   - NO debería enviar SMS ❌

3. **Cambia el status de una orden a "Completed":**
   - Debería enviar SMS a todos los followers ✅

### Test 3: SMS en Order Created

1. **Crea una nueva orden**
2. **Los followers deberían recibir SMS** con el mensaje:
   ```
   ✨ New Order #SA-1234 created. Customer Name View: [link]
   ```

---

## 🔍 Verificación y Troubleshooting

### Verificar que las migraciones se aplicaron correctamente:

```sql
-- En Supabase SQL Editor, ejecuta:

-- 1. Verificar que la columna existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'dealer_notification_rules'
  AND column_name = 'auto_follow_enabled';

-- Debería retornar: auto_follow_enabled | boolean

-- 2. Verificar que el trigger existe
SELECT tgname, proname
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'orders'::regclass
  AND tgname = 'auto_add_order_creator_follower';

-- Debería retornar el trigger
```

### Ver logs del trigger:

```sql
-- Activa logs en Supabase Dashboard:
-- Settings → Database → Enable Log Explorer

-- Luego filtra por:
-- [AutoFollow]
```

### Problemas Comunes:

**❌ No se agregan followers automáticamente:**
- Verifica que el trigger existe (query arriba)
- Verifica que `created_by` está presente al crear la orden
- Revisa los logs de Supabase

**❌ No recibo SMS:**
- Verifica que el evento está habilitado en `dealer_notification_rules`
- Verifica que el canal SMS está seleccionado
- Verifica que eres follower de la orden
- Para `status_changed`: verifica que el nuevo status es "completed"
- Verifica tu número de teléfono en tu perfil
- Verifica que tienes SMS habilitado en preferencias
- Revisa que no estés en quiet hours
- Revisa que no hayas alcanzado el rate limit

**❌ Recibo demasiados SMS:**
- Ajusta tus preferencias de SMS (Settings → Notifications)
- Reduce el rate limit (ej: máximo 5 SMS por hora)
- Configura quiet hours (ej: 22:00 - 08:00)
- Desactiva eventos específicos que no necesitas

---

## 📊 Resumen del Flujo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario crea orden en Sales/Service modal               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Trigger de BD ejecuta automáticamente:                  │
│    ✓ Agrega creador como follower                          │
│    ✓ Agrega assigned user como follower                    │
│    ✓ Consulta dealer_notification_rules                    │
│    ✓ Agrega usuarios con auto_follow_enabled = true        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Frontend llama sendOrderCreatedSMS()                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Edge Function valida y envía SMS:                       │
│    ✓ Verifica dealer_notification_rules                    │
│    ✓ Obtiene followers de la orden                         │
│    ✓ Filtra por preferencias                               │
│    ✓ Verifica rate limits                                  │
│    ✓ Envía SMS vía Twilio                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 ¡Listo!

El sistema de auto-follow está configurado y funcionando. Los followers recibirán notificaciones SMS basadas en:

- ✅ Configuración de roles (auto_follow_enabled)
- ✅ Configuración de eventos (dealer_notification_rules)
- ✅ Preferencias personales de usuario
- ✅ Status "completed" para cambios de status

Si tienes problemas, revisa la sección de Troubleshooting o consulta los logs en Supabase Dashboard.













