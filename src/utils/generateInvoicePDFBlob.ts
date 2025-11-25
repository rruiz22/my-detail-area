// =====================================================
// GENERATE INVOICE PDF BLOB
// Created: 2025-11-03
// Description: Generate PDF as blob for email attachments
// =====================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceWithDetails } from '@/types/invoices';
import { format, parseISO } from 'date-fns';

/**
 * Format currency for PDF display
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
 * Format date for PDF display (MM/DD)
 */
function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

/**
 * Format long date for invoice header (abbreviated month)
 * Automatically handles timezone issues for date-only strings (YYYY-MM-DD)
 */
function formatLongDate(dateString: string): string {
  // If date string is just YYYY-MM-DD (no time component), add noon time to avoid timezone issues
  const dateToFormat = dateString.length === 10 ? dateString + 'T12:00:00' : dateString;
  return new Date(dateToFormat).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Get the correct date for an invoice item based on order type
 */
function getCorrectItemDate(item: any): string {
  const orderType = item.metadata?.order_type;

  if (orderType === 'sales' || orderType === 'service') {
    const dueDate = item.metadata?.due_date;
    const completedAt = item.metadata?.completed_at;
    const createdAt = item.createdAt || item.created_at;

    if (dueDate && dueDate !== 'null' && dueDate !== '') return dueDate;
    if (completedAt && completedAt !== 'null' && completedAt !== '') return completedAt;
    if (createdAt) return createdAt;
  } else if (orderType === 'recon' || orderType === 'carwash') {
    const completedAt = item.metadata?.completed_at;
    const completedDate = item.metadata?.completed_date;
    const createdAt = item.createdAt || item.created_at;

    if (completedAt && completedAt !== 'null' && completedAt !== '') return completedAt;
    if (completedDate && completedDate !== 'null' && completedDate !== '') return completedDate;
    if (createdAt) return createdAt;
  }

  return item.metadata?.completed_at || item.createdAt || item.created_at || '';
}

/**
 * Generate filename with dealer name, invoice number, department, and date range
 */
function generateFilename(invoice: InvoiceWithDetails, extension: string): string {
  const dealerName = invoice.dealership?.name || 'Invoice';
  const sanitizedDealerName = dealerName.replace(/[^a-zA-Z0-9]/g, '_');

  const invoiceNum = invoice.invoiceNumber || invoice.invoice_number || 'undefined';

  // Department part
  let deptPart = '';
  const departments = invoice.metadata?.departments;
  if (departments && departments.length > 0) {
    if (departments.length === 1) {
      // Single department: "Service-Dept", "Sales-Dept", etc.
      const dept = departments[0].charAt(0).toUpperCase() + departments[0].slice(1);
      deptPart = `_${dept}-Dept`;
    } else {
      // Multiple departments: "Multi-Dept"
      deptPart = '_Multi-Dept';
    }
  }

  // Date range part
  let dateRangePart = '';
  if (invoice.metadata?.filter_date_range) {
    // Parse dates with explicit noon time to avoid timezone issues
    const startDate = new Date(invoice.metadata.filter_date_range.start + 'T12:00:00');
    const endDate = new Date(invoice.metadata.filter_date_range.end + 'T12:00:00');

    const formatDateLong = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(date);
    };

    dateRangePart = `_${formatDateLong(startDate)}_to_${formatDateLong(endDate)}`;
  }

  return `${sanitizedDealerName}_${invoiceNum}${deptPart}${dateRangePart}.${extension}`;
}

/**
 * Generate invoice PDF and return as Blob with filename
 */
