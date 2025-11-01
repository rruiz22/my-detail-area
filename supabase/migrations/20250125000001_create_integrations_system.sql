-- =====================================================
-- OAUTH & INTEGRATION SECURITY SYSTEM
-- Enterprise-grade credential management with encryption
-- =====================================================

-- Integration types enum
CREATE TYPE integration_type AS ENUM (
  'slack',
  'webhook',
  'email_smtp',
  'sms_provider',
  'payment_gateway',
  'analytics',
  'crm',
  'custom'
);

-- Integration status
CREATE TYPE integration_status AS ENUM (
  'active',
  'inactive',
  'error',
  'pending_auth',
  'revoked'
);

-- Audit severity levels
CREATE TYPE audit_severity AS ENUM (
  'info',
  'warning',
  'error',
  'critical'
);

-- =====================================================
-- DEALER INTEGRATIONS TABLE
-- Stores OAuth tokens and integration configurations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.dealer_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  integration_type integration_type NOT NULL,
  integration_name TEXT NOT NULL, -- User-friendly name

  -- Configuration (non-sensitive data)
  config JSONB DEFAULT '{}'::jsonb,

  -- OAuth/API credentials (ENCRYPTED)
  credentials_vault_key TEXT, -- Reference to Supabase Vault secret
  credentials_encrypted BOOLEAN DEFAULT false,

  -- OAuth specific fields
  oauth_access_token TEXT, -- Temporarily store before vault migration
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  oauth_scopes TEXT[], -- Granted OAuth scopes

  -- Webhook specific
  webhook_url TEXT,
  webhook_secret TEXT, -- For signature verification

  -- Status and metadata
  status integration_status DEFAULT 'pending_auth',
  enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  error_count INTEGER DEFAULT 0,

  -- Audit trail
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(dealer_id, integration_type, integration_name),
  CHECK (error_count >= 0)
);

-- Indexes for performance
CREATE INDEX idx_dealer_integrations_dealer_id ON public.dealer_integrations(dealer_id);
CREATE INDEX idx_dealer_integrations_type ON public.dealer_integrations(integration_type);
CREATE INDEX idx_dealer_integrations_status ON public.dealer_integrations(status);
CREATE INDEX idx_dealer_integrations_enabled ON public.dealer_integrations(enabled) WHERE enabled = true;

-- =====================================================
-- API RATE LIMITING TABLE
-- Prevent abuse and track API usage
-- =====================================================
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.dealer_integrations(id) ON DELETE CASCADE,

  -- Rate limit configuration
  endpoint TEXT NOT NULL, -- 'slack_send', 'webhook_deliver', 'sms_send'
  limit_per_window INTEGER NOT NULL DEFAULT 100,
  window_minutes INTEGER NOT NULL DEFAULT 60,

  -- Current window tracking
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  window_end TIMESTAMPTZ,

  -- Last request tracking
  last_request_at TIMESTAMPTZ,
  last_request_ip INET,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  UNIQUE(dealer_id, endpoint),
  CHECK (limit_per_window > 0),
  CHECK (window_minutes > 0),
  CHECK (request_count >= 0)
);

CREATE INDEX idx_rate_limits_dealer_id ON public.api_rate_limits(dealer_id);
CREATE INDEX idx_rate_limits_window ON public.api_rate_limits(window_end) WHERE window_end > NOW();

-- =====================================================
-- SECURITY AUDIT LOG TABLE
-- Track all sensitive operations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event classification
  event_type TEXT NOT NULL, -- 'OAUTH_INITIATED', 'TOKEN_REFRESHED', 'INTEGRATION_CREATED'
  event_category TEXT NOT NULL, -- 'integrations', 'auth', 'api_access'
  severity audit_severity DEFAULT 'info',

  -- Context
  user_id UUID REFERENCES public.profiles(id),
  dealer_id BIGINT REFERENCES public.dealerships(id),
  integration_id UUID REFERENCES public.dealer_integrations(id),

  -- Request metadata
  ip_address INET,
  user_agent TEXT,
  request_id TEXT,

  -- Event details
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Retention policy (auto-delete after 90 days)
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '90 days'
);

