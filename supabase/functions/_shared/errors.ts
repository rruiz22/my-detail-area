// Standardized error handling for Settings Hub APIs

export class APIError extends Error {
  code: string
  status: number
  details?: any

  constructor(code: string, message: string, status: number = 500, details?: any) {
    super(message)
    this.name = 'APIError'
    this.code = code
    this.status = status
    this.details = details
  }
}

// Authentication & Authorization Errors
export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized access') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403)
  }
}

// Validation Errors
export class ValidationError extends APIError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

// Resource Errors
export class NotFoundError extends APIError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
  }
}

// External Service Errors
export class ExternalServiceError extends APIError {
  constructor(service: string, message: string, details?: any) {
    super('EXTERNAL_SERVICE_ERROR', `${service}: ${message}`, 502, details)
  }
}

// Rate Limiting
export class RateLimitError extends APIError {
  constructor(retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', 'Rate limit exceeded', 429, { retry_after: retryAfter })
  }
}

// Encryption Errors
export class EncryptionError extends APIError {
  constructor(message: string = 'Encryption/decryption failed') {
    super('ENCRYPTION_ERROR', message, 500)
  }
}

// Format error response
export function formatErrorResponse(error: unknown, requestId: string): Response {
  console.error('API Error:', error)

  let apiError: APIError

  if (error instanceof APIError) {
    apiError = error
  } else if (error instanceof Error) {
    apiError = new APIError('INTERNAL_ERROR', error.message, 500)
  } else {
    apiError = new APIError('UNKNOWN_ERROR', 'An unexpected error occurred', 500)
  }

  const response = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      details: apiError.details,
    },
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  }

  return new Response(JSON.stringify(response), {
    status: apiError.status,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
  })
}
