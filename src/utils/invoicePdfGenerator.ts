/**
 * Professional Invoice PDF Generator
 *
 * Generates professional-looking invoice PDFs with dealership branding
 * using jsPDF and jsPDF-AutoTable.
 *
 * Design System: Notion-style (gray scale, muted accents, NO gradients)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface InvoiceData {
  // Invoice metadata
  invoice_number: string;
  invoice_date: string;  // ISO date string
  due_date: string;      // ISO date string

  // Client information
  client_name: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;

  // Dealership information
  dealership_name: string;
  dealership_address?: string;
  dealership_phone?: string;
  dealership_email?: string;

  // Line items
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }[];

  // Financial totals
  subtotal: number;
  tax_rate: number;      // Percentage (e.g., 8.5)
  tax_amount: number;
  total_amount: number;

  // Optional fields
  notes?: string;
  payment_terms?: string;
  status?: string;
}

/**
 * Generates a professional invoice PDF
 * @param invoice - Invoice data to generate PDF from
 * @returns jsPDF instance ready for download/preview
 */
export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  // Initialize PDF (Letter size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter' // 216mm x 279mm
  });

  // Notion-style color palette (NO gradients, muted colors)
  const colors = {
    primary: '#111827',      // Gray-900 for headings
    secondary: '#374151',    // Gray-700 for text
    muted: '#6b7280',        // Gray-500 for secondary text
    border: '#e5e7eb',       // Gray-200 for borders
    background: '#f9fafb',   // Gray-50 for alternating rows
    accent: '#10b981',       // Emerald-500 for accents (muted green)
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20; // 20mm margins

  let yPosition = margin;

  // ===================================================================
  // HEADER SECTION
  // ===================================================================

  // "INVOICE" title (large, bold)
  doc.setFontSize(32);
  doc.setTextColor(colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, yPosition);

  // Invoice number and status (top right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  const invoiceNumText = `Invoice #${invoice.invoice_number}`;
  const invoiceNumWidth = doc.getTextWidth(invoiceNumText);
  doc.text(invoiceNumText, pageWidth - margin - invoiceNumWidth, yPosition);

  if (invoice.status) {
    yPosition += 6;
    const statusText = invoice.status.toUpperCase();
    const statusWidth = doc.getTextWidth(statusText);

    // Status badge with color
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    const statusColors: Record<string, string> = {
      'paid': '#10b981',    // Green
      'pending': '#3b82f6', // Blue
      'overdue': '#ef4444', // Red
      'draft': '#6b7280',   // Gray
      'cancelled': '#ef4444' // Red
    };

    const statusColor = statusColors[invoice.status.toLowerCase()] || colors.muted;
    doc.setTextColor(statusColor);
    doc.text(statusText, pageWidth - margin - statusWidth, yPosition);
  }

  yPosition = margin + 12;

  // ===================================================================
  // DEALERSHIP INFORMATION (Left side)
  // ===================================================================

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(invoice.dealership_name, margin, yPosition);

  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.muted);

  if (invoice.dealership_address) {
    doc.text(invoice.dealership_address, margin, yPosition);
    yPosition += 4;
  }

  if (invoice.dealership_phone) {
    doc.text(`Phone: ${invoice.dealership_phone}`, margin, yPosition);
    yPosition += 4;
  }

  if (invoice.dealership_email) {
    doc.text(`Email: ${invoice.dealership_email}`, margin, yPosition);
    yPosition += 4;
  }

  // ===================================================================
  // INVOICE DATES (Right side)
  // ===================================================================

  const rightColumnX = pageWidth - margin - 60;
  let rightYPosition = margin + 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text('Invoice Date:', rightColumnX, rightYPosition);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.primary);
  const formattedInvoiceDate = format(new Date(invoice.invoice_date), 'MMM dd, yyyy');
  doc.text(formattedInvoiceDate, rightColumnX + 25, rightYPosition);

  rightYPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text('Due Date:', rightColumnX, rightYPosition);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.primary);
  const formattedDueDate = format(new Date(invoice.due_date), 'MMM dd, yyyy');
  doc.text(formattedDueDate, rightColumnX + 25, rightYPosition);

  // ===================================================================
  // BILL TO SECTION
  // ===================================================================

  yPosition = Math.max(yPosition, rightYPosition) + 12;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text('BILL TO:', margin, yPosition);

  yPosition += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text(invoice.client_name, margin, yPosition);

  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.muted);

  if (invoice.client_address) {
    // Handle multi-line addresses
    const addressLines = doc.splitTextToSize(invoice.client_address, 80);
    doc.text(addressLines, margin, yPosition);
    yPosition += addressLines.length * 4;
  }

  if (invoice.client_email) {
    doc.text(`Email: ${invoice.client_email}`, margin, yPosition);
    yPosition += 4;
  }

  if (invoice.client_phone) {
    doc.text(`Phone: ${invoice.client_phone}`, margin, yPosition);
    yPosition += 4;
  }

  yPosition += 8;

  // ===================================================================
  // LINE ITEMS TABLE
  // ===================================================================

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: invoice.items.map(item => [
      item.description,
      item.quantity.toString(),
      `$${item.unit_price.toFixed(2)}`,
      `$${item.total.toFixed(2)}`
    ]),
    theme: 'plain',
    headStyles: {
      fillColor: [249, 250, 251],  // Gray-50 background
      textColor: [55, 65, 81],      // Gray-700 text
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 },
      lineWidth: 0.1,
      lineColor: [229, 231, 235]    // Gray-200 border
    },
    bodyStyles: {
      textColor: [55, 65, 81],      // Gray-700
      fontSize: 9,
      cellPadding: { top: 4, right: 3, bottom: 4, left: 3 }
    },
    columnStyles: {
      0: { cellWidth: 'auto' },     // Description - flexible
      1: { cellWidth: 20, halign: 'center' },  // Qty - centered
      2: { cellWidth: 30, halign: 'right' },   // Unit Price - right-aligned
      3: { cellWidth: 30, halign: 'right' }    // Total - right-aligned
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]    // Gray-50 for alternating rows
    },
    styles: {
      lineWidth: 0.1,
      lineColor: [229, 231, 235]    // Gray-200 borders
    },
    margin: { left: margin, right: margin }
  });

  // Get position after table
  yPosition = (doc as any).lastAutoTable.finalY + 5;

  // ===================================================================
  // TOTALS SECTION (Right-aligned)
  // ===================================================================

  const totalsX = pageWidth - margin - 60;
  const labelX = totalsX;
  const amountX = pageWidth - margin;

  // Subtotal
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Subtotal:', labelX, yPosition, { align: 'left' });
  doc.text(`$${invoice.subtotal.toFixed(2)}`, amountX, yPosition, { align: 'right' });

  yPosition += 5;

  // Tax
  const taxLabel = invoice.tax_rate > 0
    ? `Tax (${invoice.tax_rate.toFixed(2)}%):`
    : 'Tax:';
  doc.text(taxLabel, labelX, yPosition, { align: 'left' });
  doc.text(`$${invoice.tax_amount.toFixed(2)}`, amountX, yPosition, { align: 'right' });

  yPosition += 5;

  // Horizontal line before total
  doc.setDrawColor(colors.border);
  doc.setLineWidth(0.3);
  doc.line(totalsX, yPosition, pageWidth - margin, yPosition);

  yPosition += 5;

  // Total (bold, larger)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text('TOTAL:', labelX, yPosition, { align: 'left' });
  doc.text(`$${invoice.total_amount.toFixed(2)}`, amountX, yPosition, { align: 'right' });

  yPosition += 10;

  // ===================================================================
  // NOTES SECTION
  // ===================================================================

  if (invoice.notes) {
    yPosition += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text('Notes:', margin, yPosition);

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);

    const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - (margin * 2));
    doc.text(notesLines, margin, yPosition);
    yPosition += notesLines.length * 4;
  }

  // ===================================================================
  // PAYMENT TERMS SECTION
  // ===================================================================

  if (invoice.payment_terms) {
    yPosition += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text('Payment Terms:', margin, yPosition);

    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);

    const termsLines = doc.splitTextToSize(invoice.payment_terms, pageWidth - (margin * 2));
    doc.text(termsLines, margin, yPosition);
    yPosition += termsLines.length * 4;
  }

  // ===================================================================
  // FOOTER
  // ===================================================================

  const footerY = pageHeight - margin;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(colors.muted);

  const footerText = 'Thank you for your business!';
  const footerWidth = doc.getTextWidth(footerText);
  doc.text(footerText, (pageWidth - footerWidth) / 2, footerY);

  return doc;
}

/**
 * Downloads the invoice PDF with a formatted filename
 * @param invoice - Invoice data
 * @param doc - jsPDF document (optional, will generate if not provided)
 */
export function downloadInvoicePDF(invoice: InvoiceData, doc?: jsPDF): void {
  const pdf = doc || generateInvoicePDF(invoice);
  const filename = `Invoice_${invoice.invoice_number}.pdf`;
  pdf.save(filename);
}

/**
 * Opens the invoice PDF in a new browser tab for preview
 * @param invoice - Invoice data
 * @param doc - jsPDF document (optional, will generate if not provided)
 */
export function previewInvoicePDF(invoice: InvoiceData, doc?: jsPDF): void {
  const pdf = doc || generateInvoicePDF(invoice);
  const pdfBlob = pdf.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}

/**
 * Gets the PDF as a Blob for email attachments or uploads
 * @param invoice - Invoice data
 * @param doc - jsPDF document (optional, will generate if not provided)
 * @returns PDF as Blob
 */
export function getInvoicePDFBlob(invoice: InvoiceData, doc?: jsPDF): Blob {
  const pdf = doc || generateInvoicePDF(invoice);
  return pdf.output('blob');
}
