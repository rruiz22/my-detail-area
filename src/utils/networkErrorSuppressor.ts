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
  'ERR_TIMED_OUT',
  'NetworkError',
  'fetch failed',
  'net::ERR_',
  'Load failed',
  'Network request failed',
  'The network connection was lost',
  'A network error occurred',
  'livechat-loader.js',
  'support.mydetailarea.com',
];

// Push notification non-critical patterns to suppress
const PUSH_NOTIFICATION_INFO_PATTERNS = [
  'No active FCM tokens found',
  'no active fcm tokens',
  'PushNotificationHelper] Edge Function error',
  'Edge Function returned a non-2xx status code',
];

// Node.js polyfill warnings to suppress (from Excel/CSV libraries)
const POLYFILL_WARNING_PATTERNS = [
  'called in browser',
  'returning empty object',
  'require(\'stream\')',
  'require(\'_process\')',
  'require(\'buffer\')',
];

// Check if message contains network error patterns
function isNetworkError(message: string): boolean {
  return NETWORK_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
}

// Check if message contains polyfill warning patterns
function isPolyfillWarning(message: string): boolean {
  return POLYFILL_WARNING_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
}

// Check if message is a non-critical push notification info
function isPushNotificationInfo(message: string): boolean {
  return PUSH_NOTIFICATION_INFO_PATTERNS.some((pattern) =>
    message.toLowerCase().includes(pattern.toLowerCase())
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

  // Check for non-critical push notification info messages
  if (isPushNotificationInfo(message)) {
    // Downgrade to info log - not a real error
    console.info('ℹ️ [Info]', ...args);
    return;
  }

  // Pass through other errors
  originalError.apply(console, args);
};

// Enhanced console.warn for network-related warnings and polyfill noise
console.warn = (...args: any[]) => {
  const message = args[0]?.toString() || '';

  // Suppress network-related warnings
  if (isNetworkError(message)) {
    return;
  }

  // ✅ Suppress Node.js polyfill warnings (from Excel/CSV libraries)
  if (isPolyfillWarning(message)) {
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

console.log('🛡️ Console noise suppressor initialized - network errors and polyfill warnings will be silenced');
