# 🚀 START HERE - Próxima Sesión

**Fecha de última sesión**: 2025-11-01
**Tiempo invertido**: ~6 horas
**Estado**: Sistema SMS ✅ 100% | Matriz Canales 🟡 60%

---

## ⚡ QUICK STATUS CHECK (2 minutos)

Antes de continuar, verifica que el sistema SMS sigue funcionando:

### **1. Verificar Tabla Creada**
```sql
SELECT COUNT(*) as records, MAX(updated_at) as last_update
FROM dealer_notification_channel_defaults;
```
**Esperado**: `records: 1, last_update: 2025-11-01...`

### **2. Test Rápido SMS**
1. Abre la app: http://localhost:8080/sales
2. Cambia una orden a status "completed"
3. **Debería ver toast**: "📱 SMS Notification Sent - SMS sent to 1 user(s) to [nombre]"
4. **Verificar en DB**:
   ```sql
   SELECT * FROM sms_send_history
   WHERE sent_day = CURRENT_DATE
   ORDER BY sent_at DESC LIMIT 5;
   ```

✅ **Si ambos funcionan**: Continúa con Paso 1
❌ **Si algo falla**: Revisa `docs/SESSION_2025-11-01_SMS_ENTERPRISE_IMPLEMENTATION.md`

---

## 📋 PASO 1: Integrar UI Matriz en Settings (30 min)

### **Archivo a Modificar**: `src/components/settings/IntegrationSettings.tsx`

**Buscar línea ~604** (sección SMS Configuration):

```typescript
// 1. Agregar import al inicio del archivo
import { DealerChannelMatrix } from './notifications/DealerChannelMatrix';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// 2. Reemplazar el contenido actual de SMS Configuration con:
<Card>
  <CardHeader>
    <CardTitle>SMS Notifications</CardTitle>
    <CardDescription>
      Configure SMS notification settings and channel preferences
    </CardDescription>
  </CardHeader>
  <CardContent>
    <Tabs defaultValue="credentials">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="credentials">Twilio Credentials</TabsTrigger>
        <TabsTrigger value="channel-config">Event Channels</TabsTrigger>
      </TabsList>

      <TabsContent value="credentials" className="space-y-4">
        {/* Mantener contenido actual de SMS credentials */}
      </TabsContent>

      <TabsContent value="channel-config" className="space-y-4">
        <DealerChannelMatrix />
      </TabsContent>
    </Tabs>
  </CardContent>
</Card>
```

**Testing**:
1. Abre Settings → Integrations
2. Busca sección "SMS Notifications"
3. Deberías ver 2 tabs: "Twilio Credentials" | "Event Channels"
4. Click en "Event Channels"
5. ✅ Deberías ver la matriz completa

---

## 📋 PASO 2: Agregar Traducciones (30 min)

### **Archivos a Modificar**:

#### `public/translations/en.json`

Busca la sección `"settings": {` y agrega:

```json
"notifications": {
  "channel_matrix": {
    "title": "Notification Channel Configuration",
    "description": "Configure which channels send notifications for each event",
    "enable_all_in_app": "Enable All In-App",
    "enable_all_email": "Enable All Email",
    "enable_all_sms": "Enable All SMS",
    "enable_all_push": "Enable All Push",
    "reset_defaults": "Reset to Defaults",
    "unsaved_changes": "Unsaved Changes",
    "saved_successfully": "Saved",
    "save_success": "Notification configuration saved successfully",
    "save_error": "Failed to save configuration",
    "impact_preview": "Impact Preview",
    "events_enabled": "events enabled",
    "estimated_cost": "Estimated SMS cost",
    "per_month": "/month",
    "high_frequency_events": "High-frequency events with SMS",
    "validation_at_least_one": "At least one channel must be enabled for at least one event",
    "validation_too_many_sms": "Warning: SMS enabled for {{count}} events. This may result in high costs.",
    "how_it_works": "How this works",
    "priority_info": "User Preferences → Dealership Defaults → System Defaults"
  }
}
```

#### `public/translations/es.json`

