# VehicleDetailPanel - Estado Actual Documentado

## 📋 Comportamiento Actual (Pre-Cambios)

### Estructura del Componente

#### 1. **Header Section (Lines 177-311)**
```tsx
<div className="border-b bg-gradient-to-br from-card/50 to-muted/30 relative">
```

**Estado Actual:**
- Background: Gradiente complejo `from-card/50 to-muted/30`
- Padding: `p-4 pr-20` (80px derecha para botones)
- Layout: 2 filas (Vehicle Info + Metrics)

**Vehicle Info Display:**
```
2020 TOYOTA Corolla (LE)
Stock: ABC123 • VIN: 1234567890
```
- NO incluye badges de media/notas
- NO muestra last 8 VIN digits

**Metrics Row (4 metrics + 1 badge):**
1. ⏰ T2L - Time to Line (azul)
2. 🔧 Work Items (morado)
3. ⏱️ Step Time (ámbar)
4. 📛 Step Badge (color dinámico)

**NO incluye:** Métrica de costo total

#### 2. **Action Buttons (Lines 179-225)**

**Ubicación:** Top-right, absoluto
- More Actions (dropdown) - 8x8
- Close (X) - 8x8

**Acciones en Dropdown:**
1. 🖨️ Print Report - **FUNCIONA** (window.print)
2. 📄 Export PDF - Toast "Coming Soon"
3. 📊 Export Excel - Toast "Coming Soon"
4. ✏️ Edit Vehicle - Toast "Coming Soon"

**Estado:** Todas visibles y clickeables (engañosas)

#### 3. **Tabs System (Lines 316-371)**

**Grid:** `grid-cols-6` (6 tabs)

**Tabs Actuales:**
1. 🔧 Work Items
2. 🖼️ Media
3. 💬 Notes
4. 👥 Vendors
5. ⏰ Timeline
6. 💵 **Appraisal** (placeholder, no implementado)

**Mobile Behavior:**
- Labels: `hidden sm:inline` (solo íconos en móvil)
- Badges: Siempre visibles si count > 0

**Tab Content:**
- ✅ Work Items: VehicleWorkItemsTab (funciona)
- ✅ Media: VehicleMediaTab (funciona)
- ✅ Notes: VehicleNotesTab (funciona)
- ✅ Vendors: VehicleVendorsTab (funciona)
- ✅ Timeline: VehicleActivityLog (funciona)
- ❌ Appraisal: Solo muestra "Coming Soon"

#### 4. **Counts Calculation (Lines 66-77)**

```tsx
const counts = React.useMemo(() => {
  const workItemsWithVendors = workItems.filter(wi => wi.assigned_vendor_id);

  return {
    workItems: workItems.length,
    media: mediaFiles.length,
    notes: notes.length,
    vendors: workItemsWithVendors.length,
    timeline: activityCount,
    appraisal: 0  // Siempre 0
  };
}, [workItems, mediaFiles, notes, activityCount]);
```

**NO calcula:** Total cost de work items

#### 5. **Loading & Error States**

**Loading (Lines 132-146):**
- Skeleton con animación pulse
- 3 bloques de carga

**Error (Lines 148-167):**
- Ícono AlertTriangle
- Mensaje de error
- Botón "Close"

**No Selection (Lines 114-130):**
- Ícono Circle
- Mensaje "Select a vehicle"

### Responsive Behavior

**Mobile (<640px):**
- Vehicle info: `text-base`, stock/VIN compactos
- Metrics: `grid-cols-3` (3 columnas)
- Tab labels: Solo íconos (labels ocultos)
- Badges: Posición normal (no absoluta)

**Tablet (640px - 1024px):**
- Vehicle info: `text-lg`
- Metrics: `grid-cols-4`
- Tab labels: Visibles
- Step badge: `col-span-1`

**Desktop (>1024px):**
- Metrics: `lg:flex lg:flex-wrap`
- Todo visible
- Layout completo

### Dark Mode Support

**Clases actuales:**
- `dark:bg-blue-950/30` (métricas)
- `dark:border-blue-800` (bordes)
- `dark:text-blue-100` (texto)

**Consistente en:** Todas las métricas y badges

### Accessibility

**ARIA Labels:**
- ✅ Action buttons: `aria-label`
- ✅ Close button: `aria-label`
- ❌ Tabs: Sin ARIA
- ❌ Metrics: Sin ARIA

**Keyboard Navigation:**
- ❌ No shortcuts
- ❌ No Escape key handler
- ✅ Tab order natural (HTML)

