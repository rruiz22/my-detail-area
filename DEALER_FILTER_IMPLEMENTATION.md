# 🏢 Implementación del Filtro Global de Dealer - SLA Configuration

## 🎯 Problema Original

```
fetch.ts:15   GET .../get_ready_sla_config?select=*&dealer_id=eq.0 406 (Not Acceptable)
fetch.ts:15   POST .../get_ready_sla_config?select=* 409 (Conflict)
```

**Causas**:
1. ❌ `dealerId` era `0` mientras el hook `useAccessibleDealerships` cargaba
2. ❌ El query se ejecutaba inmediatamente sin esperar el `dealerId` válido
3. ❌ El `upsert` no especificaba la columna de conflicto correctamente

---

## ✅ Solución Implementada

### 1. **Hook: `useGetReadySLAConfig`**

```typescript
// ANTES
export function useGetReadySLAConfig(dealerId: number) {
  return useQuery({
    queryKey: ['get-ready-sla-config', dealerId],
    queryFn: async (): Promise<SLAConfig | null> => {
      const { data, error } = await supabase
        .from('get_ready_sla_config')
        .select('*')
        .eq('dealer_id', dealerId)
        .single();
      // ...
    },
  });
}

// DESPUÉS
export function useGetReadySLAConfig(dealerId: number | undefined) {
  return useQuery({
    queryKey: ['get-ready-sla-config', dealerId],
    queryFn: async (): Promise<SLAConfig | null> => {
      // 🔒 Validación temprana
      if (!dealerId) {
        console.warn('No dealership selected for SLA config query');
        return null;
      }

      const { data, error } = await supabase
        .from('get_ready_sla_config')
        .select('*')
        .eq('dealer_id', dealerId)
        .single();
      // ...
    },
    enabled: !!dealerId, // ⚡ Solo ejecutar cuando dealerId existe
    staleTime: 1000 * 60 * 5,
  });
}
```

**Cambios**:
- ✅ Tipo `number | undefined` para aceptar estado de carga
- ✅ Validación `if (!dealerId)` antes de hacer el query
- ✅ Opción `enabled: !!dealerId` para prevenir queries prematuros

---

### 2. **Hook: `useSLAConfigMutations`**

```typescript
// ANTES
export function useSLAConfigMutations(dealerId: number) {
  const upsertSLAConfig = useMutation({
    mutationFn: async (config: SLAConfigInput) => {
      const { data, error } = await supabase
        .from('get_ready_sla_config')
        .upsert({
          dealer_id: dealerId,
          ...config,
        })
        .select()
        .single();
      // ...
    },
  });
}

// DESPUÉS
export function useSLAConfigMutations(dealerId: number | undefined) {
  const upsertSLAConfig = useMutation({
    mutationFn: async (config: SLAConfigInput) => {
      // 🔒 Validación de dealerId
      if (!dealerId) {
        throw new Error('No dealership selected');
      }

      const { data, error } = await supabase
        .from('get_ready_sla_config')
        .upsert({
          dealer_id: dealerId,
          ...config,
        }, {
          onConflict: 'dealer_id' // 🔑 Especificar columna de conflicto
        })
        .select()
        .single();
      // ...
    },
  });
}
```

**Cambios**:
- ✅ Tipo `number | undefined`
- ✅ Validación de `dealerId` antes de mutation
- ✅ Opción `onConflict: 'dealer_id'` para UPSERT correcto

---

### 3. **Componente: `SLAConfigurationPanel`**

```typescript
// ANTES
export function SLAConfigurationPanel({ className }: SLAConfigurationPanelProps) {
  const { currentDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id || 0; // ❌ 0 como fallback

  const { data: config, isLoading } = useGetReadySLAConfig(dealerId);
  const { upsertSLAConfig } = useSLAConfigMutations(dealerId);
}

// DESPUÉS
export function SLAConfigurationPanel({ className }: SLAConfigurationPanelProps) {
  const { currentDealership, isLoading: isLoadingDealership } = useAccessibleDealerships();
  const dealerId = currentDealership?.id; // ✅ undefined cuando no hay dealer

  const { data: config, isLoading: isLoadingConfig } = useGetReadySLAConfig(dealerId);
  const { upsertSLAConfig } = useSLAConfigMutations(dealerId);

  // ⚡ Loading compuesto
  const isLoading = isLoadingDealership || isLoadingConfig || !dealerId;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  // ... resto del componente
}
```

**Cambios**:
- ✅ Destructurar `isLoading` de `useAccessibleDealerships`
- ✅ `dealerId` puede ser `undefined` (no fallback a `0`)
- ✅ Estado de carga compuesto que incluye dealer loading
- ✅ Spinner mientras carga cualquier dependencia

---

### 4. **useEffect para Form Data**

