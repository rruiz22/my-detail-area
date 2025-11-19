/**
 * PDF TEMPLATES - Centralized Export
 * Created: 2025-01-18
 * Description: Main entry point for all PDF template utilities
 */

// Design System
export * from '../pdfDesignSystem';
export * from '../pdfHelpers';

// Templates
export * from './invoiceTemplate';
export * from './reportTemplate';

// Re-export commonly used types
export type {
  DealershipInfo,
  HeaderOptions,
  FooterOptions,
  SummaryBoxOptions,
} from '../pdfHelpers';

export type {
  InvoiceData,
  InvoiceLineItem,
  InvoiceTemplateOptions,
} from './invoiceTemplate';

export type {
  ReportMetadata,
  ReportTableColumn,
  ReportTableData,
  ReportSummary,
  ReportTemplateOptions,
  PayrollReportData,
  AttendanceReportData,
} from './reportTemplate';
