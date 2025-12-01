# 🚧 Refactor Invoice Details Modal - Documentación de Continuidad

**Fecha Inicio**: 2025-12-01
**Estado**: Parcialmente completado - Base lista, pendiente refactor principal
**Prioridad**: Alta
**Complejidad**: Alta

---

## 📋 Contexto del Proyecto

### Problema Original
El modal de detalles de invoice (`InvoiceDetailsDialog.tsx`) tiene un problema de UX cuando hay muchos orders (ej: 433 orders):
- **Scroll vertical enorme** (~8,660px solo para la tabla de vehículos)
- Secciones importantes (emails, comments) enterradas al final
- Sin navegación rápida entre secciones
- Performance degradada con 400+ rows sin virtualización

### Solución Aprobada
**Opción 1: Tabs completas** con features adicionales:
- Tabs: Overview, Orders, Payments, History, Email Log, Comments
- Paginación en Orders tab (50/100/200 per page)
- Search por VIN, Order #, Vehicle
- Filter by Status (All/Paid/Unpaid)

---

## ✅ Trabajo Completado (Fase 1)

### 1. Hook de Paginación y Filtrado
**Archivo**: `src/hooks/useInvoiceOrdersPagination.ts` ✅ CREADO

**Funcionalidad**:
```typescript
const {
  paginatedItems,      // Items para la página actual
  totalPages,          // Total de páginas
  totalFiltered,       // Total de items después de filtros
  totalItems,          // Total de items original
  startIndex,          // Índice inicial (para "Showing 1-50")
  endIndex,            // Índice final
} = useInvoiceOrdersPagination(
  items,               // Array completo de invoice items
  searchTerm,          // String de búsqueda
  statusFilter,        // 'all' | 'paid' | 'unpaid'
  pageSize,            // 50 | 100 | 200
  currentPage          // Número de página actual
);
```

**Features**:
- ✅ Filtrado por search term (VIN, order number, vehicle make/model/year, PO, RO, tag)
- ✅ Filtrado por status (paid/unpaid basado en `is_paid` flag)
- ✅ Cálculo automático de paginación
- ✅ Reset automático a página 1 cuando cambian filtros
- ✅ TypeScript types completos
- ✅ Memoización con useMemo para performance

**Notas Importantes**:
- El hook asume que los items tienen una propiedad `is_paid` (boolean)
- Si un item no tiene `is_paid === true`, se considera unpaid
- El searchTerm busca en múltiples campos concatenados (case-insensitive)

### 2. Componente Smart Pagination
**Archivo**: `src/components/ui/smart-pagination.tsx` ✅ CREADO

**Funcionalidad**:
```typescript
<SmartPagination
  currentPage={1}
  totalPages={9}
  onPageChange={(page) => setCurrentPage(page)}
  disabled={false}
/>
```

**Features**:
- ✅ Lógica de ellipsis inteligente: `< 1 ... 5 6 7 ... 20 >`
- ✅ Usa primitivos de shadcn/ui (Pagination components)
- ✅ Previous/Next buttons con estados disabled
- ✅ Active state en página actual
- ✅ Click handlers con preventDefault
- ✅ Prop `disabled` para deshabilitar toda la paginación

**Lógica de Ellipsis**:
- Muestra siempre primera y última página
- Muestra 1 página a cada lado de la actual (delta = 1)
- Agrega `...` cuando hay gaps > 1

**Ejemplo visual**:
```
Página 1:   < [1] 2 3 ... 20 >
Página 5:   < 1 ... 4 [5] 6 ... 20 >
Página 20:  < 1 ... 18 19 [20] >
```

---

## ⚠️ Trabajo Pendiente (Fase 2) - CRÍTICO

### Archivo a Refactorizar
**`src/components/reports/invoices/InvoiceDetailsDialog.tsx`**
- **Líneas**: 1,340 (archivo grande y complejo)
- **Estado**: SIN MODIFICAR (original intacto)
- **Acción**: Refactor completo a estructura de tabs

### Estructura Actual del Archivo

