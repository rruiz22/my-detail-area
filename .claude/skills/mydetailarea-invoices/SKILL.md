---
name: mydetailarea-invoices
description: Professional invoice and payment system for MyDetailArea dealership management. Creates invoices with itemization, tax calculations, payment tracking, and multi-format output (HTML/PDF/Excel). Includes email delivery, payment recording, and financial reporting. Use when creating invoices, recording payments, generating financial documents, or managing billing workflows.
license: MIT
---

# MyDetailArea Invoice Builder

Professional invoice creation and payment management system for the MyDetailArea dealership platform.

## Purpose

This skill provides comprehensive invoice generation and payment tracking capabilities specifically designed for dealership operations. It handles invoice creation from orders, itemization, tax calculations, payment recording, and professional document generation.

## When to Use

Use this skill when:
- Creating invoices from service/sales orders
- Generating professional PDF/Excel invoices for customers
- Recording payments and tracking payment status
- Building payment history reports
- Sending invoices via email
- Creating custom invoice templates
- Managing partial payments and installments
- Generating financial summaries and aging reports

## Database Schema

### Core Tables

**invoices** (`C:\Users\rudyr\apps\mydetailarea\supabase\migrations\20241016_create_invoices_system.sql`)
```sql
- id (UUID, PK)
- order_id (UUID, FK to orders)
- dealer_id (UUID, FK to dealerships)
- invoice_number (TEXT, unique, auto-generated)
- subtotal (DECIMAL)
- tax_rate (DECIMAL)
- tax_amount (DECIMAL)
- discount_amount (DECIMAL)
- total_amount (DECIMAL)
- amount_paid (DECIMAL)
- amount_due (DECIMAL)
- status (ENUM: draft | pending | paid | partially_paid | overdue | cancelled)
- issue_date (DATE)
- due_date (DATE)
- paid_at (TIMESTAMP)
- email_sent (BOOLEAN)
- email_sent_at (TIMESTAMP)
- terms_and_conditions (TEXT)
- invoice_notes (TEXT)
- metadata (JSONB)
```

**invoice_items**
```sql
- id (UUID, PK)
- invoice_id (UUID, FK to invoices)
- item_type (TEXT: service | part | labor | fee)
- description (TEXT)
- quantity (DECIMAL)
- unit_price (DECIMAL)
- discount_amount (DECIMAL)
- tax_rate (DECIMAL)
- total_amount (DECIMAL)
- service_reference (UUID, FK to services)
- metadata (JSONB)
```

**payments**
```sql
- id (UUID, PK)
- invoice_id (UUID, FK to invoices)
- dealer_id (UUID, FK to dealerships)
- payment_number (TEXT, unique)
- payment_date (DATE)
- amount (DECIMAL)
- payment_method (ENUM: cash | credit_card | debit_card | check | bank_transfer | other)
- reference_number (TEXT)
- status (ENUM: completed | pending | failed | refunded)
- recorded_by (UUID, FK to users)
- metadata (JSONB)
```

## TypeScript Types

Location: `C:\Users\rudyr\apps\mydetailarea\src\types\invoices.ts`

```typescript
interface Invoice {
  id: string;
  order_id: string;
  dealer_id: string;
  invoice_number: string;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_at?: string;
  email_sent: boolean;
  email_sent_at?: string;
  terms_and_conditions?: string;
  invoice_notes?: string;
  metadata?: Record<string, any>;
  items?: InvoiceItem[];
  payments?: Payment[];
  order?: Order;
}

type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: 'service' | 'part' | 'labor' | 'fee';
  description: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  tax_rate: number;
  total_amount: number;
  service_reference?: string;
}

interface Payment {
  id: string;
  invoice_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_number?: string;
  status: PaymentStatus;
}

type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'check' | 'bank_transfer' | 'other';
type PaymentStatus = 'completed' | 'pending' | 'failed' | 'refunded';
```

## Data Hooks

Location: `C:\Users\rudyr\apps\mydetailarea\src\hooks\useInvoices.ts`

### Available Hooks

