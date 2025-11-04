# 🎯 Plan de Implementación: Dashboard Enterprise Basado en Permisos

**Fecha**: 2025-11-03
**Objetivo**: Convertir el Dashboard en un sistema enterprise robusto basado en permisos de custom roles, sin información financiera.

---

## 📊 Auditoría de Estado Actual

### ✅ Componentes que YA respetan permisos:
1. **DepartmentOverview** (`src/components/dashboard/DepartmentOverview.tsx`)
   - ✅ Usa `usePermissions` correctamente
   - ✅ Filtra departamentos por permisos (`lines 95-97`)
   - ❌ **PROBLEMA**: Contiene campo `revenue` (información financiera)

2. **RecentActivity** (`src/components/dashboard/RecentActivity.tsx`)
   - ✅ Implementado con filtrado de permisos completo
   - ✅ Muestra solo actividades de módulos permitidos
   - ✅ Badges de filtro condicionales por permisos

### ❌ Componentes que NO respetan permisos:
1. **DashboardMetrics** (`src/components/dashboard/DashboardMetrics.tsx`)
   - ❌ NO usa `usePermissions`
   - ❌ Muestra métricas de TODOS los módulos sin filtrar
   - ✅ NO tiene información financiera

### 🔴 Información Financiera Detectada (a REMOVER):
1. **useDashboardData hook** (`src/hooks/useDashboardData.ts`)
   - `revenue` en `OverallMetrics` (línea 22)
   - `revenue` en `DepartmentMetrics` (línea 12)
   - Cálculo de revenue en overall (líneas 103-105)
   - Cálculo de revenue por departamento (líneas 123-125)

2. **DepartmentOverview component**
   - Campo `revenue` en interface (línea 33)
   - Uso de `formatCurrency` (líneas 44-56)
   - Asignación de `revenue` (línea 111)

---

## 🏗️ Plan de Implementación Enterprise

### **FASE 1: Remover Información Financiera** 🔴
**Prioridad**: CRÍTICA
**Tiempo estimado**: 30 minutos

#### Tareas:
1. **Modificar `useDashboardData.ts`**:
   - [ ] Remover campo `revenue` de `OverallMetrics` interface (línea 22)
   - [ ] Remover campo `revenue` de `DepartmentMetrics` interface (línea 12)
   - [ ] Eliminar cálculo de revenue overall (líneas 103-105)
   - [ ] Eliminar cálculo de revenue por departamento (líneas 123-125)
   - [ ] Actualizar objeto de retorno sin revenue

2. **Modificar `DepartmentOverview.tsx`**:
   - [ ] Remover campo `revenue` de `DepartmentData` interface (línea 33)
   - [ ] Eliminar función `formatCurrency` (líneas 44-56)
   - [ ] Remover asignación de `revenue` en mapeo (línea 111)
   - [ ] Verificar que no hay referencias a revenue en el render

3. **Verificar otros componentes**:
   - [ ] Buscar referencias a `revenue` en toda la carpeta `dashboard/`
   - [ ] Buscar referencias a `total_amount` que puedan mostrar precios

**Resultado esperado**: Dashboard completamente libre de información financiera

---

### **FASE 2: Implementar Permisos en DashboardMetrics** 🟡
**Prioridad**: ALTA
**Tiempo estimado**: 45 minutos

#### Problema actual:
```typescript
// ❌ ACTUAL: Muestra métricas de TODOS los módulos
const metrics = {
  totalOrders: 100,      // Suma de sales + service + recon + carwash
  pendingOrders: 20,     // Sin filtrar por permisos
  completedToday: 5      // Sin filtrar por permisos
}
```

#### Solución propuesta:
```typescript
// ✅ NUEVO: Solo métricas de módulos permitidos
const metrics = {
  totalOrders: 80,       // Solo sales + service (si tiene permisos)
  pendingOrders: 15,     // Solo de módulos permitidos
  completedToday: 4      // Solo de módulos permitidos
}
```

#### Tareas:
1. **Actualizar `DashboardMetrics.tsx`**:
   - [ ] Importar `usePermissions` hook
   - [ ] Crear función helper para mapear order_type a módulo de permisos
   - [ ] Calcular `allowedOrderTypes` basado en permisos del usuario
   - [ ] Pasar `allowedOrderTypes` como prop opcional a `useDashboardData`

2. **Actualizar `useDashboardData.ts`**:
   - [ ] Agregar parámetro opcional `allowedOrderTypes?: string[]`
   - [ ] Filtrar `filteredOrders` por `allowedOrderTypes` si se proporciona
   - [ ] Aplicar filtro ANTES de calcular métricas overall
   - [ ] Aplicar filtro en cálculos de departamentos

