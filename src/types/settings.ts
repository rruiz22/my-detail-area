/**
 * TypeScript Types for Enterprise Settings Hub
 * Generated from database schema: 20251025144510_enterprise_settings_hub.sql
 *
 * Tables:
 * - dealer_integrations
 * - security_audit_log
 * - notification_templates
 * - platform_settings
 */

// ============================================================================
// ENUMS
// ============================================================================

export type IntegrationType = 'slack' | 'webhook' | 'zapier' | 'email' | 'sms';

export type SecurityEventType =
  | 'login'
  | 'logout'
  | 'password_change'
  | 'mfa_enabled'
  | 'settings_change'
  | 'integration_created'
  | 'integration_updated'
  | 'integration_deleted'
  | 'integration_test'
  | 'permission_grant'
  | 'permission_revoke'
  | 'data_export'
  | 'api_key_created'
  | 'user_invited'
  | 'user_removed';

export type SecurityEventCategory =
  | 'auth'
  | 'settings'
  | 'permissions'
  | 'data'
  | 'integration'
  | 'system';

export type SecuritySeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'slack';

export type Language = 'en' | 'es' | 'pt-BR';

export type SettingType = 'general' | 'regional' | 'business' | 'appearance' | 'integrations';

// ============================================================================
// DEALER INTEGRATIONS
// ============================================================================

export interface DealerIntegration {
  id: string;
  dealer_id: number;
  integration_type: IntegrationType;
  config: IntegrationConfig;
  credentials_encrypted: boolean;
  encryption_key_id?: string | null;
  enabled: boolean;
  last_test_at?: string | null;
  last_test_result?: IntegrationTestResult | null;
  test_attempts: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface IntegrationConfig {
  // Slack
  workspace_url?: string;
  bot_token?: string;
  channels?: Record<string, string>; // {orders: 'C01234567', alerts: 'C09876543'}
  notify_on?: string[]; // ['order_created', 'order_completed']

  // Webhook
  webhook_url?: string;
  webhook_secret?: string;
  headers?: Record<string, string>;
  events?: string[];

  // Zapier
  zap_id?: string;
  api_key?: string;

  // Email
  smtp_host?: string;
  smtp_port?: number;
  smtp_username?: string;
  smtp_password?: string;
  from_email?: string;

  // SMS
  provider?: 'twilio' | 'vonage' | 'aws_sns';
  account_sid?: string;
  auth_token?: string;
  from_number?: string;

  // Generic
  [key: string]: any;
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  timestamp: string;
  error_code?: string;
  details?: Record<string, any>;
}

export interface CreateIntegrationInput {
  dealer_id: number;
  integration_type: IntegrationType;
  config: IntegrationConfig;
  enabled?: boolean;
}

export interface UpdateIntegrationInput {
  config?: IntegrationConfig;
  enabled?: boolean;
  encryption_key_id?: string;
}

// ============================================================================
// SECURITY AUDIT LOG
// ============================================================================

export interface SecurityAuditLog {
  id: string;
  event_type: SecurityEventType;
  event_category: SecurityEventCategory;
  severity: SecuritySeverity;
  user_id?: string | null;
  target_user_id?: string | null;
  dealer_id?: number | null;
  ip_address?: string | null;
  user_agent?: string | null;
  request_path?: string | null;
  request_method?: string | null;
  metadata: SecurityEventMetadata;
  success: boolean;
  error_message?: string | null;
  error_code?: string | null;
  created_at: string;
}

export interface SecurityEventMetadata {
  // Settings changes
  setting_key?: string;
  old_value?: any;
  new_value?: any;
  changes?: Record<string, { from: any; to: any }>;

  // Integration events
  integration_type?: IntegrationType;
  integration_id?: string;
  test_result?: IntegrationTestResult;

  // Permission events
  permission_granted?: string;
  permission_revoked?: string;
  role_changed?: { from: string; to: string };

  // Auth events
  reason?: string;
  attempts?: number;
  mfa_method?: string;

  // Data export
  export_type?: string;
  record_count?: number;
  file_size?: number;

