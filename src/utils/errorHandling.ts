/**
 * Centralized Error Handling Utilities
 *
 * Enterprise-grade error handling with strict TypeScript type safety.
 * NO `any` types allowed - all errors properly typed as `unknown`.
 *
 * Features:
 * - Typed error classes
 * - Error categorization
 * - User-friendly error messages
 * - Error logging integration
 * - Retry logic helpers
 * - Type guards for error detection
 */

import { logger } from './logger';

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Permission-related errors
 */
export class PermissionError extends AppError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, unknown>) {
    super(message, 'PERMISSION_DENIED', 403, true, context);
  }
}

/**
 * Authentication errors
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', context?: Record<string, unknown>) {
    super(message, 'AUTH_REQUIRED', 401, true, context);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    public fields?: Record<string, string[]>,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', 400, true, { ...context, fields });
  }
}

/**
 * Not found errors
 */
export class NotFoundError extends AppError {
  constructor(
    resource: string,
    identifier?: string | number,
    context?: Record<string, unknown>
  ) {
    const message = identifier
      ? `${resource} with ID "${identifier}" not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, true, context);
  }
}

/**
 * Database/API errors
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', context?: Record<string, unknown>) {
    super(message, 'DATABASE_ERROR', 500, true, context);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Rate limit exceeded',
    public retryAfter?: number,
    context?: Record<string, unknown>
  ) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, true, { ...context, retryAfter });
  }
}

/**
 * Network/connectivity errors
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', context?: Record<string, unknown>) {
    super(message, 'NETWORK_ERROR', 0, true, context);
  }
}

/**
 * Error handler interface
 */
export interface ErrorHandler {
  handle(error: Error): void;
  isRetryable(error: Error): boolean;
  getUserMessage(error: Error): string;
}

/**
 * Default error handler implementation
 */
export class DefaultErrorHandler implements ErrorHandler {
  /**
   * Handle an error with logging and optional reporting
   */
  handle(error: Error): void {
    if (error instanceof AppError) {
      // Log application errors with context
      if (error.isOperational) {
        console.warn(`⚠️ Operational error: ${error.message}`, error.context);
      } else {
        console.error(`🚨 Critical error: ${error.message}`, error.context);
      }

      // Log to secure logger for permission/auth errors
      if (error instanceof PermissionError || error instanceof AuthenticationError) {
        logger.secure.security(error.message, error.context);
      }
    } else {
      // Unexpected errors
      console.error('💥 Unexpected error:', error);
    }

    // In production, send to error tracking service
    if (!import.meta.env.DEV) {
      // TODO: Integrate with Sentry, LogRocket, etc.
      // Sentry.captureException(error);
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: Error): boolean {
    if (error instanceof AppError) {
      // Network errors and some database errors are retryable
      if (error instanceof NetworkError) return true;
      if (error instanceof DatabaseError && error.statusCode >= 500) return true;

      // Rate limit errors are retryable after delay
      if (error instanceof RateLimitError) return true;

      // Permission, validation, not found are NOT retryable
      return false;
    }

    // Unknown errors - don't retry by default
    return false;
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: Error): string {
    if (error instanceof AppError) {
      // Return the error message for known error types
      return error.message;
    }

    // Generic message for unknown errors
    return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Global error handler instance
 */
export const errorHandler = new DefaultErrorHandler();

/**
 * Async error wrapper with automatic error handling
 *
 * Usage:
 * ```typescript
 * const data = await withErrorHandling(
 *   fetchUserData(userId),
 *   'Failed to load user data'
 * );
 * ```
 */
export async function withErrorHandling<T>(
  promise: Promise<T>,
  userMessage?: string
): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof Error) {
      errorHandler.handle(error);

      // Re-throw with user message if provided
      if (userMessage && !(error instanceof AppError)) {
        throw new AppError(userMessage, 'OPERATION_FAILED', 500, true, {
          originalError: error.message
        });
      }
    }
    throw error;
  }
}

/**
 * Retry helper with exponential backoff
 *
 * Usage:
 * ```typescript
 * const data = await retryWithBackoff(
 *   () => fetchData(),
 *   { maxAttempts: 3, baseDelay: 1000 }
 * );
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = errorHandler.isRetryable.bind(errorHandler)
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Check if we should retry
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);

