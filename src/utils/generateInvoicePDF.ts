// =====================================================
// GENERATE INVOICE PDF
// Created: 2025-10-23
// Updated: 2025-10-31
// Description: Generate professional PDF from invoice data with 7-column table
// =====================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { InvoiceWithDetails } from '@/types/invoices';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

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
 * Format date for PDF display (MM/DD/YYYY)
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Format date for header (MM/DD)
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

// =====================================================
// PDF GENERATION
// =====================================================

/**
 * Generate a professional invoice PDF with 7-column table
 * Uses jsPDF + autoTable for table generation
 */
export async function generateInvoicePDF(invoice: InvoiceWithDetails): Promise<void> {
  // Validate invoice
  if (!invoice || !invoice.invoiceNumber) {
    throw new Error('Invalid invoice data');
  }

  // Create PDF document (Portrait A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // ===== COLORS (Professional palette matching Excel) =====
  const colors = {
    primary: '#111827',      // Gray-900 (text)
    secondary: '#6b7280',    // Gray-500 (labels)
    muted: '#9ca3af',        // Gray-400 (muted text)
    border: '#e5e7eb',       // Gray-200 (borders)
    headerBg: '#6b7280',     // Gray-500 (header background - matches Excel)
    headerText: '#ffffff',   // White (header text)
    zebraStripe: '#f9fafb',  // Gray-50 (zebra stripe)
  };

  // ===== HEADER SECTION (COMPACT) =====
  const leftCol = 20;
  const rightCol = pageWidth - 70;

  // LEFT SIDE
  // "Dealer Detail Service" title (16pt, bold, black)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text('Dealer Detail Service', leftCol, yPosition);

  yPosition += 8;

  // "Bill To:" label
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text('Bill To:', leftCol, yPosition);

  yPosition += 5;

  // Dealer name (12pt, bold)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(invoice.dealership?.name || 'Bmw of Sudbury', leftCol, yPosition);

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

  // RIGHT SIDE - Invoice number and details
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

  rightY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  const vehicleCount = invoice.items?.length || 0;
  doc.text('Total Vehicles:', rightCol, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(vehicleCount.toString(), pageWidth - 20, rightY, { align: 'right' });

  yPosition = Math.max(yPosition, rightY) + 8;

  // Add visual separator line
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);

  yPosition += 8;

  // ===== ITEMS TABLE WITH AUTOTABLE (7 COLUMNS) =====

  // Determine header for column 3 based on order type
  const hasServiceOrders = invoice.items?.some(item => item.metadata?.order_type === 'service');
  const poRoTagHeader = hasServiceOrders ? 'PO/RO/Tag' : 'Stock';

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
      if (item.metadata.po) parts.push(`PO: ${item.metadata.po}`);
      if (item.metadata.ro) parts.push(`RO: ${item.metadata.ro}`);
      if (item.metadata.tag) parts.push(`Tag: ${item.metadata.tag}`);
      poRoTagStock = parts.join('\n');
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

  // Generate table using autoTable
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
      0: { cellWidth: 16, halign: 'center' },                                      // Date
      1: { cellWidth: 22, halign: 'center' },                                      // Order
      2: { cellWidth: 22, halign: 'left' },                                        // PO/RO/Tag or Stock
      3: { cellWidth: 35, halign: 'left' },                                        // Vehicle
      4: { cellWidth: 30, halign: 'center', fontStyle: 'bold', overflow: 'hidden', fontSize: 7 }, // VIN
      5: { cellWidth: 32, halign: 'left' },                                        // Services
      6: { cellWidth: 20, halign: 'right', fontStyle: 'bold' },                    // Amount
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251], // Gray-50 for zebra striping
    },
    showHead: 'everyPage',
    margin: { left: 20, right: 20, bottom: 25 },
    didDrawPage: (data) => {
      const pageHeight = doc.internal.pageSize.height;
      const currentPage = doc.getCurrentPageInfo().pageNumber;
      const totalPages = doc.getNumberOfPages();

      // Add footer separator line
      doc.setDrawColor(colors.border);
      doc.setLineWidth(0.3);
      doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

      // Footer metadata (left side)
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.muted);

      // Generated date and invoice info
      const generatedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      doc.text(`Generated: ${generatedDate}`, 20, pageHeight - 14);
      doc.text(`Invoice: ${invoice.invoiceNumber}`, 20, pageHeight - 10);

      // Page numbers (center)
      if (totalPages > 1) {
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 12,
          { align: 'center' }
        );
      }

      // Dealer name (right side)
      doc.text(
        invoice.dealership?.name || 'My Detail Area',
        pageWidth - 20,
        pageHeight - 12,
        { align: 'right' }
      );
    }
  });

  // Get Y position after table
  // @ts-ignore - autoTable adds lastAutoTable property to jsPDF instance
  const finalY = doc.lastAutoTable?.finalY || yPosition + 50;
  yPosition = finalY + 10;

  // ===== NOTES SECTION (if any) =====
  if (invoice.invoiceNotes) {
    yPosition += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text('Notes:', 20, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    doc.setFontSize(8);
    const noteLines = doc.splitTextToSize(invoice.invoiceNotes, pageWidth - 40);
    doc.text(noteLines, 20, yPosition);
  }

  // Save the PDF
  const filename = `INV-${invoice.invoiceNumber}.pdf`;
  doc.save(filename);
}