3. **Agregar indicador visual de permisos**:
   - [ ] Badge o texto indicando "Mostrando X módulos de Y total"
   - [ ] Tooltip explicando que solo ve módulos permitidos

**Resultado esperado**: Métricas calculadas solo con órdenes de módulos permitidos

---

### **FASE 3: Crear Componentes Enterprise Adicionales** 🟢
**Prioridad**: MEDIA
**Tiempo estimado**: 2 horas

#### 3.1 **Component: TeamPerformance**
Muestra el rendimiento del equipo en los módulos permitidos.

**Features**:
- Lista de usuarios activos en módulos permitidos
- Órdenes completadas por usuario (últimos 7 días)
- Órdenes en progreso por usuario
- Tiempo promedio de procesamiento por usuario
- Filtrable por departamento (solo departamentos con permisos)

**Permisos requeridos**:
- Solo visible para usuarios con permisos de 'view' en al menos un módulo
- Datos filtrados por módulos permitidos

#### 3.2 **Component: QuickActions**
Panel de acciones rápidas contextuales.

**Features**:
- Crear nueva orden (solo para módulos con permiso 'edit')
- Ver órdenes pendientes (solo módulos con 'view')
- Acceso a reportes (si tiene permisos de 'reports')
- Acceso a Get Ready (si tiene permiso 'productivity')

**Lógica**:
```typescript
const quickActions = useMemo(() => {
  const actions = [];

  if (hasPermission('sales_orders', 'edit')) {
    actions.push({ label: 'New Sales Order', route: '/sales?action=create' });
  }
  if (hasPermission('service_orders', 'edit')) {
    actions.push({ label: 'New Service Order', route: '/service?action=create' });
  }
  // ... etc

  return actions;
}, [hasPermission]);
```

#### 3.3 **Component: ModuleStatusCards**
Cards compactas mostrando estado de cada módulo permitido.

**Features**:
- Una card por módulo (solo módulos con permisos)
- Estado visual (verde/amarillo/rojo)
- Métricas clave: pending, in_progress, completed
- Click para navegar al módulo
- Badge indicando si tiene permisos de edit/view only

---

### **FASE 4: Optimizar useDashboardData con Permisos** 🟢
**Prioridad**: MEDIA
**Tiempo estimado**: 1 hora

#### Problema actual:
El hook hace fetch de TODAS las órdenes y luego las filtra en memoria.

#### Mejora propuesta:
Aplicar filtro de permisos en la query de Supabase.

**Implementación**:
```typescript
export function useDashboardData(allowedOrderTypes?: string[]) {
  const queryFn = async () => {
    let query = supabase
      .from('orders')
      .select('order_type, status, created_at, updated_at');

    // Si se proporcionan tipos permitidos, filtrar en la query
    if (allowedOrderTypes && allowedOrderTypes.length > 0) {
      query = query.in('order_type', allowedOrderTypes);
    }

    const { data, error } = await query;
    // ... resto del código
  };
}
```

**Beneficios**:
- ✅ Reduce payload de red (solo trae órdenes permitidas)
- ✅ Mejora performance (menos procesamiento en cliente)
- ✅ Más seguro (no expone datos de módulos sin permisos)

---

### **FASE 5: Mejorar UX con Permisos** 🟢
**Prioridad**: BAJA
**Tiempo estimado**: 1.5 horas

#### 5.1 **Empty States Inteligentes**
Cuando un usuario no tiene permisos para ningún módulo.

```typescript
if (allowedDepartments.length === 0) {
  return (
    <Card className="text-center p-12">
      <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-semibold mb-2">
        {t('dashboard.no_modules_access')}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t('dashboard.contact_admin_for_access')}
      </p>
      <Button variant="outline" onClick={() => navigate('/settings')}>
        {t('dashboard.view_profile')}
      </Button>
    </Card>
  );
}
```

#### 5.2 **Permission Badges**
Indicadores visuales de nivel de permisos.

- 👁️ "View Only" badge para módulos con solo permiso 'view'
- ✏️ "Edit Access" badge para módulos con permiso 'edit'
- 🗑️ "Full Access" badge para módulos con permiso 'delete'

#### 5.3 **Onboarding Tour**
Tour guiado mostrando solo features disponibles según permisos.

---

### **FASE 6: Testing y Validación** 🔵
**Prioridad**: CRÍTICA
**Tiempo estimado**: 2 horas

#### Test Cases por Rol:

1. **System Admin** (acceso total):
   - ✅ Ve todos los 4 departamentos
   - ✅ Ve todas las métricas
   - ✅ Puede crear órdenes en todos los módulos
   - ✅ Ve actividades de todos los módulos

2. **Dealer Manager** (sales + service):
   - ✅ Ve solo 2 departamentos (sales, service)
   - ✅ Métricas calculadas solo con sales + service
   - ✅ Puede crear órdenes solo en sales + service
   - ✅ Ve actividades solo de sales + service

