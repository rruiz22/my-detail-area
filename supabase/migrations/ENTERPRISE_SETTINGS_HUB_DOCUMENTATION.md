# Enterprise Settings Hub - Database Migration Documentation

**Migration File:** `20251025144510_enterprise_settings_hub.sql`
**Created:** October 25, 2025
**Version:** 1.0.0
**Status:** Ready for Production

---

## Overview

This migration creates a comprehensive database schema for the **MyDetailArea Settings Hub** enterprise feature, including third-party integrations, security audit logging, notification template management, and platform-wide configuration.

### What's Included

1. **dealer_integrations** - Third-party integration configurations (Slack, webhooks, Zapier)
2. **security_audit_log** - Immutable audit trail for security events
3. **notification_templates** - Multi-channel, multi-language notification templates
4. **platform_settings** - Platform-wide configuration (timezone, currency, date format)
5. **Helper Functions** - Integration testing and audit logging utilities
6. **RLS Policies** - Enterprise-grade row-level security
7. **Seed Data** - Initial configuration and default templates

---

## Table Schemas

### 1. dealer_integrations

**Purpose:** Store third-party integration configurations per dealership

**Key Features:**
- Multi-dealership support with isolated configs
- Encrypted credentials storage (with `credentials_encrypted` flag)
- Version tracking and audit trail (`created_by`, `updated_by`)
- Soft deletes (`deleted_at`)
- Integration health monitoring (`last_test_at`, `last_test_result`)

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `dealer_id` | BIGINT | Foreign key to dealerships |
| `integration_type` | VARCHAR(50) | Type: 'slack', 'webhook', 'zapier', 'email', 'sms' |
| `config` | JSONB | Integration-specific config (workspace_url, bot_token, etc.) |
| `credentials_encrypted` | BOOLEAN | Whether credentials in config are encrypted |
| `encryption_key_id` | VARCHAR(100) | Reference to external key management system |
| `enabled` | BOOLEAN | Is integration active? |
| `last_test_at` | TIMESTAMPTZ | Last test execution timestamp |
| `last_test_result` | JSONB | Test result: `{success, message, timestamp, error_code}` |
| `test_attempts` | INTEGER | Number of test attempts |
| `created_by` | UUID | User who created the integration |
| `updated_by` | UUID | User who last updated |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `deleted_at` | TIMESTAMPTZ | Soft delete timestamp |

**Indexes:**
- `idx_dealer_integrations_dealer_type` - Lookup by dealer + type + enabled
- `idx_dealer_integrations_updated` - Audit queries by update time
- `idx_dealer_integrations_last_test` - Integration health monitoring

**RLS Policies:**
- **SELECT**: `dealer_admin` and `dealer_manager` can view their dealership integrations; `system_admin` sees all
- **INSERT**: `dealer_admin` and `dealer_manager` can create integrations for their dealership
- **UPDATE**: `dealer_admin` and `dealer_manager` can update their dealership integrations
- **DELETE**: Only `dealer_admin` can soft delete integrations

**Constraints:**
- `UNIQUE(dealer_id, integration_type)` - One integration per type per dealership

**Example Config (Slack):**
```json
{
  "workspace_url": "https://myworkspace.slack.com",
  "bot_token": "xoxb-encrypted-token-here",
  "channels": {
    "orders": "C01234567",
    "alerts": "C09876543"
  },
  "notify_on": ["order_created", "order_completed", "payment_received"]
}
```

---

### 2. security_audit_log

**Purpose:** Immutable audit trail for all security-related events across the platform