```typescript
// Fetch invoices with filtering
const { data, isLoading, error } = useInvoices(filters);

// Fetch single invoice with items and payments
const { data: invoice } = useInvoice(invoiceId);

// Get invoice summary statistics
const { data: summary } = useInvoiceSummary(filters);

// Create new invoice
const createInvoice = useCreateInvoice();
await createInvoice.mutateAsync(invoiceData);

// Update invoice
const updateInvoice = useUpdateInvoice();
await updateInvoice.mutateAsync({ id, updates });

// Record payment
const recordPayment = useRecordPayment();
await recordPayment.mutateAsync({ invoiceId, paymentData });

// Send invoice email
const sendEmail = useSendInvoiceEmail();
await sendEmail.mutateAsync(invoiceId);

// Cancel invoice
const cancelInvoice = useCancelInvoice();
await cancelInvoice.mutateAsync(invoiceId);
```

## Invoice Creation Patterns

### 1. Create Invoice from Order

```tsx
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useOrder } from '@/hooks/useOrders';

function CreateInvoiceFromOrder({ orderId }: { orderId: string }) {
  const { data: order } = useOrder(orderId);
  const createInvoice = useCreateInvoice();

  const handleCreate = async () => {
    if (!order) return;

    const invoiceData = {
      order_id: order.id,
      dealer_id: order.dealer_id,
      issue_date: new Date().toISOString(),
      due_date: addDays(new Date(), 30).toISOString(),
      items: order.services.map(service => ({
        item_type: 'service' as const,
        description: service.service_name,
        quantity: 1,
        unit_price: service.price,
        discount_amount: 0,
        tax_rate: 0.0825, // 8.25% tax
        total_amount: service.price * 1.0825
      })),
      terms_and_conditions: 'Payment due within 30 days.',
      status: 'pending' as const
    };

    await createInvoice.mutateAsync(invoiceData);
  };

  return (
    <Button onClick={handleCreate} disabled={createInvoice.isPending}>
      {createInvoice.isPending ? 'Creating...' : 'Create Invoice'}
    </Button>
  );
}
```

### 2. Invoice Form Component

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const invoiceSchema = z.object({
  issue_date: z.string(),
  due_date: z.string(),
  subtotal: z.number().min(0),
  tax_rate: z.number().min(0).max(1),
  discount_amount: z.number().min(0),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(1),
    unit_price: z.number().min(0),
    item_type: z.enum(['service', 'part', 'labor', 'fee'])
  })),
  terms_and_conditions: z.string().optional(),
  invoice_notes: z.string().optional()
});

function InvoiceForm({ orderId, onSuccess }: InvoiceFormProps) {
  const form = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issue_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      items: [],
      tax_rate: 0.0825,
      discount_amount: 0
    }
  });

  const calculateTotals = (items: InvoiceItem[]) => {
    const subtotal = items.reduce((sum, item) =>
      sum + (item.quantity * item.unit_price), 0
    );
    const tax_amount = subtotal * form.watch('tax_rate');
    const discount = form.watch('discount_amount');
    const total = subtotal + tax_amount - discount;

    return { subtotal, tax_amount, total };
  };

  return (
    <Form {...form}>
      {/* Form fields here */}
    </Form>
  );
}
```

### 3. Invoice Items Manager

```tsx
import { useFieldArray } from 'react-hook-form';

