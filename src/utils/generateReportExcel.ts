// =====================================================
// GENERATE REPORT EXCEL UTILITY
// Created: 2024-10-23
// Description: Generate Excel reports from analytics data using ExcelJS
// =====================================================

import * as ExcelJS from 'exceljs';
import type { OrderAnalytics, RevenueAnalytics, PerformanceTrends } from '@/hooks/useReportsData';
import type { InvoiceSummary } from '@/types/invoices';

// =====================================================
// TYPES
// =====================================================

export interface ExcelExportOptions {
  reportType: 'operational' | 'financial' | 'performance' | 'invoices';
  data: OrderAnalytics | RevenueAnalytics | PerformanceTrends | InvoiceSummary | null;
  dealershipName: string;
  startDate: Date;
  endDate: Date;
  includeSections?: {
    summary?: boolean;
    charts?: boolean;
    tables?: boolean;
  };
}

// =====================================================
// CONSTANTS - Notion-style Colors
// =====================================================

const COLORS = {
  primary: 'FF6366F1', // Indigo-500 (muted)
  gray50: 'FFF9FAFB',
  gray100: 'FFF3F4F6',
  gray200: 'FFE5E7EB',
  gray700: 'FF374151',
  gray900: 'FF111827',
  emerald500: 'FF10B981',
  amber500: 'FFF59E0B',
  red500: 'FFEF4444',
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// =====================================================
// STYLING FUNCTIONS
// =====================================================

function applyHeaderStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    size: 12,
    color: { argb: 'FFFFFFFF' },
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: COLORS.gray700 },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function applyTitleStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    size: 18,
    color: { argb: COLORS.gray900 },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function applySectionTitleStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    bold: true,
    size: 14,
    color: { argb: COLORS.gray700 },
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

function applyDataCellStyle(cell: ExcelJS.Cell): void {
  cell.font = {
    size: 11,
  };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
}

// =====================================================
// MAIN EXPORT FUNCTION
// =====================================================

