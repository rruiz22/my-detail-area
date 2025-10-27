# Work Items Tab - Complete Implementation Plan

## 🎯 Objetivo

Implementar todas las mejoras identificadas en el Work Items Tab para maximizar visibilidad de información crítica, mejorar UX en todos los dispositivos, y proporcionar métricas de negocio en tiempo real.

---

## 📋 TODO List Completo

### 🔴 FASE 1: CRÍTICO - Hacer Primero (1 hora)

- [ ] **1.1 Mover Timer a Posición Visible**
  - Integrar LiveWorkTimer en título del work item
  - Eliminar columna Timer (hidden xl:table-cell)
  - Actualizar TableHeader para remover columna
  - Visible en TODOS los dispositivos
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 30 minutos

- [ ] **1.2 Actualizar Type Definitions**
  - Agregar `blocked_reason?: string` al tipo WorkItem
  - Agregar `on_hold_reason?: string` al tipo WorkItem
  - Agregar `cancel_reason?: string` al tipo WorkItem
  - Fix type casting de `assigned_to`
  - **Archivos:** `useVehicleWorkItems.tsx`, `WorkItemsGroupedTable.tsx`
  - **Estimado:** 15 minutos

- [ ] **1.3 Testing Básico Fase 1**
  - Verificar timer visible en mobile
  - Verificar timer visible en tablet
  - Verificar timer visible en desktop
  - Verificar no errors de TypeScript
  - **Estimado:** 15 minutos

---

### 🟡 FASE 2: IMPORTANTE - Métricas de Negocio (2.5 horas)

- [ ] **2.1 Actual vs Estimated - Cost**
  - Mostrar actual_cost si existe
  - Mostrar estimated_cost como referencia
  - Color coding (verde = under budget, rojo = over budget)
  - Mostrar percentage de variance
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 25 minutos

- [ ] **2.2 Actual vs Estimated - Hours**
  - Mostrar actual_hours si existe
  - Mostrar estimated_hours como referencia
  - Color coding (verde = under time, rojo = over time)
  - Mostrar percentage de variance
  - Auto-calculate hours para in_progress items
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 25 minutos

- [ ] **2.3 Assigned Technician Visible**
  - Crear badge compacto en título
  - Usar User icon + first name
  - Tooltip con full name
  - Visible en todos los dispositivos
  - Eliminar/repurpose columna Assigned
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 30 minutos

- [ ] **2.4 Completed Items Time Display**
  - Mostrar badge con tiempo final (actual_hours)
  - CheckCircle icon + tiempo
  - Color verde para completado
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 20 minutos

- [ ] **2.5 On Hold / Blocked Time Display**
  - Calcular tiempo transcurrido desde actual_start
  - Mostrar en badge con Pause/AlertTriangle icon
  - Color gris para on_hold, naranja para blocked
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 25 minutos

- [ ] **2.6 Testing Completo Fase 2**
  - Verificar variance calculations correctos
  - Verificar color coding funciona
  - Verificar assigned tech badge visible
  - Verificar completed/on_hold/blocked time display
  - Testing en mobile/tablet/desktop
  - **Estimado:** 25 minutos

---

### 🟢 FASE 3: MEJORAS UI/UX (2 horas)

- [ ] **3.1 Progress Bar Visual**
  - Calcular % de tiempo gastado vs estimado
  - Barra de progreso con color (verde → rojo)
  - Texto con percentage
  - Solo para in_progress items con estimated_hours
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 30 minutos

- [ ] **3.2 Timer Status Icons Dinámicos**
  - ThumbsUp para < 2h (verde)
  - Clock para 2-4h (azul)
  - AlertTriangle para 4-8h (ámbar)
  - AlertCircle con pulse para > 8h (rojo)
  - **Archivos:** `LiveWorkTimer.tsx`
  - **Estimado:** 20 minutos

- [ ] **3.3 Compact Mode Toggle**
  - State en VehicleWorkItemsTab
  - Toggle button con Maximize2/Minimize2 icons
  - Pass prop a WorkItemsGroupedTable
  - Ajustar padding/spacing en compact mode
  - **Archivos:** `VehicleWorkItemsTab.tsx`, `WorkItemsGroupedTable.tsx`
  - **Estimado:** 35 minutos

