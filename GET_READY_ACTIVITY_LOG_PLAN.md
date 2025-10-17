# 📊 Get Ready Module - Activity Log Implementation Plan

**Fecha:** 16 de Octubre, 2025
**Última actualización:** 22:45 PM
**Status:** 📋 **PLANIFICADO - Listo para implementación**

---

## 🎯 OBJETIVO

Reemplazar la tab **Timeline** (que muestra métricas de tiempo redundantes) con un sistema de **Activity Log** enterprise-grade que registre todos los cambios en el vehículo para auditoría y troubleshooting.

---

## 📋 ESTADO ACTUAL

### **Tab Timeline Existente:**
- **Componente:** `src/components/get-ready/VehicleStepTimeHistory.tsx`
- **Hook:** `src/hooks/useVehicleStepHistory.ts`
- **Propósito:** Muestra tiempo acumulado por step
- **Problema:** Info redundante (ya está en header y sidebar)
- **Decisión:** ❌ **ELIMINAR y reemplazar con Activity Log**

### **Infraestructura Existente:**

#### **Tablas de Referencia:**
1. ✅ `order_activity_log` - Patrón probado
   ```sql
   Campos: order_id, user_id, activity_type, field_name,
           old_value, new_value, description, metadata, created_at
   ```

2. ✅ `get_ready_approval_history` - Historial parcial de aprobaciones
   ```sql
   Campos: vehicle_id, action, action_by, action_at, notes, etc.
   ```

#### **Componentes de Referencia:**
- `src/components/orders/RecentActivity.tsx` - Ejemplo de implementación
- `src/components/orders/RecentActivityBlock.tsx` - Bloque reutilizable
- `src/components/management/RecentActivityFeed.tsx` - Feed de actividad

---

## 🗄️ FASE 1: BASE DE DATOS (Migración)

### **Crear Tabla:** `get_ready_vehicle_activity_log`

```sql
-- =====================================================
-- GET READY MODULE - VEHICLE ACTIVITY LOG
-- Complete audit trail for vehicle changes
-- Date: [Next Session]
-- =====================================================

-- Create activity log table
CREATE TABLE IF NOT EXISTS public.get_ready_vehicle_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.get_ready_vehicles(id) ON DELETE CASCADE,
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,

  -- Activity details
  activity_type TEXT NOT NULL,
  -- Types: 'vehicle_created', 'vehicle_updated', 'step_changed',
  --        'work_item_created', 'work_item_approved', 'work_item_declined',
  --        'note_added', 'media_uploaded', 'vendor_assigned', etc.

  action_by UUID NOT NULL REFERENCES auth.users(id),
  action_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Change tracking (for updates)
  field_name TEXT,           -- Campo modificado (ej: 'priority', 'step_id', 'stock_number')
  old_value TEXT,            -- Valor anterior
  new_value TEXT,            -- Valor nuevo
  description TEXT,          -- Descripción humanizada del cambio

  -- Metadata flexible (JSONB para info adicional)
  metadata JSONB DEFAULT '{}'::jsonb,
  -- Ejemplo: { "work_item_id": "...", "work_item_title": "Paint Touch-Up", ... }

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_get_ready_activity_vehicle_id
  ON public.get_ready_vehicle_activity_log(vehicle_id);

CREATE INDEX idx_get_ready_activity_created_at
  ON public.get_ready_vehicle_activity_log(created_at DESC);

CREATE INDEX idx_get_ready_activity_type
  ON public.get_ready_vehicle_activity_log(activity_type);

CREATE INDEX idx_get_ready_activity_action_by
  ON public.get_ready_vehicle_activity_log(action_by);

-- RLS Policies
ALTER TABLE public.get_ready_vehicle_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity for their dealerships"
  ON public.get_ready_vehicle_activity_log FOR SELECT
  USING (user_has_active_dealer_membership(auth.uid(), dealer_id));

CREATE POLICY "System can insert activity"
  ON public.get_ready_vehicle_activity_log FOR INSERT
  WITH CHECK (user_has_active_dealer_membership(auth.uid(), dealer_id));

-- Comments
COMMENT ON TABLE public.get_ready_vehicle_activity_log IS
  'Audit trail of all changes to Get Ready vehicles and related entities';
COMMENT ON COLUMN public.get_ready_vehicle_activity_log.activity_type IS
  'Type of activity: vehicle_created, vehicle_updated, step_changed, work_item_created, etc.';
COMMENT ON COLUMN public.get_ready_vehicle_activity_log.metadata IS
  'Flexible JSON metadata for additional context (work_item_id, old_step_name, etc.)';
```

