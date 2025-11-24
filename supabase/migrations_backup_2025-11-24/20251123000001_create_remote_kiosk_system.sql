-- =====================================================
-- REMOTE KIOSK SYSTEM: Temporary URL-based punch access
-- =====================================================
-- Purpose: Allow employees to punch from any device using temporary URLs
-- Use Case: Emergency access when main PC fails or has no connectivity
-- Security: JWT tokens, one-time use, PIN validation, photo capture
-- Author: Claude Code
-- Date: 2025-11-23
-- =====================================================

-- Create enum for token status
CREATE TYPE remote_kiosk_token_status AS ENUM (
  'active',
  'used',
  'expired',
  'revoked'
);

-- =====================================================
-- TABLE: remote_kiosk_tokens
-- =====================================================
CREATE TABLE IF NOT EXISTS remote_kiosk_tokens (
  -- Primary identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Token information
  token_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of JWT token
  short_code TEXT NOT NULL UNIQUE, -- mda.to short code (e.g., RMT-123-ABC12)
  full_url TEXT NOT NULL, -- Complete mda.to URL

  -- Associated entities
  dealership_id INTEGER NOT NULL REFERENCES dealerships(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES detail_hub_employees(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id), -- Manager who created token

  -- Configuration
  expires_at TIMESTAMPTZ NOT NULL, -- Token expiration time
  max_uses INTEGER NOT NULL DEFAULT 1, -- How many times can be used (1 = one-time)
  current_uses INTEGER NOT NULL DEFAULT 0, -- Current usage count

  -- Status and tracking
  status remote_kiosk_token_status NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMPTZ, -- Last time token was used
  last_used_ip INET, -- Last IP that used the token
  last_used_user_agent TEXT, -- Last user agent that used the token

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ, -- When token was manually revoked
  revoked_by UUID REFERENCES auth.users(id), -- Who revoked the token
  revoke_reason TEXT, -- Why token was revoked

  -- Constraints
  CONSTRAINT valid_max_uses CHECK (max_uses > 0 AND max_uses <= 100),
  CONSTRAINT valid_current_uses CHECK (current_uses >= 0 AND current_uses <= max_uses),
  CONSTRAINT valid_expiration CHECK (expires_at > created_at),
  CONSTRAINT valid_revocation CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL) OR
    (status != 'revoked' AND revoked_at IS NULL AND revoked_by IS NULL)
  )
);

-- =====================================================
-- INDEXES for performance optimization
-- =====================================================
CREATE INDEX idx_remote_kiosk_tokens_token_hash ON remote_kiosk_tokens(token_hash);
CREATE INDEX idx_remote_kiosk_tokens_short_code ON remote_kiosk_tokens(short_code);
CREATE INDEX idx_remote_kiosk_tokens_dealership ON remote_kiosk_tokens(dealership_id);
CREATE INDEX idx_remote_kiosk_tokens_employee ON remote_kiosk_tokens(employee_id);
CREATE INDEX idx_remote_kiosk_tokens_status ON remote_kiosk_tokens(status) WHERE status = 'active';
CREATE INDEX idx_remote_kiosk_tokens_expires ON remote_kiosk_tokens(expires_at) WHERE status = 'active';

-- Composite index for common queries
CREATE INDEX idx_remote_kiosk_tokens_active_lookup ON remote_kiosk_tokens(token_hash, status, expires_at)
  WHERE status = 'active';

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_remote_kiosk_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_remote_kiosk_tokens_updated_at
  BEFORE UPDATE ON remote_kiosk_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_remote_kiosk_tokens_updated_at();

-- =====================================================
-- TRIGGER: Auto-update status based on expiration
-- =====================================================
CREATE OR REPLACE FUNCTION auto_expire_remote_kiosk_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-expire if past expiration time
  IF NEW.expires_at < NOW() AND NEW.status = 'active' THEN
    NEW.status := 'expired';
  END IF;

  -- Auto-mark as used if max uses reached
  IF NEW.current_uses >= NEW.max_uses AND NEW.status = 'active' THEN
    NEW.status := 'used';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_expire_remote_kiosk_tokens
  BEFORE INSERT OR UPDATE OF current_uses, expires_at ON remote_kiosk_tokens
  FOR EACH ROW
  EXECUTE FUNCTION auto_expire_remote_kiosk_tokens();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE remote_kiosk_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tokens from their dealerships
CREATE POLICY "Users can view tokens from their dealerships"
  ON remote_kiosk_tokens
  FOR SELECT
  USING (
    dealership_id IN (
      SELECT dm.dealer_id
      FROM dealer_memberships dm
      WHERE dm.user_id = auth.uid()
        AND dm.is_active = true
    )
  );

-- Policy: Managers and admins can create tokens (check role in profiles table)
CREATE POLICY "Managers can create tokens"
  ON remote_kiosk_tokens
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = remote_kiosk_tokens.dealership_id
        AND dm.is_active = true
        AND p.role IN ('dealer_admin', 'dealer_manager', 'system_admin', 'admin', 'manager')
    )
  );

-- Policy: Managers can update tokens (for revocation)
CREATE POLICY "Managers can update tokens"
  ON remote_kiosk_tokens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = remote_kiosk_tokens.dealership_id
        AND dm.is_active = true
        AND p.role IN ('dealer_admin', 'dealer_manager', 'system_admin', 'admin', 'manager')
    )
  );

