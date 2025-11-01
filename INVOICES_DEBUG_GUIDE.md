# 🔍 Guía de Debug - Sistema de Invoices

**Fecha:** 31 de Octubre, 2024

---

## 🐛 Problemas Corregidos

### Problema 1: No se veían órdenes de Sales ni Service

**Causa:**
- El query filtraba por `completed_at` que no existe en órdenes de Sales y Service
- Estas órdenes usan `updated_at` como fecha de completado

**Solución:**
```typescript
// ANTES (❌)
.gte('completed_at', startDate)
.order('completed_at', { ascending: false })

// DESPUÉS (✅)
.gte('updated_at', startDate)
.order('updated_at', { ascending: false })
```

**Cambios aplicados en:**
- `src/pages/Invoices.tsx`
- `src/components/reports/invoices/CreateInvoiceDialog.tsx`

---

### Problema 2: No cargaban servicios en los dropdowns

**Causa:**
- Query correcto (`dealer_services`) pero sin indicadores visuales
- No se mostraban errores ni estados de carga

**Solución:**
```typescript
// Agregar logs de debug
console.log('🔍 Fetching services for dealer:', dealerId);
console.log('✅ Services loaded:', data?.length || 0);

// Agregar indicadores visuales
{loadingServices && <p>Loading services...</p>}
{!loadingServices && availableServices.length === 0 && (
  <p className="text-amber-600">⚠️ No services configured</p>
)}
{!loadingServices && availableServices.length > 0 && (
  <p className="text-emerald-600">✓ {availableServices.length} services</p>
)}
```

---

## 🔍 Cómo Debuggear

### 1. Abrir DevTools Console
```
F12 → Console Tab
```

### 2. Buscar logs de debug:

#### Al cargar servicios:
```
🔍 Fetching services for dealer: 1
✅ Services loaded: 5 [{...}, {...}]
```

#### Al cargar vehículos:
```
🔍 Fetching vehicles for dealer: 1 orderType: all
✅ Orders loaded: 25 orders
📊 Order types: ['sales', 'service', 'recon']
📝 Sample order: { id: '...', order_type: 'sales', ... }
```

### 3. Si no hay servicios:
```
⚠️ Services query result: []
```
**Acción:** Ir a Settings → Services y crear servicios para el dealer

### 4. Si no hay vehículos:
```
✅ Orders loaded: 0 orders
```
**Posibles causas:**
- No hay órdenes con `status = 'completed'`
- Las fechas de filtro no incluyen las órdenes
- El dealer no tiene órdenes

---

## 📊 Estructura de Datos

### Servicios (dealer_services)
```sql
SELECT id, name, description, price, dealer_id, is_active
FROM dealer_services
WHERE dealer_id = ? AND is_active = true
ORDER BY name;
```

### Vehículos Completados (orders)
```sql
SELECT
  id, order_number, custom_order_number, order_type,
  customer_name, stock_number,
  vehicle_make, vehicle_model, vehicle_year, vehicle_vin,
  total_amount, services, status,
  created_at, completed_at, updated_at
FROM orders
WHERE dealer_id = ?
  AND status = 'completed'
  AND updated_at >= ?
  AND updated_at <= ?
ORDER BY updated_at DESC
LIMIT 500;
```

---

## 🎯 Casos de Uso

### Caso 1: Dealer nuevo sin servicios
**Síntoma:** Dropdowns de servicios vacíos
**Solución:**
1. Ir a Settings → Services
2. Crear servicios (ej: "Used Photos", "Detail", etc.)
3. Refrescar página de Invoices

### Caso 2: No aparecen órdenes de Sales
**Síntoma:** Tabla vacía al filtrar por Sales
**Debug:**
```javascript
// En console:
SELECT * FROM orders
WHERE dealer_id = 1
  AND order_type = 'sales'
  AND status = 'completed';
```
**Posibles causas:**
- Órdenes no están marcadas como `completed`
- Filtro de fechas no las incluye

### Caso 3: Servicios no filtran correctamente
**Síntoma:** Al seleccionar servicio, no filtra vehículos
**Debug:**
```javascript
// Verificar campo 'services' en orden:
console.log(vehicle.services);
// Debe ser: [{id: "...", name: "..."}, ...]
```

---

## 🔧 Queries Útiles para Supabase SQL Editor

### Verificar servicios del dealer:
```sql
SELECT id, name, dealer_id, is_active
FROM dealer_services
WHERE dealer_id = 1
ORDER BY name;
```

### Verificar órdenes completadas:
```sql
SELECT
  id, order_type, customer_name, status,
  completed_at, updated_at,
  jsonb_array_length(services) as service_count
FROM orders
WHERE dealer_id = 1
  AND status = 'completed'
ORDER BY updated_at DESC
LIMIT 10;
```

### Verificar qué órdenes tienen completed_at NULL:
```sql
SELECT
  order_type,
  COUNT(*) as total,
  COUNT(completed_at) as with_completed_at,
  COUNT(*) - COUNT(completed_at) as without_completed_at
FROM orders
WHERE dealer_id = 1 AND status = 'completed'
GROUP BY order_type;
```

---

## ✅ Checklist de Verificación

### Antes de crear invoice:
- [ ] Dealer tiene servicios configurados
- [ ] Hay órdenes completadas en el rango de fechas
- [ ] Los servicios cargan en los dropdowns
- [ ] La tabla muestra vehículos

### Si la tabla está vacía:
- [ ] Verificar filtro de departamento
- [ ] Ampliar rango de fechas
- [ ] Verificar que hay órdenes con `status = 'completed'`
- [ ] Revisar console logs

### Si los servicios no cargan:
- [ ] Verificar dealer_id correcto
- [ ] Ir a Settings → Services y crear servicios
- [ ] Verificar que `is_active = true`
- [ ] Revisar console logs

---

## 🚨 Errores Comunes

### Error: "No services configured for this dealer"
**Causa:** El dealer no tiene servicios en `dealer_services`
**Solución:** Ir a Settings → Services y crear servicios

### Error: "No vehicles found"
**Causa 1:** No hay órdenes completadas
**Solución:** Completar algunas órdenes primero

**Causa 2:** Filtro de fechas muy restrictivo
**Solución:** Ampliar rango de fechas

### Error: Console muestra "Services loaded: 0"
**Causa:** Query correcto pero tabla vacía
**Solución:** Poblar tabla dealer_services

---

## 📝 Notas Técnicas

### Por qué usar updated_at en lugar de completed_at:
- **Sales orders:** No tienen `completed_at`, usan `updated_at`
- **Service orders:** No tienen `completed_at`, usan `updated_at`
- **Recon orders:** SÍ tienen `completed_at`
- **Car Wash orders:** SÍ tienen `completed_at`

**Solución universal:** Usar `updated_at` para todos los tipos

### Estructura del campo services:
```typescript
// En la base de datos (JSONB):
services: [
  { id: "uuid", name: "Detail", price: 50 },
  { id: "uuid", name: "Photos", price: 10 }
]

// En el filtro:
const serviceId = service.id || service.type || service;
```

---

## 🎉 Confirmación de Fix

Si ves esto en la console, todo funciona:
```
✅ Services loaded: 5
✅ Orders loaded: 25 orders
📊 Order types: ['sales', 'service', 'recon', 'carwash']
```

Y en la UI:
```
✓ 5 services available
Available Vehicles (25 of 50)
```

---

**Fix completado el 31 de Octubre, 2024** 🚀