- [ ] **3.4 Mejor Feedback Visual**
  - Hover effects mejorados
  - Transitions suaves
  - Loading states
  - Empty states mejorados
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 20 minutos

- [ ] **3.5 Testing Final Fase 3**
  - Verificar progress bar accuracy
  - Verificar icons dinámicos
  - Verificar compact mode toggle
  - Verificar animations fluidas
  - **Estimado:** 15 minutos

---

### 🛡️ FASE 4: ROBUSTEZ Y PERFORMANCE (1.5 horas)

- [ ] **4.1 Error Boundaries**
  - Wrap LiveWorkTimer en ErrorBoundary
  - Fallback component para timer errors
  - Error handling para date parsing
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 25 minutos

- [ ] **4.2 Performance Optimizations**
  - Memoize calculations pesados
  - useMemo para grouped items
  - useCallback para handlers
  - Lazy rendering de grupos colapsados
  - **Archivos:** `WorkItemsGroupedTable.tsx`, `VehicleWorkItemsTab.tsx`
  - **Estimado:** 30 minutos

- [ ] **4.3 Accessibility Improvements**
  - ARIA labels en botones
  - Keyboard navigation
  - Focus management
  - Screen reader support
  - **Archivos:** `WorkItemsGroupedTable.tsx`
  - **Estimado:** 25 minutos

- [ ] **4.4 Testing de Robustez**
  - Test con datos inválidos
  - Test con null/undefined values
  - Test con fechas futuras
  - Test con valores negativos
  - **Estimado:** 10 minutos

---

## 🗂️ Archivos a Modificar

### Principales:
1. **`src/components/get-ready/WorkItemsGroupedTable.tsx`** - La mayoría de cambios
2. **`src/components/get-ready/VehicleWorkItemsTab.tsx`** - Compact mode, counters
3. **`src/components/get-ready/LiveWorkTimer.tsx`** - Icons dinámicos
4. **`src/hooks/useVehicleWorkItems.tsx`** - Type definitions

### Opcionales (si necesario):
5. **`src/utils/workItemUtils.ts`** - Helper functions (crear nuevo)
6. **`src/components/ui/error-boundary.tsx`** - Error boundary (crear nuevo)

---

## 📊 Timeline Estimado

| Fase | Tiempo | Cuando | Entregables |
|------|--------|--------|-------------|
| **Fase 1** | 1h | Inmediato | Timer visible, types actualizados |
| **Fase 2** | 2.5h | Día 1-2 | Métricas actual vs estimated |
| **Fase 3** | 2h | Día 2-3 | Progress bar, compact mode |
| **Fase 4** | 1.5h | Día 3-4 | Error handling, performance |
| **TOTAL** | **7h** | **3-4 días** | Work Items Tab completo |

---

## 🔨 Implementación Detallada

### FASE 1.1: Mover Timer a Título

#### Paso 1: Backup
```bash
cp src/components/get-ready/WorkItemsGroupedTable.tsx src/components/get-ready/WorkItemsGroupedTable.BACKUP.tsx
```

#### Paso 2: Modificar renderWorkItem (línea ~139)

**ANTES:**
```tsx
<TableCell className="min-w-[200px]">
  <div className="flex items-start gap-2">
    <div className="pt-0.5">
      <WorkItemStatusBadge ... />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-medium text-sm line-clamp-1">{item.title}</span>
        {/* ... badges ... */}
      </div>
      {/* ... description ... */}
    </div>
  </div>
</TableCell>

{/* ... other cells ... */}

{/* Timer */}
<TableCell className="hidden xl:table-cell">
  {item.status === 'in_progress' && item.actual_start && (
    <LiveWorkTimer startTime={item.actual_start} size="sm" showStopButton={false} />
  )}
</TableCell>
```

