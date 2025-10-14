# Get Ready SLA Configuration

## 📋 Resumen

Sistema de configuración flexible para los límites de tiempo (SLA) y alertas del módulo Get Ready. Permite a cada dealership personalizar:

- ⏱️ **Time Goals**: Objetivos de tiempo por defecto y máximos
- 🚦 **Alert Thresholds**: Umbrales para alertas (verde, amarillo, rojo)
- 🔔 **Notifications**: Configuración de notificaciones
- ⚙️ **Business Rules**: Reglas de negocio (horarios, fines de semana, etc.)

## 🎯 Características

### 1. **Configuración Global por Dealership**
- **Default Time Goal**: 4 días (por defecto)
- **Max Time Goal**: 7 días (por defecto)
- **Green Threshold**: ≤ 1 día
- **Warning Threshold**: 2-3 días
- **Danger Threshold**: ≥ 4 días

### 2. **Configuración por Step (Opcional)**
- Cada step puede tener sus propios umbrales
- Sobreescribe la configuración global
- Ideal para steps que requieren más o menos tiempo

### 3. **Opciones Avanzadas**
- ✅ Contar o no fines de semana
- ✅ Usar solo horas de negocio
- ✅ Notificaciones automáticas
- ✅ Horarios de negocio personalizables

## 🏗️ Estructura de Base de Datos

### Tabla Principal: `get_ready_sla_config`
```sql
- id: UUID
- dealer_id: BIGINT
- default_time_goal: INTEGER (1-14 días)
- max_time_goal: INTEGER (1-14 días)
- green_threshold: INTEGER
- warning_threshold: INTEGER
- danger_threshold: INTEGER
- enable_notifications: BOOLEAN
- count_weekends: BOOLEAN
- count_business_hours_only: BOOLEAN
```

### Tabla de Overrides: `get_ready_step_sla_config`
```sql
- id: UUID
- sla_config_id: UUID
- step_id: TEXT
- time_goal: INTEGER
- green_threshold: INTEGER
- warning_threshold: INTEGER
- danger_threshold: INTEGER
```

## 🔧 Implementación

### 1. **Aplicar la Migración**

```bash
# Copiar y ejecutar en Supabase SQL Editor
supabase/migrations/20251014000002_create_get_ready_sla_config.sql
```

### 2. **Usar el Hook en React**

```typescript
import { useGetReadySLAConfig, useSLAConfigMutations } from '@/hooks/useGetReadySLAConfig';

function MyComponent() {
  const dealerId = 5;

  // Obtener configuración actual
  const { data: config } = useGetReadySLAConfig(dealerId);

  // Mutaciones
  const { upsertSLAConfig } = useSLAConfigMutations(dealerId);

  // Actualizar configuración
  const handleSave = () => {
    upsertSLAConfig.mutate({
      default_time_goal: 5,
      max_time_goal: 8,
      green_threshold: 2,
      warning_threshold: 4,
      danger_threshold: 6,
    });
  };

  return <div>...</div>;
}
```

### 3. **Integrar el Panel de Configuración**

Agregar el componente a la sección de Settings:

```typescript
import { SLAConfigurationPanel } from '@/components/get-ready/SLAConfigurationPanel';

function SettingsPage() {
  return (
    <div className="space-y-6">
      <SLAConfigurationPanel />
      {/* Otros paneles de configuración */}
    </div>
  );
}
```

### 4. **Usar en la Lista de Vehículos**

```typescript
import { getSLAStatusColor, getSLAStatusLabel } from '@/hooks/useGetReadySLAConfig';

function VehicleList() {
  const { data: config } = useGetReadySLAConfig(dealerId);

  vehicles.map(vehicle => {
    const statusColor = getSLAStatusColor(vehicle.days_in_step, config);
    const statusLabel = getSLAStatusLabel(vehicle.days_in_step, config);

    return (
      <div className={`badge-${statusColor}`}>
        {statusLabel}
      </div>
    );
  });
}
```

## 📊 Funciones Helpers