#### Imports y Setup (Líneas 1-100)
```typescript
// Imports de UI components
import { Dialog, DialogContent, ... } from '@/components/ui/dialog';
import { Button, Badge, Checkbox, Table, ... } from '@/components/ui/*';

// Imports de hooks
import { useInvoice, useDeleteInvoice, useUpdateInvoiceItemPaid, ... } from '@/hooks/useInvoices';
import { useRecalculateInvoice } from '@/hooks/useRecalculateInvoice';

// Imports de utils y types
import { generateInvoicePDF, generateInvoiceExcel } from '@/utils/...';
import type { InvoiceStatus } from '@/types/invoices';

// Imports de subcomponents
import { InvoiceComments } from './InvoiceComments';
import { InvoiceEmailLog } from './InvoiceEmailLog';
import { ReinvoiceButton } from './ReinvoiceButton';
import { ReinvoiceHistoryTimeline } from './ReinvoiceHistoryTimeline';
import { SendInvoiceEmailDialog } from './email/SendInvoiceEmailDialog';
```

#### Component Props (Líneas 58-62)
```typescript
interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
}
```

#### Estado del Componente (Líneas 87-100+)
```typescript
// Fetching data
const { data: invoice, isLoading } = useInvoice(invoiceId);
const { data: hierarchy } = useInvoiceHierarchy(invoiceId);

// Mutations
const deleteMutation = useDeleteInvoice();
const deletePaymentMutation = useDeletePayment();
const recalculateMutation = useRecalculateInvoice();
const updateItemPaidMutation = useUpdateInvoiceItemPaid();
const bulkUpdateItemsPaidMutation = useBulkUpdateInvoiceItemsPaid();

// UI State
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
const [showEmailDialog, setShowEmailDialog] = useState(false);
```

#### Secciones del Modal (Aproximadas)

**Header Section** (Líneas ~750-850):
- Título del invoice con número
- Status badge
- Vehicle count badge
- Action buttons: Reinvoice, Delete, Recalculate, Email, Print, Download, Close

**Bill To Section** (Líneas ~854-929):
- Dealership info (name, address, email, phone)
- Invoice dates (issue date, due date)
- Invoice number
- Service period (date range from metadata)
- Department badges

**Vehicle List Section** (Líneas ~931-1078):
- ⚠️ **PROBLEMA PRINCIPAL**: Tabla completa sin paginación
- Columnas: Checkbox, Date, Order, PO|RO|Tag, Vehicle, VIN, Services, Amount
- Date separators entre días diferentes
- Checkboxes individuales para marcar paid/unpaid
- Handler: `handleItemPaidToggle(itemId, isPaid)`
- Bulk checkbox: "Mark all as paid/unpaid"

**Totals Section** (Líneas ~1080-1120):
- Subtotal calculation
- Tax (rate y amount)
- Discount
- Total amount
- Amount paid (verde)
- Amount due (destacado)

**Notes & Terms Section** (Líneas ~1122-1142):
- Invoice notes (textarea colapsable)
- Terms and conditions (textarea colapsable)

**Payment History Section** (Líneas ~1144-1180):
- Table de payments
- Columns: Date, Method, Reference, Amount, Actions (Delete)
- Delete confirmation dialog
- Total paid summary

**Re-Invoice History** (Líneas ~1182-1194):
- `<ReinvoiceHistoryTimeline>` component
- Muestra secuencia de re-invoices
- Clickable cards para abrir nested invoice modals

**Email History Section** (Líneas ~1196-1199):
- `<InvoiceEmailLog invoiceId={invoice.id} />`
- Max height: 400px con scroll interno

**Comments Section** (Líneas ~1201-1204):
- `<InvoiceComments invoiceId={invoice.id} dealershipId={invoice.dealerId} />`
- Max height: 500px con scroll interno

### Funciones Críticas a Preservar

#### 1. Toggle Individual Item Paid/Unpaid
```typescript
const handleItemPaidToggle = async (itemId: string, currentPaidStatus: boolean) => {
  try {
    await updateItemPaidMutation.mutateAsync({
      itemId,
      isPaid: !currentPaidStatus,
    });
    toast.success(t('Invoice item updated'));
  } catch (error) {
    toast.error(t('Failed to update item'));
  }
};
```

#### 2. Bulk Toggle All Items
```typescript
const handleBulkToggle = async (allPaid: boolean) => {
  try {
    const itemIds = invoice.items.map(item => item.id);
    await bulkUpdateItemsPaidMutation.mutateAsync({
      invoiceId: invoice.id,
      itemIds,
      isPaid: !allPaid,
    });
    toast.success(t('All items updated'));
  } catch (error) {
    toast.error(t('Failed to bulk update'));
  }
};
```