**DESPUÉS:**
```tsx
<TableCell className="min-w-[200px]">
  <div className="flex items-start gap-2">
    <div className="pt-0.5">
      <WorkItemStatusBadge ... />
    </div>
    <div className="flex-1 min-w-0">
      {/* ✨ ENHANCED: Title with inline timer and badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="font-medium text-sm line-clamp-1">{item.title}</span>

          {/* Existing reason badges */}
          {item.status === 'blocked' && item.blocked_reason && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300 text-xs">
              {t('get_ready.work_items.blocked')}: {item.blocked_reason}
            </Badge>
          )}
          {item.status === 'on_hold' && item.on_hold_reason && (
            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
              {t('get_ready.work_items.on_hold')}: {item.on_hold_reason}
            </Badge>
          )}
        </div>

        {/* ✨ NEW: Timer always visible for in_progress items */}
        {item.status === 'in_progress' && item.actual_start && (
          <div className="flex-shrink-0">
            <LiveWorkTimer
              startTime={item.actual_start}
              size="sm"
              showStopButton={false}
            />
          </div>
        )}

        {/* ✨ NEW: Final time for completed items */}
        {item.status === 'completed' && item.actual_hours && (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 font-mono text-xs flex-shrink-0"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {item.actual_hours.toFixed(1)}h
          </Badge>
        )}

        {/* ✨ NEW: Elapsed time for on_hold/blocked (if has actual_start) */}
        {(item.status === 'on_hold' || item.status === 'blocked') && item.actual_start && (
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-xs flex-shrink-0",
              item.status === 'on_hold'
                ? "bg-gray-50 text-gray-700 border-gray-200"
                : "bg-orange-50 text-orange-700 border-orange-200"
            )}
          >
            {item.status === 'on_hold' ? (
              <Pause className="h-3 w-3 mr-1" />
            ) : (
              <AlertTriangle className="h-3 w-3 mr-1" />
            )}
            {/* Calculate elapsed from actual_start to now */}
            {(() => {
              const start = new Date(item.actual_start);
              const now = new Date();
              const hours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
              return hours.toFixed(1);
            })()}h
          </Badge>
        )}
      </div>

      {/* ... existing description and media/notes badges ... */}
    </div>
  </div>
</TableCell>

{/* ❌ ELIMINAR: Timer column ya no necesaria */}
```

#### Paso 3: Actualizar TableHeader (línea ~457)

**ANTES:**
```tsx
<TableHeader>
  <TableRow>
    <TableHead>{t('get_ready.work_items.title')}</TableHead>
    <TableHead className="hidden sm:table-cell">{t('get_ready.work_items.type_priority')}</TableHead>
    <TableHead className="hidden md:table-cell">{t('get_ready.work_items.cost_hours')}</TableHead>
    <TableHead className="hidden lg:table-cell">{t('get_ready.work_items.assigned')}</TableHead>
    <TableHead className="hidden xl:table-cell">{t('get_ready.work_items.timer')}</TableHead>
    <TableHead className="text-right">{t('common.actions')}</TableHead>
  </TableRow>
</TableHeader>
```

**DESPUÉS:**
```tsx
<TableHeader>
  <TableRow>
    <TableHead>{t('get_ready.work_items.title')}</TableHead>
    <TableHead className="hidden sm:table-cell">{t('get_ready.work_items.type_priority')}</TableHead>
    <TableHead className="hidden md:table-cell">{t('get_ready.work_items.cost_hours')}</TableHead>
    <TableHead className="hidden lg:table-cell">{t('get_ready.work_items.assigned')}</TableHead>
    {/* ❌ ELIMINADO: Timer column */}
    <TableHead className="text-right">{t('common.actions')}</TableHead>
  </TableRow>
</TableHeader>
```

#### Paso 4: Agregar Imports Necesarios

```tsx
import {
  // ... existing imports ...
  CheckCircle,  // ✅ Verificar si ya existe
  Pause,        // ✅ Verificar si ya existe
  AlertTriangle // ✅ Verificar si ya existe
} from 'lucide-react';
```

---

### FASE 1.2: Actualizar Type Definitions

#### Archivo: `src/hooks/useVehicleWorkItems.tsx`

