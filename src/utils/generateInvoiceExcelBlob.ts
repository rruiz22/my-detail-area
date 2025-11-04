// =====================================================
// GENERATE INVOICE EXCEL BLOB
// Created: 2025-11-03
// Description: Generate Excel as blob for email attachments
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
 * Format date for Excel display (MM/dd)
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
 * Generate filename with dealer name and date range
 */
function generateFilename(invoice: InvoiceWithDetails, extension: string): string {
  const dealerName = invoice.dealership?.name || 'Invoice';
  const sanitizedDealerName = dealerName.replace(/[^a-zA-Z0-9]/g, '_');

  let dateRangePart = '';
  if (invoice.metadata?.filter_date_range) {
    const startDate = new Date(invoice.metadata.filter_date_range.start);
    const endDate = new Date(invoice.metadata.filter_date_range.end);

    const formatDateLong = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    };

    dateRangePart = `_${formatDateLong(startDate)}_to_${formatDateLong(endDate)}`;
  }

  return `${sanitizedDealerName}_${invoice.invoiceNumber}${dateRangePart}.${extension}`;
}

/**
 * Generate Excel file and return as Blob with filename
 */
export async function generateInvoiceExcelBlob(invoice: InvoiceWithDetails): Promise<{ blob: Blob; filename: string }> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dealer Detail Service LLC';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Invoice', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  const colors = {
    headerBg: 'FF6366F1',
    headerText: 'FFFFFFFF',
    titleText: 'FF111827',
    labelText: 'FF6B7280',
    valueText: 'FF000000',
    totalsBg: 'FFF3F4F6',
    zebraStripe: 'FFF9FAFB',
    borderLight: 'FFE5E7EB',
    borderDark: 'FF9CA3AF'
  };

  worksheet.columns = [
    { key: 'date', width: 12 },
    { key: 'order', width: 10 },
    { key: 'po_ro_tag', width: 15 },
    { key: 'vehicle', width: 20 },
    { key: 'vin', width: 18 },
    { key: 'services', width: 30 },
    { key: 'amount', width: 12 }
  ];

  let currentRow = 1;

  // Title Row
  const titleRow = worksheet.getRow(currentRow);
  titleRow.height = 30;
  titleRow.getCell(1).value = 'Dealer Detail Service';
  titleRow.getCell(1).font = { name: 'Calibri', size: 16, bold: true, color: { argb: colors.titleText } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);

  titleRow.getCell(7).value = `#${invoice.invoiceNumber}`;
  titleRow.getCell(7).font = { name: 'Calibri', size: 18, bold: true, color: { argb: colors.titleText } };
  titleRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };

  currentRow += 2;

  // Bill To / Invoice Details
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
  currentRow += 2;

  // Determine header for column 3 based on order type
  const hasServiceOrders = invoice.items?.some(item => item.metadata?.order_type === 'service');
  const poRoTagHeader = hasServiceOrders ? 'PO | RO | Tag' : 'Stock';

  // Table Header
  const headerRow = worksheet.getRow(currentRow);
  headerRow.height = 22;
  headerRow.values = ['Date', 'Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount'];

  headerRow.eachCell((cell) => {
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

  // Table Data
  (invoice.items || []).forEach((item, index) => {
    const row = worksheet.getRow(currentRow);
    row.height = 20;

    const dateStr = formatDate(item.createdAt);
    const orderNum = item.metadata?.order_number || 'N/A';

    // PO/RO/Tag or Stock based on order type
    let poRoTagStock = 'N/A';
    if (item.metadata?.order_type === 'service') {
      const parts = [];
      if (item.metadata.po) parts.push(item.metadata.po);
      if (item.metadata.ro) parts.push(item.metadata.ro);
      if (item.metadata.tag) parts.push(item.metadata.tag);
      poRoTagStock = parts.length > 0 ? parts.join(' | ') : 'N/A';
    } else {
      poRoTagStock = item.metadata?.stock_number || 'N/A';
    }

    // Vehicle description - clean stock number suffix if present
    let vehicle = item.description || 'N/A';
    if (vehicle !== 'N/A' && vehicle.includes(' - ')) {
      vehicle = vehicle.split(' - ')[0].trim();
    }

    const vin = item.metadata?.vehicle_vin || 'N/A';
    const services = item.metadata?.service_names || 'N/A';

    row.getCell(1).value = dateStr;
    row.getCell(2).value = orderNum;
    row.getCell(3).value = poRoTagStock;
    row.getCell(4).value = vehicle;
    row.getCell(5).value = vin;
    row.getCell(6).value = services;
    row.getCell(7).value = item.totalAmount;
    row.getCell(7).numFmt = '$#,##0.00';

    const fillColor = index % 2 === 0 ? 'FFFFFFFF' : colors.zebraStripe;

    row.eachCell((cell) => {
      cell.font = {
        name: 'Calibri',
        size: 9,
        color: { argb: colors.valueText }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor }
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: cell.col === 1 || cell.col === 2 ? 'center' : cell.col === 7 ? 'right' : 'left',
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

  // Generate filename and return both blob and filename
  const filename = generateFilename(invoice, 'xlsx');
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  return { blob, filename };
}
