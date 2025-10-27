# Notification Templates Manager - Quick Start Guide

## Paso 1: Crear la tabla en Supabase

Ejecuta esta migración SQL en tu base de datos Supabase:

```sql
-- Create notification_templates table
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('order_status', 'approval', 'sla_alert', 'custom')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'slack', 'push', 'all')),
  language TEXT NOT NULL CHECK (language IN ('en', 'es', 'pt-BR')),
  subject TEXT,
  body TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_templates_dealer
  ON notification_templates(dealer_id);

CREATE INDEX IF NOT EXISTS idx_notification_templates_type
  ON notification_templates(template_type);

CREATE INDEX IF NOT EXISTS idx_notification_templates_enabled
  ON notification_templates(enabled)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_notification_templates_channel
  ON notification_templates(channel);

-- Enable Row Level Security
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- System admins can do everything
CREATE POLICY "System admins full access"
  ON notification_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'system_admin'
    )
  );

-- Dealer admins can manage templates for their dealership
CREATE POLICY "Dealer admins manage own templates"
  ON notification_templates
  FOR ALL
  USING (
    dealer_id IN (
      SELECT dm.dealer_id
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE dm.user_id = auth.uid()
      AND (p.role = 'dealer_admin' OR p.role = 'system_admin')
      AND dm.is_active = true
    )
  );

-- Users can view enabled templates from their dealership
CREATE POLICY "Users view enabled templates"
  ON notification_templates
  FOR SELECT
  USING (
    enabled = true
    AND dealer_id IN (
      SELECT dealer_id
      FROM dealer_memberships
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- Add comment
COMMENT ON TABLE notification_templates IS
  'Stores notification templates for multi-channel automated communications';
```

## Paso 2: Importar y usar el componente

### Opción A: En una página de Settings

```tsx
// src/pages/Settings.tsx o similar
import { NotificationTemplatesManager } from '@/components/settings/notifications';

export function SettingsPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Otras secciones de settings */}

      <NotificationTemplatesManager />
    </div>
  );
}
```

### Opción B: Como una ruta separada

```tsx
// src/routes/routes.tsx
import { NotificationTemplatesManager } from '@/components/settings/notifications';

{
  path: '/settings/notifications/templates',
  element: <NotificationTemplatesManager />
}
```

### Opción C: En un Tab de Settings Hub

```tsx
// src/components/settings/SettingsHub.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationTemplatesManager } from '@/components/settings/notifications';

export function SettingsHub() {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">General</TabsTrigger>
        <TabsTrigger value="integrations">Integrations</TabsTrigger>
        <TabsTrigger value="notifications">Notification Templates</TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        {/* General settings */}
      </TabsContent>

      <TabsContent value="integrations">
        {/* Integration settings */}
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationTemplatesManager />
      </TabsContent>
    </Tabs>
  );
}
```

## Paso 3: Verificar permisos

El componente ya verifica permisos automáticamente. Solo usuarios con estos permisos pueden acceder:

- `system_admin` (rol de sistema)
- O usuarios con permiso `manage_settings`

Si el usuario no tiene permiso, verá un mensaje de acceso denegado.

## Paso 4: Probar el componente

### Crear una plantilla de prueba

1. Navega a la página donde agregaste el componente
2. Click en "Create Template"
3. Completa el formulario:
   - **Nombre**: "Order Status Update - Customer"
   - **Tipo**: Order Status
   - **Canal**: Email
   - **Idioma**: English
   - **Asunto**: "Your Order {{order_id}} Status Update"
   - **Cuerpo**:
     ```
     Hello {{customer_name}},

     Your order {{order_id}} for {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}
     has been updated to status: {{status}}.

     VIN: {{vehicle_vin}}
     Expected completion: {{due_date}}

     Thank you for choosing {{dealer_name}}.
     ```
4. Click en variables para insertarlas automáticamente
5. Revisa la vista previa con datos de ejemplo
6. Click "Save"

### Editar plantilla

1. Click en "Edit" en cualquier tarjeta de plantilla
2. Modifica los campos necesarios
3. Click "Save"

### Eliminar plantilla

1. Click en el ícono de basura (trash)
2. Confirma la eliminación
3. La plantilla se eliminará permanentemente

### Habilitar/Deshabilitar

1. Usa el switch (toggle) en cada tarjeta
2. El cambio se guarda automáticamente
3. Las plantillas deshabilitadas no se mostrarán en listas de selección

## Paso 5: Integrar con sistema de notificaciones

### Ejemplo: Obtener plantillas para usar

