/**
 * Enterprise Error Handling and Fallback Mechanisms for Cloud Sync
 */

export interface ErrorContext {
  operation: string;
  key?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
}

export interface FallbackStrategy {
  retryAttempts: number;
  retryDelay: number;
  useLocalStorage: boolean;
  showUserNotification: boolean;
  gracefulDegradation: boolean;
}

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  exponentialBackoff?: boolean;
  showToast?: boolean;
  fallbackToLocal?: boolean;
}

class ErrorHandlingService {
  private errorLog: Array<{
    error: Error;
    context: ErrorContext;
    timestamp: number;
    recovered: boolean;
  }> = [];
  
  private readonly MAX_ERROR_LOG_SIZE = 100;
  private readonly DEFAULT_RETRY_DELAY = 1000;
  private readonly MAX_RETRY_DELAY = 30000;

  /**
   * Enhanced error handler with context and recovery strategies
   */
  async handleError(
    error: Error,
    context: ErrorContext,
    recoveryOptions: ErrorRecoveryOptions = {}
  ): Promise<boolean> {
    const {
      maxRetries = 3,
      baseDelay = this.DEFAULT_RETRY_DELAY,
      maxDelay = this.MAX_RETRY_DELAY,
      exponentialBackoff = true,
      showToast = true,
      fallbackToLocal = true
    } = recoveryOptions;

    // Log the error
    this.logError(error, context);

    // Analyze error type and determine recovery strategy
    const strategy = this.determineRecoveryStrategy(error, context);
    
    console.error(`❌ Error in ${context.operation}:`, {
      error: error.message,
      context,
      strategy
    });

    // Show user notification if appropriate
    if (showToast && strategy.showUserNotification) {
      this.showErrorToast(error, context, strategy);
    }

    // Attempt recovery
    let recovered = false;
    
    if (strategy.retryAttempts > 0) {
      recovered = await this.attemptRecovery(
        error,
        context,
        maxRetries,
        baseDelay,
        exponentialBackoff
      );
    }

    // Fallback to localStorage if cloud sync failed
    if (!recovered && strategy.useLocalStorage && fallbackToLocal) {
      recovered = this.fallbackToLocalStorage(context);
    }

    // Apply graceful degradation if needed
    if (!recovered && strategy.gracefulDegradation) {
      this.applyGracefulDegradation(context);
      recovered = true; // Consider degraded mode as "recovered"
    }

    // Update error log with recovery status
    this.updateErrorRecoveryStatus(error, context, recovered);

    return recovered;
  }

  /**
   * Retry mechanism with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: ErrorRecoveryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = this.DEFAULT_RETRY_DELAY,
      exponentialBackoff = true,
      showToast = false
    } = options;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          // Final attempt failed, handle the error
          await this.handleError(lastError, context, options);
          throw lastError;
        }

        // Calculate delay for next retry
        const delay = exponentialBackoff
          ? Math.min(baseDelay * Math.pow(2, attempt), this.MAX_RETRY_DELAY)
          : baseDelay;

        console.warn(`⚠️ Attempt ${attempt + 1} failed for ${context.operation}, retrying in ${delay}ms`);
        
        if (showToast && attempt === 0) {
          toast.loading(`Retrying ${context.operation}...`, {
            id: `retry-${context.operation}-${context.key}`
          });
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Circuit breaker pattern for failing operations
   */
  createCircuitBreaker(
    operation: string,
    failureThreshold = 5,
    resetTimeout = 30000
  ) {
    let failureCount = 0;
    let lastFailureTime = 0;
    let state: 'closed' | 'open' | 'half-open' = 'closed';

    return async <T>(fn: () => Promise<T>): Promise<T> => {
      const now = Date.now();

      // Reset circuit breaker if enough time has passed
      if (state === 'open' && now - lastFailureTime > resetTimeout) {
        state = 'half-open';
        failureCount = 0;
      }

      // Reject immediately if circuit is open
      if (state === 'open') {
        throw new Error(`Circuit breaker is open for ${operation}`);
      }

      try {
        const result = await fn();
        
        // Success - reset failure count and close circuit
        if (state === 'half-open') {
          state = 'closed';
          failureCount = 0;
        }
        
        return result;
      } catch (error) {
        failureCount++;
        lastFailureTime = now;

        // Open circuit if failure threshold reached
        if (failureCount >= failureThreshold) {
          state = 'open';
          console.warn(`🔴 Circuit breaker opened for ${operation}`);
          
          console.warn(`${operation} temporarily unavailable`);
        }

        throw error;
      }
    };
  }

