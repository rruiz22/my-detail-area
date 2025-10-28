# Plan de Implementación: Uppercase para Campos Stock y VIN

## 📋 Objetivo
Aplicar transformación automática a UPPERCASE en todos los campos de Stock Number, VIN, y TAG en toda la aplicación de manera consistente.

## 🔍 Análisis Actual

### ✅ Ya Implementado Correctamente
- **CarWashOrderModal.tsx** (líneas 469-505)
  ```tsx
  // VIN
  onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
  className="border-input bg-background font-mono uppercase"

  // Stock Number
  onChange={(e) => handleInputChange('stockNumber', e.target.value.toUpperCase())}
  className="border-input bg-background uppercase"

  // TAG
  onChange={(e) => handleInputChange('tag', e.target.value.toUpperCase())}
  className="border-input bg-background uppercase"
  ```

### ❌ Necesita Implementación

#### Modales de Órdenes (Alta Prioridad)
1. **OrderModal.tsx** (Sales Orders)
   - Línea ~1030: VIN input NO tiene `.toUpperCase()`
   - Necesita: Stock Number uppercase (si existe)

2. **ServiceOrderModal.tsx**
   - Necesita verificar: VIN y Stock Number

3. **ReconOrderModal.tsx**
   - Necesita verificar: VIN, Stock Number, TAG

4. **OrderDetailModal.tsx**
   - Verificar si tiene inputs editables

5. **UnifiedOrderDetailModal.tsx**
   - Verificar si tiene inputs editables

#### Componentes de Stock (Media Prioridad)
6. **StockInventoryTable.tsx**
   - Verificar filtros de búsqueda
   - Posibles inputs de edición inline

7. **StockCSVUploader.tsx**
   - Transformar datos durante la carga

## 🎯 Patrón Estándar a Implementar

### Para Inputs de VIN:
```tsx
<VinInputWithScanner
  id="vehicleVin"
  value={formData.vehicleVin}
  onChange={(e) => handleVinChange(e.target.value.toUpperCase())}
  onVinScanned={(vin) => handleVinChange(vin.toUpperCase())}
  className="border-input bg-background font-mono uppercase"
/>
```

### Para Inputs de Stock Number:
```tsx
<Input
  id="stockNumber"
  value={formData.stockNumber}
  onChange={(e) => handleInputChange('stockNumber', e.target.value.toUpperCase())}
  className="border-input bg-background uppercase"
  placeholder="ST-001"
/>
```

### Para Inputs de TAG:
```tsx
<Input
  id="tag"
  value={formData.tag}
  onChange={(e) => handleInputChange('tag', e.target.value.toUpperCase())}
  className="border-input bg-background uppercase"
  placeholder="LOT-A1"
/>
```

## 📝 Plan de Ejecución (Paso a Paso)

### Fase 1: Modales de Órdenes (Crítico) ⚡
**Tiempo estimado: 30 minutos**

1. **OrderModal.tsx** (Sales Orders)
   - [ ] Buscar campo VIN (línea ~1030)
   - [ ] Agregar `.toUpperCase()` en onChange
   - [ ] Agregar clase `uppercase` al className
   - [ ] Buscar campo Stock Number (si existe)
   - [ ] Aplicar mismo patrón

2. **ServiceOrderModal.tsx**
   - [ ] Identificar campos VIN y Stock Number
   - [ ] Aplicar patrón uppercase
   - [ ] Probar funcionalidad

3. **ReconOrderModal.tsx**
   - [ ] Identificar campos VIN, Stock Number, TAG
   - [ ] Aplicar patrón uppercase
   - [ ] Probar funcionalidad

### Fase 2: Modales de Detalles (Importante) 📄
**Tiempo estimado: 20 minutos**

4. **UnifiedOrderDetailModal.tsx**
   - [ ] Verificar si tiene campos editables
   - [ ] Si tiene, aplicar uppercase
   - [ ] Si no, marcar como N/A

5. **OrderDetailModal.tsx**
   - [ ] Verificar si tiene campos editables
   - [ ] Si tiene, aplicar uppercase
   - [ ] Si no, marcar como N/A

### Fase 3: Componentes de Stock (Complementario) 📦
**Tiempo estimado: 15 minutos**

6. **StockInventoryTable.tsx**
   - [ ] Verificar filtros de búsqueda
   - [ ] Aplicar uppercase si hay inputs editables

7. **StockCSVUploader.tsx**
   - [ ] Revisar proceso de importación
   - [ ] Agregar transformación uppercase antes de guardar

### Fase 4: Verificación Global 🧪
**Tiempo estimado: 15 minutos**

- [ ] Probar creación de orden en Sales
- [ ] Probar creación de orden en Service
- [ ] Probar creación de orden en Recon
- [ ] Probar creación de orden en Car Wash (ya funciona)
- [ ] Verificar que datos se guarden en uppercase en la BD
- [ ] Verificar que los filtros de búsqueda funcionen correctamente

## 🛠️ Comandos de Implementación

### 1. Búsqueda de campos a modificar:
```bash
# Buscar todos los VIN inputs
grep -rn "vehicleVin.*onChange" src/components/orders/*.tsx

# Buscar todos los Stock inputs
grep -rn "stockNumber.*onChange" src/components/orders/*.tsx

# Buscar todos los TAG inputs
grep -rn "tag.*onChange" src/components/orders/*.tsx
```

### 2. Verificar cambios aplicados:
```bash
# Contar cuántos ya tienen toUpperCase
grep -r "toUpperCase()" src/components/orders/*.tsx | wc -l

# Ver archivos que ya lo implementan
grep -l "toUpperCase()" src/components/orders/*.tsx
```

## ✅ Criterios de Éxito

1. ✅ Todos los inputs de VIN convierten automáticamente a uppercase
2. ✅ Todos los inputs de Stock Number convierten a uppercase
3. ✅ Todos los inputs de TAG convierten a uppercase
4. ✅ La clase CSS `uppercase` está presente en todos estos campos
5. ✅ La búsqueda/filtrado funciona correctamente
6. ✅ Los datos se guardan en uppercase en la base de datos

## 🚨 Consideraciones Importantes

### Beneficios del Patrón Actual:
- **Doble protección**: `.toUpperCase()` en onChange + clase CSS `uppercase`
- **Consistencia visual**: El usuario ve el texto en mayúsculas mientras escribe
- **Datos limpios**: Se guarda en uppercase en la base de datos
- **Búsquedas eficientes**: Evita problemas de case-sensitivity

### Precauciones:
- ⚠️ NO aplicar uppercase a campos de email o nombres de clientes
- ⚠️ Verificar que no rompa la funcionalidad de VIN scanning
- ⚠️ Probar que los cambios no afecten el rendimiento del HMR

## 📊 Progreso

- [x] Fase 0: Análisis y documentación
- [ ] Fase 1: Modales de Órdenes (0/3)
- [ ] Fase 2: Modales de Detalles (0/2)
- [ ] Fase 3: Componentes de Stock (0/2)
- [ ] Fase 4: Verificación Global (0/6)

**Total**: 0/13 tareas completadas

---

**Última actualización**: 2025-10-28
**Creado por**: Claude Code
**Tiempo estimado total**: ~1.5 horas