**Buscar interface existente y agregar:**
```tsx
export interface WorkItem {
  id: string;
  vehicle_id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  work_type: WorkItemType;
  priority: number;
  estimated_cost: number;
  estimated_hours: number;
  actual_cost?: number;
  actual_hours?: number;
  actual_start?: string;
  actual_end?: string;
  approval_required: boolean;
  approval_status?: string;
  approval_notes?: string;
  approved_by?: string;
  declined_by?: string;
  decline_reason?: string;
  assigned_technician?: string;
  assigned_vendor_id?: string;
  assigned_technician_profile?: {
    first_name: string;
    last_name: string;
  };
  media_count?: number;
  notes_count?: number;

  // ✨ NEW: Add missing fields
  blocked_reason?: string;
  on_hold_reason?: string;
  cancel_reason?: string;

  created_at: string;
  updated_at: string;
  deleted_at?: string;
}
```

#### Archivo: `src/components/get-ready/WorkItemsGroupedTable.tsx`

**Actualizar interface local:**
```tsx
interface WorkItem {
  id: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  work_type: string;
  priority: number;
  estimated_cost: number;
  estimated_hours: number;
  actual_cost?: number;
  actual_hours?: number;
  actual_start?: string;
  approval_required: boolean;
  approval_status?: boolean;
  decline_reason?: string;
  assigned_technician_profile?: {
    first_name: string;
    last_name: string;
  };
  media_count?: number;
  notes_count?: number;

  // ✨ NEW: Add missing fields
  blocked_reason?: string;
  on_hold_reason?: string;
  cancel_reason?: string;
}
```

**Fix type casting:**
```tsx
// ANTES (línea ~244):
{(item.assigned_technician_profile || (item as any).assigned_to) && (

// DESPUÉS:
{item.assigned_technician_profile && (
```

---

### FASE 2.1 & 2.2: Actual vs Estimated Display

#### Archivo: `src/components/get-ready/WorkItemsGroupedTable.tsx`

**Línea ~224, reemplazar toda la celda Cost & Hours:**

```tsx
{/* Cost & Hours - ENHANCED with Actual vs Estimated */}
<TableCell className="hidden md:table-cell">
  <div className="flex flex-col gap-1.5 text-xs">
    {/* Cost - Show actual vs estimated with variance */}
    {(item.estimated_cost > 0 || item.actual_cost) && (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          {item.actual_cost ? (
            <>
              <span className={cn(
                "font-semibold",
                item.actual_cost > item.estimated_cost ? "text-red-600" : "text-green-600"
              )}>
                ${item.actual_cost.toFixed(0)}
              </span>
              {item.estimated_cost > 0 && (
                <span className="text-muted-foreground text-[10px]">
                  / ${item.estimated_cost.toFixed(0)}
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              ${item.estimated_cost.toFixed(0)}
            </span>
          )}
        </div>
        {/* Variance percentage */}
        {item.actual_cost && item.estimated_cost > 0 && (
          <div className={cn(
            "text-[10px] ml-4 font-medium",
            item.actual_cost > item.estimated_cost ? "text-red-600" : "text-green-600"
          )}>
            {item.actual_cost > item.estimated_cost ? '↑' : '↓'}
            {Math.abs(((item.actual_cost / item.estimated_cost) * 100) - 100).toFixed(0)}%
            {item.actual_cost > item.estimated_cost ? 'over' : 'under'}
          </div>
        )}
      </div>
    )}

    {/* Hours - Show actual vs estimated with variance */}
    {(item.estimated_hours > 0 || item.actual_hours) && (
      <div className="space-y-0.5">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          {item.actual_hours ? (
            <>
              <span className={cn(
                "font-semibold",
                item.actual_hours > item.estimated_hours ? "text-red-600" : "text-green-600"
              )}>
                {item.actual_hours.toFixed(1)}h
              </span>
              {item.estimated_hours > 0 && (
                <span className="text-muted-foreground text-[10px]">
                  / {item.estimated_hours.toFixed(1)}h
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              {item.estimated_hours.toFixed(1)}h
            </span>
          )}
        </div>
        {/* Variance percentage */}
        {item.actual_hours && item.estimated_hours > 0 && (
          <div className={cn(
            "text-[10px] ml-4 font-medium",
            item.actual_hours > item.estimated_hours ? "text-red-600" : "text-green-600"
          )}>
            {item.actual_hours > item.estimated_hours ? '↑' : '↓'}
            {Math.abs(((item.actual_hours / item.estimated_hours) * 100) - 100).toFixed(0)}%
            {item.actual_hours > item.estimated_hours ? 'over' : 'under'}
          </div>
        )}
      </div>
    )}

    {/* Special case: in_progress with actual_start but no actual_hours yet */}
    {item.status === 'in_progress' && item.actual_start && !item.actual_hours && item.estimated_hours > 0 && (
      <div className="text-[10px] text-muted-foreground ml-4 italic">
        {(() => {
          const start = new Date(item.actual_start);
          const now = new Date();
          const currentHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
          const percentage = (currentHours / item.estimated_hours) * 100;
          return `${percentage.toFixed(0)}% of est.`;
        })()}
      </div>
    )}
  </div>
</TableCell>
```

