/**
 * INVOICE PDF TEMPLATE - Professional Notion-Style Design
 * Created: 2025-01-18
 * Description: Enterprise invoice template with clean, minimal design
 *
 * Features:
 * - Professional header with dealership branding
 * - Invoice metadata (invoice #, dates, billing info)
 * - Auto-paginated line items table
 * - Summary box with subtotal, tax, total
 * - Professional footer with page numbers
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_DESIGN } from '../pdfDesignSystem';
import {
  addHeaderSection,
  addInvoiceTitle,
  addMetadata,
  addSummaryBox,
  addFooter,
  addDivider,
  formatCurrency,
  formatLongDate,
  formatShortDate,
  applyFont,
  applyTextColor,
  checkPageOverflow,
  type DealershipInfo,
} from '../pdfHelpers';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date?: string;
  orderNumber?: string;
  stockNumber?: string;
  vin?: string;
  services?: string;
}

export interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string;
  issueDate: string | Date;
  dueDate: string | Date;

  // Billing information
  billTo: {
    name: string;
    address?: string;
    email?: string;
    phone?: string;
  };

  // Line items
  items: InvoiceLineItem[];

  // Totals
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;

  // Optional
  notes?: string;
  terms?: string;
  department?: string;
  serviceperiod?: {
    start: string | Date;
    end: string | Date;
  };
}

export interface InvoiceTemplateOptions {
  dealershipInfo: DealershipInfo;
  invoiceData: InvoiceData;
  showLogo?: boolean;
  customColors?: {
    accentColor?: [number, number, number];
  };
}

// =====================================================
// INVOICE TEMPLATE GENERATOR
// =====================================================

/**
 * Generate professional invoice PDF with Notion-style design
 */