```json
"notifications": {
  "channel_matrix": {
    "title": "Configuración de Canales de Notificación",
    "description": "Configura qué canales envían notificaciones para cada evento",
    "enable_all_in_app": "Habilitar Todas In-App",
    "enable_all_email": "Habilitar Todos Email",
    "enable_all_sms": "Habilitar Todos SMS",
    "enable_all_push": "Habilitar Todas Push",
    "reset_defaults": "Restaurar Valores por Defecto",
    "unsaved_changes": "Cambios Sin Guardar",
    "saved_successfully": "Guardado",
    "save_success": "Configuración de notificaciones guardada exitosamente",
    "save_error": "Error al guardar configuración",
    "impact_preview": "Vista Previa de Impacto",
    "events_enabled": "eventos habilitados",
    "estimated_cost": "Costo estimado de SMS",
    "per_month": "/mes",
    "high_frequency_events": "Eventos de alta frecuencia con SMS",
    "validation_at_least_one": "Al menos un canal debe estar habilitado para al menos un evento",
    "validation_too_many_sms": "Advertencia: SMS habilitado para {{count}} eventos. Esto puede resultar en costos altos.",
    "how_it_works": "Cómo funciona",
    "priority_info": "Preferencias de Usuario → Defaults de Dealership → Defaults del Sistema"
  }
}
```

#### `public/translations/pt-BR.json`

```json
"notifications": {
  "channel_matrix": {
    "title": "Configuração de Canais de Notificação",
    "description": "Configure quais canais enviam notificações para cada evento",
    "enable_all_in_app": "Ativar Todos In-App",
    "enable_all_email": "Ativar Todos Email",
    "enable_all_sms": "Ativar Todos SMS",
    "enable_all_push": "Ativar Todas Push",
    "reset_defaults": "Restaurar Padrões",
    "unsaved_changes": "Alterações Não Salvas",
    "saved_successfully": "Salvo",
    "save_success": "Configuração de notificações salva com sucesso",
    "save_error": "Erro ao salvar configuração",
    "impact_preview": "Prévia de Impacto",
    "events_enabled": "eventos ativados",
    "estimated_cost": "Custo estimado de SMS",
    "per_month": "/mês",
    "high_frequency_events": "Eventos de alta frequência com SMS",
    "validation_at_least_one": "Pelo menos um canal deve estar ativado para pelo menos um evento",
    "validation_too_many_sms": "Aviso: SMS ativado para {{count}} eventos. Isso pode resultar em custos altos.",
    "how_it_works": "Como funciona",
    "priority_info": "Preferências do Usuário → Padrões do Dealership → Padrões do Sistema"
  }
}
```

**Testing**: Cambiar idioma de la app y verificar textos traducidos.

---

## 📋 PASO 3: Testing Manual Completo UI (1 hora)

### **Test 1: Visualización Básica**
```
[ ] Matriz se muestra correctamente
[ ] 10 eventos listados
[ ] 4 columnas de canales (In-App, Email, SMS, Push)
[ ] Descripciones claras por evento
[ ] Badges de categoría visibles
```

### **Test 2: Interactividad**
```
[ ] Checkboxes toggle al hacer click
[ ] Estado se refleja visualmente (checked/unchecked)
[ ] Cambios activan badge "Unsaved Changes"
```

### **Test 3: Bulk Actions**
```
[ ] "Enable All In-App" → Todos los checkboxes In-App = checked
[ ] "Enable All SMS" → Todos los checkboxes SMS = checked
[ ] "Reset to Defaults" → Vuelve a configuración original
```

### **Test 4: Module Tabs**
```
[ ] Tab "Sales Orders" muestra
[ ] Tab "Service Orders" muestra
[ ] Cambiar entre tabs mantiene cambios no guardados
```

### **Test 5: Impact Preview**
```
[ ] Contador de eventos por canal actualiza en tiempo real
[ ] Costo estimado de SMS se calcula correctamente
[ ] Warnings aparecen si SMS en muchos eventos
```

### **Test 6: Save/Cancel**
```
[ ] Botón "Save" guarda en base de datos
[ ] Botón "Cancel" descarta cambios
[ ] Después de guardar, badge cambia a "Saved"
[ ] Reload de página mantiene configuración guardada
```

### **Test 7: Validaciones**
```
[ ] Intentar guardar sin ningún canal → Error
[ ] Habilitar SMS en 10 eventos → Warning de costo
[ ] Validación se muestra antes de guardar
```