### Dependencies

**Hooks Used:**
```tsx
useTranslation()          // i18n
useToast()               // Toast notifications
useGetReadyStore()       // Global state
useVehicleDetail()       // Vehicle data
useWorkItems()           // Work items
useVehicleMedia()        // Media files
useVehicleNotes()        // Notes
useVehicleActivityLog()  // Activity log
useVehicleTimeToLine()   // T2L metric
useCurrentStepVisit()    // Step time
```

**Child Components:**
- VehicleWorkItemsTab
- VehicleMediaTab
- VehicleNotesTab
- VehicleVendorsTab
- VehicleActivityLog

### Known Issues (From Review)

1. ❌ Appraisal tab no implementado (ocupa espacio)
2. ❌ Acciones "Coming Soon" engañosas
3. ❌ No muestra badges media/notas en header
4. ❌ No calcula costo total
5. ❌ Gradiente puede verse mal en algunos temas
6. ❌ Tabs muy apretados en móvil
7. ❌ No keyboard shortcuts

## ✅ Qué FUNCIONA (No tocar)

1. ✅ Loading states y skeletons
2. ✅ Error handling
3. ✅ Close button
4. ✅ Print button (window.print)
5. ✅ Todas las tabs (excepto Appraisal)
6. ✅ Counts calculation (excepto cost)
7. ✅ Time tracking (T2L, Step Time)
8. ✅ Responsive grid layout
9. ✅ Dark mode support
10. ✅ Animations (slide-in, fade-in)

## 🔄 Qué CAMBIAR (Según TODO)

### HIGH PRIORITY:

1. **Agregar Media/Notes Badges al Header**
   - Líneas 238-242 (después de VIN)
   - Formato: `📷 3  📄 2`
   - Condicional: Solo si count > 0

2. **Agregar Métrica de Costo Total**
   - Después línea 293
   - Color: Verde (`bg-green-50`)
   - Calcular: `workItems.reduce(sum, item.estimated_cost)`

3. **Eliminar Tab de Appraisal**
   - Líneas 362-370 (TabsTrigger)
   - Líneas 398-403 (TabsContent)
   - Cambiar `grid-cols-6` → `grid-cols-5`

4. **Mejorar Tabs Mobile**
   - Labels más legibles en móvil
   - Badges posicionamiento relativo/absoluto
   - Vertical stack icon + label

### MEDIUM PRIORITY:

5. **Simplificar Header Background**
   - Línea 177
   - De: `bg-gradient-to-br from-card/50 to-muted/30`
   - A: `bg-muted/30 dark:bg-muted/20`

6. **Deshabilitar Acciones No Implementadas**
   - Líneas 199-211
   - Agregar `disabled` prop
   - Agregar badge "Soon"

7. **Keyboard Shortcuts**
   - useEffect con event listeners
   - Esc: Close
   - Ctrl+1-5: Switch tabs

## 📝 Testing Checklist (Post-Cambios)

- [ ] Abrir detail panel con vehículo
- [ ] Verificar badges media/notas aparecen
- [ ] Verificar métrica de costo se calcula
- [ ] Verificar 5 tabs (no 6)
- [ ] Click en cada tab → verifica funciona
- [ ] Resize a mobile → verifica responsive
- [ ] Toggle dark mode → verifica colores
- [ ] Press Esc → verifica cierra
- [ ] Press Ctrl+1 → verifica cambia tab
- [ ] Acciones disabled muestran "Soon"
- [ ] Print sigue funcionando

## 🚨 PRECAUCIONES

1. **NO modificar:**
   - Loading/Error states
   - Tab content components
   - Hooks calls
   - Vehicle data structure

2. **CUIDADO con:**
   - Grid responsiveness (testing required)
   - Dark mode colors (mantener consistencia)
   - Badge positioning (mobile vs desktop)
   - TypeScript types (especialmente counts)

3. **VALIDAR después:**
   - Todos los tabs funcionan
   - Responsive en 3 breakpoints
   - Dark mode se ve bien
   - No errores en consola
   - Performance (no lag)

## Backup Location

✅ **Archivo guardado:** `src/components/get-ready/VehicleDetailPanel.BACKUP.tsx`

**Para restaurar:**
```bash
cp src/components/get-ready/VehicleDetailPanel.BACKUP.tsx src/components/get-ready/VehicleDetailPanel.tsx
```

---

**Documentado:** 2025-10-25
**Estado:** PRE-CAMBIOS
**Próximo paso:** Implementar HIGH PRIORITY #1 (Media/Notes Badges)
