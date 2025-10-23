/**
 * Unit tests for search sanitization utilities
 * @jest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeSearchTerm,
  sanitizeAndLowercase,
  needsSanitization,
} from '../searchSanitization';

describe('searchSanitization', () => {
  describe('sanitizeSearchTerm', () => {
    it('should return normal search terms unchanged', () => {
      expect(sanitizeSearchTerm('BMW')).toBe('BMW');
      expect(sanitizeSearchTerm('test')).toBe('test');
      expect(sanitizeSearchTerm('Toyota Corolla')).toBe('Toyota Corolla');
      expect(sanitizeSearchTerm('VIN123456')).toBe('VIN123456');
    });

    it('should escape percent wildcard', () => {
      expect(sanitizeSearchTerm('test%')).toBe('test\\%');
      expect(sanitizeSearchTerm('%test')).toBe('\\%test');
      expect(sanitizeSearchTerm('te%st')).toBe('te\\%st');
      expect(sanitizeSearchTerm('100%')).toBe('100\\%');
    });

    it('should escape underscore wildcard', () => {
      expect(sanitizeSearchTerm('test_')).toBe('test\\_');
      expect(sanitizeSearchTerm('_test')).toBe('\\_test');
      expect(sanitizeSearchTerm('te_st')).toBe('te\\_st');
      expect(sanitizeSearchTerm('BMW_X5')).toBe('BMW\\_X5');
    });

    it('should escape backslash', () => {
      expect(sanitizeSearchTerm('test\\')).toBe('test\\\\');
      expect(sanitizeSearchTerm('\\test')).toBe('\\\\test');
      expect(sanitizeSearchTerm('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape combined wildcards correctly', () => {
      expect(sanitizeSearchTerm('test%_')).toBe('test\\%\\_');
      expect(sanitizeSearchTerm('%_\\')).toBe('\\%\\_\\\\');
      expect(sanitizeSearchTerm('100%_off')).toBe('100\\%\\_off');
      expect(sanitizeSearchTerm('a\\b%c_d')).toBe('a\\\\b\\%c\\_d');
    });

    it('should trim whitespace', () => {
      expect(sanitizeSearchTerm('  test  ')).toBe('test');
      expect(sanitizeSearchTerm('  test%  ')).toBe('test\\%');
    });

    it('should return null for invalid inputs', () => {
      expect(sanitizeSearchTerm(null)).toBeNull();
      expect(sanitizeSearchTerm(undefined)).toBeNull();
      expect(sanitizeSearchTerm('')).toBeNull();
      expect(sanitizeSearchTerm('   ')).toBeNull();
    });

    it('should return null for non-string types', () => {
      expect(sanitizeSearchTerm(123)).toBeNull();
      expect(sanitizeSearchTerm(true)).toBeNull();
      expect(sanitizeSearchTerm({})).toBeNull();
      expect(sanitizeSearchTerm([])).toBeNull();
    });

    it('should preserve unicode characters', () => {
      expect(sanitizeSearchTerm('Café')).toBe('Café');
      expect(sanitizeSearchTerm('Müller')).toBe('Müller');
    });

    it('should preserve emojis', () => {
      expect(sanitizeSearchTerm('test🚀')).toBe('test🚀');
      expect(sanitizeSearchTerm('🔥hot')).toBe('🔥hot');
    });
  });

  describe('sanitizeAndLowercase', () => {
    it('should sanitize and convert to lowercase', () => {
      expect(sanitizeAndLowercase('BMW')).toBe('bmw');
      expect(sanitizeAndLowercase('Test%')).toBe('test\\%');
      expect(sanitizeAndLowercase('Car_Name')).toBe('car\\_name');
    });

    it('should return null for invalid inputs', () => {
      expect(sanitizeAndLowercase(null)).toBeNull();
      expect(sanitizeAndLowercase('')).toBeNull();
    });
  });

  describe('needsSanitization', () => {
    it('should return true for terms with wildcards', () => {
      expect(needsSanitization('test%')).toBe(true);
      expect(needsSanitization('test_')).toBe(true);
      expect(needsSanitization('test\\')).toBe(true);
    });

    it('should return false for normal terms', () => {
      expect(needsSanitization('BMW')).toBe(false);
      expect(needsSanitization('test')).toBe(false);
    });
  });

  describe('security tests', () => {
    it('should prevent wildcard bypass attacks', () => {
      const maliciousInput = 'test%';
      const sanitized = sanitizeSearchTerm(maliciousInput);
      expect(sanitized).toBe('test\\%');
    });

    it('should handle SQL injection attempts safely', () => {
      const attempts = [
        "test'; DROP TABLE users; --",
        "test' OR '1'='1",
      ];

      attempts.forEach((attempt) => {
        const result = sanitizeSearchTerm(attempt);
        expect(result).not.toBeNull();
      });
    });
  });

  describe('real-world vehicle searches', () => {
    it('should handle common vehicle patterns', () => {
      expect(sanitizeSearchTerm('BMW 330i')).toBe('BMW 330i');
      expect(sanitizeSearchTerm('M-Class')).toBe('M-Class');
      expect(sanitizeSearchTerm('E-Class_AMG')).toBe('E-Class\\_AMG');
    });

    it('should handle VINs', () => {
      expect(sanitizeSearchTerm('1HGBH41JXMN109186')).toBe('1HGBH41JXMN109186');
    });

    it('should handle stock numbers', () => {
      expect(sanitizeSearchTerm('STK-001')).toBe('STK-001');
      expect(sanitizeSearchTerm('STK_001')).toBe('STK\\_001');
    });
  });
});