#### 3. Delete Invoice
```typescript
const handleDelete = async () => {
  try {
    await deleteMutation.mutateAsync(invoice.id);
    onOpenChange(false);
    toast.success(t('Invoice deleted'));
  } catch (error) {
    toast.error(t('Failed to delete invoice'));
  }
};
```

#### 4. Delete Payment
```typescript
const handleDeletePayment = async (paymentId: string) => {
  try {
    await deletePaymentMutation.mutateAsync(paymentId);
    toast.success(t('Payment deleted'));
  } catch (error) {
    toast.error(t('Failed to delete payment'));
  }
};
```

#### 5. Recalculate Invoice
```typescript
const handleRecalculate = async () => {
  try {
    await recalculateMutation.mutateAsync(invoice.id);
    toast.success(t('Invoice recalculated'));
  } catch (error) {
    toast.error(t('Failed to recalculate'));
  }
};
```

#### 6. Print Invoice
```typescript
const handlePrint = () => {
  window.print();
};
```

#### 7. Download PDF
```typescript
const handleDownloadPDF = async () => {
  try {
    const blob = await generateInvoicePDF(invoice);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(t('Failed to generate PDF'));
  }
};
```

#### 8. Download Excel
```typescript
const handleDownloadExcel = async () => {
  try {
    const blob = await generateInvoiceExcel(invoice);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.invoiceNumber}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(t('Failed to generate Excel'));
  }
};
```

#### 9. Open Email Dialog
```typescript
const handleSendEmail = () => {
  setShowEmailDialog(true);
};
```

---

## 🎯 Plan de Implementación Detallado

### Paso 1: Backup y Setup
```bash
# Crear backup del archivo original
cp src/components/reports/invoices/InvoiceDetailsDialog.tsx src/components/reports/invoices/InvoiceDetailsDialog.backup.tsx

# Verificar que el archivo de backup existe
ls -la src/components/reports/invoices/InvoiceDetailsDialog.backup.tsx
```

### Paso 2: Agregar Imports Necesarios
En el archivo `InvoiceDetailsDialog.tsx`, agregar después de los imports existentes:

```typescript
// NUEVOS IMPORTS PARA TABS Y PAGINACIÓN
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SmartPagination } from '@/components/ui/smart-pagination';
import { useInvoiceOrdersPagination } from '@/hooks/useInvoiceOrdersPagination';
import { Search } from 'lucide-react';
```

### Paso 3: Agregar Estado para Tabs y Paginación
Después del estado existente, agregar:

```typescript
// NUEVO ESTADO PARA TABS Y PAGINACIÓN
const [activeTab, setActiveTab] = useState<string>('overview');
const [currentPage, setCurrentPage] = useState(1);
const [pageSize, setPageSize] = useState(50);
const [searchTerm, setSearchTerm] = useState('');
const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

// Hook de paginación
const {
  paginatedItems,
  totalPages,
  totalFiltered,
  totalItems,
  startIndex,
  endIndex,
} = useInvoiceOrdersPagination(
  invoice?.items || [],
  searchTerm,
  statusFilter,
  pageSize,
  currentPage
);
```

### Paso 4: Refactorizar Return del Componente

#### Estructura Nueva del DialogContent

