/**
 * SMS Notification Types
 * Type definitions for granular SMS notification system
 */

import type { AppModule } from '@/hooks/usePermissions';

// =====================================================
// SMS Event Types
// =====================================================

export type OrderSMSEvent =
  | 'order_created'
  | 'order_assigned'
  | 'status_changed'
  | 'field_updated'
  | 'comment_added'
  | 'attachment_added'
  | 'follower_added'
  | 'due_date_approaching'
  | 'overdue'
  | 'priority_changed';

// =====================================================
// Event Preferences Structure
// =====================================================

export interface StatusChangedPreference {
  enabled: boolean;
  statuses: string[]; // ['pending', 'in_progress', 'completed', etc.]
}

export interface FieldUpdatedPreference {
  enabled: boolean;
  fields: string[]; // ['vehicle_vin', 'stock_number', 'due_date', etc.]
}

export interface DueDateApproachingPreference {
  enabled: boolean;
  minutes_before: number; // 15, 30, 60, 120
}

export interface SMSEventPreferences {
  order_created: boolean;
  order_assigned: boolean;
  status_changed: StatusChangedPreference;
  field_updated: FieldUpdatedPreference;
  comment_added: boolean;
  attachment_added: boolean;
  follower_added: boolean;
  due_date_approaching: DueDateApproachingPreference;
  overdue: boolean;
  priority_changed: boolean;
}

// =====================================================
// User SMS Preferences
// =====================================================

export interface UserSMSNotificationPreferences {
  id: string;
  user_id: string;
  dealer_id: number;
  module: AppModule;

  // Global settings
  sms_enabled: boolean;
  phone_number?: string | null;

  // Event preferences
  event_preferences: SMSEventPreferences;

  // Rate limiting
  max_sms_per_hour: number;
  max_sms_per_day: number;

  // Quiet hours
  quiet_hours_enabled: boolean;
  quiet_hours_start: string; // HH:MM format
  quiet_hours_end: string;   // HH:MM format

  created_at: string;
  updated_at: string;
}

// =====================================================
// SMS Send History
// =====================================================

export interface SMSSendHistory {
  id: string;
  user_id: string;
  dealer_id: number;
  module: AppModule;
  event_type: OrderSMSEvent;
  entity_id?: string | null; // order ID
  phone_number: string;
  message_content: string;
  twilio_sid?: string | null;
  status: 'sent' | 'delivered' | 'failed' | 'undelivered';
  error_message?: string | null;
  sent_at: string;
  cost_cents?: number | null;
  sent_hour: string; // Generated column
  sent_day: string;  // Generated column
}

// =====================================================
// SMS Notification Request
// =====================================================

export interface SMSNotificationRequest {
  orderId: string;
  dealerId: number;
  module: AppModule;
  eventType: OrderSMSEvent;
  eventData: SMSEventData;
  triggeredBy?: string; // User ID who triggered the event
}

export interface SMSEventData {
  // General order data
  orderNumber: string;
  customerName?: string;
  vehicleInfo?: string;
  shortLink?: string; // mda.to link

  // For status_changed
  newStatus?: string;
  oldStatus?: string;

  // For field_updated
  fieldName?: string;
  oldValue?: string;
  newValue?: string;

  // For order_assigned
  assignedToUserId?: string;
  assignedToName?: string;

  // For comment_added
  commentText?: string;
  commenterName?: string;

  // For due_date_approaching
  minutesUntilDue?: number;
  dueDateTime?: string;

  // For priority_changed
  newPriority?: string;
  oldPriority?: string;
}

// =====================================================
// SMS Recipient
// =====================================================

export interface SMSRecipient {
  id: string;
  name: string;
  phone_number: string;
  role_name?: string;
}

// =====================================================
// SMS Send Result
// =====================================================

export interface SMSSendResult {
  success: boolean;
  sent: number;
  failed: number;
  recipients: Array<{
    user_id: string;
    phone_number: string;
    status: 'sent' | 'failed';
    error?: string;
    twilio_sid?: string;
  }>;
}

// =====================================================
// SMS Analytics
// =====================================================

export interface SMSAnalytics {
  dealer_id: number;
  module: AppModule;
  event_type: OrderSMSEvent;
  sent_date: string;
  total_sent: number;
  delivered: number;
  failed: number;
  total_cost_cents: number;
  avg_cost_cents: number;
}

// =====================================================
// SMS Rate Limit Check
// =====================================================

export interface SMSRateLimitCheck {
  user_id: string;
  dealer_id: number;
  hourly_count: number;
  daily_count: number;
  max_per_hour: number;
  max_per_day: number;
  can_send: boolean;
  reason?: string;
}

// =====================================================
// SMS Template Variables
// =====================================================

export interface SMSTemplateVariables {
  orderNumber: string;
  customerName?: string;
  vehicleInfo?: string;
  status?: string;
  shortLink?: string;
  assignedToName?: string;
  commenterName?: string;
  commentPreview?: string;
  minutesUntilDue?: number;
  priority?: string;
  fieldName?: string;
  [key: string]: string | number | undefined;
}

// =====================================================
// Helper Types
// =====================================================

// For UI components - simpler structure
export interface ModuleSMSSettings {
  module: AppModule;
  enabled: boolean;
  preferences: Partial<SMSEventPreferences>;
}

// For form state in UI
export interface SMSPreferencesFormData {
  phone_number: string;
  modules: Record<AppModule, ModuleSMSSettings>;
  max_sms_per_hour: number;
  max_sms_per_day: number;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
}

// Default event preferences for new users
export const DEFAULT_SMS_EVENT_PREFERENCES: SMSEventPreferences = {
  order_created: false,
  order_assigned: true,
  status_changed: {
    enabled: true,
    statuses: ['in_progress', 'completed']
  },
  field_updated: {
    enabled: false,
    fields: []
  },
  comment_added: false,
  attachment_added: false,
  follower_added: false,
  due_date_approaching: {
    enabled: true,
    minutes_before: 30
  },
  overdue: true,
  priority_changed: true
};

// Available order statuses for filtering
export const ORDER_STATUSES = [
  'draft',
  'pending',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
] as const;

// Available fields for field_updated event
export const WATCHABLE_ORDER_FIELDS = [
  'vehicle_vin',
  'vehicle_info',
  'stock_number',
  'due_date',
  'priority',
  'customer_name',
  'customer_phone',
  'assigned_to'
] as const;

// Minutes before due date options
export const DUE_DATE_REMINDER_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' }
] as const;
