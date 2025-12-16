// =====================================================
// GENERATE ORDER LIST PDF
// Created: 2025-01-14
// Description: Generate professional PDF list from filtered orders
// =====================================================

import type { Order } from '@/hooks/useOrderManagement';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Format currency for PDF display
 */
function formatCurrency(amount: number | null | undefined): string {
  if (!amount) return '$0.00';
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
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return 'Invalid';
  }
}

/**
 * Format date with time for PDF display (MM/DD/YYYY hh:mm AM/PM)
 */
function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid';
  }
}

/**
 * Format date with time in separate lines for PDF display
 * First line: MM/DD/YYYY
 * Second line: hh:mm AM/PM
 */
function formatDateTimeMultiline(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    const dateOnly = date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
    const timeOnly = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return `${dateOnly}\n${timeOnly}`;
  } catch {
    return 'Invalid';
  }
}

/**
 * Get order number (matches UI display logic)
 */
function getOrderNumber(order: Order): string {
  return order.orderNumber || order.order_number || 'N/A';
}

/**
 * Get stock/tag display (depends on order type)
 */
function getStockTag(order: Order, orderType: string): string {
  if (orderType === 'service') {
    const parts = [];
    if ((order as any).ro) parts.push(`RO: ${(order as any).ro}`);
    if ((order as any).po) parts.push(`PO: ${(order as any).po}`);
    if ((order as any).tag) parts.push(`Tag: ${(order as any).tag}`);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  } else if (orderType === 'carwash') {
    const parts = [];
    if (order.stockNumber) parts.push(order.stockNumber);
    if (order.tag) parts.push(order.tag);
    return parts.length > 0 ? parts.join(' / ') : 'N/A';
  } else {
    return order.stockNumber || 'N/A';
  }
}

/**
 * Get vehicle display
 */
function getVehicle(order: Order): string {
  const parts = [];
  if (order.vehicleYear) parts.push(String(order.vehicleYear));
  if (order.vehicleMake) parts.push(order.vehicleMake);
  if (order.vehicleModel) parts.push(order.vehicleModel);
  return parts.length > 0 ? parts.join(' ') : 'N/A';
}

/**
 * Get VIN display (L8V - Last 8 VIN characters only)
 */
function getVIN(order: Order): string {
  const vin = order.vehicleVin || (order as any).vehicle_vin;
  if (!vin) return 'N/A';
  return vin.length >= 8 ? vin.slice(-8) : vin; // Return last 8 characters (L8V)
}

/**
 * Get status display
 */
function getStatus(order: Order): string {
  const status = order.status || 'unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');
}

/**
 * Get services with status display for Status column
 */
function getServicesWithStatus(order: Order): string {
  const status = getStatus(order);
  const services = order.services;

  if (!services || !Array.isArray(services) || services.length === 0) {
    return status;
  }

  // Handle ServiceItem[] format (objects with name property)
  if (typeof services[0] === 'object' && services[0]?.name) {
    const serviceNames = services.map((service: any) => service.name).join(', ');
    return `${serviceNames}\n${status}`;
  }

  // Handle string[] format (array of service names or IDs)
  if (typeof services[0] === 'string') {
    const serviceNames = services.join(', ');
    return `${serviceNames}\n${status}`;
  }

  return status;
}

// =====================================================
// PDF GENERATION
// =====================================================

export interface GenerateOrderListOptions {
  orders: Order[];
  orderType: 'sales' | 'service' | 'recon' | 'carwash';
  filterLabel?: string;
  dealershipName?: string;
  searchTerm?: string;
}

/**
 * Generate a professional order list PDF
 * Uses jsPDF + autoTable for table generation
 */
