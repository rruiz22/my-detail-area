import { z } from 'zod';

/**
 * Profile Form Validation Schemas
 *
 * Enterprise-grade validation using Zod for all profile forms
 * Provides type-safe validation with custom error messages
 */

// Phone number regex - supports international formats
const phoneRegex = /^[\d\s\+\-\(\)]+$/;

/**
 * Personal Information Schema
 * Validates: first_name, last_name, phone, bio, job_title, department
 */
export const personalInformationSchema = z.object({
  first_name: z
    .string()
    .min(1, 'First name is required')
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes'),

  last_name: z
    .string()
    .min(1, 'Last name is required')
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes'),

  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.length === 0 || (val.length >= 10 && phoneRegex.test(val)),
      'Phone number must be at least 10 digits and contain only numbers, spaces, +, -, (, )'
    ),

  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),

  job_title: z
    .string()
    .max(100, 'Job title must be less than 100 characters')
    .optional(),

  department: z
    .string()
    .max(100, 'Department must be less than 100 characters')
    .optional(),
});

/**
 * Preferences Schema
 * Validates: language, timezone, date_format, time_format, notification preferences
 */
export const preferencesSchema = z.object({
  language: z
    .enum(['en', 'es', 'pt-BR'], {
      errorMap: () => ({ message: 'Please select a valid language' })
    })
    .optional(),

  timezone: z
    .string()
    .optional(),

  date_format: z
    .enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'], {
      errorMap: () => ({ message: 'Please select a valid date format' })
    })
    .optional(),

  time_format: z
    .enum(['12h', '24h'], {
      errorMap: () => ({ message: 'Please select a valid time format' })
    })
    .optional(),

  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
  sms_notifications: z.boolean().optional(),
});

/**
 * Password Change Schema
 * Validates: current password, new password, confirm password
 * Enforces password strength requirements
 */
export const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Current password is required'),

    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),

    confirmPassword: z
      .string()
      .min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ['newPassword'],
  });

/**
 * Email Update Schema
 * Validates email format
 */
export const emailUpdateSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters'),
});

// Type exports for TypeScript
export type PersonalInformationInput = z.infer<typeof personalInformationSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type EmailUpdateInput = z.infer<typeof emailUpdateSchema>;

/**
 * Utility function to format Zod errors for display
 */
export function formatZodError(error: z.ZodError): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    formattedErrors[path] = err.message;
  });

  return formattedErrors;
}

/**
 * Phone number formatter
 * Formats phone numbers as user types
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters except + at the start
  const cleaned = value.replace(/[^\d+]/g, '');

  // If it starts with +, keep it
  const hasPlus = cleaned.startsWith('+');
  const numbers = cleaned.replace(/\+/g, '');

  // Format based on length (US format example)
  if (numbers.length <= 3) {
    return hasPlus ? `+${numbers}` : numbers;
  } else if (numbers.length <= 6) {
    return hasPlus
      ? `+${numbers.slice(0, 3)} ${numbers.slice(3)}`
      : `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
  } else if (numbers.length <= 10) {
    return hasPlus
      ? `+${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6)}`
      : `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  } else {
    // International format
    return hasPlus
      ? `+${numbers.slice(0, 3)} ${numbers.slice(3, 6)} ${numbers.slice(6, 10)}`
      : `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  }
}

/**
 * Validation helper - validates a single field
 */
export function validateField<T extends z.ZodSchema>(
  schema: T,
  fieldName: string,
  value: any
): string | null {
  try {
    schema.parse({ [fieldName]: value });
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = error.errors.find((err) => err.path[0] === fieldName);
      return fieldError?.message || null;
    }
    return null;
  }
}
