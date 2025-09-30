/**
 * Network Error Suppressor
 * Reduces console noise from network connectivity issues
 */

// Store original console methods
const originalError = console.error;
const originalWarn = console.warn;

// Network error patterns to suppress
const NETWORK_ERROR_PATTERNS = [
  'Failed to fetch',
  'ERR_INTERNET_DISCONNECTED',
  'ERR_NAME_NOT_RESOLVED',
  'NetworkError',
  'fetch failed',
  'net::ERR_',
  'Load failed',
  'Network request failed',
  'The network connection was lost',
  'A network error occurred',
];

// Check if message contains network error patterns
function isNetworkError(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
}

// Enhanced console.error that suppresses network errors
console.error = (...args: any[]) => {
  const message = args[0]?.toString() || '';
  const stack = args[0]?.stack?.toString() || '';

  // Check message and stack for network error patterns
  if (isNetworkError(message) || isNetworkError(stack)) {
    // Silently ignore - user is likely offline or experiencing connectivity issues
    return;
  }

  // Pass through other errors
  originalError.apply(console, args);
};

// Enhanced console.warn for network-related warnings
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';

  // Suppress network-related warnings
  if (isNetworkError(message)) {
    return;
  }

  // Pass through other warnings
  originalWarn.apply(console, args);
};

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason?.message || event.reason?.toString() || '';

  // Suppress network errors in unhandled rejections
  if (isNetworkError(message)) {
    event.preventDefault(); // Prevent default error logging
  }
});

// Global error handler for runtime errors
window.addEventListener('error', (event) => {
  const message = event.message || event.error?.message || '';

  // Suppress network errors
  if (isNetworkError(message)) {
    event.preventDefault(); // Prevent default error logging
  }
});

console.log('🛡️ Network error suppressor initialized - noisy network errors will be silenced');