      logger.dev(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Type guard: Check if error is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type guard: Check if error has a message property
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Type guard: Check if error has a code property
 */
export function isErrorWithCode(error: unknown): error is { code: string | number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (typeof (error as Record<string, unknown>).code === 'string' ||
      typeof (error as Record<string, unknown>).code === 'number')
  );
}

/**
 * Type guard: Check if error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Extract error message from unknown error with type safety
 */
export function getErrorMessage(error: unknown): string {
  // Error instance
  if (isError(error)) {
    return error.message;
  }

  // Object with message property
  if (isErrorWithMessage(error)) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Number error (rare but possible)
  if (typeof error === 'number') {
    return `Error code: ${error}`;
  }

  // Boolean error (very rare)
  if (typeof error === 'boolean') {
    return error ? 'Operation failed' : 'Operation returned false';
  }

  // Null or undefined
  if (error === null || error === undefined) {
    return 'Unknown error occurred';
  }

  // Try to stringify object errors
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

/**
 * Handle unknown error with context logging and message extraction
 *
 * @param error - Unknown error object
 * @param context - Context string for logging (e.g., 'UserService.createUser')
 * @returns Human-readable error message
 *
 * @example
 * ```typescript
 * try {
 *   await supabase.from('users').insert(data);
 * } catch (error) {
 *   const message = handleUnknownError(error, 'UserService.createUser');
 *   toast.error(message);
 * }
 * ```
 */
export function handleUnknownError(error: unknown, context: string): string {
  const message = getErrorMessage(error);

  // Enhanced logging with context
  if (isError(error)) {
    console.error(`[${context}] Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
  } else if (isSupabaseError(error)) {
    console.error(`[${context}] Supabase Error:`, {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  } else {
    console.error(`[${context}] Unknown error:`, error);
  }

  return message;
}

/**
 * Extract detailed error information for debugging
 */
export function getErrorDetails(error: unknown): {
  message: string;
  name?: string;
  code?: string | number;
  details?: string;
  hint?: string;
  stack?: string;
} {
  const details: {
    message: string;
    name?: string;
    code?: string | number;
    details?: string;
    hint?: string;
    stack?: string;
  } = {
    message: getErrorMessage(error),
  };

  if (isError(error)) {
    details.name = error.name;
    details.stack = error.stack;
  }

  if (isErrorWithCode(error)) {
    details.code = error.code;
  }

  if (isSupabaseError(error)) {
    const supabaseError = error as { code?: string; details?: string; hint?: string };
    details.code = supabaseError.code;
    details.details = supabaseError.details;
    details.hint = supabaseError.hint;
  }

  return details;
}

/**
 * Parse Supabase errors into AppError types
 */
export function parseSupabaseError(error: unknown): AppError {
  const message = isErrorWithMessage(error) ? error.message : 'Database operation failed';
  const code = isErrorWithCode(error)
    ? String(error.code)
    : 'UNKNOWN';

  // Map Supabase error codes to app errors
  if (code === 'PGRST116' || code === 'PGRST301') {
    return new NotFoundError('Resource', undefined, { supabaseCode: code });
  }

  if (code === '42501' || message.includes('permission')) {
    return new PermissionError(message, { supabaseCode: code });
  }

  if (code === '23505') {
    return new ValidationError('Duplicate entry', undefined, { supabaseCode: code });
  }

  if (code === '23503') {
    return new ValidationError('Referenced record not found', undefined, { supabaseCode: code });
  }

  // Default to database error
  return new DatabaseError(message, { supabaseCode: code });
}

/**
 * Safe error message extractor
 * Ensures we never show sensitive information to users
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // In development, show full error
    if (import.meta.env.DEV) {
      return error.message;
    }
    // In production, generic message
    return 'An error occurred. Please try again.';
  }

  return 'An unexpected error occurred';
}
