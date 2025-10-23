/**
 * Unit tests for dealer validation utilities
 * @jest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import {
  validateDealerId,
  validateDealershipObject,
  isValidDealerId,
  assertValidDealerId,
  sanitizeDealerIdForQuery,
} from '../dealerValidation';

describe('dealerValidation', () => {
  describe('validateDealerId', () => {
    it('should return valid positive integer IDs', () => {
      expect(validateDealerId(1)).toBe(1);
      expect(validateDealerId(5)).toBe(5);
      expect(validateDealerId(12345)).toBe(12345);
      expect(validateDealerId(999999)).toBe(999999);
    });

    it('should return null for invalid inputs', () => {
      expect(validateDealerId(null)).toBeNull();
      expect(validateDealerId(undefined)).toBeNull();
      expect(validateDealerId('all')).toBeNull();
      expect(validateDealerId('')).toBeNull();
      expect(validateDealerId(0)).toBeNull();
      expect(validateDealerId(-1)).toBeNull();
      expect(validateDealerId(-100)).toBeNull();
      expect(validateDealerId(1.5)).toBeNull();
      expect(validateDealerId(NaN)).toBeNull();
      expect(validateDealerId(Infinity)).toBeNull();
      expect(validateDealerId(-Infinity)).toBeNull();
    });

    it('should return null for non-numeric types', () => {
      expect(validateDealerId('abc')).toBeNull();
      expect(validateDealerId(true)).toBeNull();
      expect(validateDealerId(false)).toBeNull();
      expect(validateDealerId({})).toBeNull();
      expect(validateDealerId([])).toBeNull();
      expect(validateDealerId(() => 5)).toBeNull();
    });

    it('should convert valid string numbers to integers', () => {
      expect(validateDealerId('5')).toBe(5);
      expect(validateDealerId('123')).toBe(123);
    });

    it('should return null for invalid string numbers', () => {
      expect(validateDealerId('1.5')).toBeNull();
      expect(validateDealerId('0')).toBeNull();
      expect(validateDealerId('-1')).toBeNull();
      expect(validateDealerId('abc')).toBeNull();
    });
  });

  describe('validateDealershipObject', () => {
    it('should extract and validate ID from valid dealership object', () => {
      const dealership = {
        id: 5,
        name: 'BMW Dealership',
        email: 'contact@bmw.com',
      };
      expect(validateDealershipObject(dealership)).toBe(5);
    });

    it('should return null for invalid dealership objects', () => {
      expect(validateDealershipObject(null)).toBeNull();
      expect(validateDealershipObject(undefined)).toBeNull();
      expect(validateDealershipObject({})).toBeNull();
      expect(validateDealershipObject({ name: 'Test' })).toBeNull();
      expect(validateDealershipObject({ id: 'all' })).toBeNull();
      expect(validateDealershipObject({ id: -1 })).toBeNull();
    });

    it('should handle dealership with invalid ID', () => {
      expect(validateDealershipObject({ id: 0 })).toBeNull();
      expect(validateDealershipObject({ id: null })).toBeNull();
      expect(validateDealershipObject({ id: undefined })).toBeNull();
    });
  });

  describe('isValidDealerId', () => {
    it('should return true for valid IDs', () => {
      expect(isValidDealerId(1)).toBe(true);
      expect(isValidDealerId(5)).toBe(true);
      expect(isValidDealerId(12345)).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidDealerId(null)).toBe(false);
      expect(isValidDealerId(undefined)).toBe(false);
      expect(isValidDealerId('all')).toBe(false);
      expect(isValidDealerId(0)).toBe(false);
      expect(isValidDealerId(-1)).toBe(false);
      expect(isValidDealerId(1.5)).toBe(false);
    });

    it('should work as type guard', () => {
      const dealerId: unknown = 5;

      if (isValidDealerId(dealerId)) {
        // TypeScript should infer dealerId as number here
        const result: number = dealerId;
        expect(result).toBe(5);
      }
    });
  });

  describe('assertValidDealerId', () => {
    it('should not throw for valid IDs', () => {
      expect(() => assertValidDealerId(1)).not.toThrow();
      expect(() => assertValidDealerId(5)).not.toThrow();
      expect(() => assertValidDealerId(12345)).not.toThrow();
    });

    it('should throw for invalid IDs', () => {
      expect(() => assertValidDealerId(null)).toThrow('Invalid dealer ID');
      expect(() => assertValidDealerId(undefined)).toThrow('Invalid dealer ID');
      expect(() => assertValidDealerId('all')).toThrow('Invalid dealer ID');
      expect(() => assertValidDealerId(0)).toThrow('Invalid dealer ID');
      expect(() => assertValidDealerId(-1)).toThrow('Invalid dealer ID');
    });

    it('should include context in error message', () => {
      expect(() => assertValidDealerId(null, 'useGetReadyVehicles')).toThrow(
        'Invalid dealer ID in useGetReadyVehicles'
      );
    });

    it('should act as type assertion', () => {
      const dealerId: unknown = 5;
      assertValidDealerId(dealerId);

      // TypeScript should infer dealerId as number after assertion
      const result: number = dealerId;
      expect(result).toBe(5);
    });
  });

  describe('sanitizeDealerIdForQuery', () => {
    it('should return sanitized ID for valid inputs', () => {
      expect(sanitizeDealerIdForQuery(5)).toBe(5);
      expect(sanitizeDealerIdForQuery(12345)).toBe(12345);
      expect(sanitizeDealerIdForQuery('5')).toBe(5);
    });

    it('should throw for invalid inputs', () => {
      expect(() => sanitizeDealerIdForQuery(null)).toThrow(
        'Cannot execute query with invalid dealer ID'
      );
      expect(() => sanitizeDealerIdForQuery('all')).toThrow(
        'Cannot execute query with invalid dealer ID'
      );
      expect(() => sanitizeDealerIdForQuery(0)).toThrow(
        'Cannot execute query with invalid dealer ID'
      );
      expect(() => sanitizeDealerIdForQuery(-1)).toThrow(
        'Cannot execute query with invalid dealer ID'
      );
    });

    it('should prevent SQL injection attempts', () => {
      expect(() => sanitizeDealerIdForQuery('5; DROP TABLE users;')).toThrow();
      expect(() => sanitizeDealerIdForQuery("5' OR '1'='1")).toThrow();
      expect(() => sanitizeDealerIdForQuery({ toString: () => '5; --' })).toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle Number objects', () => {
      expect(validateDealerId(new Number(5))).toBeNull(); // Number objects are not primitive
    });

    it('should handle very large numbers', () => {
      expect(validateDealerId(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
      expect(validateDealerId(Number.MAX_SAFE_INTEGER + 1)).toBeNull(); // Not safe integer
    });

    it('should handle scientific notation strings', () => {
      expect(validateDealerId('1e5')).toBe(100000); // Scientific notation converts to valid integer
      expect(validateDealerId('5.0')).toBe(5); // Decimal zero converts to integer
    });

    it('should handle BigInt (if passed)', () => {
      // BigInt is not a number type
      expect(validateDealerId(BigInt(5))).toBeNull();
    });
  });

  describe('security tests', () => {
    it('should reject common injection patterns', () => {
      const injectionAttempts = [
        '1 OR 1=1',
        "1' OR '1'='1",
        '1; DROP TABLE users;',
        '1 UNION SELECT * FROM users',
        '../../../etc/passwd',
        '${5}',
        '{{5}}',
        '<script>alert(1)</script>',
      ];

      injectionAttempts.forEach((attempt) => {
        expect(validateDealerId(attempt)).toBeNull();
      });
    });

    it('should reject type coercion attempts', () => {
      expect(validateDealerId({ valueOf: () => 5 })).toBeNull();
      expect(validateDealerId({ toString: () => '5' })).toBeNull();
      expect(validateDealerId([5])).toBeNull();
    });
  });
});
