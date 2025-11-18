/**
 * Phone Number Validation and Formatting Utility
 * Standardizes phone numbers to E.164 format for Twilio compatibility
 *
 * E.164 Format: +[country code][subscriber number]
 * Example: +15551234567 (US), +5215551234567 (Mexico)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  formatted?: string;
  error?: string;
  country?: string;
}

/**
 * Validates and formats a phone number to E.164 format
 * @param phone - Raw phone number (may contain spaces, dashes, parentheses)
 * @param defaultCountryCode - Default country code if not provided (default: '1' for US/Canada)
 * @returns Formatted phone number in E.164 format (+15551234567)
 */
export function formatPhoneE164(
  phone: string | null | undefined,
  defaultCountryCode: string = '1'
): PhoneValidationResult {
  // Handle null/undefined
  if (!phone || phone.trim() === '') {
    return {
      isValid: false,
      error: 'Phone number is required'
    };
  }

  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Already in E.164 format (+15551234567)
  if (cleaned.startsWith('+')) {
    if (cleaned.length >= 11 && cleaned.length <= 15) {
      return {
        isValid: true,
        formatted: cleaned,
        country: cleaned.substring(1, cleaned.length - 10) // Extract country code
      };
    } else {
      return {
        isValid: false,
        error: `Invalid E.164 format: must be 11-15 digits (got ${cleaned.length})`
      };
    }
  }

  // Remove leading + if present (already checked above)
  const digitsOnly = cleaned.replace(/^\+/, '');

  // 10-digit number (US/Canada local): 5551234567 -> +15551234567
  if (digitsOnly.length === 10) {
    return {
      isValid: true,
      formatted: `+${defaultCountryCode}${digitsOnly}`,
      country: defaultCountryCode
    };
  }

  // 11-digit number starting with 1 (US/Canada with country code): 15551234567 -> +15551234567
  if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
    return {
      isValid: true,
      formatted: `+${digitsOnly}`,
      country: '1'
    };
  }

  // 11-digit number starting with 52 (Mexico): 525551234567 -> +525551234567
  if (digitsOnly.length === 11 && digitsOnly.startsWith('52')) {
    return {
      isValid: true,
      formatted: `+${digitsOnly}`,
      country: '52'
    };
  }

  // 12-digit number starting with 52 (Mexico with area code): 5215551234567 -> +5215551234567
  if (digitsOnly.length === 12 && digitsOnly.startsWith('52')) {
    return {
      isValid: true,
      formatted: `+${digitsOnly}`,
      country: '52'
    };
  }

  // Generic international number (11-15 digits)
  if (digitsOnly.length >= 11 && digitsOnly.length <= 15) {
    return {
      isValid: true,
      formatted: `+${digitsOnly}`,
      country: digitsOnly.substring(0, digitsOnly.length - 10) // Guess country code
    };
  }

  // Invalid length
  return {
    isValid: false,
    error: `Invalid phone number length: ${digitsOnly.length} digits (expected 10-15)`
  };
}

/**
 * Validates a phone number without formatting
 * @param phone - Phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  return formatPhoneE164(phone).isValid;
}

/**
 * Formats a phone number to E.164, throwing an error if invalid
 * @param phone - Phone number to format
 * @returns Formatted phone number in E.164 format
 * @throws Error if phone number is invalid
 */
export function formatPhoneE164Strict(phone: string): string {
  const result = formatPhoneE164(phone);

  if (!result.isValid) {
    throw new Error(result.error || 'Invalid phone number');
  }

  return result.formatted!;
}

/**
 * Batch validate and format multiple phone numbers
 * @param phones - Array of phone numbers
 * @returns Array of validation results
 */
export function validatePhoneBatch(phones: (string | null | undefined)[]): PhoneValidationResult[] {
  return phones.map(phone => formatPhoneE164(phone));
}

/**
 * Extract and format phone numbers from text
 * Useful for parsing phone numbers from user input
 * @param text - Text containing phone numbers
 * @returns Array of formatted phone numbers
 */
export function extractPhoneNumbers(text: string): string[] {
  // Pattern: matches (555) 123-4567, 555-123-4567, 555.123.4567, +1 555 123 4567, etc.
  const phonePattern = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
  const matches = text.match(phonePattern) || [];

  return matches
    .map(match => formatPhoneE164(match))
    .filter(result => result.isValid)
    .map(result => result.formatted!);
}

/**
 * Format phone number for display (not for SMS sending)
 * @param phone - E.164 formatted phone number
 * @returns Human-readable format: +1 (555) 123-4567
 */
export function formatPhoneDisplay(phone: string): string {
  const result = formatPhoneE164(phone);

  if (!result.isValid || !result.formatted) {
    return phone; // Return original if invalid
  }

  const e164 = result.formatted;
  const countryCode = result.country || '1';
  const number = e164.substring(countryCode.length + 1); // Remove + and country code

  // US/Canada format: +1 (555) 123-4567
  if (countryCode === '1' && number.length === 10) {
    return `+${countryCode} (${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
  }

  // Generic format: +52 555 123 4567
  return `+${countryCode} ${number.substring(0, 3)} ${number.substring(3, 6)} ${number.substring(6)}`;
}
