# PDF Template Usage Examples

**Version:** 1.0.0
**Last Updated:** January 18, 2025

This guide demonstrates how to use the MyDetailArea PDF Design System for generating professional invoices and reports.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Invoice Examples](#invoice-examples)
3. [Report Examples](#report-examples)
4. [Advanced Customization](#advanced-customization)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Installation

The PDF design system is already installed with your project dependencies:
- `jspdf` - Core PDF generation
- `jspdf-autotable` - Professional table layouts

### Basic Import

```typescript
import {
  generateInvoicePDF,
  downloadInvoicePDF,
  generateReportPDF,
  downloadReportPDF,
  PDF_DESIGN,
} from '@/utils/pdfTemplates';
```

---

## Invoice Examples

### Example 1: Simple Invoice

```typescript
import { downloadInvoicePDF } from '@/utils/pdfTemplates';

// Dealership information
const dealershipInfo = {
  name: 'BMW of Sudbury',
  address: '123 Main St, Sudbury, MA 01776',
  phone: '(555) 123-4567',
  email: 'info@bmwofsudbury.com',
};

// Invoice data
const invoiceData = {
  // Metadata
  invoiceNumber: 'INV-2025-001',
  issueDate: new Date('2025-01-18'),
  dueDate: new Date('2025-02-18'),

  // Billing information
  billTo: {
    name: 'AutoMax Dealership',
    address: '456 Commerce Blvd, Boston, MA 02101',
    email: 'billing@automax.com',
    phone: '(555) 987-6543',
  },

  // Line items
  items: [
    {
      description: '2024 BMW X5 - Full Detail',
      quantity: 1,
      unitPrice: 250.00,
      totalPrice: 250.00,
      date: '2025-01-15',
      orderNumber: 'SO-2025-001',
      stockNumber: 'BMW2024X5001',
      vin: 'WBAJV8C52LC123456',
      services: 'Interior Detail, Exterior Wash, Wax',
    },
    {
      description: '2023 Tesla Model 3 - Express Detail',
      quantity: 1,
      unitPrice: 150.00,
      totalPrice: 150.00,
      date: '2025-01-16',
      orderNumber: 'SO-2025-002',
      stockNumber: 'TESLA2023M3001',
      vin: '5YJ3E1EA1PF123456',
      services: 'Express Wash, Interior Vacuum',
    },
  ],

  // Totals
  subtotal: 400.00,
  taxRate: 0.0625, // 6.25% MA sales tax
  taxAmount: 25.00,
  total: 425.00,

  // Optional
  notes: 'Thank you for your business! Payment is due within 30 days.',
  terms: 'Net 30 days. Late payments subject to 1.5% monthly interest.',
  department: 'Detail Service',
};

// Generate and download
await downloadInvoicePDF({ dealershipInfo, invoiceData });
// Downloads: "BMW_of_Sudbury_Invoice_INV-2025-001.pdf"
```

### Example 2: Invoice with Service Period

```typescript
import { downloadInvoicePDF } from '@/utils/pdfTemplates';

const invoiceData = {
  invoiceNumber: 'INV-2025-002',
  issueDate: new Date('2025-01-31'),
  dueDate: new Date('2025-02-28'),

  billTo: {
    name: 'Mercedes-Benz of Boston',
    address: '789 Luxury Ave, Boston, MA 02115',
  },

  // Service period for monthly invoices
  serviceperiod: {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  },

  items: [
    // ... (multiple items)
  ],

  subtotal: 12500.00,
  taxRate: 0.0625,
  taxAmount: 781.25,
  total: 13281.25,

  department: 'All Departments',
};

await downloadInvoicePDF({ dealershipInfo, invoiceData });
```

### Example 3: Invoice Preview (No Download)

```typescript
import { generateInvoicePDFBlob } from '@/utils/pdfTemplates';

// Generate PDF as blob for preview
const pdfBlob = await generateInvoicePDFBlob({ dealershipInfo, invoiceData });

// Open in new window
const pdfUrl = URL.createObjectURL(pdfBlob);
window.open(pdfUrl, '_blank');

// Or send to email service
await sendEmailWithAttachment({
  to: 'customer@example.com',
  subject: 'Your Invoice',
  attachment: pdfBlob,
  filename: 'invoice.pdf',
});
```

---

## Report Examples

### Example 4: Payroll Report (Landscape)

```typescript
import { generatePayrollReportPDF } from '@/utils/pdfTemplates';

const payrollData = {
  employees: [
    {
      employeeId: 'E001',
      employeeName: 'John Doe',
      department: 'Detail',
      regularHours: 80.0,
      overtimeHours: 5.0,
      totalHours: 85.0,
      hourlyRate: 25.00,
      totalPay: 2187.50,
    },
    {
      employeeId: 'E002',
      employeeName: 'Jane Smith',
      department: 'Wash',
      regularHours: 75.0,
      overtimeHours: 2.5,
      totalHours: 77.5,
      hourlyRate: 22.00,
      totalPay: 1732.50,
    },
    // ... more employees
  ],

  totals: {
    totalEmployees: 12,
    totalRegularHours: 960.0,
    totalOvertimeHours: 45.5,
    grandTotalHours: 1005.5,
    totalPayroll: 25420.00,
  },

  period: {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  },
};

const doc = await generatePayrollReportPDF(dealershipInfo, payrollData);
doc.save('payroll_report_january_2025.pdf');
```

### Example 5: Attendance Report (Portrait)

```typescript
import { generateAttendanceReportPDF } from '@/utils/pdfTemplates';

const attendanceData = {
  records: [
    {
      employeeName: 'John Doe',
      date: new Date('2025-01-15'),
      clockIn: new Date('2025-01-15T08:00:00'),
      clockOut: new Date('2025-01-15T17:00:00'),
      totalHours: 8.0,
      status: 'present' as const,
    },
    {
      employeeName: 'Jane Smith',
      date: new Date('2025-01-15'),
      clockIn: new Date('2025-01-15T08:15:00'),
      clockOut: new Date('2025-01-15T17:00:00'),
      totalHours: 7.75,
      status: 'late' as const,
      notes: '15 minutes late',
    },
    // ... more records
  ],

  summary: {
    totalDays: 20,
    presentDays: 18,
    absentDays: 1,
    lateDays: 1,
    leaveDays: 0,
    attendanceRate: 0.90, // 90%
  },

  period: {
    start: new Date('2025-01-01'),
    end: new Date('2025-01-31'),
  },
};

const doc = await generateAttendanceReportPDF(dealershipInfo, attendanceData);
doc.save('attendance_report_january_2025.pdf');
```

### Example 6: Custom Report (Flexible)

```typescript
import { generateReportPDF, type ReportTableColumn } from '@/utils/pdfTemplates';

// Define custom columns
const columns: ReportTableColumn[] = [
  { header: 'Order #', dataKey: 'orderNumber', align: 'center', width: 25 },
  { header: 'Customer', dataKey: 'customerName', align: 'left', width: 50 },
  { header: 'Vehicle', dataKey: 'vehicle', align: 'left', width: 50 },
  { header: 'Status', dataKey: 'status', align: 'center', width: 30 },
  { header: 'Amount', dataKey: 'amount', align: 'right', width: 25, format: 'currency', bold: true },
];

// Data rows
const rows = [
  {
    orderNumber: 'SO-2025-001',
    customerName: 'AutoMax Dealership',
    vehicle: '2024 BMW X5',
    status: 'Completed',
    amount: 250.00,
  },
  // ... more rows
];

// Generate report
const doc = await generateReportPDF({
  dealershipInfo,
  metadata: {
    reportTitle: 'SALES ORDERS SUMMARY',
    reportSubtitle: 'Completed Orders',
    dateRange: {
      start: new Date('2025-01-01'),
      end: new Date('2025-01-31'),
    },
  },
  tables: [{ columns, rows }],
  summaries: [
    {
      title: 'TOTALS',
      items: [
        { label: 'Total Orders', value: '45' },
        { label: 'Total Revenue', value: '$12,500.00', bold: true },
      ],
      position: 'right',
    },
  ],
  orientation: 'portrait',
});

doc.save('sales_orders_summary.pdf');
```

---

## Advanced Customization

### Custom Colors

```typescript
import { downloadInvoicePDF, PDF_DESIGN } from '@/utils/pdfTemplates';

await downloadInvoicePDF({
  dealershipInfo,
  invoiceData,
  customColors: {
    accentColor: PDF_DESIGN.colors.indigo[500].rgb, // Use indigo instead of emerald
  },
});
```

### Manual PDF Generation (Full Control)

```typescript
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  PDF_DESIGN,
  addHeaderSection,
  addFooter,
  addSummaryBox,
  formatCurrency,
  applyFont,
  applyTextColor,
} from '@/utils/pdfTemplates';

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
let currentY = 20;

// Add header
currentY = addHeaderSection(doc, { dealershipInfo });

// Add custom title
applyFont(doc, PDF_DESIGN.typography.h1);
applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
doc.text('CUSTOM REPORT', doc.internal.pageSize.getWidth() / 2, currentY, {
  align: 'center',
});
currentY += 15;

// Add table
autoTable(doc, {
  head: [['Column 1', 'Column 2']],
  body: [['Data 1', 'Data 2']],
  startY: currentY,
  ...PDF_DESIGN.table,
});

// Add footer
addFooter(doc, { pageNumber: 1, totalPages: 1 });

// Save
doc.save('custom_report.pdf');
```

---

## Common Patterns

### Pattern 1: Multi-Page Invoice

```typescript
// No special handling needed - auto-pagination is built-in
const invoiceData = {
  // ... metadata
  items: Array(100).fill(null).map((_, i) => ({
    description: `Item ${i + 1}`,
    quantity: 1,
    unitPrice: 50.00,
    totalPrice: 50.00,
    // ... other fields
  })),
  // ... totals
};

await downloadInvoicePDF({ dealershipInfo, invoiceData });
// Automatically creates multiple pages with repeated headers
```

### Pattern 2: Conditional Columns

```typescript
import { type ReportTableColumn } from '@/utils/pdfTemplates';

const includePayroll = true; // From user settings

const columns: ReportTableColumn[] = [
  { header: 'Employee', dataKey: 'name', align: 'left' },
  { header: 'Hours', dataKey: 'hours', align: 'right', format: 'hours' },
];

// Conditionally add payroll columns
if (includePayroll) {
  columns.push(
    { header: 'Rate', dataKey: 'rate', align: 'right', format: 'currency' },
    { header: 'Total Pay', dataKey: 'pay', align: 'right', format: 'currency', bold: true }
  );
}
```

### Pattern 3: Multiple Tables in One Report

```typescript
const doc = await generateReportPDF({
  dealershipInfo,
  metadata: {
    reportTitle: 'COMPREHENSIVE REPORT',
    dateRange: { start: startDate, end: endDate },
  },
  tables: [
    {
      // First table: Sales summary
      columns: salesColumns,
      rows: salesData,
      footerRow: salesTotals,
    },
    {
      // Second table: Service summary
      columns: serviceColumns,
      rows: serviceData,
      footerRow: serviceTotals,
    },
  ],
  summaries: [
    { title: 'SALES SUMMARY', items: salesSummary, position: 'left' },
    { title: 'SERVICE SUMMARY', items: serviceSummary, position: 'right' },
  ],
});
```

### Pattern 4: Formatting Large Numbers

```typescript
import { formatCurrency, formatNumber, formatPercent } from '@/utils/pdfTemplates';

// Currency formatting
formatCurrency(1234567.89);    // "$1,234,567.89"
formatCurrency(null);          // "$0.00"

// Number formatting
formatNumber(1234567);         // "1,234,567"
formatNumber(0);               // "0"

// Percentage formatting
formatPercent(0.8542);         // "85.4%"
formatPercent(0.8542, 2);      // "85.42%"
```

---

## Troubleshooting

### Issue 1: Text Overflow in Columns

**Problem:** Long text causes columns to expand too much.

**Solution:** Set explicit column widths and enable text wrapping:

```typescript
columnStyles: {
  0: { cellWidth: 40, halign: 'left' }, // Fixed width prevents overflow
}
```

### Issue 2: Page Breaks in Wrong Place

**Problem:** Table breaks mid-row or content overlaps footer.

**Solution:** Use `checkPageOverflow` before adding content:

```typescript
import { checkPageOverflow } from '@/utils/pdfTemplates';

let currentY = 100;
currentY = checkPageOverflow(doc, currentY, 50); // Ensure 50mm space available

// Add content here
```

### Issue 3: Missing Footer on Last Page

**Problem:** Footer not appearing on the last page.

**Solution:** Always finalize footers after content:

```typescript
const totalPages = doc.getNumberOfPages();
for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
  doc.setPage(pageNum);
  addFooter(doc, { pageNumber: pageNum, totalPages });
}
```

### Issue 4: Font Size Too Small in Landscape

**Problem:** Text is too small when switching to landscape.

**Solution:** Adjust font sizes for landscape orientation:

```typescript
headStyles: {
  fontSize: orientation === 'landscape' ? 9 : 10,
}
```

### Issue 5: Special Characters Display Incorrectly

**Problem:** Accented characters or symbols render as boxes.

**Solution:** Use Helvetica (built-in font) or escape special characters:

```typescript
// Use built-in fonts (Helvetica, Courier, Times)
doc.setFont('helvetica', 'normal');

// Or sanitize text
const sanitizedText = text.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
```

---

## Performance Tips

1. **Batch Generation:** Generate multiple PDFs in parallel for faster processing
2. **Lazy Loading:** Only generate PDFs on-demand, not on page load
3. **Caching:** Cache generated PDFs if content doesn't change frequently
4. **Blob Handling:** Revoke blob URLs after use to prevent memory leaks

```typescript
// Revoke blob URL after opening preview
const pdfUrl = URL.createObjectURL(pdfBlob);
window.open(pdfUrl, '_blank');
setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
```

---

## Next Steps

- Review [PDF_DESIGN_GUIDELINES.md](./PDF_DESIGN_GUIDELINES.md) for design principles
- Explore `src/utils/pdfDesignSystem.ts` for color/typography constants
- Check `src/utils/pdfHelpers.ts` for utility functions
- See `src/utils/pdfTemplates/` for template implementations

---

**Questions?** Contact the development team or reference the inline documentation in the source code.
