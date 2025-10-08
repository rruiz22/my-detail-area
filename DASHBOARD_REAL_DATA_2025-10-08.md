# Dashboard Real Data Implementation - October 8, 2025

## 🎯 Objetivo

Reemplazar datos mock en Dashboard Overview con información real de la base de datos, respetando permisos de usuario y mostrando estados elegantes para módulos sin datos.

## 🔍 Estado Anterior (Mock Data)

**DashboardMetrics:**
- Total Orders: 142 ❌ (mock)
- Pending: 23 ❌ (mock)
- Completed Today: 18 ❌ (mock)
- Revenue: $15,420.50 ❌ (mock)

**DepartmentOverview:**
- Sales: 45 orders, $6,750 ❌ (mock)
- Service: 38 orders, $4,280 ❌ (mock)
- Recon: 29 orders, $2,890 ❌ (mock)
- CarWash: 67 orders, $1,500 ❌ (mock)

## ✅ Solución Implementada

### 1. Nuevo Hook: useDashboardData

**Archivo:** `src/hooks/useDashboardData.ts`

**Características:**
- ✅ Consulta tabla `orders` directamente
- ✅ Respeta RLS policies automáticamente
- ✅ **Respeta filtro global de dealerships** del topbar
- ✅ Lee `localStorage.selectedDealerFilter`
- ✅ Escucha evento `dealerFilterChanged`
- ✅ Agrupa por `order_type` y `status`
- ✅ Calcula revenue por departamento
- ✅ Métricas overall y por departamento
- ✅ Refetch automático cada 2 minutos

**Lógica de Filtrado:**
```typescript
// 1. Load saved filter from localStorage
const [selectedDealer, setSelectedDealer] = useState<number | 'all'>('all');

// 2. Listen to filter changes from DealershipFilter component
useEffect(() => {
  window.addEventListener('dealerFilterChanged', handleFilterChange);
}, []);

// 3. Apply dealer filter to orders (after RLS)
const filteredOrders = selectedDealer === 'all'
  ? ordersList  // Show all accessible dealerships
  : ordersList.filter(o => o.dealer_id === selectedDealer);  // Show only selected

// 4. Include in queryKey to refetch when filter changes
queryKey: ['dashboard-data', user?.id, selectedDealer]
```

**Estructura de datos retornada:**
```typescript
{
  overall: {
    totalOrders: 13,
    pendingOrders: 9,
    completedToday: 1,
    revenue: 200,
    activeVehicles: 10
  },
  departments: [
    {
      order_type: 'sales',
      total: 11,
      pending: 8,
      inProgress: 1,
      completed: 2,
      revenue: 0,
      createdToday: 3,
      completedToday: 1,
      last30Days: 11
    },
    {
      order_type: 'service',
      total: 2,
      pending: 1,
      inProgress: 0,
      completed: 1,
      revenue: 200,
      createdToday: 0,
      completedToday: 0,
      last30Days: 2
    }
    // recon: 0 orders
    // carwash: 0 orders
  ]
}
```

### 2. DashboardMetrics - Datos Reales

**Archivo:** `src/components/dashboard/DashboardMetrics.tsx`

**Cambios:**
- ✅ Importa `useDashboardData()`
- ✅ Usa `dashboardData.overall` en lugar de mock
- ✅ Muestra 4 métricas principales:
  - Total Orders (last 30 days)
  - Pending Orders
  - Completed Today
  - Total Revenue
- ✅ Loading state con skeletons
- ❌ Removidas métricas sin datos: avg processing, satisfaction, team efficiency

**Datos reales mostrados:**
- Total Orders: 13 ✅ (de base de datos)
- Pending: 9 ✅
- Completed Today: 1 ✅
- Revenue: $200 ✅

### 3. DepartmentOverview - Datos Reales + Empty States

**Archivo:** `src/components/dashboard/DepartmentOverview.tsx`

**Cambios principales:**

#### A. Filtrado por Permisos
```typescript
const allowedDepartments = allDepartments.filter(dept =>
  hasPermission(dept.module, 'view')
);
```
- ✅ Solo muestra departamentos con permiso 'view'
- ✅ System admins ven todos
- ✅ Usuarios regulares ven según su rol

#### B. Mapeo de Datos Reales
```typescript
const departments = allowedDepartments.map(dept => {
  const deptData = dashboardData?.departments.find(d => d.order_type === dept.id);

  return {
    ...dept,
    orders: {
      total: deptData?.total || 0,
      pending: deptData?.pending || 0,
      inProgress: deptData?.inProgress || 0,
      completed: deptData?.completed || 0
    },
    revenue: deptData?.revenue || 0,
    efficiency: deptData?.total
      ? Math.round((deptData.completed / deptData.total) * 100)
      : 0
  };
});
```

#### C. Empty State para Módulos Sin Datos

**Para departamentos con 0 orders:**
```tsx
<div className="text-center py-8">
  <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-3">
    {dept.icon}
  </div>
  <p className="text-sm font-medium text-muted-foreground">
    {t('dashboard.department_overview.no_orders_yet')}
  </p>
  <p className="text-xs text-muted-foreground">
    {t('dashboard.department_overview.create_first_order')}
  </p>
  <Button onClick={() => handleCreateOrder(dept.id)}>
    <Plus className="w-4 h-4 mr-2" />
    {t('dashboard.department_overview.create_order')}
  </Button>
</div>
```

