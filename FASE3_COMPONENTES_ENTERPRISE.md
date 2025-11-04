# FASE 3: Componentes Enterprise Adicionales - Plan Detallado

**Fecha**: 2025-11-03
**Estado**: Ejecutando
**Riesgo**: BAJO (solo agregar componentes nuevos, no modificar existentes)

---

## 🎯 Componentes a Crear

### 1. **TeamPerformance Component**
**Ubicación**: `src/components/dashboard/TeamPerformance.tsx`
**Propósito**: Mostrar rendimiento del equipo en módulos permitidos

**Features**:
- Lista de usuarios activos con órdenes en módulos permitidos
- Órdenes completadas por usuario (últimos 7 días)
- Órdenes en progreso por usuario
- Filtrable por departamento (solo departamentos con permisos)
- Respeta permisos de custom roles

**Datos mostrados**:
- Nombre del usuario
- Avatar/iniciales
- Órdenes completadas (7 días)
- Órdenes en progreso
- Departamentos activos

**NO incluye**:
- ❌ Información financiera
- ❌ Datos de módulos sin permisos

---

### 2. **QuickActions Component**
**Ubicación**: `src/components/dashboard/QuickActions.tsx`
**Propósito**: Panel de acciones rápidas contextuales basadas en permisos

**Features**:
- Botones de acción solo para módulos con permiso 'edit'
- Links rápidos a vistas principales
- Iconos y colores Notion-style
- Grid responsive
- Respeta permisos granulares

**Acciones condicionales**:
- "New Sales Order" - solo si tiene `sales_orders:edit`
- "New Service Order" - solo si tiene `service_orders:edit`
- "New Recon Order" - solo si tiene `recon_orders:edit`
- "New Car Wash" - solo si tiene `car_wash:edit`
- "View Reports" - solo si tiene `reports:view`
- "Get Ready" - solo si tiene `productivity:view`

---

### 3. **ModuleStatusCards Component**
**Ubicación**: `src/components/dashboard/ModuleStatusCards.tsx`
**Propósito**: Cards compactas de estado por módulo permitido

**Features**:
- Una card por módulo (solo módulos con permisos)
- Estado visual (verde/amarillo/rojo) según métricas
- Click para navegar al módulo
- Badge de permisos (view/edit/full)
- Diseño compacto y responsive

**Datos por card**:
- Nombre del módulo
- Total de órdenes
- Pending/In Progress/Completed
- Indicador de estado (color)
- Badge de nivel de permiso

---

## 📝 Traducciones Requeridas

### Estructura de traducciones:

```json
{
  "dashboard": {
    "team_performance": {
      "title": "Team Performance",
      "subtitle": "Activity in your accessible modules",
      "user": "User",
      "completed_7d": "Completed (7d)",
      "in_progress": "In Progress",
      "active_in": "Active in",
      "no_activity": "No Recent Activity",
      "no_team_members": "No team members found",
      "modules": "modules"
    },
    "quick_actions": {
      "title": "Quick Actions",
      "subtitle": "Fast access to common tasks",
      "new_sales_order": "New Sales Order",
      "new_service_order": "New Service Order",
      "new_recon_order": "New Recon Order",
      "new_car_wash": "New Car Wash",
      "view_reports": "View Reports",
      "get_ready": "Get Ready",
      "no_actions_available": "No actions available",
      "contact_admin": "Contact your administrator for access"
    },
    "module_status": {
      "title": "Module Status",
      "subtitle": "Overview of your accessible modules",
      "pending": "Pending",
      "in_progress": "In Progress",
      "completed": "Completed",
      "view_only": "View Only",
      "edit_access": "Edit Access",
      "full_access": "Full Access",
      "healthy": "Healthy",
      "attention_needed": "Attention Needed",
      "critical": "Critical",
      "no_modules": "No modules accessible",
      "request_access": "Request access from your administrator"
    }
  }
}
```

---

## 🏗️ Arquitectura de Componentes

### Dependencias:
```typescript
// Todos los componentes usan:
- usePermissions (para filtrado)
- useTranslation (i18n)
- useDashboardData (datos filtrados por permisos)
- shadcn/ui components (Card, Badge, Button, etc)
- Notion design system (colores aprobados)
```

### Flujo de datos:
```
User → usePermissions → allowedModules → Component → UI
                    ↓
              useDashboardData(allowedOrderTypes)
                    ↓
              Supabase (filtered query)
```

---

## 🎨 Design System Compliance

**Colores aprobados** (Notion-style):
- ✅ Gray foundation: `gray-50` a `gray-900`
- ✅ Success: `emerald-500` (muted green)
- ✅ Warning: `amber-500` (muted yellow)
- ✅ Error: `red-500` (muted red)
- ✅ Info: `indigo-500` (muted purple)

**Prohibido**:
- ❌ Gradients
- ❌ Strong blues (#0066cc, blue-600+)
- ❌ Bright colors

---

## 📦 Estructura de Archivos

```
src/components/dashboard/
├── DashboardMetrics.tsx ✅ (modificado)
├── DepartmentOverview.tsx ✅ (modificado)
├── RecentActivity.tsx ✅ (modificado)
├── TeamPerformance.tsx 🆕 (nuevo)
├── QuickActions.tsx 🆕 (nuevo)
└── ModuleStatusCards.tsx 🆕 (nuevo)

public/translations/
├── en.json ✅ (actualizado con nuevas keys)
├── es.json ✅ (actualizado con nuevas keys)
└── pt-BR.json ✅ (actualizado con nuevas keys)
```

---

## ✅ Checklist de Implementación

**Componente 1: TeamPerformance**
- [ ] Agregar traducciones EN/ES/PT-BR
- [ ] Crear componente con permisos
- [ ] Crear hook useTeamPerformance
- [ ] Verificar TypeScript

**Componente 2: QuickActions**
- [ ] Agregar traducciones EN/ES/PT-BR
- [ ] Crear componente con permisos
- [ ] Implementar navegación condicional
- [ ] Verificar TypeScript

**Componente 3: ModuleStatusCards**
- [ ] Agregar traducciones EN/ES/PT-BR
- [ ] Crear componente con permisos
- [ ] Implementar indicadores de estado
- [ ] Verificar TypeScript

**Integración**
- [ ] Importar en Dashboard.tsx
- [ ] Agregar en layout responsive
- [ ] Verificar build completo
- [ ] Validar en navegador

---

**Creado**: 2025-11-03
**Estado**: Listo para ejecutar