```tsx
import { supabase } from '@/integrations/supabase/client';

// Obtener plantilla habilitada para tipo específico
async function getNotificationTemplate(
  dealerId: number,
  templateType: string,
  channel: string,
  language: string = 'en'
) {
  const { data, error } = await supabase
    .from('notification_templates')
    .select('*')
    .eq('dealer_id', dealerId)
    .eq('template_type', templateType)
    .eq('channel', channel)
    .eq('language', language)
    .eq('enabled', true)
    .single();

  if (error) throw error;
  return data;
}

// Reemplazar variables en plantilla
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
) {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    const variableKey = `{{${key}}}`;
    result = result.replaceAll(variableKey, value);
  });
  return result;
}

// Usar plantilla para enviar notificación
async function sendOrderStatusNotification(orderId: string) {
  // 1. Obtener datos de la orden
  const order = await getOrderData(orderId);

  // 2. Obtener plantilla
  const template = await getNotificationTemplate(
    order.dealer_id,
    'order_status',
    'email',
    'en'
  );

  // 3. Preparar variables
  const variables = {
    order_id: order.id,
    customer_name: order.customer_name,
    vehicle_vin: order.vehicle_vin,
    vehicle_make: order.vehicle_make,
    vehicle_model: order.vehicle_model,
    vehicle_year: order.vehicle_year,
    status: order.status,
    due_date: order.due_date,
    dealer_name: order.dealer_name,
    assigned_to: order.assigned_user_name
  };

  // 4. Reemplazar variables
  const subject = replaceTemplateVariables(template.subject || '', variables);
  const body = replaceTemplateVariables(template.body, variables);

  // 5. Enviar email
  await sendEmail({
    to: order.customer_email,
    subject,
    body
  });
}
```

## Características Principales

### ✅ Multi-Canal
- Email (con asunto)
- SMS (solo cuerpo)
- Slack (solo cuerpo)
- Push Notification (con asunto)
- All (plantilla universal)

### ✅ Multi-Idioma
- Inglés (en)
- Español (es)
- Portugués Brasil (pt-BR)

### ✅ Variables Dinámicas
11 variables predefinidas listas para usar:
- order_id, customer_name, vehicle_vin, vehicle_make
- vehicle_model, vehicle_year, status, due_date
- assigned_to, dealer_name, approval_amount

### ✅ Vista Previa en Tiempo Real
- Reemplaza variables con datos de ejemplo
- Muestra exactamente cómo se verá la notificación
- Actualización instantánea al editar

### ✅ Diseño Notion-Style
- Sin gradientes
- Colores muted (slate, emerald, amber, red)
- Shadows sutiles con card-enhanced
- Responsive mobile-first

## Solución de Problemas

### Error: "No dealership ID found"
**Causa**: El usuario no tiene `dealership_id` asignado
**Solución**: Asignar al usuario a un dealership mediante `dealer_memberships`

### Error: "Access denied"
**Causa**: Usuario sin permisos de `system_admin` o `manage_settings`
**Solución**: Actualizar rol del usuario o asignar permiso granular

### Templates no aparecen
**Causa**: RLS policies no configuradas correctamente
**Solución**: Ejecutar las políticas RLS del Paso 1

### Variables no se reemplazan
**Causa**: Formato incorrecto de variables
**Solución**: Usar exactamente `{{variable_name}}` sin espacios

## Ejemplos de Plantillas

### 1. Order Status Update (Email)
```
Subject: Order {{order_id}} - Status Update
Body:
Hello {{customer_name}},

Your {{vehicle_year}} {{vehicle_make}} {{vehicle_model}} service order has been updated.

Current Status: {{status}}
VIN: {{vehicle_vin}}
Expected Completion: {{due_date}}

Assigned Technician: {{assigned_to}}

Questions? Contact {{dealer_name}} directly.

Thank you!
```

### 2. Approval Required (Slack)
```
Body:
🚨 Approval Required

Order: {{order_id}}
Customer: {{customer_name}}
Amount: {{approval_amount}}
Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}

Please review and approve in the dashboard.
```

### 3. SLA Alert (SMS)
```
Body:
⚠️ SLA ALERT: Order {{order_id}} is overdue. Due: {{due_date}}. Vehicle: {{vehicle_vin}}. Assigned: {{assigned_to}}.
```

## Siguiente Paso: Testing

```bash
# 1. Verificar que las traducciones se carguen
npm run dev

# 2. Navegar a la página de settings
# http://localhost:8080/settings/notifications

# 3. Crear plantilla de prueba
# 4. Verificar preview
# 5. Guardar y editar
# 6. Probar toggle enabled/disabled
# 7. Eliminar plantilla de prueba
```

---

**Componente listo para producción** ✅
**Base de datos**: Ejecuta SQL del Paso 1
**Importación**: Un solo import
**Permisos**: Verificados automáticamente
**Traducciones**: 3 idiomas incluidos
**Diseño**: 100% Notion-compliant

¡Listo para usar! 🚀
