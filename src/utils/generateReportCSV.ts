// =====================================================
// GENERATE REPORT CSV UTILITY
// Created: 2024-10-23
// Description: Generate CSV reports from analytics data
// =====================================================

import type { OrderAnalytics, RevenueAnalytics, PerformanceTrends } from '@/hooks/useReportsData';
import type { InvoiceSummary } from '@/types/invoices';

// =====================================================
// TYPES
// =====================================================

export interface CSVExportOptions {
  reportType: 'operational' | 'financial' | 'performance' | 'invoices';
  data: OrderAnalytics | RevenueAnalytics | PerformanceTrends | InvoiceSummary | null;
  dealershipName: string;
  startDate: Date;
  endDate: Date;
  includeSections?: {
    summary?: boolean;
    tables?: boolean;
  };
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

/**
 * Convert array of objects to CSV format
 */
function arrayToCSV(data: Record<string, string | number>[]): string {
  if (!data || data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escape values containing commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Format currency for CSV
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for CSV
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// =====================================================
// MAIN EXPORT FUNCTION
// =====================================================

export async function generateReportCSV(options: CSVExportOptions): Promise<void> {
  const {
    reportType,
    data,
    dealershipName,
    startDate,
    endDate,
    includeSections = { summary: true, tables: true }
  } = options;

  if (!data) {
    throw new Error('No data provided for CSV export');
  }

  let csvContent = '';
  const filename = `${reportType}_report_${formatDate(startDate)}_${formatDate(endDate)}.csv`;

  // Header
  csvContent += `${dealershipName} - ${reportType.toUpperCase()} REPORT\n`;
  csvContent += `Period: ${formatDate(startDate)} to ${formatDate(endDate)}\n`;
  csvContent += `Generated: ${formatDate(new Date())}\n\n`;

  // Export based on report type
  switch (reportType) {
    case 'operational':
      csvContent += generateOperationalCSV(data as OrderAnalytics, includeSections);
      break;
    case 'financial':
      csvContent += generateFinancialCSV(data as RevenueAnalytics, includeSections);
      break;
    case 'performance':
      csvContent += generatePerformanceCSV(data as PerformanceTrends, includeSections);
      break;
    case 'invoices':
      csvContent += generateInvoicesCSV(data as InvoiceSummary, includeSections);
      break;
    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }

  // Download CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

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

function generateOperationalCSV(
  data: OrderAnalytics,
  sections: { summary?: boolean; tables?: boolean }
): string {
  let content = '';

  // Summary section
  if (sections.summary) {
    content += 'SUMMARY\n';
    content += `Total Orders,${data.total_orders}\n`;
    content += `Pending Orders,${data.pending_orders}\n`;
    content += `In Progress Orders,${data.in_progress_orders}\n`;
    content += `Completed Orders,${data.completed_orders}\n`;
    content += `Cancelled Orders,${data.cancelled_orders}\n`;
    content += `Total Revenue,${formatCurrency(data.total_revenue)}\n`;
    content += `Average Order Value,${formatCurrency(data.avg_order_value)}\n`;
    content += `Completion Rate,${(data.completion_rate * 100).toFixed(1)}%\n`;
    content += `Average Processing Time,${data.avg_processing_time_hours.toFixed(1)} hours\n`;
    content += `SLA Compliance Rate,${(data.sla_compliance_rate * 100).toFixed(1)}%\n\n`;
  }

  // Tables section
  if (sections.tables) {
    // Daily data
    content += 'DAILY DATA\n';
    content += arrayToCSV(
      data.daily_data.map(d => ({
        Date: d.date,
        Orders: d.orders,
        Revenue: formatCurrency(d.revenue)
      }))
    );
    content += '\n\n';

    // Status distribution
    content += 'STATUS DISTRIBUTION\n';
    content += arrayToCSV(
      data.status_distribution.map(s => ({
        Status: s.name,
        Count: s.value
      }))
    );
    content += '\n\n';

    // Type distribution
    content += 'ORDER TYPE DISTRIBUTION\n';
    content += arrayToCSV(
      data.type_distribution.map(t => ({
        Type: t.name,
        Count: t.value
      }))
    );
    content += '\n';
  }

  return content;
}

function generateFinancialCSV(
  data: RevenueAnalytics,
  sections: { summary?: boolean; tables?: boolean }
): string {
  let content = '';

  // Summary section
  if (sections.summary) {
    content += 'FINANCIAL SUMMARY\n';
    content += `Total Revenue,${formatCurrency(data.total_revenue)}\n`;
    content += `Average Revenue per Period,${formatCurrency(data.avg_revenue_per_period)}\n`;
    content += `Growth Rate,${(data.growth_rate * 100).toFixed(1)}%\n\n`;
  }

  // Tables section
  if (sections.tables) {
    // Period data
    content += 'REVENUE BY PERIOD\n';
    content += arrayToCSV(
      data.period_data.map(p => ({
        Period: p.period,
        Revenue: formatCurrency(p.revenue),
        Orders: p.orders
      }))
    );
    content += '\n\n';

    // Top services
    content += 'TOP SERVICES BY REVENUE\n';
    content += arrayToCSV(
      data.top_services.map(s => ({
        Service: s.name,
        Revenue: formatCurrency(s.revenue)
      }))
    );
    content += '\n';
  }

  return content;
}

function generatePerformanceCSV(
  data: PerformanceTrends,
  sections: { summary?: boolean; tables?: boolean }
): string {
  let content = '';

  if (sections.tables) {
    // Efficiency trends
    content += 'EFFICIENCY TRENDS\n';
    content += arrayToCSV(
      data.efficiency_trends.map(e => ({
        Week: e.week,
        Efficiency: `${(e.efficiency * 100).toFixed(1)}%`
      }))
    );
    content += '\n\n';

    // SLA trends
    content += 'SLA COMPLIANCE TRENDS\n';
    content += arrayToCSV(
      data.sla_trends.map(s => ({
        Week: s.week,
        'SLA Rate': `${(s.sla_rate * 100).toFixed(1)}%`
      }))
    );
    content += '\n\n';

    // Volume trends
    content += 'VOLUME TRENDS\n';
    content += arrayToCSV(
      data.volume_trends.map(v => ({
        Week: v.week,
        Volume: v.volume
      }))
    );
    content += '\n\n';

    // Department performance
    content += 'DEPARTMENT PERFORMANCE\n';
    content += arrayToCSV(
      data.department_performance.map(d => ({
        Department: d.department,
        'Total Orders': d.total_orders,
        'Completion Rate': `${(d.completion_rate * 100).toFixed(1)}%`,
        'Avg Processing Time': `${d.avg_processing_time.toFixed(1)} hours`
      }))
    );
    content += '\n';
  }

  return content;
}

function generateInvoicesCSV(
  data: InvoiceSummary,
  sections: { summary?: boolean; tables?: boolean }
): string {
  let content = '';

  // Summary section
  if (sections.summary) {
    content += 'INVOICES SUMMARY\n';
    content += `Total Invoices,${data.totalInvoices}\n`;
    content += `Total Amount,${formatCurrency(data.totalAmount)}\n`;
    content += `Total Paid,${formatCurrency(data.totalPaid)}\n`;
    content += `Total Due,${formatCurrency(data.totalDue)}\n`;
    content += `Pending Count,${data.pendingCount}\n`;
    content += `Overdue Count,${data.overdueCount}\n`;
    content += `Paid Count,${data.paidCount}\n\n`;
  }

  return content;
}