3. **Custom Role - Solo Service** (service read-only):
   - ✅ Ve solo 1 departamento (service)
   - ✅ Métricas solo de service
   - ❌ NO puede crear órdenes (sin edit)
   - ✅ Ve solo actividades de service

4. **Custom Role - Sin permisos de órdenes**:
   - ✅ Dashboard muestra empty state
   - ✅ Mensaje explicativo sobre falta de permisos
   - ✅ Link a contactar administrador

#### Checklist de Validación:
- [ ] TypeScript compila sin errores
- [ ] No hay referencias a `revenue` o `total_amount` en UI
- [ ] Todos los componentes usan `usePermissions`
- [ ] Métricas filtradas por permisos
- [ ] Actividades filtradas por permisos
- [ ] Departamentos filtrados por permisos
- [ ] Empty states funcionando
- [ ] Performance aceptable (< 2s carga inicial)
- [ ] Cache funcionando correctamente
- [ ] Responsive en mobile/tablet/desktop

---

## 📐 Arquitectura Propuesta

### Flujo de Permisos en Dashboard:

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard.tsx                        │
│                   (Página principal)                    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │      usePermissions Hook              │
        │  - Carga permisos del usuario         │
        │  - Cachea en memoria                  │
        │  - Provee hasPermission()             │
        └───────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
    ┌───────────────────┐   ┌───────────────────┐
    │ DashboardMetrics  │   │ DepartmentOverview│
    │ + Permisos ✅     │   │ + Permisos ✅     │
    │ - Financiero ✅   │   │ - Financiero ✅   │
    └───────────────────┘   └───────────────────┘
                ▼                       ▼
    ┌───────────────────────────────────────────┐
    │         useDashboardData Hook             │
    │  + allowedOrderTypes parameter ✅         │
    │  - Query optimizada por permisos ✅       │
    │  - Sin campos financieros ✅              │
    └───────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   Supabase Query      │
                │   .in('order_type',   │
                │    allowedOrderTypes) │
                └───────────────────────┘
```

---

## 🎯 Objetivos de Calidad Enterprise

### Performance:
- ⚡ Carga inicial: < 2 segundos
- ⚡ Cambio de filtro: < 500ms
- ⚡ Refresh de datos: < 1 segundo
- 💾 Cache: 1 minuto (configurable)

### Seguridad:
- 🔒 RLS policies en Supabase (primera capa)
- 🔒 Filtrado por permisos en frontend (segunda capa)
- 🔒 Query optimization con permisos (tercera capa)
- 🔒 Sin exposición de datos financieros

### UX:
- 📱 Responsive: mobile, tablet, desktop
- ♿ Accesible: WCAG 2.1 AA compliant
- 🌍 Internacionalizado: EN, ES, PT-BR
- 🎨 Notion-style design system

### Maintainability:
- 📝 TypeScript strict mode
- 📝 Componentes reutilizables
- 📝 Hooks centralizados
- 📝 Documentación inline
- 📝 Tests unitarios

---

## 🚀 Orden de Ejecución Recomendado

### Semana 1:
1. **Día 1-2**: FASE 1 - Remover información financiera ✅
2. **Día 3-4**: FASE 2 - Permisos en DashboardMetrics ✅
3. **Día 5**: FASE 4 - Optimizar useDashboardData ✅

### Semana 2:
4. **Día 1-3**: FASE 3 - Componentes enterprise adicionales
5. **Día 4**: FASE 5 - Mejorar UX con permisos
6. **Día 5**: FASE 6 - Testing completo y validación

---

## 📊 Métricas de Éxito

### Pre-implementación:
- ❌ 2/3 componentes sin permisos
- ❌ Información financiera expuesta
- ❌ Query trae datos innecesarios

### Post-implementación:
- ✅ 100% componentes con permisos
- ✅ 0 referencias a información financiera
- ✅ Query optimizada por permisos
- ✅ UX enterprise-grade
- ✅ Performance < 2s carga inicial
- ✅ Tests pasando al 100%

---

## 🔗 Referencias y Recursos

### Archivos clave:
- `src/pages/Dashboard.tsx` - Página principal
- `src/hooks/usePermissions.tsx` - Sistema de permisos
- `src/hooks/useDashboardData.ts` - Datos del dashboard
- `src/components/dashboard/*` - Componentes

### Documentación relacionada:
- `CUSTOM_ROLES_PERMISSIONS_REVIEW.md` - Sistema de permisos
- `CLAUDE.md` - Guías de desarrollo del proyecto

---

**Última actualización**: 2025-11-03
**Autor**: Claude Code
**Estado**: Plan completo pendiente de aprobación