export async function generateInvoicePDF(
  options: InvoiceTemplateOptions
): Promise<jsPDF> {
  const { dealershipInfo, invoiceData, showLogo = false, customColors } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = PDF_DESIGN.margins.top;

  // ===== HEADER SECTION =====
  currentY = addHeaderSection(doc, {
    dealershipInfo,
    showLogo,
    showContact: true,
    yPosition: currentY,
  });

  // ===== INVOICE TITLE =====
  // Centered "INVOICE" with gray background box
  const boxHeight = 12;
  const titleY = currentY;

  // Background box
  const bgColor = PDF_DESIGN.colors.gray[100].rgb;
  doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
  doc.rect(
    PDF_DESIGN.margins.left,
    titleY - 8,
    pageWidth - PDF_DESIGN.margins.left - PDF_DESIGN.margins.right,
    boxHeight,
    'F'
  );

  // Title text
  const accentColor = customColors?.accentColor || PDF_DESIGN.colors.emerald[600].rgb;
  applyFont(doc, PDF_DESIGN.typography.title);
  applyTextColor(doc, accentColor);
  doc.text('INVOICE', pageWidth / 2, titleY, { align: 'center' });

  currentY = titleY + boxHeight - 4;

  // ===== INVOICE METADATA (2-COLUMN LAYOUT) =====
  const leftColX = PDF_DESIGN.margins.left;
  const rightColX = pageWidth - 70;

  // LEFT COLUMN - Bill To
  let leftY = currentY;
  applyFont(doc, PDF_DESIGN.typography.h4);
  applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
  doc.text('Bill To:', leftColX, leftY);
  leftY += 6;

  applyFont(doc, PDF_DESIGN.typography.bodyBold);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(invoiceData.billTo.name, leftColX, leftY);
  leftY += 5;

  if (invoiceData.billTo.address) {
    applyFont(doc, PDF_DESIGN.typography.small);
    applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
    doc.text(invoiceData.billTo.address, leftColX, leftY);
    leftY += 4;
  }

  const contactParts: string[] = [];
  if (invoiceData.billTo.phone) contactParts.push(invoiceData.billTo.phone);
  if (invoiceData.billTo.email) contactParts.push(invoiceData.billTo.email);
  if (contactParts.length > 0) {
    doc.text(contactParts.join(' | '), leftColX, leftY);
    leftY += 4;
  }

  // Department (if provided)
  if (invoiceData.department) {
    leftY += 2;
    applyFont(doc, PDF_DESIGN.typography.caption);
    applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
    doc.text('Department:', leftColX, leftY);
    leftY += 4;

    applyFont(doc, PDF_DESIGN.typography.bodyBold);
    applyTextColor(doc, PDF_DESIGN.colors.gray[700].rgb);
    doc.text(invoiceData.department, leftColX, leftY);
  }

  // RIGHT COLUMN - Invoice Details
  let rightY = currentY;
  applyFont(doc, PDF_DESIGN.typography.h1);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(`#${invoiceData.invoiceNumber}`, pageWidth - PDF_DESIGN.margins.right, rightY, {
    align: 'right',
  });
  rightY += 8;

  // Service period (if provided)
  if (invoiceData.serviceperiod) {
    applyFont(doc, PDF_DESIGN.typography.small);
    applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
    const startDate = formatLongDate(invoiceData.serviceperiod.start);
    const endDate = formatLongDate(invoiceData.serviceperiod.end);
    doc.text(`${startDate} - ${endDate}`, pageWidth - PDF_DESIGN.margins.right, rightY, {
      align: 'right',
    });
    rightY += 6;
  }

  // Issue date
  applyFont(doc, PDF_DESIGN.typography.small);
  applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
  doc.text('Issue Date:', rightColX, rightY);
  applyFont(doc, PDF_DESIGN.typography.bodyBold);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(
    formatLongDate(invoiceData.issueDate),
    pageWidth - PDF_DESIGN.margins.right,
    rightY,
    { align: 'right' }
  );
  rightY += 5;

  // Due date
  applyFont(doc, PDF_DESIGN.typography.small);
  applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
  doc.text('Due Date:', rightColX, rightY);
  applyFont(doc, PDF_DESIGN.typography.bodyBold);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(
    formatLongDate(invoiceData.dueDate),
    pageWidth - PDF_DESIGN.margins.right,
    rightY,
    { align: 'right' }
  );
  rightY += 5;

  // Total amount
  applyFont(doc, PDF_DESIGN.typography.small);
  applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
  doc.text('Total Amount:', rightColX, rightY);
  applyFont(doc, PDF_DESIGN.typography.h3);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(
    formatCurrency(invoiceData.total),
    pageWidth - PDF_DESIGN.margins.right,
    rightY,
    { align: 'right' }
  );
  rightY += 5;

  // Total items
  applyFont(doc, PDF_DESIGN.typography.small);
  applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
  doc.text('Total Items:', rightColX, rightY);
  applyFont(doc, PDF_DESIGN.typography.bodyBold);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(
    invoiceData.items.length.toString(),
    pageWidth - PDF_DESIGN.margins.right,
    rightY,
    { align: 'right' }
  );

  currentY = Math.max(leftY, rightY) + PDF_DESIGN.spacing.lg;

  // Divider
  currentY = addDivider(doc, currentY);

  // ===== LINE ITEMS TABLE =====
  const tableHeaders = [
    ['#', 'Date', 'Order', 'Stock', 'Description', 'VIN', 'Services', 'Amount'],
  ];

  const tableData = invoiceData.items.map((item, index) => [
    (index + 1).toString(),
    item.date ? formatShortDate(item.date) : 'N/A',
    item.orderNumber || 'N/A',
    item.stockNumber || 'N/A',
    item.description,
    item.vin || 'N/A',
    item.services || 'N/A',
    formatCurrency(item.totalPrice),
  ]);

  autoTable(doc, {
    head: tableHeaders,
    body: tableData,
    startY: currentY,
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3,
      textColor: PDF_DESIGN.colors.gray[900].rgb as [number, number, number],
      lineColor: PDF_DESIGN.colors.gray[200].rgb as [number, number, number],
      lineWidth: 0.1,
      minCellHeight: 8,
    },
    headStyles: {
      fillColor: PDF_DESIGN.colors.gray[700].rgb as [number, number, number],
      textColor: PDF_DESIGN.colors.white.rgb as [number, number, number],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' }, // #
      1: { cellWidth: 15, halign: 'center' }, // Date
      2: { cellWidth: 18, halign: 'center' }, // Order
      3: { cellWidth: 18, halign: 'left' }, // Stock
      4: { cellWidth: 35, halign: 'left' }, // Description
      5: { cellWidth: 25, halign: 'center', font: 'courier', fontSize: 8 }, // VIN
      6: { cellWidth: 30, halign: 'left' }, // Services
      7: { cellWidth: 20, halign: 'right', fontStyle: 'bold' }, // Amount
    },
    alternateRowStyles: {
      fillColor: PDF_DESIGN.colors.gray[50].rgb as [number, number, number],
    },
    showHead: 'everyPage',
    margin: { left: PDF_DESIGN.margins.left, right: PDF_DESIGN.margins.right },
    didDrawPage: (data) => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      const totalPages = doc.getNumberOfPages();

      addFooter(doc, {
        pageNumber,
        totalPages,
        leftText: `Invoice #${invoiceData.invoiceNumber}`,
        rightText: dealershipInfo.name,
        showBranding: true,
      });
    },
  });

  // Get Y position after table
  const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 50;
  currentY = finalTableY + PDF_DESIGN.spacing.md;

  // ===== SUMMARY BOX (RIGHT-ALIGNED) =====
  currentY = checkPageOverflow(doc, currentY, 50);

  const summaryX = pageWidth - PDF_DESIGN.margins.right - 80;
  const summaryItems = [
    { label: 'Subtotal', value: formatCurrency(invoiceData.subtotal) },
    {
      label: `Tax (${(invoiceData.taxRate * 100).toFixed(1)}%)`,
      value: formatCurrency(invoiceData.taxAmount),
    },
    { label: 'Total Due', value: formatCurrency(invoiceData.total), bold: true },
  ];

  addSummaryBox(doc, summaryX, currentY, {
    items: summaryItems,
    title: 'SUMMARY',
    width: 80,
  });

  // ===== NOTES SECTION =====
  if (invoiceData.notes || invoiceData.terms) {
    currentY += 60;
    currentY = checkPageOverflow(doc, currentY, 20);

    if (invoiceData.notes) {
      applyFont(doc, PDF_DESIGN.typography.h4);
      applyTextColor(doc, PDF_DESIGN.colors.gray[700].rgb);
      doc.text('Notes:', PDF_DESIGN.margins.left, currentY);
      currentY += 6;

      applyFont(doc, PDF_DESIGN.typography.small);
      applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
      const noteLines = doc.splitTextToSize(
        invoiceData.notes,
        pageWidth - PDF_DESIGN.margins.left - PDF_DESIGN.margins.right
      );
      doc.text(noteLines, PDF_DESIGN.margins.left, currentY);
      currentY += noteLines.length * 4 + PDF_DESIGN.spacing.sm;
    }

    if (invoiceData.terms) {
      applyFont(doc, PDF_DESIGN.typography.h4);
      applyTextColor(doc, PDF_DESIGN.colors.gray[700].rgb);
      doc.text('Payment Terms:', PDF_DESIGN.margins.left, currentY);
      currentY += 6;

      applyFont(doc, PDF_DESIGN.typography.small);
      applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
      const termLines = doc.splitTextToSize(
        invoiceData.terms,
        pageWidth - PDF_DESIGN.margins.left - PDF_DESIGN.margins.right
      );
      doc.text(termLines, PDF_DESIGN.margins.left, currentY);
    }
  }

  // ===== FINALIZE ALL PAGE FOOTERS =====
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    addFooter(doc, {
      pageNumber: pageNum,
      totalPages,
      leftText: `Invoice #${invoiceData.invoiceNumber}`,
      rightText: dealershipInfo.name,
      showBranding: true,
    });
  }

  return doc;
}

/**
 * Generate and download invoice PDF
 */
export async function downloadInvoicePDF(
  options: InvoiceTemplateOptions,
  filename?: string
): Promise<void> {
  const doc = await generateInvoicePDF(options);

  const sanitizedDealerName = options.dealershipInfo.name.replace(/[^a-zA-Z0-9]/g, '_');
  const finalFilename =
    filename ||
    `${sanitizedDealerName}_Invoice_${options.invoiceData.invoiceNumber}.pdf`;

  doc.save(finalFilename);
}

/**
 * Generate invoice PDF as blob (for preview)
 */
export async function generateInvoicePDFBlob(
  options: InvoiceTemplateOptions
): Promise<Blob> {
  const doc = await generateInvoicePDF(options);
  return doc.output('blob');
}
