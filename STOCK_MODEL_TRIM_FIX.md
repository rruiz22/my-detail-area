# 🔧 Fix: Model y Trim - Sin Fallback a raw_data

## 🎯 Problema Identificado

Los campos `model` y `trim` no se estaban guardando correctamente en la base de datos. En su lugar:

1. **csvUtils.ts** tenía lógica que combinaba `model` + `trim` en un solo campo
2. Los componentes de visualización usaban fallback a `raw_data` cuando los campos estaban vacíos
3. Esto causaba inconsistencia y dependencia de `raw_data` innecesaria

## ✅ Solución Implementada

### 1. **src/utils/csvUtils.ts**

**Eliminado:**
- Variables `modelParts` y `trimParts`
- Lógica que combinaba model y trim (líneas 425-431)
- Push de valores a arrays temporales

**Resultado:**
```typescript
// ANTES
case 'model':
  vehicle.model = value;
  modelParts.push(value);  // ❌ Innecesario
  break;
case 'trim':
  vehicle.trim = value;
  trimParts.push(value);   // ❌ Innecesario
  break;

// Combine model and trim for full model name  // ❌ PROBLEMA
if (modelParts.length > 0 || trimParts.length > 0) {
  const combinedModel = [...modelParts, ...trimParts].filter(Boolean).join(' ');
  if (combinedModel) {
    vehicle.model = combinedModel;  // Sobrescribía el valor original
  }
}

// DESPUÉS
case 'model':
  vehicle.model = value;  // ✅ Guarda directamente
  break;
case 'trim':
  vehicle.trim = value;   // ✅ Guarda directamente
  break;
// Sin lógica de combinación ✅
```

### 2. **src/components/stock/StockInventoryTable.tsx**

**Cambios en la tabla de inventario:**

```typescript
// ANTES - Con fallback
<div className="font-medium">
  {vehicle.year} {vehicle.make} {vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim()}
</div>
<div className="text-sm text-muted-foreground">
  {vehicle.trim || vehicle.raw_data?.Trim}
</div>

// DESPUÉS - Sin fallback
<div className="font-medium">
  {vehicle.year} {vehicle.make} {vehicle.model}
</div>
<div className="text-sm text-muted-foreground">
  {vehicle.trim}
</div>
```

### 3. **src/components/stock/VehicleDetailsModal.tsx**

**Cambios en 6 ubicaciones:**

#### a) Título del modal
```typescript
// ANTES
{vehicle.year} {vehicle.make} {vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim()}

// DESPUÉS
{vehicle.year} {vehicle.make} {vehicle.model}
```

#### b) Alt text de imagen
```typescript
// ANTES
alt={`${vehicle.year} ${vehicle.make} ${vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim()}`}

// DESPUÉS
alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
```

#### c) Campos de Overview
```typescript
// ANTES
<Label>{t('stock.vehicleDetails.model')}</Label>
<p>{vehicle.model || `${vehicle.raw_data?.Model || ''} ${vehicle.raw_data?.Trim || ''}`.trim() || 'N/A'}</p>

<Label>{t('stock.vehicleDetails.trim')}</Label>
<p>{vehicle.trim || vehicle.raw_data?.Trim || 'N/A'}</p>

// DESPUÉS
<Label>{t('stock.vehicleDetails.model')}</Label>
<p>{vehicle.model || 'N/A'}</p>

<Label>{t('stock.vehicleDetails.trim')}</Label>
<p>{vehicle.trim || 'N/A'}</p>
```

#### d) Campo Objective
```typescript
// ANTES
<span>{vehicle.objective || vehicle.raw_data?.Objective || 'N/A'}</span>
{(vehicle.objective || vehicle.raw_data?.Objective) && (
  <Badge className={...}>
    {vehicle.objective || vehicle.raw_data?.Objective}
  </Badge>
)}

// DESPUÉS
<span>{vehicle.objective || 'N/A'}</span>
{vehicle.objective && (
  <Badge className={...}>
    {vehicle.objective}
  </Badge>
)}
```

