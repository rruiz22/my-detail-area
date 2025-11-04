# FASE 2: Plan Detallado - Implementar Permisos en DashboardMetrics

**Fecha**: 2025-11-03
**Estado**: Ejecutando
**Riesgo**: BAJO (solo agregar filtrado, no remover funcionalidad)

---

## 🎯 Objetivo

Hacer que `DashboardMetrics` muestre métricas **SOLO** de los módulos a los que el usuario tiene permiso de 'view'.

### Problema Actual:
```typescript
// ❌ Usuario con solo acceso a "sales_orders"
totalOrders: 100      // Incluye sales + service + recon + carwash
pendingOrders: 25     // Incluye todos los módulos
completedToday: 10    // Incluye todos los módulos
```

### Solución:
```typescript
// ✅ Usuario con solo acceso a "sales_orders"
totalOrders: 60       // Solo sales orders
pendingOrders: 15     // Solo sales pending
completedToday: 5     // Solo sales completed hoy
```

---

## 📋 Cambios Detallados

### 🎯 Cambio 1: DashboardMetrics.tsx - Imports

**Archivo**: `src/components/dashboard/DashboardMetrics.tsx`
**Líneas**: 1-12
**Acción**: AGREGAR imports

#### ANTES:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Car
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/useDashboardData';
```

#### DESPUÉS:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';  // NEW
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Car,
  Shield  // NEW - para badge de permisos
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';  // NEW
import { useMemo } from 'react';  // NEW
```

**Impacto**: Solo imports, sin cambios funcionales
**Riesgo**: NINGUNO

---

### 🎯 Cambio 2: DashboardMetrics.tsx - Calcular allowedOrderTypes

**Archivo**: `src/components/dashboard/DashboardMetrics.tsx`
**Línea**: ~93 (después de hooks)
**Acción**: AGREGAR lógica de permisos

#### AGREGAR:
```typescript
export function DashboardMetrics() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();  // NEW

  // Calculate which order types the user has permission to view
  const allowedOrderTypes = useMemo(() => {
    const types: string[] = [];

    if (hasPermission('sales_orders', 'view')) types.push('sales');
    if (hasPermission('service_orders', 'view')) types.push('service');
    if (hasPermission('recon_orders', 'view')) types.push('recon');
    if (hasPermission('car_wash', 'view')) types.push('carwash');

    return types;
  }, [hasPermission]);

  // Pass allowed types to dashboard data hook
  const { data: dashboardData, isLoading } = useDashboardData(allowedOrderTypes);  // MODIFIED

  // ... resto del código
```

**Impacto**: Filtra datos por permisos del usuario
**Riesgo**: BAJO - solo agregar filtrado

---

### 🎯 Cambio 3: useDashboardData.ts - Aceptar parámetro allowedOrderTypes

**Archivo**: `src/hooks/useDashboardData.ts`
**Línea**: 31 (firma de función)
**Acción**: MODIFICAR signature

#### ANTES:
```typescript
export function useDashboardData() {
  const { user } = useAuth();
  const [selectedDealer, setSelectedDealer] = useState<number | 'all'>('all');
```

#### DESPUÉS:
```typescript
export function useDashboardData(allowedOrderTypes?: string[]) {
  const { user } = useAuth();
  const [selectedDealer, setSelectedDealer] = useState<number | 'all'>('all');
```

**Impacto**: Parámetro opcional, backward compatible
**Riesgo**: NINGUNO

---

### 🎯 Cambio 4: useDashboardData.ts - Aplicar filtro en query

**Archivo**: `src/hooks/useDashboardData.ts`
**Líneas**: ~71-74 (Supabase query)
**Acción**: AGREGAR filtro condicional

#### ANTES:
```typescript
const { data: orders, error } = await supabase
  .from('orders')
  .select('order_type, status, created_at, updated_at');
```

#### DESPUÉS:
```typescript
// Build query with optional order_type filter
let query = supabase
  .from('orders')
  .select('order_type, status, created_at, updated_at');

// If allowedOrderTypes provided, filter query to only those types
if (allowedOrderTypes && allowedOrderTypes.length > 0) {
  query = query.in('order_type', allowedOrderTypes);
}

const { data: orders, error } = await query;
```

**Impacto**: Reduce payload de red, solo trae órdenes permitidas
**Riesgo**: BAJO - mejora performance y seguridad

---

### 🎯 Cambio 5: useDashboardData.ts - Actualizar queryKey

**Archivo**: `src/hooks/useDashboardData.ts`
**Línea**: 54 (queryKey)
**Acción**: INCLUIR allowedOrderTypes en cache key

#### ANTES:
```typescript
queryKey: ['dashboard-data', user?.id, selectedDealer],
```

#### DESPUÉS:
```typescript
queryKey: ['dashboard-data', user?.id, selectedDealer, allowedOrderTypes],
```

**Impacto**: Cache separado por permisos (correcto)
**Riesgo**: NINGUNO - mejora cache granularity

---

### 🎯 Cambio 6: DashboardMetrics.tsx - Agregar badge de permisos

**Archivo**: `src/components/dashboard/DashboardMetrics.tsx`
**Línea**: Después del grid de metrics
**Acción**: AGREGAR badge informativo

#### AGREGAR (después del </div> que cierra el grid):
```typescript
return (
  <div className="space-y-3">
    {/* Permission indicator badge */}
    {allowedOrderTypes.length < 4 && (
      <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
          <Shield className="w-3 h-3 mr-1" />
          {t('dashboard.metrics.showing_modules', {
            count: allowedOrderTypes.length,
            total: 4
          })}
        </Badge>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Métricas existentes */}
    </div>
  </div>
);
```

**Impacto**: Transparencia para el usuario sobre qué ve
**Riesgo**: NINGUNO - solo UI informativa

---

## 📊 Resumen de Impacto

**Archivos modificados**: 2
- `src/components/dashboard/DashboardMetrics.tsx`
- `src/hooks/useDashboardData.ts`

**Cambios totales**: 6
**Funcionalidad**: MEJORADA (respeta permisos)
**Performance**: MEJORADA (query filtrada)
**Seguridad**: MEJORADA (no expone datos sin permisos)

**Riesgo total**: BAJO ✅

---

**Creado**: 2025-11-03
**Estado**: Listo para ejecutar
