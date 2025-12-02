/**
 * Sanitization Utility Tests
 *
 * CONSERVATIVE: Tests for the new sanitization utility
 * Safe to add - doesn't affect existing functionality
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeInput,
  sanitizeVIN,
  sanitizeEmail,
  sanitizePhone,
  sanitizeStockNumber,
  sanitizeNotes,
  sanitizeOrderForm,
  containsDangerousContent
} from '../sanitize';

describe('sanitizeInput', () => {
  it('should preserve normal text', () => {
    expect(sanitizeInput('John Doe')).toBe('John Doe');
    expect(sanitizeInput('José García')).toBe('José García');
    expect(sanitizeInput('João Silva')).toBe('João Silva');
  });

  it('should remove script tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>Hello'))
      .toBe('Hello');
  });

  it('should remove iframe tags', () => {
    expect(sanitizeInput('<iframe src="evil.com"></iframe>Hello'))
      .toBe('Hello');
  });

  it('should remove javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert("xss")'))
      .toBe('alert("xss")');
  });

  it('should remove inline event handlers', () => {
    // Note: Removes event attribute but may leave quotes
    const result = sanitizeInput('<div onclick="alert()">Hello</div>');
    expect(result).not.toContain('onclick');
    expect(result).toContain('Hello');
  });

  it('should trim whitespace', () => {
    expect(sanitizeInput('  Hello World  ')).toBe('Hello World');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeInput(null)).toBe('');
    expect(sanitizeInput(undefined)).toBe('');
  });
});

describe('sanitizeVIN', () => {
  it('should convert to uppercase', () => {
    expect(sanitizeVIN('abc123')).toBe('ABC123');
  });

  it('should remove invalid VIN characters (I, O, Q)', () => {
    expect(sanitizeVIN('ABCIOOQ123')).toBe('ABC123');
  });

  it('should remove spaces and special characters', () => {
    expect(sanitizeVIN('ABC-123 456')).toBe('ABC123456');
  });

  it('should limit to 17 characters', () => {
    expect(sanitizeVIN('ABCDEFGHJ123456789999')).toBe('ABCDEFGHJ12345678');
  });

  it('should handle complete VIN', () => {
    expect(sanitizeVIN('1HGCM82633A123456')).toBe('1HGCM82633A123456');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeVIN(null)).toBe('');
    expect(sanitizeVIN(undefined)).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('should convert to lowercase', () => {
    expect(sanitizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
  });

  it('should remove whitespace', () => {
    expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeEmail(null)).toBe('');
    expect(sanitizeEmail(undefined)).toBe('');
  });
});

describe('sanitizePhone', () => {
  it('should preserve valid phone characters', () => {
    expect(sanitizePhone('+1-555-0123')).toBe('+1-555-0123');
    expect(sanitizePhone('(555) 012-3456')).toBe('(555) 012-3456');
  });

  it('should remove letters', () => {
    expect(sanitizePhone('555-HOME')).toBe('555-');
  });

  it('should handle null/undefined', () => {
    expect(sanitizePhone(null)).toBe('');
    expect(sanitizePhone(undefined)).toBe('');
  });
});

describe('sanitizeStockNumber', () => {
  it('should convert to uppercase', () => {
    expect(sanitizeStockNumber('b36054')).toBe('B36054');
  });

  it('should preserve dash and underscore', () => {
    expect(sanitizeStockNumber('B360-54_A')).toBe('B360-54_A');
  });

  it('should remove special characters', () => {
    expect(sanitizeStockNumber('B360@54#')).toBe('B36054');
  });

  it('should handle null/undefined', () => {
    expect(sanitizeStockNumber(null)).toBe('');
    expect(sanitizeStockNumber(undefined)).toBe('');
  });
});

describe('sanitizeNotes', () => {
  it('should preserve line breaks and formatting', () => {
    const notes = 'Line 1\nLine 2\n\nLine 3';
    expect(sanitizeNotes(notes)).toBe(notes);
  });

  it('should remove script tags', () => {
    expect(sanitizeNotes('Note <script>alert()</script> here'))
      .toBe('Note  here');
  });

  it('should preserve punctuation', () => {
    const notes = 'Please check: tire pressure (40 PSI), oil level, & brake fluid!';
    expect(sanitizeNotes(notes)).toBe(notes);
  });

  it('should handle null/undefined', () => {
    expect(sanitizeNotes(null)).toBe('');
    expect(sanitizeNotes(undefined)).toBe('');
  });
});

describe('sanitizeOrderForm', () => {
  it('should sanitize all relevant fields', () => {
    const formData = {
      customerName: '  John Doe  ',
      customerEmail: 'JOHN@EXAMPLE.COM',
      customerPhone: '+1-555-HOME',
      vehicleVin: 'abc123',
      stockNumber: 'b36054',
      notes: '<script>alert()</script>Notes',
      internalNotes: 'Internal notes'
    };

    const sanitized = sanitizeOrderForm(formData);

    expect(sanitized.customerName).toBe('John Doe');
    expect(sanitized.customerEmail).toBe('john@example.com');
    expect(sanitized.customerPhone).toBe('+1-555-');
    expect(sanitized.vehicleVin).toBe('ABC123');
    expect(sanitized.stockNumber).toBe('B36054');
    expect(sanitized.notes).toBe('Notes');
    expect(sanitized.internalNotes).toBe('Internal notes');
  });

  it('should preserve other form fields', () => {
    const formData = {
      customerName: 'John',
      vehicleVin: 'ABC123',
      orderType: 'sales',
      dueDate: new Date()
    };

    const sanitized = sanitizeOrderForm(formData);

    expect(sanitized.orderType).toBe('sales');
    expect(sanitized.dueDate).toBeDefined();
  });

  it('should handle empty form data', () => {
    const sanitized = sanitizeOrderForm({});

    expect(sanitized.customerName).toBe('');
    expect(sanitized.customerEmail).toBe('');
    expect(sanitized.vehicleVin).toBe('');
  });
});

describe('containsDangerousContent', () => {
  it('should detect script tags', () => {
    expect(containsDangerousContent('<script>alert()</script>')).toBe(true);
    expect(containsDangerousContent('<SCRIPT>alert()</SCRIPT>')).toBe(true);
  });

  it('should detect iframe tags', () => {
    expect(containsDangerousContent('<iframe src="evil"></iframe>')).toBe(true);
  });

  it('should detect javascript: protocol', () => {
    expect(containsDangerousContent('javascript:alert()')).toBe(true);
    expect(containsDangerousContent('JAVASCRIPT:alert()')).toBe(true);
  });

  it('should detect inline event handlers', () => {
    expect(containsDangerousContent('onclick=alert()')).toBe(true);
    expect(containsDangerousContent('onerror=alert()')).toBe(true);
  });

  it('should return false for safe content', () => {
    expect(containsDangerousContent('John Doe')).toBe(false);
    expect(containsDangerousContent('Safe <div>content</div>')).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(containsDangerousContent(null)).toBe(false);
    expect(containsDangerousContent(undefined)).toBe(false);
  });
});
