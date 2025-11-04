// =====================================================
// GENERATE REPORT PDF UTILITY
// Created: 2024-10-23
// Description: Generate PDF reports from analytics data using jsPDF
// =====================================================

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { OrderAnalytics, RevenueAnalytics, PerformanceTrends } from '@/hooks/useReportsData';
import type { InvoiceSummary } from '@/types/invoices';

// =====================================================
// TYPES
// =====================================================

export interface PDFExportOptions {
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
// CONSTANTS - Notion-style Colors (RGB)
// =====================================================

const COLORS = {
  gray50: [249, 250, 251],
  gray100: [243, 244, 246],
  gray200: [229, 231, 235],
  gray500: [107, 114, 128],
  gray700: [55, 65, 81],
  gray900: [17, 24, 39],
  emerald500: [16, 185, 129],
  amber500: [245, 158, 11],
  red500: [239, 68, 68],
  indigo500: [99, 102, 241],
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
// PDF STYLING FUNCTIONS
// =====================================================

function addHeader(doc: jsPDF, dealershipName: string, reportType: string): void {
  // Company name
  doc.setFontSize(10);
  doc.setTextColor(COLORS.gray500[0], COLORS.gray500[1], COLORS.gray500[2]);
  doc.text(dealershipName, 20, 15);

  // Report title
  doc.setFontSize(20);
  doc.setTextColor(COLORS.gray900[0], COLORS.gray900[1], COLORS.gray900[2]);
  doc.text(`${reportType.toUpperCase()} REPORT`, 20, 25);
}

function addFooter(doc: jsPDF, pageNumber: number): void {
  const pageHeight = doc.internal.pageSize.height;
  const pageWidth = doc.internal.pageSize.width;

  doc.setFontSize(8);
  doc.setTextColor(COLORS.gray500[0], COLORS.gray500[1], COLORS.gray500[2]);
  doc.text(`Page ${pageNumber}`, 20, pageHeight - 10);

  // Developed by My Detail Area
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text('Developed by My Detail Area', pageWidth / 2, pageHeight - 10, { align: 'center' });
}

function addSectionTitle(doc: jsPDF, title: string, yPos: number): number {
  doc.setFontSize(14);
  doc.setTextColor(COLORS.gray700[0], COLORS.gray700[1], COLORS.gray700[2]);
  doc.text(title, 20, yPos);
  return yPos + 8;
}

// =====================================================
// MAIN EXPORT FUNCTION
// =====================================================

export async function generateReportPDF(options: PDFExportOptions): Promise<void> {
  const {
    reportType,
    data,
    dealershipName,
    startDate,
    endDate,
    includeSections = { summary: true, charts: false, tables: true }
  } = options;

  if (!data) {
    throw new Error('No data provided for PDF export');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  let currentY = 35;
  let pageNumber = 1;

  // Header
  addHeader(doc, dealershipName, reportType);

  // Date range
  doc.setFontSize(10);
  doc.setTextColor(COLORS.gray700[0], COLORS.gray700[1], COLORS.gray700[2]);
  doc.text(`Period: ${formatDate(startDate)} to ${formatDate(endDate)}`, 20, currentY);
  currentY += 5;
  doc.text(`Generated: ${formatDate(new Date())}`, 20, currentY);
  currentY += 15;

  // Generate report based on type
  switch (reportType) {
    case 'operational':
      currentY = generateOperationalPDF(doc, data as OrderAnalytics, includeSections, currentY);
      break;
    case 'financial':
      currentY = generateFinancialPDF(doc, data as RevenueAnalytics, includeSections, currentY);
      break;
    case 'performance':
      currentY = generatePerformancePDF(doc, data as PerformanceTrends, includeSections, currentY);
      break;
    case 'invoices':
      currentY = generateInvoicesPDF(doc, data as InvoiceSummary, includeSections, currentY);
      break;
  }

  // Footer
  addFooter(doc, pageNumber);

  // Download PDF
  const filename = `${reportType}_report_${formatDate(startDate)}_${formatDate(endDate)}.pdf`;
  doc.save(filename);
}

// =====================================================
// REPORT-SPECIFIC GENERATORS
// =====================================================

function generateOperationalPDF(
  doc: jsPDF,
  data: OrderAnalytics,
  sections: { summary?: boolean; tables?: boolean },
  startY: number
): number {
  let currentY = startY;

  // Summary section
  if (sections.summary) {
    currentY = addSectionTitle(doc, 'SUMMARY', currentY);

    const summaryData = [
      ['Total Orders', data.total_orders.toString()],
      ['Pending Orders', data.pending_orders.toString()],
      ['In Progress Orders', data.in_progress_orders.toString()],
      ['Completed Orders', data.completed_orders.toString()],
      ['Cancelled Orders', data.cancelled_orders.toString()],
      ['Total Revenue', formatCurrency(data.total_revenue)],
      ['Average Order Value', formatCurrency(data.avg_order_value)],
      ['Completion Rate', formatPercent(data.completion_rate)],
      ['Average Processing Time', `${data.avg_processing_time_hours.toFixed(1)} hours`],
      ['SLA Compliance Rate', formatPercent(data.sla_compliance_rate)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Tables section
  if (sections.tables) {
    // Daily data
    currentY = addSectionTitle(doc, 'DAILY DATA', currentY);

    const dailyTableData = data.daily_data.map(d => [
      d.date,
      d.orders.toString(),
      formatCurrency(d.revenue)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Date', 'Orders', 'Revenue']],
      body: dailyTableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // Status distribution
    currentY = addSectionTitle(doc, 'STATUS DISTRIBUTION', currentY);

    const statusTableData = data.status_distribution.map(s => [
      s.name,
      s.value.toString()
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Status', 'Count']],
      body: statusTableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  return currentY;
}

function generateFinancialPDF(
  doc: jsPDF,
  data: RevenueAnalytics,
  sections: { summary?: boolean; tables?: boolean },
  startY: number
): number {
  let currentY = startY;

  // Summary section
  if (sections.summary) {
    currentY = addSectionTitle(doc, 'FINANCIAL SUMMARY', currentY);

    const summaryData = [
      ['Total Revenue', formatCurrency(data.total_revenue)],
      ['Average Revenue per Period', formatCurrency(data.avg_revenue_per_period)],
      ['Growth Rate', formatPercent(data.growth_rate)],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  }

  // Tables section
  if (sections.tables) {
    // Period data
    currentY = addSectionTitle(doc, 'REVENUE BY PERIOD', currentY);

    const periodTableData = data.period_data.map(p => [
      p.period,
      formatCurrency(p.revenue),
      p.orders.toString()
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Period', 'Revenue', 'Orders']],
      body: periodTableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

    // Top services
    currentY = addSectionTitle(doc, 'TOP SERVICES BY REVENUE', currentY);

    const servicesTableData = data.top_services.map(s => [
      s.name,
      formatCurrency(s.revenue)
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Service', 'Revenue']],
      body: servicesTableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  return currentY;
}

function generatePerformancePDF(
  doc: jsPDF,
  data: PerformanceTrends,
  sections: { summary?: boolean; tables?: boolean },
  startY: number
): number {
  let currentY = startY;

  if (sections.tables) {
    // Department performance
    currentY = addSectionTitle(doc, 'DEPARTMENT PERFORMANCE', currentY);

    const deptTableData = data.department_performance.map(d => [
      d.department,
      d.total_orders.toString(),
      formatPercent(d.completion_rate),
      `${d.avg_processing_time.toFixed(1)} hours`
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Department', 'Total Orders', 'Completion Rate', 'Avg Processing Time']],
      body: deptTableData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 35 },
        3: { cellWidth: 45 },
      },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  return currentY;
}

function generateInvoicesPDF(
  doc: jsPDF,
  data: InvoiceSummary,
  sections: { summary?: boolean; tables?: boolean },
  startY: number
): number {
  let currentY = startY;

  // Summary section
  if (sections.summary) {
    currentY = addSectionTitle(doc, 'INVOICES SUMMARY', currentY);

    const summaryData = [
      ['Total Invoices', data.totalInvoices.toString()],
      ['Total Amount', formatCurrency(data.totalAmount)],
      ['Total Paid', formatCurrency(data.totalPaid)],
      ['Total Due', formatCurrency(data.totalDue)],
      ['Pending Count', data.pendingCount.toString()],
      ['Overdue Count', data.overdueCount.toString()],
      ['Paid Count', data.paidCount.toString()],
    ];

    autoTable(doc, {
      startY: currentY,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.gray700 as [number, number, number],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      bodyStyles: {
        fontSize: 9,
        textColor: COLORS.gray700 as [number, number, number],
      },
      alternateRowStyles: {
        fillColor: COLORS.gray50 as [number, number, number],
      },
      margin: { left: 20, right: 20 },
    });

    currentY = (doc as typeof doc & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  }

  return currentY;
}