```typescript
// DESPUÉS
useEffect(() => {
  if (config) {
    // Cargar configuración existente
    setFormData({
      default_time_goal: config.default_time_goal,
      max_time_goal: config.max_time_goal,
      green_threshold: config.green_threshold,
      warning_threshold: config.warning_threshold,
      danger_threshold: config.danger_threshold,
      enable_notifications: config.enable_notifications,
      count_weekends: config.count_weekends,
      count_business_hours_only: config.count_business_hours_only,
    });
  } else if (!isLoadingConfig && dealerId) {
    // Si no existe config y ya terminó de cargar, usar defaults
    console.log('No SLA config found for dealership, using defaults');
  }
}, [config, isLoadingConfig, dealerId]);
```

**Cambios**:
- ✅ Manejar caso donde no existe configuración (primera vez)
- ✅ Mantener valores por defecto para crear nueva config

---

## 📋 Patrón de Filtro Global en Get Ready

Este patrón se usa en **todos** los componentes y hooks de Get Ready:

### 1. **Hook Setup**
```typescript
import { useAccessibleDealerships } from '@/hooks/useAccessibleDealerships';

const { currentDealership, isLoading: isLoadingDealership } = useAccessibleDealerships();
const dealerId = currentDealership?.id; // undefined mientras carga
```

### 2. **Query Hook**
```typescript
export function useMyGetReadyHook(dealerId: number | undefined) {
  return useQuery({
    queryKey: ['my-query', dealerId],
    queryFn: async () => {
      if (!dealerId) {
        console.warn('No dealership selected');
        return [];
      }

      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('dealer_id', dealerId);

      if (error) throw error;
      return data;
    },
    enabled: !!dealerId, // ⚡ CRUCIAL: Solo ejecutar con dealerId válido
  });
}
```

### 3. **Loading State**
```typescript
const isLoading = isLoadingDealership || isLoadingData || !dealerId;

if (isLoading) {
  return <LoadingSpinner />;
}
```

### 4. **Key Points** ✨
- ✅ **Tipo**: `number | undefined` (no usar `| 0`)
- ✅ **enabled**: `!!dealerId` en todos los queries
- ✅ **Validación**: Verificar `dealerId` en `queryFn`
- ✅ **Loading**: Incluir `isLoadingDealership` en estado de carga
- ✅ **Warning**: Console.warn cuando no hay dealerId

---

## 🔍 Ejemplos en el Código Base

### `useOverviewTable` (useGetReadyVehicles.tsx)
```typescript
export function useOverviewTable() {
  const { currentDealership } = useAccessibleDealerships();

  return useOrderPolling(
    ['get-ready-vehicles', 'overview', currentDealership?.id],
    async (): Promise<ReconVehicle[]> => {
      if (!currentDealership?.id) {
        console.warn('No dealership selected for vehicle query');
        return [];
      }
      // ... query
    },
    !!currentDealership?.id // enabled
  );
}
```

### `useVehicleDetail` (useGetReadyVehicles.tsx)
```typescript
export function useVehicleDetail(vehicleId: string | null) {
  const { currentDealership } = useAccessibleDealerships();

  return useQuery<VehicleDetail | null>({
    queryKey: ['get-ready-vehicle-detail', vehicleId, currentDealership?.id],
    queryFn: async () => {
      if (!vehicleId || !currentDealership?.id) return null;
      // ... query
    },
    enabled: !!vehicleId && !!currentDealership?.id,
  });
}
```

---

## 🎯 Resultado

### Antes:
```
❌ dealer_id=eq.0 (406 Not Acceptable)
❌ 409 Conflict en upsert
❌ Queries ejecutándose prematuramente
```

### Después:
```
✅ Query espera a que dealerId esté disponible
✅ Upsert funciona correctamente con onConflict
✅ Loading state correcto durante carga de dealer
✅ Consistente con todo el módulo Get Ready
```

---

## 📚 Beneficios del Patrón

1. **Performance** 🚀
   - No ejecuta queries innecesarios
   - React Query cachea eficientemente por dealerId

2. **UX Mejorado** ✨
   - Loading states claros
   - No errores en consola
   - Transiciones suaves

3. **Mantenibilidad** 🔧
   - Patrón consistente en toda la app
   - Fácil de debuggear
   - Type-safe con TypeScript

4. **Multi-Dealer Support** 🏢
   - Funciona con usuarios multi-dealer
   - Respeta selección actual de dealer
   - Cache por dealer ID

---

## ✅ Checklist de Implementación

Al crear nuevos hooks/componentes para Get Ready:

- [ ] Importar `useAccessibleDealerships`
- [ ] Tipo `number | undefined` para dealerId
- [ ] Validación `if (!dealerId)` en queryFn
- [ ] Opción `enabled: !!dealerId` en useQuery
- [ ] Incluir dealerId en queryKey
- [ ] Loading state compuesto
- [ ] Console.warn para debugging

---

**Fecha:** 14 de Octubre, 2025
**Status:** ✅ IMPLEMENTADO Y PROBADO
