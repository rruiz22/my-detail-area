# 🚗 Guía de Implementación: Vehicle Auto-Population System

## 📌 Descripción General

Este sistema permite buscar vehículos del módulo **Stock** y auto-poblar los datos del vehículo en otros módulos (Sales Orders, Service Orders, Car Wash, Recon Orders, etc.).

---

## ✅ Componentes Ya Implementados

### 1. `VehicleSearchInput`
**Ubicación:** `src/components/ui/vehicle-search-input.tsx`

**Características:**
- Input con búsqueda en tiempo real (debounce de 300ms)
- Dropdown con resultados mientras escribes
- Navegación con teclado (flechas, Enter, Escape)
- Icono de loading durante la búsqueda
- Muestra hasta 5 resultados
- Búsqueda por: Stock Number, VIN, Make, Model, Year

**Props:**
```typescript
interface VehicleSearchInputProps {
  dealerId?: number;
  onVehicleSelect?: (result: VehicleSearchResult) => void;
  placeholder?: string;
  value?: string;
  className?: string;
}
```

---

### 2. `VehicleAutoPopulationField`
**Ubicación:** `src/components/orders/VehicleAutoPopulationField.tsx`

**Características:**
- Campo completo con label
- Incluye `VehicleSearchInput`
- Muestra tarjeta de vista previa del vehículo seleccionado
- Muestra datos enriquecidos del inventario (precio, edad, leads, profit)
- Badges para indicar fuente de datos (Inventory vs VIN API)

**Props:**
```typescript
interface VehicleAutoPopulationFieldProps {
  dealerId?: number;
  onVehicleSelect?: (result: VehicleSearchResult) => void;
  selectedVehicle?: VehicleSearchResult | null;
  label?: string;
  placeholder?: string;
  className?: string;
}
```

---

### 3. `useVehicleAutoPopulation` Hook
**Ubicación:** `src/hooks/useVehicleAutoPopulation.tsx`

**Métodos disponibles:**
```typescript
interface UseVehicleAutoPopulationReturn {
  searchVehicle: (query: string) => Promise<VehicleSearchResult[]>;
  searchByStock: (stockNumber: string) => Promise<VehicleSearchResult | null>;
  searchByVin: (vin: string) => Promise<VehicleSearchResult | null>;
  loading: boolean;
  error: string | null;
}
```

**Lógica de búsqueda:**
1. Si el query tiene 17 caracteres → busca por VIN
2. Primero busca en inventario local (`dealer_vehicle_inventory`)
3. Si no encuentra, hace fallback a VIN API
4. Retorna datos enriquecidos del inventario cuando está disponible

---

### 4. Estructura de Datos: `VehicleSearchResult`

```typescript
export interface VehicleSearchResult {
  source: 'inventory' | 'vin_api' | 'manual';
  confidence: 'high' | 'medium' | 'low';
  data: {
    stockNumber?: string;
    vin?: string;
    year?: string | number;
    make?: string;
    model?: string;
    trim?: string;
    vehicleInfo?: string;
    price?: number;
    mileage?: number;
    color?: string;
    // Inventory-specific enrichment
    age_days?: number;
    leads_total?: number;
    market_rank_overall?: number;
    acv_wholesale?: number;
    estimated_profit?: number;
  };
  preview?: {
    title: string;
    subtitle?: string;
    badge?: string;
    badgeVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
  };
}
```

---

## 🔧 Cómo Implementar en un Módulo

### Opción 1: Uso Básico con `VehicleSearchInput`

```tsx
import { VehicleSearchInput } from '@/components/ui/vehicle-search-input';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';

const MyOrderModal = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [formData, setFormData] = useState({
    stockNumber: '',
    vehicleVin: '',
    vehicleYear: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleInfo: ''
  });

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    setSelectedVehicle(result);

    // Auto-populate form fields
    setFormData(prev => ({
      ...prev,
      stockNumber: result.data.stockNumber || '',
      vehicleVin: result.data.vin || '',
      vehicleYear: String(result.data.year || ''),
      vehicleMake: result.data.make || '',
      vehicleModel: result.data.model || '',
      vehicleInfo: result.data.vehicleInfo || ''
    }));
  };

  return (
    <div>
      <Label>Search Vehicle</Label>
      <VehicleSearchInput
        dealerId={currentDealerId}
        onVehicleSelect={handleVehicleSelect}
        placeholder="Search by stock #, VIN, make, model..."
      />
    </div>
  );
};
```

---

### Opción 2: Uso Completo con `VehicleAutoPopulationField`

```tsx
import { VehicleAutoPopulationField } from '@/components/orders/VehicleAutoPopulationField';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';

const MyOrderModal = () => {
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
  const [formData, setFormData] = useState({...});

  const handleVehicleSelect = (result: VehicleSearchResult) => {
    setSelectedVehicle(result);

    setFormData(prev => ({
      ...prev,
      stockNumber: result.data.stockNumber || '',
      vehicleVin: result.data.vin || '',
      vehicleYear: String(result.data.year || ''),
      vehicleMake: result.data.make || '',
      vehicleModel: result.data.model || '',
      vehicleInfo: result.data.vehicleInfo || ''
    }));
  };

  return (
    <VehicleAutoPopulationField
      dealerId={currentDealerId}
      onVehicleSelect={handleVehicleSelect}
      selectedVehicle={selectedVehicle}
      label="Search & Select Vehicle"
      placeholder="Search by stock #, VIN, make, model..."
    />
  );
};
```

