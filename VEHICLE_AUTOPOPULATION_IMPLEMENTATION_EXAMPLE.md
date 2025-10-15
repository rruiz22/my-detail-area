# 🔧 Ejemplo de Implementación: Vehicle Auto-Population en Sales Orders

## 📌 Objetivo

Integrar el sistema de auto-población de vehículos en el modal de Sales Orders, permitiendo buscar vehículos del inventario y auto-poblar todos los datos del vehículo.

---

## 🎯 Cambios Necesarios en `OrderModal.tsx`

### 1. Importaciones Necesarias

```tsx
// Añadir estos imports al inicio del archivo
import { VehicleAutoPopulationField } from '@/components/orders/VehicleAutoPopulationField';
import { VehicleSearchResult } from '@/hooks/useVehicleAutoPopulation';
```

### 2. Estado para el Vehículo Seleccionado

```tsx
// Añadir dentro del componente OrderModal, junto a los otros useState
const [selectedVehicle, setSelectedVehicle] = useState<VehicleSearchResult | null>(null);
```

### 3. Handler para Selección de Vehículo

```tsx
// Añadir este handler después de los otros handlers
const handleVehicleSelect = (result: VehicleSearchResult) => {
  setSelectedVehicle(result);

  // Auto-populate form fields from inventory or VIN API
  setFormData(prev => ({
    ...prev,
    stockNumber: result.data.stockNumber || '',
    vehicleVin: result.data.vin || '',
    vehicleYear: String(result.data.year || ''),
    vehicleMake: result.data.make || '',
    vehicleModel: result.data.model || '',
    vehicleInfo: result.data.vehicleInfo || `${result.data.year || ''} ${result.data.make || ''} ${result.data.model || ''}`.trim()
  }));

  // Optional: Show toast with additional inventory data
  if (result.source === 'inventory') {
    const enrichedInfo = [];
    if (result.data.price) enrichedInfo.push(`Price: $${result.data.price.toLocaleString()}`);
    if (result.data.age_days) enrichedInfo.push(`Age: ${result.data.age_days} days`);
    if (result.data.leads_total) enrichedInfo.push(`Leads: ${result.data.leads_total}`);

    if (enrichedInfo.length > 0) {
      toast.success(`Vehicle loaded from inventory - ${enrichedInfo.join(' | ')}`);
    }
  }
};
```

### 4. Resetear Vehículo al Cerrar Modal

```tsx
// Modificar el handler handleClose existente
const handleClose = () => {
  // ... código existente ...
  setSelectedVehicle(null); // Añadir esta línea
  onClose();
};
```

### 5. Actualizar el JSX del Modal

**Opción A: Reemplazar campos existentes de Stock y VIN**

Encuentra la sección donde están los campos de Stock Number y VIN (algo como):

```tsx
{/* ANTES - Campos separados */}
<div>
  <Label htmlFor="stockNumber">Stock Number</Label>
  <Input
    id="stockNumber"
    value={formData.stockNumber}
    onChange={(e) => handleInputChange('stockNumber', e.target.value)}
  />
</div>

<div>
  <Label htmlFor="vehicleVin">VIN</Label>
  <VinInputWithScanner
    id="vehicleVin"
    value={formData.vehicleVin}
    onChange={(e) => handleVinChange(e.target.value)}
  />
</div>
```

Y reemplázalo con:

```tsx
{/* DESPUÉS - Campo de búsqueda unificado */}
<div className="space-y-4">
  <VehicleAutoPopulationField
    dealerId={currentDealership?.id}
    onVehicleSelect={handleVehicleSelect}
    selectedVehicle={selectedVehicle}
    label={t('stock.autopop.searchVehicle')}
    placeholder={t('stock.filters.search_placeholder')}
  />

  {/* Campos individuales como readonly si hay vehículo seleccionado */}
  {selectedVehicle && (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="stockNumber">
          {t('orders.stock_number')}
        </Label>
        <Input
          id="stockNumber"
          value={formData.stockNumber}
          onChange={(e) => handleInputChange('stockNumber', e.target.value)}
          className="bg-muted/30"
          readOnly={!!selectedVehicle}
        />
      </div>

      <div>
        <Label htmlFor="vehicleVin">VIN</Label>
        <Input
          id="vehicleVin"
          value={formData.vehicleVin}
          onChange={(e) => handleInputChange('vehicleVin', e.target.value)}
          className="bg-muted/30 font-mono"
          readOnly={!!selectedVehicle}
        />
      </div>
    </div>
  )}
</div>
```

