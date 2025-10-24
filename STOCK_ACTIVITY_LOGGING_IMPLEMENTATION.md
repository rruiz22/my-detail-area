# Stock Activity Logging - Sistema Completo de Auditoría

**Fecha:** October 24, 2025
**Módulo:** Stock Inventory
**Propósito:** Implementar sistema enterprise de activity logging para rastrear TODAS las acciones en vehículos

---

## 📊 ESTADO ACTUAL

### ✅ Lo Que Ya Existe

1. **VehicleActivityTab Component** - UI lista pero con datos hardcodeados
   - **Ubicación:** `src/components/stock/vehicle-details/VehicleActivityTab.tsx`
   - **Estado:** Solo muestra 1 actividad fake ("Vehicle created")
   - **Preparado para:** 6 tipos de actividad (created, price_changed, status_changed, photo_added, order_created, get_ready_linked)

2. **dealer_inventory_sync_log** - Tabla para CSV uploads
   - Registra: uploads de CSV, records procesados, errores
   - **NO registra:** cambios individuales por vehículo

3. **dealer_vehicle_photos** - Tabla de fotos (creada hoy)
   - Triggers automáticos para actualizar photo_count
   - **NO registra:** histórico de cambios de fotos

### ❌ Lo Que Falta

- **NO existe tabla `dealer_vehicle_activity_log`**
- **NO hay triggers** para registrar cambios automáticamente
- **NO hay hook** `useVehicleActivity` para fetch/display
- **NO se registran** 95% de las acciones importantes

---

## 🎯 ACTIVIDADES A REGISTRAR (24 tipos)

### **Categoría 1: Lifecycle del Vehículo** 🔴 ALTA PRIORIDAD

| Activity Type | Trigger | Descripción | Campos a Registrar |
|---------------|---------|-------------|-------------------|
| `vehicle_created` | INSERT | Vehículo agregado al inventario | source (CSV/Manual) |
| `vehicle_updated` | UPDATE | Cualquier campo actualizado | field_name, old_value, new_value |
| `vehicle_activated` | UPDATE | is_active: false → true | reason |
| `vehicle_deactivated` | UPDATE | is_active: true → false | reason |
| `vehicle_deleted` | DELETE | Vehículo eliminado | soft_delete: true/false |

### **Categoría 2: Cambios de Precio** 🔴 ALTA PRIORIDAD

| Activity Type | Trigger | Descripción | Campos a Registrar |
|---------------|---------|-------------|-------------------|
| `price_changed` | UPDATE price | Precio modificado | old_price, new_price, change_amount, change_percent |
| `msrp_changed` | UPDATE msrp | MSRP actualizado | old_msrp, new_msrp |
| `unit_cost_changed` | UPDATE unit_cost | Costo modificado | old_cost, new_cost |
| `repriced` | UPDATE last_reprice_date | Reprecio aplicado | strategy, old_price, new_price |

### **Categoría 3: Cambios de Estado** 🟡 MEDIA PRIORIDAD

| Activity Type | Trigger | Descripción | Campos a Registrar |
|---------------|---------|-------------|-------------------|
| `status_changed` | UPDATE dms_status | Status cambió | old_status, new_status |
| `objective_changed` | UPDATE objective | Retail ↔ Wholesale | old_objective, new_objective |
| `lot_location_changed` | UPDATE lot_location | Ubicación cambió | old_location, new_location |
| `certified_status_changed` | UPDATE is_certified | Certificación cambió | program_name |

### **Categoría 4: Fotos y Media** 🟡 MEDIA PRIORIDAD

| Activity Type | Trigger | Descripción | Campos a Registrar |
|---------------|---------|-------------|-------------------|
| `photo_uploaded` | INSERT dealer_vehicle_photos | Foto agregada | category, is_key_photo |
| `photo_deleted` | DELETE dealer_vehicle_photos | Foto eliminada | photo_url, category |
| `key_photo_changed` | UPDATE is_key_photo | Foto principal cambió | old_photo_id, new_photo_id |
| `photo_category_changed` | UPDATE category | Categoría cambió | old_category, new_category |

### **Categoría 5: Integraciones** 🟢 BAJA PRIORIDAD

| Activity Type | Trigger | Descripción | Campos a Registrar |
|---------------|---------|-------------|-------------------|
| `csv_uploaded` | CSV Upload | Inventario actualizado | file_name, records_count |
| `dms_synced` | DMS Sync | Sincronizado con DMS | dms_provider, sync_type |
| `get_ready_linked` | Manual | Vinculado a Get Ready | get_ready_id |
| `order_created` | Manual | Orden creada | order_type, order_id |

### **Categoría 6: Market & Analytics** 🟢 BAJA PRIORIDAD

