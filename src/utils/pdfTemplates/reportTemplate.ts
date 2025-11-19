/**
 * REPORT PDF TEMPLATE - Professional Business Intelligence Design
 * Created: 2025-01-18
 * Description: Professional report template for payroll, attendance, and analytics
 *
 * Features:
 * - Centered title with report metadata
 * - Flexible orientation (portrait/landscape)
 * - Auto-paginated data tables
 * - Summary boxes with key metrics
 * - Professional footer with branding
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PDF_DESIGN } from '../pdfDesignSystem';
import {
  addDocumentTitle,
  addMetadata,
  addSummaryBox,
  addFooter,
  addDivider,
  addSectionHeading,
  formatCurrency,
  formatLongDate,
  formatDecimalHours,
  formatPercent,
  formatNumber,
  applyFont,
  applyTextColor,
  checkPageOverflow,
  type DealershipInfo,
} from '../pdfHelpers';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface ReportMetadata {
  reportTitle: string;
  reportSubtitle?: string;
  dateRange?: {
    start: string | Date;
    end: string | Date;
  };
  generatedDate?: string | Date;
  filters?: Array<{ label: string; value: string }>;
}

export interface ReportTableColumn {
  header: string;
  dataKey: string;
  width?: number | 'auto';
  align?: 'left' | 'center' | 'right';
  format?: 'text' | 'currency' | 'number' | 'percent' | 'hours';
  bold?: boolean;
  monospace?: boolean;
}

export interface ReportTableData {
  columns: ReportTableColumn[];
  rows: Record<string, any>[];
  footerRow?: Record<string, any>;
}

export interface ReportSummary {
  title: string;
  items: Array<{ label: string; value: string | number; bold?: boolean }>;
  position?: 'left' | 'right';
}

export interface ReportTemplateOptions {
  dealershipInfo: DealershipInfo;
  metadata: ReportMetadata;
  tables: ReportTableData[];
  summaries?: ReportSummary[];
  orientation?: 'portrait' | 'landscape';
  showDealershipHeader?: boolean;
}

// =====================================================
// FORMATTING HELPERS
// =====================================================

/**
 * Format cell value based on column format
 */
function formatCellValue(value: any, format?: string): string {
  if (value === null || value === undefined) return 'N/A';

  switch (format) {
    case 'currency':
      return formatCurrency(Number(value));
    case 'number':
      return formatNumber(Number(value));
    case 'percent':
      return formatPercent(Number(value));
    case 'hours':
      return formatDecimalHours(Number(value));
    case 'text':
    default:
      return String(value);
  }
}

// =====================================================
// REPORT TEMPLATE GENERATOR
// =====================================================

/**
 * Generate professional report PDF with Notion-style design
 */