**Opción B: Mantener ambos sistemas (recomendado para transición)**

Añade el campo de búsqueda ANTES de los campos existentes:

```tsx
{/* Nueva búsqueda de vehículos */}
<div className="mb-4">
  <VehicleAutoPopulationField
    dealerId={currentDealership?.id}
    onVehicleSelect={handleVehicleSelect}
    selectedVehicle={selectedVehicle}
    label={t('stock.autopop.searchVehicle')}
    placeholder={t('stock.filters.search_placeholder')}
  />
</div>

<Separator className="my-4" />

{/* Campos existentes de stock y VIN - Ahora readonly si hay vehículo seleccionado */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="stockNumber">
      {t('orders.stock_number')} <span className="text-red-500">*</span>
    </Label>
    <Input
      id="stockNumber"
      value={formData.stockNumber}
      onChange={(e) => handleInputChange('stockNumber', e.target.value)}
      className={selectedVehicle ? "bg-muted/30" : ""}
      readOnly={!!selectedVehicle}
      required
    />
    {selectedVehicle && (
      <p className="text-xs text-muted-foreground mt-1">
        Auto-populated from {selectedVehicle.source === 'inventory' ? 'inventory' : 'VIN API'}
      </p>
    )}
  </div>

  <div>
    <Label htmlFor="vehicleVin">
      VIN <span className="text-red-500">*</span>
    </Label>
    <VinInputWithScanner
      id="vehicleVin"
      value={formData.vehicleVin}
      onChange={(e) => handleVinChange(e.target.value)}
      className={selectedVehicle ? "bg-muted/30 font-mono" : "font-mono"}
      disabled={!!selectedVehicle}
    />
  </div>
</div>
```

---

## 📝 Código Completo del Handler

```typescript
const handleVehicleSelect = (result: VehicleSearchResult) => {
  console.log('Vehicle selected from autopop:', result);
  setSelectedVehicle(result);

  // Auto-populate all vehicle-related fields
  setFormData(prev => ({
    ...prev,
    stockNumber: result.data.stockNumber || '',
    vehicleVin: result.data.vin || '',
    vehicleYear: String(result.data.year || ''),
    vehicleMake: result.data.make || '',
    vehicleModel: result.data.model || '',
    vehicleInfo: result.data.vehicleInfo ||
      `${result.data.year || ''} ${result.data.make || ''} ${result.data.model || ''} ${result.data.trim ? `(${result.data.trim})` : ''}`.trim()
  }));

  // Show different messages based on source
  if (result.source === 'inventory') {
    const details = [];
    if (result.data.price) details.push(`$${result.data.price.toLocaleString()}`);
    if (result.data.age_days) details.push(`${result.data.age_days} days`);
    if (result.data.color) details.push(result.data.color);
    if (result.data.mileage) details.push(`${result.data.mileage.toLocaleString()} mi`);

    toast.success(
      `Vehicle loaded from inventory${details.length > 0 ? ': ' + details.join(' • ') : ''}`,
      { duration: 4000 }
    );
  } else if (result.source === 'vin_api') {
    toast.success('Vehicle decoded from VIN API', { duration: 3000 });
  }
};
```

---

## 🔄 Permitir Edición Manual

Si quieres permitir que el usuario pueda cambiar a entrada manual después de seleccionar un vehículo:

