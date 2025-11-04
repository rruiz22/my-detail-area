# FASE 1: Plan Detallado de Cambios - Remover Información Financiera

**Fecha**: 2025-11-03
**Estado**: Pendiente de ejecución
**Riesgo**: BAJO (solo remoción de campos no usados en UI)

---

## 📋 Checklist de Seguridad

Antes de empezar:
- ✅ Plan documentado
- ⏳ Backups creados (pendiente)
- ⏳ TypeScript verificado (pendiente)
- ⏳ Cambios ejecutados (pendiente)
- ⏳ Compilación verificada (pendiente)

---

## 🎯 Cambio 1: useDashboardData.ts - Interface DepartmentMetrics

**Archivo**: `src/hooks/useDashboardData.ts`
**Línea**: 12
**Acción**: REMOVER línea completa

### ANTES:
```typescript
export interface DepartmentMetrics {
  order_type: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  revenue: number;              // ← REMOVER ESTA LÍNEA
  createdToday: number;
  completedToday: number;
  last30Days: number;
}
```

### DESPUÉS:
```typescript
export interface DepartmentMetrics {
  order_type: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  // revenue field REMOVED - no financial data in dashboard
  createdToday: number;
  completedToday: number;
  last30Days: number;
}
```

**Impacto**: DepartmentOverview.tsx necesitará actualización (siguiente paso)
**Riesgo**: BAJO - campo no usado en render actual

---

## 🎯 Cambio 2: useDashboardData.ts - Interface OverallMetrics

**Archivo**: `src/hooks/useDashboardData.ts`
**Línea**: 22
**Acción**: REMOVER línea completa

### ANTES:
```typescript
export interface OverallMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  revenue: number;              // ← REMOVER ESTA LÍNEA
  activeVehicles: number;
}
```

### DESPUÉS:
```typescript
export interface OverallMetrics {
  totalOrders: number;
  pendingOrders: number;
  completedToday: number;
  // revenue field REMOVED - no financial data in dashboard
  activeVehicles: number;
}
```

**Impacto**: Ninguno - DashboardMetrics no usa este campo
**Riesgo**: NINGUNO

---

## 🎯 Cambio 3: useDashboardData.ts - Default overall revenue

**Archivo**: `src/hooks/useDashboardData.ts`
**Línea**: 62
**Acción**: REMOVER línea completa

### ANTES:
```typescript
return {
  overall: {
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    revenue: 0,                 // ← REMOVER ESTA LÍNEA
    activeVehicles: 0
  },
  departments: []
};
```

### DESPUÉS:
```typescript
return {
  overall: {
    totalOrders: 0,
    pendingOrders: 0,
    completedToday: 0,
    // revenue field removed
    activeVehicles: 0
  },
  departments: []
};
```

**Impacto**: Consistente con interface actualizada
**Riesgo**: NINGUNO

---

## 🎯 Cambio 4: useDashboardData.ts - Cálculo revenue overall

**Archivo**: `src/hooks/useDashboardData.ts`
**Líneas**: 103-105
**Acción**: REMOVER líneas completas

### ANTES:
```typescript
const overall: OverallMetrics = {
  totalOrders: recentOrders.length,
  pendingOrders: filteredOrders.filter(o => o.status === 'pending').length,
  completedToday: filteredOrders.filter(o =>
    o.status === 'completed' &&
    o.updated_at?.startsWith(today)
  ).length,
  revenue: filteredOrders.reduce((sum, o) =>      // ← REMOVER DESDE AQUÍ
    sum + (parseFloat(o.total_amount || '0')), 0  // ← HASTA AQUÍ
  ),
  activeVehicles: filteredOrders.filter(o =>
    o.status === 'pending' || o.status === 'in_progress'
  ).length
};
```

### DESPUÉS:
```typescript
const overall: OverallMetrics = {
  totalOrders: recentOrders.length,
  pendingOrders: filteredOrders.filter(o => o.status === 'pending').length,
  completedToday: filteredOrders.filter(o =>
    o.status === 'completed' &&
    o.updated_at?.startsWith(today)
  ).length,
  // revenue calculation removed - no financial data
  activeVehicles: filteredOrders.filter(o =>
    o.status === 'pending' || o.status === 'in_progress'
  ).length
};
```

**Impacto**: Reduce query de total_amount innecesaria
**Riesgo**: NINGUNO - mejora performance

---

## 🎯 Cambio 5: useDashboardData.ts - Cálculo revenue departamento

**Archivo**: `src/hooks/useDashboardData.ts`
**Líneas**: 123-125
**Acción**: REMOVER líneas completas

### ANTES:
```typescript
return {
  order_type: orderType,
  total: deptOrders.length,
  pending: deptOrders.filter(o => o.status === 'pending').length,
  inProgress: deptOrders.filter(o => o.status === 'in_progress').length,
  completed: deptOrders.filter(o => o.status === 'completed').length,
  revenue: deptOrders.reduce((sum, o) =>          // ← REMOVER DESDE AQUÍ
    sum + (parseFloat(o.total_amount || '0')), 0  // ← HASTA AQUÍ
  ),
  createdToday: deptOrders.filter(o =>
    o.created_at?.startsWith(today)
  ).length,
  completedToday: deptOrders.filter(o =>
    o.status === 'completed' &&
    o.updated_at?.startsWith(today)
  ).length,
  last30Days: recentDeptOrders.length
};
```

