/**
 * Ultra-Simple Production-Safe Logging
 * Never fails, never blocks functionality
 */

// Simple environment detection that always works
const isDev = (() => {
  try {
    // Multiple fallback checks for environment detection
    if (typeof window !== 'undefined') {
      return window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
    }
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development';
    }
    return false;
  } catch {
    return false; // Safe fallback
  }
})();

// Check if debug logging is explicitly enabled via localStorage
const isDebugEnabled = (() => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('debug') === 'true';
    }
    return false;
  } catch {
    return false;
  }
})();

// Helper to determine if logs should be shown
const shouldLog = (): boolean => isDev || isDebugEnabled;

// Ultra-simple logging functions that never fail
export const dev = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log(...args);
  } catch {
    // Silent fail - never block functionality
  }
};

export const info = (...args: any[]): void => {
  try {
    console.info('ℹ️', ...args);
  } catch {
    // Silent fail
  }
};

export const warn = (...args: any[]): void => {
  try {
    console.warn('⚠️', ...args);
  } catch {
    // Silent fail
  }
};

export const error = (...args: any[]): void => {
  try {
    console.error('❌', ...args);
  } catch {
    // Silent fail
  }
};

export const success = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log('✅', ...args);
  } catch {
    // Silent fail
  }
};

export const cache = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log('📦', ...args);
  } catch {
    // Silent fail
  }
};

export const auth = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log('👤', ...args);
  } catch {
    // Silent fail
  }
};

export const nav = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log('🔀', ...args);
  } catch {
    // Silent fail
  }
};

export const realtime = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log('📡', ...args);
  } catch {
    // Silent fail
  }
};

export const business = (...args: any[]): void => {
  try {
    if (shouldLog()) console.log('💼', ...args);
  } catch {
    // Silent fail
  }
};

export const debug = (...args: any[]): void => {
  try {
    if (isDebugEnabled) console.debug('🐛', ...args);
  } catch {
    // Silent fail
  }
};

// ✅ FIX: Add secure logging with data sanitization for permissions
/**
 * Sanitize sensitive data for logging
 * Only shows full data in dev/debug mode, redacts in production
 */
export const sanitize = (data: any, redactLevel: 'partial' | 'full' = 'partial'): any => {
  try {
    // Always show in dev/debug mode
    if (shouldLog()) {
      return data;
    }

    // Production: redact sensitive data
    if (redactLevel === 'full') {
      return '[REDACTED]';
    }

    // Partial redaction: show type/structure but hide values
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        return `[Array(${data.length})]`;
      }
      return `[Object with ${Object.keys(data).length} keys]`;
    }

    if (typeof data === 'string' && data.length > 20) {
      return `${data.substring(0, 10)}...[${data.length} chars]`;
    }

    return '[REDACTED]';
  } catch {
    return '[SANITIZE_ERROR]';
  }
};

/**
 * Secure logging for permissions and sensitive data
 * Use this for system admin checks, role information, etc.
 */
export const secure = {
  // Log permission checks (hide in production)
  permission: (message: string, data?: any) => {
    try {
      if (shouldLog()) {
        console.log('🔐', message, data);
      }
    } catch {
      // Silent fail
    }
  },

  // Log role information (redacted in production)
  role: (message: string, roles?: any) => {
    try {
      if (shouldLog()) {
        console.log('👥', message, roles);
      } else if (roles) {
        console.log('👥', message, sanitize(roles, 'partial'));
      }
    } catch {
      // Silent fail
    }
  },

  // Log admin actions (always log but sanitize)
  admin: (message: string, data?: any) => {
    try {
      console.log('⚡', message, shouldLog() ? data : sanitize(data, 'full'));
    } catch {
      // Silent fail
    }
  },

  // Log security events (always log but sanitize)
  security: (message: string, data?: any) => {
    try {
      console.warn('🛡️', message, shouldLog() ? data : sanitize(data, 'full'));
    } catch {
      // Silent fail
    }
  }
};

// Simple logger object for backward compatibility
export const logger = {
  dev,
  info,
  warn,
  error,
  success,
  cache,
  auth,
  nav,
  realtime,
  business,
  secure,
  sanitize,
  debug,
  startup: (appName: string, version?: string) => {
    try {
      console.log(`🚀 ${appName}${version ? ` v${version}` : ''} starting up`);
      if (isDev) {
        console.log('🔧 Development mode');
      } else {
        console.log('🏭 Production mode');
      }
    } catch {
      // Silent fail
    }
  },
  disableDevLogs: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('debug');
      }
      console.info('📵 Debug logs disabled (reload page to take effect)');
    } catch {
      // Silent fail
    }
  },
  enableDevLogs: () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('debug', 'true');
      }
      console.info('🔊 Debug logs enabled (reload page to take effect)');
    } catch {
      // Silent fail
    }
  }
};

export default logger;