---

## 📝 Traducciones Necesarias

Añadir estas líneas en los archivos de traducción (`en.json`, `es.json`, `pt-BR.json`):

```json
{
  "stock": {
    "autopop": {
      "searchVehicle": "Search vehicle by stock, VIN, make or model",
      "localInventory": "Local Inventory",
      "vinDecoded": "VIN Decoded",
      "useVehicle": "Use this vehicle",
      "noResults": "No vehicles found",
      "confidence": {
        "high": "High Match",
        "medium": "Medium Match",
        "low": "Low Match"
      }
    }
  }
}
```

**Español:**
```json
{
  "stock": {
    "autopop": {
      "searchVehicle": "Buscar vehículo por stock, VIN, marca o modelo",
      "localInventory": "Inventario Local",
      "vinDecoded": "VIN Decodificado",
      "useVehicle": "Usar este vehículo",
      "noResults": "No se encontraron vehículos",
      "confidence": {
        "high": "Alta Coincidencia",
        "medium": "Coincidencia Media",
        "low": "Baja Coincidencia"
      }
    }
  }
}
```

**Português:**
```json
{
  "stock": {
    "autopop": {
      "searchVehicle": "Buscar veículo por stock, VIN, marca ou modelo",
      "localInventory": "Inventário Local",
      "vinDecoded": "VIN Decodificado",
      "useVehicle": "Usar este veículo",
      "noResults": "Nenhum veículo encontrado",
      "confidence": {
        "high": "Alta Correspondência",
        "medium": "Correspondência Média",
        "low": "Baixa Correspondência"
      }
    }
  }
}
```

---

## 🎯 Módulos Pendientes de Implementación

### ✅ Implementar en:

1. **Sales Orders** (`src/components/orders/OrderModal.tsx`)
2. **Service Orders** (`src/components/orders/ServiceOrderModal.tsx`)
3. **Car Wash Orders** (`src/components/orders/CarWashOrderModal.tsx`)
4. **Recon Orders** (`src/components/orders/ReconOrderModal.tsx`)

### 🔍 Pasos para cada módulo:

1. Importar `VehicleAutoPopulationField`
2. Añadir estado para `selectedVehicle`
3. Implementar handler `handleVehicleSelect`
4. Reemplazar campos individuales (stock, VIN) con el componente
5. Mantener campos existentes como readonly/disabled después de selección
6. Permitir edición manual si es necesario

---

## 🚀 Beneficios

✅ **Búsqueda rápida** - Autocomplete en tiempo real
✅ **Datos enriquecidos** - Precio, edad, leads, profit del inventario
✅ **Múltiples fuentes** - Inventario local + VIN API de fallback
✅ **UX mejorada** - Menos errores de captura manual
✅ **Consistencia** - Mismo componente en todos los módulos
✅ **Validación automática** - VIN y datos validados desde el inventario

---

## 🔗 Base de Datos

El sistema consulta la tabla `dealer_vehicle_inventory` que contiene:

- `stock_number` - Número de stock único
- `vin` - VIN del vehículo
- `year`, `make`, `model`, `trim` - Información del vehículo
- `price`, `mileage`, `color` - Detalles comerciales
- `age_days` - Días en inventario
- `leads_total` - Total de leads generados
- `estimated_profit` - Profit estimado
- `dealer_id` - ID del dealer (para filtrado)
- `is_active` - Estado activo/inactivo

---

## 📌 Notas Importantes

1. **Dealer Filtering**: El sistema automáticamente filtra por `dealer_id` actual
2. **Performance**: Usa debounce de 300ms para evitar búsquedas excesivas
3. **Fallback**: Si no encuentra en inventario, usa VIN API como respaldo
4. **Cache**: Los resultados del inventario se cachean vía React Query
5. **Keyboard Navigation**: Soporta navegación completa con teclado

---

## 🎨 Personalización

### Cambiar número de resultados:
```typescript
// En useVehicleAutoPopulation.tsx, línea 202
return results.slice(0, 10); // Cambia 5 a 10 para más resultados
```

### Cambiar debounce:
```typescript
// En vehicle-search-input.tsx, línea 40
const timeoutId = setTimeout(async () => {
  // Cambiar 300 a otro valor (en milisegundos)
}, 500);
```

### Personalizar campos mostrados:
Editar `VehicleAutoPopulationField.tsx` para agregar/quitar campos en la preview card.

---

## 📞 Soporte

Para dudas o problemas, revisar:
- `src/hooks/useVehicleAutoPopulation.tsx` - Lógica de búsqueda
- `src/hooks/useStockManagement.ts` - Gestión de inventario
- `src/components/ui/vehicle-search-input.tsx` - UI del input
- `src/components/orders/VehicleAutoPopulationField.tsx` - Campo completo