### DESPUÉS:
```typescript
return {
  order_type: orderType,
  total: deptOrders.length,
  pending: deptOrders.filter(o => o.status === 'pending').length,
  inProgress: deptOrders.filter(o => o.status === 'in_progress').length,
  completed: deptOrders.filter(o => o.status === 'completed').length,
  // revenue calculation removed
  createdToday: deptOrders.filter(o =>
    o.created_at?.startsWith(today)
  ).length,
  completedToday: deptOrders.filter(o =>
    o.status === 'completed' &&
    o.updated_at?.startsWith(today)
  ).length,
  last30Days: recentDeptOrders.length
};
```

**Impacto**: Ninguno en UI actual
**Riesgo**: NINGUNO

---

## 🎯 Cambio 6: DepartmentOverview.tsx - Interface DepartmentData

**Archivo**: `src/components/dashboard/DepartmentOverview.tsx`
**Línea**: 33
**Acción**: REMOVER línea completa

### ANTES:
```typescript
interface DepartmentData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  revenue: number;              // ← REMOVER ESTA LÍNEA
  efficiency: number;
  route: string;
}
```

### DESPUÉS:
```typescript
interface DepartmentData {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  orders: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  // revenue field removed - no financial data
  efficiency: number;
  route: string;
}
```

**Impacto**: Consistente con hook actualizado
**Riesgo**: BAJO

---

## 🎯 Cambio 7: DepartmentOverview.tsx - Función formatCurrency

**Archivo**: `src/components/dashboard/DepartmentOverview.tsx`
**Líneas**: 44-56
**Acción**: REMOVER función completa (no se usa en ningún lugar)

### ANTES:
```typescript
  const formatCurrency = (amount: number) => {
    const currencyMap = {
      'en': 'USD',
      'es': 'USD', // Assuming US Spanish
      'pt-BR': 'BRL'
    };
    const currency = currencyMap[i18n.language as keyof typeof currencyMap] || 'USD';

    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency
    }).format(amount);
  };
```

### DESPUÉS:
```typescript
// formatCurrency function removed - no financial data displayed
```

**Impacto**: Ninguno - función nunca se llama
**Riesgo**: NINGUNO

---

## 🎯 Cambio 8: DepartmentOverview.tsx - Asignación revenue

**Archivo**: `src/components/dashboard/DepartmentOverview.tsx`
**Línea**: 111
**Acción**: REMOVER línea completa

### ANTES:
```typescript
const departments: DepartmentData[] = allowedDepartments.map(dept => {
  const deptData = dashboardData?.departments.find(d => d.order_type === dept.id);

  return {
    ...dept,
    orders: {
      total: deptData?.total || 0,
      pending: deptData?.pending || 0,
      inProgress: deptData?.inProgress || 0,
      completed: deptData?.completed || 0
    },
    revenue: deptData?.revenue || 0,    // ← REMOVER ESTA LÍNEA
    efficiency: deptData?.total ? Math.round((deptData.completed / deptData.total) * 100) : 0
  };
});
```

### DESPUÉS:
```typescript
const departments: DepartmentData[] = allowedDepartments.map(dept => {
  const deptData = dashboardData?.departments.find(d => d.order_type === dept.id);

  return {
    ...dept,
    orders: {
      total: deptData?.total || 0,
      pending: deptData?.pending || 0,
      inProgress: deptData?.inProgress || 0,
      completed: deptData?.completed || 0
    },
    // revenue field removed
    efficiency: deptData?.total ? Math.round((deptData.completed / deptData.total) * 100) : 0
  };
});
```

**Impacto**: Ninguno - revenue no se renderiza
**Riesgo**: NINGUNO

---

## 🎯 Cambio 9 (OPCIONAL): useDashboardData.ts - Query select

**Archivo**: `src/hooks/useDashboardData.ts`
**Línea**: 73
**Acción**: REMOVER total_amount del select (opcional - optimización)

### ANTES:
```typescript
const { data: orders, error } = await supabase
  .from('orders')
  .select('order_type, status, total_amount, created_at, updated_at');
```

### DESPUÉS:
```typescript
const { data: orders, error } = await supabase
  .from('orders')
  .select('order_type, status, created_at, updated_at');
  // total_amount removed - no financial calculations needed
```

**Impacto**: Reduce payload de network
**Riesgo**: NINGUNO - mejora performance

---

## ✅ Verificación Post-Cambios

Después de aplicar TODOS los cambios:

1. **TypeScript Check**:
   ```bash
   npx tsc --noEmit
   ```
   Esperado: ✅ Sin errores

2. **Búsqueda de referencias**:
   ```bash
   grep -r "revenue" src/components/dashboard/
   grep -r "formatCurrency" src/components/dashboard/
   grep -r "total_amount" src/hooks/useDashboardData.ts
   ```
   Esperado: ✅ Sin resultados (excepto comentarios)

3. **Build Test**:
   ```bash
   npm run build:dev
   ```
   Esperado: ✅ Build exitoso

---

## 📊 Resumen de Impacto

**Archivos modificados**: 2
- `src/hooks/useDashboardData.ts`
- `src/components/dashboard/DepartmentOverview.tsx`

**Líneas removidas**: ~25 líneas
**Funcionalidad afectada**: NINGUNA (campos no usados)
**Performance**: MEJORADA (menos datos en query)
**Seguridad**: MEJORADA (no expone datos financieros)

**Riesgo total**: BAJO ✅

---

**Creado**: 2025-11-03
**Estado**: Pendiente de aprobación para ejecución
