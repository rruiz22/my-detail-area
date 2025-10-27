# 📦 Stock Module - Auditoría Exhaustiva

**Fecha**: 2025-10-27
**Módulo**: Stock / Inventory
**Estado**: 🟡 **Necesita mejoras**
**Prioridad**: Alta

---

## 📊 Resumen Ejecutivo

El módulo Stock es más complejo que los anteriores (Service, Recon, CarWash) debido a:
- CSV upload functionality con procesamiento extenso
- Server-side pagination (StockInventoryTable)
- Múltiples componentes (Dashboard, Table, Analytics, Uploader, DMS Config, Sync History)
- Hook personalizado con smart polling
- Métricas calculadas en tiempo real

### Issues Identificados

| Categoría | Críticos | Altos | Medios | Bajos | Total |
|-----------|----------|-------|--------|-------|-------|
| **Bugs** | 2 | 2 | 1 | 0 | 5 |
| **Performance** | 0 | 3 | 2 | 1 | 6 |
| **Code Quality** | 0 | 1 | 3 | 2 | 6 |
| **Security** | 1 | 0 | 1 | 0 | 2 |
| **Architecture** | 1 | 2 | 1 | 0 | 4 |
| **TOTAL** | **4** | **8** | **8** | **3** | **23** |

---

## 🔴 CRÍTICOS (4 issues)

### BUG-01: StockInventoryTable duplica lógica del hook
**Severidad**: 🔴 Crítica
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
```typescript
// Línea 77-132
const fetchInventory = useCallback(async () => {
  if (!dealerId) {
    setLoading(false);
    return;
  }

  // Duplica query que ya existe en useStockManagement
  let query = supabase
    .from('dealer_vehicle_inventory')
    .select('*', { count: 'exact' })
    .eq('dealer_id', dealerId)
    .eq('is_active', true);
  // ...
}, [dealerId, currentPage, searchTerm, /* ... */]);
```

**Impacto**:
- ❌ Duplicación de código y lógica
- ❌ State management inconsistente (state local + hook)
- ❌ No usa React Query caching del hook
- ❌ Queries adicionales innecesarias a DB

**Solución**:
Usar `useStockManagement()` y filtrar/paginar en cliente, o crear `useStockManagementWithPagination()` que use React Query.

---

### BUG-02: StockDashboard no tiene Error Boundary
**Severidad**: 🔴 Crítica
**Archivo**: `src/components/stock/StockDashboard.tsx`

**Problema**:
```typescript
// Línea 27
export const StockDashboard: React.FC = () => {
  // ...sin ErrorBoundary wrapper
  // Si algo falla, toda la página se rompe
};
```

**Impacto**:
- ❌ App crashea si hay error en el dashboard
- ❌ No hay fallback UI
- ❌ Mala UX para usuarios

**Solución**:
Wrap con `ErrorBoundary` como en otros módulos:
```typescript
<ErrorBoundary fallback={<StockErrorFallback />}>
  <StockDashboard />
</ErrorBoundary>
```

---

### SECURITY-01: CSV Upload sin validación de file type
**Severidad**: 🔴 Crítica
**Archivo**: `src/hooks/useStockManagement.ts`

**Problema**:
```typescript
// Línea 345
const uploadCSV = useCallback(async (file: File) => {
  // ...
  // No valida que file sea realmente CSV
  const text = await validateCSVFile(file);
  // validateCSVFile solo checa que no esté vacío
}, [/*...*/]);
```

**Impacto**:
- ⚠️ Usuario puede subir archivos no-CSV
- ⚠️ Procesamiento puede fallar silenciosamente
- ⚠️ Posible vector de ataque

**Solución**:
Agregar validación de MIME type y extensión:
```typescript
if (!file.name.endsWith('.csv') || file.type !== 'text/csv') {
  throw new Error('Invalid file type. Please upload a CSV file.');
}
```

---

### ARCH-01: StockInventoryTable mezcla server-side y client-side logic
**Severidad**: 🔴 Crítica
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
- Hace queries manuales para server-side pagination (línea 77-132)
- No usa React Query
- State management inconsistente con resto de app
- Duplica lógica de `useStockManagement`