export async function generateReportExcel(options: ExcelExportOptions): Promise<void> {
  const {
    reportType,
    data,
    dealershipName,
    startDate,
    endDate,
    includeSections = { summary: true, charts: false, tables: true }
  } = options;

  if (!data) {
    throw new Error('No data provided for Excel export');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dealer Detail Service LLC';
  workbook.created = new Date();

  // Add worksheet
  const worksheet = workbook.addWorksheet(reportType.toUpperCase());

  // Set column widths
  worksheet.columns = [
    { width: 30 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
    { width: 20 },
  ];

  let currentRow = 1;

  // Title
  const titleCell = worksheet.getCell(`A${currentRow}`);
  titleCell.value = `${dealershipName} - ${reportType.toUpperCase()} REPORT`;
  applyTitleStyle(titleCell);
  currentRow += 2;

  // Date range
  const dateCell = worksheet.getCell(`A${currentRow}`);
  dateCell.value = `Period: ${formatDate(startDate)} to ${formatDate(endDate)}`;
  dateCell.font = { size: 11, color: { argb: COLORS.gray700 } };
  currentRow += 1;

  const generatedCell = worksheet.getCell(`A${currentRow}`);
  generatedCell.value = `Generated: ${formatDate(new Date())}`;
  generatedCell.font = { size: 11, color: { argb: COLORS.gray700 } };
  currentRow += 2;

  // Generate report based on type
  switch (reportType) {
    case 'operational':
      currentRow = await generateOperationalExcel(
        worksheet,
        data as OrderAnalytics,
        includeSections,
        currentRow
      );
      break;
    case 'financial':
      currentRow = await generateFinancialExcel(
        worksheet,
        data as RevenueAnalytics,
        includeSections,
        currentRow
      );
      break;
    case 'performance':
      currentRow = await generatePerformanceExcel(
        worksheet,
        data as PerformanceTrends,
        includeSections,
        currentRow
      );
      break;
    case 'invoices':
      currentRow = await generateInvoicesExcel(
        worksheet,
        data as InvoiceSummary,
        includeSections,
        currentRow
      );
      break;
  }

  // Download Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  const filename = `${reportType}_report_${formatDate(startDate)}_${formatDate(endDate)}.xlsx`;
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// =====================================================
// REPORT-SPECIFIC GENERATORS
// =====================================================

async function generateOperationalExcel(
  worksheet: ExcelJS.Worksheet,
  data: OrderAnalytics,
  sections: { summary?: boolean; tables?: boolean },
  startRow: number
): Promise<number> {
  let currentRow = startRow;

  // Summary section
  if (sections.summary) {
    const summaryTitleCell = worksheet.getCell(`A${currentRow}`);
    summaryTitleCell.value = 'SUMMARY';
    applySectionTitleStyle(summaryTitleCell);
    currentRow += 1;

    const summaryData = [
      ['Total Orders', data.total_orders],
      ['Pending Orders', data.pending_orders],
      ['In Progress Orders', data.in_progress_orders],
      ['Completed Orders', data.completed_orders],
      ['Cancelled Orders', data.cancelled_orders],
      ['Total Revenue', formatCurrency(data.total_revenue)],
      ['Average Order Value', formatCurrency(data.avg_order_value)],
      ['Completion Rate', formatPercent(data.completion_rate)],
      ['Average Processing Time', `${data.avg_processing_time_hours.toFixed(1)} hours`],
      ['SLA Compliance Rate', formatPercent(data.sla_compliance_rate)],
    ];

    summaryData.forEach((row) => {
      const labelCell = worksheet.getCell(`A${currentRow}`);
      const valueCell = worksheet.getCell(`B${currentRow}`);
      labelCell.value = row[0];
      valueCell.value = row[1];
      applyDataCellStyle(labelCell);
      applyDataCellStyle(valueCell);
      labelCell.font = { ...labelCell.font, bold: true };
      currentRow += 1;
    });

    currentRow += 1;
  }

  // Tables section
  if (sections.tables) {
    // Daily data
    const dailyTitleCell = worksheet.getCell(`A${currentRow}`);
    dailyTitleCell.value = 'DAILY DATA';
    applySectionTitleStyle(dailyTitleCell);
    currentRow += 1;

    // Headers
    ['Date', 'Orders', 'Revenue'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    // Data rows
    data.daily_data.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.date;
      worksheet.getCell(`B${currentRow}`).value = row.orders;
      worksheet.getCell(`C${currentRow}`).value = formatCurrency(row.revenue);
      currentRow += 1;
    });

    currentRow += 2;

    // Status distribution
    const statusTitleCell = worksheet.getCell(`A${currentRow}`);
    statusTitleCell.value = 'STATUS DISTRIBUTION';
    applySectionTitleStyle(statusTitleCell);
    currentRow += 1;

    ['Status', 'Count'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.status_distribution.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.name;
      worksheet.getCell(`B${currentRow}`).value = row.value;
      currentRow += 1;
    });

    currentRow += 2;

    // Type distribution
    const typeTitleCell = worksheet.getCell(`A${currentRow}`);
    typeTitleCell.value = 'ORDER TYPE DISTRIBUTION';
    applySectionTitleStyle(typeTitleCell);
    currentRow += 1;

    ['Type', 'Count'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.type_distribution.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.name;
      worksheet.getCell(`B${currentRow}`).value = row.value;
      currentRow += 1;
    });
  }

  return currentRow;
}

async function generateFinancialExcel(
  worksheet: ExcelJS.Worksheet,
  data: RevenueAnalytics,
  sections: { summary?: boolean; tables?: boolean },
  startRow: number
): Promise<number> {
  let currentRow = startRow;

  // Summary section
  if (sections.summary) {
    const summaryTitleCell = worksheet.getCell(`A${currentRow}`);
    summaryTitleCell.value = 'FINANCIAL SUMMARY';
    applySectionTitleStyle(summaryTitleCell);
    currentRow += 1;

    const summaryData = [
      ['Total Revenue', formatCurrency(data.total_revenue)],
      ['Average Revenue per Period', formatCurrency(data.avg_revenue_per_period)],
      ['Growth Rate', formatPercent(data.growth_rate)],
    ];

    summaryData.forEach((row) => {
      const labelCell = worksheet.getCell(`A${currentRow}`);
      const valueCell = worksheet.getCell(`B${currentRow}`);
      labelCell.value = row[0];
      valueCell.value = row[1];
      applyDataCellStyle(labelCell);
      applyDataCellStyle(valueCell);
      labelCell.font = { ...labelCell.font, bold: true };
      currentRow += 1;
    });

    currentRow += 1;
  }

  // Tables section
  if (sections.tables) {
    // Period data
    const periodTitleCell = worksheet.getCell(`A${currentRow}`);
    periodTitleCell.value = 'REVENUE BY PERIOD';
    applySectionTitleStyle(periodTitleCell);
    currentRow += 1;

    ['Period', 'Revenue', 'Orders'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.period_data.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.period;
      worksheet.getCell(`B${currentRow}`).value = formatCurrency(row.revenue);
      worksheet.getCell(`C${currentRow}`).value = row.orders;
      currentRow += 1;
    });

    currentRow += 2;

    // Top services
    const servicesTitleCell = worksheet.getCell(`A${currentRow}`);
    servicesTitleCell.value = 'TOP SERVICES BY REVENUE';
    applySectionTitleStyle(servicesTitleCell);
    currentRow += 1;

    ['Service', 'Revenue'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.top_services.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.name;
      worksheet.getCell(`B${currentRow}`).value = formatCurrency(row.revenue);
      currentRow += 1;
    });
  }

  return currentRow;
}

