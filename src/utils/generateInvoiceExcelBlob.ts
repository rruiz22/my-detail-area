// =====================================================
// GENERATE INVOICE EXCEL BLOB
// Created: 2025-11-03
// Updated: 2025-11-25 - Unified with generateInvoiceExcel.ts format
// Description: Generate Excel as blob for email attachments with complete formatting
// =====================================================

import type { InvoiceWithDetails } from '@/types/invoices';
import { format } from 'date-fns';
import ExcelJS from 'exceljs';
import {
  DEPARTMENT_DISPLAY_NAMES,
  shouldShowDepartmentGrouping,
  sortInvoiceItemsByDepartment,
} from '@/utils/invoiceSorting';

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
 * Get the correct date for an invoice item based on order type
 * Sales & Service orders: due_date
 * Recon & Carwash orders: completed_date
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
 * Generate Excel file and return as Blob with filename
 * Uses ExcelJS for advanced formatting and styling capabilities
 */
export async function generateInvoiceExcelBlob(invoice: InvoiceWithDetails): Promise<{ blob: Blob; filename: string }> {
  // Create workbook and worksheet
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dealer Detail Service LLC';
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet('Invoice', {
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    }
  });

  // Define color palette (consistent with UI)
  const colors = {
    headerBg: 'FF6B7280',      // gray-500 (print friendly)
    headerText: 'FFFFFFFF',    // white
    titleText: 'FF111827',     // gray-900
    labelText: 'FF6B7280',     // gray-500
    valueText: 'FF000000',     // black
    totalsBg: 'FFF3F4F6',      // gray-100
    zebraStripe: 'FFF9FAFB',   // gray-50
    borderLight: 'FFE5E7EB',   // gray-200
    borderDark: 'FF9CA3AF'     // gray-400
  };

  // Set column widths (services column will be auto-adjusted later)
  worksheet.columns = [
    { key: 'date', width: 12 },
    { key: 'order', width: 10 },
    { key: 'po_ro_stock', width: 15 },
    { key: 'vehicle', width: 20 },
    { key: 'vin', width: 18 },
    { key: 'services', width: 10 }, // Will be auto-adjusted
    { key: 'amount', width: 12 }
  ];

  let currentRow = 1;

  // ===============================================
  // HEADER SECTION (Rows 1-2)
  // ===============================================

  // Row 1: Title and Invoice Number
  const titleRow = worksheet.getRow(currentRow);
  titleRow.height = 30;

  const titleCell = titleRow.getCell(1);
  titleCell.value = 'Dealer Detail Service';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: colors.titleText } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);

  const invoiceNum = invoice.invoiceNumber || invoice.invoice_number || 'undefined';
  const invoiceNumCell = titleRow.getCell(7);
  invoiceNumCell.value = `#${invoiceNum}`;
  invoiceNumCell.font = { name: 'Calibri', size: 18, bold: true, color: { argb: colors.titleText } };
  invoiceNumCell.alignment = { vertical: 'middle', horizontal: 'right' };

  currentRow += 2; // Skip row 2 (empty space)

  // ===============================================
  // BILL TO / INVOICE DETAILS (Rows 3-6)
  // ===============================================

  // Row 3: "Bill To:" label and "Issue Date:"
  let detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = 'Bill To:';
  detailRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).value = 'Issue Date:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  const issueDate = invoice.issueDate || invoice.issue_date;
  detailRow.getCell(7).value = formatDateWithYear(issueDate);
  detailRow.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: colors.valueText } };
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 4: Dealership name and "Due Date:"
  detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = invoice.dealership?.name || 'N/A';
  detailRow.getCell(1).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.valueText } };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  detailRow.getCell(6).value = 'Due Date:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  const dueDate = invoice.dueDate || invoice.due_date;
  detailRow.getCell(7).value = formatDateWithYear(dueDate);
  detailRow.getCell(7).font = { name: 'Calibri', size: 10, color: { argb: colors.valueText } };
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 5: Address and "Total Amount:"
  detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = invoice.dealership?.address || '';
  detailRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: colors.labelText } };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  detailRow.getCell(6).value = 'Total Amount:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  const totalAmount = invoice.totalAmount || invoice.total_amount;
  detailRow.getCell(7).value = totalAmount;
  detailRow.getCell(7).font = { name: 'Calibri', size: 11, bold: true, color: { argb: colors.valueText } };
  detailRow.getCell(7).numFmt = '$#,##0.00';
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 6: Email and "Total Vehicles:"
  detailRow = worksheet.getRow(currentRow);
  detailRow.height = 18;
  detailRow.getCell(1).value = `Email: ${invoice.dealership?.email || ''}`;
  detailRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: colors.labelText } };
  worksheet.mergeCells(currentRow, 1, currentRow, 4);
  detailRow.getCell(6).value = 'Total Vehicles:';
  detailRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
  detailRow.getCell(6).alignment = { horizontal: 'right' };
  detailRow.getCell(7).value = invoice.items?.length || 0;
  detailRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  detailRow.getCell(7).alignment = { horizontal: 'right' };
  currentRow++;

  // Row 7: Department (if available)
  if (invoice.metadata?.departments && invoice.metadata.departments.length > 0) {
    detailRow = worksheet.getRow(currentRow);
    detailRow.height = 18;
    const depts = invoice.metadata.departments.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
    detailRow.getCell(1).value = `Department: ${depts}`;
    detailRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: '6B7280' } }; // Gray-500
    worksheet.mergeCells(currentRow, 1, currentRow, 4);
    currentRow++;
  }

  currentRow++; // Empty row before table

  // ===============================================
  // TABLE HEADER (Dynamic based on order type)
  // ===============================================

  const poRoTagHeader = invoice.items?.some(i => i.metadata?.order_type === 'service')
    ? 'PO | RO | Tag'
    : 'Stock';

  const headerRow = worksheet.getRow(currentRow);
  headerRow.height = 22;
  headerRow.values = ['Date', 'Order', poRoTagHeader, 'Vehicle', 'VIN', 'Services', 'Amount'];

  // Style header cells with gray background
  headerRow.eachCell((cell, colNumber) => {
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

  // ===============================================
  // TABLE DATA ROWS (with zebra striping)
  // ===============================================

  // Sort items by department priority, then by date (matching download version)
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
    const itemDate = formatDate(getCorrectItemDate(item));
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

  const dataStartRow = currentRow;
  let rowIndex = 0; // Track overall row index for zebra striping
  let lastDepartment = '';

  groupedData.forEach((group, groupIndex) => {
    // Add department header if showing department headers and department changed
    if (showDepartmentHeaders && group.department && group.department !== lastDepartment) {
      const deptRow = worksheet.getRow(currentRow);
      const deptName = DEPARTMENT_DISPLAY_NAMES[group.department] || group.department.toUpperCase();
      const itemCount = departmentCounts[group.department] || 0;

      // Merge cells for department header
      worksheet.mergeCells(currentRow, 1, currentRow, 7);
      const deptCell = deptRow.getCell(1);
      deptCell.value = `${deptName} (${itemCount} items)`;
      deptCell.font = { bold: true, size: 11, color: { argb: 'FF003264' } };
      deptCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FF' }
      };
      deptCell.alignment = { horizontal: 'center', vertical: 'middle' };
      deptCell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
      };

      currentRow++;
      lastDepartment = group.department;
    }

    group.items.forEach((item) => {
      const row = worksheet.getRow(currentRow);
      row.height = 20;

      // Prepare data
      const dateStr = formatDate(getCorrectItemDate(item));
    const orderNum = item.metadata?.order_number || 'N/A';
    const poRoTagStock = item.metadata?.order_type === 'service'
      ? [item.metadata?.po, item.metadata?.ro, item.metadata?.tag]
          .filter(Boolean)
          .join(' | ') || 'N/A'
      : item.metadata?.order_type === 'carwash'
        ? item.metadata?.stock_number || item.metadata?.tag || 'N/A'
        : item.metadata?.stock_number || 'N/A';

    // Clean vehicle description - remove stock number suffix if present
    let vehicle = item.description || 'N/A';
    if (vehicle !== 'N/A' && vehicle.includes(' - ')) {
      vehicle = vehicle.split(' - ')[0].trim();
    }

    const vin = item.metadata?.vehicle_vin || 'N/A';

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

    const amount = item.totalAmount || item.total_amount || 0;

    // Set values
    row.getCell(1).value = dateStr;
    row.getCell(2).value = orderNum;
    row.getCell(3).value = poRoTagStock;
    row.getCell(4).value = vehicle;
    row.getCell(5).value = vin;
    row.getCell(6).value = services;
    row.getCell(7).value = amount;
      row.getCell(7).numFmt = '$#,##0.00';

      // Apply zebra striping
      const isEvenRow = rowIndex % 2 === 0;
      const fillColor = isEvenRow ? 'FFFFFFFF' : colors.zebraStripe;

      row.eachCell((cell, colNumber) => {
        cell.font = {
          name: 'Calibri',
          size: colNumber === 5 ? 8 : 9, // VIN column smaller
          color: { argb: colors.valueText }
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: fillColor }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 || colNumber === 2 ? 'center' : colNumber === 7 ? 'right' : 'left',
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
      rowIndex++;
    });

    // Add separator row with date between groups
    if (groupIndex < groupedData.length - 1) {
      const nextGroupDate = groupedData[groupIndex + 1].date;
      const separatorRow = worksheet.getRow(currentRow);
      separatorRow.height = 8; // Double height (was 4)

      // Merge all columns for the separator
      worksheet.mergeCells(currentRow, 1, currentRow, 7);

      // Set the date text in the merged cell
      const dateCell = separatorRow.getCell(1);
      dateCell.value = nextGroupDate;
      dateCell.font = {
        name: 'Calibri',
        size: 9,
        bold: true,
        color: { argb: 'FF6B7280' } // Gray-500
      };
      dateCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE5E7EB' } // Light gray
      };
      dateCell.alignment = {
        vertical: 'middle',
        horizontal: 'center'
      };

      currentRow++;
    }
  });

  // Auto-adjust Services column width based on content
  let maxServicesLength = 'Services'.length; // Start with header length
  (invoice.items || []).forEach(item => {
    const services = item.metadata?.service_names || 'N/A';
    if (services.length > maxServicesLength) {
      maxServicesLength = services.length;
    }
  });
  // Set width with constraints (min: 15, max: 40)
  const servicesColumn = worksheet.getColumn(6);
  servicesColumn.width = Math.min(Math.max(maxServicesLength + 2, 15), 40);

  currentRow++; // Empty row before totals

  // ===============================================
  // TOTALS SECTION
  // ===============================================

  // Subtotal
  let totalRow = worksheet.getRow(currentRow);
  const subtotal = invoice.subtotal || invoice.sub_total || 0;
  totalRow.getCell(6).value = 'Subtotal:';
  totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(7).value = subtotal;
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(7).alignment = { horizontal: 'right' };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(6).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  totalRow.getCell(7).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  currentRow++;

  // Tax
  totalRow = worksheet.getRow(currentRow);
  const taxRate = invoice.taxRate || invoice.tax_rate || 0;
  const taxAmount = invoice.taxAmount || invoice.tax_amount || 0;
  totalRow.getCell(6).value = `Tax (${taxRate}%):`;
  totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(6).alignment = { horizontal: 'right' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(7).value = taxAmount;
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(7).alignment = { horizontal: 'right' };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(6).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  totalRow.getCell(7).border = {
    top: { style: 'thin', color: { argb: colors.borderLight } },
    bottom: { style: 'thin', color: { argb: colors.borderLight } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  currentRow++;

  // Discount (if applicable)
  const discountAmount = invoice.discountAmount || invoice.discount_amount || 0;
  if (discountAmount > 0) {
    totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = 'Discount:';
    totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
    totalRow.getCell(7).value = -discountAmount;
    totalRow.getCell(7).numFmt = '$#,##0.00';
    totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.valueText } };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
    totalRow.getCell(6).border = {
      top: { style: 'thin', color: { argb: colors.borderLight } },
      bottom: { style: 'thin', color: { argb: colors.borderLight } },
      left: { style: 'thin', color: { argb: colors.borderLight } },
      right: { style: 'thin', color: { argb: colors.borderLight } }
    };
    totalRow.getCell(7).border = {
      top: { style: 'thin', color: { argb: colors.borderLight } },
      bottom: { style: 'thin', color: { argb: colors.borderLight } },
      left: { style: 'thin', color: { argb: colors.borderLight } },
      right: { style: 'thin', color: { argb: colors.borderLight } }
    };
    currentRow++;
  }

  // Total (with darker border on top)
  totalRow = worksheet.getRow(currentRow);
  totalRow.height = 22;
  totalRow.getCell(6).value = 'Total:';
  totalRow.getCell(6).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(7).value = totalAmount;
  totalRow.getCell(7).numFmt = '$#,##0.00';
  totalRow.getCell(7).font = { name: 'Calibri', size: 12, bold: true, color: { argb: colors.valueText } };
  totalRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalsBg } };
  totalRow.getCell(6).border = {
    top: { style: 'medium', color: { argb: colors.borderDark } },
    bottom: { style: 'medium', color: { argb: colors.borderDark } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  totalRow.getCell(7).border = {
    top: { style: 'medium', color: { argb: colors.borderDark } },
    bottom: { style: 'medium', color: { argb: colors.borderDark } },
    left: { style: 'thin', color: { argb: colors.borderLight } },
    right: { style: 'thin', color: { argb: colors.borderLight } }
  };
  currentRow++;

  // Amount Paid / Amount Due (if applicable)
  const amountPaid = invoice.amountPaid || invoice.amount_paid || 0;
  const amountDue = invoice.amountDue || invoice.amount_due || 0;
  if (amountPaid > 0) {
    currentRow++; // Empty row

    totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = 'Amount Paid:';
    totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF10B981' } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(7).value = amountPaid;
    totalRow.getCell(7).numFmt = '$#,##0.00';
    totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF10B981' } };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    currentRow++;

    totalRow = worksheet.getRow(currentRow);
    totalRow.getCell(6).value = 'Amount Due:';
    totalRow.getCell(6).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF59E0B' } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(7).value = amountDue;
    totalRow.getCell(7).numFmt = '$#,##0.00';
    totalRow.getCell(7).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFF59E0B' } };
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    currentRow++;
  }

  // ===============================================
  // NOTES SECTION
  // ===============================================

  const invoiceNotes = invoice.invoiceNotes || invoice.invoice_notes;
  if (invoiceNotes) {
    currentRow += 2; // Empty rows before notes

    const notesLabelRow = worksheet.getRow(currentRow);
    notesLabelRow.getCell(1).value = 'Notes:';
    notesLabelRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true, color: { argb: colors.labelText } };
    currentRow++;

    const notesRow = worksheet.getRow(currentRow);
    notesRow.getCell(1).value = invoiceNotes;
    notesRow.getCell(1).font = { name: 'Calibri', size: 9, color: { argb: colors.labelText } };
    notesRow.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    worksheet.mergeCells(currentRow, 1, currentRow, 7);
  }

  // ===============================================
  // RETURN BLOB AND FILENAME
  // ===============================================

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const filename = generateFilename(invoice, 'xlsx');

  return { blob, filename };
}