---

## 🔧 FASE 2: TRIGGERS AUTOMÁTICOS

### **Trigger 1: Vehicle Changes**

```sql
CREATE OR REPLACE FUNCTION log_vehicle_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_dealer_id BIGINT;
  v_description TEXT;
  v_old_step_name TEXT;
  v_new_step_name TEXT;
BEGIN
  v_dealer_id := NEW.dealer_id;

  -- Log step changes
  IF OLD.step_id IS DISTINCT FROM NEW.step_id THEN
    -- Get step names for description
    SELECT name INTO v_old_step_name FROM get_ready_steps WHERE id = OLD.step_id;
    SELECT name INTO v_new_step_name FROM get_ready_steps WHERE id = NEW.step_id;

    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description, metadata
    ) VALUES (
      NEW.id, v_dealer_id, 'step_changed', auth.uid(), 'step_id',
      OLD.step_id, NEW.step_id,
      'Vehicle moved from ' || v_old_step_name || ' to ' || v_new_step_name,
      jsonb_build_object('old_step_name', v_old_step_name, 'new_step_name', v_new_step_name)
    );
  END IF;

  -- Log priority changes
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'priority_changed', auth.uid(), 'priority',
      OLD.priority, NEW.priority,
      'Priority changed from ' || OLD.priority || ' to ' || NEW.priority
    );
  END IF;

  -- Log workflow changes
  IF OLD.workflow_type IS DISTINCT FROM NEW.workflow_type THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'workflow_changed', auth.uid(), 'workflow_type',
      OLD.workflow_type, NEW.workflow_type,
      'Workflow changed from ' || OLD.workflow_type || ' to ' || NEW.workflow_type
    );
  END IF;

  -- Log stock number changes
  IF OLD.stock_number IS DISTINCT FROM NEW.stock_number THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'stock_updated', auth.uid(), 'stock_number',
      OLD.stock_number, NEW.stock_number,
      'Stock number updated from ' || OLD.stock_number || ' to ' || NEW.stock_number
    );
  END IF;

  -- Log assignment changes
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, field_name,
      old_value, new_value, description
    ) VALUES (
      NEW.id, v_dealer_id, 'assignment_changed', auth.uid(), 'assigned_to',
      COALESCE(OLD.assigned_to, 'Unassigned'),
      COALESCE(NEW.assigned_to, 'Unassigned'),
      'Assignment changed'
    );
  END IF;

  -- Log note changes
  IF OLD.notes IS DISTINCT FROM NEW.notes AND NEW.notes IS NOT NULL THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description
    ) VALUES (
      NEW.id, v_dealer_id, 'note_updated', auth.uid(),
      'Note ' || CASE WHEN OLD.notes IS NULL THEN 'added' ELSE 'updated' END
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_vehicle_changes ON public.get_ready_vehicles;
CREATE TRIGGER trigger_log_vehicle_changes
  AFTER UPDATE ON public.get_ready_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION log_vehicle_changes();
```

### **Trigger 2: Work Item Activities**

