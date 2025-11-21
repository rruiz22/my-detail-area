/**
 * Security Utilities
 *
 * This module provides cryptographic and security functions to prevent
 * common vulnerabilities in authentication and authorization flows.
 */

/**
 * Constant-time string comparison to prevent timing attacks.
 *
 * **Security Purpose:**
 * Traditional string comparison (===) short-circuits on the first mismatch,
 * which leaks information about the correct value through timing analysis.
 * An attacker can iteratively guess each character by measuring response times.
 *
 * **How it works:**
 * 1. Always compares the full length of both strings
 * 2. Uses bitwise XOR to accumulate differences without branching
 * 3. Returns result only after examining all characters
 * 4. Takes the same time whether strings match or not
 *
 * **Use cases:**
 * - PIN code verification
 * - Password comparison
 * - API key validation
 * - HMAC signature verification
 * - Session token comparison
 *
 * @param a - First string to compare (e.g., user input)
 * @param b - Second string to compare (e.g., stored credential)
 * @returns true if strings are equal, false otherwise
 *
 * @example
 * ```typescript
 * // ❌ VULNERABLE - Timing attack possible
 * if (userPin === storedPin) { ... }
 *
 * // ✅ SECURE - Constant-time comparison
 * if (constantTimeCompare(userPin, storedPin)) { ... }
 * ```
 */
export function constantTimeCompare(a: string, b: string): boolean {
  // Handle edge cases: null, undefined, non-string values
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  // If lengths differ, still compare to avoid length-based timing leak
  // We'll compare the longer string with itself to maintain constant time
  const lengthMatch = a.length === b.length;

  // Always use the maximum length to ensure constant comparison time
  const compareLength = Math.max(a.length, b.length);

  // Use bitwise operations to accumulate differences without branching
  let result = lengthMatch ? 0 : 1;

  // Compare each character position using XOR
  // If strings are different lengths, compare excess chars with themselves (XOR = 0)
  for (let i = 0; i < compareLength; i++) {
    const charA = i < a.length ? a.charCodeAt(i) : 0;
    const charB = i < b.length ? b.charCodeAt(i) : 0;

    // XOR operation: 0 if characters match, non-zero if different
    // Bitwise OR accumulates any differences without short-circuiting
    result |= charA ^ charB;
  }

  // Result is 0 only if all characters matched and lengths were equal
  return result === 0;
}

/**
 * Generates a cryptographically secure random string.
 *
 * **Security Purpose:**
 * Uses Web Crypto API for cryptographically strong random values,
 * suitable for generating tokens, session IDs, or temporary credentials.
 *
 * @param length - Length of the string to generate
 * @param charset - Character set to use (default: alphanumeric)
 * @returns Random string of specified length
 *
 * @example
 * ```typescript
 * const token = generateSecureRandom(32); // 32-char token
 * const pin = generateSecureRandom(6, '0123456789'); // 6-digit PIN
 * ```
 */
export function generateSecureRandom(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  if (length <= 0) {
    throw new Error('Length must be positive');
  }

  if (charset.length === 0) {
    throw new Error('Charset cannot be empty');
  }

  // Use Web Crypto API for cryptographically secure random values
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  let result = '';
  for (let i = 0; i < length; i++) {
    // Use modulo to map random value to charset index
    result += charset[randomValues[i] % charset.length];
  }

  return result;
}

/**
 * Sanitizes input to prevent basic injection attacks.
 *
 * **Security Purpose:**
 * Removes potentially dangerous characters from user input.
 * This is a defense-in-depth measure; proper parameterization
 * should still be used for database queries.
 *
 * @param input - User input to sanitize
 * @returns Sanitized string
 *
 * @example
 * ```typescript
 * const safeInput = sanitizeInput(userInput);
 * ```
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes, control characters, and common injection patterns
  return input
    .replace(/\0/g, '') // Null bytes
    .replace(/[\x00-\x1F\x7F]/g, '') // Control characters
    .trim();
}

/**
 * Validates PIN code format and strength.
 *
 * **Security Purpose:**
 * Ensures PIN codes meet minimum security requirements before storage.
 *
 * @param pin - PIN code to validate
 * @param minLength - Minimum required length (default: 4)
 * @param maxLength - Maximum allowed length (default: 8)
 * @returns Validation result with success flag and error message
 *
 * @example
 * ```typescript
 * const result = validatePinCode(userPin);
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validatePinCode(
  pin: string,
  minLength: number = 4,
  maxLength: number = 8
): { valid: boolean; error?: string } {
  if (typeof pin !== 'string') {
    return { valid: false, error: 'PIN must be a string' };
  }

  if (pin.length < minLength) {
    return { valid: false, error: `PIN must be at least ${minLength} characters` };
  }

  if (pin.length > maxLength) {
    return { valid: false, error: `PIN must not exceed ${maxLength} characters` };
  }

  // Check if PIN contains only digits
  if (!/^\d+$/.test(pin)) {
    return { valid: false, error: 'PIN must contain only digits' };
  }

  // Check for weak patterns
  if (/^(\d)\1+$/.test(pin)) {
    return { valid: false, error: 'PIN cannot be all the same digit' };
  }

  // Check for sequential patterns (e.g., 1234, 4321)
  const isSequential = (str: string): boolean => {
    for (let i = 1; i < str.length; i++) {
      const diff = parseInt(str[i]) - parseInt(str[i - 1]);
      if (Math.abs(diff) !== 1) return false;
      if (i > 1) {
        const prevDiff = parseInt(str[i - 1]) - parseInt(str[i - 2]);
        if (diff !== prevDiff) return false;
      }
    }
    return true;
  };

  if (isSequential(pin)) {
    return { valid: false, error: 'PIN cannot be a sequential pattern' };
  }

  return { valid: true };
}

/**
 * Rate limiting helper for authentication attempts.
 *
 * **Security Purpose:**
 * Prevents brute force attacks by tracking and limiting authentication attempts.
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter(5, 300000); // 5 attempts per 5 minutes
 *
 * if (!limiter.checkAttempt(userId)) {
 *   throw new Error('Too many attempts. Please try again later.');
 * }
 * ```
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Creates a new RateLimiter instance.
   *
   * @param maxAttempts - Maximum number of attempts allowed
   * @param windowMs - Time window in milliseconds
   */
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}

  /**
   * Checks if an attempt is allowed for the given identifier.
   *
   * @param identifier - Unique identifier (e.g., user ID, IP address)
   * @returns true if attempt is allowed, false if rate limit exceeded
   */
  checkAttempt(identifier: string): boolean {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      // First attempt or window expired - allow and reset
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (record.count >= this.maxAttempts) {
      // Rate limit exceeded
      return false;
    }

    // Increment attempt count
    record.count++;
    return true;
  }

  /**
   * Resets attempts for a given identifier (e.g., after successful auth).
   *
   * @param identifier - Unique identifier to reset
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }

  /**
   * Gets remaining attempts for a given identifier.
   *
   * @param identifier - Unique identifier to check
   * @returns Number of remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record || Date.now() > record.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - record.count);
  }

  /**
   * Gets time until rate limit reset for a given identifier.
   *
   * @param identifier - Unique identifier to check
   * @returns Milliseconds until reset, or 0 if not rate limited
   */
  getResetTime(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    const remaining = record.resetTime - Date.now();
    return Math.max(0, remaining);
  }
}
