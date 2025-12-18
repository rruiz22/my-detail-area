/**
 * Invoice Formatting Utilities
 *
 * Provides consistent formatting for invoice numbers with department prefixes
 * across the application (email subjects, messages, badges, file names, etc.)
 */

import type { Invoice } from '@/types/invoices';

/**
 * Formats an invoice number with department prefix(es)
 *
 * @param invoice - The invoice object containing metadata with departments
 * @returns Formatted invoice number with department prefix
 *
 * @example
 * // Single department
 * formatInvoiceNumberWithDepartment(invoice) // "SERVICE-INV-25-0031"
 *
 * // Multiple departments
 * formatInvoiceNumberWithDepartment(invoice) // "SERVICE-SALES-INV-25-0031"
 *
 * // No departments
 * formatInvoiceNumberWithDepartment(invoice) // "INV-25-0031"
 */
export function formatInvoiceNumberWithDepartment(invoice: Invoice): string {
  try {
    // Safely get the invoice number
    const invoiceNum = invoice?.invoiceNumber;

    // Validate invoice number exists
    if (!invoiceNum) {
      console.warn('formatInvoiceNumberWithDepartment: Invoice number is missing');
      return '';
    }

    // Safely access departments from metadata
    const departments = invoice?.metadata?.departments;

    // If no departments or empty array, return invoice number as is
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return invoiceNum;
    }

    // Filter out any invalid department values and convert to uppercase
    const validDepartments = departments
      .filter(dept => dept && typeof dept === 'string' && dept.trim().length > 0)
      .map(dept => dept.trim().toUpperCase());

    // If no valid departments after filtering, return invoice number as is
    if (validDepartments.length === 0) {
      return invoiceNum;
    }

    // Join all department names with hyphens and prepend to invoice number
    const deptPrefix = validDepartments.join('-');

    return `${deptPrefix}-${invoiceNum}`;
  } catch (error) {
    // Log error for debugging but don't break the UI
    console.error('Error formatting invoice number with department:', error);

    // Fallback to plain invoice number if available
    return invoice?.invoiceNumber || '';
  }
}

/**
 * Formats department text for display in email subjects and headers
 *
 * @param departments - Array of department names
 * @returns Formatted department text (e.g., "Service Dept", "Service-Sales Dept")
 *
 * @example
 * formatDepartmentText(['service']) // "Service Dept"
 * formatDepartmentText(['service', 'sales']) // "Service-Sales Dept"
 * formatDepartmentText([]) // ""
 */
export function formatDepartmentText(departments?: string[]): string {
  try {
    // Validate input
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return '';
    }

    // Filter and format valid departments
    const formattedDepts = departments
      .filter(dept => dept && typeof dept === 'string' && dept.trim().length > 0)
      .map(dept => {
        const trimmed = dept.trim();
        // Capitalize first letter of each department
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      });

    // If no valid departments, return empty string
    if (formattedDepts.length === 0) {
      return '';
    }

    // Join departments with hyphen and add "Dept" suffix
    return `${formattedDepts.join('-')} Dept`;
  } catch (error) {
    console.error('Error formatting department text:', error);
    return '';
  }
}

/**
 * Gets a short department prefix for compact displays
 * Limits to first 3 departments to avoid extremely long strings
 *
 * @param departments - Array of department names
 * @param maxDepartments - Maximum number of departments to show (default: 3)
 * @returns Short department prefix (e.g., "SVC-SLS-RCN")
 *
 * @example
 * getShortDepartmentPrefix(['service', 'sales']) // "SVC-SLS"
 * getShortDepartmentPrefix(['service', 'sales', 'recon', 'carwash']) // "SVC-SLS-RCN+1"
 */
export function getShortDepartmentPrefix(
  departments?: string[],
  maxDepartments: number = 3
): string {
  try {
    // Validate input
    if (!departments || !Array.isArray(departments) || departments.length === 0) {
      return '';
    }

    // Filter valid departments
    const validDepts = departments.filter(
      dept => dept && typeof dept === 'string' && dept.trim().length > 0
    );

    if (validDepts.length === 0) {
      return '';
    }

    // Create short codes (first 3 letters of each department)
    const shortCodes = validDepts.map(dept => {
      const upper = dept.trim().toUpperCase();
      return upper.substring(0, 3);
    });

    // If more departments than max, show count of additional
    if (shortCodes.length > maxDepartments) {
      const shown = shortCodes.slice(0, maxDepartments).join('-');
      const additional = shortCodes.length - maxDepartments;
      return `${shown}+${additional}`;
    }

    return shortCodes.join('-');
  } catch (error) {
    console.error('Error getting short department prefix:', error);
    return '';
  }
}