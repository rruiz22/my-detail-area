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
 */
function formatLongDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
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
    headerBg: '#6366F1',
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
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - 20, rightY, { align: 'right' });

  rightY += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Issue Date:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(formatLongDate(invoice.issueDate), pageWidth - 20, rightY, { align: 'right' });

  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Due Date:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(formatLongDate(invoice.dueDate), pageWidth - 20, rightY, { align: 'right' });

  rightY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Total Amount:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(colors.primary);
  doc.text(formatCurrency(invoice.totalAmount), pageWidth - 20, rightY, { align: 'right' });

  yPosition = Math.max(yPosition, rightY) + 8;

  // Separator line
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // Determine header for column 3 based on order type
  const hasServiceOrders = invoice.items?.some(item => item.metadata?.order_type === 'service');
  const poRoTagHeader = hasServiceOrders ? 'PO | RO | Tag' : 'Stock';

  // Prepare table headers
  const tableHeaders = [['Date', 'Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount']];

  // Prepare table data
  const tableData = (invoice.items || []).map(item => {
    // Date (MM/DD)
    const date = formatShortDate(item.createdAt);

    // Order number
    const orderNumber = item.metadata?.order_number || '';

    // PO/RO/Tag or Stock
    let poRoTagStock = '';
    if (item.metadata?.order_type === 'service') {
      const parts = [];
      if (item.metadata.po) parts.push(item.metadata.po);
      if (item.metadata.ro) parts.push(item.metadata.ro);
      if (item.metadata.tag) parts.push(item.metadata.tag);
      poRoTagStock = parts.join(' | ');
    } else {
      poRoTagStock = item.metadata?.stock_number || '';
    }

    // Vehicle description - clean stock number suffix if present
    let vehicle = item.description || '';
    if (vehicle && vehicle.includes(' - ')) {
      vehicle = vehicle.split(' - ')[0].trim();
    }

    // VIN
    const vin = item.metadata?.vehicle_vin || '';

    // Services (service names from metadata)
    const services = item.metadata?.service_names || '';

    // Amount
    const amount = formatCurrency(item.totalAmount);

    return [date, orderNumber, poRoTagStock, vehicle, vin, services, amount];
  });

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: yPosition,
    theme: 'plain',
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: colors.primary,
      lineColor: colors.border,
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: colors.headerBg,
      textColor: colors.headerText,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
      cellPadding: 3.5,
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },                                      // Date
      1: { cellWidth: 18, halign: 'center' },                                      // Order
      2: { cellWidth: 32, halign: 'left', overflow: 'linebreak', fontSize: 7.5 },  // PO/RO/Tag or Stock
      3: { cellWidth: 30, halign: 'left' },                                        // Vehicle
      4: { cellWidth: 28, halign: 'center', fontStyle: 'bold', overflow: 'hidden', fontSize: 7 }, // VIN
      5: { cellWidth: 32, halign: 'left' },                                        // Services
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },                    // Amount
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    showHead: 'everyPage',
    margin: { left: 20, right: 20 },
    didParseCell: (data) => {
      // Reduce font size for PO/RO/Tag header (column 2) to prevent wrapping
      if (data.section === 'head' && data.column.index === 2) {
        data.cell.styles.fontSize = 7.5;
        data.cell.styles.overflow = 'linebreak';
      }
    },
  });

  // Generate filename and return both blob and filename
  const filename = generateFilename(invoice, 'pdf');
  const blob = doc.output('blob');

  return { blob, filename };
}