| Activity Type | Trigger | Descripción | Campos a Registrar |
|---------------|---------|-------------|-------------------|
| `market_data_updated` | UPDATE market_* | Datos de mercado | fields_updated[] |
| `leads_received` | UPDATE leads_total | Lead generado | source, count |
| `cargurus_updated` | UPDATE cargurus_* | Métricas actualizadas | views, ctr |

---

## 🗄️ SCHEMA DE LA TABLA

### **dealer_vehicle_activity_log**

```sql
CREATE TABLE dealer_vehicle_activity_log (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES dealer_vehicle_inventory(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL,

  -- Tipo de actividad
  activity_type TEXT NOT NULL,

  -- Quién y cuándo
  action_by UUID REFERENCES profiles(id),
  action_at TIMESTAMPTZ DEFAULT NOW(),

  -- Detalles del cambio
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT NOT NULL,

  -- Metadata adicional (flexible)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_vehicle_activity_vehicle ON dealer_vehicle_activity_log(vehicle_id, created_at DESC);
CREATE INDEX idx_vehicle_activity_dealer ON dealer_vehicle_activity_log(dealer_id, created_at DESC);
CREATE INDEX idx_vehicle_activity_type ON dealer_vehicle_activity_log(activity_type, created_at DESC);
CREATE INDEX idx_vehicle_activity_user ON dealer_vehicle_activity_log(action_by, created_at DESC);

-- RLS Policies
ALTER TABLE dealer_vehicle_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity from their dealership"
  ON dealer_vehicle_activity_log FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM dealer_memberships WHERE user_id = auth.uid()
    )
  );

-- Comentarios
COMMENT ON TABLE dealer_vehicle_activity_log IS 'Comprehensive activity log for all vehicle inventory actions';
COMMENT ON COLUMN dealer_vehicle_activity_log.activity_type IS 'Type of activity: vehicle_created, price_changed, status_changed, photo_uploaded, etc.';
COMMENT ON COLUMN dealer_vehicle_activity_log.metadata IS 'Additional context: {change_amount, change_percent, source, etc.}';
```

---

## 🔧 FUNCIÓN DE LOGGING PRINCIPAL

### **log_vehicle_activity() Function**

```sql
CREATE OR REPLACE FUNCTION log_vehicle_activity()
RETURNS TRIGGER AS $$
DECLARE
  change_description TEXT;
  change_metadata JSONB := '{}'::jsonb;
BEGIN
  -- INSERT: Vehicle Created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dealer_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      NEW.id,
      NEW.dealer_id,
      'vehicle_created',
      auth.uid(),
      format('Vehicle %s %s %s added to inventory', NEW.year, NEW.make, NEW.model),
      jsonb_build_object(
        'stock_number', NEW.stock_number,
        'vin', NEW.vin,
        'price', NEW.price
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE: Detect changes
  IF TG_OP = 'UPDATE' THEN

    -- Price Changed
    IF OLD.price IS DISTINCT FROM NEW.price THEN
      change_metadata := jsonb_build_object(
        'old_price', OLD.price,
        'new_price', NEW.price,
        'change_amount', NEW.price - OLD.price,
        'change_percent', CASE
          WHEN OLD.price > 0 THEN ((NEW.price - OLD.price) / OLD.price * 100)
          ELSE 0
        END
      );

      INSERT INTO dealer_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description, metadata
      ) VALUES (
        NEW.id, NEW.dealer_id, 'price_changed', auth.uid(),
        'price', OLD.price::text, NEW.price::text,
        format('Price changed from $%s to $%s', OLD.price, NEW.price),
        change_metadata
      );
    END IF;

    -- Status Changed
    IF OLD.dms_status IS DISTINCT FROM NEW.dms_status THEN
      INSERT INTO dealer_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by,
        field_name, old_value, new_value, description
      ) VALUES (
        NEW.id, NEW.dealer_id, 'status_changed', auth.uid(),
        'dms_status', OLD.dms_status, NEW.dms_status,
        format('Status changed from %s to %s', OLD.dms_status, NEW.dms_status)
      );
    END IF;

    -- is_active Changed
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO dealer_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description
      ) VALUES (
        NEW.id, NEW.dealer_id,
        CASE WHEN NEW.is_active THEN 'vehicle_activated' ELSE 'vehicle_deactivated' END,
        auth.uid(),
        CASE WHEN NEW.is_active THEN 'Vehicle reactivated' ELSE 'Vehicle deactivated' END
      );
    END IF;

    -- Add more field checks here...
    -- MSRP, unit_cost, objective, lot_location, is_certified, etc.

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER vehicle_activity_logger
AFTER INSERT OR UPDATE ON dealer_vehicle_inventory
FOR EACH ROW
EXECUTE FUNCTION log_vehicle_activity();
```

---

## 🔧 TRIGGERS ADICIONALES

### **Para Fotos (dealer_vehicle_photos)**

