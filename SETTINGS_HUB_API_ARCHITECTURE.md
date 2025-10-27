# Settings Hub API Architecture
## MyDetailArea Integration Layer - Enterprise Implementation

> **Author**: API Architect Agent
> **Date**: October 25, 2025
> **Version**: 1.0.0
> **Status**: Production-Ready Design

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Database Schema](#database-schema)
4. [Supabase Edge Functions](#supabase-edge-functions)
5. [Security Architecture](#security-architecture)
6. [API Documentation](#api-documentation)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Guide](#deployment-guide)
10. [Monitoring & Observability](#monitoring--observability)

---

## Executive Summary

Esta arquitectura implementa un sistema de integración empresarial para MyDetailArea Settings Hub, incluyendo:

- **Slack Integration**: OAuth 2.0, envío de mensajes, gestión de canales
- **Generic Webhooks**: Sistema de delivery con retry logic y analytics
- **Notification System**: Plantillas multi-canal (email/SMS/Slack/push)
- **Audit Logging**: Registro completo de eventos de seguridad

### Key Features

- Encriptación de tokens usando Supabase Vault
- Rate limiting por dealership
- Retry logic con backoff exponencial
- Audit logging completo
- Multi-dealership support
- CSRF protection
- Webhook signature verification

---

## System Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       MyDetailArea Frontend                      │
│                    (Settings Hub Interface)                      │
└───────────────┬─────────────────────────────────────────────────┘
                │
                │ HTTPS + JWT
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Edge Functions                       │
├─────────────────────────────────────────────────────────────────┤
│  Slack APIs        │  Webhook APIs   │  Notification APIs       │
│  - oauth-callback  │  - deliver      │  - render-template       │
│  - send-message    │  - test         │  - send                  │
│  - test-connection │                 │                          │
│  - list-channels   │                 │  Audit API               │
│                    │                 │  - log-create            │
└───────────┬────────┴─────────────────┴──────────────────────────┘
            │
            │ RLS + Encrypted Storage
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase PostgreSQL                          │
├─────────────────────────────────────────────────────────────────┤
│  Tables:                                                         │
│  - dealer_integrations (Slack/webhook configs + tokens)         │
│  - webhook_deliveries (Delivery tracking + retry queue)         │
│  - notification_templates (Multi-channel templates)             │
│  - audit_logs (Security & compliance logging)                   │
│  - oauth_states (CSRF protection)                               │
│  - rate_limit_log (Rate limiting)                               │
└───────────┬─────────────────────────────────────────────────────┘
            │
            │ Encrypted Tokens
            ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Supabase Vault                             │
│                  (Encrypted Secrets Storage)                     │
└─────────────────────────────────────────────────────────────────┘
            │
            │ External API Calls
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Services                                   │
├─────────────────────────────────────────────────────────────────┤
│  Slack API  │  Customer Webhooks  │  Email/SMS Providers        │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### **Frontend (Settings Hub)**
- OAuth flow initiation
- Integration configuration UI
- Webhook management
- Template editor
- Test connection functionality

#### **Edge Functions Layer**
- Request authentication & authorization
- Business logic execution
- Rate limiting enforcement
- External API orchestration
- Error handling & retry logic

#### **Database Layer**
- Persistent storage with RLS
- Encryption at rest (Vault)
- Audit trail maintenance
- Retry queue management

#### **External Services**
- Slack Workspace API
- Customer webhook endpoints
- Email/SMS providers

---

## Database Schema

### Core Tables

#### 1. `dealer_integrations`

Stores all external integrations per dealership.

```sql
CREATE TABLE dealer_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL, -- 'slack', 'webhook', 'zapier', etc.
  integration_name VARCHAR(255) NOT NULL,

  -- Configuration (JSON)
  config JSONB NOT NULL DEFAULT '{}',

  -- OAuth credentials (encrypted)
  oauth_access_token TEXT, -- Encrypted in Supabase Vault
  oauth_refresh_token TEXT, -- Encrypted
  oauth_scopes TEXT[],
  oauth_token_expires_at TIMESTAMPTZ,

  -- Status
  enabled BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'invalid_credentials', 'rate_limited', 'disabled'

  -- Encryption metadata
  credentials_encrypted BOOLEAN DEFAULT false,
  encryption_key_id VARCHAR(100),

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes
  UNIQUE(dealer_id, integration_type, integration_name)
);

-- Indexes
CREATE INDEX idx_dealer_integrations_dealer ON dealer_integrations(dealer_id);
CREATE INDEX idx_dealer_integrations_type ON dealer_integrations(integration_type);
CREATE INDEX idx_dealer_integrations_enabled ON dealer_integrations(enabled) WHERE enabled = true;

-- RLS Policies
ALTER TABLE dealer_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dealer's integrations"
  ON dealer_integrations FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND system_role = 'super_admin'
    )
  );

CREATE POLICY "Only admins can manage integrations"
  ON dealer_integrations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = dealer_integrations.dealer_id
        AND dm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND system_role = 'super_admin'
    )
  );
```

#### 2. `webhook_deliveries`

Tracks webhook delivery attempts with retry queue.

```sql
CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES dealer_integrations(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Event data
  event_type VARCHAR(100) NOT NULL, -- 'order.created', 'order.status_changed', etc.
  payload JSONB NOT NULL,

  -- Delivery tracking
  delivery_attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  response_status INTEGER,
  response_body TEXT,
  response_headers JSONB,

  -- Timestamps
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Retry configuration
  retry_backoff_ms INTEGER DEFAULT 1000,

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'delivered', 'failed', 'retrying'

  -- Error tracking
  last_error TEXT
);

-- Indexes
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_dealer ON webhook_deliveries(dealer_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at)
  WHERE status = 'retrying' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

-- RLS Policies
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dealer's deliveries"
  ON webhook_deliveries FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND system_role = 'super_admin'
    )
  );
```

#### 3. `notification_templates`

Multi-channel notification templates with variable substitution.

```sql
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Template identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_trigger VARCHAR(100), -- Optional: 'order.created', 'vehicle.completed', etc.

  -- Channel configuration
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'slack', 'push'

  -- Template content
  subject VARCHAR(500), -- For email/push
  body TEXT NOT NULL,

  -- Variables (for validation)
  variables JSONB DEFAULT '[]', -- ['{{order_id}}', '{{customer_name}}', etc.]

  -- Slack-specific
  slack_channel VARCHAR(100), -- Default channel for Slack notifications
  slack_blocks JSONB, -- Rich Slack block formatting

  -- Status
  enabled BOOLEAN DEFAULT true,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(dealer_id, name, channel)
);

-- Indexes
CREATE INDEX idx_notification_templates_dealer ON notification_templates(dealer_id);
CREATE INDEX idx_notification_templates_channel ON notification_templates(channel);
CREATE INDEX idx_notification_templates_trigger ON notification_templates(event_trigger);

-- RLS Policies
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dealer's templates"
  ON notification_templates FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND system_role = 'super_admin'
    )
  );

CREATE POLICY "Only admins can manage templates"
  ON notification_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = notification_templates.dealer_id
        AND dm.role IN ('owner', 'admin')
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND system_role = 'super_admin'
    )
  );
```

#### 4. `audit_logs`

Comprehensive audit logging for security and compliance.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event classification
  event_type VARCHAR(100) NOT NULL, -- 'integration.slack.connected', 'webhook.delivered', etc.
  event_category VARCHAR(50), -- 'integrations', 'security', 'data_access', etc.
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'

  -- Resource tracking
  resource_type VARCHAR(50), -- 'integration', 'webhook', 'template', etc.
  resource_id VARCHAR(100),

  -- Event data
  metadata JSONB DEFAULT '{}',

  -- Request context
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(100),

  -- Error tracking
  error_message TEXT,
  error_stack TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioning by month for performance (recommended for production)
-- CREATE TABLE audit_logs_y2025m10 PARTITION OF audit_logs
--   FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

-- Indexes
CREATE INDEX idx_audit_logs_dealer ON audit_logs(dealer_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('error', 'critical');

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their dealer's audit logs"
  ON audit_logs FOR SELECT
  USING (
    dealer_id IN (
      SELECT dealer_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND system_role = 'super_admin'
    )
  );

CREATE POLICY "No manual modifications to audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (false); -- Only insertable via triggers/functions
```

#### 5. `oauth_states`

CSRF protection for OAuth flows.

```sql
CREATE TABLE oauth_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_token TEXT UNIQUE NOT NULL,
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL,

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  used_at TIMESTAMPTZ,

  -- Metadata
  redirect_url TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_oauth_states_token ON oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at) WHERE used_at IS NULL;

-- Auto-cleanup old states (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 6. `rate_limit_log`

Rate limiting tracking table.

```sql
CREATE TABLE rate_limit_log (
  id BIGSERIAL PRIMARY KEY,
  rate_key VARCHAR(255) NOT NULL, -- 'slack:send:dealer:123:user:uuid'
  endpoint VARCHAR(100) NOT NULL,
  timestamp BIGINT NOT NULL, -- Unix timestamp

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rate_limit_key ON rate_limit_log(rate_key, timestamp);
CREATE INDEX idx_rate_limit_timestamp ON rate_limit_log(timestamp);

-- Auto-cleanup old logs (run hourly)
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Database Functions

#### Encrypt/Decrypt Functions (Supabase Vault Integration)

```sql
-- Create encryption key in Supabase Vault
-- Run this in Supabase SQL Editor:
-- SELECT vault.create_secret('my-encryption-key', 'settings-encryption-key');

-- Encrypt function
CREATE OR REPLACE FUNCTION vault_encrypt(plaintext TEXT, key_id TEXT DEFAULT 'settings-encryption-key')
RETURNS TEXT AS $$
DECLARE
  encrypted TEXT;
BEGIN
  SELECT vault.encrypt(plaintext::bytea, key_id) INTO encrypted;
  RETURN encrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrypt function
CREATE OR REPLACE FUNCTION vault_decrypt(ciphertext TEXT, key_id TEXT DEFAULT 'settings-encryption-key')
RETURNS TEXT AS $$
DECLARE
  decrypted TEXT;
BEGIN
  SELECT convert_from(vault.decrypt(ciphertext::bytea, key_id), 'UTF8') INTO decrypted;
  RETURN decrypted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Database Triggers

#### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dealer_integrations_updated_at
BEFORE UPDATE ON dealer_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

#### Auto-audit settings changes

```sql
CREATE OR REPLACE FUNCTION log_integration_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      dealer_id,
      user_id,
      event_type,
      event_category,
      severity,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      NEW.dealer_id,
      NEW.created_by,
      'integration.' || NEW.integration_type || '.created',
      'integrations',
      'info',
      'integration',
      NEW.id::text,
      jsonb_build_object(
        'integration_name', NEW.integration_name,
        'enabled', NEW.enabled
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Log if enabled status changed
    IF OLD.enabled != NEW.enabled THEN
      INSERT INTO audit_logs (
        dealer_id,
        user_id,
        event_type,
        event_category,
        severity,
        resource_type,
        resource_id,
        metadata
      ) VALUES (
        NEW.dealer_id,
        NEW.updated_by,
        'integration.' || NEW.integration_type || '.' || (CASE WHEN NEW.enabled THEN 'enabled' ELSE 'disabled' END),
        'integrations',
        'warning',
        'integration',
        NEW.id::text,
        jsonb_build_object(
          'integration_name', NEW.integration_name,
          'old_enabled', OLD.enabled,
          'new_enabled', NEW.enabled
        )
      );
    END IF;

    -- Log if credentials changed
    IF OLD.oauth_access_token IS DISTINCT FROM NEW.oauth_access_token THEN
      INSERT INTO audit_logs (
        dealer_id,
        user_id,
        event_type,
        event_category,
        severity,
        resource_type,
        resource_id,
        metadata
      ) VALUES (
        NEW.dealer_id,
        NEW.updated_by,
        'integration.' || NEW.integration_type || '.credentials_updated',
        'security',
        'warning',
        'integration',
        NEW.id::text,
        jsonb_build_object('integration_name', NEW.integration_name)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      dealer_id,
      user_id,
      event_type,
      event_category,
      severity,
      resource_type,
      resource_id,
      metadata
    ) VALUES (
      OLD.dealer_id,
      auth.uid(),
      'integration.' || OLD.integration_type || '.deleted',
      'integrations',
      'warning',
      'integration',
      OLD.id::text,
      jsonb_build_object('integration_name', OLD.integration_name)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_integration_changes
AFTER INSERT OR UPDATE OR DELETE ON dealer_integrations
FOR EACH ROW EXECUTE FUNCTION log_integration_changes();
```

---

## Supabase Edge Functions

### Shared Utilities

All Edge Functions share common utilities located in `supabase/functions/_shared/`:

#### File Structure
```
supabase/functions/
├── _shared/
│   ├── cors.ts
│   ├── types.ts
│   ├── errors.ts
│   ├── auth.ts
│   ├── encryption.ts
│   └── rate-limit.ts
├── slack-oauth-callback/
│   └── index.ts
├── slack-send-message/
│   └── index.ts
├── slack-test-connection/
│   └── index.ts
├── slack-list-channels/
│   └── index.ts
├── webhook-deliver/
│   └── index.ts
├── webhook-test/
│   └── index.ts
├── notification-render-template/
│   └── index.ts
└── audit-log-create/
    └── index.ts
```

### Slack Integration Functions

#### 1. `slack-oauth-callback`

**Already Implemented** - Ver archivo existente en `supabase/functions/slack-oauth-callback/index.ts`

**Purpose**: Handle OAuth 2.0 callback from Slack

**Key Features**:
- CSRF protection via state validation
- Token encryption before storage
- Automatic integration creation/update
- Security audit logging
- Workspace validation

**Flow**:
1. Receive OAuth callback with `code` and `state`
2. Validate state (CSRF protection)
3. Exchange code for access token
4. Encrypt token using Supabase Vault
5. Store integration in `dealer_integrations`
6. Log security event
7. Redirect to settings page

#### 2. `slack-send-message`

**Purpose**: Send message to Slack channel

**Request**:
```typescript
POST /slack-send-message
Authorization: Bearer <jwt_token>

{
  "dealer_id": 123,
  "channel": "#general",
  "text": "New order #12345 created",
  "blocks": [], // Optional: Rich Slack blocks
  "attachments": [], // Optional: Legacy attachments
  "thread_ts": "1234567890.123456" // Optional: Reply to thread
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "message_ts": "1234567890.123456",
    "channel": "C1234567890"
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Rate Limit**: 100 messages/minute per dealer

**Error Codes**:
- `UNAUTHORIZED`: Missing/invalid JWT
- `FORBIDDEN`: No access to dealer
- `VALIDATION_ERROR`: Missing required fields
- `NOT_FOUND`: Slack integration not configured
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SLACK_API_ERROR`: Slack API error (token revoked, channel not found, etc.)

#### 3. `slack-test-connection`

**Purpose**: Test Slack integration before saving

**Request**:
```typescript
POST /slack-test-connection
Authorization: Bearer <jwt_token>

{
  "dealer_id": 123,
  // Option A: Test existing integration
  "integration_id": "uuid-here",

  // Option B: Test before saving (admin only)
  "bot_token": "xoxb-test-token"
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "workspace_name": "MyDealership Workspace",
    "bot_user_id": "U1234567890",
    "channel_count": 15,
    "scopes": ["chat:write", "channels:read"],
    "connection_status": "ok"
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Slack API Calls**:
1. `auth.test` - Validate token & get workspace info
2. `conversations.list` - Get channel count

#### 4. `slack-list-channels`

**Purpose**: Get list of channels for dropdown selection

**Request**:
```typescript
POST /slack-list-channels
Authorization: Bearer <jwt_token>

{
  "dealer_id": 123,
  "include_private": false, // Optional
  "cursor": "next_page_token" // Optional: For pagination
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "channels": [
      {
        "id": "C1234567890",
        "name": "general",
        "is_private": false,
        "is_member": true
      },
      {
        "id": "C9876543210",
        "name": "sales-notifications",
        "is_private": false,
        "is_member": true
      }
    ],
    "next_cursor": "dGVhbTpDMUg5UkVTR0w=", // For pagination
    "has_more": false
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Webhook Functions

#### 5. `webhook-deliver`

**Purpose**: Deliver event to configured webhooks with retry logic

**Request**:
```typescript
POST /webhook-deliver
Authorization: Bearer <jwt_token>

{
  "dealer_id": 123,
  "event_type": "order.created",
  "payload": {
    "order_id": "12345",
    "customer_name": "John Doe",
    "vehicle_vin": "1HGBH41JXMN109186",
    "status": "pending"
  }
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "delivered_count": 2,
    "failed_count": 0,
    "deliveries": [
      {
        "webhook_id": "uuid-1",
        "delivery_id": "uuid-delivery-1",
        "status": "delivered",
        "response_status": 200,
        "delivery_time_ms": 145
      },
      {
        "webhook_id": "uuid-2",
        "delivery_id": "uuid-delivery-2",
        "status": "delivered",
        "response_status": 201,
        "delivery_time_ms": 89
      }
    ]
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Retry Logic**:
- Max attempts: 3 (configurable per webhook)
- Backoff: Exponential (1s, 2s, 4s) or Linear (configurable)
- Retry on: 5xx errors, network timeouts
- No retry on: 4xx errors (except 429 Rate Limit)

**Flow**:
1. Find all enabled webhooks for dealer subscribed to event
2. For each webhook:
   a. Check retry policy
   b. Add authentication headers (if configured)
   c. POST to webhook URL
   d. Record delivery in `webhook_deliveries`
   e. Schedule retry if failed

#### 6. `webhook-test`

**Purpose**: Test webhook endpoint before saving

**Request**:
```typescript
POST /webhook-test
Authorization: Bearer <jwt_token>

{
  "url": "https://customer-api.com/webhooks/mydetailarea",
  "headers": {
    "X-Custom-Header": "value"
  },
  "auth_type": "bearer", // 'none', 'bearer', 'basic', 'api_key'
  "auth_config": {
    "token": "secret-bearer-token"
  }
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "status_code": 200,
    "response_time_ms": 145,
    "response_body": "{\"status\":\"ok\"}",
    "response_headers": {
      "content-type": "application/json"
    },
    "connection_test": "passed"
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Test Payload**:
```json
{
  "event_type": "test.connection",
  "test": true,
  "timestamp": "2025-10-25T14:30:00Z",
  "dealer_id": 123
}
```

### Notification Functions

#### 7. `notification-render-template`

**Purpose**: Render notification template with variable substitution

**Request**:
```typescript
POST /notification-render-template
Authorization: Bearer <jwt_token>

{
  "template_id": "uuid-template-id",
  "variables": {
    "order_id": "12345",
    "customer_name": "John Doe",
    "vehicle_vin": "1HGBH41JXMN109186",
    "due_date": "2025-10-30"
  }
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "channel": "email",
    "subject": "Order #12345 - Ready for Pickup",
    "body": "Hi John Doe,\n\nYour vehicle (VIN: 1HGBH41JXMN109186) is ready!\nOrder #12345\nDue Date: 2025-10-30\n\nThank you!",
    "slack_blocks": null, // Populated if channel='slack'
    "rendered": true
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Variable Substitution**:
- Format: `{{variable_name}}`
- Case-sensitive
- Missing variables: Empty string (configurable)
- Nested objects: `{{customer.name}}`

### Audit Functions

#### 8. `audit-log-create`

**Purpose**: Create audit log entry (called internally by other functions)

**Request**:
```typescript
POST /audit-log-create
Authorization: Bearer <service_role_key> // Service role only

{
  "dealer_id": 123,
  "user_id": "uuid-user-id",
  "event_type": "integration.slack.message_sent",
  "event_category": "integrations",
  "severity": "info",
  "resource_type": "slack_message",
  "resource_id": "1234567890.123456",
  "metadata": {
    "channel": "#general",
    "message_length": 150
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "request_id": "req_abc123"
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "log_id": "uuid-log-id"
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Note**: This function is typically called by other Edge Functions or database triggers, not directly by the frontend.

---

## Security Architecture

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Login (email/password)
       ▼
┌─────────────┐
│  Supabase   │
│    Auth     │
└──────┬──────┘
       │ 2. Returns JWT token
       ▼
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 3. API Request with Authorization: Bearer <jwt>
       ▼
┌─────────────┐
│ Edge Function│
└──────┬──────┘
       │ 4. Validate JWT
       │ 5. Extract user_id
       │ 6. Verify dealer access
       ▼
┌─────────────┐
│  Database   │
│  (with RLS) │
└─────────────┘
```

### Authorization Levels

1. **Super Admin**
   - Access to all dealers
   - System-wide configuration
   - Security audit access

2. **Dealer Owner/Admin**
   - Full access to dealer integrations
   - Create/update/delete webhooks
   - Manage notification templates
   - View audit logs for dealer

3. **Dealer User**
   - View-only access to integrations
   - Cannot modify settings
   - Cannot access sensitive credentials

### Encryption Strategy

#### Tokens & Secrets
- **Storage**: Supabase Vault (encrypted at rest)
- **Algorithm**: AES-256-GCM
- **Key Management**: Supabase managed keys
- **Rotation**: Manual via Vault API

#### Encryption Flow
```typescript
// Before storing
const encryptedToken = await supabase.rpc('vault_encrypt', {
  plaintext: slackBotToken,
  key_id: 'settings-encryption-key'
})

// Store encrypted value
await supabase.from('dealer_integrations').insert({
  oauth_access_token: encryptedToken,
  credentials_encrypted: true
})

// When retrieving
const { data } = await supabase
  .from('dealer_integrations')
  .select('oauth_access_token')
  .single()

const decryptedToken = await supabase.rpc('vault_decrypt', {
  ciphertext: data.oauth_access_token,
  key_id: 'settings-encryption-key'
})
```

### Rate Limiting

#### Per-Endpoint Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| slack-send-message | 100 requests | 60 seconds |
| webhook-deliver | 500 requests | 60 seconds |
| slack-list-channels | 30 requests | 60 seconds |
| notification-render | 200 requests | 60 seconds |
| Default | 60 requests | 60 seconds |

#### Rate Limit Key Format
```
{endpoint}:dealer:{dealer_id}:user:{user_id}
```

#### Implementation
```typescript
const rateLimitKey = `slack:send:dealer:${dealer_id}:user:${user_id}`
const windowStart = Math.floor(Date.now() / 1000) - 60

const { data: recentRequests } = await supabase
  .from('rate_limit_log')
  .select('id')
  .eq('rate_key', rateLimitKey)
  .gte('timestamp', windowStart)

if (recentRequests.length >= 100) {
  throw new RateLimitError(60) // Retry after 60 seconds
}
```

### CSRF Protection (OAuth)

#### State Generation
```typescript
const state = {
  dealer_id: 123,
  user_id: 'uuid-user',
  timestamp: Date.now(),
  nonce: crypto.randomUUID()
}

const stateToken = btoa(JSON.stringify(state))

// Store in database
await supabase.from('oauth_states').insert({
  state_token: stateToken,
  dealer_id: state.dealer_id,
  user_id: state.user_id,
  integration_type: 'slack',
  expires_at: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
})
```

#### State Validation
```typescript
// On callback
const stateData = JSON.parse(atob(state))

// Verify timestamp (max 10 minutes old)
if (Date.now() - stateData.timestamp > 600000) {
  throw new Error('State expired')
}

// Verify in database
const { data: oauthState } = await supabase
  .from('oauth_states')
  .select('*')
  .eq('state_token', state)
  .gt('expires_at', new Date())
  .is('used_at', null)
  .single()

if (!oauthState) {
  throw new Error('Invalid state')
}

// Mark as used
await supabase
  .from('oauth_states')
  .update({ used_at: new Date() })
  .eq('id', oauthState.id)
```

### Webhook Signature Verification

For incoming webhooks (reverse direction):

```typescript
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  )
}
```

---

## API Documentation

### OpenAPI Specification

```yaml
openapi: 3.0.0
info:
  title: MyDetailArea Settings Hub API
  version: 1.0.0
  description: Integration APIs for Slack, webhooks, and notifications
  contact:
    name: API Support
    email: support@mydetailarea.com

servers:
  - url: https://your-project.supabase.co/functions/v1
    description: Production

security:
  - BearerAuth: []

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    APIResponse:
      type: object
      required:
        - success
      properties:
        success:
          type: boolean
        data:
          type: object
        error:
          type: object
          properties:
            code:
              type: string
            message:
              type: string
            details:
              type: object
        meta:
          type: object
          properties:
            timestamp:
              type: string
              format: date-time
            request_id:
              type: string

    SlackSendMessageRequest:
      type: object
      required:
        - dealer_id
        - channel
        - text
      properties:
        dealer_id:
          type: integer
        channel:
          type: string
          description: Channel ID or name (#general)
        text:
          type: string
          maxLength: 3000
        blocks:
          type: array
          items:
            type: object
        attachments:
          type: array
          items:
            type: object
        thread_ts:
          type: string
          description: Thread timestamp for replies

    WebhookDeliverRequest:
      type: object
      required:
        - dealer_id
        - event_type
        - payload
      properties:
        dealer_id:
          type: integer
        event_type:
          type: string
          enum:
            - order.created
            - order.updated
            - order.status_changed
            - order.completed
            - vehicle.created
            - vehicle.updated
            - payment.received
        payload:
          type: object

paths:
  /slack-send-message:
    post:
      summary: Send message to Slack
      operationId: slackSendMessage
      tags:
        - Slack Integration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SlackSendMessageRequest'
      responses:
        '200':
          description: Message sent successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/APIResponse'
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
        '404':
          description: Integration not found
        '429':
          description: Rate limit exceeded
          headers:
            Retry-After:
              schema:
                type: integer
              description: Seconds to wait before retry

  /slack-test-connection:
    post:
      summary: Test Slack integration
      operationId: slackTestConnection
      tags:
        - Slack Integration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - dealer_id
              properties:
                dealer_id:
                  type: integer
                integration_id:
                  type: string
                  format: uuid
                bot_token:
                  type: string
                  description: For testing before save (admin only)
      responses:
        '200':
          description: Connection test result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/APIResponse'

  /slack-list-channels:
    post:
      summary: List Slack channels
      operationId: slackListChannels
      tags:
        - Slack Integration
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - dealer_id
              properties:
                dealer_id:
                  type: integer
                include_private:
                  type: boolean
                  default: false
                cursor:
                  type: string
                  description: Pagination cursor
      responses:
        '200':
          description: List of channels
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/APIResponse'

  /webhook-deliver:
    post:
      summary: Deliver event to webhooks
      operationId: webhookDeliver
      tags:
        - Webhooks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/WebhookDeliverRequest'
      responses:
        '200':
          description: Delivery results
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/APIResponse'

  /webhook-test:
    post:
      summary: Test webhook endpoint
      operationId: webhookTest
      tags:
        - Webhooks
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required:
                - url
              properties:
                url:
                  type: string
                  format: uri
                headers:
                  type: object
                auth_type:
                  type: string
                  enum: [none, bearer, basic, api_key]
                auth_config:
                  type: object
      responses:
        '200':
          description: Test result
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/APIResponse'
```

---

## Error Handling

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token |
| `FORBIDDEN` | 403 | Insufficient permissions or dealer access denied |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `NOT_FOUND` | 404 | Resource not found (integration, template, etc.) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `EXTERNAL_SERVICE_ERROR` | 502 | External API error (Slack, webhook endpoint) |
| `ENCRYPTION_ERROR` | 500 | Encryption/decryption failed |
| `CONFIGURATION_ERROR` | 500 | Server configuration error |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Error Response Format

```typescript
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded: 100 messages per minute",
    "details": {
      "retry_after": 60,
      "current_count": 105,
      "limit": 100
    }
  },
  "meta": {
    "timestamp": "2025-10-25T14:30:00Z",
    "request_id": "req_abc123"
  }
}
```

### Retry Logic Best Practices

#### Client-Side Retry Strategy

```typescript
async function callAPIWithRetry(
  endpoint: string,
  payload: any,
  maxAttempts: number = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      // Success
      if (response.ok) {
        return data
      }

      // Don't retry on 4xx errors (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(data.error.message)
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw new Error(data.error.message)
      }

      // Calculate backoff delay
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000) // Max 10s

      // Respect Retry-After header for 429
      if (response.status === 429 && response.headers.get('Retry-After')) {
        const retryAfter = parseInt(response.headers.get('Retry-After')!) * 1000
        await new Promise(resolve => setTimeout(resolve, retryAfter))
      } else {
        await new Promise(resolve => setTimeout(resolve, delay))
      }

    } catch (error) {
      if (attempt === maxAttempts) {
        throw error
      }
      // Network error, retry with backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

#### Server-Side Retry (Webhooks)

```typescript
async function deliverWebhookWithRetry(
  webhook: WebhookConfig,
  payload: any,
  deliveryId: string
): Promise<void> {
  const maxAttempts = webhook.retry_policy.max_attempts
  let attempt = 0

  while (attempt < maxAttempts) {
    attempt++

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MyDetailArea-Event': payload.event_type,
          'X-MyDetailArea-Delivery': deliveryId,
          ...buildAuthHeaders(webhook),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000), // 30s timeout
      })

      // Update delivery record
      await supabase.from('webhook_deliveries').update({
        delivery_attempts: attempt,
        response_status: response.status,
        response_body: await response.text(),
        delivered_at: new Date(),
        status: 'delivered',
      }).eq('id', deliveryId)

      // Success
      if (response.ok) {
        console.log(`Webhook delivered successfully on attempt ${attempt}`)
        return
      }

      // Don't retry on 4xx (except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        console.error(`Webhook failed with ${response.status}, not retrying`)
        await supabase.from('webhook_deliveries').update({
          status: 'failed',
          failed_at: new Date(),
          last_error: `HTTP ${response.status}`,
        }).eq('id', deliveryId)
        return
      }

    } catch (error) {
      console.error(`Webhook delivery attempt ${attempt} failed:`, error)

      // Update failure record
      await supabase.from('webhook_deliveries').update({
        delivery_attempts: attempt,
        last_error: error instanceof Error ? error.message : 'Unknown error',
        status: attempt >= maxAttempts ? 'failed' : 'retrying',
        failed_at: attempt >= maxAttempts ? new Date() : null,
      }).eq('id', deliveryId)
    }

    // Calculate next retry delay
    if (attempt < maxAttempts) {
      const delay = webhook.retry_policy.backoff_type === 'exponential'
        ? webhook.retry_policy.initial_delay_ms * Math.pow(2, attempt - 1)
        : webhook.retry_policy.initial_delay_ms * attempt

      console.log(`Retrying webhook in ${delay}ms (attempt ${attempt}/${maxAttempts})`)

      // Schedule retry
      await supabase.from('webhook_deliveries').update({
        next_retry_at: new Date(Date.now() + delay),
      }).eq('id', deliveryId)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  console.error(`Webhook delivery failed after ${maxAttempts} attempts`)
}
```

---

## Testing Strategy

### Unit Tests (Edge Functions)

```typescript
// tests/slack-send-message.test.ts
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts'
import { serve } from '../supabase/functions/slack-send-message/index.ts'

Deno.test('Slack Send Message - Success', async () => {
  const mockRequest = new Request('http://localhost/slack-send-message', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer mock-jwt-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dealer_id: 1,
      channel: '#test',
      text: 'Test message',
    }),
  })

  const response = await serve(mockRequest)
  const data = await response.json()

  assertEquals(response.status, 200)
  assertEquals(data.success, true)
  assertEquals(data.data.channel, '#test')
})

Deno.test('Slack Send Message - Unauthorized', async () => {
  const mockRequest = new Request('http://localhost/slack-send-message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      dealer_id: 1,
      channel: '#test',
      text: 'Test message',
    }),
  })

  const response = await serve(mockRequest)
  const data = await response.json()

  assertEquals(response.status, 401)
  assertEquals(data.success, false)
  assertEquals(data.error.code, 'UNAUTHORIZED')
})
```

### Integration Tests

```typescript
// tests/integration/slack-oauth-flow.test.ts
import { createClient } from '@supabase/supabase-js'

Deno.test('Slack OAuth Flow - End to End', async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Step 1: Create OAuth state
  const state = btoa(JSON.stringify({
    dealer_id: 1,
    user_id: 'test-user-id',
    timestamp: Date.now(),
  }))

  await supabase.from('oauth_states').insert({
    state_token: state,
    dealer_id: 1,
    user_id: 'test-user-id',
    integration_type: 'slack',
    expires_at: new Date(Date.now() + 600000),
  })

  // Step 2: Simulate OAuth callback
  const callbackUrl = `http://localhost/slack-oauth-callback?code=test-code&state=${state}`
  const response = await fetch(callbackUrl)

  assertEquals(response.status, 302)

  // Step 3: Verify integration created
  const { data: integration } = await supabase
    .from('dealer_integrations')
    .select('*')
    .eq('dealer_id', 1)
    .eq('integration_type', 'slack')
    .single()

  assertEquals(integration.enabled, true)
  assertEquals(integration.credentials_encrypted, true)

  // Cleanup
  await supabase.from('dealer_integrations').delete().eq('id', integration.id)
})
```

### Load Testing (k6)

```javascript
// tests/load/slack-send-message.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
}

export default function () {
  const url = 'https://your-project.supabase.co/functions/v1/slack-send-message'

  const payload = JSON.stringify({
    dealer_id: 1,
    channel: '#load-test',
    text: `Load test message ${Date.now()}`,
  })

  const params = {
    headers: {
      'Authorization': `Bearer ${__ENV.TEST_JWT_TOKEN}`,
      'Content-Type': 'application/json',
    },
  }

  const response = http.post(url, payload, params)

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has success': (r) => JSON.parse(r.body).success === true,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })

  sleep(1)
}
```

---

## Deployment Guide

### Prerequisites

1. Supabase project created
2. Deno CLI installed (`deno --version`)
3. Supabase CLI installed (`supabase --version`)
4. Environment variables configured

### Environment Variables

Create `.env` file:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Slack OAuth
SLACK_CLIENT_ID=your-slack-client-id
SLACK_CLIENT_SECRET=your-slack-client-secret
SLACK_REDIRECT_URI=https://your-app.com/api/slack/callback

# Application
APP_URL=https://your-app.com
```

### Database Setup

```bash
# 1. Run migrations
cd supabase/migrations
psql -h your-db-host -U postgres -d postgres -f 001_create_integrations_tables.sql

# 2. Create encryption key in Supabase Vault
# Run in Supabase SQL Editor:
SELECT vault.create_secret('my-encryption-key', 'settings-encryption-key');

# 3. Verify tables created
psql -h your-db-host -U postgres -d postgres -c "\dt"
```

### Deploy Edge Functions

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref your-project-ref

# Deploy all functions
supabase functions deploy slack-oauth-callback
supabase functions deploy slack-send-message
supabase functions deploy slack-test-connection
supabase functions deploy slack-list-channels
supabase functions deploy webhook-deliver
supabase functions deploy webhook-test
supabase functions deploy notification-render-template
supabase functions deploy audit-log-create

# Set environment secrets
supabase secrets set SLACK_CLIENT_ID=your-client-id
supabase secrets set SLACK_CLIENT_SECRET=your-client-secret
supabase secrets set SLACK_REDIRECT_URI=https://your-app.com/api/slack/callback
supabase secrets set APP_URL=https://your-app.com
```

### Verify Deployment

```bash
# Test function locally
supabase functions serve slack-test-connection

# Call function
curl -X POST http://localhost:54321/functions/v1/slack-test-connection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dealer_id": 1, "bot_token": "xoxb-test"}'
```

### Slack App Configuration

1. Go to https://api.slack.com/apps
2. Create new app "MyDetailArea Integration"
3. Configure OAuth & Permissions:
   - **Redirect URL**: `https://your-app.com/api/slack/callback`
   - **Scopes**:
     - `chat:write` - Send messages
     - `channels:read` - List public channels
     - `groups:read` - List private channels (optional)
     - `im:write` - Send DMs (optional)
4. Install app to workspace
5. Copy Client ID and Client Secret to environment variables

---

## Monitoring & Observability

### Metrics to Track

#### API Performance
- Request latency (p50, p95, p99)
- Error rate by endpoint
- Throughput (requests/second)
- Rate limit hits

#### Integration Health
- Slack API errors
- Webhook delivery success rate
- Average delivery time
- Retry queue depth

#### Business Metrics
- Active integrations per dealer
- Messages sent per day
- Webhook events delivered per day
- Template usage

### Logging Strategy

```typescript
// Structured logging format
interface LogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  request_id: string
  dealer_id?: number
  user_id?: string
  message: string
  metadata?: Record<string, any>
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

// Logger utility
function log(entry: Partial<LogEntry>) {
  const fullEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: entry.level || 'info',
    service: entry.service || 'unknown',
    request_id: entry.request_id || crypto.randomUUID(),
    message: entry.message || '',
    ...entry,
  }

  console.log(JSON.stringify(fullEntry))
}

// Usage
log({
  level: 'info',
  service: 'slack-send-message',
  request_id: requestId,
  dealer_id: dealerId,
  message: 'Message sent successfully',
  metadata: {
    channel: '#general',
    message_ts: '1234567890.123456',
    latency_ms: 145,
  },
})
```

### Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | Error rate > 5% for 5 minutes | Critical | Page on-call engineer |
| Slow API | p95 latency > 2s for 10 minutes | Warning | Investigate performance |
| Integration Down | Slack API errors > 50 in 5 minutes | Warning | Check Slack status |
| Webhook Failures | Failed deliveries > 10 in 5 minutes | Warning | Check customer endpoints |
| Rate Limit Abuse | Same dealer hitting rate limit repeatedly | Warning | Investigate usage pattern |

### Dashboard Queries

#### Slack Messages Sent (Last 24h)
```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as messages_sent
FROM audit_logs
WHERE event_type = 'integration.slack.message_sent'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

#### Webhook Delivery Success Rate
```sql
SELECT
  DATE(created_at) as date,
  COUNT(*) FILTER (WHERE status = 'delivered') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'delivered')::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as success_rate_pct
FROM webhook_deliveries
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;
```

#### Integration Health by Dealer
```sql
SELECT
  d.name as dealer_name,
  di.integration_type,
  di.status,
  di.enabled,
  COUNT(al.id) as events_last_24h
FROM dealer_integrations di
JOIN dealerships d ON d.id = di.dealer_id
LEFT JOIN audit_logs al ON al.resource_id = di.id::text
  AND al.created_at > NOW() - INTERVAL '24 hours'
WHERE di.integration_type IN ('slack', 'webhook')
GROUP BY d.name, di.integration_type, di.status, di.enabled
ORDER BY dealer_name, integration_type;
```

---

## Implementation Checklist

### Phase 1: Database Setup (Week 1)
- [ ] Create `dealer_integrations` table
- [ ] Create `webhook_deliveries` table
- [ ] Create `notification_templates` table
- [ ] Create `audit_logs` table
- [ ] Create `oauth_states` table
- [ ] Create `rate_limit_log` table
- [ ] Set up Supabase Vault encryption key
- [ ] Create encryption/decryption functions
- [ ] Set up RLS policies
- [ ] Create audit triggers

### Phase 2: Slack Integration (Week 2)
- [ ] Implement `slack-oauth-callback` function
- [ ] Implement `slack-send-message` function
- [ ] Implement `slack-test-connection` function
- [ ] Implement `slack-list-channels` function
- [ ] Set up Slack app in Slack App Directory
- [ ] Configure OAuth scopes
- [ ] Test OAuth flow end-to-end
- [ ] Test message sending
- [ ] Test error handling (token revoked, channel not found)

### Phase 3: Webhook System (Week 3)
- [ ] Implement `webhook-deliver` function
- [ ] Implement `webhook-test` function
- [ ] Create retry queue worker
- [ ] Implement exponential backoff
- [ ] Add webhook signature generation
- [ ] Test delivery success/failure scenarios
- [ ] Test retry logic
- [ ] Performance test with high volume

### Phase 4: Notification System (Week 4)
- [ ] Implement `notification-render-template` function
- [ ] Create template editor UI
- [ ] Implement variable substitution
- [ ] Add Slack blocks support
- [ ] Test email/SMS/Slack/push channels
- [ ] Create default templates
- [ ] Test edge cases (missing variables, malformed templates)

### Phase 5: Audit & Security (Week 5)
- [ ] Implement `audit-log-create` function
- [ ] Set up audit log triggers
- [ ] Implement rate limiting
- [ ] Add CSRF protection
- [ ] Security audit of all functions
- [ ] Penetration testing
- [ ] Code review by security team
- [ ] Documentation review

### Phase 6: Frontend Integration (Week 6)
- [ ] Build Settings Hub UI
- [ ] Implement OAuth initiation flow
- [ ] Create integration management page
- [ ] Build webhook configuration UI
- [ ] Create notification template editor
- [ ] Add test connection buttons
- [ ] Implement audit log viewer
- [ ] E2E testing

### Phase 7: Deployment & Monitoring (Week 7)
- [ ] Deploy to staging environment
- [ ] Set up monitoring dashboards
- [ ] Configure alerting rules
- [ ] Load testing
- [ ] User acceptance testing
- [ ] Deploy to production
- [ ] Monitor for 48 hours
- [ ] Create runbooks

---

## Conclusion

Esta arquitectura proporciona una base sólida y escalable para el Settings Hub de MyDetailArea. Los componentes clave incluyen:

1. **Seguridad Enterprise**: Encriptación, autenticación JWT, RLS, rate limiting
2. **Integración Slack Completa**: OAuth 2.0, envío de mensajes, gestión de canales
3. **Sistema de Webhooks Robusto**: Retry logic, queue management, analytics
4. **Notificaciones Multi-Canal**: Plantillas flexibles, substitución de variables
5. **Audit Logging Completo**: Compliance, seguridad, debugging

### Próximos Pasos

1. **Revisar arquitectura** con stakeholders
2. **Aprobar diseño de base de datos**
3. **Comenzar implementación** siguiendo el checklist
4. **Testing continuo** en cada fase
5. **Deploy incremental** con feature flags

### Recursos Adicionales

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Slack API Documentation](https://api.slack.com/)
- [Webhook Best Practices](https://webhooks.fyi/)
- [Supabase Vault Encryption](https://supabase.com/docs/guides/database/vault)

---

**Document Version**: 1.0.0
**Last Updated**: October 25, 2025
**Maintained By**: API Architecture Team