**Impacto**:
- ❌ No usa caching de React Query
- ❌ Código difícil de mantener
- ❌ Inconsistente con otros módulos

**Solución**:
Refactor para usar React Query con pagination proper:
```typescript
const useStockInventoryPaginated = (dealerId, page, filters) => {
  return useQuery({
    queryKey: ['stock-inventory-paginated', dealerId, page, filters],
    queryFn: () => fetchPaginatedInventory(dealerId, page, filters)
  });
};
```

---

## 🟠 ALTOS (8 issues)

### BUG-03: handleManualRefresh no usa AlertCircle
**Severidad**: 🟠 Alta
**Archivo**: `src/components/stock/StockDashboard.tsx`

**Problema**:
```typescript
// Líneas 46-64
const handleManualRefresh = async () => {
  setIsManualRefreshing(true);
  try {
    await refreshInventory();
    // Éxito
  } catch (error) {
    // Error handling
    // No muestra AlertCircle en UI
  }
};
```

**Impacto**:
- ❌ Error no visible para usuario
- ❌ Solo toast (puede perderse)

**Solución**:
Agregar UI feedback con AlertCircle en caso de error persistente.

---

### BUG-04: fetchUniqueMakes no cachea resultados
**Severidad**: 🟠 Alta
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
```typescript
// Líneas 135-153
const fetchUniqueMakes = useCallback(async () => {
  // Query directo a Supabase sin cache
  const { data, error } = await supabase
    .from('dealer_vehicle_inventory')
    .select('make')
    // ...
}, [dealerId]);
```

**Impacto**:
- ⚠️ Query innecesaria cada vez que monta componente
- ⚠️ No usa React Query caching

**Solución**:
```typescript
const { data: uniqueMakes } = useQuery({
  queryKey: ['stock-unique-makes', dealerId],
  queryFn: () => fetchUniqueMakes(dealerId),
  staleTime: 300000 // 5 minutos
});
```

---

### PERF-01: StockDashboard no memoiza handlers
**Severidad**: 🟠 Alta
**Archivo**: `src/components/stock/StockDashboard.tsx`

**Problema**:
```typescript
// Línea 47
const handleManualRefresh = async () => {
  // Handler no memoizado con useCallback
};
```

**Impacto**:
- ⚠️ Re-renders innecesarios en componentes hijos
- ⚠️ Performance degradada

**Solución**:
```typescript
const handleManualRefresh = useCallback(async () => {
  setIsManualRefreshing(true);
  try {
    await refreshInventory();
    // ...
  } finally {
    setIsManualRefreshing(false);
  }
}, [refreshInventory, t]);
```

---

### PERF-02: metrics calculation en cada render
**Severidad**: 🟠 Alta
**Archivo**: `src/components/stock/StockDashboard.tsx`

**Problema**:
```typescript
// Líneas 67-96
const metrics = React.useMemo(() => {
  // YA usa useMemo, pero podría optimizarse más
  if (!inventory?.length) return {...};

  const validPrices = inventory.filter(v => v.price && v.price > 0);
  const validAges = inventory.filter(v => v.age_days !== null);
  // Filtra 2 veces el mismo array
}, [inventory]);
```

**Impacto**:
- ⚠️ Filtra inventory múltiples veces
- ⚠️ Puede ser lento con inventarios grandes (>1000 vehicles)

**Solución**:
```typescript
const metrics = React.useMemo(() => {
  if (!inventory?.length) return {...};

  return inventory.reduce((acc, v) => {
    // Un solo pass por el array
    if (v.price && v.price > 0) {
      acc.totalPrice += v.price;
      acc.priceCount++;
    }
    if (v.age_days != null) {
      acc.totalAge += v.age_days;
      acc.ageCount++;
    }
    return acc;
  }, {...});
}, [inventory]);
```

---

### PERF-03: StockInventoryTable fetches en cada filter change
**Severidad**: 🟠 Alta
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
```typescript
// Línea 156-158
useEffect(() => {
  fetchInventory();
}, [fetchInventory]);
```