```sql
CREATE OR REPLACE FUNCTION log_photo_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO dealer_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      NEW.vehicle_id, NEW.dealer_id, 'photo_uploaded', NEW.uploaded_by,
      format('Photo uploaded (%s)', NEW.category),
      jsonb_build_object('category', NEW.category, 'is_key_photo', NEW.is_key_photo)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO dealer_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      OLD.vehicle_id, OLD.dealer_id, 'photo_deleted', auth.uid(),
      format('Photo deleted (%s)', OLD.category),
      jsonb_build_object('category', OLD.category, 'was_key_photo', OLD.is_key_photo)
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.is_key_photo != NEW.is_key_photo AND NEW.is_key_photo THEN
    INSERT INTO dealer_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description
    ) VALUES (
      NEW.vehicle_id, NEW.dealer_id, 'key_photo_changed', auth.uid(),
      'Key photo updated'
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER photo_activity_logger
AFTER INSERT OR UPDATE OR DELETE ON dealer_vehicle_photos
FOR EACH ROW
EXECUTE FUNCTION log_photo_activity();
```

---

## 💻 HOOK: useVehicleActivity

### **Archivo:** `src/hooks/useVehicleActivity.ts` (NUEVO)

```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface VehicleActivity {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  activity_type: string;
  action_by?: string;
  action_at: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
  // Joined data
  action_by_profile?: {
    first_name: string;
    last_name: string;
  };
}

export function useVehicleActivity(vehicleId: string) {
  return useQuery({
    queryKey: ['vehicle-activity', vehicleId],
    queryFn: async (): Promise<VehicleActivity[]> => {
      const { data, error } = await supabase
        .from('dealer_vehicle_activity_log')
        .select(`
          *,
          action_by_profile:profiles!action_by(
            first_name,
            last_name
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching vehicle activity:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!vehicleId,
  });
}

// Hook para registrar actividad manual (desde UI)
export function useLogVehicleActivity(vehicleId: string, dealerId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      type: string;
      description: string;
      metadata?: Record<string, any>;
    }) => {
      const { error } = await supabase
        .from('dealer_vehicle_activity_log')
        .insert({
          vehicle_id: vehicleId,
          dealer_id: dealerId,
          activity_type: activity.type,
          description: activity.description,
          metadata: activity.metadata || {}
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle-activity', vehicleId] });
    }
  });
}
```

---

## 🎨 COMPONENTE ACTUALIZADO

### **Archivo:** `src/components/stock/vehicle-details/VehicleActivityTab.tsx`

```typescript
import { useVehicleActivity } from '@/hooks/useVehicleActivity';

