/**
 * PDF HELPER UTILITIES - Reusable Components
 * Created: 2025-01-18
 * Description: Common PDF generation utilities for headers, footers, and formatting
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_DESIGN, type RGBTuple, type FontConfig } from './pdfDesignSystem';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface DealershipInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  logo?: string; // Base64 or URL
}

export interface HeaderOptions {
  dealershipInfo: DealershipInfo;
  showLogo?: boolean;
  showContact?: boolean;
  yPosition?: number;
}

export interface TitleOptions {
  text: string;
  subtitle?: string;
  alignment?: 'left' | 'center' | 'right';
  yPosition?: number;
  color?: RGBTuple;
}

export interface FooterOptions {
  pageNumber: number;
  totalPages: number;
  leftText?: string;
  centerText?: string;
  rightText?: string;
  showBranding?: boolean;
}

export interface SummaryBoxOptions {
  items: Array<{ label: string; value: string; bold?: boolean }>;
  title?: string;
  width?: number;
  backgroundColor?: RGBTuple;
  borderColor?: RGBTuple;
}

export interface MetadataOptions {
  items: Array<{ label: string; value: string }>;
  columns?: 1 | 2;
  yPosition?: number;
}

// =====================================================
// FORMATTING UTILITIES
// =====================================================

/**
 * Format currency for PDF display
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00';
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
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format date with full month name (January 15, 2025)
 */
export function formatLongDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format short date (MM/DD)
 */