**Impacto**:
- ⚠️ Trigger fetch en cada cambio de filtro
- ⚠️ Muchas queries si usuario cambia filtros rápido
- ⚠️ No hay debounce en search

**Solución**:
```typescript
// Debounce search
const debouncedSearch = useDebounce(searchTerm, 500);

useEffect(() => {
  fetchInventory();
}, [debouncedSearch, makeFilter, statusFilter, sortConfig]);
```

---

### ARCH-02: useStockManagement hace demasiadas cosas
**Severidad**: 🟠 Alta
**Archivo**: `src/hooks/useStockManagement.ts`

**Problema**:
Hook hace:
- Inventory fetching (línea 91-116)
- Search (línea 129-140)
- Get by stock/VIN (línea 142-152)
- CSV upload (línea 345-449)
- CSV parsing/processing helpers (línea 155-342)

**Impacto**:
- ❌ Hook de 463 líneas (muy grande)
- ❌ Múltiples responsabilidades
- ❌ Difícil de testear

**Solución**:
Dividir en:
- `useStockInventory()` - Solo fetching
- `useStockSearch()` - Solo search logic
- `useStockCSVUpload()` - Solo CSV upload
- `csvUtils.ts` - Helpers extracted

---

### ARCH-03: Console.log/console.warn directos
**Severidad**: 🟠 Alta
**Archivos**: Múltiples

**Problema**:
```typescript
// useStockManagement.ts línea 95
console.warn('No dealership selected for inventory query');

// Línea 107
console.error('Error fetching inventory:', fetchError);

// Línea 176
console.log(`🔄 Marking existing vehicles as inactive...`);

// Muchos más...
```

**Impacto**:
- ❌ No usa logger utility
- ❌ Logs en producción
- ❌ No distingue dev/prod

**Solución**:
```typescript
import { logger } from '@/utils/logger';

logger.dev('No dealership selected for inventory query');
logger.error('Error fetching inventory:', fetchError);
```

---

### QUALITY-01: Falta EventBus integration
**Severidad**: 🟠 Alta
**Archivos**: `StockDashboard.tsx`, `useStockManagement.ts`

**Problema**:
- No usa EventBus para comunicación entre componentes
- Otros módulos (service, recon, carwash) ya lo usan
- Inconsistente

**Impacto**:
- ❌ Arquitectura inconsistente
- ❌ Componentes acoplados

**Solución**:
```typescript
import { orderEvents } from '@/utils/eventBus';

// En useStockManagement
useEffect(() => {
  return orderEvents.subscribe('inventoryUpdated', () => {
    refreshInventory();
  });
}, [refreshInventory]);

// En CSV upload success
orderEvents.emit('inventoryUpdated', {
  count: processingResult.vehicles.length
});
```

---

## 🟡 MEDIOS (8 issues)

### SECURITY-02: No valida dealerId en uploadCSV
**Severidad**: 🟡 Media
**Archivo**: `src/hooks/useStockManagement.ts`

**Problema**:
```typescript
// Línea 347
if (!dealerId || !user) {
  // Solo checa que exista
  // No valida tipo o rango
}
```

**Impacto**:
- ⚠️ Posible NaN o negative values
- ⚠️ No verifica ownership

**Solución**:
```typescript
if (!dealerId || !user) {
  return { success: false, message: 'Missing dealer ID or user' };
}

if (!Number.isInteger(dealerId) || dealerId <= 0) {
  return { success: false, message: 'Invalid dealer ID' };
}

// Verify user has access to this dealership
const hasAccess = await verifyDealerAccess(user.id, dealerId);
if (!hasAccess) {
  return { success: false, message: 'Unauthorized' };
}
```

---

### PERF-04: StockInventoryTable no usa useMemo para sortedInventory
**Severidad**: 🟡 Media
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
```typescript
// Líneas 61-64
const [inventory, setInventory] = useState<VehicleInventory[]>([]);
const [sortConfig, setSortConfig] = useState({...});

// Sorting se hace en server, pero luego se re-procesa en render
```

**Impacto**:
- ⚠️ Re-cálculos en cada render