async function generatePerformanceExcel(
  worksheet: ExcelJS.Worksheet,
  data: PerformanceTrends,
  sections: { summary?: boolean; tables?: boolean },
  startRow: number
): Promise<number> {
  let currentRow = startRow;

  if (sections.tables) {
    // Efficiency trends
    const efficiencyTitleCell = worksheet.getCell(`A${currentRow}`);
    efficiencyTitleCell.value = 'EFFICIENCY TRENDS';
    applySectionTitleStyle(efficiencyTitleCell);
    currentRow += 1;

    ['Week', 'Efficiency'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.efficiency_trends.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.week;
      worksheet.getCell(`B${currentRow}`).value = formatPercent(row.efficiency);
      currentRow += 1;
    });

    currentRow += 2;

    // SLA trends
    const slaTitleCell = worksheet.getCell(`A${currentRow}`);
    slaTitleCell.value = 'SLA COMPLIANCE TRENDS';
    applySectionTitleStyle(slaTitleCell);
    currentRow += 1;

    ['Week', 'SLA Rate'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.sla_trends.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.week;
      worksheet.getCell(`B${currentRow}`).value = formatPercent(row.sla_rate);
      currentRow += 1;
    });

    currentRow += 2;

    // Volume trends
    const volumeTitleCell = worksheet.getCell(`A${currentRow}`);
    volumeTitleCell.value = 'VOLUME TRENDS';
    applySectionTitleStyle(volumeTitleCell);
    currentRow += 1;

    ['Week', 'Volume'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.volume_trends.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.week;
      worksheet.getCell(`B${currentRow}`).value = row.volume;
      currentRow += 1;
    });

    currentRow += 2;

    // Department performance
    const deptTitleCell = worksheet.getCell(`A${currentRow}`);
    deptTitleCell.value = 'DEPARTMENT PERFORMANCE';
    applySectionTitleStyle(deptTitleCell);
    currentRow += 1;

    ['Department', 'Total Orders', 'Completion Rate', 'Avg Processing Time'].forEach((header, index) => {
      const cell = worksheet.getCell(currentRow, index + 1);
      cell.value = header;
      applyHeaderStyle(cell);
    });
    currentRow += 1;

    data.department_performance.forEach((row) => {
      worksheet.getCell(`A${currentRow}`).value = row.department;
      worksheet.getCell(`B${currentRow}`).value = row.total_orders;
      worksheet.getCell(`C${currentRow}`).value = formatPercent(row.completion_rate);
      worksheet.getCell(`D${currentRow}`).value = `${row.avg_processing_time.toFixed(1)} hours`;
      currentRow += 1;
    });
  }

  return currentRow;
}

async function generateInvoicesExcel(
  worksheet: ExcelJS.Worksheet,
  data: InvoiceSummary,
  sections: { summary?: boolean; tables?: boolean },
  startRow: number
): Promise<number> {
  let currentRow = startRow;

  // Summary section
  if (sections.summary) {
    const summaryTitleCell = worksheet.getCell(`A${currentRow}`);
    summaryTitleCell.value = 'INVOICES SUMMARY';
    applySectionTitleStyle(summaryTitleCell);
    currentRow += 1;

    const summaryData = [
      ['Total Invoices', data.totalInvoices],
      ['Total Amount', formatCurrency(data.totalAmount)],
      ['Total Paid', formatCurrency(data.totalPaid)],
      ['Total Due', formatCurrency(data.totalDue)],
      ['Pending Count', data.pendingCount],
      ['Overdue Count', data.overdueCount],
      ['Paid Count', data.paidCount],
    ];

    summaryData.forEach((row) => {
      const labelCell = worksheet.getCell(`A${currentRow}`);
      const valueCell = worksheet.getCell(`B${currentRow}`);
      labelCell.value = row[0];
      valueCell.value = row[1];
      applyDataCellStyle(labelCell);
      applyDataCellStyle(valueCell);
      labelCell.font = { ...labelCell.font, bold: true };
      currentRow += 1;
    });
  }

  return currentRow;
}