```tsx
<DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
  {/* Header - SE MANTIENE IGUAL */}
  <DialogHeader className="flex-shrink-0">
    <div className="flex items-start justify-between">
      <div>
        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
          Invoice #{invoice?.invoiceNumber}
          {getStatusBadge(invoice?.status || 'draft')}
          <Badge variant="secondary">
            {invoice?.items?.length || 0} vehicles
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Issued {formatDate(invoice?.issueDate)} • Due {formatDate(invoice?.dueDate)}
        </DialogDescription>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <ReinvoiceButton invoice={invoice} />
        <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>
          <Trash2 className="h-4 w-4" />
        </Button>
        {/* ... otros botones ... */}
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </DialogHeader>

  {/* TABS - NUEVA ESTRUCTURA */}
  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
    <TabsList className="grid grid-cols-6 flex-shrink-0">
      <TabsTrigger value="overview">
        {t('reports.invoices.details.tabs.overview')}
      </TabsTrigger>
      <TabsTrigger value="orders">
        {t('reports.invoices.details.tabs.orders')}
        <Badge variant="secondary" className="ml-2">{invoice?.items?.length || 0}</Badge>
      </TabsTrigger>
      <TabsTrigger value="payments">
        {t('reports.invoices.details.tabs.payments')}
        <Badge variant="secondary" className="ml-2">{invoice?.payments?.length || 0}</Badge>
      </TabsTrigger>
      <TabsTrigger value="history">
        {t('reports.invoices.details.tabs.history')}
      </TabsTrigger>
      <TabsTrigger value="emails">
        {t('reports.invoices.details.tabs.emails')}
      </TabsTrigger>
      <TabsTrigger value="comments">
        {t('reports.invoices.details.tabs.comments')}
      </TabsTrigger>
    </TabsList>

    {/* TAB CONTENTS - Ver Pasos 5-10 */}
  </Tabs>
</DialogContent>
```

### Paso 5: Tab Content - Overview

```tsx
<TabsContent value="overview" className="flex-1 overflow-y-auto p-6 space-y-6">
  {/* Bill To Section */}
  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <h3 className="font-semibold text-lg mb-3">Bill To</h3>
      <div className="space-y-2">
        <p className="font-medium">{invoice?.dealership?.name}</p>
        <p className="text-sm text-muted-foreground">{invoice?.dealership?.address}</p>
        <p className="text-sm text-muted-foreground">{invoice?.dealership?.email}</p>
        <p className="text-sm text-muted-foreground">{invoice?.dealership?.phone}</p>
      </div>
    </div>

    <div>
      <h3 className="font-semibold text-lg mb-3">Invoice Details</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Invoice Number:</span>
          <span className="font-mono">{invoice?.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Issue Date:</span>
          <span>{formatDate(invoice?.issueDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Due Date:</span>
          <span>{formatDate(invoice?.dueDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-muted-foreground">Service Period:</span>
          <span>{getDateRangeText(invoice?.metadata)}</span>
        </div>
      </div>
    </div>
  </div>

  {/* Totals Section */}
  <div className="border-t pt-6">
    <h3 className="font-semibold text-lg mb-4">Summary</h3>
    <div className="space-y-2 max-w-md ml-auto">
      <div className="flex justify-between">
        <span>Subtotal:</span>
        <span>{formatCurrency(invoice?.subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax ({invoice?.taxRate}%):</span>
        <span>{formatCurrency(invoice?.taxAmount)}</span>
      </div>
      {invoice?.discountAmount > 0 && (
        <div className="flex justify-between text-red-600">
          <span>Discount:</span>
          <span>-{formatCurrency(invoice?.discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between font-bold text-lg border-t pt-2">
        <span>Total:</span>
        <span>{formatCurrency(invoice?.totalAmount)}</span>
      </div>
      <div className="flex justify-between text-emerald-600">
        <span>Paid:</span>
        <span>{formatCurrency(invoice?.amountPaid)}</span>
      </div>
      <div className="flex justify-between font-bold text-lg text-amber-600 border-t pt-2">
        <span>Amount Due:</span>
        <span>{formatCurrency(invoice?.amountDue)}</span>
      </div>
    </div>
  </div>

  {/* Notes & Terms */}
  <div className="border-t pt-6 space-y-4">
    {invoice?.invoiceNotes && (
      <div>
        <h3 className="font-semibold mb-2">Notes</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {invoice.invoiceNotes}
        </p>
      </div>
    )}
    {invoice?.termsAndConditions && (
      <div>
        <h3 className="font-semibold mb-2">Terms & Conditions</h3>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
          {invoice.termsAndConditions}
        </p>
      </div>
    )}
  </div>
</TabsContent>
```

### Paso 6: Tab Content - Orders (CON SEARCH, FILTER, PAGINATION)