-- Indexes for audit queries
CREATE INDEX idx_security_audit_event_type ON public.security_audit_log(event_type);
CREATE INDEX idx_security_audit_dealer_id ON public.security_audit_log(dealer_id);
CREATE INDEX idx_security_audit_user_id ON public.security_audit_log(user_id);
CREATE INDEX idx_security_audit_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX idx_security_audit_severity ON public.security_audit_log(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX idx_security_audit_expires_at ON public.security_audit_log(expires_at);

-- =====================================================
-- OAUTH STATE TRACKING TABLE
-- Prevent CSRF attacks in OAuth flows
-- =====================================================
CREATE TABLE IF NOT EXISTS public.oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_token TEXT UNIQUE NOT NULL,

  -- OAuth flow context
  dealer_id BIGINT NOT NULL REFERENCES public.dealerships(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  integration_type integration_type NOT NULL,

  -- Security
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes',
  used_at TIMESTAMPTZ,

  -- Request metadata
  ip_address INET,
  user_agent TEXT,

  CHECK (used_at IS NULL OR used_at >= created_at)
);

CREATE INDEX idx_oauth_states_token ON public.oauth_states(state_token);
CREATE INDEX idx_oauth_states_expires ON public.oauth_states(expires_at);

-- Auto-cleanup expired states
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.oauth_states
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- =====================================================
-- INTEGRATION WEBHOOK LOGS
-- Track webhook deliveries and responses
-- =====================================================
CREATE TABLE IF NOT EXISTS public.integration_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.dealer_integrations(id) ON DELETE CASCADE,

  -- Request details
  event_type TEXT NOT NULL,
  payload JSONB,
  headers JSONB,

  -- Response details
  status_code INTEGER,
  response_body TEXT,
  response_time_ms INTEGER,

  -- Retry tracking
  attempt_number INTEGER DEFAULT 1,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,

  -- Result
  success BOOLEAN DEFAULT false,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (attempt_number > 0 AND attempt_number <= max_attempts)
);

CREATE INDEX idx_webhook_logs_integration_id ON public.integration_webhook_logs(integration_id);
CREATE INDEX idx_webhook_logs_created_at ON public.integration_webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_retry ON public.integration_webhook_logs(next_retry_at)
  WHERE success = false AND attempt_number < max_attempts;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.dealer_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhook_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DEALER_INTEGRATIONS POLICIES
-- Only dealer admins can manage integrations
-- =====================================================

CREATE POLICY "Dealer admins can view own integrations"
ON public.dealer_integrations FOR SELECT
TO authenticated
USING (
  dealer_id IN (
    SELECT dm.dealership_id
    FROM public.dealer_memberships dm
    JOIN public.profiles p ON dm.profile_id = p.id
    WHERE p.id = auth.uid()
    AND dm.is_active = true
  )
  AND auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.user_type IN ('system_admin', 'dealer_admin')
  )
);

CREATE POLICY "Dealer admins can create integrations"
ON public.dealer_integrations FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.user_type IN ('system_admin', 'dealer_admin')
  )
  AND dealer_id IN (
    SELECT dm.dealership_id
    FROM public.dealer_memberships dm
    JOIN public.profiles p ON dm.profile_id = p.id
    WHERE p.id = auth.uid()
  )
);

CREATE POLICY "Dealer admins can update own integrations"
ON public.dealer_integrations FOR UPDATE
TO authenticated
USING (
  dealer_id IN (
    SELECT dm.dealership_id
    FROM public.dealer_memberships dm
    JOIN public.profiles p ON dm.profile_id = p.id
    WHERE p.id = auth.uid()
  )
  AND auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.user_type IN ('system_admin', 'dealer_admin')
  )
);

CREATE POLICY "Dealer admins can delete own integrations"
ON public.dealer_integrations FOR DELETE
TO authenticated
USING (
  auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.user_type IN ('system_admin', 'dealer_admin')
  )
);

-- =====================================================
-- SECURITY AUDIT LOG POLICIES
-- Read-only for authorized users
-- =====================================================

CREATE POLICY "Admins can view audit logs"
ON public.security_audit_log FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.user_type IN ('system_admin', 'dealer_admin')
  )
  AND (
    dealer_id IN (
      SELECT dm.dealership_id
      FROM public.dealer_memberships dm
      WHERE dm.profile_id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT p.id FROM public.profiles p
      WHERE p.user_type = 'system_admin'
    )
  )
);

-- Service role can insert audit logs
CREATE POLICY "Service role can insert audit logs"
ON public.security_audit_log FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- API RATE LIMITS POLICIES
-- =====================================================

CREATE POLICY "Users can view own rate limits"
ON public.api_rate_limits FOR SELECT
TO authenticated
USING (
  dealer_id IN (
    SELECT dm.dealership_id
    FROM public.dealer_memberships dm
    WHERE dm.profile_id = auth.uid()
  )
);

-- =====================================================
-- OAUTH STATES POLICIES
-- =====================================================

CREATE POLICY "Users can view own OAuth states"
ON public.oauth_states FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Service role manages OAuth states"
ON public.oauth_states FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- WEBHOOK LOGS POLICIES
-- =====================================================

CREATE POLICY "Admins can view webhook logs"
ON public.integration_webhook_logs FOR SELECT
TO authenticated
USING (
  integration_id IN (
    SELECT di.id
    FROM public.dealer_integrations di
    JOIN public.dealer_memberships dm ON di.dealer_id = dm.dealership_id
    WHERE dm.profile_id = auth.uid()
  )
  AND auth.uid() IN (
    SELECT p.id FROM public.profiles p
    WHERE p.user_type IN ('system_admin', 'dealer_admin')
  )
);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_integration_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_dealer_integrations_timestamp
BEFORE UPDATE ON public.dealer_integrations
FOR EACH ROW EXECUTE FUNCTION update_integration_timestamp();