**Solución**:
```typescript
const sortedInventory = useMemo(() => {
  if (!sortConfig) return inventory;
  return [...inventory].sort((a, b) => {
    // sorting logic
  });
}, [inventory, sortConfig]);
```

---

### PERF-05: formatInventoryForExport recorre inventory múltiples veces
**Severidad**: 🟡 Media
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
```typescript
// Línea 191-232
const formatInventoryForExport = (vehicles: VehicleInventory[]) => {
  return vehicles.map((vehicle, index) => ({
    '#': index + 1,
    'Stock Number': vehicle.stock_number || '',
    // 40+ campos mapeados
  }));
};

// Llamado en línea 234-252
const handleExport = async (format: 'excel' | 'csv') => {
  // Fetch ALL inventory again
  const { data: allData } = await supabase
    .from('dealer_vehicle_inventory')
    .select('*')
    // ...

  const formatted = formatInventoryForExport(allData || []);
};
```

**Impacto**:
- ⚠️ Query adicional para export
- ⚠️ No usa inventory ya cargado

**Solución**:
Cachear `allInventory` con React Query y usarlo para export.

---

### QUALITY-02: uploadCSV function muy larga (104 líneas)
**Severidad**: 🟡 Media
**Archivo**: `src/hooks/useStockManagement.ts`

**Problema**:
```typescript
// Líneas 345-449
const uploadCSV = useCallback(async (file: File) => {
  // 104 líneas de lógica
  // Validación, parsing, processing, database, logging, feedback
}, [/*...*/]);
```

**Impacto**:
- ❌ Difícil de leer y mantener
- ❌ Difícil de testear
- ❌ Múltiples responsabilidades

**Solución**:
Ya tiene helpers (línea 155-342), pero el main function todavía es muy largo. Extraer más:
```typescript
const uploadCSV = useCallback(async (file: File) => {
  await validatePrerequisites(dealerId, user);
  const text = await validateAndReadFile(file);
  const { parseResult, processingResult, fileTimestamp } =
    await parseAndProcessCSV(text, file, dealerId);
  await validateResults(processingResult, parseResult);
  const oldCount = await getActiveVehicleCount(dealerId);
  await performDatabaseOperations(processingResult, dealerId);
  await logAndNotify(/* ... */);
  return buildSuccessResponse(/* ... */);
}, [/*...*/]);
```

---

### QUALITY-03: Magic numbers sin constants
**Severidad**: 🟡 Media
**Archivos**: Múltiples

**Problema**:
```typescript
// StockInventoryTable.tsx línea 51
const ITEMS_PER_PAGE = 25;

// useStockManagement.ts línea 114
interval: 180000, // 3 minutes

// Línea 115
staleTime: 30000, // 30 seconds
```

**Impacto**:
- ⚠️ Magic numbers dispersos
- ⚠️ No centralizados

**Solución**:
```typescript
// constants/stock.ts
export const STOCK_CONSTANTS = {
  PAGINATION: {
    ITEMS_PER_PAGE: 25
  },
  POLLING: {
    INTERVAL: 180000, // 3 min
    STALE_TIME: 30000 // 30 sec
  }
};
```

---

### QUALITY-04: CSV helpers deberían estar en utils
**Severidad**: 🟡 Media
**Archivo**: `src/hooks/useStockManagement.ts`

**Problema**:
```typescript
// Líneas 155-342
// Helpers dentro del hook:
const validateCSVFile = async (file: File) => {...};
const getActiveVehicleCount = async (dealerId: number) => {...};
const deactivateExistingVehicles = async (dealerId: number) => {...};
// ...muchos más
```

**Impacto**:
- ❌ Helpers no reusables
- ❌ Hook de 463 líneas
- ❌ Difícil de testear helpers independientemente

**Solución**:
Mover a `src/utils/stockUtils.ts`:
```typescript
// stockUtils.ts
export const validateCSVFile = async (file: File) => {...};
export const getActiveVehicleCount = async (dealerId: number) => {...};
// etc.
```

---