```tsx
<TabsContent value="orders" className="flex-1 overflow-hidden flex flex-col">
  {/* Controls - Flex-shrink-0 para que no se comprima */}
  <div className="flex-shrink-0 p-4 border-b bg-gray-50/50 space-y-3">
    {/* Row 1: Search + Filter Status + Page Size */}
    <div className="flex gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('reports.invoices.details.orders_tab.search_placeholder')}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1); // Reset to page 1 on search
          }}
          className="pl-10"
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value: 'all' | 'paid' | 'unpaid') => {
          setStatusFilter(value);
          setCurrentPage(1); // Reset to page 1 on filter
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            {t('reports.invoices.details.orders_tab.filter_all')}
          </SelectItem>
          <SelectItem value="paid">
            {t('reports.invoices.details.orders_tab.filter_paid')}
          </SelectItem>
          <SelectItem value="unpaid">
            {t('reports.invoices.details.orders_tab.filter_unpaid')}
          </SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={pageSize.toString()}
        onValueChange={(value) => {
          setPageSize(Number(value));
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="50">50 {t('reports.invoices.details.orders_tab.per_page')}</SelectItem>
          <SelectItem value="100">100 {t('reports.invoices.details.orders_tab.per_page')}</SelectItem>
          <SelectItem value="200">200 {t('reports.invoices.details.orders_tab.per_page')}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    {/* Row 2: Results Counter */}
    <div className="text-sm text-muted-foreground">
      {t('reports.invoices.details.orders_tab.showing', {
        start: startIndex + 1,
        end: Math.min(endIndex, totalFiltered),
        total: totalFiltered,
      })}
      {totalFiltered !== totalItems && (
        <span className="ml-1">
          ({t('reports.invoices.details.orders_tab.filtered', { total: totalItems })})
        </span>
      )}
    </div>
  </div>

  {/* Table - Flex-1 para ocupar espacio restante con scroll */}
  <div className="flex-1 overflow-y-auto p-4">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px]">
            <Checkbox
              checked={paginatedItems.every(item => item.is_paid)}
              onCheckedChange={() => {
                const allPaid = paginatedItems.every(item => item.is_paid);
                handleBulkToggle(allPaid);
              }}
            />
          </TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>PO | RO | Tag</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>VIN</TableHead>
          <TableHead>Services</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedItems.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'No orders match your filters'
                : 'No orders in this invoice'
              }
            </TableCell>
          </TableRow>
        ) : (
          paginatedItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Checkbox
                  checked={item.is_paid || false}
                  onCheckedChange={() => handleItemPaidToggle(item.id, item.is_paid || false)}
                />
              </TableCell>
              <TableCell>{formatDate(item.completed_at || item.created_at)}</TableCell>
              <TableCell className="font-mono text-sm">
                {item.custom_order_number || item.order_number}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {[item.po, item.ro, item.tag].filter(Boolean).join(' | ') || '-'}
              </TableCell>
              <TableCell>
                {item.vehicle_year} {item.vehicle_make} {item.vehicle_model}
              </TableCell>
              <TableCell className="font-mono text-xs">{item.vehicle_vin}</TableCell>
              <TableCell className="text-sm">{getServiceNames(item.services)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(item.total_amount)}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </div>

  {/* Pagination - Flex-shrink-0 para que siempre sea visible */}
  {totalPages > 1 && (
    <div className="flex-shrink-0 p-4 border-t flex justify-center">
      <SmartPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  )}
</TabsContent>
```

### Paso 7: Tab Content - Payments

```tsx
<TabsContent value="payments" className="flex-1 overflow-y-auto p-6">
  {invoice?.payments && invoice.payments.length > 0 ? (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Method</TableHead>
          <TableHead>Reference</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="w-[100px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoice.payments.map((payment) => (
          <TableRow key={payment.id}>
            <TableCell>{formatDate(payment.payment_date)}</TableCell>
            <TableCell className="capitalize">{payment.payment_method}</TableCell>
            <TableCell className="font-mono text-sm">{payment.reference_number || '-'}</TableCell>
            <TableCell className="text-right font-medium text-emerald-600">
              {formatCurrency(payment.amount)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentToDelete(payment.id)}
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell colSpan={3} className="text-right font-semibold">
            Total Paid:
          </TableCell>
          <TableCell className="text-right font-bold text-emerald-600">
            {formatCurrency(invoice.amountPaid)}
          </TableCell>
          <TableCell />
        </TableRow>
      </TableBody>
    </Table>
  ) : (
    <div className="text-center py-12 text-muted-foreground">
      <p>No payments recorded for this invoice</p>
    </div>
  )}
</TabsContent>
```