**Key Features:**
- **Immutable records** (NO UPDATE or DELETE policies)
- Automatic event logging via triggers
- IP address and user agent tracking
- Fast time-series queries
- Partitioning-ready for long-term retention

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `event_type` | VARCHAR(100) | Specific event: 'login', 'logout', 'settings_change', etc. |
| `event_category` | VARCHAR(50) | Category: 'auth', 'settings', 'permissions', 'data', 'integration', 'system' |
| `severity` | VARCHAR(20) | Severity: 'debug', 'info', 'warning', 'error', 'critical' |
| `user_id` | UUID | User performing the action |
| `target_user_id` | UUID | User affected by action (for permission changes) |
| `dealer_id` | BIGINT | Dealership context |
| `ip_address` | INET | Request IP address |
| `user_agent` | TEXT | Browser/client user agent |
| `request_path` | TEXT | API endpoint path |
| `request_method` | VARCHAR(10) | HTTP method |
| `metadata` | JSONB | Event-specific data: `{old_value, new_value, changes: {...}}` |
| `success` | BOOLEAN | Did the action succeed? |
| `error_message` | TEXT | Error message if failed |
| `error_code` | VARCHAR(50) | Error code for categorization |
| `created_at` | TIMESTAMPTZ | Event timestamp (immutable) |

**Indexes:**
- `idx_security_audit_created_at` - Time-series queries (most important)
- `idx_security_audit_user_created` - User activity timeline
- `idx_security_audit_event_type_created` - Event type analysis
- `idx_security_audit_dealer_created` - Dealership audit reports
- `idx_security_audit_severity_created` - Error and critical event monitoring
- `idx_security_audit_category` - Category-based filtering

**RLS Policies:**
- **SELECT**: `system_admin` sees all; `dealer_admin` sees their dealership logs; users see their own events
- **INSERT**: All authenticated users can create audit entries (typically via triggers)
- **NO UPDATE** - Immutable audit log
- **NO DELETE** - Use retention policies instead

**Event Types:**

| Event Type | Category | Description |
|------------|----------|-------------|
| `login` | auth | User login attempt |
| `logout` | auth | User logout |
| `password_change` | auth | Password changed |
| `mfa_enabled` | auth | Multi-factor auth enabled |
| `settings_change` | settings | Platform/dealer settings modified |
| `integration_created` | integration | New integration configured |
| `integration_test` | integration | Integration test performed |
| `permission_grant` | permissions | Permission granted to user |
| `permission_revoke` | permissions | Permission revoked |
| `data_export` | data | Data exported (reports, etc.) |
| `api_key_created` | system | API key generated |

**Example Metadata:**
```json
{
  "setting_key": "slack_integration",
  "old_value": {"enabled": false},
  "new_value": {"enabled": true, "channels": ["orders"]},
  "integration_type": "slack",
  "changes": {
    "enabled": {"from": false, "to": true}
  }
}
```

---

### 3. notification_templates

**Purpose:** Store customizable notification templates for multi-channel delivery

**Key Features:**
- Multi-language support (EN, ES, PT-BR)
- Template versioning
- Variable interpolation support (`{{variable_name}}`)
- Global templates or per-dealership customization
- Preview data for testing

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `template_key` | VARCHAR(100) | Unique template identifier (e.g., 'order_created') |
| `template_name` | TEXT | Human-readable template name |
| `description` | TEXT | Template description |
| `dealer_id` | BIGINT | Dealership ID (NULL for global templates) |
| `is_global` | BOOLEAN | Is this a global template? |
| `language` | VARCHAR(10) | Language: 'en', 'es', 'pt-BR' |
| `channel_type` | VARCHAR(50) | Channel: 'email', 'sms', 'push', 'in_app', 'slack' |
| `subject` | TEXT | Email/push notification subject |
| `body` | TEXT | Plain text template body |
| `html_body` | TEXT | HTML template body (for emails) |
| `variables` | JSONB | Array of available variables: `[{name, type, required}]` |
| `preview_data` | JSONB | Sample data for preview: `{customer_name: "John Doe"}` |
| `enabled` | BOOLEAN | Is template active? |
| `version` | INTEGER | Template version number |
| `is_default` | BOOLEAN | Default template for this key + language + channel |
| `created_by` | UUID | User who created template |
| `updated_by` | UUID | User who last updated |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

**Indexes:**
- `idx_notification_templates_dealer` - Dealership template lookup
- `idx_notification_templates_key_language` - Template resolution
- `idx_notification_templates_global` - Global template queries
- `idx_notification_templates_default` - Default template selection