export async function generateInvoicePDFBlob(invoice: InvoiceWithDetails): Promise<{ blob: Blob; filename: string }> {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // Colors
  const colors = {
    primary: '#111827',
    secondary: '#6b7280',
    muted: '#9ca3af',
    border: '#e5e7eb',
    headerBg: '#6B7280',      // Gray-500 (print friendly) - matches download PDF
    headerText: '#ffffff',
    zebraStripe: '#f9fafb',
  };

  // Header Section
  const leftCol = 20;
  const rightCol = pageWidth - 70;

  // Company name
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text('Dealer Detail Service', leftCol, yPosition);
  yPosition += 8;

  // Bill To
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text('Bill To:', leftCol, yPosition);
  yPosition += 5;

  // Dealer name
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(invoice.dealership?.name || 'N/A', leftCol, yPosition);
  yPosition += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  if (invoice.dealership?.address) {
    doc.text(invoice.dealership.address, leftCol, yPosition);
    yPosition += 4;
  }
  if (invoice.dealership?.email) {
    doc.text(`Email: ${invoice.dealership.email}`, leftCol, yPosition);
  }

  // Right side - Invoice details
  let rightY = 20;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  const invoiceNum = invoice.invoiceNumber || invoice.invoice_number || 'undefined';
  doc.text(`#${invoiceNum}`, pageWidth - 20, rightY, { align: 'right' });

  rightY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Issue Date:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  const issueDate = invoice.issueDate || invoice.issue_date;
  doc.text(formatLongDate(issueDate), pageWidth - 20, rightY, { align: 'right' });

  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Due Date:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  const dueDate = invoice.dueDate || invoice.due_date;
  doc.text(formatLongDate(dueDate), pageWidth - 20, rightY, { align: 'right' });

  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Total Amount:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(colors.primary);
  const totalAmount = invoice.totalAmount || invoice.total_amount;
  doc.text(formatCurrency(totalAmount), pageWidth - 20, rightY, { align: 'right' });

  yPosition = Math.max(yPosition, rightY) + 8;

  // Separator line
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // Determine header for column 3 based on order type
  const hasServiceOrders = invoice.items?.some(item => item.metadata?.order_type === 'service');
  const poRoTagHeader = hasServiceOrders ? 'PO | RO | Tag' : 'Stock';

  // Prepare table headers (with # column)
  const tableHeaders = [['#', 'Date / Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount']];

  // Sort items by date (ascending) - using correct date based on order type
  const sortedItems = (invoice.items || []).sort((a, b) => {
    const dateA = getCorrectItemDate(a);
    const dateB = getCorrectItemDate(b);
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  // Group items by date
  const groupedByDate: { date: string; items: any[] }[] = [];
  let currentDate = '';
  let currentGroup: any[] = [];

  sortedItems.forEach((item, index) => {
    const itemDate = formatShortDate(getCorrectItemDate(item));

    if (itemDate !== currentDate) {
      if (currentGroup.length > 0) {
        groupedByDate.push({ date: currentDate, items: currentGroup });
      }
      currentDate = itemDate;
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }

    // Last group
    if (index === sortedItems.length - 1) {
      groupedByDate.push({ date: currentDate, items: currentGroup });
    }
  });

  // Build table data with separators
  const tableData: any[] = [];
  let orderCounter = 1; // Initialize order counter for # column

  groupedByDate.forEach((group, groupIndex) => {
    group.items.forEach(item => {
      // Order number (sequential numbering for # column)
      const orderNum = orderCounter.toString();
      orderCounter++;

      // Date (MM/DD) - Use correct date based on order type
      const date = formatShortDate(getCorrectItemDate(item));

      // Order number from metadata
      const orderNumber = item.metadata?.order_number || '';

      // Combine Date and Order in one cell
      const dateOrderCell = `${date}\n${orderNumber}`;

      // PO/RO/Tag or Stock
      let poRoTagStock = '';
      if (item.metadata?.order_type === 'service') {
        const parts = [];
        if (item.metadata.po) parts.push(item.metadata.po);
        if (item.metadata.ro) parts.push(item.metadata.ro);
        if (item.metadata.tag) parts.push(item.metadata.tag);
        poRoTagStock = parts.join(' | ');
      } else if (item.metadata?.order_type === 'carwash') {
        poRoTagStock = item.metadata?.stock_number || item.metadata?.tag || '';
      } else {
        poRoTagStock = item.metadata?.stock_number || '';
      }

      // Vehicle description - clean stock number suffix if present
      let vehicle = item.description || '';
      if (vehicle && vehicle.includes(' - ')) {
        vehicle = vehicle.split(' - ')[0].trim();
      }

      // Truncate vehicle name if longer than 17 characters
      if (vehicle.length > 17) {
        vehicle = vehicle.substring(0, 17) + '...';
      }

      // VIN
      const vin = item.metadata?.vehicle_vin || '';

      // Services (service names from metadata)
      const services = item.metadata?.service_names || '';

      // Amount - Support both camelCase and snake_case
      const totalAmount = item.totalAmount || item.total_amount || 0;
      const amount = formatCurrency(totalAmount);

      tableData.push([orderNum, dateOrderCell, poRoTagStock, vehicle, vin, services, amount]);
    });

    // Add separator row with date after each group (except last)
    if (groupIndex < groupedByDate.length - 1) {
      const nextGroupDate = groupedByDate[groupIndex + 1].date;
      tableData.push([
        {
          content: nextGroupDate,
          colSpan: 7, // 7 columns total (including # column)
          styles: {
            fillColor: '#E5E7EB',
            minCellHeight: 6,
            halign: 'center',
            valign: 'middle',
            fontSize: 8,
            fontStyle: 'bold',
            textColor: '#6B7280'
          }
        }
      ]);
    }
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: yPosition,
    theme: 'plain',
    rowPageBreak: 'avoid', // Prevent rows from breaking across pages
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: colors.primary,
      lineColor: colors.border,
      lineWidth: 0.1,
      overflow: 'visible',
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: colors.headerBg,
      textColor: colors.headerText,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'visible',
      minCellHeight: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold', fontSize: 8 },     // # (Order Number)
      1: { cellWidth: 20, halign: 'center', fontSize: 7, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 } },  // Date / Order (combined, compact)
      2: { cellWidth: 32, halign: 'left', overflow: 'visible', fontSize: 6.5 },   // PO/RO/Tag or Stock
      3: { cellWidth: 27, halign: 'left', overflow: 'visible', fontSize: 7 },     // Vehicle - Truncated, no wrap
      4: { cellWidth: 37, halign: 'center', fontStyle: 'bold', overflow: 'visible', fontSize: 7 }, // VIN - No wrap, inline
      5: { cellWidth: 27, halign: 'left', fontSize: 7.5 },                        // Services
      6: { cellWidth: 17, halign: 'right', fontStyle: 'bold', fontSize: 8 },      // Amount
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    showHead: 'everyPage',
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      // Force no wrap for ALL headers
      if (data.section === 'head') {
        data.cell.styles.overflow = 'visible';
        data.cell.styles.fontSize = 8;
        // Special handling for smaller headers
        if (data.column.index === 2) {
          data.cell.styles.fontSize = 7; // PO | RO | Tag header smaller
        }
        if (data.column.index === 4) {
          data.cell.styles.fontSize = 7.5; // VIN header smaller
        }
      }

      // Force no wrap for critical columns that need inline display
      if (data.section === 'body') {
        // Order number column (#) - column 0
        if (data.column.index === 0) {
          data.cell.styles.overflow = 'visible';
          data.cell.styles.fontStyle = 'bold';
        }
        // Date/Order combined column - column 1
        if (data.column.index === 1) {
          data.cell.styles.overflow = 'visible';
          data.cell.styles.fontSize = 7;
          data.cell.styles.cellPadding = { top: 1, bottom: 1, left: 2, right: 2 };
          data.cell.styles.lineHeight = 1.1;
        }
        // Stock/PO/RO column - column 2
        if (data.column.index === 2) {
          data.cell.styles.overflow = 'visible';
          data.cell.styles.fontSize = 6.5;
        }
        // Vehicle column - column 3 (truncated, no wrap)
        if (data.column.index === 3) {
          data.cell.styles.overflow = 'visible';
          data.cell.styles.fontSize = 7;
        }
        // VIN column (column 4) - FORCE inline, no wrapping
        if (data.column.index === 4) {
          data.cell.styles.overflow = 'visible';
          data.cell.styles.fontSize = 7;
          data.cell.styles.fontStyle = 'bold';
        }
      }

      // Style separator rows (rows with colSpan: 7) - styles already set in tableData
      if (data.section === 'body' && data.cell.raw && typeof data.cell.raw === 'object' && data.cell.raw.colSpan === 7) {
        // Styles are already applied in the tableData definition above
      }
    },
  });

  // Generate filename and return both blob and filename
  const filename = generateFilename(invoice, 'pdf');
  const blob = doc.output('blob');

  return { blob, filename };
}