---

### FASE 2.3: Assigned Technician Badge

**En la sección de título (después de item.title):**

```tsx
<div className="flex items-center gap-2 flex-1 min-w-0">
  <span className="font-medium text-sm line-clamp-1">{item.title}</span>

  {/* ✨ NEW: Assigned technician badge - Always visible */}
  {item.assigned_technician_profile && (
    <Badge
      variant="secondary"
      className="text-xs bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 gap-1 flex-shrink-0"
    >
      <User className="h-3 w-3" />
      {item.assigned_technician_profile.first_name}
    </Badge>
  )}

  {/* ... existing badges ... */}
</div>
```

**Eliminar o repurpose la columna Assigned:**

```tsx
{/* Assigned - REPURPOSE: Show vendor info instead if available */}
<TableCell className="hidden lg:table-cell">
  {item.assigned_vendor_id && item.vendor_profile && (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Building className="h-3 w-3" />
      <span className="truncate max-w-[120px]">
        {item.vendor_profile.name}
      </span>
    </div>
  )}
</TableCell>
```

---

### FASE 3.1: Progress Bar

**Agregar después del título/badges, dentro del div principal:**

```tsx
{/* ✨ NEW: Progress bar for in_progress items */}
{item.status === 'in_progress' && item.estimated_hours > 0 && item.actual_start && (
  <div className="mt-1.5 w-full">
    {(() => {
      const start = new Date(item.actual_start);
      const now = new Date();
      const currentHours = (now.getTime() - start.getTime()) / (1000 * 60 * 60);
      const percentage = (currentHours / item.estimated_hours) * 100;
      const cappedPercentage = Math.min(percentage, 100);

      return (
        <>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                percentage <= 80 ? "bg-green-500" :
                percentage <= 100 ? "bg-yellow-500" :
                "bg-red-500"
              )}
              style={{ width: `${cappedPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[10px] text-muted-foreground">
              {currentHours.toFixed(1)}h / {item.estimated_hours.toFixed(1)}h
            </span>
            <span className={cn(
              "text-[10px] font-medium",
              percentage <= 80 ? "text-green-600" :
              percentage <= 100 ? "text-yellow-600" :
              "text-red-600"
            )}>
              {percentage.toFixed(0)}%
            </span>
          </div>
        </>
      );
    })()}
  </div>
)}
```

---

### FASE 3.2: Timer Icons Dinámicos

#### Archivo: `src/components/get-ready/LiveWorkTimer.tsx`

**Agregar imports:**
```tsx
import { Clock, StopCircle, ThumbsUp, AlertTriangle, AlertCircle } from 'lucide-react';
```

**Modificar función getStatusColor y agregar getStatusIcon:**

```tsx
// Visual indicator based on elapsed time
const getStatusColor = () => {
  if (hours < 2) return 'bg-green-100 text-green-800 border-green-200';
  if (hours < 4) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (hours < 8) return 'bg-amber-100 text-amber-800 border-amber-200';
  return 'bg-red-100 text-red-800 border-red-200';
};

// ✨ NEW: Dynamic icon based on elapsed time
const getStatusIcon = () => {
  if (hours < 2) return ThumbsUp;
  if (hours < 4) return Clock;
  if (hours < 8) return AlertTriangle;
  return AlertCircle;
};

