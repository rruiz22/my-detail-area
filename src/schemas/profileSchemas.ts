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
      (val) => {
        if (!val || val.length === 0) return true;
        // Extract only digits
        const digits = val.replace(/\D/g, '');
        // Must be exactly 10 digits for US phone numbers
        return digits.length === 10;
      },
      'Phone number must be exactly 10 digits'
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
 * Phone number formatter - US Format Only
 * Formats phone numbers as user types: (555) 123-4567
 * Only accepts 10 digits (US phone numbers)
 * The system will automatically add +1 when saving
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-numeric characters
  const numbers = value.replace(/\D/g, '');

  // Limit to 10 digits
  const limited = numbers.slice(0, 10);

  // Format based on length: (555) 123-4567
  if (limited.length === 0) {
    return '';
  } else if (limited.length <= 3) {
    return `(${limited}`;
  } else if (limited.length <= 6) {
    return `(${limited.slice(0, 3)}) ${limited.slice(3)}`;
  } else {
    return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`;
  }
}

/**
 * Convert formatted phone to E.164 format with +1
 * Example: (555) 123-4567 → +15551234567
 */
export function phoneToE164(formattedPhone: string): string {
  if (!formattedPhone) return '';

  // Extract only digits
  const digits = formattedPhone.replace(/\D/g, '');

  // Must be exactly 10 digits for US numbers
  if (digits.length !== 10) return formattedPhone; // Return as-is if invalid

  // Add +1 prefix
  return `+1${digits}`;
}

/**
 * Convert E.164 format to formatted display
 * Example: +15551234567 → (555) 123-4567
 */
export function phoneFromE164(e164Phone: string): string {
  if (!e164Phone) return '';

  // Remove +1 prefix if present
  const cleaned = e164Phone.replace(/^\+1/, '');
  const digits = cleaned.replace(/\D/g, '');

  // Format for display
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return e164Phone; // Return as-is if not valid format
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