export async function generateOrderListPDF(options: GenerateOrderListOptions): Promise<void> {
  const { orders, orderType, filterLabel = 'All Orders', dealershipName = 'Dealership', searchTerm } = options;

  if (!orders || orders.length === 0) {
    throw new Error('No orders to print');
  }

  // Create PDF document (Portrait A4 - optimized layout)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // ===== COLORS (Professional palette) =====
  const colors = {
    primary: '#111827',      // Gray-900 (text)
    secondary: '#6b7280',    // Gray-500 (labels)
    muted: '#9ca3af',        // Gray-400 (muted text)
    border: '#e5e7eb',       // Gray-200 (borders)
    headerBg: '#6B7280',     // Gray-500 (header background)
    headerText: '#ffffff',   // White (header text)
    zebraStripe: '#f9fafb',  // Gray-50 (zebra stripe)
  };

  // ===== HEADER SECTION =====
  const leftCol = 20;
  const centerCol = pageWidth / 2;
  const rightCol = pageWidth - 20;

  // Title (16pt, bold, centered)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(`${dealershipName} - ${orderType.charAt(0).toUpperCase() + orderType.slice(1)} Orders`, centerCol, yPosition, { align: 'center' });

  yPosition += 8;

  // Filter info (10pt, centered)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text(`Filter: ${filterLabel} | ${orders.length} order${orders.length !== 1 ? 's' : ''}`, centerCol, yPosition, { align: 'center' });

  // Search term if present
  if (searchTerm) {
    yPosition += 5;
    doc.text(`Search: "${searchTerm}"`, centerCol, yPosition, { align: 'center' });
  }

  yPosition += 5;

  // Print date/time (9pt, centered)
  doc.setFontSize(9);
  doc.text(
    `Printed: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`,
    centerCol,
    yPosition,
    { align: 'center' }
  );

  yPosition += 10;

  // ===== TABLE SECTION =====
  // Define columns based on order type (optimized for portrait)
  const tableColumns = [
    { header: '#', dataKey: 'rowNumber' },
    { header: 'Order', dataKey: 'orderNumber' },
    { header: orderType === 'service' ? 'RO/PO/Tag' : orderType === 'carwash' ? 'Stock/Tag' : 'Stock', dataKey: 'stockTag' },
    { header: 'Vehicle', dataKey: 'vehicle' },
    { header: 'VIN', dataKey: 'vin' },
    { header: orderType === 'recon' || orderType === 'carwash' ? 'Completed' : 'Due Date', dataKey: 'date' },
    { header: 'Status', dataKey: 'status' },
    // TEMPORARILY HIDDEN: { header: 'Amount', dataKey: 'amount' }
  ];

  // Prepare table data
  const tableData = orders.map((order, index) => {
    let dateDisplay = 'N/A';
    if (orderType === 'recon' || orderType === 'carwash') {
      dateDisplay = order.completedAt || order.completed_at ? formatDate(order.completedAt || order.completed_at) : 'N/A';
    } else {
      dateDisplay = order.dueDate ? formatDateTimeMultiline(order.dueDate) : 'N/A';
    }

    return {
      rowNumber: (index + 1).toString(),
      orderNumber: getOrderNumber(order),
      stockTag: getStockTag(order, orderType),
      vehicle: getVehicle(order),
      vin: getVIN(order),
      date: dateDisplay,
      status: getServicesWithStatus(order),
      // TEMPORARILY HIDDEN: amount: formatCurrency(order.totalAmount || order.total_amount)
    };
  });

  // Generate table with autoTable (optimized for A4 carta format)
  autoTable(doc, {
    startY: yPosition,
    head: [tableColumns.map(col => col.header)],
    body: tableData.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
    theme: 'grid',
    styles: {
      fontSize: 9,           // Increased font size for better readability
      cellPadding: 3,        // More padding for better spacing
      lineColor: colors.border,
      lineWidth: 0.2,        // Slightly thicker lines
      textColor: colors.primary,
      font: 'helvetica',
      valign: 'middle',      // Vertical alignment
      minCellHeight: 8       // Minimum cell height for better readability
    },
    headStyles: {
      fillColor: colors.headerBg,
      textColor: colors.headerText,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 10,          // Larger header font
      minCellHeight: 10
    },
    bodyStyles: {
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontSize: 9, overflow: 'hidden' },   // # - Row number
      1: { halign: 'center', cellWidth: 25, fontSize: 9, overflow: 'hidden' },  // Order Number (increased width)
      2: { halign: 'left', cellWidth: 32, fontSize: 8, overflow: 'linebreak' },    // Stock/Tag/RO (increased width)
      3: { halign: 'left', cellWidth: 35, fontSize: 9, overflow: 'linebreak' },    // Vehicle (increased width)
      4: { halign: 'center', cellWidth: 23, fontStyle: 'bold', font: 'courier', fontSize: 8, overflow: 'hidden' }, // VIN L8V
      5: { halign: 'center', cellWidth: 27, fontSize: 8, overflow: 'hidden' },  // Date (increased width)
      6: { halign: 'center', cellWidth: 26, fontSize: 8, overflow: 'hidden' },  // Status (increased width)
      // TEMPORARILY HIDDEN: 7: { halign: 'right', cellWidth: 23, fontStyle: 'bold', fontSize: 9, overflow: 'hidden' }  // Amount
    },
    alternateRowStyles: {
      fillColor: colors.zebraStripe
    },
    margin: { left: 15, right: 15 },  // Reduced margins for more table space
    didDrawPage: (data) => {
      // Add page numbers at the bottom
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(colors.muted);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  // ===== FOOTER SECTION (on last page) =====
  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 20;

  // Summary stats
  // TEMPORARILY HIDDEN: const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || order.total_amount || 0), 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(`Total Orders: ${orders.length}`, leftCol, finalY + 10);
  // TEMPORARILY HIDDEN: doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, rightCol, finalY + 10, { align: 'right' });

  // ===== SAVE PDF =====
  const fileName = `${orderType}_orders_${filterLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Preview order list PDF (opens in new window)
 */
export async function previewOrderListPDF(options: GenerateOrderListOptions): Promise<void> {
  const { orders, orderType, filterLabel = 'All Orders', dealershipName = 'Dealership', searchTerm } = options;

  if (!orders || orders.length === 0) {
    throw new Error('No orders to preview');
  }

  // Generate PDF in memory (Portrait orientation)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  const colors = {
    primary: '#111827',
    secondary: '#6b7280',
    muted: '#9ca3af',
    border: '#e5e7eb',
    headerBg: '#6B7280',
    headerText: '#ffffff',
    zebraStripe: '#f9fafb',
  };

  const leftCol = 20;
  const centerCol = pageWidth / 2;
  const rightCol = pageWidth - 20;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(`${dealershipName} - ${orderType.charAt(0).toUpperCase() + orderType.slice(1)} Orders`, centerCol, yPosition, { align: 'center' });

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(colors.secondary);
  doc.text(`Filter: ${filterLabel} | ${orders.length} order${orders.length !== 1 ? 's' : ''}`, centerCol, yPosition, { align: 'center' });

  if (searchTerm) {
    yPosition += 5;
    doc.text(`Search: "${searchTerm}"`, centerCol, yPosition, { align: 'center' });
  }

  yPosition += 5;
  doc.setFontSize(9);
  doc.text(
    `Printed: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}`,
    centerCol,
    yPosition,
    { align: 'center' }
  );

  yPosition += 10;

  // Table (optimized for portrait)
  const tableColumns = [
    { header: '#', dataKey: 'rowNumber' },
    { header: 'Order', dataKey: 'orderNumber' },
    { header: orderType === 'service' ? 'RO/PO/Tag' : orderType === 'carwash' ? 'Stock/Tag' : 'Stock', dataKey: 'stockTag' },
    { header: 'Vehicle', dataKey: 'vehicle' },
    { header: 'VIN', dataKey: 'vin' },
    { header: orderType === 'recon' || orderType === 'carwash' ? 'Completed' : 'Due Date', dataKey: 'date' },
    { header: 'Status', dataKey: 'status' },
    // TEMPORARILY HIDDEN: { header: 'Amount', dataKey: 'amount' }
  ];

  const tableData = orders.map((order, index) => {
    let dateDisplay = 'N/A';
    if (orderType === 'recon' || orderType === 'carwash') {
      dateDisplay = order.completedAt || order.completed_at ? formatDate(order.completedAt || order.completed_at) : 'N/A';
    } else {
      dateDisplay = order.dueDate ? formatDateTimeMultiline(order.dueDate) : 'N/A';
    }

    return {
      rowNumber: (index + 1).toString(),
      orderNumber: getOrderNumber(order),
      stockTag: getStockTag(order, orderType),
      vehicle: getVehicle(order),
      vin: getVIN(order),
      date: dateDisplay,
      status: getServicesWithStatus(order),
      // TEMPORARILY HIDDEN: amount: formatCurrency(order.totalAmount || order.total_amount)
    };
  });

  autoTable(doc, {
    startY: yPosition,
    head: [tableColumns.map(col => col.header)],
    body: tableData.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
    theme: 'grid',
    styles: {
      fontSize: 9,           // Increased font size for better readability
      cellPadding: 3,        // More padding for better spacing
      lineColor: colors.border,
      lineWidth: 0.2,        // Slightly thicker lines
      textColor: colors.primary,
      font: 'helvetica',
      valign: 'middle',      // Vertical alignment
      minCellHeight: 8,      // Minimum cell height for better readability
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: colors.headerBg,
      textColor: colors.headerText,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 10,          // Larger header font
      cellPadding: 3,
      minCellHeight: 10
    },
    bodyStyles: {
      halign: 'left'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12, fontSize: 9, overflow: 'hidden' },   // # - Row number
      1: { halign: 'center', cellWidth: 25, fontSize: 9, overflow: 'hidden' },  // Order Number (increased width)
      2: { halign: 'left', cellWidth: 32, fontSize: 8, overflow: 'linebreak' },    // Stock/Tag/RO (increased width)
      3: { halign: 'left', cellWidth: 35, fontSize: 9, overflow: 'linebreak' },    // Vehicle (increased width)
      4: { halign: 'center', cellWidth: 23, fontStyle: 'bold', font: 'courier', fontSize: 8, overflow: 'hidden' }, // VIN L8V
      5: { halign: 'center', cellWidth: 27, fontSize: 8, overflow: 'hidden' },  // Date (increased width)
      6: { halign: 'center', cellWidth: 26, fontSize: 8, overflow: 'hidden' },  // Status (increased width)
      // TEMPORARILY HIDDEN: 7: { halign: 'right', cellWidth: 23, fontStyle: 'bold', fontSize: 9, overflow: 'hidden' }  // Amount
    },
    alternateRowStyles: {
      fillColor: colors.zebraStripe
    },
    margin: { left: 15, right: 15 },  // Reduced margins for more table space
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(colors.muted);
      doc.text(
        `Page ${currentPage} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || yPosition + 20;
  // TEMPORARILY HIDDEN: const totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || order.total_amount || 0), 0);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.primary);
  doc.text(`Total Orders: ${orders.length}`, leftCol, finalY + 10);
  // TEMPORARILY HIDDEN: doc.text(`Total Amount: ${formatCurrency(totalAmount)}`, rightCol, finalY + 10, { align: 'right' });

  // Open in new window
  const pdfBlob = doc.output('blob');
  const pdfUrl = URL.createObjectURL(pdfBlob);
  const previewWindow = window.open(pdfUrl, '_blank');

  if (!previewWindow) {
    throw new Error('Failed to open preview window. Please allow popups.');
  }
}