export const VehicleActivityTab: React.FC<VehicleActivityTabProps> = ({ vehicle }) => {
  const { t } = useTranslation();
  const { data: activities, isLoading } = useVehicleActivity(vehicle.id);

  const getActivityIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      'vehicle_created': <PlusCircle className="w-4 h-4" />,
      'price_changed': <DollarSign className="w-4 h-4" />,
      'status_changed': <Activity className="w-4 h-4" />,
      'photo_uploaded': <Camera className="w-4 h-4" />,
      'photo_deleted': <Trash2 className="w-4 h-4" />,
      'key_photo_changed': <Star className="w-4 h-4" />,
      'order_created': <ShoppingCart className="w-4 h-4" />,
      'get_ready_linked': <Wrench className="w-4 h-4" />,
      'vehicle_activated': <CheckCircle className="w-4 h-4" />,
      'vehicle_deactivated': <XCircle className="w-4 h-4" />
    };
    return icons[type] || <Clock className="w-4 h-4" />;
  };

  if (isLoading) {
    return <div>Loading activities...</div>;
  }

  return (
    <div className="space-y-4">
      {activities?.map(activity => (
        <Card key={activity.id}>
          <CardContent className="flex items-start gap-4 p-6">
            <div className={`rounded-full p-2 ${getActivityColor(activity.activity_type)}`}>
              {getActivityIcon(activity.activity_type)}
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold">{getActivityLabel(activity.activity_type)}</h4>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>

                  {/* Show field changes */}
                  {activity.field_name && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-mono bg-muted px-2 py-1 rounded">
                        {activity.field_name}
                      </span>
                      : {activity.old_value} → {activity.new_value}
                    </div>
                  )}

                  {/* Show metadata */}
                  {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">
                        View details
                      </summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(activity.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {new Date(activity.action_at).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.action_at).toLocaleTimeString()}
                  </p>
                  {activity.action_by_profile && (
                    <Badge variant="outline" className="mt-1">
                      {activity.action_by_profile.first_name} {activity.action_by_profile.last_name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

---

## 📋 PASOS DE IMPLEMENTACIÓN (Próxima Sesión)

### **Paso 1: Crear Tabla (10 min)**

1. Crear migration: `npx supabase migration new create_vehicle_activity_log`
2. Copiar SQL del schema arriba
3. Aplicar: `mcp__supabase__apply_migration`

### **Paso 2: Crear Triggers (30 min)**

1. Crear función `log_vehicle_activity()`
2. Crear trigger en `dealer_vehicle_inventory`
3. Crear función `log_photo_activity()`
4. Crear trigger en `dealer_vehicle_photos`
5. Aplicar migrations

### **Paso 3: Crear Hook (15 min)**

1. Crear archivo `src/hooks/useVehicleActivity.ts`
2. Copiar código del hook arriba
3. Exportar `useVehicleActivity` y `useLogVehicleActivity`

### **Paso 4: Actualizar VehicleActivityTab (20 min)**

1. Importar `useVehicleActivity`
2. Reemplazar datos hardcodeados con datos reales
3. Agregar iconos para cada tipo de actividad
4. Agregar filtros (opcional): por tipo, por usuario, por fecha

### **Paso 5: Testing (15 min)**

1. ✅ Crear vehículo → Ver actividad "created"
2. ✅ Cambiar precio → Ver actividad "price_changed"
3. ✅ Subir foto → Ver actividad "photo_uploaded"
4. ✅ Cambiar status → Ver actividad "status_changed"
5. ✅ Verificar metadata en cada actividad

---

## 🎨 UI MEJORADA (Opcional)

### **Filtros de Actividad:**

```tsx
<Select value={filterType} onValueChange={setFilterType}>
  <SelectItem value="all">All Activities</SelectItem>
  <SelectItem value="vehicle_">Lifecycle</SelectItem>
  <SelectItem value="price_">Pricing</SelectItem>
  <SelectItem value="photo_">Photos</SelectItem>
  <SelectItem value="order_">Orders</SelectItem>
</Select>
```

### **Agrupación por Fecha:**

```tsx
// Group activities by date
const groupedActivities = groupBy(activities, (a) =>
  new Date(a.created_at).toDateString()
);

// Render:
{Object.entries(groupedActivities).map(([date, activities]) => (
  <div>
    <h3>{date}</h3>
    {activities.map(activity => ...)}
  </div>
))}
```

---

## 📊 EJEMPLO DE METADATA POR TIPO

### **price_changed:**
```json
{
  "old_price": 25000,
  "new_price": 23500,
  "change_amount": -1500,
  "change_percent": -6.0,
  "reason": "Market adjustment"
}
```

### **photo_uploaded:**
```json
{
  "category": "exterior",
  "is_key_photo": true,
  "file_size": 2458624,
  "dimensions": { "width": 1920, "height": 1080 }
}
```

### **csv_uploaded:**
```json
{
  "file_name": "inventory_oct_24.csv",
  "records_added": 145,
  "records_updated": 230,
  "records_removed": 12
}
```

---

## ⚡ OPTIMIZACIONES

### **1. Partitioning (Si > 100k registros)**

```sql
-- Partition por mes
CREATE TABLE dealer_vehicle_activity_log_y2025m10
  PARTITION OF dealer_vehicle_activity_log
  FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

### **2. Retention Policy (Opcional)**

```sql
-- Eliminar actividades > 2 años
DELETE FROM dealer_vehicle_activity_log
WHERE created_at < NOW() - INTERVAL '2 years';
```

### **3. Agregación (Para reportes)**

```sql
-- Vista materializada para métricas
CREATE MATERIALIZED VIEW vehicle_activity_summary AS
SELECT
  vehicle_id,
  activity_type,
  COUNT(*) as activity_count,
  MAX(created_at) as last_activity
FROM dealer_vehicle_activity_log
GROUP BY vehicle_id, activity_type;
```

---

## 🎯 RESULTADO FINAL

**Después de implementar:**
- ✅ 24 tipos de actividad registrados automáticamente
- ✅ Timeline completo de cada vehículo
- ✅ Auditoría enterprise-grade
- ✅ Who/What/When/Why para todo
- ✅ Metadata rica para análisis
- ✅ UI intuitiva con filtros
- ✅ Performance optimizado con índices

---

## 📅 TIEMPO ESTIMADO TOTAL

| Fase | Tiempo |
|------|--------|
| Tabla + Indexes | 10 min |
| Triggers (2 funciones) | 30 min |
| Hook | 15 min |
| Componente UI | 20 min |
| Testing | 15 min |
| **TOTAL** | **1.5 horas** |

---

## 🔗 REFERENCIAS

- Get Ready Activity Log: `get_ready_vehicle_activity_log` (usar como modelo)
- Order Activity Log: `order_activity_log` (similar pattern)
- Permission Audit: `permission_audit_log` (auditoría pattern)

---

**Esta documentación está lista para implementar el sistema completo de activity logging en la próxima sesión. Todos los SQL, TypeScript y ejemplos están incluidos.**