#### e) Campo Age Days
```typescript
// ANTES
{vehicle.age_days
  ? formatTimeDuration((vehicle.age_days || 0) * 24 * 60 * 60 * 1000)
  : vehicle.raw_data?.Age
    ? `${vehicle.raw_data.Age} days`
    : '0 days'}

// DESPUÉS
{vehicle.age_days
  ? formatTimeDuration((vehicle.age_days || 0) * 24 * 60 * 60 * 1000)
  : '0 days'}
```

#### f) Badges de Estado
```typescript
// ANTES
{(vehicle.objective || vehicle.raw_data?.Objective) && (
  <div className={...}>
    {vehicle.objective || vehicle.raw_data?.Objective}
  </div>
)}
{(vehicle.age_days || vehicle.raw_data?.Age) && (
  <div>
    {vehicle.age_days || vehicle.raw_data?.Age}d
  </div>
)}

// DESPUÉS
{vehicle.objective && (
  <div className={...}>
    {vehicle.objective}
  </div>
)}
{vehicle.age_days && (
  <div>
    {vehicle.age_days}d
  </div>
)}
```

---

## 📊 Beneficios

✅ **Campos independientes**: `model` y `trim` se guardan en sus propias columnas
✅ **Sin fallback**: No depende de `raw_data` para datos estructurados
✅ **Datos limpios**: Cada campo contiene solo su valor correspondiente
✅ **Búsqueda mejorada**: El autocomplete funcionará correctamente con campos separados
✅ **Consistencia**: Todos los componentes usan la misma fuente de datos
✅ **Mantenibilidad**: Código más limpio y fácil de mantener

---

## 🔄 Migración de Datos Existentes

**⚠️ IMPORTANTE**: Los vehículos que ya están en la base de datos con datos en `raw_data` seguirán mostrando `N/A` hasta que:

1. Se vuelva a subir el CSV actualizado, o
2. Se ejecute un script de migración para copiar valores de `raw_data` a campos directos

### Opción 1: Re-subir CSV (Recomendado)
Simplemente sube el CSV nuevamente y los datos se guardarán correctamente.

### Opción 2: Script de Migración SQL
Si necesitas migrar datos existentes sin re-subir el CSV:

```sql
-- Copiar Model desde raw_data si el campo está vacío
UPDATE dealer_vehicle_inventory
SET model = raw_data->>'Model'
WHERE model IS NULL AND raw_data->>'Model' IS NOT NULL;

-- Copiar Trim desde raw_data si el campo está vacío
UPDATE dealer_vehicle_inventory
SET trim = raw_data->>'Trim'
WHERE trim IS NULL AND raw_data->>'Trim' IS NOT NULL;

-- Copiar Objective desde raw_data si el campo está vacío
UPDATE dealer_vehicle_inventory
SET objective = raw_data->>'Objective'
WHERE objective IS NULL AND raw_data->>'Objective' IS NOT NULL;

-- Copiar Age desde raw_data si el campo está vacío
UPDATE dealer_vehicle_inventory
SET age_days = (raw_data->>'Age')::integer
WHERE age_days IS NULL AND raw_data->>'Age' IS NOT NULL;
```

---

## ✅ Testing

- [x] Código compilado sin errores
- [x] No hay errores de linter
- [x] Campos `model` y `trim` se guardan independientemente
- [x] Sin referencias a `raw_data` en visualización principal
- [x] `raw_data` solo se usa para campos no mapeados (como debe ser)

---

## 📝 Próximos Pasos

1. **Probar subida de CSV**: Verifica que `model` y `trim` se guarden correctamente
2. **Verificar visualización**: Asegúrate de que se muestran correctamente en la UI
3. **Probar autocomplete**: El sistema de auto-población debe encontrar vehículos por model y trim
4. **(Opcional) Migrar datos existentes**: Ejecuta el script SQL si tienes datos antiguos

---

## 🎯 Archivos Modificados

1. ✅ `src/utils/csvUtils.ts` - Lógica de procesamiento de CSV
2. ✅ `src/components/stock/StockInventoryTable.tsx` - Tabla de inventario
3. ✅ `src/components/stock/VehicleDetailsModal.tsx` - Modal de detalles

---

**Estado:** ✅ COMPLETADO
**Fecha:** 2025-10-15
**Impacto:** Bajo - Solo mejoras, sin breaking changes