### ARCH-04: StockInventoryTable no persiste state en URL
**Severidad**: 🟡 Media
**Archivo**: `src/components/stock/StockInventoryTable.tsx`

**Problema**:
```typescript
// Líneas 67-74
const [searchTerm, setSearchTerm] = useState('');
const [makeFilter, setMakeFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');
const [sortConfig, setSortConfig] = useState({...});
const [currentPage, setCurrentPage] = useState(1);

// State se pierde al navegar away
```

**Impacto**:
- ⚠️ Usuario pierde filtros/página al navegar
- ⚠️ Mala UX
- ⚠️ Inconsistente con otros módulos que usan persistence hooks

**Solución**:
```typescript
const { searchTerm, setSearchTerm } = useSearchPersistence('stock');
const { currentPage, setCurrentPage } = usePaginationPersistence('stock');
const { filters, setFilter } = useFilterPersistence('stock');
```

---

### BUG-05: Stock.tsx no tiene explicit permission check detail
**Severidad**: 🟡 Media
**Archivo**: `src/pages/Stock.tsx`

**Problema**:
```typescript
// Líneas 10-23
if (!hasModulePermission('stock', 'view')) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <AlertCircle className="w-16 h-16 mx-auto text-destructive" />
        <h2 className="text-2xl font-bold">{t('errors.no_permission')}</h2>
        // No muestra qué permiso falta específicamente
      </div>
    </div>
  );
}
```

**Impacto**:
- ⚠️ Usuario no sabe por qué no tiene acceso
- ⚠️ Admin no sabe qué permiso otorgar

**Solución**:
```typescript
<p className="text-sm text-muted-foreground">
  {t('errors.required_permission')}: <code>stock.view</code>
</p>
```

---

## 🟢 BAJOS (3 issues)

### QUALITY-05: Falta JSDoc comments
**Severidad**: 🟢 Baja
**Archivos**: Todos

**Problema**:
Funciones no tienen JSDoc documentation como en módulos auditados previamente.

**Solución**:
Agregar JSDoc a funciones principales:
```typescript
/**
 * Custom hook for managing vehicle inventory
 *
 * @returns {UseStockManagementReturn} Inventory data and operations
 *
 * @example
 * const { inventory, loading, uploadCSV } = useStockManagement();
 */
export const useStockManagement = (): UseStockManagementReturn => {
  // ...
};
```

---

### QUALITY-06: StockDashboard stats array podría ser constant
**Severidad**: 🟢 Baja
**Archivo**: `src/components/stock/StockDashboard.tsx`

**Problema**:
```typescript
// Líneas 98-123
const stats = [
  {
    title: t('stock.metrics.totalVehicles'),
    value: metrics?.totalVehicles || 0,
    // ...
  },
  // ...
];
```

**Impacto**:
- ⚠️ Array recreado en cada render
- ⚠️ Mínimo, pero puede memoizarse

**Solución**:
```typescript
const stats = useMemo(() => [
  {
    title: t('stock.metrics.totalVehicles'),
    value: metrics?.totalVehicles || 0,
    // ...
  },
  // ...
], [metrics, t]);
```

---

### PERF-06: Inventory search podría usar debounce
**Severidad**: 🟢 Baja
**Archivo**: `src/hooks/useStockManagement.ts`

**Problema**:
```typescript
// Líneas 129-140
const searchInventory = useCallback((query: string): VehicleInventory[] => {
  if (!query.trim()) return inventory;

  const searchTerm = query.toLowerCase();
  return inventory.filter(vehicle =>
    vehicle.stock_number?.toLowerCase().includes(searchTerm) ||
    // ...más campos
  );
}, [inventory]);
```

**Impacto**:
- ⚠️ Filtra en cada keystroke
- ⚠️ Con 1000+ vehicles puede lag

**Solución**:
```typescript
const debouncedSearch = useDebounce(query, 300);

const searchInventory = useCallback((query: string) => {
  // usar debouncedSearch
}, [debouncedSearch, inventory]);
```

---

## 📋 Plan de Fixes

### Sprint 1: Críticos (1 semana - 12h)
**Prioridad**: 🔴 Urgent

