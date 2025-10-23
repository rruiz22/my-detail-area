/**
 * Search Term Sanitization Utilities
 *
 * Sanitizes user input for SQL LIKE/ILIKE queries to prevent unintended
 * wildcard matching and ensure accurate search results.
 *
 * @module searchSanitization
 * @security Prevents search bypass and ensures accurate results
 */

/**
 * Sanitizes a search term for use in SQL ILIKE queries
 *
 * Escapes special wildcard characters to ensure literal matching:
 * - Backslash → Double backslash (escape character itself)
 * - Percent → Escaped percent (SQL wildcard for "any characters")
 * - Underscore → Escaped underscore (SQL wildcard for "single character")
 *
 * @param term - The search term to sanitize (can be any type)
 * @returns The sanitized search term, or null if invalid
 *
 * @example
 * ```ts
 * sanitizeSearchTerm("BMW") // Returns "BMW"
 * sanitizeSearchTerm("test%") // Returns "test\\%"
 * sanitizeSearchTerm("car_") // Returns "car\\_"
 * sanitizeSearchTerm(null) // Returns null
 * ```
 */
export function sanitizeSearchTerm(term: unknown): string | null {
  if (term === null || term === undefined) {
    return null;
  }

  if (typeof term !== 'string') {
    return null;
  }

  const trimmed = term.trim();
  
  if (!trimmed) {
    return null;
  }

  // Escape special characters in SPECIFIC ORDER
  // 1. Backslash FIRST (to avoid escaping our own escapes)
  // 2. Then percent sign
  // 3. Then underscore
  return trimmed
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}

/**
 * Sanitizes and converts search term to lowercase
 *
 * @param term - The search term to sanitize
 * @returns The sanitized and lowercased term, or null if invalid
 */
export function sanitizeAndLowercase(term: unknown): string | null {
  const sanitized = sanitizeSearchTerm(term);
  return sanitized ? sanitized.toLowerCase() : null;
}

/**
 * Checks if a search term contains wildcard characters
 *
 * @param term - The search term to check
 * @returns True if term contains %, _, or \
 */
export function needsSanitization(term: string): boolean {
  return /[%_\\]/.test(term);
}