const StatusIcon = getStatusIcon();
```

**Actualizar el Badge:**
```tsx
<Badge
  variant="outline"
  className={cn('font-mono tabular-nums', getStatusColor(), sizeClasses[size])}
>
  <StatusIcon className={cn('mr-1', iconSize[size], hours >= 8 && 'animate-pulse')} />
  {formatted}
</Badge>
```

---

### FASE 3.3: Compact Mode

#### Archivo: `src/components/get-ready/VehicleWorkItemsTab.tsx`

**Agregar state y button:**

```tsx
import { Maximize2, Minimize2 } from 'lucide-react';

export function VehicleWorkItemsTab({ ... }) {
  // ... existing code ...

  // ✨ NEW: Compact mode state
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* ... counters ... */}

      {/* Add Work Item Button */}
      <div className="flex gap-2 mb-4">
        <Button size="sm" onClick={() => setQuickAddModalOpen(true)} className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          {t('get_ready.work_items.add_work_item')}
        </Button>

        {/* ✨ NEW: Compact mode toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompactMode(!compactMode)}
                className="px-3"
              >
                {compactMode ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {compactMode ? t('get_ready.work_items.expand_view') : t('get_ready.work_items.compact_view')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Work Items Grouped Table */}
      <div className="flex-1 pb-4">
        <WorkItemsGroupedTable
          workItems={workItems}
          compactMode={compactMode}  // ✨ NEW PROP
          {/* ... other props ... */}
        />
      </div>
    </div>
  );
}
```

#### Archivo: `src/components/get-ready/WorkItemsGroupedTable.tsx`

**Agregar prop al interface:**
```tsx
interface WorkItemsGroupedTableProps {
  workItems: WorkItem[];
  compactMode?: boolean;  // ✨ NEW
  // ... other props ...
}
```

**Usar en renderWorkItem:**
```tsx
export function WorkItemsGroupedTable({
  workItems,
  compactMode = false,  // ✨ NEW
  // ... other props ...
}) {

  const renderWorkItem = (item: WorkItem) => (
    <TableRow
      key={item.id}
      className={cn(
        'hover:bg-muted/50 transition-colors',
        getStatusBorderColor(item.status),
        compactMode && 'text-xs'  // ✨ Smaller text in compact mode
      )}
    >
      <TableCell className={cn('min-w-[200px]', compactMode && 'py-2')}>
        {/* ✨ Adjust padding and spacing in compact mode */}
        <div className={cn('flex items-start gap-2', compactMode && 'gap-1.5')}>
          {/* ... rest of content ... */}
        </div>
      </TableCell>
      {/* ... other cells ... */}
    </TableRow>
  );
}
```

---

### FASE 4.1: Error Boundaries

#### Crear nuevo archivo: `src/components/ui/error-boundary.tsx`

```tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center gap-1 text-xs text-red-500">
          <AlertTriangle className="h-3 w-3" />
          <span>Error</span>
        </div>
      );
    }

    return this.props.children;
  }
}
```

#### Usar en WorkItemsGroupedTable:

```tsx
import { ErrorBoundary } from '@/components/ui/error-boundary';

{/* Wrap timer en ErrorBoundary */}
{item.status === 'in_progress' && item.actual_start && (
  <ErrorBoundary fallback={
    <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
      Timer Error
    </Badge>
  }>
    <LiveWorkTimer
      startTime={item.actual_start}
      size="sm"
      showStopButton={false}
    />
  </ErrorBoundary>
)}
```

---

### FASE 4.2: Performance Optimizations

```tsx
import { useMemo, useCallback } from 'react';

