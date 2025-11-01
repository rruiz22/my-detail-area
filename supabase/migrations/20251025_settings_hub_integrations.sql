-- Settings Hub Integration Tables Migration
-- MyDetailArea - Production-Ready Implementation
-- Date: 2025-10-25

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. DEALER INTEGRATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dealer_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  integration_type VARCHAR(50) NOT NULL, -- 'slack', 'webhook', 'zapier', etc.
  integration_name VARCHAR(255) NOT NULL,

  -- Configuration (JSON)
  config JSONB NOT NULL DEFAULT '{}',

  -- OAuth credentials (to be encrypted)
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
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

  -- Constraints
  UNIQUE(dealer_id, integration_type, integration_name)
);

-- Indexes
CREATE INDEX idx_dealer_integrations_dealer ON dealer_integrations(dealer_id);
CREATE INDEX idx_dealer_integrations_type ON dealer_integrations(integration_type);
CREATE INDEX idx_dealer_integrations_enabled ON dealer_integrations(enabled) WHERE enabled = true;
CREATE INDEX idx_dealer_integrations_status ON dealer_integrations(status);

-- RLS Policies
ALTER TABLE dealer_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view their dealer's integrations
CREATE POLICY "dealer_integrations_select_policy"
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

-- Only admins can manage integrations
CREATE POLICY "dealer_integrations_manage_policy"
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

-- Comment
COMMENT ON TABLE dealer_integrations IS 'External integrations (Slack, webhooks, etc.) per dealership';

-- =====================================================
-- 2. WEBHOOK DELIVERIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id UUID NOT NULL REFERENCES dealer_integrations(id) ON DELETE CASCADE,
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Event data
  event_type VARCHAR(100) NOT NULL,
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
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);

-- RLS Policies
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_deliveries_select_policy"
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

COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery tracking with retry queue';

-- =====================================================
-- 3. NOTIFICATION TEMPLATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,

  -- Template identification
  name VARCHAR(255) NOT NULL,
  description TEXT,
  event_trigger VARCHAR(100),

  -- Channel configuration
  channel VARCHAR(50) NOT NULL, -- 'email', 'sms', 'slack', 'push'

  -- Template content
  subject VARCHAR(500),
  body TEXT NOT NULL,

  -- Variables (for validation)
  variables JSONB DEFAULT '[]',

  -- Slack-specific
  slack_channel VARCHAR(100),
  slack_blocks JSONB,

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
CREATE INDEX idx_notification_templates_enabled ON notification_templates(enabled) WHERE enabled = true;

-- RLS Policies
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_templates_select_policy"
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

CREATE POLICY "notification_templates_manage_policy"
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

COMMENT ON TABLE notification_templates IS 'Multi-channel notification templates with variable substitution';

-- =====================================================
-- 4. AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dealer_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Event classification
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50), -- 'integrations', 'security', 'data_access', etc.
  severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'error', 'critical'

  -- Resource tracking
  resource_type VARCHAR(50),
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

-- Indexes
CREATE INDEX idx_audit_logs_dealer ON audit_logs(dealer_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_event_category ON audit_logs(event_category);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity) WHERE severity IN ('error', 'critical');

-- RLS Policies
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_policy"
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

-- No manual modifications to audit logs (only via triggers/functions)
CREATE POLICY "audit_logs_insert_policy"
  ON audit_logs FOR INSERT
  WITH CHECK (false);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit logging for security and compliance';

-- =====================================================
-- 5. OAUTH STATES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS oauth_states (
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
CREATE INDEX idx_oauth_states_dealer ON oauth_states(dealer_id);

COMMENT ON TABLE oauth_states IS 'CSRF protection for OAuth flows';

-- =====================================================
-- 6. RATE LIMIT LOG TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id BIGSERIAL PRIMARY KEY,
  rate_key VARCHAR(255) NOT NULL,
  endpoint VARCHAR(100) NOT NULL,
  timestamp BIGINT NOT NULL, -- Unix timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rate_limit_key ON rate_limit_log(rate_key, timestamp);
CREATE INDEX idx_rate_limit_timestamp ON rate_limit_log(timestamp);
CREATE INDEX idx_rate_limit_endpoint ON rate_limit_log(endpoint);

COMMENT ON TABLE rate_limit_log IS 'Rate limiting tracking table';

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update timestamps
CREATE TRIGGER update_dealer_integrations_updated_at
BEFORE UPDATE ON dealer_integrations
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON notification_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Cleanup expired OAuth states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states
  WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup old rate limit logs
CREATE OR REPLACE FUNCTION cleanup_rate_limit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limit_log
  WHERE timestamp < EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::bigint;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log integration changes (audit trigger)
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

-- Apply audit trigger
CREATE TRIGGER audit_integration_changes
AFTER INSERT OR UPDATE OR DELETE ON dealer_integrations
FOR EACH ROW EXECUTE FUNCTION log_integration_changes();

-- =====================================================
-- SCHEDULED JOBS (cron)
-- =====================================================

-- Note: Set up pg_cron extension and schedule these:
-- SELECT cron.schedule('cleanup-oauth-states', '0 2 * * *', 'SELECT cleanup_expired_oauth_states()');
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limit_logs()');

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON dealer_integrations TO authenticated;
GRANT SELECT ON webhook_deliveries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_templates TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON oauth_states TO authenticated;
GRANT SELECT, INSERT ON rate_limit_log TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Settings Hub Integration tables created successfully!';
  RAISE NOTICE 'Tables: dealer_integrations, webhook_deliveries, notification_templates, audit_logs, oauth_states, rate_limit_log';
END $$;