```sql
CREATE OR REPLACE FUNCTION log_work_item_activities()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle_id UUID;
  v_dealer_id BIGINT;
  v_action_type TEXT;
  v_description TEXT;
BEGIN
  v_vehicle_id := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  v_dealer_id := COALESCE(NEW.dealer_id, OLD.dealer_id);

  -- INSERT (new work item)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_created', auth.uid(),
      'Work item created: ' || NEW.title,
      jsonb_build_object(
        'work_item_id', NEW.id,
        'work_item_title', NEW.title,
        'work_type', NEW.work_type,
        'approval_required', NEW.approval_required
      )
    );
    RETURN NEW;
  END IF;

  -- UPDATE (status/approval changes)
  IF TG_OP = 'UPDATE' THEN
    -- Approval status changed
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      IF NEW.approval_status = 'approved' THEN
        v_action_type := 'work_item_approved';
        v_description := 'Work item approved: ' || NEW.title;
      ELSIF NEW.approval_status = 'declined' THEN
        v_action_type := 'work_item_declined';
        v_description := 'Work item declined: ' || NEW.title;
      END IF;

      IF v_action_type IS NOT NULL THEN
        INSERT INTO get_ready_vehicle_activity_log (
          vehicle_id, dealer_id, activity_type, action_by, description, metadata
        ) VALUES (
          v_vehicle_id, v_dealer_id, v_action_type, auth.uid(), v_description,
          jsonb_build_object('work_item_id', NEW.id, 'work_item_title', NEW.title)
        );
      END IF;
    END IF;

    -- Work item completed
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'completed' THEN
      INSERT INTO get_ready_vehicle_activity_log (
        vehicle_id, dealer_id, activity_type, action_by, description, metadata
      ) VALUES (
        v_vehicle_id, v_dealer_id, 'work_item_completed', auth.uid(),
        'Work item completed: ' || NEW.title,
        jsonb_build_object(
          'work_item_id', NEW.id,
          'work_item_title', NEW.title,
          'actual_cost', NEW.actual_cost,
          'actual_hours', NEW.actual_hours
        )
      );
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE
  IF TG_OP = 'DELETE' THEN
    INSERT INTO get_ready_vehicle_activity_log (
      vehicle_id, dealer_id, activity_type, action_by, description, metadata
    ) VALUES (
      v_vehicle_id, v_dealer_id, 'work_item_deleted', auth.uid(),
      'Work item deleted: ' || OLD.title,
      jsonb_build_object('work_item_title', OLD.title)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_work_item_activities ON public.get_ready_work_items;
CREATE TRIGGER trigger_log_work_item_activities
  AFTER INSERT OR UPDATE OR DELETE ON public.get_ready_work_items
  FOR EACH ROW
  EXECUTE FUNCTION log_work_item_activities();
```

---

## 🎨 FASE 3: COMPONENTE UI

### **Archivo:** `src/components/get-ready/VehicleActivityLog.tsx`

**Características:**
- Timeline vertical con iconos por tipo de actividad
- Agrupación inteligente por fecha (Today, Yesterday, This Week, Older)
- Formato humanizado: "Rudy Ruiz moved vehicle from Mechanical to Detailing"
- Iconos contextuales por activity_type
- Timestamps relativos ("2 hours ago", "Yesterday at 3:15 PM")
- Real-time updates (polling cada 30s)
- Infinite scroll para historial largo
- Empty state cuando no hay actividad

**Estructura Sugerida:**
```tsx
import { useVehicleActivityLog } from '@/hooks/useVehicleActivityLog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Edit,
  ArrowRight,
  CheckCircle,
  XCircle,
  Plus,
  Trash,
  FileText,
  Image,
  User
} from 'lucide-react';

interface VehicleActivityLogProps {
  vehicleId: string;
  className?: string;
}

export function VehicleActivityLog({ vehicleId }: VehicleActivityLogProps) {
  const { data: activities, isLoading } = useVehicleActivityLog(vehicleId);

  // Agrupar por fecha (Today, Yesterday, etc.)
  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {groupedActivities.map(group => (
          <div key={group.date}>
            <div className="text-sm font-semibold text-muted-foreground mb-3">
              {group.label} {/* "Today", "Yesterday", etc. */}
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              {group.activities.map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityItem({ activity }) {
  const icon = getActivityIcon(activity.activity_type);
  const timestamp = formatRelativeTime(activity.action_at);

  return (
    <div className="flex gap-3 relative">
      {/* Icon con color según tipo */}
      <div className="flex-shrink-0">{icon}</div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">
            {activity.user_name}
          </span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>

        <p className="text-sm text-foreground mt-1">
          {activity.description}
        </p>

        {/* Mostrar old → new para cambios */}
        {activity.old_value && activity.new_value && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="font-mono">
              {activity.old_value}
            </Badge>
            <ArrowRight className="h-3 w-3" />
            <Badge variant="outline" className="font-mono">
              {activity.new_value}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Iconos por Activity Type:**
```tsx
function getActivityIcon(type: string) {
  const iconMap = {
    'vehicle_created': <Plus className="h-4 w-4 text-green-500" />,
    'vehicle_updated': <Edit className="h-4 w-4 text-blue-500" />,
    'step_changed': <ArrowRight className="h-4 w-4 text-purple-500" />,
    'work_item_created': <Plus className="h-4 w-4 text-green-500" />,
    'work_item_approved': <CheckCircle className="h-4 w-4 text-green-600" />,
    'work_item_declined': <XCircle className="h-4 w-4 text-red-600" />,
    'work_item_completed': <CheckCircle className="h-4 w-4 text-green-600" />,
    'work_item_deleted': <Trash className="h-4 w-4 text-red-500" />,
    'note_added': <FileText className="h-4 w-4 text-blue-500" />,
    'note_updated': <Edit className="h-4 w-4 text-blue-500" />,
    'media_uploaded': <Image className="h-4 w-4 text-purple-500" />,
    'vendor_assigned': <User className="h-4 w-4 text-indigo-500" />,
    'priority_changed': <Edit className="h-4 w-4 text-orange-500" />,
    'workflow_changed': <Edit className="h-4 w-4 text-cyan-500" />,
  };

  return iconMap[type] || <Edit className="h-4 w-4 text-gray-500" />;
}
```

---

## 📡 FASE 4: HOOK DE DATOS

### **Archivo:** `src/hooks/useVehicleActivityLog.ts`

```typescript
import { supabase } from '@/integrations/supabase/client';
import { useInfiniteQuery } from '@tanstack/react-query';

