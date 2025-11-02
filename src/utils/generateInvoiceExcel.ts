// =====================================================
// GENERATE INVOICE EXCEL
// Created: 2025-10-31
// Updated: 2025-11-01 - Migrated to ExcelJS for better styling
// Description: Generate Excel file from invoice data with professional styling
// =====================================================

import type { InvoiceWithDetails } from '@/types/invoices';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';

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
 * Format date with year for invoice details (MMM DD, YYYY)
 */
function formatDateWithYear(dateString: string): string {
  try {
    return format(new Date(dateString), 'MMM dd, yyyy');
  } catch (error) {
    return dateString;
  }
}

/**
 * Generate Excel file from invoice data with professional styling
 * Uses ExcelJS for advanced formatting and styling capabilities
 */
export async function generateInvoiceExcel(invoice: InvoiceWithDetails): Promise<void> {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'My Detail Area';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Invoice', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  // Define color palette (consistent with UI)
  const colors = {
    headerBg: 'FF6366F1',      // indigo-500 (matches print view)
    headerText: 'FFFFFFFF',    // white
    titleText: 'FF111827',     // gray-900
    labelText: 'FF6B7280',     // gray-500
    valueText: 'FF000000',     // black
    totalsBg: 'FFF3F4F6',      // gray-100
    zebraStripe: 'FFF9FAFB',   // gray-50
    borderLight: 'FFE5E7EB',   // gray-200
    borderDark: 'FF9CA3AF'     // gray-400
  };

  // Set column widths (services column will be auto-adjusted later)
  worksheet.columns = [
    { key: 'date', width: 12 },
    { key: 'order', width: 10 },
    { key: 'po_ro_stock', width: 15 },
    { key: 'vehicle', width: 20 },
    { key: 'vin', width: 18 },
    { key: 'services', width: 10 }, // Will be auto-adjusted
    { key: 'amount', width: 12 }
  ];

  let currentRow = 1;

  // ===============================================
  // HEADER SECTION (Rows 1-2)
  // ===============================================

  // Row 1: Title and Invoice Number
  const titleRow = worksheet.getRow(currentRow);
  titleRow.height = 30;

  const titleCell = titleRow.getCell(1);
  titleCell.value = 'Dealer Detail Service';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: colors.titleText } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);

  const invoiceNumCell = titleRow.getCell(7);
  invoiceNumCell.value = `#${invoice.invoiceNumber}`;
  invoiceNumCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: colors.titleText } };
  invoiceNumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  currentRow += 2; // Skip row 2 (empty space)

  // ===============================================
  // BILL TO / INVOICE DETAILS (Rows 3-6)
  // ===============================================

  // Row 3: "Bill To:" label and "Issue Date:"
  let detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = 'Bill To:';
  detailRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).value = 'Issue Date:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  detailRow.getCell(7).value = formatDateWithYear(invoice.issueDate);
  detailRow.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: colors.valueText } };
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 4: Dealership name and "Due Date:"
  detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = invoice.dealership?.name || 'N/A';
  detailRow.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.valueText } };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  detailRow.getCell(6).value = 'Due Date:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  detailRow.getCell(7).value = formatDateWithYear(invoice.dueDate);
  detailRow.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: colors.valueText } };
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 5: Address and "Total Amount:"
  detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = invoice.dealership?.address || '';
  detailRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: colors.labelText } };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  detailRow.getCell(6).value = 'Total Amount:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  detailRow.getCell(7).value = invoice.totalAmount;
  detailRow.getCell(7).font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.valueText } };
  detailRow.getCell(7).numFmt = '$#,##0.00';
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 6: Email and "Total Vehicles:"
  detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = `Email: ${invoice.dealership?.email || ''}`;
  detailRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: colors.labelText } };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  detailRow.getCell(6).value = 'Total Vehicles:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  detailRow.getCell(7).value = invoice.items?.length || 0;
  detailRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow += 2; // Empty row before table

  // ===============================================
  // TABLE HEADER (Dynamic based on order type)
  // ===============================================

  const poRoTagHeader = invoice.items?.some(i => i.metadata?.order_type === 'service')
    ? 'PO | RO | Tag'
    : 'Stock';

  const headerRow = worksheet.getRow(currentRow);
  headerRow.height = 22;
  headerRow.values = ['Date', 'Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount'];

  // Style header cells with gray background
  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.headerText } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors.headerBg }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'medium', color: { argb: colors.borderDark } },
      bottom: { style: 'medium', color: { argb: colors.borderDark } },
      left: { style: 'thin', color: { argb: colors.borderLight } },
      right: { style: 'thin', color: { argb: colors.borderLight } }
    };
  });
  currentRow++;

  // ===============================================
  // TABLE DATA ROWS (with zebra striping)
  // ===============================================

  const dataStartRow = currentRow;
  (invoice.items || []).forEach((item, index) => {
    const row = worksheet.getRow(currentRow);
    row.height = 20;

    // Prepare data
    const dateStr = formatDate(item.createdAt);
    const orderNum = item.metadata?.order_number || 'N/A';
    const poRoTagStock = item.metadata?.order_type === 'service'
      ? [item.metadata?.po, item.metadata?.ro, item.metadata?.tag]
          .filter(Boolean)
          .join(' | ') || 'N/A'
      : item.metadata?.stock_number || 'N/A';

    // Clean vehicle description - remove stock number suffix if present
    let vehicle = item.description || 'N/A';
    if (vehicle !== 'N/A' && vehicle.includes(' - ')) {
      vehicle = vehicle.split(' - ')[0].trim();
    }

    const vin = item.metadata?.vehicle_vin || 'N/A';
    const services = item.metadata?.service_names || 'N/A';

    // Set values
    row.getCell(1).value = dateStr;
    row.getCell(2).value = orderNum;
    row.getCell(3).value = poRoTagStock;
    row.getCell(4).value = vehicle;
    row.getCell(5).value = vin;
    row.getCell(6).value = services;
    row.getCell(7).value = item.totalAmount;
    row.getCell(7).numFmt = '$#,##0.00';

    // Apply zebra striping
    const isEvenRow = index % 2 === 0;
    const fillColor = isEvenRow ? 'FFFFFFFF' : colors.zebraStripe;

    row.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: colNumber === 5 ? 8 : 9, // VIN column smaller
        color: { argb: colors.valueText }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 || colNumber === 2 ? 'center' : colNumber === 7 ? 'right' : 'left',
        wrapText: true
      };
      cell.border = {
        top: { style: 'thin', color: { argb: colors.borderLight } },
        bottom: { style: 'thin', color: { argb: colors.borderLight } },
        left: { style: 'thin', color: { argb: colors.borderLight } },
        right: { style: 'thin', color: { argb: colors.borderLight } }
      };
    });

    currentRow++;
  });

  // Auto-adjust Services column width based on content
  let maxServicesLength = 'Services'.length; // Start with header length
  (invoice.items || []).forEach(item => {
    const services = item.metadata?.service_names || 'N/A';
    if (services.length > maxServicesLength) {
      maxServicesLength = services.length;
    }
  });
  // Set width with constraints (min: 15, max: 40)
  const servicesColumn = worksheet.getColumn(6);
  servicesColumn.width = Math.min(Math.max(maxServicesLength + 2, 15), 40);

  currentRow++; // Empty row before totals

  // ===============================================
  // TOTALS SECTION
  // ===============================================

  // Subtotal
  let totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(6).value = 'Subtotal:';
  totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(7).value = invoice.subtotal;
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(7).alignment = { horizontal: 'right' };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(6).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  totalRow.getCell(7).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  currentRow++;

  // Tax
  totalRow = worksheet.getRow(currentRow);
  totalRow.getCell(6).value = `Tax (${invoice.taxRate}%):`;
  totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(7).value = invoice.taxAmount;
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(7).alignment = { horizontal: 'right' };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(6).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  totalRow.getCell(7).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  currentRow++;

  // Discount (if applicable)
  if (invoice.discountAmount && invoice.discountAmount > 0) {
    totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = 'Discount:';
    totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
    totalRow.getCell(7).value = -invoice.discountAmount;
    totalRow.getCell(7).numFmt = '$#,##0.00';
    totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
    totalRow.getCell(6).border = {
      top: { style: 'thin', color: { argb: colors.borderLight } },
      bottom: { style: 'thin', color: { argb: colors.borderLight } },
      left: { style: 'thin', color: { argb: colors.borderLight } },
      right: { style: 'thin', color: { argb: colors.borderLight } }
    };
    totalRow.getCell(7).border = {
      top: { style: 'thin', color: { argb: colors.borderLight } },
      bottom: { style: 'thin', color: { argb: colors.borderLight } },
      left: { style: 'thin', color: { argb: colors.borderLight } },
      right: { style: 'thin', color: { argb: colors.borderLight } }
    };
    currentRow++;
  }

  // Total (with darker border on top)
  totalRow = worksheet.getRow(currentRow);
  totalRow.height = 22;
  totalRow.getCell(6).value = 'Total:';
  totalRow.getCell(6).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(7).value = invoice.totalAmount;
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(6).border = {
    top: { style: 'medium', color: { argb: colors.borderDark } },
    bottom: { style: 'medium', color: { argb: colors.borderDark } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  totalRow.getCell(7).border = {
    top: { style: 'medium', color: { argb: colors.borderDark } },
    bottom: { style: 'medium', color: { argb: colors.borderDark } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  currentRow++;

  // Amount Paid / Amount Due (if applicable)
  if (invoice.amountPaid > 0) {
    currentRow++; // Empty row

    totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = 'Amount Paid:';
    totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF10B981' } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(7).value = invoice.amountPaid;
    totalRow.getCell(7).numFmt = '$#,##0.00';
    totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF10B981' } };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    currentRow++;

    totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = 'Amount Due:';
    totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF59E0B' } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(7).value = invoice.amountDue;
    totalRow.getCell(7).numFmt = '$#,##0.00';
    totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF59E0B' } };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    currentRow++;
  }

  // ===============================================
  // NOTES SECTION
  // ===============================================

  if (invoice.invoiceNotes) {
    currentRow += 2; // Empty rows before notes

    const notesLabelRow = worksheet.getRow(currentRow);
    notesLabelRow.getCell(1).value = 'Notes:';
    notesLabelRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
    currentRow++;

    const notesRow = worksheet.getRow(currentRow);
    notesRow.getCell(1).value = invoice.invoiceNotes;
    notesRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: colors.labelText } };
    notesRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
  }

  // ===============================================
  // DOWNLOAD FILE
  // ===============================================

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  // Generate filename with dealer name and date range
  const dealerName = invoice.dealership?.name || 'Invoice';
  const sanitizedDealerName = dealerName.replace(/[^a-zA-Z0-9]/g, '_');

  let dateRangePart = '';
  if (invoice.metadata?.filter_date_range) {
    const startDate = new Date(invoice.metadata.filter_date_range.start);
    const endDate = new Date(invoice.metadata.filter_date_range.end);

    // Format dates like "October 27, 2025" to match department revenue report
    const formatDateLong = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    };

    dateRangePart = `_${formatDateLong(startDate)}_to_${formatDateLong(endDate)}`;
  }

  const filename = `${sanitizedDealerName}_${invoice.invoiceNumber}${dateRangePart}.xlsx`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