**Para departamentos con datos:**
- Muestra métricas reales: pending, in_progress, completed
- Calcula efficiency basado en datos reales
- Muestra revenue real

### 4. Traducciones Agregadas

**Nuevas keys en 3 idiomas:**

#### English (en.json)
```json
"dashboard": {
  "metrics": {
    "total_revenue": "Total revenue"
  },
  "department_overview": {
    "no_orders_yet": "No orders yet",
    "create_first_order": "Create your first order to get started",
    "create_order": "Create Order"
  }
}
```

#### Español (es.json)
```json
"dashboard": {
  "metrics": {
    "total_revenue": "Ingresos totales"
  },
  "department_overview": {
    "no_orders_yet": "Sin órdenes aún",
    "create_first_order": "Crea tu primera orden para comenzar",
    "create_order": "Crear Orden"
  }
}
```

#### Português (pt-BR.json)
```json
"dashboard": {
  "metrics": {
    "total_revenue": "Receita total"
  },
  "department_overview": {
    "no_orders_yet": "Nenhum pedido ainda",
    "create_first_order": "Crie seu primeiro pedido para começar",
    "create_order": "Criar Pedido"
  }
}
```

## 📊 Resultado Esperado

### Dashboard Overview Mostrará:

**Top Metrics (Datos Reales):**
- 📊 Total Orders: 13 (last 30 days)
- ⏰ Pending Orders: 9
- ✅ Completed Today: 1
- 💰 Total Revenue: $200.00

**Department Overview:**

**Sales (Tiene Datos):**
```
🚗 Sales - $0.00 revenue
━━━━━━━━━━━━━━━━━━━
⏰ 8 Pending
🔄 1 In Progress
✅ 2 Completed
━━━━━━━━━━━━━━━━━━━
Efficiency: 18%
Total Orders: 11
```

**Service (Tiene Datos):**
```
🔧 Service - $200.00 revenue
━━━━━━━━━━━━━━━━━━━
⏰ 1 Pending
🔄 0 In Progress
✅ 1 Completed
━━━━━━━━━━━━━━━━━━━
Efficiency: 50%
Total Orders: 2
```

**Recon (Sin Datos):**
```
🔄 Recon - $0.00 revenue
━━━━━━━━━━━━━━━━━━━
[Empty State Icon]
No orders yet
Create your first order to get started
[Create Order Button]
```

**CarWash (Sin Datos):**
```
💧 Car Wash - $0.00 revenue
━━━━━━━━━━━━━━━━━━━
[Empty State Icon]
No orders yet
Create your first order to get started
[Create Order Button]
```

## 🔒 Seguridad y Permisos

✅ **RLS Policies:** Usuarios solo ven órdenes de sus dealerships
✅ **Module Permissions:** Solo departamentos con permiso 'view' se muestran
✅ **System Admins:** Ven datos de todos los dealerships agregados
✅ **Custom Roles:** Respeta permisos granulares de roles

**Ejemplo de Filtrado:**
- Usuario con solo `sales_orders: view` → Ve solo Sales card
- Usuario con `sales_orders` + `service_orders` → Ve Sales + Service
- System admin → Ve todos los 4 departamentos

## 📁 Archivos Creados/Modificados

| Archivo | Tipo | Cambios |
|---------|------|---------|
| `src/hooks/useDashboardData.ts` | Nuevo | Hook para fetchear datos reales |
| `src/components/dashboard/DashboardMetrics.tsx` | Modificado | Usa datos reales, loading state |
| `src/components/dashboard/DepartmentOverview.tsx` | Modificado | Datos reales, empty states, filtrado por permisos |
| `public/translations/en.json` | Modificado | 4 nuevas keys |
| `public/translations/es.json` | Modificado | 4 nuevas keys |
| `public/translations/pt-BR.json` | Modificado | 4 nuevas keys |
| `DASHBOARD_REAL_DATA_2025-10-08.md` | Nuevo | Esta documentación |

## 🧪 Testing

**Vite HMR aplicó cambios automáticamente:** ✅

**Para verificar:**
1. Recarga Dashboard (el HMR ya debería haber actualizado)
2. Verifica que las métricas superiores muestran datos reales:
   - Total Orders: ~13
   - Pending: ~9
   - Completed Today: ~1
   - Revenue: ~$200
3. Department Overview:
   - Sales debe mostrar 11 orders
   - Service debe mostrar 2 orders
   - Recon debe mostrar "No orders yet" (empty state)
   - CarWash debe mostrar "No orders yet" (empty state)

## ✨ Beneficios

✅ **Datos reales** - No más mocks en producción
✅ **Permisos respetados** - Usuarios ven solo lo autorizado
✅ **Empty states profesionales** - UX mejorada para módulos sin datos
✅ **Performance optimizada** - Refetch cada 2 minutos, staleTime 1 minuto
✅ **RLS automático** - Seguridad a nivel de base de datos
✅ **Traducido completamente** - EN/ES/PT-BR

---

**Implementado:** October 8, 2025
**HMR Status:** ✅ Aplicado automáticamente
**Testing:** ⏳ Pendiente validación visual por usuario