export async function generateReportPDF(options: ReportTemplateOptions): Promise<jsPDF> {
  const {
    dealershipInfo,
    metadata,
    tables,
    summaries = [],
    orientation = 'portrait',
    showDealershipHeader = true,
  } = options;

  // Create PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = PDF_DESIGN.margins.top;

  // ===== DEALERSHIP HEADER (OPTIONAL) =====
  if (showDealershipHeader) {
    applyFont(doc, PDF_DESIGN.typography.small);
    applyTextColor(doc, PDF_DESIGN.colors.gray[500].rgb);
    doc.text(dealershipInfo.name, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  // ===== REPORT TITLE & METADATA =====
  applyFont(doc, PDF_DESIGN.typography.h1);
  applyTextColor(doc, PDF_DESIGN.colors.gray[900].rgb);
  doc.text(metadata.reportTitle, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Subtitle (if provided)
  if (metadata.reportSubtitle) {
    applyFont(doc, PDF_DESIGN.typography.body);
    applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
    doc.text(metadata.reportSubtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;
  }

  // Date range
  if (metadata.dateRange) {
    applyFont(doc, PDF_DESIGN.typography.body);
    applyTextColor(doc, PDF_DESIGN.colors.gray[600].rgb);
    const startDate = formatLongDate(metadata.dateRange.start);
    const endDate = formatLongDate(metadata.dateRange.end);
    doc.text(`Period: ${startDate} - ${endDate}`, pageWidth / 2, currentY, {
      align: 'center',
    });
    currentY += 5;
  }

  // Generated date
  const genDate = metadata.generatedDate
    ? formatLongDate(metadata.generatedDate)
    : formatLongDate(new Date());
  applyFont(doc, PDF_DESIGN.typography.caption);
  applyTextColor(doc, PDF_DESIGN.colors.gray[400].rgb);
  doc.text(`Generated: ${genDate}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += PDF_DESIGN.spacing.md;

  // Filters (if provided)
  if (metadata.filters && metadata.filters.length > 0) {
    currentY = addMetadata(doc, {
      items: metadata.filters,
      columns: 2,
      yPosition: currentY,
    });
    currentY += PDF_DESIGN.spacing.sm;
  }

  currentY = addDivider(doc, currentY);

  // ===== DATA TABLES =====
  for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
    const table = tables[tableIndex];

    // Check page overflow before table
    currentY = checkPageOverflow(doc, currentY, 40);

    // Table headers
    const headers = [table.columns.map((col) => col.header)];

    // Table body
    const body = table.rows.map((row) =>
      table.columns.map((col) => formatCellValue(row[col.dataKey], col.format))
    );

    // Footer row (if provided)
    if (table.footerRow) {
      const footerData = table.columns.map((col) =>
        formatCellValue(table.footerRow![col.dataKey], col.format)
      );
      body.push(footerData);
    }

    // Column styles
    const columnStyles: Record<number, any> = {};
    table.columns.forEach((col, index) => {
      columnStyles[index] = {
        cellWidth: col.width === 'auto' ? 'auto' : col.width || 'auto',
        halign: col.align || 'left',
        fontStyle: col.bold ? 'bold' : 'normal',
        font: col.monospace ? 'courier' : 'helvetica',
      };
    });

    // Generate table
    autoTable(doc, {
      head: headers,
      body: body,
      startY: currentY,
      theme: 'plain',
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: PDF_DESIGN.colors.gray[900].rgb as [number, number, number],
        lineColor: PDF_DESIGN.colors.gray[200].rgb as [number, number, number],
        lineWidth: 0.1,
        minCellHeight: 7,
      },
      headStyles: {
        fillColor: PDF_DESIGN.colors.gray[700].rgb as [number, number, number],
        textColor: PDF_DESIGN.colors.white.rgb as [number, number, number],
        fontStyle: 'bold',
        fontSize: orientation === 'landscape' ? 9 : 10,
        halign: 'left',
      },
      columnStyles,
      alternateRowStyles: {
        fillColor: PDF_DESIGN.colors.gray[50].rgb as [number, number, number],
      },
      // Footer row styling (last row)
      didParseCell: (data) => {
        if (
          table.footerRow &&
          data.section === 'body' &&
          data.row.index === body.length - 1
        ) {
          data.cell.styles.fillColor = PDF_DESIGN.colors.gray[100].rgb as [
            number,
            number,
            number
          ];
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 10;
        }
      },
      showHead: 'everyPage',
      margin: {
        left: PDF_DESIGN.margins.left,
        right: PDF_DESIGN.margins.right,
        bottom: PDF_DESIGN.margins.bottom + 15,
      },
      didDrawPage: (data) => {
        const pageNumber = doc.getCurrentPageInfo().pageNumber;
        const totalPages = doc.getNumberOfPages();

        addFooter(doc, {
          pageNumber,
          totalPages,
          leftText: metadata.reportTitle,
          rightText: dealershipInfo.name,
          showBranding: true,
        });
      },
    });

    // Update Y position after table
    const finalTableY = (doc as any).lastAutoTable?.finalY || currentY + 50;
    currentY = finalTableY + PDF_DESIGN.spacing.md;

    // Add spacing between tables
    if (tableIndex < tables.length - 1) {
      currentY += PDF_DESIGN.spacing.sm;
    }
  }

  // ===== SUMMARY BOXES =====
  if (summaries.length > 0) {
    currentY = checkPageOverflow(doc, currentY, 60);

    summaries.forEach((summary, index) => {
      const boxWidth = 90;
      let xPosition: number;

      if (summary.position === 'left') {
        xPosition = PDF_DESIGN.margins.left;
      } else if (summary.position === 'right') {
        xPosition = pageWidth - PDF_DESIGN.margins.right - boxWidth;
      } else {
        // Center
        xPosition = (pageWidth - boxWidth) / 2;
      }

      // Format summary items
      const formattedItems = summary.items.map((item) => ({
        label: item.label,
        value: typeof item.value === 'number' ? formatNumber(item.value) : String(item.value),
        bold: item.bold,
      }));

      const finalY = addSummaryBox(doc, xPosition, currentY, {
        items: formattedItems,
        title: summary.title,
        width: boxWidth,
      });

      // Only update currentY for the last summary (to stack vertically)
      if (index === summaries.length - 1) {
        currentY = finalY;
      }
    });
  }

  // ===== FINALIZE ALL PAGE FOOTERS =====
  const totalPages = doc.getNumberOfPages();
  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);
    addFooter(doc, {
      pageNumber: pageNum,
      totalPages,
      leftText: metadata.reportTitle,
      rightText: dealershipInfo.name,
      showBranding: true,
    });
  }

  return doc;
}

/**
 * Generate and download report PDF
 */
export async function downloadReportPDF(
  options: ReportTemplateOptions,
  filename?: string
): Promise<void> {
  const doc = await generateReportPDF(options);

  const sanitizedTitle = options.metadata.reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `${sanitizedTitle}_${dateStr}.pdf`;

  doc.save(finalFilename);
}

/**
 * Generate report PDF as blob (for preview)
 */
export async function generateReportPDFBlob(options: ReportTemplateOptions): Promise<Blob> {
  const doc = await generateReportPDF(options);
  return doc.output('blob');
}

// =====================================================
// SPECIALIZED REPORT TEMPLATES
// =====================================================

/**
 * Payroll Report Template (Landscape)
 */
export interface PayrollReportData {
  employees: Array<{
    employeeId: string;
    employeeName: string;
    department: string;
    regularHours: number;
    overtimeHours: number;
    totalHours: number;
    hourlyRate?: number;
    totalPay?: number;
  }>;
  totals: {
    totalEmployees: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
    grandTotalHours: number;
    totalPayroll?: number;
  };
  period: { start: string | Date; end: string | Date };
}

export async function generatePayrollReportPDF(
  dealershipInfo: DealershipInfo,
  data: PayrollReportData
): Promise<jsPDF> {
  const columns: ReportTableColumn[] = [
    { header: 'Employee', dataKey: 'employeeName', align: 'left', width: 45 },
    { header: 'ID', dataKey: 'employeeId', align: 'center', width: 20, monospace: true },
    { header: 'Dept', dataKey: 'department', align: 'center', width: 25 },
    { header: 'Regular Hrs', dataKey: 'regularHours', align: 'right', width: 25, format: 'hours' },
    { header: 'OT Hrs', dataKey: 'overtimeHours', align: 'right', width: 20, format: 'hours' },
    { header: 'Total Hrs', dataKey: 'totalHours', align: 'right', width: 25, format: 'hours', bold: true },
  ];

  // Add pay columns if available
  if (data.employees[0]?.hourlyRate !== undefined) {
    columns.push(
      { header: 'Hourly Rate', dataKey: 'hourlyRate', align: 'right', width: 25, format: 'currency' },
      { header: 'Total Pay', dataKey: 'totalPay', align: 'right', width: 30, format: 'currency', bold: true }
    );
  }

  // Footer row with totals
  const footerRow: Record<string, any> = {
    employeeName: 'TOTALS',
    employeeId: '',
    department: '',
    regularHours: data.totals.totalRegularHours,
    overtimeHours: data.totals.totalOvertimeHours,
    totalHours: data.totals.grandTotalHours,
  };

  if (data.totals.totalPayroll !== undefined) {
    footerRow.totalPay = data.totals.totalPayroll;
  }

  const summaryItems = [
    { label: 'Total Employees', value: data.totals.totalEmployees, bold: true },
    { label: 'Total Regular Hours', value: formatDecimalHours(data.totals.totalRegularHours) },
    { label: 'Total Overtime Hours', value: formatDecimalHours(data.totals.totalOvertimeHours) },
    { label: 'Grand Total Hours', value: formatDecimalHours(data.totals.grandTotalHours), bold: true },
  ];

  if (data.totals.totalPayroll !== undefined) {
    summaryItems.push({
      label: 'Total Payroll',
      value: formatCurrency(data.totals.totalPayroll),
      bold: true,
    });
  }

  return generateReportPDF({
    dealershipInfo,
    metadata: {
      reportTitle: 'PAYROLL REPORT',
      dateRange: data.period,
    },
    tables: [
      {
        columns,
        rows: data.employees,
        footerRow,
      },
    ],
    summaries: [
      {
        title: 'SUMMARY',
        items: summaryItems,
        position: 'right',
      },
    ],
    orientation: 'landscape',
  });
}

/**
 * Attendance Report Template (Portrait)
 */
export interface AttendanceReportData {
  records: Array<{
    employeeName: string;
    date: string | Date;
    clockIn?: string | Date;
    clockOut?: string | Date;
    totalHours: number;
    status: 'present' | 'absent' | 'late' | 'on_leave';
    notes?: string;
  }>;
  summary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    leaveDays: number;
    attendanceRate: number;
  };
  period: { start: string | Date; end: string | Date };
}

export async function generateAttendanceReportPDF(
  dealershipInfo: DealershipInfo,
  data: AttendanceReportData
): Promise<jsPDF> {
  const columns: ReportTableColumn[] = [
    { header: 'Employee', dataKey: 'employeeName', align: 'left', width: 50 },
    { header: 'Date', dataKey: 'date', align: 'center', width: 25 },
    { header: 'Clock In', dataKey: 'clockIn', align: 'center', width: 25 },
    { header: 'Clock Out', dataKey: 'clockOut', align: 'center', width: 25 },
    { header: 'Hours', dataKey: 'totalHours', align: 'right', width: 20, format: 'hours' },
    { header: 'Status', dataKey: 'status', align: 'center', width: 25 },
  ];

  return generateReportPDF({
    dealershipInfo,
    metadata: {
      reportTitle: 'ATTENDANCE REPORT',
      dateRange: data.period,
    },
    tables: [
      {
        columns,
        rows: data.records,
      },
    ],
    summaries: [
      {
        title: 'ATTENDANCE SUMMARY',
        items: [
          { label: 'Total Days', value: data.summary.totalDays },
          { label: 'Present Days', value: data.summary.presentDays },
          { label: 'Absent Days', value: data.summary.absentDays },
          { label: 'Late Days', value: data.summary.lateDays },
          { label: 'Leave Days', value: data.summary.leaveDays },
          { label: 'Attendance Rate', value: formatPercent(data.summary.attendanceRate), bold: true },
        ],
        position: 'right',
      },
    ],
    orientation: 'portrait',
  });
}