export function formatShortDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}/${day}`;
  } catch {
    return 'N/A';
  }
}

/**
 * Format date with time (MM/DD/YYYY hh:mm AM/PM)
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format hours (decimal to HH:MM)
 */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '0:00';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

/**
 * Format hours (decimal with 2 decimals)
 */
export function formatDecimalHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined) return '0.00';
  return hours.toFixed(2);
}

/**
 * Format percentage
 */
export function formatPercent(value: number | null | undefined, decimals: number = 1): string {
  if (value === null || value === undefined) return '0%';
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('en-US').format(value);
}

// =====================================================
// FONT UTILITIES
// =====================================================

/**
 * Apply font configuration to jsPDF instance
 */
export function applyFont(doc: jsPDF, fontConfig: FontConfig): void {
  doc.setFont(fontConfig.family, fontConfig.style);
  doc.setFontSize(fontConfig.size);
}

/**
 * Apply text color to jsPDF instance
 */
export function applyTextColor(doc: jsPDF, color: RGBTuple): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

/**
 * Apply draw color to jsPDF instance
 */
export function applyDrawColor(doc: jsPDF, color: RGBTuple): void {
  doc.setDrawColor(color[0], color[1], color[2]);
}

/**
 * Apply fill color to jsPDF instance
 */
export function applyFillColor(doc: jsPDF, color: RGBTuple): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

// =====================================================
// HEADER COMPONENTS
// =====================================================

/**
 * Add professional header with dealership info
 * @returns New Y position after header
 */
export function addHeaderSection(
  doc: jsPDF,
  options: HeaderOptions
): number {
  const { dealershipInfo, showLogo = false, showContact = true, yPosition = 20 } = options;
  let currentY = yPosition;

  // Logo placeholder (if enabled)
  if (showLogo && dealershipInfo.logo) {
    // TODO: Add logo rendering when base64 image is provided
    currentY += 10;
  }

  // Dealership name
  applyFont(doc, PDF_DESIGN.typography.title);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(dealershipInfo.name, PDF_DESIGN.margins.left, currentY);
  currentY += 8;

  // Contact information
  if (showContact) {
    applyFont(doc, PDF_DESIGN.typography.small);
    applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);

    if (dealershipInfo.address) {
      doc.text(dealershipInfo.address, PDF_DESIGN.margins.left, currentY);
      currentY += 4;
    }

    const contactLine: string[] = [];
    if (dealershipInfo.phone) contactLine.push(dealershipInfo.phone);
    if (dealershipInfo.email) contactLine.push(dealershipInfo.email);

    if (contactLine.length > 0) {
      doc.text(contactLine.join(' | '), PDF_DESIGN.margins.left, currentY);
      currentY += 4;
    }
  }

  currentY += PDF_DESIGN.spacing.md;
  return currentY;
}

/**
 * Add document title section
 * @returns New Y position after title
 */
export function addDocumentTitle(
  doc: jsPDF,
  options: TitleOptions
): number {
  const {
    text,
    subtitle,
    alignment = 'center',
    yPosition = 40,
    color = PDF_DESIGN.colors.gray[900].rgb
  } = options;

  let currentY = yPosition;
  const pageWidth = doc.internal.pageSize.getWidth();
  const xPosition = alignment === 'center' ? pageWidth / 2 : PDF_DESIGN.margins.left;
  const alignOpt = alignment === 'center' ? { align: 'center' as const } : undefined;

  // Main title
  applyFont(doc, PDF_DESIGN.typography.title);
  applyTextColor(doc, color);
  doc.text(text, xPosition, currentY, alignOpt);
  currentY += 8;

  // Subtitle
  if (subtitle) {
    applyFont(doc, PDF_DESIGN.typography.body);
    applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
    doc.text(subtitle, xPosition, currentY, alignOpt);
    currentY += 6;
  }

  currentY += PDF_DESIGN.spacing.sm;
  return currentY;
}

/**
 * Add invoice-style title with gray box background
 * @returns New Y position after title
 */
export function addInvoiceTitle(
  doc: jsPDF,
  title: string = 'INVOICE',
  yPosition: number = 40
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxHeight = 12;
  const centerX = pageWidth / 2;

  // Draw gray box background
  applyFillColor(doc, PDF_DESIGN.colors.gray[100].rgb);
  doc.rect(
    PDF_DESIGN.margins.left,
    yPosition - 8,
    pageWidth - PDF_DESIGN.margins.left - PDF_DESIGN.margins.right,
    boxHeight,
    'F'
  );

  // Add title text
  applyFont(doc, PDF_DESIGN.typography.title);
  applyTextColor(doc, PDF_DESIGN.colors.emerald[600].rgb);
  doc.text(title, centerX, yPosition, { align: 'center' });

  return yPosition + boxHeight + PDF_DESIGN.spacing.md;
}

// =====================================================
// FOOTER COMPONENTS
// =====================================================

/**
 * Add professional footer with page numbers and branding
 */
export function addFooter(
  doc: jsPDF,
  options: FooterOptions
): void {
  const {
    pageNumber,
    totalPages,
    leftText,
    centerText,
    rightText,
    showBranding = true
  } = options;

  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;
  const footerY = pageHeight - 15;

  // Separator line
  applyDrawColor(doc, PDF_DESIGN.colors.gray[200].rgb);
  doc.setLineWidth(0.3);
  doc.line(
    PDF_DESIGN.margins.left,
    pageHeight - 20,
    pageWidth - PDF_DESIGN.margins.right,
    pageHeight - 20
  );

  // Footer text
  applyFont(doc, PDF_DESIGN.typography.caption);
  applyTextColor(doc, PDF_DESIGN.colors.gray[400].rgb);

  // Left text
  if (leftText) {
    doc.text(leftText, PDF_DESIGN.margins.left, footerY);
  }

  // Center text (default: page numbers)
  const centerContent = centerText || `Page ${pageNumber} of ${totalPages}`;
  applyFont(doc, PDF_DESIGN.typography.captionBold);
  applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
  doc.text(centerContent, pageWidth / 2, footerY, { align: 'center' });

  // Right text
  applyFont(doc, PDF_DESIGN.typography.caption);
  applyTextColor(doc, PDF_DESIGN.colors.gray[400].rgb);
  if (rightText) {
    doc.text(rightText, pageWidth - PDF_DESIGN.margins.right, footerY, { align: 'right' });
  }

  // Branding
  if (showBranding) {
    applyFont(doc, PDF_DESIGN.typography.finePrint);
    applyTextColor(doc, PDF_DESIGN.colors.gray[400].rgb);
    doc.text(
      'Generated by MyDetailArea',
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
}

// =====================================================
// LAYOUT COMPONENTS
// =====================================================

/**
 * Add horizontal divider line
 * @returns New Y position after divider
 */
export function addDivider(
  doc: jsPDF,
  yPosition: number,
  width?: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const lineWidth = width || (pageWidth - PDF_DESIGN.margins.left - PDF_DESIGN.margins.right);

  applyDrawColor(doc, PDF_DESIGN.components.divider.color);
  doc.setLineWidth(PDF_DESIGN.components.divider.thickness);
  doc.line(
    PDF_DESIGN.margins.left,
    yPosition,
    PDF_DESIGN.margins.left + lineWidth,
    yPosition
  );

  return yPosition + PDF_DESIGN.components.divider.margin;
}

/**
 * Add metadata key-value pairs (invoice details, report metadata)
 * @returns New Y position after metadata
 */
export function addMetadata(
  doc: jsPDF,
  options: MetadataOptions
): number {
  const { items, columns = 2, yPosition = 50 } = options;
  let currentY = yPosition;
  const pageWidth = doc.internal.pageSize.getWidth();

  if (columns === 1) {
    // Single column layout
    items.forEach(({ label, value }) => {
      applyFont(doc, PDF_DESIGN.typography.small);
      applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
      doc.text(label, PDF_DESIGN.margins.left, currentY);

      applyFont(doc, PDF_DESIGN.typography.bodyBold);
      applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
      doc.text(value, PDF_DESIGN.margins.left + 50, currentY);

      currentY += 5;
    });
  } else {
    // Two column layout
    const midX = pageWidth / 2 + 10;
    const leftItems = items.slice(0, Math.ceil(items.length / 2));
    const rightItems = items.slice(Math.ceil(items.length / 2));

    const maxRows = Math.max(leftItems.length, rightItems.length);
    for (let i = 0; i < maxRows; i++) {
      // Left column
      if (leftItems[i]) {
        applyFont(doc, PDF_DESIGN.typography.small);
        applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
        doc.text(leftItems[i].label, PDF_DESIGN.margins.left, currentY);

        applyFont(doc, PDF_DESIGN.typography.bodyBold);
        applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
        doc.text(leftItems[i].value, PDF_DESIGN.margins.left + 40, currentY);
      }

      // Right column
      if (rightItems[i]) {
        applyFont(doc, PDF_DESIGN.typography.small);
        applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
        doc.text(rightItems[i].label, midX, currentY);

        applyFont(doc, PDF_DESIGN.typography.bodyBold);
        applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
        doc.text(rightItems[i].value, midX + 40, currentY);
      }

      currentY += 5;
    }
  }

  return currentY + PDF_DESIGN.spacing.sm;
}

/**
 * Add summary box with key metrics
 * @returns New Y position after box
 */
export function addSummaryBox(
  doc: jsPDF,
  xPosition: number,
  yPosition: number,
  options: SummaryBoxOptions
): number {
  const {
    items,
    title,
    width = 80,
    backgroundColor = PDF_DESIGN.colors.gray[50].rgb,
    borderColor = PDF_DESIGN.colors.gray[300].rgb
  } = options;

  let currentY = yPosition;

  // Calculate box height
  const titleHeight = title ? 10 : 0;
  const itemHeight = 6;
  const padding = 8;
  const boxHeight = titleHeight + (items.length * itemHeight) + (padding * 2);

  // Draw box background
  applyFillColor(doc, backgroundColor);
  applyDrawColor(doc, borderColor);
  doc.setLineWidth(0.5);
  doc.rect(xPosition, yPosition, width, boxHeight, 'FD');

  currentY += padding;

  // Title
  if (title) {
    applyFont(doc, PDF_DESIGN.typography.h4);
    applyTextColor(doc, PDF_DESIGN.colors.gray[700].rgb);
    doc.text(title, xPosition + padding, currentY + 4);
    currentY += 10;
  }

  // Items
  items.forEach(({ label, value, bold = false }) => {
    // Label
    applyFont(doc, PDF_DESIGN.typography.small);
    applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
    doc.text(label, xPosition + padding, currentY);

    // Value
    applyFont(doc, bold ? PDF_DESIGN.typography.bodyBold : PDF_DESIGN.typography.body);
    applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
    doc.text(value, xPosition + width - padding, currentY, { align: 'right' });

    currentY += itemHeight;
  });

  return yPosition + boxHeight + PDF_DESIGN.spacing.md;
}

/**
 * Add section heading
 * @returns New Y position after heading
 */
export function addSectionHeading(
  doc: jsPDF,
  text: string,
  yPosition: number
): number {
  applyFont(doc, PDF_DESIGN.typography.h3);
  applyTextColor(doc, PDF_DESIGN.colors.gray[700].rgb);
  doc.text(text, PDF_DESIGN.margins.left, yPosition);

  return yPosition + 8;
}

// =====================================================
// PAGE MANAGEMENT
// =====================================================

/**
 * Check if content will overflow page, add new page if needed
 * @returns New Y position (reset to top if new page added)
 */
export function checkPageOverflow(
  doc: jsPDF,
  currentY: number,
  requiredSpace: number = 30
): number {
  const pageHeight = doc.internal.pageSize.height;
  const bottomMargin = PDF_DESIGN.margins.bottom + 20; // Extra space for footer

  if (currentY + requiredSpace > pageHeight - bottomMargin) {
    doc.addPage();
    return PDF_DESIGN.margins.top;
  }

  return currentY;
}

/**
 * Get safe content area dimensions
 */
export function getContentArea(doc: jsPDF): {
  width: number;
  height: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  return {
    width: pageWidth - PDF_DESIGN.margins.left - PDF_DESIGN.margins.right,
    height: pageHeight - PDF_DESIGN.margins.top - PDF_DESIGN.margins.bottom,
    startX: PDF_DESIGN.margins.left,
    startY: PDF_DESIGN.margins.top,
    endX: pageWidth - PDF_DESIGN.margins.right,
    endY: pageHeight - PDF_DESIGN.margins.bottom,
  };
}