### **Test 8: Permissions (RLS)**
```
[ ] Login como system_admin → Puede editar
[ ] Login como dealer_admin → Puede editar su dealer
[ ] Login como dealer_user → ¿Puede ver? (verificar RLS read policy)
```

---

## 📋 PASO 4: Modificar Edge Function con Verificación de Canal (1 hora)

### **⚠️ MÁXIMA CAUTELA**

**Antes de modificar**:
```bash
# 1. Backup
cd C:\Users\rudyr\apps\mydetailarea
cp supabase/functions/send-order-sms-notification/index.ts supabase/functions/send-order-sms-notification/index.ts.backup-v6-before-channel-check

# 2. Confirmar backup
ls -la supabase/functions/send-order-sms-notification/*.backup*
```

**Archivo**: `supabase/functions/send-order-sms-notification/index.ts`

**Modificación en función `filterByPreferences()`** (después de línea 310):

```typescript
async function filterByPreferences(
  users: SMSRecipient[],
  dealerId: number,
  module: string,
  eventType: OrderSMSEvent,
  eventData: any
): Promise<SMSRecipient[]> {

  // ============ NUEVO: Dealer Channel Config Check ============
  // Check if dealer has SMS enabled for this specific event
  const { data: dealerConfig } = await supabase
    .from('dealer_notification_channel_defaults')
    .select('event_channel_config, default_sms')
    .eq('dealer_id', dealerId)
    .eq('module', module)
    .maybeSingle();

  if (dealerConfig) {
    const eventConfig = dealerConfig.event_channel_config?.[eventType];
    const smsEnabled = eventConfig?.sms ?? dealerConfig.default_sms ?? true;

    if (!smsEnabled) {
      console.log(
        `[Dealer Channel Config] SMS disabled for event '${eventType}' ` +
        `in dealer ${dealerId}, module ${module}. Skipping all users.`
      );
      return []; // SMS not enabled at dealer level for this event
    }

    console.log(`[Dealer Channel Config] SMS enabled for event '${eventType}' in dealer ${dealerId}`);
  } else {
    console.log(`[Dealer Channel Config] No config for dealer ${dealerId}, allowing SMS (backward compatible)`);
  }
  // ============ FIN NUEVO ============

  // Continue with existing user preferences logic...
  const { data: preferences, error } = await supabase
    .from('user_sms_notification_preferences')
    .select('*')
    .in('user_id', users.map(u => u.id))
    .eq('dealer_id', dealerId)
    .eq('module', module)
    .eq('sms_enabled', true);

  // ... resto del código sin cambios ...
}
```

**Redesplegar**:
```
Via MCP Supabase: deploy_edge_function('send-order-sms-notification')
```

**Testing Post-Deploy**:
```
1. Sin cambiar nada en Settings → Cambiar estado → Debe enviar SMS (backward compatible)
2. Deshabilitar SMS para status_changed en Settings → Save
3. Cambiar estado a completed → NO debe enviar SMS
4. Ver logs: Debe mostrar "[Dealer Channel Config] SMS disabled for event 'status_changed'"
5. Habilitar SMS para status_changed → Save
6. Cambiar estado → Debe enviar SMS
7. Ver logs: "[Dealer Channel Config] SMS enabled for event 'status_changed'"
```

---

## 📋 PASO 5: Testing Exhaustivo (2 horas)

### **Test Matrix Completa**

| Test # | Dealer Config | User Pref | Global SMS | Resultado | Validar |
|--------|---------------|-----------|------------|-----------|---------|
| 1 | SMS: ✓ | SMS: ✓ | ✓ | ✅ Envía | Log + DB + Toast |
| 2 | SMS: ✗ | SMS: ✓ | ✓ | ❌ No envía | Log "disabled at dealer level" |
| 3 | SMS: ✓ | SMS: ✗ | ✓ | ❌ No envía | Log "user opt-out" |
| 4 | NULL | SMS: ✓ | ✓ | ✅ Envía | Log "backward compatible" |
| 5 | SMS: ✓ | NULL | ✓ | ❌ No envía | Log "no preferences" |

### **Test de Cost Preview**

```sql
-- Configurar 3 eventos con SMS
-- Verificar costo estimado muestra ~$XX.XX
-- Configurar 10 eventos con SMS
-- Verificar warning aparece
```

