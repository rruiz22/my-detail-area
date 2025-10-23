// =====================================================
// GENERATE INVOICE PDF
// Created: 2025-10-23
// Description: Generate professional PDF from invoice data
// =====================================================

import jsPDF from 'jspdf';
import type { Invoice } from '@/types/invoices';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  discountAmount?: number;
}

interface GeneratePDFOptions {
  invoice: Invoice;
  items?: InvoiceItem[];
  dealershipName?: string;
  dealershipAddress?: string;
  dealershipEmail?: string;
  dealershipPhone?: string;
  dealershipLogo?: string;
}

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
 * Format date for PDF display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Generate a professional invoice PDF
 * Uses jsPDF for direct PDF generation (no HTML rendering)
 */
export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<void> {
  const {
    invoice,
    items = [],
    dealershipName = 'My Detail Area',
    dealershipAddress,
    dealershipEmail,
    dealershipPhone,
  } = options;

  // Create PDF document (A4 size)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Colors (Notion-style muted palette)
  const colors = {
    primary: '#111827',      // Gray-900
    secondary: '#6b7280',    // Gray-500
    muted: '#9ca3af',        // Gray-400
    border: '#e5e7eb',       // Gray-200
    accent: '#10b981'        // Emerald-500
  };

  // Helper function to add text with word wrap
  const addText = (
    text: string,
    x: number,
    y: number,
    options?: {
      maxWidth?: number;
      align?: 'left' | 'center' | 'right';
      fontSize?: number;
      fontStyle?: 'normal' | 'bold';
      color?: string;
    }
  ) => {
    const fontSize = options?.fontSize || 10;
    const fontStyle = options?.fontStyle || 'normal';
    const color = options?.color || colors.primary;
    const align = options?.align || 'left';
    const maxWidth = options?.maxWidth || pageWidth - 2 * margin;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color);

    const lines = doc.splitTextToSize(text, maxWidth);

    if (align === 'center') {
      doc.text(lines, x, y, { align: 'center' });
    } else if (align === 'right') {
      doc.text(lines, x, y, { align: 'right' });
    } else {
      doc.text(lines, x, y);
    }

    return y + (lines.length * fontSize * 0.35);
  };

  // Helper to draw horizontal line
  const addLine = (y: number, color: string = colors.border) => {
    doc.setDrawColor(color);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 5;
  };

  // ===== HEADER SECTION =====
  doc.setFillColor(colors.primary);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Company name
  doc.setTextColor('#ffffff');
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(dealershipName, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('INVOICE', pageWidth / 2, 30, { align: 'center' });

  yPosition = 50;

  // ===== INVOICE INFO SECTION =====
  doc.setTextColor(colors.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice Information', margin, yPosition);
  yPosition += 7;

  // Invoice details box
  doc.setDrawColor(colors.border);
  doc.setFillColor('#f9fafb');
  doc.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(colors.secondary);
  doc.setFont('helvetica', 'normal');

  const leftCol = margin + 5;
  const rightCol = pageWidth / 2 + 5;
  let infoY = yPosition + 7;

  // Left column
  doc.text('Invoice Number:', leftCol, infoY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(invoice.invoiceNumber, leftCol + 35, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Issue Date:', leftCol, infoY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(formatDate(invoice.issueDate), leftCol + 35, infoY);

  infoY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text('Due Date:', leftCol, infoY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(formatDate(invoice.dueDate), leftCol + 35, infoY);

  // Right column
  infoY = yPosition + 7;
  if (invoice.order?.customerName) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    doc.text('Customer:', rightCol, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text(invoice.order.customerName, rightCol + 25, infoY);
    infoY += 6;
  }

  if (invoice.order?.orderNumber || invoice.order?.customOrderNumber) {
    const orderNum = invoice.order.customOrderNumber || invoice.order.orderNumber || '';
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    doc.text('Order Number:', rightCol, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text(orderNum, rightCol + 25, infoY);
    infoY += 6;
  }

  // Vehicle info if available
  if (invoice.order?.vehicleMake) {
    const vehicleInfo = `${invoice.order.vehicleYear || ''} ${invoice.order.vehicleMake} ${invoice.order.vehicleModel || ''}`.trim();
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    doc.text('Vehicle:', rightCol, infoY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text(vehicleInfo, rightCol + 25, infoY);
  }

  yPosition += 35;

  // ===== ITEMS TABLE =====
  yPosition += 5;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text('Invoice Items', margin, yPosition);
  yPosition += 7;

  // Table header
  doc.setFillColor('#f3f4f6');
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);

  const descCol = margin + 2;
  const qtyCol = pageWidth - margin - 70;
  const priceCol = pageWidth - margin - 45;
  const totalCol = pageWidth - margin - 20;

  doc.text('Description', descCol, yPosition + 5);
  doc.text('Qty', qtyCol, yPosition + 5);
  doc.text('Price', priceCol, yPosition + 5);
  doc.text('Total', totalCol, yPosition + 5, { align: 'right' });

  yPosition += 10;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.primary);

  items.forEach((item, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = margin;
    }

    const itemY = yPosition;

    // Description (wrapped if needed)
    const descLines = doc.splitTextToSize(item.description, qtyCol - descCol - 5);
    doc.text(descLines, descCol, itemY);

    // Quantity
    doc.text(item.quantity.toString(), qtyCol, itemY);

    // Unit price
    doc.text(formatCurrency(item.unitPrice), priceCol, itemY);

    // Total
    doc.text(formatCurrency(item.totalAmount), totalCol, itemY, { align: 'right' });

    yPosition += Math.max(6, descLines.length * 4);

    // Border line
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 2;
  });

  // ===== TOTALS SECTION =====
  yPosition += 5;

  const totalsX = pageWidth - margin - 60;
  const valuesX = pageWidth - margin - 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);

  // Subtotal
  doc.text('Subtotal:', totalsX, yPosition);
  doc.setTextColor(colors.primary);
  doc.text(formatCurrency(invoice.subtotal), valuesX, yPosition, { align: 'right' });
  yPosition += 6;

  // Discount (if any)
  if (invoice.discountAmount && invoice.discountAmount > 0) {
    doc.setTextColor(colors.secondary);
    doc.text('Discount:', totalsX, yPosition);
    doc.setTextColor(colors.primary);
    doc.text(`-${formatCurrency(invoice.discountAmount)}`, valuesX, yPosition, { align: 'right' });
    yPosition += 6;
  }

  // Tax
  doc.setTextColor(colors.secondary);
  doc.text(`Tax (${invoice.taxRate}%):`, totalsX, yPosition);
  doc.setTextColor(colors.primary);
  doc.text(formatCurrency(invoice.taxAmount), valuesX, yPosition, { align: 'right' });
  yPosition += 8;

  // Total line
  doc.setDrawColor(colors.primary);
  doc.setLineWidth(1);
  doc.line(totalsX, yPosition, pageWidth - margin, yPosition);
  yPosition += 6;

  // Total amount
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text('Total Amount:', totalsX, yPosition);
  doc.text(formatCurrency(invoice.totalAmount), valuesX, yPosition, { align: 'right' });

  // Amount Due (if different from total)
  if (invoice.amountDue > 0 && invoice.amountDue !== invoice.totalAmount) {
    yPosition += 10;

    doc.setFillColor('#fef3c7');
    doc.roundedRect(margin, yPosition - 5, pageWidth - 2 * margin, 20, 2, 2, 'F');

    doc.setFontSize(10);
    doc.setTextColor(colors.secondary);
    doc.text('Amount Due:', margin + 5, yPosition + 3);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#78350f');
    doc.text(formatCurrency(invoice.amountDue), pageWidth - margin - 5, yPosition + 3, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    doc.text(`Due by ${formatDate(invoice.dueDate)}`, margin + 5, yPosition + 10);

    yPosition += 25;
  }

  // ===== FOOTER SECTION =====
  yPosition = pageHeight - 40;

  // Dealership info
  if (dealershipAddress || dealershipEmail || dealershipPhone) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text(dealershipName, margin, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    doc.setFontSize(8);

    if (dealershipAddress) {
      doc.text(dealershipAddress, margin, yPosition);
      yPosition += 4;
    }
    if (dealershipEmail) {
      doc.text(`Email: ${dealershipEmail}`, margin, yPosition);
      yPosition += 4;
    }
    if (dealershipPhone) {
      doc.text(`Phone: ${dealershipPhone}`, margin, yPosition);
    }
  }

  // Notes section (if any)
  if (invoice.invoiceNotes) {
    yPosition = pageHeight - 55;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text('Notes:', margin, yPosition);
    yPosition += 4;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    const noteLines = doc.splitTextToSize(invoice.invoiceNotes, pageWidth - 2 * margin);
    doc.text(noteLines, margin, yPosition);
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.muted);
  doc.text('Powered by My Detail Area', pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  const filename = `INV-${invoice.invoiceNumber}.pdf`;
  doc.save(filename);
}