export interface VehicleActivity {
  id: string;
  vehicle_id: string;
  dealer_id: number;
  activity_type: string;
  action_by: string;
  action_at: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  description: string;
  metadata?: any;
  created_at: string;
  // Joined data
  user: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
  };
}

const PAGE_SIZE = 20;

export function useVehicleActivityLog(vehicleId: string | null) {
  return useInfiniteQuery({
    queryKey: ['vehicle-activity-log', vehicleId],
    queryFn: async ({ pageParam = 0 }) => {
      if (!vehicleId) return { activities: [], hasMore: false };

      const { data, error } = await supabase
        .from('get_ready_vehicle_activity_log')
        .select(`
          *,
          user:profiles!action_by(
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

      if (error) {
        console.error('Error fetching activity log:', error);
        throw error;
      }

      return {
        activities: data || [],
        hasMore: data?.length === PAGE_SIZE
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!vehicleId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}
```

---

## 🔄 FASE 5: INTEGRACIÓN

### **Modificar VehicleDetailPanel.tsx:**

```typescript
// ELIMINAR import:
import { VehicleStepTimeHistory } from './VehicleStepTimeHistory';

// AGREGAR import:
import { VehicleActivityLog } from './VehicleActivityLog';

// REEMPLAZAR en tabs content:
// ANTES:
<TabsContent value="timeline" className="flex-1 overflow-auto px-4 pt-4 pb-8">
  {selectedVehicleId && (
    <VehicleStepTimeHistory vehicleId={selectedVehicleId} />
  )}
</TabsContent>

// DESPUÉS:
<TabsContent value="timeline" className="flex-1 overflow-auto px-4 pt-4 pb-8">
  {selectedVehicleId && (
    <VehicleActivityLog vehicleId={selectedVehicleId} />
  )}
</TabsContent>
```

---

## 🧪 FASE 6: TESTING

### **Test 1: Trigger de Vehicle Changes**
```sql
-- Test cambio de step
UPDATE get_ready_vehicles
SET step_id = 'other_step_id'
WHERE id = 'test_vehicle_id';

-- Verificar log creado
SELECT * FROM get_ready_vehicle_activity_log
WHERE vehicle_id = 'test_vehicle_id'
ORDER BY created_at DESC
LIMIT 1;

-- Debería mostrar:
-- activity_type: 'step_changed'
-- old_value: 'old_step_id'
-- new_value: 'other_step_id'
-- description: 'Vehicle moved from Mechanical to Detailing'
```

### **Test 2: Work Item Approval**
```
1. Ir a Detail Panel
2. Aprobar un work item
3. Cambiar a tab "Timeline"
4. Debería mostrar: "Rudy Ruiz approved work item: Paint Touch-Up"
```

### **Test 3: Priority Change**
```
1. Editar vehículo
2. Cambiar priority de Normal a High
3. Tab Timeline debería mostrar:
   "Rudy Ruiz changed priority from Normal to High"
```

---

## 📝 TRADUCCIONES NECESARIAS

### **EN:**
```json
"get_ready": {
  "activity_log": {
    "title": "Recent Activity",
    "no_activity": "No recent activity for this vehicle",
    "loading": "Loading activity...",
    "load_more": "Load more",
    "types": {
      "vehicle_created": "created vehicle",
      "step_changed": "moved vehicle",
      "work_item_created": "created work item",
      "work_item_approved": "approved work item",
      "work_item_declined": "declined work item",
      "work_item_completed": "completed work item",
      "priority_changed": "changed priority",
      "workflow_changed": "changed workflow",
      "note_added": "added note",
      "note_updated": "updated note"
    }
  }
}
```

### **ES + PT-BR:** Traducir las mismas keys

---

## ⚠️ CONSIDERACIONES IMPORTANTES

### **Performance:**
- ✅ Índices en vehicle_id y created_at para queries rápidas
- ✅ Infinite scroll para no cargar todo el historial
- ✅ Polling cada 30s (no real-time sockets)

### **Storage:**
- Activity log crece con el tiempo
- Considerar política de retención (¿guardar último año? ¿todo?)
- Estimado: ~10-20 registros por vehículo en promedio

### **Privacidad:**
- RLS policies aseguran que solo ven su dealership
- action_by permite saber quién hizo cada cambio
- Cumple con auditoría empresarial

---

## 📊 ARCHIVOS A CREAR/MODIFICAR

### **Crear (4 archivos):**
1. `supabase/migrations/20251017000001_create_vehicle_activity_log.sql` - Tabla + triggers
2. `src/components/get-ready/VehicleActivityLog.tsx` - Componente UI
3. `src/hooks/useVehicleActivityLog.ts` - Hook de datos
4. `src/utils/activityFormatters.ts` - Helpers para formatear

### **Modificar (2 archivos):**
1. `src/components/get-ready/VehicleDetailPanel.tsx` - Reemplazar Timeline
2. `public/translations/*.json` - Agregar keys (×3 idiomas)

### **Eliminar (2 archivos):**
1. `src/components/get-ready/VehicleStepTimeHistory.tsx` - Ya no necesario
2. `src/hooks/useVehicleStepHistory.ts` - Ya no necesario

---

## 🎯 ESTIMACIÓN DE TIEMPO

| Fase | Tiempo Estimado |
|------|-----------------|
| Fase 1: Migración DB | 30 min |
| Fase 2: Triggers | 45 min |
| Fase 3: Componente UI | 60 min |
| Fase 4: Hook | 20 min |
| Fase 5: Integración | 15 min |
| Fase 6: Testing | 30 min |
| Traducciones | 15 min |
| **TOTAL** | **~3.5 horas** |

---

## 🔗 REFERENCIAS

### **Código Existente a Revisar:**
- `src/components/orders/RecentActivity.tsx` - Patrón de UI
- `order_activity_log` table - Schema de referencia
- `get_ready_approval_history` - Patrón de historial

### **Migraciones Relacionadas:**
- `20251016000000_add_approval_system_to_get_ready.sql` - Approval history
- Ver estructura de `get_ready_approval_history` como referencia

---

## 📅 PRÓXIMA SESIÓN - CHECKLIST

### **Antes de empezar:**
- [ ] Revisar este documento completo
- [ ] Verificar que migraciones anteriores están aplicadas
- [ ] Confirmar que módulo Get Ready funciona correctamente

### **Durante implementación:**
1. [ ] Crear migración con tabla + triggers
2. [ ] Aplicar migración a Supabase
3. [ ] Crear componente VehicleActivityLog
4. [ ] Crear hook useVehicleActivityLog
5. [ ] Reemplazar en VehicleDetailPanel
6. [ ] Agregar traducciones (EN/ES/PT-BR)
7. [ ] Testing exhaustivo de triggers
8. [ ] Verificar que activity se registra correctamente
9. [ ] Testing de UI (agrupación, formateo, real-time)
10. [ ] Commit y push

---

## 💡 MEJORAS OPCIONALES (Futuras)

### **Filtros:**
- Filtrar por tipo de actividad
- Filtrar por usuario
- Búsqueda en descripción

### **Exportar:**
- Export activity log a CSV
- Generar reporte de auditoría

### **Notificaciones:**
- Highlight actividades críticas (rechazos, eliminaciones)
- Badge de "nueva actividad" en tab

---

**Implementado por:** Claude Code
**Sesión:** 16 de Octubre, 2025
**Status:** ✅ Planificado y documentado
**Listo para:** Próxima sesión de implementación

---

**NOTA:** Este plan asume que todas las implementaciones de la sesión actual (filtros, aprobaciones, búsqueda) están funcionando correctamente y committed.
