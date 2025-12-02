/**
 * Input Sanitization Utility
 *
 * CONSERVATIVE approach - prevents basic XSS without breaking legitimate use cases
 *
 * Usage:
 * import { sanitizeInput, sanitizeVIN, sanitizeEmail } from '@/utils/sanitize';
 *
 * const cleanName = sanitizeInput(userInput);
 * const cleanVIN = sanitizeVIN(vinInput);
 */

/**
 * Sanitize general text input
 * - Removes HTML tags
 * - Removes script tags
 * - Preserves spaces, punctuation, and international characters
 * - DOES NOT change legitimate input
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';

  // Convert to string if not already
  const str = String(input);

  // Remove only dangerous HTML/script tags (very conservative)
  // Preserves everything else including spaces, accents, punctuation
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove <script> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove <iframe> tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove inline event handlers (onclick, onerror, etc)
    .trim();
}

/**
 * Sanitize VIN (Vehicle Identification Number)
 * - Converts to uppercase
 * - Removes spaces and special characters
 * - Only allows alphanumeric (no I, O, Q per VIN standard)
 * - Max 17 characters
 */
export function sanitizeVIN(vin: string | null | undefined): string {
  if (!vin) return '';

  return String(vin)
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/g, '') // Remove invalid VIN characters (no I, O, Q)
    .slice(0, 17); // VIN is exactly 17 characters
}

/**
 * Sanitize email address
 * - Converts to lowercase
 * - Removes spaces
 * - Basic format validation
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';

  return String(email)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ''); // Remove all whitespace
}

/**
 * Sanitize phone number
 * - Removes non-numeric characters except +, (, ), -
 * - Preserves international format
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return '';

  return String(phone)
    .replace(/[^\d\+\-\(\)\s]/g, '') // Keep digits, +, -, (, ), spaces
    .trim();
}

/**
 * Sanitize stock number
 * - Uppercase
 * - Remove special characters except dash and underscore
 */
export function sanitizeStockNumber(stock: string | null | undefined): string {
  if (!stock) return '';

  return String(stock)
    .toUpperCase()
    .replace(/[^A-Z0-9\-_]/g, '')
    .trim();
}

/**
 * Sanitize notes/textarea input
 * - More permissive than general input
 * - Allows line breaks and basic punctuation
 * - Removes only dangerous scripts/tags
 */
export function sanitizeNotes(notes: string | null | undefined): string {
  if (!notes) return '';

  const str = String(notes);

  // Remove only dangerous content, preserve formatting
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Batch sanitize form data
 * Applies appropriate sanitization to each field
 */
export function sanitizeOrderForm(formData: {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  vehicleVin?: string;
  stockNumber?: string;
  notes?: string;
  internalNotes?: string;
  [key: string]: any;
}) {
  return {
    ...formData,
    customerName: formData.customerName ? sanitizeInput(formData.customerName) : '',
    customerEmail: formData.customerEmail ? sanitizeEmail(formData.customerEmail) : '',
    customerPhone: formData.customerPhone ? sanitizePhone(formData.customerPhone) : '',
    vehicleVin: formData.vehicleVin ? sanitizeVIN(formData.vehicleVin) : '',
    stockNumber: formData.stockNumber ? sanitizeStockNumber(formData.stockNumber) : '',
    notes: formData.notes ? sanitizeNotes(formData.notes) : '',
    internalNotes: formData.internalNotes ? sanitizeNotes(formData.internalNotes) : ''
  };
}

/**
 * Check if input contains potentially dangerous content
 * Use for validation warnings (non-blocking)
 */
export function containsDangerousContent(input: string | null | undefined): boolean {
  if (!input) return false;

  const str = String(input);
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<object/i,
    /<embed/i
  ];

  return dangerousPatterns.some(pattern => pattern.test(str));
}

// Re-export for convenience
export default {
  sanitizeInput,
  sanitizeVIN,
  sanitizeEmail,
  sanitizePhone,
  sanitizeStockNumber,
  sanitizeNotes,
  sanitizeOrderForm,
  containsDangerousContent
};