-- Policy: Only admins can delete tokens
CREATE POLICY "Admins can delete tokens"
  ON remote_kiosk_tokens
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM dealer_memberships dm
      JOIN profiles p ON p.id = dm.user_id
      WHERE dm.user_id = auth.uid()
        AND dm.dealer_id = remote_kiosk_tokens.dealership_id
        AND dm.is_active = true
        AND p.role IN ('dealer_admin', 'system_admin', 'admin')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function: Validate and increment token usage
CREATE OR REPLACE FUNCTION use_remote_kiosk_token(
  p_token_hash TEXT,
  p_ip_address INET,
  p_user_agent TEXT
)
RETURNS TABLE (
  is_valid BOOLEAN,
  token_id UUID,
  employee_id UUID,
  dealership_id INTEGER,
  error_message TEXT
) AS $$
DECLARE
  v_token remote_kiosk_tokens;
BEGIN
  -- Get token
  SELECT * INTO v_token
  FROM remote_kiosk_tokens
  WHERE token_hash = p_token_hash
  FOR UPDATE; -- Lock row to prevent race conditions

  -- Token not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::INTEGER, 'Token not found'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_token.expires_at < NOW() THEN
    -- Auto-update status if not already expired
    IF v_token.status = 'active' THEN
      UPDATE remote_kiosk_tokens
      SET status = 'expired'
      WHERE id = v_token.id;
    END IF;
    RETURN QUERY SELECT false, v_token.id, NULL::UUID, NULL::INTEGER, 'Token expired'::TEXT;
    RETURN;
  END IF;

  -- Check if revoked
  IF v_token.status = 'revoked' THEN
    RETURN QUERY SELECT false, v_token.id, NULL::UUID, NULL::INTEGER, 'Token revoked'::TEXT;
    RETURN;
  END IF;

  -- Check if max uses reached
  IF v_token.current_uses >= v_token.max_uses THEN
    -- Auto-update status if not already used
    IF v_token.status = 'active' THEN
      UPDATE remote_kiosk_tokens
      SET status = 'used'
      WHERE id = v_token.id;
    END IF;
    RETURN QUERY SELECT false, v_token.id, NULL::UUID, NULL::INTEGER, 'Token usage limit reached'::TEXT;
    RETURN;
  END IF;

  -- Token is valid - increment usage
  UPDATE remote_kiosk_tokens
  SET
    current_uses = current_uses + 1,
    last_used_at = NOW(),
    last_used_ip = p_ip_address,
    last_used_user_agent = p_user_agent,
    status = CASE
      WHEN current_uses + 1 >= max_uses THEN 'used'::remote_kiosk_token_status
      ELSE status
    END
  WHERE id = v_token.id;

  -- Return success
  RETURN QUERY SELECT true, v_token.id, v_token.employee_id, v_token.dealership_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function: Revoke token
CREATE OR REPLACE FUNCTION revoke_remote_kiosk_token(
  p_token_id UUID,
  p_revoked_by UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE remote_kiosk_tokens
  SET
    status = 'revoked',
    revoked_at = NOW(),
    revoked_by = p_revoked_by,
    revoke_reason = p_reason
  WHERE id = p_token_id
    AND status IN ('active', 'used'); -- Can't revoke already expired/revoked tokens

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function: Cleanup expired tokens (run daily via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_remote_kiosk_tokens()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete tokens that expired more than 30 days ago
  DELETE FROM remote_kiosk_tokens
  WHERE status = 'expired'
    AND expires_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Get active tokens for employee
CREATE OR REPLACE FUNCTION get_active_remote_tokens_for_employee(p_employee_id UUID)
RETURNS TABLE (
  id UUID,
  short_code TEXT,
  full_url TEXT,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    id,
    short_code,
    full_url,
    expires_at,
    max_uses,
    current_uses,
    created_at
  FROM remote_kiosk_tokens
  WHERE employee_id = p_employee_id
    AND status = 'active'
    AND expires_at > NOW()
  ORDER BY created_at DESC;
$$ LANGUAGE sql STABLE;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE remote_kiosk_tokens IS 'Temporary URL-based access tokens for remote punch clock access';
COMMENT ON COLUMN remote_kiosk_tokens.token_hash IS 'SHA-256 hash of JWT token for secure storage';
COMMENT ON COLUMN remote_kiosk_tokens.short_code IS 'mda.to short code (e.g., RMT-123-ABC12)';
COMMENT ON COLUMN remote_kiosk_tokens.max_uses IS 'Maximum number of times token can be used (1 = one-time)';
COMMENT ON COLUMN remote_kiosk_tokens.current_uses IS 'Current usage count (auto-increments on each use)';
COMMENT ON FUNCTION use_remote_kiosk_token IS 'Validates token and increments usage count atomically';
COMMENT ON FUNCTION revoke_remote_kiosk_token IS 'Manually revoke an active or used token';
COMMENT ON FUNCTION cleanup_expired_remote_kiosk_tokens IS 'Delete tokens that expired more than 30 days ago (run via cron)';

-- =====================================================
-- ADD FK CONSTRAINT TO detail_hub_time_entries
-- =====================================================
-- Now that remote_kiosk_tokens exists, we can add the foreign key constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'detail_hub_time_entries') THEN
    -- Add FK constraint if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'fk_time_entries_remote_token'
    ) THEN
      ALTER TABLE detail_hub_time_entries
      ADD CONSTRAINT fk_time_entries_remote_token
      FOREIGN KEY (remote_token_id) REFERENCES remote_kiosk_tokens(id);
    END IF;
  END IF;
END $$;