### Paso 8: Tab Content - History

```tsx
<TabsContent value="history" className="flex-1 overflow-y-auto p-6">
  {hierarchy && hierarchy.length > 0 ? (
    <ReinvoiceHistoryTimeline hierarchy={hierarchy} />
  ) : (
    <div className="text-center py-12 text-muted-foreground">
      <p>No re-invoice history</p>
    </div>
  )}
</TabsContent>
```

### Paso 9: Tab Content - Email Log

```tsx
<TabsContent value="emails" className="flex-1 overflow-y-auto p-6">
  <InvoiceEmailLog invoiceId={invoice?.id || ''} />
</TabsContent>
```

### Paso 10: Tab Content - Comments

```tsx
<TabsContent value="comments" className="flex-1 overflow-y-auto p-6">
  <InvoiceComments
    invoiceId={invoice?.id || ''}
    dealershipId={invoice?.dealerId || 0}
  />
</TabsContent>
```

---

## 🌐 Traducciones a Agregar

### Archivo: `public/translations/en/reports.json`

Agregar dentro de `"invoices": { ... }`:

```json
"details": {
  "tabs": {
    "overview": "Overview",
    "orders": "Orders",
    "payments": "Payments",
    "history": "History",
    "emails": "Email Log",
    "comments": "Comments"
  },
  "orders_tab": {
    "search_placeholder": "Search by VIN, Order #, Vehicle...",
    "filter_all": "All Orders",
    "filter_paid": "Paid Only",
    "filter_unpaid": "Unpaid Only",
    "showing": "Showing {{start}}-{{end}} of {{total}} orders",
    "filtered": "filtered from {{total}} total",
    "per_page": "per page"
  }
}
```

### Archivo: `public/translations/es/reports.json`

```json
"details": {
  "tabs": {
    "overview": "Resumen",
    "orders": "Órdenes",
    "payments": "Pagos",
    "history": "Historial",
    "emails": "Emails",
    "comments": "Comentarios"
  },
  "orders_tab": {
    "search_placeholder": "Buscar por VIN, Orden, Vehículo...",
    "filter_all": "Todas las Órdenes",
    "filter_paid": "Solo Pagadas",
    "filter_unpaid": "Solo No Pagadas",
    "showing": "Mostrando {{start}}-{{end}} de {{total}} órdenes",
    "filtered": "filtradas de {{total}} totales",
    "per_page": "por página"
  }
}
```

### Archivo: `public/translations/pt-BR/reports.json`

```json
"details": {
  "tabs": {
    "overview": "Resumo",
    "orders": "Pedidos",
    "payments": "Pagamentos",
    "history": "Histórico",
    "emails": "Emails",
    "comments": "Comentários"
  },
  "orders_tab": {
    "search_placeholder": "Buscar por VIN, Pedido, Veículo...",
    "filter_all": "Todos os Pedidos",
    "filter_paid": "Apenas Pagos",
    "filter_unpaid": "Apenas Não Pagos",
    "showing": "Mostrando {{start}}-{{end}} de {{total}} pedidos",
    "filtered": "filtrados de {{total}} totais",
    "per_page": "por página"
  }
}
```

---

## ✅ Checklist de Validación Post-Refactor

### Funcionalidad Core
- [ ] Modal se abre correctamente
- [ ] Tabs navigation funciona (6 tabs)
- [ ] Badge counts en tabs son precisos
- [ ] Default tab es "overview"

### Tab Overview
- [ ] Bill To info se muestra correctamente
- [ ] Totals calculation es precisa
- [ ] Notes y Terms se muestran si existen

### Tab Orders
- [ ] Search filtra por VIN, Order #, Vehicle
- [ ] Filter by status funciona (All/Paid/Unpaid)
- [ ] Paginación muestra rangos correctos
- [ ] Pagination controls (prev/next/numbers) funcionan
- [ ] Checkboxes individuales marcan paid/unpaid
- [ ] Checkbox "Select All" funciona (solo página actual)
- [ ] Estado de is_paid se preserva entre páginas
- [ ] Tabla muestra columnas correctas
- [ ] Date separators funcionan (si aplica)

### Tab Payments
- [ ] Payment history se muestra correctamente
- [ ] Delete payment funciona
- [ ] Total paid es correcto