### `get_sla_status_for_vehicle(vehicle_id, dealer_id)`
Función SQL que devuelve el status SLA de un vehículo:
- `'on_track'`: Verde
- `'warning'`: Amarillo
- `'critical'`: Rojo

### `get_sla_config_for_dealer(dealer_id)`
Función SQL que devuelve la configuración completa con overrides por step.

## 🎨 Interfaz de Usuario

El componente `SLAConfigurationPanel` proporciona:

1. **Time Goals Section**
   - Campo para Default Time Goal
   - Campo para Max Time Goal
   - Validación: max >= default

2. **Alert Thresholds Section**
   - Slider/Input para Green Threshold
   - Slider/Input para Warning Threshold
   - Slider/Input para Danger Threshold
   - Validación: danger > warning > green

3. **Preview Section**
   - Muestra ejemplos visuales
   - Colores y etiquetas
   - Días de ejemplo (1, 2, 3, 5)

4. **Additional Options**
   - Toggle: Enable Notifications
   - Toggle: Count Weekends
   - Toggle: Business Hours Only

5. **Save Button**
   - Guarda toda la configuración
   - Muestra loading state
   - Toast de confirmación

## 🔐 Permisos

- **Ver configuración**: Todos los usuarios del dealership
- **Modificar configuración**: Admins y Managers con permiso `get_ready.manage_settings`

## 🚀 Próximos Pasos

### Integración Completa:

1. **Agregar a Settings Page**
   ```typescript
   // src/pages/Settings.tsx o similar
   <Tab value="get-ready-sla">
     <SLAConfigurationPanel />
   </Tab>
   ```

2. **Actualizar Vehicle List**
   ```typescript
   // Usar getSLAStatusColor() en vez de lógica hardcoded
   ```

3. **Actualizar Dashboard KPIs**
   ```typescript
   // Usar time_goal configurable en vez de valor fijo
   ```

4. **Agregar Notificaciones**
   ```typescript
   // Trigger notificaciones cuando se exceden umbrales
   ```

### Mejoras Futuras:

- [ ] Configuración por step visual (UI)
- [ ] Historial de cambios de configuración
- [ ] Templates de configuración (presets)
- [ ] Reportes basados en cumplimiento de SLA
- [ ] Alertas automáticas por email/SMS

## 📝 Ejemplo Completo

```typescript
// 1. Usuario va a Settings > Get Ready > SLA Configuration
// 2. Ve la configuración actual o defaults
// 3. Ajusta los valores:
//    - Default Time Goal: 5 días
//    - Max Time Goal: 8 días
//    - Green: ≤ 2 días
//    - Warning: 3-4 días
//    - Danger: ≥ 5 días
// 4. Click en "Save Configuration"
// 5. Sistema valida y guarda
// 6. Todos los vehículos ahora usan estos nuevos umbrales
// 7. Badges y alertas se actualizan automáticamente
```

## ⚠️ Validaciones

El sistema valida automáticamente:

✅ `warning_threshold > green_threshold`
✅ `danger_threshold > warning_threshold`
✅ `max_time_goal >= default_time_goal`
✅ Valores entre 1-14 días

## 💡 Tips

1. **Empieza con defaults**: Los valores por defecto (4, 7, 1, 3, 4) son un buen punto de partida
2. **Ajusta gradualmente**: Cambia los valores basándote en datos reales
3. **Usa step overrides con moderación**: Solo para steps muy específicos
4. **Monitorea el cumplimiento**: Revisa regularmente cuántos vehículos están en cada categoría
5. **Business hours**: Útil si solo trabajas ciertas horas del día

## 🐛 Troubleshooting

**Los cambios no se reflejan**:
- Refresca la página (F5)
- Verifica permisos de usuario
- Revisa la consola para errores

**Error de validación**:
- Verifica que danger > warning > green
- Verifica que max >= default
- Todos los valores deben ser >= 1

**No aparece la configuración**:
- La migración debe estar aplicada
- El dealership debe existir en la tabla
- Verifica que RLS policies estén activas