-- Audit log trigger for integrations
CREATE OR REPLACE FUNCTION audit_integration_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  severity_level audit_severity;
BEGIN
  -- Determine severity based on operation
  severity_level := CASE
    WHEN TG_OP = 'DELETE' THEN 'warning'::audit_severity
    WHEN NEW.enabled != OLD.enabled THEN 'warning'::audit_severity
    ELSE 'info'::audit_severity
  END;

  INSERT INTO public.security_audit_log (
    event_type,
    event_category,
    severity,
    user_id,
    dealer_id,
    integration_id,
    metadata
  ) VALUES (
    TG_OP || '_INTEGRATION',
    'integrations',
    severity_level,
    auth.uid(),
    COALESCE(NEW.dealer_id, OLD.dealer_id),
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'integration_type', COALESCE(NEW.integration_type::text, OLD.integration_type::text),
      'integration_name', COALESCE(NEW.integration_name, OLD.integration_name),
      'enabled', COALESCE(NEW.enabled, OLD.enabled),
      'status', COALESCE(NEW.status::text, OLD.status::text),
      'old_config', CASE WHEN TG_OP = 'UPDATE' THEN OLD.config ELSE NULL END,
      'new_config', CASE WHEN TG_OP != 'DELETE' THEN NEW.config ELSE NULL END
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER audit_integration_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.dealer_integrations
FOR EACH ROW EXECUTE FUNCTION audit_integration_changes();

-- Auto-cleanup expired audit logs
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.security_audit_log
  WHERE expires_at < NOW();
END;
$$;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_dealer_id BIGINT,
  p_endpoint TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limit RECORD;
  v_current_count INTEGER;
BEGIN
  -- Get or create rate limit record
  SELECT * INTO v_limit
  FROM public.api_rate_limits
  WHERE dealer_id = p_dealer_id
    AND endpoint = p_endpoint
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Create new rate limit record
    INSERT INTO public.api_rate_limits (dealer_id, endpoint, request_count, window_start, window_end)
    VALUES (p_dealer_id, p_endpoint, 1, NOW(), NOW() + INTERVAL '60 minutes')
    RETURNING * INTO v_limit;
    RETURN TRUE;
  END IF;

  -- Check if window expired
  IF v_limit.window_end < NOW() THEN
    -- Reset window
    UPDATE public.api_rate_limits
    SET request_count = 1,
        window_start = NOW(),
        window_end = NOW() + (v_limit.window_minutes || ' minutes')::INTERVAL,
        last_request_at = NOW()
    WHERE id = v_limit.id;
    RETURN TRUE;
  END IF;

  -- Check if limit exceeded
  IF v_limit.request_count >= v_limit.limit_per_window THEN
    RETURN FALSE;
  END IF;

  -- Increment counter
  UPDATE public.api_rate_limits
  SET request_count = request_count + 1,
      last_request_at = NOW()
  WHERE id = v_limit.id;

  RETURN TRUE;
END;
$$;

-- Validate OAuth state
CREATE OR REPLACE FUNCTION validate_oauth_state(
  p_state_token TEXT,
  p_dealer_id BIGINT,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state RECORD;
BEGIN
  SELECT * INTO v_state
  FROM public.oauth_states
  WHERE state_token = p_state_token
    AND dealer_id = p_dealer_id
    AND user_id = p_user_id
    AND expires_at > NOW()
    AND used_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Log security event
    INSERT INTO public.security_audit_log (
      event_type, event_category, severity, user_id, dealer_id, error_message
    ) VALUES (
      'OAUTH_INVALID_STATE', 'integrations', 'error', p_user_id, p_dealer_id,
      'Invalid or expired OAuth state token'
    );
    RETURN FALSE;
  END IF;

  -- Mark state as used
  UPDATE public.oauth_states
  SET used_at = NOW()
  WHERE id = v_state.id;

  RETURN TRUE;
END;
$$;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.dealer_integrations IS 'Stores third-party integrations with encrypted OAuth credentials';
COMMENT ON TABLE public.api_rate_limits IS 'Rate limiting configuration and tracking per dealer and endpoint';
COMMENT ON TABLE public.security_audit_log IS 'Comprehensive audit trail for security-sensitive operations';
COMMENT ON TABLE public.oauth_states IS 'CSRF protection for OAuth flows with automatic expiration';
COMMENT ON TABLE public.integration_webhook_logs IS 'Tracks webhook delivery attempts and responses';

COMMENT ON COLUMN public.dealer_integrations.credentials_vault_key IS 'Reference to Supabase Vault secret for encrypted token storage';
COMMENT ON COLUMN public.dealer_integrations.oauth_scopes IS 'Array of granted OAuth scopes (e.g., {chat:write, channels:read})';
COMMENT ON COLUMN public.security_audit_log.expires_at IS 'Auto-delete date for data retention compliance (90 days default)';