### **Test de RLS**

```sql
-- Como dealer_admin de dealer 5
SELECT * FROM dealer_notification_channel_defaults WHERE dealer_id = 5;
-- Debe permitir

-- Como dealer_user (no admin)
UPDATE dealer_notification_channel_defaults
SET event_channel_config = '{}'::jsonb
WHERE dealer_id = 5;
-- Debe bloquear (RLS)
```

---

## 📋 PASO 6: Documentación Final (30 min)

### **Crear archivo**: `docs/DEALER_CHANNEL_MATRIX_GUIDE.md`

**Contenido**:
- Cómo acceder a Settings → Integrations → SMS → Event Channels
- Explicación de cada canal
- Mejores prácticas (qué eventos habilitar SMS)
- Cost considerations
- Ejemplos de configuraciones comunes
- Troubleshooting

### **Actualizar**: `docs/SMS_NOTIFICATION_SERVICE.md`

Agregar sección:
```markdown
## Dealer Channel Configuration

Starting from V6, dealerships can customize which events trigger SMS notifications
from Settings → Integrations → SMS → Event Channels.

This allows fine-grained control without requiring users to configure individually.
```

---

## 🔍 DEBUGGING SI ALGO FALLA

### **Problema: Matriz UI no aparece en Settings**

```typescript
// Verificar:
1. Import correcto de DealerChannelMatrix
2. Path del componente: ./notifications/DealerChannelMatrix
3. Tabs component importado de @/components/ui/tabs
4. Console errors en navegador
```

### **Problema: Error al guardar configuración**

```sql
-- Verificar RLS policies
SELECT * FROM pg_policies WHERE tablename = 'dealer_notification_channel_defaults';

-- Verificar el usuario tiene permiso
SELECT
  dm.user_id,
  dcr.role_name
FROM dealer_memberships dm
JOIN dealer_custom_roles dcr ON dm.custom_role_id = dcr.id
WHERE dm.user_id = auth.uid();
-- Debe ser dealer_admin o dealer_manager
```

### **Problema: Edge Function no respeta configuración**

```sql
-- Verificar configuración existe
SELECT * FROM dealer_notification_channel_defaults WHERE dealer_id = 5;

-- Test helper function
SELECT is_dealer_channel_enabled(5, 'sales_orders', 'status_changed', 'sms');

-- Ver logs de Edge Function en Supabase Dashboard
```

### **Problema: SMS sigue enviando aunque deshabilitado**

```
1. Verificar versión de Edge Function desplegada (debe ser V7+)
2. Ver logs: Buscar "[Dealer Channel Config]"
3. Si no aparece → Edge Function no tiene el código nuevo
4. Redesplegar forzadamente
```

---

## 🔄 ROLLBACK COMPLETO (Si Necesario)

### **Escenario 1: Rollback solo Feature Matriz**

```sql
-- Eliminar tabla (sistema SMS sigue funcionando)
DROP TABLE dealer_notification_channel_defaults CASCADE;

-- Remover archivos creados
rm src/components/settings/notifications/DealerChannelMatrix.tsx
rm src/types/dealerChannelDefaults.ts
```

**Impacto**: Sistema SMS funciona normal, solo pierdes la UI de configuración de canales.

### **Escenario 2: Rollback Edge Function a V5**

```bash
cd C:\Users\rudyr\apps\mydetailarea

# Restaurar V5 (antes de integración Followers)
cp supabase/functions/send-order-sms-notification/index.ts.backup-v5 supabase/functions/send-order-sms-notification/index.ts

# Redesplegar via MCP
```

### **Escenario 3: Rollback Completo a Pre-Sesión**

```bash
# Revertir via git (si hiciste commits)
git log --oneline -10
git revert <commit-hash>

# O rollback manual de migraciones
DROP TABLE dealer_notification_channel_defaults;
ALTER TABLE sms_send_history DROP COLUMN sent_day;
```

---

## 📚 RECURSOS Y REFERENCIAS

### **Documentos Creados Esta Sesión**:
1. `docs/SESSION_2025-11-01_SMS_ENTERPRISE_IMPLEMENTATION.md` - Resumen completo
2. `docs/SMS_NOTIFICATION_SERVICE.md` - Guía del servicio SMS
3. `docs/SMS_FIX_APPLIED_2025-11-01.md` - Reporte de bugs corregidos
4. `START_HERE_NEXT_SESSION.md` - Este documento

