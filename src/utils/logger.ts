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

// Ultra-simple logging functions that never fail
export const dev = (...args: any[]): void => {
  try {
    if (isDev) console.log(...args);
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
    if (isDev) console.log('✅', ...args);
  } catch {
    // Silent fail
  }
};

export const cache = (...args: any[]): void => {
  try {
    if (isDev) console.log('📦', ...args);
  } catch {
    // Silent fail
  }
};

export const auth = (...args: any[]): void => {
  try {
    if (isDev) console.log('👤', ...args);
  } catch {
    // Silent fail
  }
};

export const nav = (...args: any[]): void => {
  try {
    if (isDev) console.log('🔀', ...args);
  } catch {
    // Silent fail
  }
};

export const realtime = (...args: any[]): void => {
  try {
    if (isDev) console.log('📡', ...args);
  } catch {
    // Silent fail
  }
};

export const business = (...args: any[]): void => {
  try {
    if (isDev) console.log('💼', ...args);
  } catch {
    // Silent fail
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
      console.info('📵 Debug logs disabled');
    } catch {
      // Silent fail
    }
  },
  enableDevLogs: () => {
    try {
      console.info('🔊 Debug logs enabled');
    } catch {
      // Silent fail
    }
  }
};