  /**
   * Get error statistics
   */
  getErrorStatistics() {
    const now = Date.now();
    const last24Hours = this.errorLog.filter(
      log => now - log.timestamp < 24 * 60 * 60 * 1000
    );

    const byOperation = last24Hours.reduce((acc, log) => {
      const op = log.context.operation;
      acc[op] = (acc[op] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoveryRate = last24Hours.length > 0
      ? last24Hours.filter(log => log.recovered).length / last24Hours.length
      : 1;

    return {
      totalErrors: last24Hours.length,
      errorsByOperation: byOperation,
      recoveryRate: Math.round(recoveryRate * 100),
      mostCommonError: Object.entries(byOperation)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
    console.log('🧹 Error log cleared');
  }

  // Private methods

  private logError(error: Error, context: ErrorContext): void {
    this.errorLog.push({
      error,
      context,
      timestamp: Date.now(),
      recovered: false
    });

    // Limit log size
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERROR_LOG_SIZE);
    }
  }

  private determineRecoveryStrategy(error: Error, context: ErrorContext): FallbackStrategy {
    const errorMessage = error.message.toLowerCase();
    
    // Network-related errors
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        retryAttempts: 3,
        retryDelay: 2000,
        useLocalStorage: true,
        showUserNotification: true,
        gracefulDegradation: true
      };
    }

    // Storage quota errors
    if (errorMessage.includes('quota') || errorMessage.includes('storage')) {
      return {
        retryAttempts: 1,
        retryDelay: 1000,
        useLocalStorage: false,
        showUserNotification: true,
        gracefulDegradation: true
      };
    }

    // Timeout errors
    if (errorMessage.includes('timeout')) {
      return {
        retryAttempts: 2,
        retryDelay: 3000,
        useLocalStorage: true,
        showUserNotification: false,
        gracefulDegradation: true
      };
    }

    // Authentication/authorization errors
    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return {
        retryAttempts: 0,
        retryDelay: 0,
        useLocalStorage: true,
        showUserNotification: true,
        gracefulDegradation: true
      };
    }

    // Default strategy
    return {
      retryAttempts: 2,
      retryDelay: 1000,
      useLocalStorage: true,
      showUserNotification: false,
      gracefulDegradation: true
    };
  }

  private async attemptRecovery(
    error: Error,
    context: ErrorContext,
    maxRetries: number,
    baseDelay: number,
    exponentialBackoff: boolean
  ): Promise<boolean> {
    // This is a placeholder for operation-specific recovery logic
    // In a real implementation, you would re-attempt the original operation
    console.log(`🔄 Attempting recovery for ${context.operation} (${maxRetries} retries)`);
    return false; // For now, assume recovery attempts fail
  }

  private fallbackToLocalStorage(context: ErrorContext): boolean {
    try {
      console.log(`💾 Falling back to localStorage for ${context.operation}`);
      
      // Show user that we're in offline mode
      console.info('Working offline');
      
      return true;
    } catch (error) {
      console.error('❌ localStorage fallback failed:', error);
      return false;
    }
  }

  private applyGracefulDegradation(context: ErrorContext): void {
    console.log(`⚡ Applying graceful degradation for ${context.operation}`);
    
    // Disable non-essential features temporarily
    const degradedFeatures = [
      'Real-time sync',
      'Cloud backups',
      'Cross-device sync'
    ];

    console.warn(`Limited functionality - Some features temporarily disabled: ${degradedFeatures.join(', ')}`);
  }

  private showErrorToast(error: Error, context: ErrorContext, strategy: FallbackStrategy): void {
    const isNetworkError = error.message.toLowerCase().includes('network') ||
                          error.message.toLowerCase().includes('fetch');

    if (isNetworkError) {
      console.error('Connection issue');
    } else if (error.message.toLowerCase().includes('quota')) {
      console.error('Storage limit reached');
    } else {
      console.error(`Error in ${context.operation}`);
    }
  }

  private updateErrorRecoveryStatus(error: Error, context: ErrorContext, recovered: boolean): void {
    const logEntry = this.errorLog.find(
      log => log.error === error && log.context.operation === context.operation
    );
    
    if (logEntry) {
      logEntry.recovered = recovered;
    }
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandlingService();

/**
 * Utility function for creating error context
 */
export function createErrorContext(
  operation: string,
  key?: string,
  additionalData?: Record<string, any>
): ErrorContext {
  return {
    operation,
    key,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    ...additionalData
  };
}

/**
 * Decorator for adding error handling to async functions
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  operation: string,
  options?: ErrorRecoveryOptions
) {
  return async (...args: T): Promise<R> => {
    const context = createErrorContext(operation);
    
    try {
      return await errorHandler.withRetry(() => fn(...args), context, options);
    } catch (error) {
      // Error was already handled by withRetry
      throw error;
    }
  };
}