### **Componentes Clave**:
- Edge Function: `supabase/functions/send-order-sms-notification/index.ts` (V6)
- Servicio: `src/services/orderSMSNotificationService.ts`
- Hook: `src/hooks/useStatusPermissions.tsx`
- UI (pendiente integrar): `src/components/settings/notifications/DealerChannelMatrix.tsx`

### **Migrations Aplicadas**:
- `20251101000001_add_sent_day_to_sms_send_history.sql` ✅
- `20251102000000_create_dealer_notification_channel_defaults.sql` ✅

---

## ✅ CHECKLIST PRE-CONTINUACIÓN

Antes de empezar próxima sesión:

```
[ ] Leer SESSION_2025-11-01_SMS_ENTERPRISE_IMPLEMENTATION.md completo
[ ] Leer este documento (START_HERE_NEXT_SESSION.md) completo
[ ] Verificar sistema SMS funciona (Quick Status Check arriba)
[ ] Confirmar tabla dealer_notification_channel_defaults existe
[ ] Revisar componente DealerChannelMatrix.tsx creado
[ ] Git status: ¿Hay cambios uncommitted?
[ ] Backups disponibles en caso de rollback
[ ] Supabase Dashboard abierto (para monitorear logs)
[ ] Café preparado ☕
```

---

## 🎯 OBJETIVO DE PRÓXIMA SESIÓN

**Meta**: Completar e integrar Feature Matriz Eventos × Canales

**Success Criteria**:
1. ✅ UI de matriz accesible desde Settings
2. ✅ Configuración se guarda correctamente
3. ✅ Edge Function SMS respeta configuración de dealer
4. ✅ Testing exhaustivo pasado
5. ✅ 0 breaking changes
6. ✅ Documentación completa

**Tiempo estimado**: 6 horas
**Enfoque**: Máxima cautela, testing continuo

---

## 💡 NOTAS IMPORTANTES

### **Sistema Actual (No Romper)**:
- SMS funciona solo en `status === 'completed'`
- Solo followers reciben SMS
- Auto-exclusión del trigger user funciona
- 2 usuarios configurados: Rudy y Detail Department

### **Backward Compatibility Crítica**:
- Dealers sin configuración en `dealer_notification_channel_defaults` → Funciona normal
- Edge Function tiene fallback a defaults hardcoded
- No rompe funcionalidad existente

### **Performance**:
- Query a `dealer_notification_channel_defaults` es rápida (indexed)
- GIN index en JSONB para búsquedas eficientes
- Caching en frontend via React Query

---

## 🚀 QUICK COMMANDS

### **Ver Estado de SMS**
```sql
-- SMS enviados hoy
SELECT COUNT(*), MAX(sent_at)
FROM sms_send_history
WHERE dealer_id = 5 AND sent_day = CURRENT_DATE;

-- Configuración de canales actual
SELECT * FROM dealer_notification_channel_defaults WHERE dealer_id = 5;

-- Followers con permisos SMS
SELECT COUNT(*)
FROM entity_followers ef
JOIN dealer_memberships dm ON dm.user_id = ef.user_id
WHERE ef.entity_id = '46f65fe0-6012-406c-b1fd-f0575cb3e1e3'
AND ef.is_active = true;
```

### **Desarrollar/Testing**
```bash
# Dev server
npm run dev

# Ver Edge Function logs
# Via Supabase Dashboard: Functions → send-order-sms-notification → Logs

# Lint
npm run lint

# Type check
npm run typecheck
```

---

## 📞 CONTACTO SI HAY PROBLEMAS

**Logs a revisar**:
1. Console del navegador (F12)
2. Supabase Dashboard → Functions → send-order-sms-notification → Logs
3. Terminal del dev server

**Queries de diagnóstico**:
- Ver en `docs/SESSION_2025-11-01_SMS_ENTERPRISE_IMPLEMENTATION.md`

---

**🎉 ¡Excelente trabajo en esta sesión! El sistema está sólido y listo para continuar.** 🚀

**Próxima sesión**: Empezar desde Paso 1 de este documento.