export function WorkItemsGroupedTable({ workItems, ... }) {
  // ✨ Memoize grouped items
  const groupedItems = useMemo(() => ({
    pending: workItems.filter((item) => item.status === 'pending' || item.status === 'queued'),
    awaiting_approval: workItems.filter((item) => item.status === 'awaiting_approval'),
    rejected: workItems.filter((item) => item.status === 'rejected'),
    scheduled: workItems.filter((item) => item.status === 'scheduled'),
    in_progress: workItems.filter((item) => item.status === 'in_progress'),
    on_hold: workItems.filter((item) => item.status === 'on_hold'),
    blocked: workItems.filter((item) => item.status === 'blocked'),
    completed: workItems.filter((item) => item.status === 'completed'),
    cancelled: workItems.filter((item) => item.status === 'cancelled'),
  }), [workItems]);

  // ✨ Memoize heavy calculations
  const calculateElapsedHours = useCallback((startTime: string) => {
    try {
      const start = new Date(startTime);
      if (isNaN(start.getTime())) return 0;
      const now = new Date();
      return (now.getTime() - start.getTime()) / (1000 * 60 * 60);
    } catch (error) {
      console.error('Error calculating elapsed hours:', error);
      return 0;
    }
  }, []);

  // ... rest of component ...
}
```

---

## 🧪 Testing Checklist

### Después de Fase 1:
- [ ] Timer visible en mobile (<640px)
- [ ] Timer visible en tablet (640-1024px)
- [ ] Timer visible en desktop (>1024px)
- [ ] No TypeScript errors
- [ ] Timer updates cada segundo
- [ ] Completed items muestran tiempo final
- [ ] On hold/blocked muestran tiempo transcurrido

### Después de Fase 2:
- [ ] Actual cost se muestra correctamente
- [ ] Estimated cost se muestra como referencia
- [ ] Color coding funciona (verde/rojo)
- [ ] Variance percentage es correcto
- [ ] Lo mismo para hours
- [ ] Assigned tech badge visible en todos los dispositivos
- [ ] Tooltip muestra nombre completo

### Después de Fase 3:
- [ ] Progress bar se calcula correctamente
- [ ] Progress bar colors cambian según %
- [ ] Timer icons cambian según tiempo
- [ ] Compact mode toggle funciona
- [ ] Compact mode reduce spacing
- [ ] Animations son suaves

### Después de Fase 4:
- [ ] Error boundary captura errores
- [ ] Fallback se muestra correctamente
- [ ] No memory leaks
- [ ] Performance es aceptable con 50+ items
- [ ] ARIA labels funcionan
- [ ] Keyboard navigation funciona

---

## 📝 Traducciones Necesarias

Agregar a `public/translations/en.json`, `es.json`, `pt-BR.json`:

```json
{
  "get_ready": {
    "work_items": {
      "timer": "Timer",
      "compact_view": "Compact View",
      "expand_view": "Expand View",
      "over": "over budget",
      "under": "under budget",
      "of_estimated": "of estimated"
    }
  }
}
```

---

## 🎯 Criterios de Éxito

### Fase 1:
- ✅ Timer visible en 100% de dispositivos
- ✅ 0 TypeScript errors
- ✅ Testing básico pasa

### Fase 2:
- ✅ Métricas actual vs estimated funcionan
- ✅ Color coding correcto
- ✅ Assigned tech siempre visible

### Fase 3:
- ✅ Progress bar preciso
- ✅ Icons dinámicos
- ✅ Compact mode toggle funcional

### Fase 4:
- ✅ Error handling robusto
- ✅ Performance optimizada
- ✅ Accessibility compliant

---

## 🚀 Orden de Ejecución

1. **Crear backup** de todos los archivos
2. **Fase 1** (1h) - Timer visibility
3. **Testing Fase 1** (15 min)
4. **Commit** con mensaje: "feat(work-items): make timer visible on all devices"
5. **Fase 2** (2.5h) - Métricas de negocio
6. **Testing Fase 2** (25 min)
7. **Commit**: "feat(work-items): add actual vs estimated metrics"
8. **Fase 3** (2h) - UI/UX improvements
9. **Testing Fase 3** (15 min)
10. **Commit**: "feat(work-items): add progress bar and compact mode"
11. **Fase 4** (1.5h) - Robustez
12. **Testing Fase 4** (10 min)
13. **Commit**: "feat(work-items): add error handling and performance optimizations"
14. **Testing Final Completo** (30 min)
15. **Documentación actualizada**

---

**TOTAL ESTIMADO: 7 horas + 1.5h testing = 8.5 horas**

**Timeline Recomendado: 3-4 días de trabajo (2-3h por día)**

¿Listo para empezar con Fase 1? 🚀