  // Generic
  [key: string]: any;
}

export interface CreateAuditLogInput {
  event_type: SecurityEventType;
  event_category: SecurityEventCategory;
  severity?: SecuritySeverity;
  target_user_id?: string;
  dealer_id?: number;
  metadata?: SecurityEventMetadata;
  success?: boolean;
  error_message?: string;
}

export interface SecurityAuditFilters {
  event_type?: SecurityEventType;
  event_category?: SecurityEventCategory;
  severity?: SecuritySeverity;
  user_id?: string;
  dealer_id?: number;
  start_date?: Date;
  end_date?: Date;
  success?: boolean;
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

export interface NotificationTemplate {
  id: string;
  template_key: string;
  template_name: string;
  description?: string | null;
  dealer_id?: number | null;
  is_global: boolean;
  language: Language;
  channel_type: NotificationChannel;
  subject?: string | null;
  body: string;
  html_body?: string | null;
  variables: TemplateVariable[];
  preview_data: Record<string, any>;
  enabled: boolean;
  version: number;
  is_default: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  required: boolean;
  description?: string;
  default?: any;
}

export interface CreateTemplateInput {
  template_key: string;
  template_name: string;
  description?: string;
  dealer_id?: number;
  is_global?: boolean;
  language: Language;
  channel_type: NotificationChannel;
  subject?: string;
  body: string;
  html_body?: string;
  variables?: TemplateVariable[];
  preview_data?: Record<string, any>;
  enabled?: boolean;
}

export interface UpdateTemplateInput {
  template_name?: string;
  description?: string;
  subject?: string;
  body?: string;
  html_body?: string;
  variables?: TemplateVariable[];
  preview_data?: Record<string, any>;
  enabled?: boolean;
  version?: number;
}

export interface TemplateRenderContext {
  template_key: string;
  language: Language;
  channel_type: NotificationChannel;
  dealer_id?: number;
  variables: Record<string, any>;
}

// ============================================================================
// PLATFORM SETTINGS
// ============================================================================

export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any; // JSON value
  setting_type: SettingType;
  description?: string | null;
  is_public: boolean;
  requires_restart: boolean;
  validation_schema?: ValidationSchema | null;
  allowed_values?: any[] | null;
  updated_by?: string | null;
  updated_at: string;
  created_at: string;
}

export interface ValidationSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  min?: number;
  max?: number;
  pattern?: string;
  enum?: any[];
  properties?: Record<string, ValidationSchema>;
  required?: string[];
  [key: string]: any; // JSON Schema extensions
}

export interface UpdateSettingInput {
  setting_value: any;
}

// ============================================================================
// SPECIFIC PLATFORM SETTINGS (TYPE-SAFE)
// ============================================================================

export interface PlatformSettingsMap {
  // Regional
  default_timezone: string;
  default_date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'DD.MM.YYYY';
  default_time_format: '12h' | '24h';
  default_currency: 'USD' | 'CAD' | 'MXN' | 'EUR' | 'GBP';
  default_language: Language;

  // Business
  business_name: string;
  support_email: string;
  max_file_upload_mb: number;
  session_timeout_minutes: number;
}

export type PlatformSettingKey = keyof PlatformSettingsMap;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface IntegrationTestResponse {
  success: boolean;
  message: string;
  timestamp: string;
  integration_type: IntegrationType;
  error_code?: string;
  details?: Record<string, any>;
}

export interface AuditLogResponse {
  logs: SecurityAuditLog[];
  total: number;
  page: number;
  page_size: number;
}

export interface TemplatePreviewResponse {
  rendered_subject?: string;
  rendered_body: string;
  rendered_html_body?: string;
  missing_variables: string[];
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface IntegrationHealth {
  integration_id: string;
  integration_type: IntegrationType;
  enabled: boolean;
  last_test_at?: string;
  last_test_success?: boolean;
  test_attempts: number;
  health_status: 'healthy' | 'warning' | 'error' | 'untested';
}

export interface SecurityDashboardStats {
  total_events: number;
  events_today: number;
  critical_events: number;
  failed_logins: number;
  recent_events: SecurityAuditLog[];
}

export interface TemplateStats {
  total_templates: number;
  global_templates: number;
  dealer_templates: number;
  enabled_templates: number;
  languages: Language[];
  channels: NotificationChannel[];
}

// ============================================================================
// FORM TYPES
// ============================================================================

export interface SlackIntegrationForm {
  workspace_url: string;
  bot_token: string;
  channels: {
    orders?: string;
    alerts?: string;
    general?: string;
  };
  notify_on: string[];
  enabled: boolean;
}

export interface WebhookIntegrationForm {
  webhook_url: string;
  webhook_secret?: string;
  headers?: Record<string, string>;
  events: string[];
  enabled: boolean;
}

export interface EmailIntegrationForm {
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  from_email: string;
  use_tls: boolean;
  enabled: boolean;
}

export interface SMSIntegrationForm {
  provider: 'twilio' | 'vonage' | 'aws_sns';
  account_sid: string;
  auth_token: string;
  from_number: string;
  enabled: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type IntegrationFormData<T extends IntegrationType> = T extends 'slack'
  ? SlackIntegrationForm
  : T extends 'webhook'
  ? WebhookIntegrationForm
  : T extends 'email'
  ? EmailIntegrationForm
  : T extends 'sms'
  ? SMSIntegrationForm
  : Record<string, any>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
