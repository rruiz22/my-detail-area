# Work Item Templates - Próximos Pasos

## ✅ Completado

### Fase 1: Core Functionality
- [x] Migración de base de datos (tabla `work_item_templates`)
- [x] RLS policies corregidas (JOIN con profiles)
- [x] Hook `useWorkItemTemplates` con CRUD completo
- [x] Auto-creación de work items al crear vehículo
- [x] UI completo de gestión de plantillas
- [x] Traducciones EN/ES/PT-BR (75 claves)

### Fase 2: Features Adicionales
- [x] Hook `useReorderTemplates()` - Reordenar plantillas
- [x] Hook `useDuplicateTemplate()` - Duplicar plantillas
- [x] Estructura base para drag & drop (GripVertical icon)

## 🚧 En Progreso

### Implementar Drag & Drop (UI)

**Archivos a modificar:**
1. `src/components/get-ready/WorkItemTemplatesManager.tsx`

**Cambios necesarios:**
```typescript
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useReorderTemplates } from '@/hooks/useWorkItemTemplates';

export function WorkItemTemplatesManager() {
  const reorderTemplates = useReorderTemplates();

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(activeTemplates);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all items
    const updates = items.map((item, index) => ({
      id: item.id,
      order_index: index
    }));

    reorderTemplates.mutate(updates);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="templates">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef}>
            {activeTemplates.map((template, index) => (
              <Draggable key={template.id} draggableId={template.id} index={index}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <TemplateCard template={template} index={index + 1} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

## 📝 Pendiente

### 1. Botón Duplicar Template

**Archivo:** `src/components/get-ready/WorkItemTemplatesManager.tsx`

**Cambios en TemplateCard:**
```typescript
import { Copy } from 'lucide-react';
import { useDuplicateTemplate } from '@/hooks/useWorkItemTemplates';

function TemplateCard({ template }) {
  const duplicateTemplate = useDuplicateTemplate();

  const handleDuplicate = () => {
    duplicateTemplate.mutate(template.id);
  };

  return (
    // ... existing code ...
    <Button variant="ghost" size="icon" onClick={handleDuplicate}>
      <Copy className="h-4 w-4" />
    </Button>
  );
}
```

### 2. Bulk Apply Templates a Vehículos Existentes

**Crear nuevo hook:** `src/hooks/useWorkItemTemplates.tsx`

```typescript
export function useBulkApplyTemplates() {
  const { t } = useTranslation();
  const { currentDealership } = useAccessibleDealerships();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ vehicleIds }: { vehicleIds: string[] }) => {
      if (!currentDealership?.id) throw new Error('No dealership selected');

      // Get auto-assign templates
      const { data: templates } = await supabase
        .from('work_item_templates')
        .select('*')
        .eq('dealer_id', currentDealership.id)
        .eq('is_active', true)
        .eq('auto_assign', true)
        .order('order_index', { ascending: true });

      if (!templates || templates.length === 0) return { created: 0 };

      // Create work items for each vehicle
      const workItemsToCreate = vehicleIds.flatMap(vehicleId =>
        templates.map(template => ({
          vehicle_id: vehicleId,
          dealer_id: currentDealership.id,
          title: template.name,
          description: template.description,
          work_type: template.work_type,
          status: 'pending',
          priority: template.priority,
          estimated_cost: template.estimated_cost,
          actual_cost: 0,
          estimated_hours: template.estimated_hours,
          actual_hours: 0,
          approval_required: template.approval_required,
        }))
      );

      const { data, error } = await supabase
        .from('get_ready_work_items')
        .insert(workItemsToCreate)
        .select();

      if (error) throw error;
      return { created: data.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      toast.success(t('get_ready.templates.bulk_applied', { count: result.created }));
    },
  });
}
```

**UI Component:** `src/components/get-ready/BulkApplyTemplatesDialog.tsx`

### 3. Estadísticas de Uso

**Crear query RPC en Supabase:**

```sql
CREATE OR REPLACE FUNCTION get_template_usage_stats(dealer_id_param INTEGER)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  usage_count BIGINT,
  avg_completion_time INTERVAL,
  success_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id as template_id,
    t.name as template_name,
    COUNT(wi.id) as usage_count,
    AVG(wi.actual_end - wi.actual_start) as avg_completion_time,
    (COUNT(CASE WHEN wi.status = 'completed' THEN 1 END)::NUMERIC /
     NULLIF(COUNT(wi.id), 0) * 100) as success_rate
  FROM work_item_templates t
  LEFT JOIN get_ready_work_items wi ON wi.title = t.name AND wi.dealer_id = t.dealer_id
  WHERE t.dealer_id = dealer_id_param
  GROUP BY t.id, t.name
  ORDER BY usage_count DESC;
END;
$$ LANGUAGE plpgsql;
```

**Hook:** `src/hooks/useTemplateStats.tsx`

```typescript
export function useTemplateStats() {
  const { currentDealership } = useAccessibleDealerships();

  return useQuery({
    queryKey: ['template-stats', currentDealership?.id],
    queryFn: async () => {
      if (!currentDealership?.id) return [];

      const { data, error } = await supabase
        .rpc('get_template_usage_stats', { dealer_id_param: currentDealership.id });

      if (error) throw error;
      return data;
    },
    enabled: !!currentDealership?.id,
  });
}
```

**UI Component:** Agregar tab "Statistics" en WorkItemTemplatesManager

## 🌐 Traducciones Faltantes

Agregar a `public/translations/*.json`:

```json
{
  "get_ready": {
    "templates": {
      "templates_reordered": "Templates reordered successfully",
      "error_reordering": "Failed to reorder templates",
      "template_duplicated": "Template duplicated successfully",
      "error_duplicating": "Failed to duplicate template",
      "bulk_apply": "Apply to Vehicles",
      "bulk_apply_description": "Apply these templates to existing vehicles without work items",
      "bulk_applied": "{{count}} work items created successfully",
      "select_vehicles": "Select Vehicles",
      "statistics": "Usage Statistics",
      "usage_count": "Times Used",
      "avg_completion_time": "Avg Completion",
      "success_rate": "Success Rate",
      "no_usage_data": "No usage data available yet"
    }
  }
}
```

## 🎯 Prioridad Recomendada

1. **Alta:** Botón Duplicar (5 min) - Muy útil para usuarios
2. **Media:** Drag & Drop UI (30 min) - Mejora UX significativamente
3. **Media:** Bulk Apply (1 hora) - Para vehículos existentes
4. **Baja:** Estadísticas (2 horas) - Nice to have, no crítico

## 📊 Impacto vs Esfuerzo

| Feature | Impacto | Esfuerzo | ROI |
|---------|---------|----------|-----|
| Duplicar | Alto | Bajo | ⭐⭐⭐⭐⭐ |
| Drag & Drop | Alto | Medio | ⭐⭐⭐⭐ |
| Bulk Apply | Medio | Alto | ⭐⭐⭐ |
| Estadísticas | Bajo | Alto | ⭐⭐ |

## 🚀 Para Continuar

1. Ejecutar migración SQL en Supabase Dashboard
2. Agregar botón duplicar (más rápido)
3. Implementar drag & drop
4. Agregar traducciones faltantes
5. (Opcional) Bulk apply y estadísticas

¿Deseas que continúe con alguna de estas features?