### Tab History
- [ ] Re-invoice timeline se muestra
- [ ] Clickable cards abren nested modals

### Tab Email Log
- [ ] InvoiceEmailLog component renderiza
- [ ] Email history se muestra correctamente

### Tab Comments
- [ ] InvoiceComments component renderiza
- [ ] Agregar/editar/eliminar comments funciona

### Action Buttons (Header)
- [ ] Reinvoice button funciona
- [ ] Delete invoice funciona (con confirmación)
- [ ] Recalculate invoice funciona (con confirmación)
- [ ] Send email abre el dialog correcto
- [ ] Print invoice funciona
- [ ] Download PDF funciona
- [ ] Download Excel funciona
- [ ] Close button cierra el modal

### Performance
- [ ] Con 400+ orders, no hay lag visible
- [ ] Pagination carga instantánea
- [ ] Search typing es responsive (no lag)
- [ ] Filter cambio es instantáneo

### Responsive & Mobile
- [ ] Tabs son legibles en móvil
- [ ] Tabla de orders hace scroll horizontal si es necesario
- [ ] Controls (search/filter) se adaptan a pantalla pequeña

### TypeScript
- [ ] No hay errores de TypeScript
- [ ] No hay warnings de tipos `any`

### Traducciones
- [ ] Inglés funciona correctamente
- [ ] Español funciona correctamente
- [ ] Portugués funciona correctamente

---

## ⚠️ Consideraciones Importantes

### 1. Estado de Checkboxes entre Páginas
El estado `is_paid` se guarda en la base de datos, NO en estado local. Esto significa:
- ✅ El estado persiste entre páginas automáticamente
- ✅ Cambios se reflejan inmediatamente en otros tabs
- ❌ No necesitas mantener un Set local de "checked items"

### 2. Bulk Checkbox Behavior
El checkbox "Select All" en el header de la tabla debe:
- Solo afectar items de la **página actual** (`paginatedItems`)
- NO afectar items en otras páginas
- Mostrar estado indeterminate si algunos (pero no todos) están marcados

### 3. Performance con 400+ Orders
- Pagination ya resuelve el problema de performance
- No necesitas virtual scrolling adicional
- Con 50 items por página, máximo renderizas 50 rows en DOM

### 4. Search Reset Behavior
Cuando el usuario escribe en search o cambia el filter:
- Automáticamente vuelve a página 1
- Muestra mensaje si no hay resultados
- El hook `useInvoiceOrdersPagination` ya maneja este reset

### 5. Mantener Funcionalidad Existente
**NO remuevas código**, solo refactoriza la estructura:
- Email dialog debe seguir funcionando
- Delete confirmations deben seguir apareciendo
- Recalculate confirmation debe seguir funcionando
- Print/Download/Export deben seguir funcionando

### 6. Nested Invoice Modals
El componente `ReinvoiceHistoryTimeline` puede abrir nested modals.
Asegúrate de que el z-index está correcto para que se vean sobre el modal principal.

---

## 🐛 Problemas Comunes y Soluciones

### Problema 1: "Cannot read property 'items' of undefined"
**Causa**: El invoice data todavía no ha cargado cuando se renderizan los tabs.

**Solución**: Agregar checks condicionales:
```typescript
const items = invoice?.items || [];
const paginatedResult = useInvoiceOrdersPagination(items, ...);
```

### Problema 2: Tabs no cambian al hacer click
**Causa**: El estado `activeTab` no está conectado correctamente.

**Solución**: Verificar que `value` y `onValueChange` están pasados:
```typescript
<Tabs value={activeTab} onValueChange={setActiveTab}>
```

### Problema 3: Paginación se rompe después de filtrar
**Causa**: `currentPage` está fuera de rango después de filtrar.

**Solución**: El hook ya maneja esto con `safePage`. Verifica que estás usando `currentPage` del estado, no hardcoded.

### Problema 4: Search no encuentra nada
**Causa**: El campo que estás buscando puede ser null/undefined.

**Solución**: El hook ya usa `|| ''` para manejar nulls. Verifica que los nombres de campos son correctos:
- `vehicle_vin` (no `vin`)
- `vehicle_make` (no `make`)
- `custom_order_number` o `order_number`