**RLS Policies:**
- **SELECT**: Global templates visible to all; dealership templates visible to members; `system_admin` sees all
- **INSERT**: `system_admin` creates global templates; `dealer_admin` creates dealership templates
- **UPDATE**: `system_admin` updates global; `dealer_admin` updates their templates
- **DELETE**: Same as UPDATE

**Constraints:**
- `UNIQUE(template_key, language, channel_type, dealer_id)` - One template per key/language/channel/dealer
- `CHECK`: `(is_global = true AND dealer_id IS NULL) OR (is_global = false AND dealer_id IS NOT NULL)`

**Template Variables Example:**
```json
[
  {"name": "customer_name", "type": "string", "required": true},
  {"name": "order_number", "type": "string", "required": true},
  {"name": "vehicle_year", "type": "number", "required": false},
  {"name": "vehicle_make", "type": "string", "required": false}
]
```

**Template Body Example:**
```
Hello {{customer_name}},

Your order {{order_number}} has been successfully created.

Order Type: {{order_type}}
Vehicle: {{vehicle_year}} {{vehicle_make}} {{vehicle_model}}

Thank you for choosing {{dealership_name}}!
```

**Supported Channels:**
- **email** - Full HTML and plain text support
- **sms** - Short messages (160 chars recommended)
- **push** - Mobile push notifications with subject + body
- **in_app** - In-app notification center
- **slack** - Slack channel messages with markdown formatting

---

### 4. platform_settings

**Purpose:** Platform-wide configuration settings (timezone, currency, date format, etc.)

**Key Features:**
- Typed configuration with validation
- Public vs private settings
- Restart requirement flag
- JSON schema validation support
- Enum-type allowed values

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `setting_key` | VARCHAR(100) | Unique setting identifier |
| `setting_value` | JSONB | Setting value (any JSON type) |
| `setting_type` | VARCHAR(50) | Type: 'general', 'regional', 'business', 'appearance', 'integrations' |
| `description` | TEXT | Setting description |
| `is_public` | BOOLEAN | Visible to non-admin users? |
| `requires_restart` | BOOLEAN | Requires app restart after change? |
| `validation_schema` | JSONB | JSON Schema for validation |
| `allowed_values` | JSONB | Array of allowed values (for enums) |
| `updated_by` | UUID | User who last updated |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

**Indexes:**
- `idx_platform_settings_type` - Settings by type
- `idx_platform_settings_public` - Public settings lookup
- `idx_platform_settings_updated` - Audit queries

**RLS Policies:**
- **SELECT**: Public settings visible to all authenticated users; private settings only to `system_admin`
- **INSERT/UPDATE/DELETE**: Only `system_admin`

**Constraints:**
- `UNIQUE(setting_key)` - One value per setting

**Seeded Settings:**

| Setting Key | Type | Value | Public | Description |
|-------------|------|-------|--------|-------------|
| `default_timezone` | regional | "America/New_York" | Yes | Default platform timezone |
| `default_date_format` | regional | "MM/DD/YYYY" | Yes | Date display format |
| `default_time_format` | regional | "12h" | Yes | Time format (12h/24h) |
| `default_currency` | regional | "USD" | Yes | Default currency |
| `default_language` | regional | "en" | Yes | Default language |
| `business_name` | business | "My Detail Area" | Yes | Platform name |
| `support_email` | business | "support@mydetailarea.com" | Yes | Support email |
| `max_file_upload_mb` | business | 10 | No | Max file size |
| `session_timeout_minutes` | business | 480 | No | Session timeout (8 hours) |

**Allowed Values Example:**
```json
{
  "default_timezone": [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Phoenix"
  ]
}
```

---

## Helper Functions

### log_security_event()

**Purpose:** Create security audit log entries with proper context

**Signature:**
```sql
public.log_security_event(
    p_event_type VARCHAR,
    p_event_category VARCHAR,
    p_severity VARCHAR DEFAULT 'info',
    p_user_id UUID DEFAULT NULL,
    p_target_user_id UUID DEFAULT NULL,
    p_dealer_id BIGINT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_success BOOLEAN DEFAULT true,
    p_error_message TEXT DEFAULT NULL
) RETURNS UUID
```

