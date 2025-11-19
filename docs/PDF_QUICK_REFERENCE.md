# PDF System Quick Reference

**One-page cheat sheet for MyDetailArea PDF templates**

---

## Imports

```typescript
import {
  // Invoice
  downloadInvoicePDF,
  generateInvoicePDF,

  // Reports
  downloadReportPDF,
  generatePayrollReportPDF,
  generateAttendanceReportPDF,

  // Design System
  PDF_DESIGN,

  // Utilities
  formatCurrency,
  formatDate,
  formatLongDate,
  addFooter,
  addHeaderSection,
} from '@/utils/pdfTemplates';
```

---

## Colors (RGB Tuples)

```typescript
// Foundation (Gray Scale)
PDF_DESIGN.colors.gray[50].rgb   // [249, 250, 251] - Subtle backgrounds
PDF_DESIGN.colors.gray[200].rgb  // [229, 231, 235] - Borders
PDF_DESIGN.colors.gray[500].rgb  // [107, 114, 128] - Secondary text
PDF_DESIGN.colors.gray[700].rgb  // [55, 65, 81]    - Table headers
PDF_DESIGN.colors.gray[900].rgb  // [17, 24, 39]    - Primary text

// Accents (Muted)
PDF_DESIGN.colors.emerald[500].rgb  // [16, 185, 129]  - Success
PDF_DESIGN.colors.amber[500].rgb    // [245, 158, 11]  - Warning
PDF_DESIGN.colors.red[500].rgb      // [239, 68, 68]   - Error
PDF_DESIGN.colors.indigo[500].rgb   // [99, 102, 241]  - Info
```

---

## Typography

```typescript
PDF_DESIGN.typography.title      // 24pt, bold - Document titles
PDF_DESIGN.typography.h2         // 16pt, bold - Section headings
PDF_DESIGN.typography.body       // 10pt, normal - Standard text
PDF_DESIGN.typography.small      // 9pt, normal - Secondary text
PDF_DESIGN.typography.caption    // 8pt, normal - Footnotes
PDF_DESIGN.typography.mono       // 9pt, courier - VINs, codes
```

---

## Spacing

```typescript
PDF_DESIGN.spacing.xs    // 2mm  - Inline gaps
PDF_DESIGN.spacing.sm    // 4mm  - Component padding
PDF_DESIGN.spacing.md    // 8mm  - Section spacing
PDF_DESIGN.spacing.lg    // 12mm - Major dividers
PDF_DESIGN.spacing.xl    // 16mm - Page sections
```

---

## Formatters

```typescript
formatCurrency(1250.50)        // "$1,250.50"
formatDate(new Date())         // "01/18/2025"
formatLongDate(new Date())     // "January 18, 2025"
formatShortDate(new Date())    // "01/18"
formatDateTime(new Date())     // "01/18/2025 10:30 AM"
formatHours(8.5)               // "8:30"
formatDecimalHours(8.5)        // "8.50"
formatPercent(0.8542)          // "85.4%"
formatNumber(1234567)          // "1,234,567"
```

---

## Invoice Template

```typescript
await downloadInvoicePDF({
  dealershipInfo: {
    name: string,
    address?: string,
    phone?: string,
    email?: string,
  },
  invoiceData: {
    invoiceNumber: string,
    issueDate: Date,
    dueDate: Date,
    billTo: { name: string },
    items: Array<{
      description: string,
      quantity: number,
      unitPrice: number,
      totalPrice: number,
      date?: string,
      orderNumber?: string,
      stockNumber?: string,
      vin?: string,
      services?: string,
    }>,
    subtotal: number,
    taxRate: number,
    taxAmount: number,
    total: number,
    notes?: string,
    terms?: string,
  },
});
```

---

## Payroll Report

```typescript
const doc = await generatePayrollReportPDF(dealershipInfo, {
  employees: Array<{
    employeeId: string,
    employeeName: string,
    department: string,
    regularHours: number,
    overtimeHours: number,
    totalHours: number,
    hourlyRate?: number,
    totalPay?: number,
  }>,
  totals: {
    totalEmployees: number,
    totalRegularHours: number,
    totalOvertimeHours: number,
    grandTotalHours: number,
    totalPayroll?: number,
  },
  period: { start: Date, end: Date },
});

doc.save('payroll.pdf');
```

---

## Custom Report

```typescript
const doc = await generateReportPDF({
  dealershipInfo,
  metadata: {
    reportTitle: string,
    reportSubtitle?: string,
    dateRange?: { start: Date, end: Date },
  },
  tables: [{
    columns: [
      { header: string, dataKey: string, align: 'left' | 'center' | 'right', format?: 'currency' | 'number' | 'percent' },
    ],
    rows: Array<Record<string, any>>,
    footerRow?: Record<string, any>,
  }],
  summaries?: [{
    title: string,
    items: [{ label: string, value: string | number, bold?: boolean }],
    position?: 'left' | 'right',
  }],
  orientation?: 'portrait' | 'landscape',
});
```

---

## Common Patterns

### Add Header
```typescript
import { addHeaderSection } from '@/utils/pdfTemplates';
const currentY = addHeaderSection(doc, { dealershipInfo });
```

### Add Footer
```typescript
import { addFooter } from '@/utils/pdfTemplates';
addFooter(doc, { pageNumber: 1, totalPages: 3, leftText: 'Invoice #123' });
```

### Check Page Overflow
```typescript
import { checkPageOverflow } from '@/utils/pdfTemplates';
currentY = checkPageOverflow(doc, currentY, 50); // Add page if < 50mm space
```

### Apply Font
```typescript
import { applyFont, applyTextColor } from '@/utils/pdfTemplates';
applyFont(doc, PDF_DESIGN.typography.h2);
applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
```

---

## Table Styles

```typescript
autoTable(doc, {
  head: [headers],
  body: data,
  startY: currentY,
  ...PDF_DESIGN.table,  // Pre-configured styles

  columnStyles: {
    0: { cellWidth: 30, halign: 'left' },
    1: { cellWidth: 40, halign: 'right', format: 'currency' },
  },
});
```

---

## Design Rules

### ✅ DO
- Use gray scale (50-900) as foundation
- Use muted accents sparingly
- Right-align all numbers
- Use alternating row colors
- Include page numbers

### ❌ DON'T
- No gradients
- No bright blues (#0066cc)
- No saturated colors
- No fonts < 8pt
- No center-aligned numbers

---

## File Locations

```
src/utils/
├── pdfDesignSystem.ts     # Colors, typography, spacing
├── pdfHelpers.ts          # Formatters, layout components
└── pdfTemplates/
    ├── invoiceTemplate.ts # Invoice generator
    ├── reportTemplate.ts  # Report generators
    └── __demo__.ts        # Demo/test data

docs/
├── PDF_DESIGN_GUIDELINES.md       # Full design system
├── PDF_USAGE_EXAMPLES.md          # Code examples
├── PDF_SYSTEM_README.md           # System overview
└── PDF_QUICK_REFERENCE.md         # This file
```

---

## Demo

```typescript
import { demoAll } from '@/utils/pdfTemplates/__demo__';

// Generate all demo PDFs
await demoAll();
```

---

**Version:** 1.0.0 | **Last Updated:** January 18, 2025
