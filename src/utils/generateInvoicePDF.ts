// =====================================================
// GENERATE INVOICE PDF
// Created: 2025-10-23
// Updated: 2025-10-31
// Description: Generate professional PDF from invoice data with 7-column table
// =====================================================

import type { InvoiceWithDetails } from '@/types/invoices';
import {
    DEPARTMENT_DISPLAY_NAMES,
    shouldShowDepartmentGrouping,
    sortInvoiceItemsByDepartment
} from '@/utils/invoiceSorting';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 * Sales & Service orders: due_date
 * Recon & Carwash orders: completed_date
 */
function getCorrectItemDate(item: any): string {
  const orderType = item.metadata?.order_type;

  if (orderType === 'sales' || orderType === 'service') {
    // Priority order for sales/service: due_date -> completed_at -> createdAt
    const dueDate = item.metadata?.due_date;
    const completedAt = item.metadata?.completed_at;
    const createdAt = item.createdAt;

    // Return the first valid date found
    if (dueDate && dueDate !== 'null' && dueDate !== '') {
      return dueDate;
    }
    if (completedAt && completedAt !== 'null' && completedAt !== '') {
      return completedAt;
    }
    if (createdAt && createdAt !== 'null' && createdAt !== '') {
      return createdAt;
    }
  } else if (orderType === 'recon' || orderType === 'carwash') {
    // Priority order for recon/carwash: completed_at -> completed_date -> createdAt
    const completedAt = item.metadata?.completed_at;
    const completedDate = item.metadata?.completed_date;
    const createdAt = item.createdAt;

    // Return the first valid date found
    if (completedAt && completedAt !== 'null' && completedAt !== '') {
      return completedAt;
    }
    if (completedDate && completedDate !== 'null' && completedDate !== '') {
      return completedDate;
    }
    if (createdAt && createdAt !== 'null' && createdAt !== '') {
      return createdAt;
    }
  }

  // Final fallback for unknown order types or when no dates are available
  return item.metadata?.completed_at || item.createdAt;
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
    headerBg: '#6B7280',     // Gray-500 (header background - print friendly)
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
    yPosition += 4;
  }

  // Department(s) - Always show
  yPosition += 2;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(colors.secondary);
  doc.text('Department:', leftCol, yPosition);
  yPosition += 4;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#6B7280'); // Gray-500
  if (invoice.metadata?.departments && invoice.metadata.departments.length > 0) {
    const depts = invoice.metadata.departments.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
    doc.text(depts, leftCol, yPosition);
  } else {
    doc.text('All Departments', leftCol, yPosition);
  }

  // RIGHT SIDE - Invoice number and details
  let rightY = 20;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor('#000000');
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - 20, rightY, { align: 'right' });

  rightY += 6;
  // Add service period range below invoice number
  if (invoice.metadata?.filter_date_range) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.secondary);
    const startDate = formatLongDate(invoice.metadata.filter_date_range.start);
    const endDate = formatLongDate(invoice.metadata.filter_date_range.end);
    doc.text(`${startDate} - ${endDate}`, pageWidth - 20, rightY, { align: 'right' });
  }

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

  // ===== ITEMS TABLE WITH AUTOTABLE (7 COLUMNS - Date/Order combined) =====

  // Determine header for column 2 based on order type
  const hasServiceOrders = invoice.items?.some(item => item.metadata?.order_type === 'service');
  const poRoTagHeader = hasServiceOrders ? 'PO | RO | Tag' : 'Stock';

  // Prepare table headers (Date and Order combined)
  const tableHeaders = [['#', 'Date / Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount']];

  // Sort items by department priority, then by date (ascending)
  const sortedItems = sortInvoiceItemsByDepartment(
    invoice.items || [],
    getCorrectItemDate
  );
  const showDepartmentHeaders = shouldShowDepartmentGrouping(sortedItems);

  // Group items by department and date
  interface GroupedData {
    department?: string;
    date: string;
    items: any[];
  }
  const groupedData: GroupedData[] = [];
  let currentDate = '';
  let currentDepartment = '';
  let currentGroup: any[] = [];
  const departmentCounts: Record<string, number> = {};

  // Count items per department if showing department headers
  if (showDepartmentHeaders) {
    sortedItems.forEach(item => {
      const dept = item.metadata?.order_type || 'unknown';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    });
  }

  sortedItems.forEach((item, index) => {
    const itemDate = formatShortDate(getCorrectItemDate(item));
    const itemDepartment = item.metadata?.order_type || 'unknown';

    // Check if we need to create a new group
    const needNewGroup = showDepartmentHeaders
      ? itemDepartment !== currentDepartment || itemDate !== currentDate
      : itemDate !== currentDate;

    if (needNewGroup && currentGroup.length > 0) {
      groupedData.push({
        department: showDepartmentHeaders ? currentDepartment : undefined,
        date: currentDate,
        items: currentGroup
      });
      currentGroup = [];
    }

    // Update current tracking
    if (showDepartmentHeaders && itemDepartment !== currentDepartment) {
      currentDepartment = itemDepartment;
      currentDate = ''; // Reset date for new department
    }

    if (itemDate !== currentDate) {
      currentDate = itemDate;
    }

    currentGroup.push(item);

    // Last group
    if (index === sortedItems.length - 1 && currentGroup.length > 0) {
      groupedData.push({
        department: showDepartmentHeaders ? currentDepartment : undefined,
        date: currentDate,
        items: currentGroup
      });
    }
  });

  // Build table data with separators
  const tableData: any[] = [];
  let orderCounter = 1; // Initialize order counter
  let lastDepartment = '';

  groupedData.forEach((group, groupIndex) => {
    // Add department header if showing department headers and department changed
    if (showDepartmentHeaders && group.department && group.department !== lastDepartment) {
      const deptName = DEPARTMENT_DISPLAY_NAMES[group.department] || group.department.toUpperCase();
      const itemCount = departmentCounts[group.department] || 0;

      // Add department separator row
      tableData.push([
        {
          content: `${deptName} (${itemCount} items)`,
          colSpan: 7,
          styles: {
            halign: 'center',
            fillColor: [230, 240, 255],
            textColor: [0, 50, 100],
            fontStyle: 'bold',
            fontSize: 10
          }
        }
      ]);
      lastDepartment = group.department;
    }

    group.items.forEach(item => {
      // Order number (sequential numbering)
      const orderNum = orderCounter.toString();
      orderCounter++;

      // Date (MM/DD) - Use correct date based on order type
      const date = formatShortDate(getCorrectItemDate(item));

      // Order number
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

      // VIN - ensure full visibility
      const vin = item.metadata?.vehicle_vin || '';

      // Services (service names from metadata, with fallback)
      let services = item.metadata?.service_names || '';

      // Fallback: try to extract from services array if service_names is empty
      if (!services && item.metadata?.services && Array.isArray(item.metadata.services)) {
        services = item.metadata.services.map((s: any) => {
          // Priority 1: Direct name from service object (NEW standard format)
          if (s && typeof s === 'object' && s.name) {
            return s.name;
          }

          // Priority 2: Legacy - service_name field
          if (s && typeof s === 'object' && s.service_name) {
            return s.service_name;
          }

          // Priority 3: Legacy carwash - type field (ID)
          if (s && typeof s === 'object' && s.type) {
            return s.type;
          }

          // Priority 4: Legacy - id field
          if (s && typeof s === 'object' && s.id) {
            return s.id;
          }

          // Priority 5: Legacy string format
          if (typeof s === 'string') {
            return s;
          }

          return 'Service';
        }).filter(Boolean).join(', ');
      }

      // Final fallback
      if (!services) services = item.description || 'N/A';

      // Amount
      const amount = formatCurrency(item.totalAmount);

      tableData.push([orderNum, dateOrderCell, poRoTagStock, vehicle, vin, services, amount]);
    });

    // Add separator row with date after each group (except last)
    if (groupIndex < groupedData.length - 1) {
      const nextGroupDate = groupedData[groupIndex + 1].date;
      tableData.push([
        {
          content: nextGroupDate,
          colSpan: 7, // 7 columns total (Date and Order combined)
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

  // Generate table using autoTable
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
      overflow: 'visible', // Default to visible for all cells
      minCellHeight: 6,
    },
    headStyles: {
      fillColor: colors.headerBg,
      textColor: colors.headerText,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
      cellPadding: 2.5,
      overflow: 'visible', // No wrap for headers
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
      fillColor: [249, 250, 251], // Gray-50 for zebra striping
    },
    showHead: 'everyPage',
    margin: { left: 20, right: 20, bottom: 25 },
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
        // Date/Order combined column - column 1 (compact for page breaks)
        if (data.column.index === 1) {
          data.cell.styles.overflow = 'visible';
          data.cell.styles.fontSize = 7;
          data.cell.styles.cellPadding = { top: 1, bottom: 1, left: 2, right: 2 };
          data.cell.styles.lineHeight = 1.1; // Reduce line spacing
        }
        // Stock/PO/RO column - column 2 (optimized for service orders)
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
    didDrawPage: (data) => {
      // This function is called AFTER the table is fully rendered
      // So we can get the correct total number of pages
      const pageHeight = doc.internal.pageSize.height;
      const currentPage = doc.getCurrentPageInfo().pageNumber;

      // Wait for next tick to ensure all pages are created
      setTimeout(() => {
        const totalPages = doc.getNumberOfPages();

        // Add footer separator line
        doc.setDrawColor(colors.border);
        doc.setLineWidth(0.3);
        doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

        // Footer metadata
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.muted);

        // Left side - Generated date and invoice info
        const generatedDate = new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        doc.text(`Generated: ${generatedDate}`, 20, pageHeight - 15);
        doc.text(`Invoice #${invoice.invoiceNumber}`, 20, pageHeight - 11);

        // Department (if available)
        if (invoice.metadata?.departments && invoice.metadata.departments.length > 0) {
          const depts = invoice.metadata.departments.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
          doc.text(`Dept: ${depts}`, 20, pageHeight - 7);
        }

        // Center - Page numbers (always show) - NOW WITH CORRECT TOTAL
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(colors.primary);
        doc.text(
          `Page ${currentPage} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 11,
          { align: 'center' }
        );

        // Right side - Dealer name and service period
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.muted);
        doc.text(
          invoice.dealership?.name || 'My Detail Area',
          pageWidth - 20,
          pageHeight - 15,
          { align: 'right' }
        );

        // Service period (if available)
        if (invoice.metadata?.filter_date_range) {
          const startDate = formatShortDate(invoice.metadata.filter_date_range.start);
          const endDate = formatShortDate(invoice.metadata.filter_date_range.end);
          doc.setFontSize(6);
          doc.text(
            `Period: ${startDate} - ${endDate}`,
            pageWidth - 20,
            pageHeight - 11,
            { align: 'right' }
          );
        }

        // Total vehicles count
        doc.setFontSize(6);
        doc.text(
          `${invoice.items?.length || 0} vehicles`,
          pageWidth - 20,
          pageHeight - 7,
          { align: 'right' }
        );
      }, 0);
    }
  });

  // Get Y position after table
  // @ts-ignore - autoTable adds lastAutoTable property to jsPDF instance
  const finalY = doc.lastAutoTable?.finalY || yPosition + 50;
  yPosition = finalY + 10;

  // ===== ADD FOOTERS TO ALL PAGES AFTER TABLE COMPLETION =====
  const totalPages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.height;

  // Add footers to all pages now that we have the correct total
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Add footer separator line
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

    // Footer metadata
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.muted);

    // Left side - Generated date and invoice info
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.text(`Generated: ${generatedDate}`, 20, pageHeight - 15);
    doc.text(`Invoice #${invoice.invoiceNumber}`, 20, pageHeight - 11);

    // Department (if available)
    if (invoice.metadata?.departments && invoice.metadata.departments.length > 0) {
      const depts = invoice.metadata.departments.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
      doc.text(`Dept: ${depts}`, 20, pageHeight - 7);
    }

    // Center - Page numbers (NOW WITH CORRECT TOTAL)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 11,
      { align: 'center' }
    );

    // Right side - Dealer name and service period
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.muted);
    doc.text(
      invoice.dealership?.name || 'My Detail Area',
      pageWidth - 20,
      pageHeight - 15,
      { align: 'right' }
    );

    // Service period (if available)
    if (invoice.metadata?.filter_date_range) {
      const startDate = formatShortDate(invoice.metadata.filter_date_range.start);
      const endDate = formatShortDate(invoice.metadata.filter_date_range.end);
      doc.setFontSize(6);
      doc.text(
        `Period: ${startDate} - ${endDate}`,
        pageWidth - 20,
        pageHeight - 11,
        { align: 'right' }
      );
    }

    // Total vehicles count
    doc.setFontSize(6);
    doc.text(
      `${invoice.items?.length || 0} vehicles`,
      pageWidth - 20,
      pageHeight - 7,
      { align: 'right' }
    );
  }
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // Add footer separator line
    doc.setDrawColor(colors.border);
    doc.setLineWidth(0.3);
    doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);

    // Footer metadata
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.muted);

    // Left side - Generated date and invoice info
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    doc.text(`Generated: ${generatedDate}`, 20, pageHeight - 15);
    doc.text(`Invoice #${invoice.invoiceNumber}`, 20, pageHeight - 11);

    // Department (if available)
    if (invoice.metadata?.departments && invoice.metadata.departments.length > 0) {
      const depts = invoice.metadata.departments.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
      doc.text(`Dept: ${depts}`, 20, pageHeight - 7);
    }

    // Center - Page numbers (NOW WITH CORRECT TOTAL)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(colors.primary);
    doc.text(
      `Page ${pageNum} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 11,
      { align: 'center' }
    );

    // Right side - Dealer name and service period
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(colors.muted);
    doc.text(
      invoice.dealership?.name || 'My Detail Area',
      pageWidth - 20,
      pageHeight - 15,
      { align: 'right' }
    );

    // Service period (if available)
    if (invoice.metadata?.filter_date_range) {
      const startDate = formatShortDate(invoice.metadata.filter_date_range.start);
      const endDate = formatShortDate(invoice.metadata.filter_date_range.end);
      doc.setFontSize(6);
      doc.text(
        `Period: ${startDate} - ${endDate}`,
        pageWidth - 20,
        pageHeight - 11,
        { align: 'right' }
      );
    }

    // Total vehicles count
    doc.setFontSize(6);
    doc.text(
      `${invoice.items?.length || 0} vehicles`,
      pageWidth - 20,
      pageHeight - 7,
      { align: 'right' }
    );
  }

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
  // Generate filename with dealer name, invoice number, department, and date range
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

  const filename = `${sanitizedDealerName}_${invoiceNum}${deptPart}${dateRangePart}.pdf`;
  doc.save(filename);
}