```tsx
const [allowManualEdit, setAllowManualEdit] = useState(false);

// En el JSX:
{selectedVehicle && (
  <Button
    type="button"
    variant="ghost"
    size="sm"
    onClick={() => {
      setSelectedVehicle(null);
      setAllowManualEdit(true);
    }}
  >
    Clear & Enter Manually
  </Button>
)}
```

---

## ✅ Checklist de Implementación

- [ ] Añadir imports necesarios
- [ ] Añadir estado `selectedVehicle`
- [ ] Crear handler `handleVehicleSelect`
- [ ] Actualizar handler `handleClose` para resetear vehículo
- [ ] Integrar `VehicleAutoPopulationField` en el JSX
- [ ] Hacer campos readonly cuando hay vehículo seleccionado (opcional)
- [ ] Añadir feedback visual (badges, mensajes)
- [ ] Probar con diferentes escenarios:
  - [ ] Búsqueda por stock number
  - [ ] Búsqueda por VIN
  - [ ] Búsqueda por marca/modelo
  - [ ] Selección de vehículo del inventario
  - [ ] Fallback a VIN API
  - [ ] Validación de formulario con vehículo auto-poblado

---

## 🎨 Personalización UI

### Añadir Badge de Fuente

```tsx
{selectedVehicle && (
  <div className="flex items-center gap-2">
    <Badge variant={selectedVehicle.source === 'inventory' ? 'default' : 'secondary'}>
      {selectedVehicle.source === 'inventory' ? (
        <>
          <Car className="h-3 w-3 mr-1" />
          From Inventory
        </>
      ) : (
        <>
          <Zap className="h-3 w-3 mr-1" />
          VIN Decoded
        </>
      )}
    </Badge>

    {selectedVehicle.data.price && (
      <Badge variant="outline">
        ${selectedVehicle.data.price.toLocaleString()}
      </Badge>
    )}
  </div>
)}
```

### Mostrar Datos Enriquecidos del Inventario

```tsx
{selectedVehicle?.source === 'inventory' && (
  <Alert className="mt-4">
    <Car className="h-4 w-4" />
    <AlertTitle>Inventory Data Available</AlertTitle>
    <AlertDescription>
      <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
        {selectedVehicle.data.age_days && (
          <div><strong>Age:</strong> {selectedVehicle.data.age_days} days</div>
        )}
        {selectedVehicle.data.leads_total !== undefined && (
          <div><strong>Leads:</strong> {selectedVehicle.data.leads_total}</div>
        )}
        {selectedVehicle.data.estimated_profit && (
          <div><strong>Est. Profit:</strong> ${selectedVehicle.data.estimated_profit.toLocaleString()}</div>
        )}
        {selectedVehicle.data.market_rank_overall && (
          <div><strong>Market Rank:</strong> {selectedVehicle.data.market_rank_overall}</div>
        )}
      </div>
    </AlertDescription>
  </Alert>
)}
```

---

## 🚀 Resultado Esperado

Después de implementar estos cambios:

1. ✅ El usuario puede buscar vehículos escribiendo en el campo
2. ✅ Aparece dropdown con resultados en tiempo real
3. ✅ Al seleccionar, todos los campos se auto-poblan
4. ✅ Se muestra tarjeta con preview del vehículo
5. ✅ Datos enriquecidos del inventario disponibles
6. ✅ Experiencia de usuario mejorada significativamente

---

## 🔍 Debugging

Si algo no funciona:

```tsx
// Añadir logs para debugging
console.log('Current dealerId:', currentDealership?.id);
console.log('Selected vehicle:', selectedVehicle);
console.log('Form data:', formData);
```

Verificar en las herramientas de desarrollo del navegador:
- Network tab: Llamadas a `dealer_vehicle_inventory`
- Console: Errores de carga del hook
- React DevTools: Estado del componente

---

## 📞 Siguiente Paso

Después de implementar en Sales Orders, replicar en:
1. Service Orders
2. Car Wash Orders
3. Recon Orders

El proceso es idéntico, solo cambiar nombres de variables según el contexto de cada módulo.