function InvoiceItemsManager({ control }: { control: Control }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Line Items</h3>
        <Button
          type="button"
          onClick={() => append({
            description: '',
            quantity: 1,
            unit_price: 0,
            item_type: 'service'
          })}
        >
          Add Item
        </Button>
      </div>

      {fields.map((field, index) => (
        <Card key={field.id}>
          <CardContent className="p-4">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <Input
                  placeholder="Description"
                  {...control.register(`items.${index}.description`)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Qty"
                  {...control.register(`items.${index}.quantity`)}
                />
              </div>
              <div className="col-span-2">
                <Input
                  type="number"
                  placeholder="Price"
                  {...control.register(`items.${index}.unit_price`)}
                />
              </div>
              <div className="col-span-3">
                <Select {...control.register(`items.${index}.item_type`)}>
                  <option value="service">Service</option>
                  <option value="part">Part</option>
                  <option value="labor">Labor</option>
                  <option value="fee">Fee</option>
                </Select>
              </div>
              <div className="col-span-1 flex items-center">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  ×
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

## Payment Recording

### Record Payment Component

```tsx
import { useRecordPayment } from '@/hooks/useInvoices';

function RecordPaymentDialog({ invoice, open, onClose }: RecordPaymentProps) {
  const recordPayment = useRecordPayment();
  const [amount, setAmount] = useState(invoice.amount_due);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await recordPayment.mutateAsync({
      invoiceId: invoice.id,
      paymentData: {
        amount,
        payment_method: method,
        payment_date: new Date().toISOString(),
        reference_number: reference || undefined
      }
    });

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Invoice #{invoice.invoice_number} - Due: ${invoice.amount_due.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value))}
              max={invoice.amount_due}
            />
          </div>

          <div>
            <Label>Payment Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
            </Select>
          </div>

          <div>
            <Label>Reference Number (Optional)</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Check #, Transaction ID, etc."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

## Invoice Templates (HTML/PDF)

### Professional Invoice Layout

```tsx
function InvoicePrintTemplate({ invoice }: { invoice: Invoice }) {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
          <p className="text-gray-600">#{invoice.invoice_number}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{invoice.dealer?.name}</p>
          <p className="text-sm text-gray-600">{invoice.dealer?.address}</p>
          <p className="text-sm text-gray-600">{invoice.dealer?.phone}</p>
          <p className="text-sm text-gray-600">{invoice.dealer?.email}</p>
        </div>
      </div>

      {/* Customer & Dates */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</h3>
          <p className="font-medium">{invoice.order?.customer_name}</p>
          <p className="text-sm text-gray-600">{invoice.order?.customer_email}</p>
          <p className="text-sm text-gray-600">{invoice.order?.customer_phone}</p>
        </div>
        <div className="text-right">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Issue Date:</span>
              <span className="font-medium">{format(new Date(invoice.issue_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Due Date:</span>
              <span className="font-medium">{format(new Date(invoice.due_date), 'MMM dd, yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge className={getStatusColor(invoice.status)}>{invoice.status}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-8">
        <thead className="bg-gray-50 border-b-2 border-gray-200">
          <tr>
            <th className="text-left py-3 px-4 text-sm font-semibold">Description</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">Qty</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">Unit Price</th>
            <th className="text-right py-3 px-4 text-sm font-semibold">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {invoice.items?.map((item) => (
            <tr key={item.id}>
              <td className="py-3 px-4">
                <p className="font-medium">{item.description}</p>
                <p className="text-sm text-gray-500">{item.item_type}</p>
              </td>
              <td className="text-right py-3 px-4">{item.quantity}</td>
              <td className="text-right py-3 px-4">${item.unit_price.toFixed(2)}</td>
              <td className="text-right py-3 px-4">${item.total_amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium">${invoice.subtotal.toFixed(2)}</span>
          </div>
          {invoice.discount_amount > 0 && (
            <div className="flex justify-between py-2 border-b text-emerald-600">
              <span>Discount:</span>
              <span>-${invoice.discount_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Tax ({(invoice.tax_rate * 100).toFixed(2)}%):</span>
            <span className="font-medium">${invoice.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-3 border-t-2 border-gray-300">
            <span className="text-lg font-bold">Total:</span>
            <span className="text-lg font-bold">${invoice.total_amount.toFixed(2)}</span>
          </div>
          {invoice.amount_paid > 0 && (
            <>
              <div className="flex justify-between py-2 text-emerald-600">
                <span>Paid:</span>
                <span>-${invoice.amount_paid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-gray-300">
                <span className="text-lg font-bold">Amount Due:</span>
                <span className="text-lg font-bold text-red-600">${invoice.amount_due.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Terms */}
      {invoice.terms_and_conditions && (
        <div className="border-t pt-6">
          <h4 className="text-sm font-semibold mb-2">Terms & Conditions:</h4>
          <p className="text-sm text-gray-600">{invoice.terms_and_conditions}</p>
        </div>
      )}

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 1.5cm; size: letter; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
```

## Export Formats

### Excel Export with Multiple Sheets

```tsx
import * as XLSX from 'xlsx';

function exportInvoiceToExcel(invoice: Invoice) {
  const workbook = XLSX.utils.book_new();

  // Invoice Summary Sheet
  const summaryData = [
    ['Invoice Number', invoice.invoice_number],
    ['Issue Date', format(new Date(invoice.issue_date), 'yyyy-MM-dd')],
    ['Due Date', format(new Date(invoice.due_date), 'yyyy-MM-dd')],
    ['Customer', invoice.order?.customer_name],
    ['Status', invoice.status],
    [],
    ['Subtotal', invoice.subtotal],
    ['Tax', invoice.tax_amount],
    ['Discount', invoice.discount_amount],
    ['Total', invoice.total_amount],
    ['Paid', invoice.amount_paid],
    ['Amount Due', invoice.amount_due]
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Items Sheet
  const itemsData = invoice.items?.map(item => ({
    'Description': item.description,
    'Type': item.item_type,
    'Quantity': item.quantity,
    'Unit Price': item.unit_price,
    'Total': item.total_amount
  })) || [];
  const itemsSheet = XLSX.utils.json_to_sheet(itemsData);
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Items');

  // Payments Sheet
  if (invoice.payments && invoice.payments.length > 0) {
    const paymentsData = invoice.payments.map(payment => ({
      'Payment Number': payment.payment_number,
      'Date': format(new Date(payment.payment_date), 'yyyy-MM-dd'),
      'Amount': payment.amount,
      'Method': payment.payment_method,
      'Reference': payment.reference_number,
      'Status': payment.status
    }));
    const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(workbook, paymentsSheet, 'Payments');
  }

  XLSX.writeFile(workbook, `invoice-${invoice.invoice_number}.xlsx`);
}
```

## Email Integration

```tsx
import { useSendInvoiceEmail } from '@/hooks/useInvoices';

function SendInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const sendEmail = useSendInvoiceEmail();

  const handleSend = async () => {
    await sendEmail.mutateAsync(invoiceId);
    // Edge Function handles email generation and sending
  };

  return (
    <Button onClick={handleSend} disabled={sendEmail.isPending}>
      <Mail className="h-4 w-4 mr-2" />
      {sendEmail.isPending ? 'Sending...' : 'Send Invoice'}
    </Button>
  );
}
```

## Reference Files

- **[Invoice Templates Reference](./references/invoice-templates.md)** - Complete HTML/PDF templates
- **[Payment Workflows Reference](./references/payment-workflows.md)** - Payment recording patterns
- **[Email Templates Reference](./references/email-templates.md)** - Invoice email formats
- **[Financial Calculations Reference](./references/financial-calculations.md)** - Tax, discount, totals logic

## Examples

- **[examples/create-invoice.tsx](./examples/create-invoice.tsx)** - Full invoice creation flow
- **[examples/payment-recording.tsx](./examples/payment-recording.tsx)** - Payment tracking implementation
- **[examples/invoice-print.tsx](./examples/invoice-print.tsx)** - Professional print template
- **[examples/financial-summary.tsx](./examples/financial-summary.tsx)** - Invoice aging report

## Best Practices

1. **Auto-calculate totals** - Always compute subtotal, tax, discount, and total
2. **Validate amounts** - Ensure payment amount ≤ amount_due
3. **Track status automatically** - Update status based on payment amounts
4. **Generate unique numbers** - Use auto-increment for invoice_number
5. **Support partial payments** - Allow multiple payment records per invoice
6. **Email confirmations** - Send confirmation when payment is recorded
7. **PDF generation** - Use browser print API or server-side PDF generation
8. **Audit trail** - Log all invoice and payment changes
9. **Internationalization** - Support EN/ES/PT-BR for all invoice text
10. **Professional design** - Follow Notion-style design tokens

## Common Calculations

```typescript
// Calculate tax amount
const tax_amount = subtotal * tax_rate;

// Calculate total with discount
const total_amount = subtotal + tax_amount - discount_amount;

// Calculate amount due after payment
const amount_due = total_amount - amount_paid;

// Determine invoice status
const getInvoiceStatus = (total: number, paid: number, dueDate: Date): InvoiceStatus => {
  if (paid === 0) return 'pending';
  if (paid >= total) return 'paid';
  if (paid > 0 && paid < total) return 'partially_paid';
  if (new Date() > dueDate && paid < total) return 'overdue';
  return 'pending';
};
```

## Security Considerations

- Validate all financial calculations server-side
- Implement Row Level Security (RLS) on invoice tables
- Restrict payment recording to authorized roles
- Log all financial transactions for audit
- Encrypt sensitive payment information
- Validate invoice access before displaying
