/**
 * Dealer ID Validation Utilities
 *
 * Centralizes dealer ID validation logic to prevent security vulnerabilities
 * and ensure consistent validation across the application.
 *
 * @module dealerValidation
 * @security CRITICAL - Prevents unauthorized access to dealer data
 */

import type { Dealership } from '@/types/dealership';

/**
 * Validates if a dealer ID is a valid positive integer
 *
 * @param dealerId - The dealer ID to validate (can be any type)
 * @returns The validated dealer ID as a number, or null if invalid
 *
 * @example
 * ```ts
 * const validId = validateDealerId(5); // Returns 5
 * const invalid = validateDealerId("all"); // Returns null
 * const invalid2 = validateDealerId(-1); // Returns null
 * const invalid3 = validateDealerId(null); // Returns null
 * ```
 */
export function validateDealerId(dealerId: unknown): number | null {
  // Handle null/undefined
  if (dealerId === null || dealerId === undefined) {
    return null;
  }

  // Handle string "all" (used in filters)
  if (dealerId === 'all' || dealerId === '') {
    return null;
  }

  // Convert to number if string number
  const numericId = typeof dealerId === 'string' ? Number(dealerId) : dealerId;

  // Validate it's a number
  if (typeof numericId !== 'number') {
    return null;
  }

  // Validate it's a valid positive integer
  if (!Number.isInteger(numericId) || numericId <= 0 || !Number.isFinite(numericId)) {
    return null;
  }

  // Validate it's a safe integer (can be accurately represented)
  if (!Number.isSafeInteger(numericId)) {
    return null;
  }

  return numericId;
}

/**
 * Validates a dealership object and extracts its ID
 *
 * @param dealership - The dealership object to validate
 * @returns The validated dealer ID as a number, or null if invalid
 *
 * @example
 * ```ts
 * const dealer = { id: 5, name: "BMW Dealership", ... };
 * const validId = validateDealershipObject(dealer); // Returns 5
 *
 * const invalid = validateDealershipObject(null); // Returns null
 * const invalid2 = validateDealershipObject({ name: "Test" }); // Returns null
 * ```
 */
export function validateDealershipObject(dealership: unknown): number | null {
  if (!dealership || typeof dealership !== 'object') {
    return null;
  }

  const dealer = dealership as Partial<Dealership>;
  return validateDealerId(dealer.id);
}

/**
 * Type guard to check if a dealer ID is valid
 *
 * @param dealerId - The dealer ID to check
 * @returns True if the dealer ID is a valid positive integer
 *
 * @example
 * ```ts
 * if (isValidDealerId(dealerId)) {
 *   // TypeScript knows dealerId is a number here
 *   const query = supabase.from('table').eq('dealer_id', dealerId);
 * }
 * ```
 */
export function isValidDealerId(dealerId: unknown): dealerId is number {
  return validateDealerId(dealerId) !== null;
}

/**
 * Asserts that a dealer ID is valid, throwing an error if not
 *
 * @param dealerId - The dealer ID to assert
 * @param context - Optional context for error message
 * @throws Error if dealer ID is invalid
 *
 * @example
 * ```ts
 * try {
 *   assertValidDealerId(dealerId, 'useGetReadyVehicles');
 *   // Proceed with query
 * } catch (error) {
 *   console.error('Invalid dealer ID:', error);
 *   return null;
 * }
 * ```
 */
export function assertValidDealerId(
  dealerId: unknown,
  context?: string
): asserts dealerId is number {
  const validId = validateDealerId(dealerId);

  if (validId === null) {
    const errorMessage = context
      ? `Invalid dealer ID in ${context}: ${JSON.stringify(dealerId)}`
      : `Invalid dealer ID: ${JSON.stringify(dealerId)}`;

    throw new Error(errorMessage);
  }
}

/**
 * Sanitizes a dealer ID for use in SQL queries
 * Prevents potential injection attacks and ensures type safety
 *
 * @param dealerId - The dealer ID to sanitize
 * @returns The sanitized dealer ID as a number, or throws error
 * @throws Error if dealer ID is invalid
 *
 * @example
 * ```ts
 * const safeDealerId = sanitizeDealerIdForQuery(dealerId);
 * const { data } = await supabase
 *   .from('vehicles')
 *   .eq('dealer_id', safeDealerId); // Type-safe and validated
 * ```
 */
export function sanitizeDealerIdForQuery(dealerId: unknown): number {
  const validId = validateDealerId(dealerId);

  if (validId === null) {
    throw new Error('Cannot execute query with invalid dealer ID');
  }

  return validId;
}

/**
 * Validates dealer ID with logging for debugging
 * Useful in development/staging environments
 *
 * @param dealerId - The dealer ID to validate
 * @param componentName - Name of the component/hook for logging
 * @returns The validated dealer ID or null
 *
 * @example
 * ```ts
 * const validId = validateDealerIdWithLogging(dealerId, 'useGetReadyVehicles');
 * if (!validId) {
 *   // Logs will show why it's invalid
 *   return { vehicles: [], error: 'Invalid dealer ID' };
 * }
 * ```
 */
export function validateDealerIdWithLogging(
  dealerId: unknown,
  componentName: string
): number | null {
  const validId = validateDealerId(dealerId);

  if (validId === null && process.env.NODE_ENV === 'development') {
    console.warn(
      `[${componentName}] Invalid dealer ID:`,
      dealerId,
      'Type:',
      typeof dealerId
    );
  }

  return validId;
}