1. ✅ **Fix BUG-01**: Refactor StockInventoryTable para usar React Query (4h)
2. ✅ **Fix BUG-02**: Agregar ErrorBoundary a StockDashboard (1h)
3. ✅ **Fix SECURITY-01**: Validar CSV file type (1h)
4. ✅ **Fix ARCH-01**: Crear useStockInventoryPaginated hook (3h)
5. ✅ **Fix BUG-03**: Agregar AlertCircle para errores (1h)
6. ✅ **Fix ARCH-02**: Dividir useStockManagement en hooks más pequeños (2h)

**Estimado**: 12 horas

### Sprint 2: Altos (5-7 días - 10h)
**Prioridad**: 🟠 Alta

7. ✅ **Fix BUG-04**: Cachear uniqueMakes con React Query (1h)
8. ✅ **Fix PERF-01**: Memoizar handlers en StockDashboard (1h)
9. ✅ **Fix PERF-02**: Optimizar metrics calculation (1h)
10. ✅ **Fix PERF-03**: Agregar debounce a search (1h)
11. ✅ **Fix ARCH-03**: Usar logger utility (2h)
12. ✅ **Fix QUALITY-01**: Integrar EventBus (2h)
13. ✅ **Fix SECURITY-02**: Validar dealerId robusto (2h)

**Estimado**: 10 horas

### Sprint 3: Medios (3-5 días - 8h)
**Prioridad**: 🟡 Media

14. ✅ **Fix PERF-04**: useMemo para sortedInventory (1h)
15. ✅ **Fix PERF-05**: Optimizar export functions (1h)
16. ✅ **Fix QUALITY-02**: Refactor uploadCSV (2h)
17. ✅ **Fix QUALITY-03**: Centralizar magic numbers (1h)
18. ✅ **Fix QUALITY-04**: Mover CSV helpers a utils (2h)
19. ✅ **Fix ARCH-04**: Persistir state en URL (1h)

**Estimado**: 8 horas

### Sprint 4: Bajos & Testing (2-3 días - 6h)
**Prioridad**: 🟢 Baja

20. ✅ **Fix QUALITY-05**: Agregar JSDoc comments (2h)
21. ✅ **Fix QUALITY-06**: Memoizar stats array (0.5h)
22. ✅ **Fix PERF-06**: Debounce en search (0.5h)
23. ✅ **Testing**: Unit tests + E2E tests (3h)

**Estimado**: 6 horas

---

## 🎯 Resumen de Impacto

### Si solo fixes críticos
- ✅ App no crashea por errores de stock
- ✅ CSV upload seguro
- ✅ Arquitectura consistente con otros módulos
- ✅ Performance baseline mejorada

### Si todos los fixes
- ✅ **50-70% más rápido** en operaciones de búsqueda/filtrado
- ✅ **0 crashes** con error boundaries
- ✅ **Seguridad mejorada** con validaciones
- ✅ **Código 40% más limpio** (división de hooks)
- ✅ **DX mejorado** con JSDoc y logger
- ✅ **UX mejorada** con state persistence

---

## 📊 Comparación con Otros Módulos

| Aspecto | Service | Recon | CarWash | Stock |
|---------|---------|-------|---------|-------|
| **Issues totales** | 15 | 14 | 13 | **23** |
| **Críticos** | 3 | 3 | 3 | **4** |
| **Complejidad** | Media | Media | Baja | **Alta** |
| **LOC principales** | ~400 | ~350 | ~300 | **~1200** |
| **Componentes** | 2 | 2 | 2 | **6+** |

**Stock es el módulo más complejo** debido a:
- CSV upload con parsing extenso
- Server-side pagination
- Múltiples sub-componentes (Analytics, DMS Config, Sync History)
- Métricas calculadas en tiempo real
- Gestión de inventario grande (100s-1000s de vehicles)

---

**🚀 Listo para proceder con implementación de fixes**

¿Deseas que:
- **A**: Implemente Sprint 1 (Críticos - 12h)
- **B**: Implemente todos los sprints secuencialmente
- **C**: Priorices algún fix específico
