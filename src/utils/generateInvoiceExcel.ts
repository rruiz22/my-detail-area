// =====================================================
// GENERATE INVOICE EXCEL
// Created: 2025-10-31
// Description: Generate Excel file from invoice data
// =====================================================

import * as XLSX from 'xlsx';
import type { InvoiceWithDetails } from '@/types/invoices';
import { format } from 'date-fns';

/**
 * Format currency for Excel display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for Excel display (MM/DD)
 */
function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'MM/dd');
  } catch (error) {
    return dateString;
  }
}

/**
 * Format date with year for invoice details (MM/DD/YYYY)
 */
function formatDateWithYear(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
}

/**
 * Generate Excel file from invoice data
 * Matches the 7-column format from the UI
 */
export function generateInvoiceExcel(invoice: InvoiceWithDetails): void {
  // Create worksheet data
  const wsData: (string | number | null)[][] = [];

  // Row 1: Title (left) and Invoice number (right)
  wsData.push(['Dealer Detail Service', '', '', '', '', '', `#${invoice.invoiceNumber}`]);
  wsData.push([]); // Empty row

  // Row 3-6: Bill To (left) and Invoice Details (right) - 2 column layout
  wsData.push(['Bill To:', '', '', '', 'Issue Date:', formatDateWithYear(invoice.issueDate)]);
  wsData.push([invoice.dealership?.name || 'N/A', '', '', '', 'Due Date:', formatDateWithYear(invoice.dueDate)]);
  wsData.push([invoice.dealership?.address || '', '', '', '', 'Total Amount:', invoice.totalAmount]);
  wsData.push([`Email: ${invoice.dealership?.email || ''}`, '', '', '', 'Total Vehicles:', invoice.items?.length || 0]);
  wsData.push([]); // Empty row

  // Dynamic table header based on order type
  const poRoTagHeader = invoice.items?.some(i => i.metadata?.order_type === 'service')
    ? 'PO/RO/Tag'
    : 'Stock';

  // Table headers (7 columns)
  wsData.push(['Date', 'Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount']);

  // Table data rows
  (invoice.items || []).forEach(item => {
    // Format date (MM/DD)
    const dateStr = formatDate(item.createdAt);

    // Order number
    const orderNum = item.metadata?.order_number || 'N/A';

    // PO/RO/Tag or Stock column (simplified format without labels)
    const poRoTagStock = item.metadata?.order_type === 'service'
      ? [item.metadata?.po, item.metadata?.ro, item.metadata?.tag]
          .filter(Boolean)
          .join(' | ') || 'N/A'
      : item.metadata?.stock_number || 'N/A';

    // Vehicle description
    const vehicle = item.description || 'N/A';

    // VIN
    const vin = item.metadata?.vehicle_vin || 'N/A';

    // Services
    const services = item.metadata?.service_names || 'N/A';

    // Amount (numeric for Excel calculations)
    const amount = item.totalAmount;

    wsData.push([dateStr, orderNum, poRoTagStock, vehicle, vin, services, amount]);
  });

  // Empty row before totals
  wsData.push([]);

  // Totals section
  wsData.push(['', '', '', '', '', 'Subtotal:', invoice.subtotal]);
  wsData.push(['', '', '', '', '', `Tax (${invoice.taxRate}%):`, invoice.taxAmount]);

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    wsData.push(['', '', '', '', '', 'Discount:', -invoice.discountAmount]);
  }

  wsData.push(['', '', '', '', '', 'Total:', invoice.totalAmount]);

  if (invoice.amountPaid > 0) {
    wsData.push([]);
    wsData.push(['', '', '', '', '', 'Amount Paid:', invoice.amountPaid]);
    wsData.push(['', '', '', '', '', 'Amount Due:', invoice.amountDue]);
  }

  // Notes section
  if (invoice.invoiceNotes) {
    wsData.push([]);
    wsData.push(['Notes:']);
    wsData.push([invoice.invoiceNotes]);
  }

  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Calculate column widths based on content (auto-fit)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  const colWidths: number[] = [];

  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10; // minimum width
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cellAddress = { c: C, r: R };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      const cell = ws[cellRef];
      if (!cell || !cell.v) continue;

      const cellValue = cell.v.toString();
      const cellWidth = cellValue.length + 2; // Add padding

      if (cellWidth > maxWidth) {
        maxWidth = cellWidth;
      }
    }
    // Cap max width at 50 characters
    colWidths[C] = Math.min(maxWidth, 50);
  }

  ws['!cols'] = colWidths.map(wch => ({ wch }));

  // Find header row (where table headers are)
  let headerRowIndex = -1;
  for (let i = 0; i < wsData.length; i++) {
    if (wsData[i][0] === 'Date' && wsData[i][1] === 'Order') {
      headerRowIndex = i;
      break;
    }
  }

  // Apply professional invoice styling (Notion-inspired, flat colors, no gradients)
  // const range (already declared above) = XLSX.utils.decode_range(ws['!ref'] || 'A1');

  // 1. Style title "Dealer Detail Service" (A1:D1) - 16pt, bold, black on white
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // 2. Style invoice number (G1) - 18pt, bold, right-aligned, black on white
  if (ws['G1']) {
    ws['G1'].s = {
      font: { bold: true, sz: 18, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'right', vertical: 'center' }
    };
  }

  // 3. Style "Bill To:" label (A3) - 10pt, bold, gray
  if (ws['A3']) {
    ws['A3'].s = {
      font: { bold: true, sz: 10, color: { rgb: '6B7280' } }, // gray-500
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // 4. Style dealership name (A4) - 12pt, bold, black
  if (ws['A4']) {
    ws['A4'].s = {
      font: { bold: true, sz: 12, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // 5. Style address and email (A5:A6) - 9pt, gray
  ['A5', 'A6'].forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { sz: 9, color: { rgb: '6B7280' } }, // gray-500
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
  });

  // 6. Style right-side labels (E3:E6) - 9pt, bold, gray
  ['E3', 'E4', 'E5', 'E6'].forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, sz: 9, color: { rgb: '6B7280' } }, // gray-500
        fill: { fgColor: { rgb: 'FFFFFF' } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
  });

  // 7. Style right-side values (F3:F6)
  if (ws['F3']) {
    ws['F3'].s = {
      font: { sz: 9, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
  if (ws['F4']) {
    ws['F4'].s = {
      font: { sz: 9, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }
  if (ws['F5']) {
    ws['F5'].s = {
      font: { bold: true, sz: 11, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
    ws['F5'].z = '$#,##0.00';
  }
  if (ws['F6']) {
    ws['F6'].s = {
      font: { bold: true, sz: 9, color: { rgb: '000000' } },
      fill: { fgColor: { rgb: 'FFFFFF' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  // 8. Style table headers (row with Date, Order, etc.) - ALL CENTERED, gray-100 background
  if (headerRowIndex !== -1) {
    const headerRow = headerRowIndex + 1;
    const headerCells = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

    headerCells.forEach(col => {
      const cellRef = `${col}${headerRow}`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } }, // White text for better contrast
          fill: { fgColor: { rgb: '4B5563' } }, // gray-600 (darker, more professional)
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'medium', color: { rgb: '374151' } }, // gray-700
            bottom: { style: 'medium', color: { rgb: '374151' } },
            left: { style: 'thin', color: { rgb: '6B7280' } },
            right: { style: 'thin', color: { rgb: '6B7280' } }
          }
        };
      }
    });
  }

  // 9. Style data rows with zebra striping and borders (matching PDF)
  const dataStartRow = headerRowIndex !== -1 ? headerRowIndex + 2 : 8;
  const dataEndRow = wsData.length - 10; // Before totals

  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const isEvenRow = (row - dataStartRow) % 2 === 0;
    const fillColor = isEvenRow ? 'FFFFFF' : 'F9FAFB'; // white / gray-50

    ['A', 'B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
      const cellRef = `${col}${row}`;
      if (ws[cellRef]) {
        // Date and Order columns centered, others left-aligned, Amount right-aligned
        const alignment = col === 'A' || col === 'B'
          ? 'center'
          : col === 'G'
          ? 'right'
          : 'left';

        ws[cellRef].s = {
          font: { sz: 9, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: fillColor } },
          alignment: {
            horizontal: alignment,
            vertical: 'center',
            wrapText: true
          },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        };

        // VIN column: smaller font
        if (col === 'E') {
          ws[cellRef].s.font.sz = 8;
        }
      }
    });
  }

  // 10. Format currency columns with $ sign (Amount column)
  for (let row = dataStartRow; row <= dataEndRow; row++) {
    const cellRef = `G${row}`;
    if (ws[cellRef] && typeof ws[cellRef].v === 'number') {
      ws[cellRef].z = '$#,##0.00';
    }
  }

  // 11. Style totals section (bold, right-aligned, gray background)
  const totalsStartRow = dataEndRow + 2;
  for (let row = totalsStartRow; row <= wsData.length; row++) {
    ['F', 'G'].forEach(col => {
      const cellRef = `${col}${row}`;
      if (ws[cellRef]) {
        ws[cellRef].s = {
          font: { bold: true, sz: 10, color: { rgb: '000000' } },
          fill: { fgColor: { rgb: 'F3F4F6' } }, // gray-100
          alignment: { horizontal: 'right', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } }
          }
        };

        // Format currency in totals column
        if (col === 'G' && typeof ws[cellRef].v === 'number') {
          ws[cellRef].z = '$#,##0.00';
        }
      }
    });
  }

  // 12. Merge cells for title "Dealer Detail Service" (A1:D1)
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  // 13. Set row heights
  ws['!rows'] = [
    { hpt: 25 }, // Row 1 (title)
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice');

  // Save file
  const filename = `Invoice-${invoice.invoiceNumber}.xlsx`;
  XLSX.writeFile(wb, filename);
}
