/**
 * VIN Validation Utilities
 *
 * Unified VIN validation logic used across the application.
 * This module provides functions for:
 * - VIN normalization
 * - VIN validation with check digit verification
 * - Character transliteration for check digit calculation
 *
 * VIN Standard: ISO 3779 (17 characters, no I, O, Q)
 * Check digit position: 9 (index 8)
 */

export const VIN_LENGTH = 17;

/**
 * Transliteration map for VIN check digit calculation
 * Maps each character to its numerical value according to ISO 3779
 */
export const transliterationMap: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9, S: 2,
  T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
  '6': 6, '7': 7, '8': 8, '9': 9
};

/**
 * Position weights for check digit calculation
 * According to ISO 3779 standard
 */
export const positionWeights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Normalizes a raw VIN string
 * - Removes non-alphanumeric characters
 * - Converts to uppercase
 * - Removes invalid characters (I, O, Q)
 * - Truncates to 17 characters
 *
 * @param raw - Raw VIN string input
 * @returns Normalized VIN string
 */
export const normalizeVin = (raw: string): string => {
  return raw
    .replace(/[^a-z0-9]/gi, '') // Remove non-alphanumeric
    .toUpperCase()                // Convert to uppercase
    .replace(/[IOQ]/g, '')        // Remove invalid VIN characters
    .slice(0, VIN_LENGTH);        // Truncate to 17 chars
};

/**
 * Validates a VIN using check digit verification
 *
 * The check digit is calculated using:
 * 1. Each character is assigned a numerical value
 * 2. Each value is multiplied by its position weight
 * 3. Sum of all products modulo 11 gives the check digit
 * 4. If remainder is 10, check digit is 'X'
 *
 * @param vin - VIN string to validate (should be normalized)
 * @returns true if VIN is valid, false otherwise
 */
export const isValidVin = (vin: string): boolean => {
  // Check length
  if (vin.length !== VIN_LENGTH) {
    return false;
  }

  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    const char = vin[i];
    const value = transliterationMap[char];

    // If character not in map, VIN is invalid
    if (value === undefined) {
      return false;
    }

    sum += value * positionWeights[i];
  }

  // Calculate expected check digit
  const remainder = sum % 11;
  const checkDigit = remainder === 10 ? 'X' : remainder.toString();

  // Compare with actual check digit at position 9 (index 8)
  return vin[8] === checkDigit;
};

/**
 * Validates a VIN and returns detailed information
 *
 * @param vin - VIN string to validate
 * @returns Object with validation status and confidence
 */
export interface VinValidationResult {
  isValid: boolean;
  confidence: number;
  error?: string;
}

export const validateVinDetailed = (vin: string): VinValidationResult => {
  // Check if empty
  if (!vin || vin.trim().length === 0) {
    return {
      isValid: false,
      confidence: 0,
      error: 'VIN is empty'
    };
  }

  // Check length
  if (vin.length !== VIN_LENGTH) {
    return {
      isValid: false,
      confidence: vin.length / VIN_LENGTH,
      error: `VIN must be ${VIN_LENGTH} characters, got ${vin.length}`
    };
  }

  // Check for invalid characters
  if (/[IOQ]/.test(vin)) {
    return {
      isValid: false,
      confidence: 0.1,
      error: 'VIN contains invalid characters (I, O, or Q)'
    };
  }

  // Validate check digit
  const isValid = isValidVin(vin);

  return {
    isValid,
    confidence: isValid ? 0.95 : 0.3,
    error: isValid ? undefined : 'Check digit validation failed'
  };
};

/**
 * Calculates the check digit for a VIN
 * Useful for auto-correction or VIN generation
 *
 * @param vin - VIN string (17 characters)
 * @returns The calculated check digit (0-9 or X)
 */
export const calculateCheckDigit = (vin: string): string => {
  if (vin.length !== VIN_LENGTH) {
    throw new Error(`VIN must be ${VIN_LENGTH} characters`);
  }

  let sum = 0;
  for (let i = 0; i < VIN_LENGTH; i++) {
    if (i === 8) continue; // Skip check digit position

    const char = vin[i];
    const value = transliterationMap[char];

    if (value === undefined) {
      throw new Error(`Invalid character '${char}' at position ${i + 1}`);
    }

    sum += value * positionWeights[i];
  }

  const remainder = sum % 11;
  return remainder === 10 ? 'X' : remainder.toString();
};

/**
 * Common OCR error corrections for VIN characters
 * Maps commonly misread characters to their likely intended values
 */
export const ocrCorrections: Record<string, string[]> = {
  '0': ['O', 'Q'],
  'O': ['0'],
  'Q': ['0'],
  '1': ['I', 'l'],
  'I': ['1'],
  '5': ['S'],
  'S': ['5'],
  '8': ['B'],
  'B': ['8'],
  '6': ['G'],
  'G': ['6']
};

/**
 * Suggests possible corrections for an invalid VIN
 * Useful for OCR post-processing
 *
 * @param vin - Invalid VIN string
 * @param maxSuggestions - Maximum number of suggestions to return
 * @returns Array of possible corrected VINs
 */
export const suggestVinCorrections = (vin: string, maxSuggestions: number = 5): string[] => {
  const suggestions: string[] = [];

  // Try replacing each character with common OCR errors
  for (let i = 0; i < vin.length && suggestions.length < maxSuggestions; i++) {
    const char = vin[i];
    const corrections = ocrCorrections[char];

    if (corrections) {
      for (const correction of corrections) {
        const candidate = vin.substring(0, i) + correction + vin.substring(i + 1);
        const normalized = normalizeVin(candidate);

        if (normalized.length === VIN_LENGTH && isValidVin(normalized)) {
          suggestions.push(normalized);

          if (suggestions.length >= maxSuggestions) {
            break;
          }
        }
      }
    }
  }

  return suggestions;
};

/**
 * Extracts VIN from a longer text string
 * Useful for processing OCR results
 *
 * @param text - Text containing potential VIN
 * @returns Array of potential VINs found
 */
export const extractVinsFromText = (text: string): string[] => {
  // Pattern matches sequences of 17 alphanumeric characters (excluding I, O, Q)
  const vinPattern = /\b[A-HJ-NPR-Z0-9]{17}\b/gi;
  const matches = text.match(vinPattern) || [];

  // Normalize and deduplicate
  const normalized = matches.map(normalizeVin);
  return Array.from(new Set(normalized));
};