**Usage Example:**
```sql
-- Log a settings change
SELECT log_security_event(
    'settings_change',
    'settings',
    'info',
    auth.uid(),
    NULL,
    123,
    '{"setting_key": "slack_enabled", "old_value": false, "new_value": true}'::jsonb,
    true
);

-- Log a failed login
SELECT log_security_event(
    'login',
    'auth',
    'warning',
    user_id,
    NULL,
    NULL,
    '{"reason": "invalid_password", "attempts": 3}'::jsonb,
    false,
    'Invalid password'
);
```

### test_dealer_integration()

**Purpose:** Test a dealer integration configuration and update test results

**Signature:**
```sql
public.test_dealer_integration(p_integration_id UUID) RETURNS JSONB
```

**Returns:**
```json
{
  "success": true,
  "message": "Integration test successful",
  "timestamp": "2025-10-25T14:45:10Z",
  "integration_type": "slack"
}
```

**Usage Example:**
```sql
-- Test Slack integration
SELECT test_dealer_integration('550e8400-e29b-41d4-a716-446655440000');
```

**Side Effects:**
- Updates `test_attempts` counter
- Sets `last_test_at` timestamp
- Stores test result in `last_test_result`
- Creates audit log entry

---

## Seed Data

### Platform Settings (9 entries)

**Regional Settings:**
- `default_timezone` → "America/New_York"
- `default_date_format` → "MM/DD/YYYY"
- `default_time_format` → "12h"
- `default_currency` → "USD"
- `default_language` → "en"

**Business Settings:**
- `business_name` → "My Detail Area"
- `support_email` → "support@mydetailarea.com"
- `max_file_upload_mb` → 10
- `session_timeout_minutes` → 480 (8 hours)

### Notification Templates (5 entries)

**Email Templates (English):**
1. **order_created** - New order notification
2. **order_completed** - Order completion notification
3. **payment_reminder** - Payment due reminder

**Slack Templates (English):**
1. **slack_order_created** - New order alert with markdown formatting
2. **slack_integration_test** - Integration test confirmation message

---

## Security Model

### Row-Level Security (RLS)

All tables have RLS enabled with role-based policies:

**Access Levels:**
- **system_admin**: Full access to all data
- **dealer_admin**: Full access to their dealership data
- **dealer_manager**: Read/write access to integrations and templates
- **dealer_user**: Read-only access to public settings

### Audit Trail

Every table includes:
- `created_by` / `updated_by` columns
- `created_at` / `updated_at` timestamps
- Automatic `updated_at` trigger

Security events automatically logged to `security_audit_log` via triggers and application code.

### Data Encryption

**dealer_integrations** table supports encrypted credentials:
- `credentials_encrypted` flag indicates encryption status
- `encryption_key_id` references external key management (AWS KMS, HashiCorp Vault)
- Application layer responsible for encryption/decryption

---

## Query Performance

### Optimized Indexes

**Time-series queries:**
- All tables indexed by `created_at DESC` or `updated_at DESC`
- Partial indexes with `WHERE deleted_at IS NULL`

**Lookup queries:**
- Composite indexes on common filter combinations
- `dealer_id + type + enabled` for integrations
- `template_key + language + channel_type` for templates

**Audit queries:**
- `(user_id, created_at DESC)` for user activity timelines
- `(event_type, created_at DESC)` for event analysis
- `(severity, created_at DESC)` for error monitoring

### Expected Query Performance

| Query Type | Index Used | Expected Time |
|------------|------------|---------------|
| Get integrations for dealer | `idx_dealer_integrations_dealer_type` | <5ms |
| Recent security events (1 month) | `idx_security_audit_created_at` | <10ms |
| Template lookup by key | `idx_notification_templates_key_language` | <5ms |
| Platform settings (public) | `idx_platform_settings_public` | <5ms |

---

## Migration Execution

### Prerequisites

