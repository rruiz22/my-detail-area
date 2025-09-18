/**
 * Professional Logging Utility
 * Environment-based logging for production-ready applications
 */

export type LogLevel = 'dev' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  isDevelopment: boolean;
  enablePerformanceLogs: boolean;
  enableDebugLogs: boolean;
}

class Logger {
  private isDev: boolean;

  constructor() {
    // Simple environment check that works in all builds
    try {
      this.isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
    } catch {
      // Fallback for production builds where process might not be available
      this.isDev = false;
    }
  }

  /**
   * Development-only logs (removed in production)
   */
  dev(...args: any[]): void {
    if (this.isDev) {
      console.log(...args);
    }
  }

  /**
   * Performance logs (development only)
   */
  perf(...args: any[]): void {
    if (this.isDev) {
      console.log('⚡', ...args);
    }
  }

  /**
   * Informational logs (always shown)
   */
  info(...args: any[]): void {
    console.info('ℹ️', ...args);
  }

  /**
   * Warning logs (always shown)
   */
  warn(...args: any[]): void {
    console.warn('⚠️', ...args);
  }

  /**
   * Error logs (always shown)
   */
  error(...args: any[]): void {
    console.error('❌', ...args);
  }

  /**
   * Success logs (important operations)
   */
  success(...args: any[]): void {
    if (this.isDev) {
      console.log('✅', ...args);
    }
  }

  /**
   * Cache-related logs (development only)
   */
  cache(...args: any[]): void {
    if (this.isDev) {
      console.log('📦', ...args);
    }
  }

  /**
   * Database operation logs (development only)
   */
  db(...args: any[]): void {
    if (this.isDev) {
      console.log('🗄️', ...args);
    }
  }

  /**
   * Authentication logs (development only)
   */
  auth(...args: any[]): void {
    if (this.isDev) {
      console.log('👤', ...args);
    }
  }

  /**
   * Navigation logs (development only)
   */
  nav(...args: any[]): void {
    if (this.isDev) {
      console.log('🔀', ...args);
    }
  }

  /**
   * Real-time update logs (development only)
   */
  realtime(...args: any[]): void {
    if (this.isDev) {
      console.log('📡', ...args);
    }
  }

  /**
   * Business operation logs (important - development only but visible)
   */
  business(...args: any[]): void {
    if (this.isDev) {
      console.log('💼', ...args);
    }
  }

  /**
   * Disable all development logs (for production testing)
   */
  disableDevLogs(): void {
    this.isDev = false;
    console.info('📵 Debug logs disabled for production mode');
  }

  /**
   * Enable all development logs
   */
  enableDevLogs(): void {
    this.isDev = true;
    console.info('🔊 Debug logs enabled for development mode');
  }

  /**
   * Get current logger configuration
   */
  getConfig(): { isDevelopment: boolean } {
    return { isDevelopment: this.isDev };
  }

  /**
   * Log application startup (important)
   */
  startup(appName: string, version?: string): void {
    console.log(`🚀 ${appName}${version ? ` v${version}` : ''} starting up`);

    if (this.isDev) {
      console.log('🔧 Development mode - Full logging enabled');
    } else {
      console.log('🏭 Production mode - Essential logs only');
    }
  }

  /**
   * Group logs for better organization (development only)
   */
  group(label: string, callback: () => void): void {
    if (this.isDev) {
      console.group(label);
      callback();
      console.groupEnd();
    } else {
      callback();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export commonly used log functions
export const { dev, info, warn, error, success, cache, db, auth, nav, realtime, business } = logger;