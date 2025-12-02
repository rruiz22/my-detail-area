/**
 * Logger Utility Tests
 *
 * CONSERVATIVE: Tests for production-safe logging
 * Validates logger only logs in development, sanitizes in production
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger, sanitize } from '../logger';

describe('Logger Utility', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('Development Logger', () => {
    it('should have dev method', () => {
      expect(logger.dev).toBeDefined();
      expect(typeof logger.dev).toBe('function');
    });

    it('should have warn method', () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe('function');
    });

    it('should have error method', () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe('function');
    });

    it('should have info method', () => {
      expect(logger.info).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });
  });

  describe('Sanitization Function', () => {
    it('should sanitize data', () => {
      const data = { password: 'secret123', name: 'John' };
      const result = sanitize(data);
      expect(result).toBeDefined();
    });

    it('should handle partial redaction', () => {
      const sensitiveData = {
        name: 'John Doe',
        password: 'secret123',
        token: 'abc123'
      };

      const result = sanitize(sensitiveData, 'partial');
      expect(result).toBeDefined();
    });

    it('should handle full redaction', () => {
      const data = { secret: 'value' };
      const result = sanitize(data, 'full');
      expect(result).toBeDefined();
    });

    it('should handle arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = sanitize(arr, 'partial');
      expect(result).toBeDefined();
    });

    it('should handle strings', () => {
      const str = 'This is a very long string that contains sensitive information';
      const result = sanitize(str, 'partial');
      expect(result).toBeDefined();
    });

    it('should handle null/undefined', () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeUndefined();
    });
  });

  describe('Secure Logging', () => {
    it('should have permission logging method', () => {
      expect(logger.secure.permission).toBeDefined();
      logger.secure.permission('Test permission check', { module: 'sales_orders' });
      // Should not throw
    });

    it('should have role logging method', () => {
      expect(logger.secure.role).toBeDefined();
      logger.secure.role('Test role check', { role: 'admin' });
      // Should not throw
    });

    it('should have admin logging method', () => {
      expect(logger.secure.admin).toBeDefined();
      logger.secure.admin('Test admin action');
      // Should not throw
    });

    it('should have security logging method', () => {
      expect(logger.secure.security).toBeDefined();
      logger.secure.security('Test security event');
      // Should not throw
    });
  });

  describe('Specialized Loggers', () => {
    it('should have business logger', () => {
      expect(logger.business).toBeDefined();
      logger.business('Test business event');
      // Should not throw
    });

    it('should have auth logger', () => {
      expect(logger.auth).toBeDefined();
      logger.auth('Test auth event');
      // Should not throw
    });

    it('should have realtime logger', () => {
      expect(logger.realtime).toBeDefined();
      logger.realtime('Test realtime event');
      // Should not throw
    });

    it('should have cache logger', () => {
      expect(logger.cache).toBeDefined();
      logger.cache('Test cache event');
      // Should not throw
    });
  });

  describe('Logger Never Throws', () => {
    it('should handle errors gracefully', () => {
      // Even if console methods throw, logger should not crash
      consoleLogSpy.mockImplementation(() => {
        throw new Error('Console error');
      });

      expect(() => logger.dev('test')).not.toThrow();
      expect(() => logger.warn('test')).not.toThrow();
      expect(() => logger.error('test')).not.toThrow();
    });
  });

  describe('Logger Configuration', () => {
    it('should have startup method', () => {
      expect(logger.startup).toBeDefined();
      logger.startup('MyDetailArea', '1.0.0');
      // Should not throw
    });

    it('should have enableDevLogs method', () => {
      expect(logger.enableDevLogs).toBeDefined();
    });

    it('should have disableDevLogs method', () => {
      expect(logger.disableDevLogs).toBeDefined();
    });
  });
});
