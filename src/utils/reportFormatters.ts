// =====================================================
// REPORT FORMATTERS - Utility functions for Reports
// Created: 2025-10-23
// Description: Centralized formatting functions for Reports module
// =====================================================

import { format } from 'date-fns';
import type { InvoiceStatus } from '@/types/invoices';
import { Badge } from '@/components/ui/badge';
import type { ReactElement } from 'react';

/**
 * Format currency amount with locale support
 * @param amount - Numeric amount to format
 * @param currency - ISO currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * @param options - Additional Intl.NumberFormat options
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1234.56) // "$1,235"
 * formatCurrency(1234.56, 'EUR', 'es-ES') // "1.235 €"
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

/**
 * Format currency with decimal precision
 * @param amount - Numeric amount to format
 * @param currency - ISO currency code (default: 'USD')
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted currency string with 2 decimals
 *
 * @example
 * formatCurrencyPrecise(1234.56) // "$1,234.56"
 */
export function formatCurrencyPrecise(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for reports
 * @param date - Date string or Date object
 * @param dateFormat - date-fns format string (default: 'MMM dd, yyyy')
 * @returns Formatted date string
 *
 * @example
 * formatReportDate('2024-10-23') // "Oct 23, 2024"
 * formatReportDate(new Date(), 'yyyy-MM-dd') // "2024-10-23"
 */
export function formatReportDate(
  date: string | Date,
  dateFormat: string = 'MMM dd, yyyy'
): string {
  return format(new Date(date), dateFormat);
}

/**
 * Format hours in readable format
 * @param hours - Number of hours
 * @returns Human-readable time string
 *
 * @example
 * formatHours(0.5) // "30m"
 * formatHours(2.5) // "2.5h"
 * formatHours(48) // "48h"
 */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  }
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours.toFixed(1)}h` : `${days}d`;
  }
  return `${hours.toFixed(1)}h`;
}

/**
 * Calculate percentage with optional decimal places
 * @param value - Numerator value
 * @param total - Denominator value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Percentage value
 *
 * @example
 * calculatePercentage(25, 100) // 25.0
 * calculatePercentage(1, 3, 2) // 33.33
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 1
): number {
  if (total === 0) return 0;
  return parseFloat(((value / total) * 100).toFixed(decimals));
}

/**
 * Format percentage as string with symbol
 * @param value - Numeric percentage value
 * @param total - Total value for calculation
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted percentage string
 *
 * @example
 * formatPercentage(25, 100) // "25.0%"
 * formatPercentage(1, 3, 2) // "33.33%"
 */
export function formatPercentage(
  value: number,
  total: number,
  decimals: number = 1
): string {
  return `${calculatePercentage(value, total, decimals)}%`;
}

/**
 * Format change percentage with sign
 * @param change - Percentage change value
 * @returns Formatted change string with +/- sign
 *
 * @example
 * formatChangePercentage(15.5) // "+15.5%"
 * formatChangePercentage(-8.2) // "-8.2%"
 */
export function formatChangePercentage(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

/**
 * Get CSS class for change value (positive/negative)
 * @param change - Numeric change value
 * @returns Tailwind CSS class for color
 *
 * @example
 * getChangeColorClass(10) // "text-green-600"
 * getChangeColorClass(-5) // "text-red-600"
 */
export function getChangeColorClass(change: number): string {
  return change >= 0 ? 'text-green-600' : 'text-red-600';
}

/**
 * Format number with thousands separator
 * @param value - Numeric value
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(1234567, 'de-DE') // "1.234.567"
 */
export function formatNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(value);
}

/**
 * Format compact number (K, M, B notation)
 * @param value - Numeric value
 * @param locale - Locale string (default: 'en-US')
 * @returns Compact formatted number
 *
 * @example
 * formatCompactNumber(1500) // "1.5K"
 * formatCompactNumber(1500000) // "1.5M"
 */
export function formatCompactNumber(value: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
}

/**
 * Get invoice status badge configuration
 * Notion-style muted colors only
 * @param status - Invoice status enum
 * @returns Badge configuration object
 */
export function getInvoiceStatusBadge(status: InvoiceStatus): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  label: string;
} {
  const badgeConfig = {
    draft: {
      variant: 'secondary' as const,
      className: 'bg-gray-50 text-gray-600 border-none font-normal',
      label: 'Draft',
    },
    pending: {
      variant: 'outline' as const,
      className: 'bg-muted text-muted-foreground border-none font-normal',
      label: 'Pending',
    },
    paid: {
      variant: 'default' as const,
      className: 'bg-emerald-50 text-emerald-600 border-none font-normal',
      label: 'Paid',
    },
    partially_paid: {
      variant: 'secondary' as const,
      className: 'bg-amber-50 text-amber-600 border-none font-normal',
      label: 'Partial',
    },
    overdue: {
      variant: 'destructive' as const,
      className: 'bg-red-50 text-red-600 border-none font-normal',
      label: 'Overdue',
    },
    cancelled: {
      variant: 'outline' as const,
      className: 'bg-gray-50 text-gray-500 border-none font-normal',
      label: 'Cancelled',
    },
  };

  return badgeConfig[status] || badgeConfig.draft;
}

/**
 * Get trend icon class based on value
 * @param value - Numeric value
 * @param inverse - Inverse colors (red for positive) for metrics like costs
 * @returns Icon component class name
 */
export function getTrendIcon(value: number, inverse: boolean = false): string {
  const isPositive = value >= 0;
  const shouldBeGreen = inverse ? !isPositive : isPositive;
  return shouldBeGreen ? 'text-green-600' : 'text-red-600';
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * truncateText("Long description here", 10) // "Long descr..."
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Generate report filename with timestamp
 * @param reportType - Type of report (e.g., 'operational', 'financial')
 * @param extension - File extension (default: 'pdf')
 * @param includeTimestamp - Include timestamp in filename (default: true)
 * @returns Generated filename
 *
 * @example
 * generateReportFilename('operational', 'pdf') // "operational-report-2024-10-23.pdf"
 * generateReportFilename('financial', 'xlsx', false) // "financial-report.xlsx"
 */
export function generateReportFilename(
  reportType: string,
  extension: string = 'pdf',
  includeTimestamp: boolean = true
): string {
  const timestamp = includeTimestamp ? format(new Date(), 'yyyy-MM-dd') : '';
  const parts = [reportType, 'report', timestamp].filter(Boolean);
  return `${parts.join('-')}.${extension}`;
}