### Problema 5: Checkboxes no actualizan visualmente
**Causa**: React Query cache no se está invalidando después de mutation.

**Solución**: Verifica que las mutations tienen `onSuccess` con invalidateQueries:
```typescript
const updateItemPaidMutation = useUpdateInvoiceItemPaid();
// Debe tener onSuccess que invalida ['invoice', invoiceId]
```

---

## 📊 Métricas de Éxito

### Performance
- **Tiempo de carga inicial**: < 2 segundos
- **Tiempo de cambio de tab**: < 100ms
- **Tiempo de paginación**: < 100ms
- **Tiempo de search typing**: < 50ms (debounced)

### UX
- **Clicks para llegar a Comments**: 1 (antes: scroll infinito)
- **Clicks para llegar a Emails**: 1 (antes: scroll infinito)
- **Visibilidad de información**: 100% (todas las secciones accesibles)

### Code Quality
- **TypeScript errors**: 0
- **ESLint warnings**: 0
- **Duplicated code**: < 5%
- **Test coverage**: > 80% (si aplica)

---

## 🚀 Comandos Útiles

```bash
# Validar TypeScript
npx tsc --noEmit

# Validar traducciones
node scripts/audit-translations.cjs

# Build de desarrollo (más rápido)
npm run build:dev

# Build de producción
npm run build

# Ejecutar linter
npm run lint

# Iniciar dev server
npm run dev
```

---

## 📝 Notas Finales

### Tiempo Estimado Total
- **Refactor del componente**: 4-5 horas
- **Testing exhaustivo**: 2-3 horas
- **Ajustes y polish**: 1-2 horas
- **TOTAL**: 7-10 horas

### Orden de Trabajo Recomendado
1. ✅ Crear backup del archivo original
2. ✅ Agregar imports y estado nuevo
3. ✅ Agregar traducciones
4. ✅ Refactorizar estructura de Tabs (sin tab contents aún)
5. ✅ Implementar Tab Overview (más simple)
6. ✅ Implementar Tab Payments (simple)
7. ✅ Implementar Tab History (simple, usa component existente)
8. ✅ Implementar Tab Email Log (simple, usa component existente)
9. ✅ Implementar Tab Comments (simple, usa component existente)
10. ✅ Implementar Tab Orders (más complejo, dejarlo al final)
11. ✅ Testing exhaustivo de cada tab
12. ✅ Testing de funcionalidad existente (buttons, dialogs)
13. ✅ Testing responsive
14. ✅ Testing en 3 idiomas

### Red Flags (🚨 No hacer esto)
- ❌ No eliminar código existente "por si acaso"
- ❌ No cambiar nombres de funciones críticas
- ❌ No modificar la lógica de mutations
- ❌ No cambiar la estructura de datos del invoice
- ❌ No agregar dependencias npm nuevas sin consultar
- ❌ No hacer commits sin probar primero

### Green Flags (✅ Sí hacer esto)
- ✅ Probar cada cambio incrementalmente
- ✅ Usar console.log para debug durante desarrollo
- ✅ Verificar TypeScript después de cada cambio grande
- ✅ Mantener el backup del archivo original
- ✅ Documentar cualquier cambio inesperado
- ✅ Usar los hooks y components ya creados

---

## 🆘 En Caso de Emergencia

### Si algo se rompe y no sabes cómo arreglar:

1. **Restaurar backup**:
```bash
cp src/components/reports/invoices/InvoiceDetailsDialog.backup.tsx src/components/reports/invoices/InvoiceDetailsDialog.tsx
```

2. **Ver diferencias**:
```bash
git diff src/components/reports/invoices/InvoiceDetailsDialog.tsx
```

3. **Revertir al commit anterior**:
```bash
git checkout HEAD -- src/components/reports/invoices/InvoiceDetailsDialog.tsx
```

### Contactos de Ayuda
- **Documentación Radix UI Tabs**: https://www.radix-ui.com/primitives/docs/components/tabs
- **shadcn/ui Pagination**: https://ui.shadcn.com/docs/components/pagination
- **React Query Docs**: https://tanstack.com/query/latest/docs/framework/react/overview

---

**Documento creado**: 2025-12-01
**Última actualización**: 2025-12-01
**Versión**: 1.0
**Status**: Ready for implementation 🚀