1. ✅ Existing `system_settings` table (created in previous migration)
2. ✅ `profiles` table with `user_type` column
3. ✅ `dealer_memberships` table with `role` column
4. ✅ `dealerships` table
5. ✅ `public.update_updated_at_column()` function

### Execution Steps

1. **Review the migration:**
   ```bash
   cat supabase/migrations/20251025144510_enterprise_settings_hub.sql
   ```

2. **Run the migration:**
   ```bash
   supabase migration up
   ```

   Or via Supabase Dashboard → Database → Migrations → Upload SQL

3. **Verify tables created:**
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN (
       'dealer_integrations',
       'security_audit_log',
       'notification_templates',
       'platform_settings'
   );
   ```

4. **Verify seed data:**
   ```sql
   SELECT COUNT(*) FROM platform_settings; -- Should be 9
   SELECT COUNT(*) FROM notification_templates; -- Should be 5
   ```

5. **Test RLS policies:**
   ```sql
   -- As system_admin
   SELECT * FROM security_audit_log; -- Should see all

   -- As dealer_admin
   SELECT * FROM dealer_integrations; -- Should see only their dealership
   ```

### Rollback

If you need to rollback this migration:

```bash
psql $DATABASE_URL -f supabase/migrations/20251025144510_enterprise_settings_hub_ROLLBACK.sql
```

**⚠️ WARNING:** Rollback will **DELETE ALL DATA** in these tables!

---

## Usage Examples

### 1. Create Slack Integration

```sql
INSERT INTO dealer_integrations (
    dealer_id,
    integration_type,
    config,
    credentials_encrypted,
    enabled,
    created_by
)
VALUES (
    123, -- dealership ID
    'slack',
    '{
        "workspace_url": "https://myworkspace.slack.com",
        "bot_token": "xoxb-your-encrypted-token",
        "channels": {
            "orders": "C01234567",
            "alerts": "C09876543"
        },
        "notify_on": ["order_created", "order_completed"]
    }'::jsonb,
    true,
    false, -- Start disabled until tested
    auth.uid()
);
```

### 2. Test Integration

```sql
SELECT test_dealer_integration('integration-uuid-here');
```

### 3. Enable Integration After Successful Test

```sql
UPDATE dealer_integrations
SET
    enabled = true,
    updated_by = auth.uid()
WHERE id = 'integration-uuid-here'
AND last_test_result->>'success' = 'true';
```

### 4. Query Recent Security Events

```sql
-- Last 24 hours of security events
SELECT
    event_type,
    event_category,
    severity,
    user_id,
    metadata,
    created_at
FROM security_audit_log
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;
```

### 5. Get Notification Template

```sql
-- Get dealership-specific template (falls back to global)
SELECT *
FROM notification_templates
WHERE template_key = 'order_created'
AND language = 'en'
AND channel_type = 'email'
AND (
    dealer_id = 123
    OR (is_global = true AND NOT EXISTS (
        SELECT 1 FROM notification_templates nt2
        WHERE nt2.template_key = notification_templates.template_key
        AND nt2.language = notification_templates.language
        AND nt2.channel_type = notification_templates.channel_type
        AND nt2.dealer_id = 123
    ))
)
ORDER BY dealer_id NULLS LAST
LIMIT 1;
```

### 6. Render Template with Variables

```typescript
// TypeScript/JavaScript example
function renderTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
}

// Usage
const body = renderTemplate(
  "Hello {{customer_name}}, your order {{order_number}} is ready!",
  { customer_name: "John Doe", order_number: "ORD-12345" }
);
// Output: "Hello John Doe, your order ORD-12345 is ready!"
```

### 7. Update Platform Setting

```sql
-- Update default timezone
UPDATE platform_settings
SET
    setting_value = '"America/Los_Angeles"'::jsonb,
    updated_by = auth.uid()
WHERE setting_key = 'default_timezone';

-- Log the change
SELECT log_security_event(
    'settings_change',
    'settings',
    'info',
    auth.uid(),
    NULL,
    NULL,
    jsonb_build_object(
        'setting_key', 'default_timezone',
        'old_value', 'America/New_York',
        'new_value', 'America/Los_Angeles'
    ),
    true
);
```

---

## Integration with Frontend

### React Hooks Example

```typescript
// hooks/useIntegrations.ts
export function useIntegrations(dealerId: number) {
  return useQuery({
    queryKey: ['integrations', dealerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealer_integrations')
        .select('*')
        .eq('dealer_id', dealerId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    }
  });
}

// hooks/useSecurityAuditLog.ts
export function useSecurityAuditLog(filters?: {
  eventType?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: ['security-audit', filters],
    queryFn: async () => {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }
      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}

// hooks/usePlatformSettings.ts
export function usePlatformSettings() {
  return useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('is_public', true);

      if (error) throw error;

      // Convert to key-value map
      return data.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, any>);
    }
  });
}
```

---

## Monitoring & Maintenance

### Health Checks

```sql
-- Check integration health
SELECT
    di.integration_type,
    di.enabled,
    di.last_test_at,
    di.last_test_result->>'success' as last_test_success,
    di.test_attempts
FROM dealer_integrations di
WHERE di.enabled = true
AND di.deleted_at IS NULL
ORDER BY di.last_test_at ASC NULLS FIRST;
```

### Audit Log Analysis

```sql
-- Failed authentication attempts
SELECT
    user_id,
    COUNT(*) as attempts,
    MAX(created_at) as last_attempt
FROM security_audit_log
WHERE event_type = 'login'
AND success = false
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY user_id
HAVING COUNT(*) >= 3;

-- Recent critical events
SELECT *
FROM security_audit_log
WHERE severity = 'critical'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Performance Monitoring

```sql
-- Slowest queries (requires pg_stat_statements extension)
SELECT
    query,
    calls,
    mean_exec_time,
    total_exec_time
FROM pg_stat_statements
WHERE query LIKE '%dealer_integrations%'
   OR query LIKE '%security_audit_log%'
   OR query LIKE '%notification_templates%'
   OR query LIKE '%platform_settings%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## Future Enhancements

### Planned Features

1. **Audit Log Partitioning**
   - Partition `security_audit_log` by month for better performance
   - Automatic archival after 90 days to cold storage

2. **Template Versioning**
   - Track template version history
   - Rollback to previous template versions

3. **Integration Webhooks**
   - Outbound webhook support for third-party services
   - Retry logic with exponential backoff

4. **Advanced Encryption**
   - Integration with AWS KMS for credential encryption
   - Automatic key rotation

5. **Notification Analytics**
   - Track template usage and delivery rates
   - A/B testing for notification effectiveness

---

## Support & Troubleshooting

### Common Issues

**Issue:** RLS policies blocking access
**Solution:** Verify user has correct role in `profiles.user_type` or `dealer_memberships.role`

**Issue:** Integration tests failing
**Solution:** Check `last_test_result` column for error details

**Issue:** Template variables not rendering
**Solution:** Verify variable names match exactly (case-sensitive)

### Debug Queries

```sql
-- Check user permissions
SELECT
    p.email,
    p.user_type,
    dm.dealer_id,
    dm.role
FROM profiles p
LEFT JOIN dealer_memberships dm ON dm.user_id = p.id
WHERE p.id = auth.uid();

-- Check RLS policy effectiveness
EXPLAIN (ANALYZE, VERBOSE)
SELECT * FROM dealer_integrations
WHERE dealer_id = 123;
```

---

## Conclusion

This migration provides a robust, enterprise-grade foundation for the Settings Hub feature, including:

✅ Secure integration management with encryption support
✅ Comprehensive audit logging for compliance
✅ Flexible notification templating with multi-language support
✅ Platform-wide configuration management
✅ Production-ready RLS policies
✅ Optimized indexes for performance
✅ Helper functions for common operations

For questions or issues, contact the database team or consult the Supabase documentation.

**Migration Status:** ✅ Ready for Production
**Last Updated:** October 25, 2025
**Version:** 1.0.0
